"""SB5 — control-plane LLM broker seam.

Zero-trust sandbox: the runtime must NOT hold any model-provider credential nor reach a model API
directly. The sandbox sends an authenticated inference request here; the control plane forwards it
through the app's provider-agnostic litellm layer and returns the completion. This is the ONLY
credentialed, egress-capable inference path.

Controls the sandbox cannot bypass (built out across P0–P7 — see
docs/architecture/sandbox-zero-trust/sb5-llm-broker/):
  * AUTH       — per-conversation HMAC token (namespace "llm"), scoped to one cid.
  * ADMISSION  — tenant-resolved quota + rate-limit + concurrency bulkhead + load-shed (P3).
  * VALIDATE   — schema, model allowlist, max-tokens + deadline clamps.
  * SCREEN     — inbound secret redaction; output filter on the completion (P4).
  * RELIABLE   — deadline/retry-with-idempotency/circuit-breaker/fallback (P3), fail-closed.
  * AUDIT      — every call (allow/deny/shed/filtered) on the SB7 tamper-evident chain.

Flag-gated: if CLOUDGUARD_LLM_BROKER_ENABLED is off the endpoint 404s and the sandbox keeps using its
legacy direct path (until cutover). This P0 commit is the contract + auth skeleton; /complete returns
501 until P2 wires the adapter.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/llm")

_RL: dict[str, list[float]] = {}
_RL_WINDOW = float(os.environ.get("CLOUDGUARD_LLM_RL_WINDOW", "60"))
_RL_MAX = int(os.environ.get("CLOUDGUARD_LLM_RL_MAX", "60"))

# Clamps — the client's numbers are hints, never authority (see 02-security-model.md §7).
_MAX_TOKENS_CEIL = int(os.environ.get("CLOUDGUARD_LLM_MAX_TOKENS_CEIL", "8192"))
_DEADLINE_FLOOR_MS = int(os.environ.get("CLOUDGUARD_LLM_DEADLINE_FLOOR_MS", "1000"))
_DEADLINE_CEIL_MS = int(os.environ.get("CLOUDGUARD_LLM_DEADLINE_CEIL_MS", "120000"))
_MSG_BYTES_CAP = int(os.environ.get("CLOUDGUARD_LLM_MSG_BYTES_CAP", str(2 * 1024 * 1024)))


def _enabled() -> bool:
    return os.environ.get("CLOUDGUARD_LLM_BROKER_ENABLED", "").strip().lower() in (
        "1", "true", "yes", "on",
    )


def _hmac_key() -> str:
    return os.environ.get(
        "CLOUDGUARD_LLM_HMAC_KEY",
        os.environ.get("ONLYOFFICE_JWT_SECRET", "change-me-llm-hmac"),
    )


def mint_llm_token(cid: str) -> str:
    """Per-conversation token = HMAC(key, "llm\\n"+cid). Injected into the sandbox env at spawn;
    scoped to one conversation, only usable against this broker seam (distinct namespace from the
    skill/report/kg tokens)."""
    return hmac.new(_hmac_key().encode(), f"llm\n{cid}".encode(), hashlib.sha256).hexdigest()


def _verify(cid: str, sig: str) -> bool:
    return bool(cid and sig) and hmac.compare_digest(sig, mint_llm_token(cid))


def _rate_ok(cid: str) -> bool:
    now = time.time()
    hits = [t for t in _RL.get(cid, []) if now - t < _RL_WINDOW]
    if len(hits) >= _RL_MAX:
        _RL[cid] = hits
        return False
    hits.append(now)
    _RL[cid] = hits
    return True


def _seam_audit(cid: str, outcome: str, hits=None) -> None:
    """SB7 — record this broker call on the control-plane tamper-evident chain. Fail-soft."""
    try:
        from cloudguard.observability.security_event import emit_seam_event

        emit_seam_event("llm_broker", cid, outcome, hits=hits)
    except Exception:  # noqa: BLE001
        pass


class _Message(BaseModel):
    role: str
    # str OR a list of Anthropic content blocks (text / tool_use / tool_result) — P6 function calling
    content: object = ""


class _CompleteRequest(BaseModel):
    cid: str
    sig: str
    model: str = "default"  # logical alias — broker maps to a concrete provider model (P1)
    messages: list[_Message] = Field(default_factory=list)
    system: str = ""
    max_tokens: int = 4096
    temperature: float = 0.2
    stream: bool = False
    deadline_ms: int = 60000
    idempotency_key: str | None = None
    tools: list = Field(default_factory=list)  # Anthropic tool schemas (P6)
    tool_choice: str = "auto"  # "auto" | "required" (QueryEngine forces a call mid-loop)


def _clamp(req: _CompleteRequest) -> None:
    """Validate + clamp client-supplied numbers in place; raise 422 on hard-invalid input."""
    if not req.messages:
        raise HTTPException(status_code=422, detail="messages required")

    def _blen(c) -> int:
        return len((c if isinstance(c, str) else json.dumps(c)).encode())

    total_bytes = len(req.system.encode()) + sum(_blen(m.content) for m in req.messages)
    if total_bytes > _MSG_BYTES_CAP:
        raise HTTPException(status_code=422, detail="payload too large")
    req.max_tokens = max(1, min(int(req.max_tokens), _MAX_TOKENS_CEIL))
    req.deadline_ms = max(_DEADLINE_FLOOR_MS, min(int(req.deadline_ms), _DEADLINE_CEIL_MS))
    req.temperature = max(0.0, min(float(req.temperature), 2.0))


@router.post("/complete")
async def complete(req: _CompleteRequest):
    """Forward an authorized sandbox inference request to the app's provider (P2+). P0: auth +
    validation skeleton; returns 501 until the adapter is wired."""
    if not _enabled():
        raise HTTPException(status_code=404, detail="llm broker seam not enabled")
    if not _verify(req.cid, req.sig):
        logger.warning("llm-broker DENY (bad token) cid=%s", req.cid)
        _seam_audit(req.cid, "deny")
        raise HTTPException(status_code=403, detail="unauthorized")
    if not _rate_ok(req.cid):
        logger.warning("llm-broker RATE-LIMIT cid=%s", req.cid)
        _seam_audit(req.cid, "rate_limit")
        raise HTTPException(status_code=429, detail="rate limit")
    _clamp(req)

    try:
        from cloudguard.llm_broker import (
            BrokerResult,
            InvalidModel,
            ProviderError,
            ShedError,
            filter_output,
            reliable_complete,
            screen_inbound,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("llm-broker adapter import failed: %s", exc)
        raise HTTPException(status_code=500, detail="broker unavailable") from exc

    # P4 INBOUND — scrub live secrets from the prompt before it leaves for the provider.
    msgs, system, in_hits = screen_inbound([m.model_dump() for m in req.messages], req.system)
    if in_hits:
        logger.warning("llm-broker INBOUND-REDACT cid=%s hits=%d", req.cid, len(in_hits))
        _seam_audit(req.cid, "allow", hits=["inbound_redact", f"n={len(in_hits)}"])

    # P5 — streaming (SSE). Security-first: the OUTPUT FILTER must see the FULL completion before any
    # byte reaches the sandbox (a mid-stream prompt-echo/secret leak cannot be retracted), so we run
    # the full secure+reliable pipeline, then emit the filtered result over the SSE wire contract
    # (delta events + terminal done/error). Incremental token delivery is a future option behind the
    # SAME contract, gated on a streaming-safe output filter — see 03-reliability-and-sre.md.
    if req.stream:
        from fastapi.responses import StreamingResponse

        return StreamingResponse(
            _sse_run(req, msgs, system), media_type="text/event-stream"
        )

    t0 = time.time()
    try:
        result: BrokerResult = reliable_complete(
            key=req.cid,  # fairness/isolation key (tenant when the edge resolves it)
            model=req.model,
            messages=msgs,
            system=system,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
            deadline_s=req.deadline_ms / 1000.0,
            idempotency_key=req.idempotency_key or "",
            tools=req.tools or None,
            tool_choice=req.tool_choice,
        )
    except InvalidModel as exc:
        _seam_audit(req.cid, "deny", hits=["invalid_model"])
        raise HTTPException(status_code=422, detail="invalid model") from exc
    except ShedError as exc:
        # bulkhead full / over quota — shed early with a typed rate_limit (never queue unboundedly)
        logger.info("cg_llm_broker cid=%s outcome=shed src=control-plane", req.cid)
        _seam_audit(req.cid, "rate_limit", hits=["shed"])
        return {"ok": False, "error_class": "rate_limited", "retry_after_ms": exc.retry_after_ms}
    except ProviderError as exc:
        # Typed error the client maps to its existing taxonomy — NOT an HTTP 5xx (that would look like a
        # broker bug). The sandbox never gets provider error text (redacted to a class).
        dt = int((time.time() - t0) * 1000)
        logger.info(
            "cg_llm_broker cid=%s outcome=%s ms=%d src=control-plane", req.cid, exc.error_class, dt
        )
        _seam_audit(req.cid, "allow", hits=[req.model, f"err={exc.error_class}"])
        return {"ok": False, "error_class": exc.error_class, "retry_after_ms": exc.retry_after_ms}

    dt = int((time.time() - t0) * 1000)

    # P6 — a tool_call carries no model prose to leak; return the structured call (still audited).
    if result.response_type == "tool_call":
        logger.info(
            "cg_llm_broker cid=%s model=%s tool=%s in=%d out=%d ms=%d src=control-plane",
            req.cid, result.model_used, result.tool_name, result.input_tokens, result.output_tokens, dt,
        )
        _seam_audit(req.cid, "allow", hits=[req.model, f"tool={result.tool_name}"])
        return {
            "ok": True,
            "response_type": "tool_call",
            "tool_name": result.tool_name,
            "tool_input": result.tool_input,
            "tool_use_id": result.tool_use_id,
            "content": "",
            "usage": {"input": result.input_tokens, "output": result.output_tokens},
            "model_used": result.model_used,
            "finish_reason": result.finish_reason,
        }

    # P4 OUTBOUND — filter TEXT completions (block prompt-echo of protected content / redact secrets).
    action, content, out_hits = filter_output(result.content, req.system)
    if action == "block":
        logger.warning("llm-broker OUTPUT-BLOCK cid=%s hits=%d", req.cid, len(out_hits))
        _seam_audit(req.cid, "content_filtered", hits=["output_block"])
        return {"ok": False, "error_class": "content_filtered", "retry_after_ms": None}

    logger.info(
        "cg_llm_broker cid=%s model=%s in=%d out=%d ms=%d src=control-plane",
        req.cid, result.model_used, result.input_tokens, result.output_tokens, dt,
    )
    _seam_audit(
        req.cid, "allow",
        hits=[req.model, f"in={result.input_tokens}", f"out={result.output_tokens}"]
        + (["output_redact"] if action == "redact" else []),
    )
    try:
        from cloudguard.observability import ingest_client

        ingest_client.push_one(
            "inference_record", actor="sandbox", resource=result.model_used,
            decision="served", category="llm", session_id=req.cid,
        )
    except Exception:  # noqa: BLE001 — telemetry must never break the response
        pass

    return {
        "ok": True,
        "content": content,  # P4-filtered (redacted if action == "redact")
        "usage": {"input": result.input_tokens, "output": result.output_tokens},
        "model_used": result.model_used,
        "finish_reason": result.finish_reason,
    }


def _sse(event: "str | None", data: dict) -> str:
    prefix = f"event: {event}\n" if event else ""
    return prefix + "data: " + json.dumps(data) + "\n\n"


def _sse_run(req: _CompleteRequest, msgs: list, system: str):
    """P5 — run the full secure+reliable pipeline, then stream the filtered result as SSE. A terminal
    `event: done` (usage) or `event: error` (typed) makes mid-stream failure unambiguous; deltas are
    provisional until `done`. The output filter runs on the COMPLETE text before any delta is sent."""
    from cloudguard.llm_broker import (
        InvalidModel,
        ProviderError,
        ShedError,
        filter_output,
        reliable_complete,
    )

    try:
        res = reliable_complete(
            key=req.cid, model=req.model, messages=msgs, system=system,
            max_tokens=req.max_tokens, temperature=req.temperature,
            deadline_s=req.deadline_ms / 1000.0, idempotency_key=req.idempotency_key or "",
            tools=req.tools or None, tool_choice=req.tool_choice,
        )
    except InvalidModel:
        _seam_audit(req.cid, "deny", hits=["invalid_model"])
        yield _sse("error", {"error_class": "invalid"})
        return
    except ShedError as exc:
        _seam_audit(req.cid, "rate_limit", hits=["shed"])
        yield _sse("error", {"error_class": "rate_limited", "retry_after_ms": exc.retry_after_ms})
        return
    except ProviderError as exc:
        _seam_audit(req.cid, "allow", hits=[req.model, f"err={exc.error_class}"])
        yield _sse("error", {"error_class": exc.error_class, "retry_after_ms": exc.retry_after_ms})
        return

    if res.response_type == "tool_call":
        _seam_audit(req.cid, "allow", hits=[req.model, f"tool={res.tool_name}"])
        yield _sse("tool_call", {
            "tool_name": res.tool_name, "tool_input": res.tool_input, "tool_use_id": res.tool_use_id,
        })
        yield _sse("done", {
            "response_type": "tool_call", "finish_reason": res.finish_reason,
            "usage": {"input": res.input_tokens, "output": res.output_tokens},
        })
        return

    action, content, _ = filter_output(res.content, req.system)  # FULL text filtered before emit
    if action == "block":
        _seam_audit(req.cid, "content_filtered", hits=["output_block"])
        yield _sse("error", {"error_class": "content_filtered"})
        return

    _seam_audit(req.cid, "allow", hits=[req.model, f"in={res.input_tokens}", f"out={res.output_tokens}"])
    chunk = 256
    for i in range(0, len(content), chunk):
        yield _sse(None, {"delta": content[i:i + chunk]})
    yield _sse("done", {
        "response_type": "text", "finish_reason": res.finish_reason,
        "usage": {"input": res.input_tokens, "output": res.output_tokens},
    })


@router.get("/healthz")
async def healthz():
    """Liveness — the process is up."""
    return {"ok": True, "seam": "llm_broker", "enabled": _enabled()}


@router.get("/readyz")
async def readyz():
    """Readiness — not saturated, config present, breaker overview. k8s gates traffic on this."""
    try:
        from cloudguard.llm_broker import readiness

        snap = readiness()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"not ready: {exc}") from exc
    if not snap.get("ready"):
        raise HTTPException(status_code=503, detail="saturated")
    return {"ok": True, **snap}

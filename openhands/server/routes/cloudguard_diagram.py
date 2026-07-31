"""Control-plane diagram shape-search seam.

Zero-trust: the semantic icon index (the model2vec embedder + baked vectors) lives ONLY in the
control plane, never in the sandbox. The sandbox's diagram_find_shape POSTs a description here; the
app runs the semantic search over draw.io's real shape catalog and returns the matching shape ids.
Same seam controls as SB1/SB2/SB5:

  * AUTH       — per-conversation HMAC token (namespace "diagram"), scoped to one cid.
  * VALIDATE   — query length capped, k clamped.
  * RATE-LIMIT — bounded searches/conversation.
  * AUDIT      — every call on the SB7 tamper-evident chain (diagram_search allow/deny).

Flag-gated: CLOUDGUARD_DIAGRAM_ENABLED off → 404, and the sandbox falls back to a local substring
match over its baked catalog (correct icons still resolve exactly; only the semantic finder degrades).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import require_principal

logger = logging.getLogger("openhands")
router = APIRouter(prefix="/api/cloudguard/diagram")

_RL: dict[str, list[float]] = {}
_RL_WINDOW = float(os.environ.get("CLOUDGUARD_DIAGRAM_RL_WINDOW", "60"))
_RL_MAX = int(os.environ.get("CLOUDGUARD_DIAGRAM_RL_MAX", "60"))
_MAX_Q = 200
_MAX_K = 20


def _enabled() -> bool:
    return os.environ.get("CLOUDGUARD_DIAGRAM_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


def _live_enabled() -> bool:
    """Live control is opt-in BEYOND shape-search (highlight/annotate the open editor)."""
    return os.environ.get("CLOUDGUARD_DIAGRAM_LIVE_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


def _hmac_key() -> str:
    return os.environ.get(
        "CLOUDGUARD_DIAGRAM_HMAC_KEY", os.environ.get("ONLYOFFICE_JWT_SECRET", "change-me-diagram-hmac")
    )


def mint_diagram_token(cid: str) -> str:
    """Per-conversation token = HMAC(key, "diagram\\n"+cid). Injected at spawn; scoped to one cid."""
    return hmac.new(_hmac_key().encode(), f"diagram\n{cid}".encode(), hashlib.sha256).hexdigest()


def _verify(cid: str, sig: str) -> bool:
    return bool(cid and sig) and hmac.compare_digest(sig, mint_diagram_token(cid))


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
    try:
        from cloudguard.observability.security_event import emit_seam_event

        emit_seam_event("diagram_search", cid, outcome, hits=hits)
    except Exception:  # noqa: BLE001
        pass


class _SearchRequest(BaseModel):
    cid: str
    sig: str
    query: str
    provider: str | None = None
    k: int = 8


@router.post("/shape-search")
async def shape_search(req: _SearchRequest):
    """Return draw.io shapes matching a description (semantic). Authed + rate-limited + audited."""
    if not _enabled():
        raise HTTPException(status_code=404, detail="diagram seam not enabled")
    if not _verify(req.cid, req.sig):
        logger.warning("diagram-search DENY (bad token) cid=%s", req.cid)
        _seam_audit(req.cid, "deny")
        raise HTTPException(status_code=403, detail="unauthorized")
    if not _rate_ok(req.cid):
        _seam_audit(req.cid, "rate_limit")
        raise HTTPException(status_code=429, detail="rate limit")

    from cloudguard.diagram import shapes as _sh

    results = _sh.search((req.query or "")[:_MAX_Q], req.provider, max(1, min(int(req.k), _MAX_K)))
    logger.info("cg_diagram_search cid=%s q=%r n=%d src=control-plane", req.cid, (req.query or "")[:40], len(results))
    _seam_audit(req.cid, "allow", hits=[f"n={len(results)}"])
    return {"ok": True, "results": results}


@router.get("/healthz")
async def healthz():
    """Liveness + whether the semantic index is loaded (else the seam degrades to substring)."""
    try:
        from cloudguard.diagram import shapes as _sh

        semantic = bool(_sh._index() and _sh._embedder())
        n = _sh.catalog_size()
    except Exception:  # noqa: BLE001
        semantic, n = False, 0
    return {
        "ok": True,
        "seam": "diagram",
        "enabled": _enabled(),
        "live": _live_enabled(),
        "semantic": semantic,
        "catalog": n,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Live control (opt-in) — drive the analyst's OPEN draw.io editor.
#
# Same pull model as the shipped ONLYOFFICE live bridge: the sandbox NEVER reaches
# the browser. The agent POSTs an allow-listed command (authed HMAC "diagram\n"+cid,
# rate-limited, SB7-audited) into a per-conversation queue; our own DrawioViewer
# React wrapper (same-origin, principal-authed) polls /live/poll and applies it via
# the react-drawio embed API. Annotation text passes the output filter first.
# ─────────────────────────────────────────────────────────────────────────────
_LIVE_OPS = ("highlight", "annotate", "reload")
_LIVE_MAX_QUEUE = 50  # per-conversation backlog cap (drop-oldest)
_LIVE_MAX_TEXT = 500
_LIVE_MAX_IDS = 200
_LIVE_QUEUE: dict[str, list[dict]] = {}


def _live_audit(cid: str, outcome: str, op: str = "", hits=None) -> None:
    try:
        from cloudguard.observability.security_event import emit_seam_event

        emit_seam_event("diagram_live", cid, outcome, hits=(hits or []) + ([f"op={op}"] if op else []))
    except Exception:  # noqa: BLE001
        pass


def _filter_text(text: str) -> "str | None":
    """Run agent-authored annotation text through the output filter before it can reach
    the editor. BLOCK → drop the text (None); REDACT → the scrubbed text; ALLOW → as-is.
    Fail-open to the raw text on any filter error (matches the other seams)."""
    text = (text or "")[:_LIVE_MAX_TEXT]
    if not text:
        return ""
    try:
        from cloudguard.output_filter import Action, scan_output

        v = scan_output(text)
        if v.action == Action.BLOCK.value:
            return None
        if v.action == Action.REDACT.value:
            return (v.redacted_text or "")[:_LIVE_MAX_TEXT]
    except Exception:  # noqa: BLE001
        pass
    return text


class _LiveRequest(BaseModel):
    cid: str
    sig: str
    op: str
    node_ids: list[str] = Field(default_factory=list)
    edge_ids: list[str] = Field(default_factory=list)
    text: str = ""
    near_node: str = ""
    color: str = ""  # semantic hint: critical|high|medium|low|info or a #rrggbb


@router.post("/live")
async def live_send(req: _LiveRequest):
    """Agent → queue a live command for the open editor. Authed + rate-limited + audited + filtered."""
    if not _live_enabled():
        raise HTTPException(status_code=404, detail="diagram live seam not enabled")
    if not _verify(req.cid, req.sig):
        logger.warning("diagram-live DENY (bad token) cid=%s", req.cid)
        _live_audit(req.cid, "deny", req.op)
        raise HTTPException(status_code=403, detail="unauthorized")
    if req.op not in _LIVE_OPS:
        _live_audit(req.cid, "reject", req.op)
        raise HTTPException(status_code=400, detail=f"op must be one of {_LIVE_OPS}")
    if not _rate_ok(req.cid):
        _live_audit(req.cid, "rate_limit", req.op)
        raise HTTPException(status_code=429, detail="rate limit")

    cmd: dict = {
        "id": os.urandom(8).hex(),
        "op": req.op,
        "node_ids": [str(x) for x in req.node_ids][:_LIVE_MAX_IDS],
        "edge_ids": [str(x) for x in req.edge_ids][:_LIVE_MAX_IDS],
        "near_node": str(req.near_node)[:128],
        "color": str(req.color)[:32],
        "ts": time.time(),
    }
    if req.op == "annotate":
        text = _filter_text(req.text)
        if text is None:  # output filter blocked it — never reaches the editor
            _live_audit(req.cid, "filtered", req.op, hits=["annotation_blocked"])
            raise HTTPException(status_code=422, detail="annotation blocked by output filter")
        cmd["text"] = text

    q = _LIVE_QUEUE.setdefault(req.cid, [])
    q.append(cmd)
    if len(q) > _LIVE_MAX_QUEUE:  # drop-oldest backpressure
        del q[: len(q) - _LIVE_MAX_QUEUE]
    logger.info("cg_diagram_live cid=%s op=%s queued=%d", req.cid, req.op, len(q))
    _live_audit(req.cid, "allow", req.op, hits=[f"n_nodes={len(cmd['node_ids'])}"])
    return {"ok": True, "queued": len(q), "id": cmd["id"]}


@router.get("/live/poll")
async def live_poll(conversation_id: str, _p=Depends(require_principal)):
    """Frontend (same-origin, principal-authed) drains this conversation's pending live commands."""
    if not _live_enabled():
        return {"commands": []}
    cmds = _LIVE_QUEUE.pop(conversation_id, [])
    return {"commands": cmds}

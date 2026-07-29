"""SB2 — control-plane report-compile seam.

Zero-trust sandbox: the runtime must NOT hold the LaTeX compiler orchestration (CLSI
protocol, error/retry heuristics — CloudGuard IP) nor reach the CLSI service directly. The
sandbox authors its report sources (tenant data) and POSTs the bundle here; the control
plane compiles it via CLSI and returns the PDF. Controls the sandbox cannot bypass:

  * AUTH       — per-conversation HMAC token (minted control-plane-side, scoped to one cid),
                 a namespace distinct from the SB1 skill token.
  * VALIDATE   — resource paths fenced (no absolute/traversal), type-allowlisted, size/count
                 capped, engine allowlisted — a compromised sandbox can't smuggle or DoS.
  * RATE-LIMIT — bounded compiles/conversation.
  * AUDIT      — every compile logged (cid, resources, bytes, status) for tamper-evident review.

Flag-gated: if CLOUDGUARD_REPORT_COMPILE_ENABLED is off the endpoint 404s and the sandbox
keeps compiling via its local script — zero change until cutover.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import logging
import os
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/report")

_RL: dict[str, list[float]] = {}
_RL_WINDOW = float(os.environ.get("CLOUDGUARD_REPORT_RL_WINDOW", "60"))
_RL_MAX = int(os.environ.get("CLOUDGUARD_REPORT_RL_MAX", "10"))


def _enabled() -> bool:
    return os.environ.get("CLOUDGUARD_REPORT_COMPILE_ENABLED", "").strip().lower() in (
        "1", "true", "yes", "on",
    )


def _hmac_key() -> str:
    return os.environ.get(
        "CLOUDGUARD_REPORT_HMAC_KEY",
        os.environ.get("ONLYOFFICE_JWT_SECRET", "change-me-report-hmac"),
    )


def mint_report_token(cid: str) -> str:
    """Per-conversation token = HMAC(key, "report\\n"+cid). Injected into the sandbox env at
    spawn; scoped to one conversation, only usable against this compile seam."""
    return hmac.new(_hmac_key().encode(), f"report\n{cid}".encode(), hashlib.sha256).hexdigest()


def _verify(cid: str, sig: str) -> bool:
    return bool(cid and sig) and hmac.compare_digest(sig, mint_report_token(cid))


def _rate_ok(cid: str) -> bool:
    now = time.time()
    hits = [t for t in _RL.get(cid, []) if now - t < _RL_WINDOW]
    if len(hits) >= _RL_MAX:
        _RL[cid] = hits
        return False
    hits.append(now)
    _RL[cid] = hits
    return True


class _Resource(BaseModel):
    path: str
    content: str
    encoding: str | None = None  # "base64" for image assets


class _CompileRequest(BaseModel):
    cid: str
    sig: str
    root_file: str = "main.tex"
    engine: str = "pdflatex"
    resources: list[_Resource] = Field(default_factory=list)


@router.post("/compile")
async def compile_report(req: _CompileRequest):
    """Compile an authorized sandbox's report bundle via CLSI; return the PDF (base64) or the
    TeX log on failure. Flag-gated; auth + validation + rate-limit + audit enforced."""
    if not _enabled():
        raise HTTPException(status_code=404, detail="report compile seam not enabled")
    if not _verify(req.cid, req.sig):
        logger.warning("report-compile DENY (bad token) cid=%s", req.cid)
        raise HTTPException(status_code=403, detail="unauthorized")
    if not _rate_ok(req.cid):
        logger.warning("report-compile RATE-LIMIT cid=%s", req.cid)
        raise HTTPException(status_code=429, detail="rate limit")

    # decode base64 assets to bytes-safe strings the compiler passes straight to CLSI
    resources = [r.model_dump(exclude_none=True) for r in req.resources]
    # validate base64 assets are well-formed before we spend a compile on them
    for r in resources:
        if r.get("encoding") == "base64":
            try:
                base64.b64decode(r["content"], validate=True)
            except (binascii.Error, ValueError) as exc:
                raise HTTPException(status_code=422, detail=f"bad base64 asset {r.get('path')}") from exc

    from cloudguard.report.clsi_compile import compile_bundle

    t0 = time.time()
    result = compile_bundle(resources, root_file=req.root_file, engine=req.engine)
    dt = int((time.time() - t0) * 1000)

    if result.status == "rejected":
        logger.warning("report-compile REJECT cid=%s reason=%s", req.cid, result.error)
        raise HTTPException(status_code=422, detail=result.error)

    logger.info(
        "cg_report_dispatch cid=%s resources=%d status=%s ms=%d src=control-plane",
        req.cid, len(resources), result.status, dt,
    )

    if result.ok and result.pdf_bytes is not None:
        return {
            "ok": True,
            "status": result.status,
            "stem": result.stem,
            "pdf_b64": base64.b64encode(result.pdf_bytes).decode(),
        }
    # compile failure — hand back the log so the agent can fix + resubmit
    return {
        "ok": False,
        "status": result.status,
        "stem": result.stem,
        "log": result.log,
        "error": result.error,
    }

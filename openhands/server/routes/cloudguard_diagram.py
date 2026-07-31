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

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("openhands")
router = APIRouter(prefix="/api/cloudguard/diagram")

_RL: dict[str, list[float]] = {}
_RL_WINDOW = float(os.environ.get("CLOUDGUARD_DIAGRAM_RL_WINDOW", "60"))
_RL_MAX = int(os.environ.get("CLOUDGUARD_DIAGRAM_RL_MAX", "60"))
_MAX_Q = 200
_MAX_K = 20


def _enabled() -> bool:
    return os.environ.get("CLOUDGUARD_DIAGRAM_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


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
    return {"ok": True, "seam": "diagram", "enabled": _enabled(), "semantic": semantic, "catalog": n}

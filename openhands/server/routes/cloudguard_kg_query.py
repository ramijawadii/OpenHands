"""SB5 — control-plane KG-query seam.

Zero-trust sandbox: the kernel must NOT hold the neo4j-kg password nor reach the graph directly
(that lets a compromised sandbox bulk-read the command graph AND the tenant's Findings). The
kernel's analytics send parameterized, READ-ONLY cypher — so instead of a standing DB credential
in the sandbox, they POST the cypher here and the control plane runs it under controls the
sandbox cannot bypass:

  * AUTH       — per-conversation HMAC token (minted control-plane-side, "kgquery\\n"+cid).
  * READ-ONLY  — executed in a neo4j READ transaction (execute_read); a write cypher is rejected
                 by the server, so a compromised sandbox cannot mutate the graph.
  * ROW CAP    — results truncated (bounded), so a stolen token can't dump the whole graph.
  * RATE-LIMIT — bounded queries/conversation.
  * AUDIT      — every query logged (cid, rows, ms) for tamper-evident review.

Flag-gated: if CLOUDGUARD_KG_QUERY_ENABLED is off the endpoint 404s and the kernel keeps its
current direct-driver path — zero change until cutover.
"""

from __future__ import annotations

import hashlib
import hmac
import itertools
import logging
import os
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/kg")

_RL: dict[str, list[float]] = {}
_RL_WINDOW = float(os.environ.get("CLOUDGUARD_KG_RL_WINDOW", "60"))
_RL_MAX = int(os.environ.get("CLOUDGUARD_KG_RL_MAX", "60"))
_MAX_ROWS = int(os.environ.get("CLOUDGUARD_KG_MAX_ROWS", "5000"))


def _enabled() -> bool:
    return os.environ.get("CLOUDGUARD_KG_QUERY_ENABLED", "").strip().lower() in (
        "1", "true", "yes", "on",
    )


def _hmac_key() -> str:
    return os.environ.get(
        "CLOUDGUARD_KG_HMAC_KEY",
        os.environ.get("ONLYOFFICE_JWT_SECRET", "change-me-kg-hmac"),
    )


def mint_kg_token(cid: str) -> str:
    """Per-conversation token = HMAC(key, "kgquery\\n"+cid). Injected into the sandbox at spawn."""
    return hmac.new(_hmac_key().encode(), f"kgquery\n{cid}".encode(), hashlib.sha256).hexdigest()


def _verify(cid: str, sig: str) -> bool:
    return bool(cid and sig) and hmac.compare_digest(sig, mint_kg_token(cid))


def _rate_ok(cid: str) -> bool:
    now = time.time()
    hits = [t for t in _RL.get(cid, []) if now - t < _RL_WINDOW]
    if len(hits) >= _RL_MAX:
        _RL[cid] = hits
        return False
    hits.append(now)
    _RL[cid] = hits
    return True


def _seam_audit(seam: str, cid: str, outcome: str, hits=None) -> None:
    """SB7 — record this seam call on the control-plane tamper-evident chain. Fail-soft."""
    try:
        from cloudguard.observability.security_event import emit_seam_event

        emit_seam_event(seam, cid, outcome, hits=hits)
    except Exception:  # noqa: BLE001
        pass


class _KGQueryRequest(BaseModel):
    cid: str
    sig: str
    cypher: str
    params: dict | None = Field(default=None)


@router.post("/query")
async def kg_query(req: _KGQueryRequest):
    """Run an authorized kernel's READ-ONLY cypher control-plane-side and return the rows, so the
    sandbox needn't hold the neo4j-kg credential. Flag-gated; auth + read-only + row-cap +
    rate-limit + audit enforced."""
    if not _enabled():
        raise HTTPException(status_code=404, detail="kg query seam not enabled")
    if not _verify(req.cid, req.sig):
        logger.warning("kg-query DENY (bad token) cid=%s", req.cid)
        _seam_audit("kg_query", req.cid, "deny")
        raise HTTPException(status_code=403, detail="unauthorized")
    if not _rate_ok(req.cid):
        logger.warning("kg-query RATE-LIMIT cid=%s", req.cid)
        _seam_audit("kg_query", req.cid, "rate_limit")
        raise HTTPException(status_code=429, detail="rate limit")

    try:
        from cloudguard.kg.graph.driver import get_driver
    except Exception as exc:  # noqa: BLE001
        logger.error("kg-query driver import failed: %s", exc)
        raise HTTPException(status_code=500, detail="kg unavailable") from exc

    t0 = time.time()
    try:
        driver = get_driver()
        # READ transaction — a write cypher is rejected by the server. Row-capped.
        def _read(tx):
            result = tx.run(req.cypher, req.params or {})
            return [dict(r) for r in itertools.islice(result, _MAX_ROWS)]

        with driver.session() as session:
            rows = session.execute_read(_read)
    except Exception as exc:  # noqa: BLE001 — return error to the kernel, never 500 on a bad query
        dt = int((time.time() - t0) * 1000)
        logger.info("cg_kg_query cid=%s status=error ms=%d src=control-plane", req.cid, dt)
        _seam_audit("kg_query", req.cid, "allow", hits=["status=error"])
        return {"ok": False, "error": str(exc)[:400], "records": []}

    dt = int((time.time() - t0) * 1000)
    logger.info(
        "cg_kg_query cid=%s rows=%d ms=%d src=control-plane", req.cid, len(rows), dt
    )
    _seam_audit("kg_query", req.cid, "allow", hits=[f"rows={len(rows)}"])
    return {"ok": True, "records": rows, "truncated": len(rows) >= _MAX_ROWS}

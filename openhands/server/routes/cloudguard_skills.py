"""SB1 — control-plane skill-dispatch seam.

Zero-trust sandbox: the runtime must NOT hold the skills catalog on disk or reach neo4j
directly (both let a compromised sandbox bulk-extract the methodology). Instead the kernel
fetches the ONE skill body it needs from here, per request, under controls the sandbox
cannot bypass:

  * AUTH        — per-conversation HMAC token (minted control-plane-side, scoped to one cid).
  * ALLOWLIST   — skill_id must resolve to a real SKILL.md *under* the catalog root
                  (path-traversal fenced with realpath) — no arbitrary file reads.
  * RATE-LIMIT  — bounded requests/conversation so a stolen token can't dump the catalog.
  * AUDIT       — every request logged (who/what/when) for tamper-evident review.

The skill body is the instruction the agent must act on, so it IS returned to the authorized
kernel — the IP-protection *output* filter still guards the agent→user boundary separately.
The win here is: the full catalog never lives in the untrusted sandbox, and access is
authenticated, fenced, throttled, and audited.

Flag-gated end to end: if CLOUDGUARD_SKILLS_CATALOG_DIR is unset the endpoint 404s and the
kernel keeps its current on-disk/graph path — zero change until cutover.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time

from fastapi import APIRouter, HTTPException

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/skills")

# In-memory rate-limit: cid -> (window_start, count). Bounded; a stolen token can fetch at
# most _RL_MAX skills per _RL_WINDOW — far below the 200+ catalog, so no bulk extraction.
_RL: dict[str, list[float]] = {}
_RL_WINDOW = float(os.environ.get("CLOUDGUARD_SKILL_RL_WINDOW", "60"))
_RL_MAX = int(os.environ.get("CLOUDGUARD_SKILL_RL_MAX", "20"))


def _catalog_dir() -> str | None:
    """Control-plane catalog root. Unset → seam disabled (kernel keeps its current path)."""
    d = os.environ.get("CLOUDGUARD_SKILLS_CATALOG_DIR", "").strip()
    return d or None


def _hmac_key() -> str:
    return os.environ.get(
        "CLOUDGUARD_SKILL_HMAC_KEY",
        os.environ.get("ONLYOFFICE_JWT_SECRET", "change-me-skill-hmac"),
    )


def mint_skill_token(cid: str) -> str:
    """Per-conversation token = HMAC(key, cid). Injected into the sandbox env at spawn; scoped
    to one conversation, only usable against this allowlisted/rate-limited seam."""
    return hmac.new(_hmac_key().encode(), f"skill\n{cid}".encode(), hashlib.sha256).hexdigest()


def _verify(cid: str, sig: str) -> bool:
    return bool(cid and sig) and hmac.compare_digest(sig, mint_skill_token(cid))


def _rate_ok(cid: str) -> bool:
    now = time.time()
    hits = [t for t in _RL.get(cid, []) if now - t < _RL_WINDOW]
    if len(hits) >= _RL_MAX:
        _RL[cid] = hits
        return False
    hits.append(now)
    _RL[cid] = hits
    return True


def _resolve(catalog: str, skill_id: str) -> str | None:
    """Map skill_id → SKILL.md path, FENCED under the catalog root (realpath). Supports the
    slash-namespaced layout (aws/ai-agents/foo), the colon-namespaced form the kernel uses for
    internal skills (internal:latex-report → internal/latex-report), and a basename walk
    fallback. None = not found."""
    root = os.path.realpath(catalog)
    # direct namespaced path — try the id verbatim and with ':' mapped to the path separator,
    # since internal skills are dispatched as "internal:latex-report" but live at internal/latex-report/.
    for variant in (skill_id, skill_id.replace(":", "/")):
        cand = os.path.realpath(os.path.join(root, variant, "SKILL.md"))
        if cand.startswith(root + os.sep) and os.path.isfile(cand):
            return cand
    # basename walk (skill_id is a leaf name); normalize ':' so the leaf is the final segment
    leaf = os.path.basename(skill_id.replace(":", "/").rstrip("/"))
    if leaf and leaf not in ("..", "."):
        for dirpath, _dirs, files in os.walk(root):
            if "SKILL.md" in files and os.path.basename(dirpath) == leaf:
                p = os.path.realpath(os.path.join(dirpath, "SKILL.md"))
                if p.startswith(root + os.sep):
                    return p
    return None


@router.get("/body")
async def skill_body(cid: str, skill_id: str, sig: str):
    """Return a single skill's SKILL.md body for an authorized kernel. Flag-gated by the
    catalog-dir env; auth + allowlist + rate-limit + audit enforced."""
    catalog = _catalog_dir()
    if not catalog:
        raise HTTPException(status_code=404, detail="skill seam not enabled")
    if not _verify(cid, sig):
        logger.warning("skill-body DENY (bad token) cid=%s skill_id=%s", cid, skill_id)
        raise HTTPException(status_code=403, detail="unauthorized")
    if not _rate_ok(cid):
        logger.warning("skill-body RATE-LIMIT cid=%s", cid)
        raise HTTPException(status_code=429, detail="rate limit")
    path = _resolve(catalog, skill_id)
    if not path:
        logger.info("skill-body MISS cid=%s skill_id=%s", cid, skill_id)
        raise HTTPException(status_code=404, detail="skill not found")
    try:
        body = open(path, encoding="utf-8").read()
    except OSError as exc:
        logger.error("skill-body READ-FAIL %s: %s", path, exc)
        raise HTTPException(status_code=500, detail="read error") from exc
    logger.info(
        "cg_skill_dispatch cid=%s skill_id=%s bytes=%d src=control-plane",
        cid, skill_id, len(body),
    )
    return {"skill_id": skill_id, "body": body}

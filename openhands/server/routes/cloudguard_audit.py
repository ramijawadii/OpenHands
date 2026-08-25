"""CloudGuard audit ledger — read API over cloudguard.tenant_audit (the tamper-evident,
per-tenant, hash-chained log). Powers the ACP Audit ledger + Settings Audit Log.

Every route is tenant-scoped to the resolved principal (`require_cap("read")`) — entries are
read ONLY for `principal.tenant_id`, never a client-supplied tenant. See
docs/architecture/frontend-backend-wiring/06_RBAC_AND_AUDIT.md.
"""

from __future__ import annotations

import importlib
import os

from fastapi import APIRouter, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/audit")


def _vfs_chain_dir() -> str:
    """Where the VFS flusher writes ITS chain — see `_ensure_flusher` in cloudguard_vfs.py."""
    base = os.environ.get("CLOUDGUARD_VFS_AUDIT_DIR", "/tmp/cloudguard-vfs-audit")
    return os.path.join(base, "chain")


# A TENANT HAS TWO CHAINS, NOT ONE.
#
# This is the single most misleading thing about this API and it cost a whole
# feature: `tenant_audit.append` writes to CLOUDGUARD_TENANT_AUDIT_DIR (governance,
# search, agent conversation actions), while every VFS operation goes through a
# durable outbox that a background flusher drains into a SEPARATE chain under
# CLOUDGUARD_VFS_AUDIT_DIR/chain. They are two files, two hash chains, two
# independent single writers — deliberately, so the file-op fast path never
# contends on the governance log's advisory lock.
#
# Reading only the first one made the Activity view look like a product where
# nobody ever touches a file: 1482 governance entries on display while 2380 reads,
# writes, moves and deletes sat unread in the other chain.
#
# They are UNIONED FOR READING and never merged for writing. Each keeps its own
# genesis, its own sequence and its own integrity verdict, because a merged chain
# would be neither chain's and could not be verified against either file.
def _chain_dirs() -> list[tuple[str, "str | None"]]:
    """(name, store_dir) for each chain. `None` means tenant_audit's own default."""
    return [("control", None), ("vfs", _vfs_chain_dir())]


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


# Which of an entry's `extra` fields are published to the UI.
#
# AN ALLOWLIST, NOT A PASSTHROUGH. `tenant_audit.append(**extra)` accepts whatever
# a call site cares to attach, and call sites do attach sensitive material — the
# LLM broker records prompt hashes and model errors, the seam auditors record
# redaction hits, `run_overrides` records the reason a policy was overridden.
# Shipping `extra` wholesale would turn the ledger read API into an exfiltration
# surface for anything anyone ever decided to log. Adding a key here is a
# deliberate act with a reason beside it.
_PUBLISHED_DETAILS = {
    # Which library the path is in — the same relative path exists in both, so
    # without this the UI cannot open the right version history for a row.
    "store",
    # Move and copy record where the item came FROM; the row is otherwise a
    # destination with no origin, which is the half that matters in a review.
    "source",
    # Restore-shaped actions: exactly which revision or checkpoint was used.
    "version_id",
    "commit_id",
    "checkpoint_id",
    # Attribution without persisting the prompt (see `VFSContext.trigger`).
    "trigger",
    "conversation",
    "session_id",
    # Integrity of the object as it was left by the action.
    "content_hash",
    "version",
    # Why a denial was a denial. A `deny` row with no reason is unactionable.
    "reason",
    # Share grants: who was given what.
    "principal",
    "permission",
    # Checkpoints and collections carry a human label worth showing.
    "name",
    "description",
    "item",
    "tab",
}


def _details(extra: dict) -> dict:
    """The publishable subset of an entry's `extra`, stringified and length-capped."""
    out: dict = {}
    for key in _PUBLISHED_DETAILS:
        value = extra.get(key)
        if value in (None, ""):
            continue
        out[key] = value if isinstance(value, (int, float, bool)) else str(value)[:300]
    return out


def _entry_dto(entry: dict, prev_hash: str, chain: str = "control") -> dict:
    """Map a stored audit entry to the ledger DTO the UI renders. `category`/`link` live in the
    entry's `extra`; `entry_hash` is the chain MAC, `prev_hash` the previous entry's MAC."""
    extra = entry.get("extra") or {}
    return {
        # `seq` is per-chain and therefore NOT unique across the union — the two
        # chains both start at 1. `chain` is what disambiguates it, and callers
        # that need an identity must use the pair.
        "chain": chain,
        "seq": entry.get("seq"),
        "ts": entry.get("ts"),
        "actor": entry.get("actor") or "system",
        "category": extra.get("category") or "action",
        "action": entry.get("action"),
        "resource": entry.get("resource"),
        "decision": entry.get("decision"),
        "entry_hash": entry.get("mac"),
        "prev_hash": prev_hash,
        "link": extra.get("link"),
        # NOT folded into the top level: these are the call site's own fields and
        # a reader has to be able to tell them from the six the chain guarantees.
        "details": _details(extra),
    }


@router.get("/ledger")
async def ledger(
    category: str | None = None,
    actor: str | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    p=Depends(require_cap("read")),
):
    """Return this tenant's audit entries from EVERY chain, newest first, with prev-hash attached."""
    audit = _safe("cloudguard.tenant_audit")

    dtos: list[dict] = []
    for name, store_dir in _chain_dirs():
        try:
            entries = audit.read(p.tenant_id, store_dir=store_dir)
        except Exception as exc:  # noqa: BLE001
            # One unreadable chain must not blank the whole ledger — the other
            # chain's entries are still true. A total failure is still a 503.
            if name == "control":
                raise HTTPException(status_code=503, detail=f"audit unavailable: {exc}") from exc
            continue
        # Walked in CHAIN ORDER (oldest first) so each entry's prev-hash is the
        # real previous MAC. Sorting happens afterwards, on the DTOs.
        prev_hash = "genesis"
        for e in entries:
            dtos.append(_entry_dto(e, prev_hash, chain=name))
            prev_hash = e.get("mac") or ""

    # Interleaved by time, which is the only ordering that means anything across
    # two independent sequences. `chain`/`seq` break ties so the order is stable
    # between calls rather than depending on dict iteration.
    dtos.sort(key=lambda d: (str(d.get("ts") or ""), d["chain"], d.get("seq") or 0))

    if category:
        dtos = [d for d in dtos if d["category"] == category]
    if actor:
        dtos = [d for d in dtos if d["actor"] == actor]

    total = len(dtos)
    dtos.reverse()  # newest first for display
    return {"entries": dtos[:limit], "total": total, "tenant_id": p.tenant_id}


@router.get("/verify")
async def verify(p=Depends(require_cap("read"))):
    """Walk EVERY chain and report integrity — the 'Chain: seq 1 → N · ✓ verified' header.

    Reported per chain as well as combined. "The audit log verifies" is only true
    if every chain does, but WHICH one broke is the first thing anyone responding
    to a break needs, and a single collapsed boolean throws that away.
    """
    audit = _safe("cloudguard.tenant_audit")
    chains = []
    for name, store_dir in _chain_dirs():
        try:
            status = audit.verify(p.tenant_id, store_dir=store_dir)
        except Exception as exc:  # noqa: BLE001
            status = {"ok": False, "count": 0, "broken_at": -1, "reason": f"unreadable: {exc}"}
        chains.append(
            {
                "chain": name,
                "ok": bool(status.get("ok", False)),
                "count": int(status.get("count", 0) or 0),
                "broken_at": status.get("broken_at", -1),
                "reason": status.get("reason", ""),
            }
        )
    broken = [c for c in chains if not c["ok"]]
    return {
        "ok": not broken,
        "count": sum(c["count"] for c in chains),
        "broken_at": broken[0]["broken_at"] if broken else -1,
        "reason": broken[0]["reason"] if broken else "",
        "chains": chains,
    }


@router.get("/export")
async def export(
    fmt: str = Query(default="json", alias="format"),
    p=Depends(require_cap("read")),
):
    """Signed export of the full ledger. JSON now (raw entries + integrity status); PDF later."""
    audit = _safe("cloudguard.tenant_audit")
    if fmt not in ("json",):
        raise HTTPException(status_code=400, detail="only format=json is supported yet")
    # `entries` is the UNION, so an export cannot silently omit every file
    # operation the way the ledger read used to. Each entry is tagged with the
    # chain it came from, and `chains` keeps the per-chain integrity verdicts —
    # a chain only verifies against its OWN file in its own order, so the
    # combined boolean alone would not be reproducible by a verifier.
    entries: list[dict] = []
    chains: list[dict] = []
    for name, store_dir in _chain_dirs():
        try:
            rows = audit.read(p.tenant_id, store_dir=store_dir)
            status = audit.verify(p.tenant_id, store_dir=store_dir)
        except Exception as exc:  # noqa: BLE001
            if name == "control":
                raise HTTPException(status_code=503, detail=f"audit unavailable: {exc}") from exc
            continue
        entries.extend({**row, "chain": name} for row in rows)
        chains.append({"chain": name, **status})
    entries.sort(key=lambda e: (str(e.get("ts") or ""), str(e.get("chain")), e.get("seq") or 0))
    combined = {
        "ok": all(c.get("ok") for c in chains),
        "count": sum(int(c.get("count") or 0) for c in chains),
    }
    return {
        "tenant_id": p.tenant_id,
        "entries": entries,
        "chain": combined,
        "chains": chains,
    }

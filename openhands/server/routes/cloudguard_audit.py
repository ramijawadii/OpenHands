"""CloudGuard audit ledger — read API over cloudguard.tenant_audit (the tamper-evident,
per-tenant, hash-chained log). Powers the ACP Audit ledger + Settings Audit Log.

Every route is tenant-scoped to the resolved principal (`require_cap("read")`) — entries are
read ONLY for `principal.tenant_id`, never a client-supplied tenant. See
docs/architecture/frontend-backend-wiring/06_RBAC_AND_AUDIT.md.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/audit")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _entry_dto(entry: dict, prev_hash: str) -> dict:
    """Map a stored audit entry to the ledger DTO the UI renders. `category`/`link` live in the
    entry's `extra`; `entry_hash` is the chain MAC, `prev_hash` the previous entry's MAC."""
    extra = entry.get("extra") or {}
    return {
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
    }


@router.get("/ledger")
async def ledger(
    category: str | None = None,
    actor: str | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    p=Depends(require_cap("read")),
):
    """Return this tenant's audit entries, newest first, with the prev-hash chain attached."""
    audit = _safe("cloudguard.tenant_audit")
    try:
        entries = audit.read(p.tenant_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"audit unavailable: {exc}") from exc

    dtos: list[dict] = []
    prev_hash = "genesis"  # the chain's genesis prev-MAC for the first entry
    for e in entries:  # chain order (oldest first) so prev_hash is correct
        dtos.append(_entry_dto(e, prev_hash))
        prev_hash = e.get("mac") or ""

    if category:
        dtos = [d for d in dtos if d["category"] == category]
    if actor:
        dtos = [d for d in dtos if d["actor"] == actor]

    total = len(dtos)
    dtos.reverse()  # newest first for display
    return {"entries": dtos[:limit], "total": total, "tenant_id": p.tenant_id}


@router.get("/verify")
async def verify(p=Depends(require_cap("read"))):
    """Walk the hash chain and report integrity — the 'Chain: seq 1 → N · ✓ verified' header."""
    audit = _safe("cloudguard.tenant_audit")
    status = audit.verify(p.tenant_id)
    return {
        "ok": status.get("ok", False),
        "count": status.get("count", 0),
        "broken_at": status.get("broken_at", -1),
        "reason": status.get("reason", ""),
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
    entries = audit.read(p.tenant_id)
    status = audit.verify(p.tenant_id)
    return {"tenant_id": p.tenant_id, "entries": entries, "chain": status}

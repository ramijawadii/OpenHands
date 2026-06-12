"""CloudGuard monitoring read API. Violations are derived from the tamper-evident
`tenant_audit` chain (the policy decisions that blocked/denied an action) — a read-model, not a
new store. Powers the ACP Monitoring · Violations tab. Tenant-scoped (`require_cap("read")`).
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/monitoring")

# A "violation" = a recorded decision that stopped an action.
_VIOLATION_DECISIONS = {"blocked", "denied", "rate-limited", "rate_limited"}


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


@router.get("/violations")
async def violations(
    limit: int = Query(default=200, ge=1, le=1000),
    p=Depends(require_cap("read")),
):
    """Blocked/denied policy decisions for this tenant, newest first. A blocked action is a
    GOOD signal — the policy worked; this surfaces them as evidence."""
    audit = _safe("cloudguard.tenant_audit")
    try:
        entries = audit.read(p.tenant_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"audit unavailable: {exc}") from exc

    out = []
    for e in entries:
        decision = (e.get("decision") or "").lower()
        if decision not in _VIOLATION_DECISIONS:
            continue
        extra = e.get("extra") or {}
        out.append(
            {
                "seq": e.get("seq"),
                "ts": e.get("ts"),
                "actor": e.get("actor") or "system",
                "rule": e.get("action"),
                "resource": e.get("resource"),
                "decision": e.get("decision"),
                "severity": extra.get("severity") or "Medium",
                "workspace": extra.get("workspace") or extra.get("conversation_id") or "",
            }
        )
    out.reverse()  # newest first
    return {"violations": out[:limit], "total": len(out), "tenant_id": p.tenant_id}

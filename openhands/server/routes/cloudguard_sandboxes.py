"""CloudGuard sandboxes read API. Lists the provisioned per-tenant CELLS (the isolation
environments) from the ops/cell registry — the real, queryable sandbox source. Per-run session
telemetry (CPU/RAM/egress) is a deeper runtime integration and is not yet a queryable store, so
this returns cells; the UI keeps illustrative data when the registry is empty (dev/OFF stack).
Tenant-scoped (`require_cap("read")`).
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


@router.get("/sandboxes")
async def sandboxes(p=Depends(require_cap("read"))):
    cell = _safe("cloudguard.ops.cell")
    tenancy = _safe("cloudguard.tenancy")
    try:
        cells = cell.list_cells()
    except Exception:  # noqa: BLE001
        cells = []

    # When tenancy is on, only this principal's cell is visible.
    if tenancy.is_enabled():
        cells = [c for c in cells if c.get("tenant_id") == p.tenant_id]

    out = [
        {
            "id": c.get("tenant_id", ""),
            "tenant": c.get("tenant_id", ""),
            "status": c.get("status", ""),
            "network": c.get("network", ""),
            "volume": c.get("volume", ""),
            "kg_service": c.get("kg_mcp_service") or c.get("kg-mcp-service", ""),
            "updated_at": c.get("updated_at", ""),
        }
        for c in cells
    ]
    return {"sandboxes": out, "total": len(out), "tenant_id": p.tenant_id}

"""CloudGuard Settings -> Sandbox Compute: per-role CPU/RAM allocations (real, settable config) +
a usage read-model (sessions/day from the audit ledger; CPU-hours/RAM null until pod-metrics
ingestion exists). Tenant-scoped: reads = require_cap("read"), writes = require_cap("admin").
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


class Alloc(BaseModel):
    workspace: str = "Default"
    role: str = "Analyst"
    cpu: str = "2 vCPU"
    ram_gb: int = 4
    region: str = "us-central1"
    autoscale: bool = False


class AllocsBody(BaseModel):
    allocations: list[Alloc]


@router.get("/sandbox-compute")
async def get_sandbox_compute(p=Depends(require_cap("read"))):
    sc = _safe("cloudguard.sandbox_compute")
    return {
        "allocations": sc.get_allocations(p.tenant_id),
        "usage": sc.usage_history(p.tenant_id, days=7),
        "tenant_id": p.tenant_id,
    }


@router.put("/sandbox-compute")
async def put_sandbox_compute(body: AllocsBody, p=Depends(require_cap("admin"))):
    sc = _safe("cloudguard.sandbox_compute")
    stored = sc.set_allocations(p.tenant_id, [a.dict() for a in body.allocations])
    try:
        _safe("cloudguard.tenant_audit").append(
            p.tenant_id,
            "sandbox_compute.updated",
            actor=p.subject or "console",
            resource=f"{len(stored)} allocation(s)",
            decision="updated",
            category="policy_decision",
        )
    except Exception:  # noqa: BLE001
        pass
    return {"allocations": stored, "tenant_id": p.tenant_id}

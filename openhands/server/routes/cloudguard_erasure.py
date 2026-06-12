"""CloudGuard tenant erasure API (W4 destructive) — two-person crypto-shred + deletion
certificate over cloudguard.erasure. All routes `require_cap("admin")`; the engine enforces
distinct-approver + type-to-confirm and degrades honestly when the provider can't shred.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/data-residency/erasure")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


class RequestBody(BaseModel):
    reason: str = Field(default="", max_length=4000)


class ApproveBody(BaseModel):
    reason: str = Field(default="", max_length=4000)
    confirm: str = Field(default="", max_length=32)


@router.post("/request")
async def request_erasure(body: RequestBody, p=Depends(require_cap("admin"))):
    erasure = _safe("cloudguard.erasure")
    try:
        return erasure.request_erasure(p.tenant_id, p.subject, body.reason)
    except erasure.ErasureError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.get("/pending")
async def pending(p=Depends(require_cap("admin"))):
    erasure = _safe("cloudguard.erasure")
    return {"pending": erasure.list_pending(p.tenant_id)}


@router.post("/{rid}/approve")
async def approve(rid: str, body: ApproveBody, p=Depends(require_cap("admin"))):
    """Second-person approval → executes the crypto-shred and returns the deletion certificate."""
    erasure = _safe("cloudguard.erasure")
    try:
        return erasure.approve(p.tenant_id, rid, p.subject, body.reason, body.confirm)
    except erasure.ErasureError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.delete("/{rid}")
async def cancel(rid: str, p=Depends(require_cap("admin"))):
    erasure = _safe("cloudguard.erasure")
    ok = erasure.cancel(p.tenant_id, rid, p.subject)
    if not ok:
        raise HTTPException(status_code=404, detail="erasure request not found")
    return {"cancelled": True}

"""CloudGuard kill-switch API (W4 destructive) — emergency halt state over cloudguard.kill_switch.
Status is `require_cap("read")`; activate/resume are `require_cap("admin")` + reason + audit.
Enforcement (the agent loop consulting is_active) is the follow-up integration.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/enforcement/kill-switch")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


class ActivateBody(BaseModel):
    scope: str = Field(default="org", max_length=200)
    reason: str = Field(default="", max_length=4000)


class ResumeBody(BaseModel):
    scope: str = Field(default="org", max_length=200)
    reason: str = Field(default="", max_length=4000)


@router.get("")
async def status(p=Depends(require_cap("read"))):
    ks = _safe("cloudguard.kill_switch")
    active = ks.list_active(p.tenant_id)
    return {"active": active, "any_active": bool(active)}


@router.post("/activate")
async def activate(body: ActivateBody, p=Depends(require_cap("admin"))):
    ks = _safe("cloudguard.kill_switch")
    try:
        return ks.activate(p.tenant_id, body.scope, p.subject, body.reason)
    except ks.KillSwitchError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.post("/resume")
async def resume(body: ResumeBody, p=Depends(require_cap("admin"))):
    ks = _safe("cloudguard.kill_switch")
    try:
        cleared = ks.resume(p.tenant_id, body.scope, p.subject, body.reason)
    except ks.KillSwitchError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    if not cleared:
        raise HTTPException(status_code=404, detail="no active kill at that scope")
    return {"resumed": True, "scope": body.scope}

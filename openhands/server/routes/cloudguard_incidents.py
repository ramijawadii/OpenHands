"""CloudGuard incidents API — IR records over cloudguard.incidents. Reads require `assess`;
mutations (create/status/event/owner) require `assess`; contain (links the kill switch) requires
`remediate`. All mutations append to the tenant audit chain.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/incidents")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


class CreateBody(BaseModel):
    title: str = Field(default="", max_length=300)
    severity: str = Field(default="Medium", max_length=20)
    type: str = Field(default="Manual", max_length=60)
    owner: str = Field(default="", max_length=128)


class StatusBody(BaseModel):
    status: str = Field(default="", max_length=20)


class EventBody(BaseModel):
    event: str = Field(default="", max_length=2000)


class OwnerBody(BaseModel):
    owner: str = Field(default="", max_length=128)


class ContainBody(BaseModel):
    scope: str = Field(default="", max_length=200)
    reason: str = Field(default="", max_length=2000)


@router.get("")
async def list_incidents(status: str | None = None, p=Depends(require_cap("assess"))):
    inc = _safe("cloudguard.incidents")
    return {"incidents": inc.list_incidents(p.tenant_id, status)}


@router.get("/{iid}")
async def get_incident(iid: str, p=Depends(require_cap("assess"))):
    inc = _safe("cloudguard.incidents")
    rec = inc.get(p.tenant_id, iid)
    if rec is None:
        raise HTTPException(status_code=404, detail="incident not found")
    return rec


@router.post("")
async def create_incident(body: CreateBody, p=Depends(require_cap("assess"))):
    inc = _safe("cloudguard.incidents")
    try:
        return inc.create(
            p.tenant_id,
            title=body.title,
            severity=body.severity,
            itype=body.type,
            owner=body.owner,
            actor=p.subject,
        )
    except inc.IncidentError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.post("/{iid}/status")
async def set_status(iid: str, body: StatusBody, p=Depends(require_cap("assess"))):
    inc = _safe("cloudguard.incidents")
    try:
        return inc.set_status(p.tenant_id, iid, body.status, actor=p.subject)
    except inc.IncidentError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.post("/{iid}/event")
async def add_event(iid: str, body: EventBody, p=Depends(require_cap("assess"))):
    inc = _safe("cloudguard.incidents")
    try:
        return inc.add_event(p.tenant_id, iid, event=body.event, actor=p.subject)
    except inc.IncidentError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.post("/{iid}/assign")
async def assign(iid: str, body: OwnerBody, p=Depends(require_cap("assess"))):
    inc = _safe("cloudguard.incidents")
    try:
        return inc.set_owner(p.tenant_id, iid, body.owner, actor=p.subject)
    except inc.IncidentError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.post("/{iid}/contain")
async def contain(iid: str, body: ContainBody, p=Depends(require_cap("remediate"))):
    """Containment: activate the kill switch for the scope, record it on the incident, and move
    the incident to Contained."""
    inc = _safe("cloudguard.incidents")
    ks = _safe("cloudguard.kill_switch")
    scope = body.scope or "org"
    reason = body.reason or f"containment for {iid}"
    try:
        ks.activate(p.tenant_id, scope, p.subject, reason)
        inc.add_event(p.tenant_id, iid, event=f"Contained: kill switch on {scope}", actor=p.subject)
        return inc.set_status(p.tenant_id, iid, "Contained", actor=p.subject)
    except (inc.IncidentError, ks.KillSwitchError) as exc:
        raise HTTPException(status_code=getattr(exc, "status", 400), detail=str(exc)) from exc

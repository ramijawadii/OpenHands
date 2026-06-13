"""CloudGuard admin collections API — generic list/create/delete for webhooks, service
accounts, and connectors over cloudguard.tenant_collections. Reads `require_cap("read")`;
writes `require_cap("admin")` + audit.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/collections")

# UI path segment → backend collection name.
_MAP = {
    "webhooks": "webhooks",
    "service-accounts": "service_accounts",
    "connectors": "connectors",
    # Identity / access management (members, invites, personal API tokens, sessions, roles).
    "members": "members",
    "member-invites": "member_invites",
    "api-tokens": "api_tokens",
    "sessions": "sessions",
    "roles": "roles",
    "health-alerts": "health_alerts",
    "llm-pricing": "llm_pricing",
    "llm-eval-datasets": "llm_eval_datasets",
}


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


class ItemBody(BaseModel):
    # free-form fields for the record (url/events/name/scope/...).
    class Config:
        extra = "allow"


def _collection(seg: str) -> str:
    if seg not in _MAP:
        raise HTTPException(status_code=404, detail="unknown collection")
    return _MAP[seg]


@router.get("/{seg}")
async def list_collection(seg: str, p=Depends(require_cap("read"))):
    if seg not in _MAP:
        raise HTTPException(status_code=404, detail="not found")
    tc = _safe("cloudguard.tenant_collections")
    return {"items": tc.list_items(p.tenant_id, _MAP[seg])}


@router.post("/{seg}")
async def create_item(seg: str, body: ItemBody, p=Depends(require_cap("admin"))):
    if seg not in _MAP:
        raise HTTPException(status_code=404, detail="not found")
    tc = _safe("cloudguard.tenant_collections")
    try:
        return tc.add(p.tenant_id, _MAP[seg], body.dict(), actor=p.subject)
    except tc.CollectionError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.patch("/{seg}/{item_id}")
async def update_item(
    seg: str, item_id: str, body: ItemBody, p=Depends(require_cap("admin"))
):
    if seg not in _MAP:
        raise HTTPException(status_code=404, detail="not found")
    tc = _safe("cloudguard.tenant_collections")
    try:
        rec = tc.update(p.tenant_id, _MAP[seg], item_id, body.dict(), actor=p.subject)
    except tc.CollectionError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    if rec is None:
        raise HTTPException(status_code=404, detail="item not found")
    return rec


@router.delete("/{seg}/{item_id}")
async def delete_item(seg: str, item_id: str, p=Depends(require_cap("admin"))):
    if seg not in _MAP:
        raise HTTPException(status_code=404, detail="not found")
    tc = _safe("cloudguard.tenant_collections")
    if not tc.remove(p.tenant_id, _MAP[seg], item_id, actor=p.subject):
        raise HTTPException(status_code=404, detail="item not found")
    return {"removed": True, "id": item_id}

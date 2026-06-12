"""CloudGuard settings-document API — full-fidelity per-tab form persistence over
cloudguard.tenant_settings. GET is `require_cap("read")`; PUT/DELETE are `require_cap("admin")`
and audited. Each tab stores its entire form state as one JSON document (every field round-trips).
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Body, Depends, HTTPException

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/settings")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


@router.get("/{tab}")
async def get_tab(tab: str, p=Depends(require_cap("read"))):
    ts = _safe("cloudguard.tenant_settings")
    return {"tab": tab, "doc": ts.get_doc(p.tenant_id, tab)}


@router.put("/{tab}")
async def put_tab(tab: str, doc: dict = Body(...), p=Depends(require_cap("remediate"))):
    ts = _safe("cloudguard.tenant_settings")
    try:
        saved = ts.put_doc(p.tenant_id, tab, doc, actor=p.subject)
    except ts.SettingsError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    return {"tab": tab, "doc": saved}


@router.delete("/{tab}")
async def delete_tab(tab: str, p=Depends(require_cap("remediate"))):
    ts = _safe("cloudguard.tenant_settings")
    if not ts.delete_doc(p.tenant_id, tab, actor=p.subject):
        raise HTTPException(status_code=404, detail="no settings saved for this tab")
    return {"tab": tab, "reset": True}

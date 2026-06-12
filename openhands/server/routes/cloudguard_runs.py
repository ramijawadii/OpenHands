"""CloudGuard runs read-model. A "run" = a conversation the agent has worked, derived from the
per-conversation `modes` store and enriched with activity from the tamper-evident `tenant_audit`
chain. No new store — a read-model (see 02 mapping notes). Tenant-scoped (`require_cap("read")`).
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


def _status(rec: dict) -> str:
    if rec.get("plan_status") == "ready":
        return "Plan ready — awaiting decision"
    if rec.get("plan_status") == "decided":
        return f"Plan decided: {rec.get('plan_decision') or '—'}"
    return "Active"


@router.get("/runs")
async def runs(p=Depends(require_cap("read"))):
    modes = _safe("cloudguard.modes")
    audit = _safe("cloudguard.tenant_audit")

    try:
        records = modes.list_records()
    except Exception:  # noqa: BLE001
        records = []

    # Activity per conversation from the audit chain (count + last decision/ts).
    by_conv: dict[str, dict] = {}
    try:
        for e in audit.read(p.tenant_id):
            cid = (e.get("extra") or {}).get("conversation_id")
            if not cid:
                continue
            d = by_conv.setdefault(cid, {"count": 0, "last_ts": "", "last_decision": ""})
            d["count"] += 1
            d["last_ts"] = e.get("ts", "")
            d["last_decision"] = e.get("decision", "")
    except Exception:  # noqa: BLE001
        pass

    out = []
    for r in records:
        cid = r["conversation_id"]
        act = by_conv.get(cid, {})
        out.append(
            {
                "id": cid,
                "mode": r["mode"],
                "status": _status(r),
                "started": r["updated_at"],
                "activity": act.get("count", 0),
                "last_decision": act.get("last_decision", ""),
            }
        )
    out.sort(key=lambda x: x["started"] or "", reverse=True)
    return {"runs": out, "total": len(out), "tenant_id": p.tenant_id}

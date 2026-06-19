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
    mode_by_cid = {r["conversation_id"]: r for r in records}

    # Activity per conversation from the audit chain (count + last decision/ts). The action
    # recorder stamps the conversation under extra.session_id (conversation_id is the alias);
    # accept either so a conversation that did real work is always discoverable.
    by_conv: dict[str, dict] = {}
    try:
        for e in audit.read(p.tenant_id):
            ex = e.get("extra") or {}
            cid = ex.get("conversation_id") or ex.get("session_id")
            if not cid:
                continue
            d = by_conv.setdefault(cid, {"count": 0, "last_ts": "", "last_decision": ""})
            d["count"] += 1
            d["last_ts"] = e.get("ts", "")
            d["last_decision"] = e.get("decision", "")
    except Exception:  # noqa: BLE001
        pass

    # A "run" = any conversation with a mode record OR audit activity (so runs surface even when
    # the mode store has no record yet — the common case for a freshly-worked conversation).
    all_cids = list(dict.fromkeys(list(mode_by_cid.keys()) + list(by_conv.keys())))
    out = []
    for cid in all_cids:
        r = mode_by_cid.get(cid, {})
        act = by_conv.get(cid, {})
        out.append(
            {
                "id": cid,
                "mode": r.get("mode", "—"),
                "status": _status(r) if r else "Active",
                "started": (r.get("updated_at") or act.get("last_ts", "")),
                "activity": act.get("count", 0),
                "last_decision": act.get("last_decision", ""),
            }
        )
    out.sort(key=lambda x: x["started"] or "", reverse=True)
    return {"runs": out, "total": len(out), "tenant_id": p.tenant_id}


@router.get("/runs/{rid}")
async def run_detail(rid: str, p=Depends(require_cap("read"))):
    """One run: its mode record + a timeline derived from the audit chain (the events stamped
    with this conversation id). Trace/tool-call/artifact tabs need richer trajectory data and
    remain illustrative."""
    modes = _safe("cloudguard.modes")
    audit = _safe("cloudguard.tenant_audit")
    rec = modes.get_record(rid)

    timeline = []
    try:
        for e in audit.read(p.tenant_id):
            if (e.get("extra") or {}).get("conversation_id") != rid:
                continue
            timeline.append(
                {
                    "seq": e.get("seq"),
                    "ts": e.get("ts"),
                    "type": (e.get("extra") or {}).get("category") or "action",
                    "action": e.get("action"),
                    "resource": e.get("resource"),
                    "decision": e.get("decision"),
                    "actor": e.get("actor") or "system",
                }
            )
    except Exception:  # noqa: BLE001
        pass

    return {
        "id": rid,
        "mode": rec.get("mode"),
        "status": _status(rec),
        "started": rec.get("updated_at", ""),
        "plan_status": rec.get("plan_status"),
        "timeline": timeline,
        "activity": len(timeline),
        "tenant_id": p.tenant_id,
    }

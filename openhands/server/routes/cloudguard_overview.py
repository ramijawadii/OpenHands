"""CloudGuard ACP Overview aggregate — composes live counts from the already-wired sources
(pending approvals, audit-derived violations, audit chain status, tenancy posture) for the
10-second owner view. Read-only, tenant-scoped (`require_cap("read")`).
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard")

_VIOLATION_DECISIONS = {"blocked", "denied", "rate-limited", "rate_limited"}


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _run_status(rec: dict) -> str:
    if rec.get("plan_status") == "ready":
        return "Plan ready"
    if rec.get("plan_status") == "decided":
        return f"Plan {rec.get('plan_decision') or 'decided'}"
    return "Running"


@router.get("/overview")
async def overview(p=Depends(require_cap("read"))):
    approval = _safe("cloudguard.approval")
    audit = _safe("cloudguard.tenant_audit")
    tenancy = _safe("cloudguard.tenancy")

    try:
        pending = len(approval.list_requests("pending"))
    except Exception:  # noqa: BLE001
        pending = 0
    try:
        entries = audit.read(p.tenant_id)
        violations = sum(
            1 for e in entries if (e.get("decision") or "").lower() in _VIOLATION_DECISIONS
        )
        chain = audit.verify(p.tenant_id)
    except Exception:  # noqa: BLE001
        violations, chain = 0, {"ok": True, "count": 0}

    # Real runs read-model: a run = any conversation with a mode record OR audit activity (so a
    # freshly-worked conversation surfaces even before a mode record exists). active = not decided.
    active_runs, recent_runs = 0, []
    try:
        modes = importlib.import_module("cloudguard.modes")
        records = modes.list_records() or []
        mode_by_cid = {r.get("conversation_id"): r for r in records}

        act_by_cid: dict[str, dict] = {}
        try:
            for e in audit.read(p.tenant_id):
                ex = e.get("extra") or {}
                cid = ex.get("conversation_id") or ex.get("session_id")
                if not cid:
                    continue
                d = act_by_cid.setdefault(cid, {"count": 0, "last_ts": ""})
                d["count"] += 1
                d["last_ts"] = e.get("ts", "")
        except Exception:  # noqa: BLE001
            pass

        all_cids = list(dict.fromkeys(list(mode_by_cid.keys()) + list(act_by_cid.keys())))
        rows = []
        for cid in all_cids:
            r = mode_by_cid.get(cid) or {}
            a = act_by_cid.get(cid) or {}
            rows.append(
                {
                    "id": cid or "",
                    "short": (cid[:8] if cid else "—"),
                    "mode": r.get("mode") or "—",
                    "status": _run_status(r) if r else "Active",
                    "started": (r.get("updated_at") or a.get("last_ts") or ""),
                    "decided": r.get("plan_status") == "decided",
                }
            )
        active_runs = sum(1 for x in rows if not x["decided"])
        rows.sort(key=lambda x: x["started"], reverse=True)
        recent_runs = [{k: v for k, v in x.items() if k != "decided"} for x in rows[:5]]
    except Exception:  # noqa: BLE001
        active_runs, recent_runs = 0, []

    return {
        "pending_approvals": pending,
        "violations": violations,
        "active_runs": active_runs,
        "recent_runs": recent_runs,
        "audit": {"ok": chain.get("ok", True), "count": chain.get("count", 0)},
        "tenancy": {"enabled": tenancy.is_enabled(), "strict": tenancy.is_strict()},
        "tenant_id": p.tenant_id,
    }

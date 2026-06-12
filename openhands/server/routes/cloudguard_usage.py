"""CloudGuard usage read-model — aggregates real activity (audit chain + runs) into usage
metrics for the Settings · Usage tab. No new store; tenant-scoped (`require_cap("read")`).
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


@router.get("/usage")
async def usage(p=Depends(require_cap("read"))):
    audit = _safe("cloudguard.tenant_audit")
    modes = _safe("cloudguard.modes")

    try:
        runs = len(modes.list_records())
    except Exception:  # noqa: BLE001
        runs = 0

    by_category: dict[str, int] = {}
    by_actor: dict[str, int] = {}
    violations = 0
    actions = 0
    try:
        for e in audit.read(p.tenant_id):
            actions += 1
            cat = (e.get("extra") or {}).get("category") or "action"
            by_category[cat] = by_category.get(cat, 0) + 1
            actor = e.get("actor") or "system"
            by_actor[actor] = by_actor.get(actor, 0) + 1
            if (e.get("decision") or "").lower() in _VIOLATION_DECISIONS:
                violations += 1
    except Exception:  # noqa: BLE001
        pass

    top_actors = sorted(
        ({"actor": a, "count": c} for a, c in by_actor.items()),
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    return {
        "runs": runs,
        "actions": actions,
        "violations": violations,
        "by_category": by_category,
        "by_actor": top_actors,
        "period": "all-time",
        "tenant_id": p.tenant_id,
    }

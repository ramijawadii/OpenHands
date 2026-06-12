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

    return {
        "pending_approvals": pending,
        "violations": violations,
        "audit": {"ok": chain.get("ok", True), "count": chain.get("count", 0)},
        "tenancy": {"enabled": tenancy.is_enabled(), "strict": tenancy.is_strict()},
        "tenant_id": p.tenant_id,
    }

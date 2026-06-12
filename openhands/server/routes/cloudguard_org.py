"""CloudGuard organization read API. Starts with the authoritative RBAC role model
(`/api/cloudguard/org/roles`) — the real capability/tier each canonical role grants, from
cloudguard.rbac. This is the CISO least-privilege attestation surface (Settings · User Roles).
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/org")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


@router.get("/roles")
async def roles(p=Depends(require_cap("read"))):
    """Return the authoritative RBAC matrix: each role → capabilities + max tier. Read-only;
    reflects cloudguard/rbac.py exactly (Tier 4 is never grantable to any role)."""
    rbac = _safe("cloudguard.rbac")
    out = []
    for role in rbac.Role:
        pol = rbac.policy_for(role)
        out.append(
            {
                "role": role.value,
                "capabilities": sorted(pol.capabilities),
                "max_tier": pol.max_tier,
                "is_default": role == rbac.DEFAULT_ROLE,
            }
        )
    return {"roles": out, "tier4_grantable": False}

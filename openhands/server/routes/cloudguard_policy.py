"""CloudGuard tenant-policy API — the tenant-default guardrails / limits / isolation that the
Settings tabs edit and the Enforcement "Active Policy" reflects. Reads are `require_cap("read")`;
writes are `require_cap("admin")` and append to the tamper-evident audit chain. Backed by
cloudguard.tenant_policy (per-tenant config). See 04 §4.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/cloudguard")


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _audit(principal, action, *, decision="updated", category="policy_decision"):
    try:
        importlib.import_module("cloudguard.tenant_audit").append(
            principal.tenant_id,
            action,
            actor=principal.subject,
            decision=decision,
            category=category,
        )
    except Exception as exc:  # noqa: BLE001
        import logging

        logging.getLogger("openhands").warning("cloudguard policy audit failed: %s", exc)


# Lazy deps so the module imports even if cloudguard isn't on PYTHONPATH yet.
from openhands.server.routes.cloudguard_principal import require_cap  # noqa: E402


class GuardrailsBody(BaseModel):
    autonomy_mode: str | None = None
    action_gates: dict | None = None


class IsolationBody(BaseModel):
    tier: str | None = None
    egress: str | None = None


class LimitsBody(BaseModel):
    tokens_per_run: int | None = None
    tools_per_run: int | None = None
    monthly_spend_cap_usd: int | None = None


def _section(p, name: str) -> dict:
    return _safe("cloudguard.tenant_policy").get_policy(p.tenant_id)[name]


def _update(p, name: str, patch: dict, action: str) -> dict:
    tp = _safe("cloudguard.tenant_policy")
    pol = tp.set_policy(p.tenant_id, {name: {k: v for k, v in patch.items() if v is not None}})
    _audit(p, action)
    return pol[name]


@router.get("/guardrails")
async def get_guardrails(p=Depends(require_cap("read"))):
    return _section(p, "guardrails")


@router.put("/guardrails")
async def put_guardrails(body: GuardrailsBody, p=Depends(require_cap("admin"))):
    return _update(p, "guardrails", body.dict(), "policy.guardrails.updated")


@router.get("/isolation")
async def get_isolation(p=Depends(require_cap("read"))):
    return _section(p, "isolation")


@router.put("/isolation")
async def put_isolation(body: IsolationBody, p=Depends(require_cap("admin"))):
    return _update(p, "isolation", body.dict(), "policy.isolation.updated")


@router.get("/workspace/limits")
async def get_limits(p=Depends(require_cap("read"))):
    return _section(p, "limits")


@router.put("/workspace/limits")
async def put_limits(body: LimitsBody, p=Depends(require_cap("admin"))):
    return _update(p, "limits", body.dict(), "policy.limits.updated")

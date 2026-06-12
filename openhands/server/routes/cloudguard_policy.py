"""CloudGuard tenant-policy API — the tenant-default guardrails / limits / isolation that the
Settings tabs edit and the Enforcement "Active Policy" reflects. Reads are `require_cap("read")`;
writes are `require_cap("admin")` and append to the tamper-evident audit chain. Backed by
cloudguard.tenant_policy (per-tenant config). See 04 §4.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

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


class ResidencyBody(BaseModel):
    region: str | None = None
    retention_days: int | None = None


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


@router.get("/data-residency")
async def get_residency(p=Depends(require_cap("read"))):
    return _section(p, "residency")


@router.put("/data-residency")
async def put_residency(body: ResidencyBody, p=Depends(require_cap("admin"))):
    return _update(p, "residency", body.dict(), "policy.residency.updated")


# ── Per-run overrides (tighten-only) ──────────────────────────────────────────
class OverrideBody(BaseModel):
    scope: str = Field(default="", max_length=200)
    type: str = Field(default="tighten_mode", max_length=40)
    original: str = Field(default="", max_length=200)
    overridden: str = Field(default="", max_length=200)
    expires: str = Field(default="", max_length=100)


@router.get("/enforcement/overrides")
async def list_overrides(p=Depends(require_cap("read"))):
    ro = _safe("cloudguard.run_overrides")
    return {"overrides": ro.list_active(p.tenant_id)}


@router.post("/enforcement/overrides")
async def create_override(body: OverrideBody, p=Depends(require_cap("remediate"))):
    ro = _safe("cloudguard.run_overrides")
    try:
        return ro.create(
            p.tenant_id,
            scope=body.scope,
            otype=body.type,
            original=body.original,
            overridden=body.overridden,
            created_by=p.subject,
            expires=body.expires,
        )
    except ro.OverrideError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.delete("/enforcement/overrides/{oid}")
async def revoke_override(oid: str, p=Depends(require_cap("remediate"))):
    ro = _safe("cloudguard.run_overrides")
    if not ro.revoke(p.tenant_id, oid, p.subject):
        raise HTTPException(status_code=404, detail="override not found")
    return {"revoked": True, "id": oid}

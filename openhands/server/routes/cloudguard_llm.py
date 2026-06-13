"""CloudGuard Models & Inference API — model config + controlled migration (admin) and
inference analytics (usage/performance/reliability/cost/routing/logs) derived from the
inference_record telemetry. Tenant-scoped; reads = `require_cap("read")`, config/migration =
`require_cap("admin")`. See docs/architecture/llm-tab/.
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/llm")


def _safe(name: str):
    try:
        return importlib.import_module(name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _filters(model, agent, workflow, workspace, environment) -> dict:
    return {
        k: v
        for k, v in {
            "model": model,
            "agent": agent,
            "workflow": workflow,
            "workspace": workspace,
            "environment": environment,
        }.items()
        if v
    }


@router.get("/config")
async def get_config(p=Depends(require_cap("read"))):
    cfg = _safe("cloudguard.llm_config")
    return cfg.get_config(p.tenant_id)


@router.put("/config")
async def put_config(patch: dict = Body(...), p=Depends(require_cap("admin"))):
    cfg = _safe("cloudguard.llm_config")
    return cfg.put_config(p.tenant_id, patch, actor=p.subject)


@router.get("/registry")
async def registry(p=Depends(require_cap("read"))):
    reg = _safe("cloudguard.llm_registry")
    cfg = _safe("cloudguard.llm_config")
    return {
        "models": reg.list_models(),
        "vendor_default": reg.vendor_default(),
        "scheduled_upgrade": cfg.scheduled_upgrade(p.tenant_id),
    }


@router.post("/models/migrate")
async def migrate(body: dict = Body(...), p=Depends(require_cap("admin"))):
    cfg = _safe("cloudguard.llm_config")
    to_model = body.get("to_model")
    to_version = body.get("to_version")
    if not to_model or not to_version:
        raise HTTPException(status_code=400, detail="to_model and to_version required")
    return cfg.migrate(p.tenant_id, to_model, to_version, actor=p.subject)


@router.post("/models/rollback")
async def rollback(p=Depends(require_cap("admin"))):
    cfg = _safe("cloudguard.llm_config")
    out = cfg.rollback(p.tenant_id, actor=p.subject)
    if out is None:
        raise HTTPException(status_code=409, detail="no prior version to roll back to")
    return out


def _analytics(fn: str, p, window: int, flt: dict):
    a = _safe("cloudguard.llm_analytics")
    return getattr(a, fn)(p.tenant_id, window_sec=window, filters=flt)


@router.get("/usage")
async def usage(
    window: int = Query(default=86400, ge=60, le=7776000),
    model: str = "", agent: str = "", workflow: str = "", workspace: str = "", environment: str = "",
    p=Depends(require_cap("read")),
):
    return _analytics("usage", p, window, _filters(model, agent, workflow, workspace, environment))


@router.get("/performance")
async def performance(
    window: int = Query(default=86400, ge=60, le=7776000),
    model: str = "", workflow: str = "", workspace: str = "",
    p=Depends(require_cap("read")),
):
    return _analytics("performance", p, window, _filters(model, "", workflow, workspace, ""))


@router.get("/reliability")
async def reliability(
    window: int = Query(default=86400, ge=60, le=7776000),
    model: str = "", workflow: str = "",
    p=Depends(require_cap("read")),
):
    return _analytics("reliability", p, window, _filters(model, "", workflow, "", ""))


@router.get("/cost")
async def cost(
    window: int = Query(default=86400, ge=60, le=7776000),
    model: str = "", workflow: str = "", workspace: str = "",
    p=Depends(require_cap("read")),
):
    return _analytics("cost", p, window, _filters(model, "", workflow, workspace, ""))


@router.get("/routing")
async def routing(
    window: int = Query(default=86400, ge=60, le=7776000),
    p=Depends(require_cap("read")),
):
    return _analytics("routing", p, window, {})


@router.get("/quotas")
async def quotas(
    window: int = Query(default=2592000, ge=60, le=7776000),
    p=Depends(require_cap("read")),
):
    a = _safe("cloudguard.llm_analytics")
    cfg = _safe("cloudguard.llm_config")
    return {"utilisation": a.quotas(p.tenant_id, window_sec=window), "config": cfg.get_config(p.tenant_id)}


@router.post("/quotas/increase")
async def quota_increase(body: dict = Body(default={}), p=Depends(require_cap("remediate"))):
    """Audited request for a limit increase."""
    audit = _safe("cloudguard.tenant_audit")
    try:
        audit.append(
            p.tenant_id,
            "llm.quota.increase_requested",
            actor=p.subject,
            decision="request",
            category="llm",
            limit=str(body.get("limit", "")),
            requested=str(body.get("requested", "")),
            reason=str(body.get("reason", ""))[:300],
        )
    except Exception:  # noqa: BLE001
        pass
    return {"requested": True}


@router.get("/quality")
async def quality(
    window: int = Query(default=2592000, ge=60, le=7776000),
    p=Depends(require_cap("read")),
):
    a = _safe("cloudguard.llm_analytics")
    return a.quality(p.tenant_id, window_sec=window)


@router.get("/logs")
async def logs(
    window: int = Query(default=86400, ge=60, le=7776000),
    limit: int = Query(default=200, ge=1, le=2000),
    model: str = "", agent: str = "", workflow: str = "", workspace: str = "", environment: str = "",
    p=Depends(require_cap("read")),
):
    """Raw inference records (metadata only — no prompt/response content is stored here)."""
    ir = _safe("cloudguard.observability.inference_record")
    rows = ir.read(
        p.tenant_id,
        window_sec=window,
        filters=_filters(model, agent, workflow, workspace, environment),
        limit=limit,
    )
    return {"rows": rows, "total": len(rows), "tenant_id": p.tenant_id}


@router.post("/seed")
async def seed_sample(
    n: int = Query(default=600, ge=1, le=5000),
    p=Depends(require_cap("remediate")),
):
    """Populate this tenant with SAMPLE inference records (demo/eval) so analytics + charts show."""
    ir = _safe("cloudguard.observability.inference_record")
    return {"seeded": ir.seed(p.tenant_id, n=n)}


@router.get("/overview")
async def overview(
    window: int = Query(default=2592000, ge=60, le=7776000),
    p=Depends(require_cap("read")),
):
    cfg = _safe("cloudguard.llm_config")
    a = _safe("cloudguard.llm_analytics")
    u = a.usage(p.tenant_id, window_sec=window)
    perf = a.performance(p.tenant_id, window_sec=window)
    rel = a.reliability(p.tenant_id, window_sec=window)
    c = a.cost(p.tenant_id, window_sec=window)
    conf = cfg.get_config(p.tenant_id)
    return {
        "active_model": conf.get("active_model"),
        "model_version": conf.get("model_version"),
        "fallback_model": conf.get("fallback_model"),
        "region": conf.get("region"),
        "requests": u["requests"],
        "success_rate_pct": rel["success_rate_pct"],
        "latency_p95_ms": perf["latency_p95_ms"],
        "input_tokens": u["input_tokens"],
        "output_tokens": u["output_tokens"],
        "estimated_cost_usd": c["total_usd"],
        "scheduled_upgrade": cfg.scheduled_upgrade(p.tenant_id),
        "tenant_id": p.tenant_id,
    }

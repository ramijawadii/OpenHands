"""CloudGuard monitoring read API. Violations are derived from the tamper-evident
`tenant_audit` chain (the policy decisions that blocked/denied an action) — a read-model, not a
new store. Powers the ACP Monitoring · Violations tab. Tenant-scoped (`require_cap("read")`).
"""

from __future__ import annotations

import importlib

from fastapi import APIRouter, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/monitoring")

# A "violation" = a recorded decision that stopped an action.
_VIOLATION_DECISIONS = {"blocked", "denied", "rate-limited", "rate_limited"}


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


# UI display names + legacy status words (keeps the ACP Monitoring card working).
_NAMES = {
    "control_plane": "Control plane",
    "llm": "LLM API",
    "tools": "Tools",
    "container": "Conversation container",
    "env_model": "Environment modelling",
    "mcp": "MCP servers",
    "sandbox": "Sandboxes",
    "connector": "Connectors",
}
_ST = {"ok": "Healthy", "degraded": "Degraded", "fail": "Down", "skip": "Unknown"}
_FILTER_KEYS = ("conversation", "workspace", "user", "environment", "connector", "mcp_server", "model", "tool")


def _labels(**kw) -> dict:
    return {k: v for k, v in kw.items() if v}


def _compat(sub: dict) -> dict:
    """Add legacy {sub,a,b,st} so the existing ACP Monitoring card renders unchanged."""
    metrics = sub.get("metrics") or {}
    b = ""
    if metrics:
        k, v = next(iter(metrics.items()))
        b = f"{k.replace('_', ' ')}: {v}"
    return {
        **sub,
        "sub": _NAMES.get(sub["subsystem"], sub["subsystem"]),
        "a": sub.get("summary", ""),
        "b": b,
        "st": _ST.get(sub.get("status"), "Unknown"),
    }


def _load_alert_rules(tenant_id: str) -> list:
    tc = _safe("cloudguard.tenant_collections")
    try:
        return tc.list_items(tenant_id, "health_alerts") if tc else []
    except Exception:  # noqa: BLE001
        return []


@router.get("/health")
async def health(
    conversation: str = Query(default=""),
    workspace: str = Query(default=""),
    user: str = Query(default=""),
    environment: str = Query(default=""),
    connector: str = Query(default=""),
    p=Depends(require_cap("read")),
):
    """Head-to-toe HealthSnapshot for every subsystem, scoped by the filter labels. Persists a
    periodic snapshot (throttled) and evaluates alert rules as a side effect of the poll."""
    hm = _safe("cloudguard.health_monitor")
    labels = _labels(conversation=conversation, workspace=workspace, user=user,
                      environment=environment, connector=connector)
    snap = hm.collect(p.tenant_id, labels)
    # persist (throttled to the snapshot interval) + evaluate alerts — best-effort, never block read
    try:
        store = _safe("cloudguard.health_store")
        if store:
            store.record(p.tenant_id, snap, min_interval=60)
    except Exception:  # noqa: BLE001
        pass
    try:
        alerts = _safe("cloudguard.health_alerts")
        if alerts:
            alerts.evaluate(p.tenant_id, snap, _load_alert_rules(p.tenant_id))
    except Exception:  # noqa: BLE001
        pass
    return {
        "overall": snap["overall"],
        "subsystems": [_compat(s) for s in snap["subsystems"]],
        "tenant_id": p.tenant_id,
        "ts": snap["ts"],
    }


@router.get("/health/subsystem/{name}")
async def health_subsystem(
    name: str,
    environment: str = Query(default=""),
    connector: str = Query(default=""),
    p=Depends(require_cap("read")),
):
    hm = _safe("cloudguard.health_monitor")
    detail = hm.subsystem_detail(p.tenant_id, name, _labels(environment=environment, connector=connector))
    if detail is None:
        raise HTTPException(status_code=404, detail="unknown subsystem")
    return _compat(detail)


@router.get("/health/series")
async def health_series(
    subsystem: str = Query(...),
    metric: str = Query(default="score"),
    window: int = Query(default=120, ge=0, le=2000),
    p=Depends(require_cap("read")),
):
    hm = _safe("cloudguard.health_monitor")
    return {"subsystem": subsystem, "metric": metric, "points": hm.series(p.tenant_id, subsystem, metric, window)}


@router.get("/health/snapshots")
async def health_snapshots(
    window_sec: int = Query(default=3600, ge=60, le=7776000),
    p=Depends(require_cap("read")),
):
    store = _safe("cloudguard.health_store")
    return {"snapshots": store.read(p.tenant_id, window_sec=window_sec), "tenant_id": p.tenant_id}


@router.get("/health/snapshot")
async def health_snapshot_at(at: str = Query(...), p=Depends(require_cap("read"))):
    store = _safe("cloudguard.health_store")
    snap = store.snapshot_at(p.tenant_id, at)
    if snap is None:
        raise HTTPException(status_code=404, detail="no snapshot near that time")
    return snap


@router.get("/health/history")
async def health_history(
    limit: int = Query(default=200, ge=1, le=1000),
    p=Depends(require_cap("read")),
):
    """Audited health state transitions + alert fires/acks (category='health'), newest first."""
    audit = _safe("cloudguard.tenant_audit")
    try:
        entries = audit.read(p.tenant_id)
    except Exception:  # noqa: BLE001
        entries = []
    out = [e for e in entries if (e.get("category") == "health")]
    out.reverse()
    return {"events": out[:limit], "total": len(out), "tenant_id": p.tenant_id}


@router.post("/health/probe")
async def health_probe(p=Depends(require_cap("remediate"))):
    """Force an immediate collect + persist (operator action)."""
    hm = _safe("cloudguard.health_monitor")
    store = _safe("cloudguard.health_store")
    snap = hm.collect(p.tenant_id, {})
    try:
        store.record(p.tenant_id, snap, min_interval=0)
    except Exception:  # noqa: BLE001
        pass
    return {"overall": snap["overall"], "ts": snap["ts"], "probed": True}


@router.post("/health/alerts/{rule_id}/ack")
async def health_alert_ack(rule_id: str, p=Depends(require_cap("remediate"))):
    alerts = _safe("cloudguard.health_alerts")
    ok = alerts.acknowledge(p.tenant_id, rule_id, actor=p.subject)
    if not ok:
        raise HTTPException(status_code=503, detail="ack failed")
    return {"acked": True, "rule_id": rule_id}


@router.get("/violations")
async def violations(
    limit: int = Query(default=200, ge=1, le=1000),
    p=Depends(require_cap("read")),
):
    """Blocked/denied policy decisions for this tenant, newest first. A blocked action is a
    GOOD signal — the policy worked; this surfaces them as evidence."""
    audit = _safe("cloudguard.tenant_audit")
    try:
        entries = audit.read(p.tenant_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"audit unavailable: {exc}") from exc

    out = []
    for e in entries:
        decision = (e.get("decision") or "").lower()
        if decision not in _VIOLATION_DECISIONS:
            continue
        extra = e.get("extra") or {}
        out.append(
            {
                "seq": e.get("seq"),
                "ts": e.get("ts"),
                "actor": e.get("actor") or "system",
                "rule": e.get("action"),
                "resource": e.get("resource"),
                "decision": e.get("decision"),
                "severity": extra.get("severity") or "Medium",
                "workspace": extra.get("workspace") or extra.get("conversation_id") or "",
            }
        )
    out.reverse()  # newest first
    return {"violations": out[:limit], "total": len(out), "tenant_id": p.tenant_id}

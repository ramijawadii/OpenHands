"""Metrics exposition — two views over one collector registry.

    GET /metrics                                  operator view
      Bearer scrape token. EVERY tenant, each series labelled `tenant_id`.
      This is what Prometheus (local compose or GKE Managed Prometheus) scrapes.

    GET /api/cloudguard/monitoring/metrics        per-tenant view
      Principal + capability. Filtered to the CALLER'S tenant only.
      Safe to surface in-product; a tenant can never see another's series.

Both call `collect_all()`, so coverage cannot drift between what an operator
sees and what a tenant is allowed to see. The tenant filter is applied inside
the registry, centrally — not trusted to each collector — and the registry
re-checks every sample against the scope before rendering.

WHY A TOKEN, NOT "INTERNAL ONLY": the app's listener is published on the host in
local Docker (3000:3000, all interfaces) and behind an ingress on GKE. Treating
the port as private would be an assumption, not a control. The token is the
control; moving to a dedicated unpublished port later is defence in depth, not a
replacement.
"""

from __future__ import annotations

import hmac
import importlib
import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Response

from openhands.server.routes.cloudguard_principal import require_cap

logger = logging.getLogger("openhands")

router = APIRouter()

_TOKEN_ENV = "CLOUDGUARD_METRICS_TOKEN"
_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"


def _metrics_modules():
    """Import the metrics plane, registering every collector as a side effect."""
    metrics = importlib.import_module("cloudguard.metrics")
    importlib.import_module("cloudguard.metrics.collectors")
    return metrics


def _known_tenants() -> list:
    """Tenants to report on. Derived from what has actually written data, so a
    fresh deployment exposes an empty (valid) scrape rather than failing."""
    found: set = set()
    for module_name, env, default in (
        ("cloudguard.health_store", "CLOUDGUARD_HEALTH_DIR", "/cloudguard-app-private/health"),
        (
            "cloudguard.client_event_store",
            "CLOUDGUARD_CLIENT_EVENTS_DIR",
            "/cloudguard-app-private/client-events",
        ),
    ):
        try:
            importlib.import_module(module_name)
            root = os.environ.get(env) or default
            found.update(os.listdir(root))
        except Exception:  # noqa: BLE001 — absence is normal, not an error
            continue
    return sorted(t for t in found if not t.startswith("."))


@router.get("/metrics")
async def operator_metrics(
    authorization: str | None = Header(default=None),
    x_metrics_token: str | None = Header(default=None),
):
    """All-tenant exposition for Prometheus. Requires the scrape token."""
    expected = os.environ.get(_TOKEN_ENV, "")
    if not expected:
        # Fail CLOSED. An unauthenticated all-tenant metrics endpoint would be a
        # cross-tenant disclosure channel, so a missing token disables the view
        # rather than opening it.
        raise HTTPException(status_code=404, detail="metrics not configured")

    supplied = x_metrics_token or ""
    if not supplied and authorization and authorization.lower().startswith("bearer "):
        supplied = authorization[7:]
    # Constant-time: a naive == leaks the token a character at a time.
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="invalid metrics token")

    try:
        metrics = _metrics_modules()
        body = metrics.render(metrics.collect_all(_known_tenants()))
    except Exception:  # noqa: BLE001
        # Observability must never take the app down, and a scrape failure must
        # be visible as a scrape failure rather than a 500 storm.
        logger.warning("metrics collection failed", exc_info=True)
        body = "# metrics collection failed\n"
    return Response(content=body, media_type=_CONTENT_TYPE)


@router.get("/api/cloudguard/monitoring/metrics")
async def tenant_metrics(p=Depends(require_cap("read"))):
    """Exposition scoped to the caller's tenant. Principal-authenticated."""
    del p  # capability enforced by the dependency
    try:
        metrics = _metrics_modules()
        tenancy = importlib.import_module("cloudguard.tenancy")
        tenant = tenancy.resolve_tenant_id()  # server-side; never from the client
        body = metrics.render(
            metrics.collect_all([tenant], tenant_scope=tenant)
        )
    except Exception:  # noqa: BLE001
        logger.warning("tenant metrics collection failed", exc_info=True)
        body = "# metrics collection failed\n"
    return Response(content=body, media_type=_CONTENT_TYPE)

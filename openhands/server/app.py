import contextlib
import warnings
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi.routing import Mount

with warnings.catch_warnings():
    warnings.simplefilter('ignore')

from fastapi import (
    FastAPI,
    Request,
)
from fastapi.responses import JSONResponse

import openhands.agenthub  # noqa F401 (we import this to get the agents registered)
from openhands import __version__
from openhands.integrations.service_types import AuthenticationError
from openhands.server.routes.conversation import app as conversation_api_router
from openhands.server.routes.feedback import app as feedback_api_router
from openhands.server.routes.files import app as files_api_router
from openhands.server.routes.git import app as git_api_router
from openhands.server.routes.health import add_health_endpoints
from openhands.server.routes.jupyter_proxy import app as jupyter_proxy_router
from openhands.server.routes.manage_conversations import (
    app as manage_conversation_api_router,
)
from openhands.server.routes.mcp import mcp_server
from openhands.server.routes.public import app as public_api_router
from openhands.server.routes.secrets import app as secrets_router
from openhands.server.routes.security import app as security_api_router
from openhands.server.routes.settings import app as settings_router
from openhands.server.routes.trajectory import app as trajectory_router
from openhands.server.shared import conversation_manager, server_config
from openhands.server.types import AppMode

mcp_app = mcp_server.http_app(path='/mcp')


def combine_lifespans(*lifespans):
    # Create a combined lifespan to manage multiple session managers
    @contextlib.asynccontextmanager
    async def combined_lifespan(app):
        async with contextlib.AsyncExitStack() as stack:
            for lifespan in lifespans:
                await stack.enter_async_context(lifespan(app))
            yield

    return combined_lifespan


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with conversation_manager:
        yield


app = FastAPI(
    title='OpenHands',
    description='OpenHands: Code Less, Make More',
    version=__version__,
    lifespan=combine_lifespans(_lifespan, mcp_app.lifespan),
    routes=[Mount(path='/mcp', app=mcp_app)],
)


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(
        status_code=401,
        content=str(exc),
    )


app.include_router(public_api_router)
app.include_router(files_api_router)
app.include_router(jupyter_proxy_router)
app.include_router(security_api_router)
app.include_router(feedback_api_router)
app.include_router(conversation_api_router)
app.include_router(manage_conversation_api_router)
app.include_router(settings_router)
app.include_router(secrets_router)
if server_config.app_mode == AppMode.OSS:
    app.include_router(git_api_router)
app.include_router(trajectory_router)

# CloudGuard approval + clarification routes (the chat banner's same-origin API).
try:
    from openhands.server.routes.cloudguard_approvals import app as cloudguard_approvals_router

    app.include_router(cloudguard_approvals_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning("CloudGuard approval routes unavailable: %s", _cg_exc)

# CloudGuard edge auth: tenant+RBAC principal resolution + GET /api/cloudguard/me.
try:
    from openhands.server.routes.cloudguard_principal import router as cloudguard_principal_router

    app.include_router(cloudguard_principal_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning("CloudGuard principal routes unavailable: %s", _cg_exc)

# CloudGuard audit ledger (read API over the tamper-evident per-tenant chain).
try:
    from openhands.server.routes.cloudguard_audit import router as cloudguard_audit_router

    app.include_router(cloudguard_audit_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning("CloudGuard audit routes unavailable: %s", _cg_exc)

# CloudGuard org read API (authoritative RBAC role matrix, ...).
try:
    from openhands.server.routes.cloudguard_org import router as cloudguard_org_router

    app.include_router(cloudguard_org_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning("CloudGuard org routes unavailable: %s", _cg_exc)

# CloudGuard monitoring read API (violations from the audit chain, ...).
try:
    from openhands.server.routes.cloudguard_monitoring import (
        router as cloudguard_monitoring_router,
    )

    app.include_router(cloudguard_monitoring_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard monitoring routes unavailable: %s", _cg_exc
    )

# CloudGuard metrics exposition: /metrics (operator, scrape-token) and a
# principal-gated per-tenant view. Both render from one collector registry.
try:
    from openhands.server.routes.cloudguard_metrics import (
        router as cloudguard_metrics_router,
    )

    app.include_router(cloudguard_metrics_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard metrics routes unavailable: %s", _cg_exc
    )

# CloudGuard browser reliability telemetry (principal-authenticated; separate
# store from the tamper-evident audit chain). Off unless
# CLOUDGUARD_CLIENT_EVENTS_ENABLED is set.
try:
    from openhands.server.routes.cloudguard_client_events import (
        router as cloudguard_client_events_router,
    )

    app.include_router(cloudguard_client_events_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard client-event routes unavailable: %s", _cg_exc
    )

# CloudGuard log / volume search API (OpenSearch-backed, tenant-scoped).
try:
    from openhands.server.routes.cloudguard_search import (
        router as cloudguard_search_router,
    )

    app.include_router(cloudguard_search_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard search routes unavailable: %s", _cg_exc
    )

# CloudGuard graph read API (tenant-scoped security graph from the graph platform).
try:
    from openhands.server.routes.cloudguard_graph import (
        router as cloudguard_graph_router,
    )

    app.include_router(cloudguard_graph_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard graph routes unavailable: %s", _cg_exc
    )

# CloudGuard notifications (tenant-scoped Novu subscriber handshake).
try:
    from openhands.server.routes.cloudguard_notifications import (
        router as cloudguard_notifications_router,
    )

    app.include_router(cloudguard_notifications_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard notifications routes unavailable: %s", _cg_exc
    )

# CloudGuard Models & Inference (LLM management + inference analytics).
try:
    from openhands.server.routes.cloudguard_llm import (
        router as cloudguard_llm_router,
    )

    app.include_router(cloudguard_llm_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard LLM routes unavailable: %s", _cg_exc
    )

# CloudGuard ACP Overview aggregate.
try:
    from openhands.server.routes.cloudguard_overview import (
        router as cloudguard_overview_router,
    )

    app.include_router(cloudguard_overview_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard overview routes unavailable: %s", _cg_exc
    )

# CloudGuard security posture (key custody / audit integrity / tenancy).
try:
    from openhands.server.routes.cloudguard_security import (
        router as cloudguard_security_router,
    )

    app.include_router(cloudguard_security_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard security routes unavailable: %s", _cg_exc
    )

# CloudGuard runs read-model (conversations the agent worked + audit activity).
try:
    from openhands.server.routes.cloudguard_runs import (
        router as cloudguard_runs_router,
    )

    app.include_router(cloudguard_runs_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard runs routes unavailable: %s", _cg_exc
    )

# CloudGuard sandboxes (provisioned per-tenant cells from the registry).
try:
    from openhands.server.routes.cloudguard_sandboxes import (
        router as cloudguard_sandboxes_router,
    )

    app.include_router(cloudguard_sandboxes_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard sandboxes routes unavailable: %s", _cg_exc
    )

# CloudGuard Settings -> Sandbox Compute (per-role allocations + usage read-model).
try:
    from openhands.server.routes.cloudguard_sandbox_compute import (
        router as cloudguard_sandbox_compute_router,
    )

    app.include_router(cloudguard_sandbox_compute_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard sandbox-compute routes unavailable: %s", _cg_exc
    )

# CloudGuard tenant-policy (guardrails / isolation / limits — read + admin write).
try:
    from openhands.server.routes.cloudguard_policy import (
        router as cloudguard_policy_router,
    )

    app.include_router(cloudguard_policy_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard policy routes unavailable: %s", _cg_exc
    )

# CloudGuard tenant erasure (W4 — two-person crypto-shred + deletion certificate).
try:
    from openhands.server.routes.cloudguard_erasure import (
        router as cloudguard_erasure_router,
    )

    app.include_router(cloudguard_erasure_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard erasure routes unavailable: %s", _cg_exc
    )

# CloudGuard kill switch (W4 — emergency halt state + audit).
try:
    from openhands.server.routes.cloudguard_killswitch import (
        router as cloudguard_killswitch_router,
    )

    app.include_router(cloudguard_killswitch_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard kill-switch routes unavailable: %s", _cg_exc
    )

# CloudGuard incidents (IR records + lifecycle + containment).
try:
    from openhands.server.routes.cloudguard_incidents import (
        router as cloudguard_incidents_router,
    )

    app.include_router(cloudguard_incidents_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard incidents routes unavailable: %s", _cg_exc
    )

# CloudGuard usage read-model (activity aggregates from audit + runs).
try:
    from openhands.server.routes.cloudguard_usage import (
        router as cloudguard_usage_router,
    )

    app.include_router(cloudguard_usage_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard usage routes unavailable: %s", _cg_exc
    )

# CloudGuard admin collections (webhooks / service accounts / connectors CRUD).
try:
    from openhands.server.routes.cloudguard_collections import (
        router as cloudguard_collections_router,
    )

    app.include_router(cloudguard_collections_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard collections routes unavailable: %s", _cg_exc
    )

# CloudGuard settings documents (full-fidelity per-tab form persistence).
try:
    from openhands.server.routes.cloudguard_settings import (
        router as cloudguard_settings_router,
    )

    app.include_router(cloudguard_settings_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard settings routes unavailable: %s", _cg_exc
    )

# ONLYOFFICE document-server token + save-callback (JWT signed server-side).
try:
    from openhands.server.routes.cloudguard_onlyoffice import (
        router as cloudguard_onlyoffice_router,
    )

    app.include_router(cloudguard_onlyoffice_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard ONLYOFFICE routes unavailable: %s", _cg_exc
    )

# CloudGuard artifact discovery (Report tab: workspace files + type/date metadata).
try:
    from openhands.server.routes.cloudguard_artifacts import (
        router as cloudguard_artifacts_router,
    )

    app.include_router(cloudguard_artifacts_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard artifacts routes unavailable: %s", _cg_exc
    )

# CloudGuard JLab-gateway session minting (process-isolated Notebook; flag-gated UI).
try:
    from openhands.server.routes.cloudguard_jupyter_gateway import (
        router as cloudguard_jlab_router,
    )

    app.include_router(cloudguard_jlab_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard JLab-gateway routes unavailable: %s", _cg_exc
    )

# CloudGuard surface health aggregator (fail-closed signal for the SurfaceSupervisor).
try:
    from openhands.server.routes.cloudguard_surfaces import (
        router as cloudguard_surfaces_router,
    )

    app.include_router(cloudguard_surfaces_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard surfaces routes unavailable: %s", _cg_exc
    )

# CloudGuard SB1 — control-plane skill-dispatch seam (zero-trust sandbox). Flag-gated by
# CLOUDGUARD_SKILLS_CATALOG_DIR; 404s until enabled, so registering it is a no-op otherwise.
try:
    from openhands.server.routes.cloudguard_skills import (
        router as cloudguard_skills_router,
    )

    app.include_router(cloudguard_skills_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard skills routes unavailable: %s", _cg_exc
    )

# SB2 — control-plane report-compile seam. Flag-gated (CLOUDGUARD_REPORT_COMPILE_ENABLED);
# 404s until enabled, so registering it is a no-op otherwise.
try:
    from openhands.server.routes.cloudguard_report import (
        router as cloudguard_report_router,
    )

    app.include_router(cloudguard_report_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard report routes unavailable: %s", _cg_exc
    )

# SB5 — control-plane KG-query seam. Flag-gated (CLOUDGUARD_KG_QUERY_ENABLED); 404s until enabled.
try:
    from openhands.server.routes.cloudguard_kg_query import (
        router as cloudguard_kg_query_router,
    )

    app.include_router(cloudguard_kg_query_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard kg-query routes unavailable: %s", _cg_exc
    )

# SB5 — control-plane LLM broker seam. Flag-gated (CLOUDGUARD_LLM_BROKER_ENABLED); 404s until enabled.
try:
    from openhands.server.routes.cloudguard_llm_broker import (
        router as cloudguard_llm_broker_router,
    )

    app.include_router(cloudguard_llm_broker_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard llm-broker routes unavailable: %s", _cg_exc
    )

# CloudGuard diagram shape-search seam (semantic icon retrieval control-plane-side). Flag-gated
# (CLOUDGUARD_DIAGRAM_ENABLED); 404s until enabled.
try:
    from openhands.server.routes.cloudguard_diagram import (
        router as cloudguard_diagram_router,
    )

    app.include_router(cloudguard_diagram_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard diagram routes unavailable: %s", _cg_exc
    )

# CloudGuard diagram Template Library (per-tenant starter architectures; human catalog + agent query).
try:
    from openhands.server.routes.cloudguard_templates import (
        router as cloudguard_templates_router,
    )

    app.include_router(cloudguard_templates_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard template routes unavailable: %s", _cg_exc
    )

# CloudGuard VFS engine HTTP surface (additive — the path-addressed seam over HTTP).
try:
    from openhands.server.routes.cloudguard_vfs import router as cloudguard_vfs_router

    app.include_router(cloudguard_vfs_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard VFS routes unavailable: %s", _cg_exc
    )

# CloudGuard: same-origin proxy for the embedded Seafile library view. Must be
# registered before the SPA's catch-all mount at "/" (listen.py) or /seafile/*
# falls through to the frontend router, which has no such route and renders its
# own 404 inside the frame.
try:
    from openhands.server.routes.cloudguard_seafile_proxy import (
        router as cloudguard_seafile_proxy_router,
    )

    app.include_router(cloudguard_seafile_proxy_router)
except Exception as _cg_exc:  # noqa: BLE001 — never block server start on this
    import logging as _logging

    _logging.getLogger("openhands").warning(
        "CloudGuard Seafile proxy unavailable: %s", _cg_exc
    )

add_health_endpoints(app)

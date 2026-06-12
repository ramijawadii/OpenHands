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

add_health_endpoints(app)

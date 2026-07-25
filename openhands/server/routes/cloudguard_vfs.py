"""VFS HTTP surface — the frontend/agent entry to the path-addressed VFS seam.

ADDITIVE (V4): this exposes read/write/list/stat over the VFS engine + the sandbox
driver, WITHOUT migrating any existing surface off its direct /workspace path — so
it is zero-regression. Surfaces (ONLYOFFICE save-back, whiteboard, artifact
discovery) migrate onto these endpoints later, behind per-caller flags.

Every op runs the engine pipeline resolve → policy → driver → event → audit. This
route resolves the conversation's runtime container and builds a
SandboxWorkspaceDriver for it; the VFS engine (in the cloudguard package) does the
rest. See docs/architecture/vfs-engine/VFS_ENGINE_PLAN.md.
"""

from __future__ import annotations

import base64
import logging

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import require_principal

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/vfs")

# V4 keeps the wiring minimal + additive: humans (the authenticated console
# principal) are the trusted control plane, so AllowAll is fine here; real
# capability-manifest policy + audit/event binding land with the tenancy wiring.
_TENANT = "default"


# Cache the resolved (container_name, workspace_root) per conversation so we DON'T
# attach_to_conversation on every request — that attach/detach was the end-to-end
# bottleneck (~140-470ms, variable) once the driver dropped to ~11ms. The container
# name (openhands-runtime-{cid}) is stable across runtime restarts, so the cache
# stays valid; the driver re-resolves its own container handle on failure. On a
# VFSUnavailable we invalidate so the next request re-attaches.
_CONV_CACHE: dict[str, tuple[str, str]] = {}


async def _resolve(conversation_id: str) -> tuple[str, str]:
    hit = _CONV_CACHE.get(conversation_id)
    if hit is not None:
        return hit
    from openhands.server.shared import conversation_manager

    conv = await conversation_manager.attach_to_conversation(conversation_id, None)
    if conv is None:
        raise HTTPException(status_code=404, detail="conversation not running")
    try:
        runtime = conv.runtime
        container = getattr(runtime, "container_name", None)
        if not container:
            raise HTTPException(status_code=503, detail="runtime has no container")
        root = runtime.config.workspace_mount_path_in_sandbox
        resolved = (container, root)
        _CONV_CACHE[conversation_id] = resolved
        return resolved
    finally:
        try:
            await conversation_manager.detach_from_conversation(conv)
        except Exception:  # noqa: BLE001
            pass


def _invalidate_conv(conversation_id: str) -> None:
    _CONV_CACHE.pop(conversation_id, None)


def _vfs_for(resolved: tuple[str, str]):
    container, root = resolved
    from cloudguard.vfs import VFS, ReliableDriver
    from cloudguard.vfs.drivers import SandboxWorkspaceDriver

    driver = ReliableDriver(SandboxWorkspaceDriver(container, root))
    return VFS(lambda ctx: driver)


def _ctx(conversation_id: str, principal) -> "object":
    from cloudguard.vfs import VFSContext

    return VFSContext(
        tenant=_TENANT,
        conversation=conversation_id,
        actor=str(getattr(principal, "id", principal) or "console"),
    )


def _map_error(exc: Exception) -> HTTPException:
    from cloudguard.vfs import VFSDenied, VFSInvalidPath, VFSNotFound, VFSUnavailable

    if isinstance(exc, VFSInvalidPath):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, VFSDenied):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, VFSNotFound):
        return HTTPException(status_code=404, detail="not found")
    if isinstance(exc, VFSUnavailable):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=500, detail=f"vfs error: {exc}")


class WriteRequest(BaseModel):
    conversation_id: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    # exactly one of text / content_b64
    text: str | None = Field(default=None)
    content_b64: str | None = Field(default=None)
    mime: str | None = Field(default=None, max_length=128)


async def _run(conversation_id: str, coro_factory):
    """Resolve (cached) then run an op, mapping errors + invalidating the cache on
    an unavailable runtime so the next request re-attaches."""
    from cloudguard.vfs import VFSUnavailable

    resolved = await _resolve(conversation_id)
    try:
        return await coro_factory(_vfs_for(resolved))
    except HTTPException:
        raise
    except VFSUnavailable as exc:
        _invalidate_conv(conversation_id)
        raise _map_error(exc) from exc
    except Exception as exc:  # noqa: BLE001
        raise _map_error(exc) from exc


@router.get("/read")
async def vfs_read(conversation_id: str, path: str, _p=Depends(require_principal)):
    data = await _run(
        conversation_id, lambda vfs: vfs.read(_ctx(conversation_id, _p), path)
    )
    return Response(content=data, media_type="application/octet-stream")


@router.get("/stat")
async def vfs_stat(conversation_id: str, path: str, _p=Depends(require_principal)):
    e = await _run(
        conversation_id, lambda vfs: vfs.stat(_ctx(conversation_id, _p), path)
    )
    return JSONResponse(_entry_json(e))


@router.get("/list")
async def vfs_list(
    conversation_id: str,
    prefix: str = "",
    recursive: bool = True,
    _p=Depends(require_principal),
):
    entries = await _run(
        conversation_id,
        lambda vfs: vfs.list(_ctx(conversation_id, _p), prefix, recursive=recursive),
    )
    return JSONResponse({"entries": [_entry_json(e) for e in entries]})


@router.post("/write")
async def vfs_write(body: WriteRequest = Body(...), _p=Depends(require_principal)):
    if body.content_b64 is not None:
        try:
            data = base64.b64decode(body.content_b64)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="bad base64") from exc
    elif body.text is not None:
        data = body.text.encode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="provide text or content_b64")

    e = await _run(
        body.conversation_id,
        # dedup=False → one docker round-trip (no idempotency pre-stat); the sandbox
        # driver makes each round-trip expensive, and saves usually change content.
        lambda vfs: vfs.write(
            _ctx(body.conversation_id, _p), body.path, data, mime=body.mime, dedup=False
        ),
    )
    return JSONResponse(_entry_json(e))


def _entry_json(e) -> dict:
    return {
        "path": e.path,
        "size": e.size,
        "mtime": e.mtime,
        "content_hash": e.content_hash,
        "version": e.version,
        "mime": e.mime,
        "kind": e.kind,
    }

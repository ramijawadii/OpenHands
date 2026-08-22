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


# Shared read cache (Tier 2): served across all per-request drivers. A cache hit
# skips the reliability wrapper AND the docker round-trip; concurrent misses of the
# same file coalesce to one fetch. Namespaced by container for tenant isolation.
_READ_CACHE = None


def _read_cache():
    global _READ_CACHE
    if _READ_CACHE is None:
        from cloudguard.vfs import VFSReadCache

        _READ_CACHE = VFSReadCache(max_entries=1024, ttl=5.0)
    return _READ_CACHE


# Real audit path (SRE-1): every VFS op records to a durable transactional outbox
# on the fast path; a SINGLE background AuditFlusher drains it to the tenant_audit
# hash chain (single-writer — no per-tenant file-lock contention). The write is
# never blocked on the chain; a sink outage replays nothing-lost.
_OUTBOX = None
_FLUSHER = None


def _audit_sink():
    """Lazily build the outbox + start the single flusher (needs a running loop)."""
    global _OUTBOX, _FLUSHER
    if _OUTBOX is None:
        import os

        from cloudguard.vfs import OutboxAuditSink, TransactionalOutbox

        audit_dir = os.environ.get("CLOUDGUARD_VFS_AUDIT_DIR", "/tmp/cloudguard-vfs-audit")
        _OUTBOX = TransactionalOutbox(os.path.join(audit_dir, "outbox.jsonl"))
        return OutboxAuditSink(_OUTBOX)
    from cloudguard.vfs import OutboxAuditSink

    return OutboxAuditSink(_OUTBOX)


_ANCHOR = None
_WRITE_BUFFER = None
_DRAINER = None
# container_name -> workspace root, so the background drainer can rebuild a driver
# for a namespace whose only surface has gone idle.
_ROOTS: dict[str, str] = {}


def _write_buffer():
    global _WRITE_BUFFER
    if _WRITE_BUFFER is None:
        import os

        from cloudguard.vfs import WriteBuffer

        spool = os.environ.get("CLOUDGUARD_VFS_SPOOL_DIR", "/tmp/cloudguard-vfs-spool")
        _WRITE_BUFFER = WriteBuffer(spool)
    return _WRITE_BUFFER


def _audit_anchor():
    global _ANCHOR
    if _ANCHOR is None:
        import os

        from cloudguard.vfs import AuditAnchor, LocalAnchorSink

        audit_dir = os.environ.get("CLOUDGUARD_VFS_AUDIT_DIR", "/tmp/cloudguard-vfs-audit")
        _ANCHOR = AuditAnchor(
            LocalAnchorSink(os.path.join(audit_dir, "anchor.log")),
            store_dir=os.path.join(audit_dir, "chain"),
        )
    return _ANCHOR


def _ensure_flusher():
    global _FLUSHER
    if _FLUSHER is None and _OUTBOX is not None:
        import os

        from cloudguard.vfs import AuditFlusher, TenantAuditSink

        audit_dir = os.environ.get("CLOUDGUARD_VFS_AUDIT_DIR", "/tmp/cloudguard-vfs-audit")
        _FLUSHER = AuditFlusher(
            _OUTBOX,
            TenantAuditSink(store_dir=os.path.join(audit_dir, "chain")),
            anchor=_audit_anchor(),  # CISO-2: anchor the head off-box after each flush
            anchor_tenants=(_TENANT,),
        )
        try:
            _FLUSHER.start()
        except Exception as exc:  # noqa: BLE001 — no running loop yet; drained lazily
            logger.warning("audit flusher start deferred: %s", exc)
    if _FLUSHER is not None:
        _FLUSHER.notify()  # low-latency drain after each op


async def _drain_one(ns: str) -> int:
    """Replay one namespace's buffered writes into a freshly-built backing driver.
    Used by the background BufferDrainer (SRE-2). Wrapped in ReliableDriver so a
    still-down container raises VFSUnavailable → buffer.drain stops cleanly and
    keeps the backlog."""
    from cloudguard.vfs import ReliableDriver
    from cloudguard.vfs.drivers import SandboxWorkspaceDriver

    root = _ROOTS.get(ns, "/workspace")
    driver = ReliableDriver(SandboxWorkspaceDriver(ns, root))
    return await _write_buffer().drain(ns, driver.write)


def _ensure_drainer():
    """Start the single background buffer drainer (SRE-2) so a buffered write lands
    even if its surface goes idle. Needs a running loop; started lazily."""
    global _DRAINER
    if _DRAINER is None:
        from cloudguard.vfs import BufferDrainer

        _DRAINER = BufferDrainer(_write_buffer(), _drain_one, interval=5.0)
        try:
            _DRAINER.start()
        except Exception as exc:  # noqa: BLE001 — no loop yet; drains opportunistically on write
            logger.warning("buffer drainer start deferred: %s", exc)


def _vfs_for(resolved: tuple[str, str]):
    container, root = resolved
    _ROOTS[container] = root
    from cloudguard.vfs import VFS, ReliableDriver
    from cloudguard.vfs.drivers import (
        BufferingDriver,
        CachingDriver,
        SandboxWorkspaceDriver,
    )

    # Cache(hit skips docker) → Buffer(never-fail write, SRE-5) → Reliable → Sandbox.
    # BufferingDriver under CachingDriver: a buffered write is cache-write-through,
    # so read-after-write hits the cache even while the backlog drains.
    driver = CachingDriver(
        BufferingDriver(
            ReliableDriver(SandboxWorkspaceDriver(container, root)),
            _write_buffer(),
            namespace=container,
        ),
        _read_cache(),
        namespace=container,
    )
    sink = _audit_sink()
    _ensure_flusher()
    _ensure_drainer()
    return VFS(lambda ctx: driver, audit=sink)


# ── the artifact store (Seafile) ─────────────────────────────────────────────
# A SECOND store, not a replacement. The sandbox is the agent's live working
# directory and stays that; this is where finished artifacts land to be kept,
# versioned and audited. Selecting between them is `?store=`, defaulting to
# sandbox so every existing caller is unaffected.
#
# The library is never mounted into a container the agent can execute code in —
# see deploy/seafile/README.md, and commit 0f25e703 for why that boundary exists.
_STORES = ("sandbox", "artifacts")
_ARTIFACT_VFS = None


class _ArtifactStoreUnconfigured(Exception):
    """The artifact store was asked for but no Seafile library is configured."""


async def _artifact_vfs():
    """Build (once) the VFS bound to the Seafile artifact library.

    Pipeline is Cache → Reliable → Seafile. Deliberately NO BufferingDriver:
    the buffer's drainer (_drain_one) rebuilds a SandboxWorkspaceDriver from the
    namespace, so a buffered artifact write would be drained into a sandbox
    container instead of the library. Buffering this store needs the drainer to
    learn about drivers first; until then a Seafile outage surfaces as 503 rather
    than being silently misfiled.
    """
    global _ARTIFACT_VFS
    if _ARTIFACT_VFS is not None:
        return _ARTIFACT_VFS

    import os

    from cloudguard.vfs import VFS, ReliableDriver
    from cloudguard.vfs.drivers import CachingDriver
    from cloudguard.vfs.drivers.seafile import SeafileDriver, authenticate

    base_url = (os.environ.get('CLOUDGUARD_SEAFILE_URL') or 'http://seafile').rstrip('/')
    repo_id = (os.environ.get('CLOUDGUARD_SEAFILE_REPO_ID') or '').strip()
    token = (os.environ.get('CLOUDGUARD_SEAFILE_TOKEN') or '').strip()
    user = (os.environ.get('CLOUDGUARD_SEAFILE_USER') or '').strip()
    password = (os.environ.get('CLOUDGUARD_SEAFILE_PASSWORD') or '').strip()
    content_url = (os.environ.get('CLOUDGUARD_SEAFILE_CONTENT_URL') or '').strip() or None

    # Fail closed and SAY WHAT IS MISSING. An artifact store that silently falls
    # back to the sandbox would put durable deliverables in a container that is
    # deleted when the conversation ends.
    if not repo_id:
        raise _ArtifactStoreUnconfigured('CLOUDGUARD_SEAFILE_REPO_ID is not set')
    if not token and not (user and password):
        raise _ArtifactStoreUnconfigured(
            'set CLOUDGUARD_SEAFILE_TOKEN, or CLOUDGUARD_SEAFILE_USER + _PASSWORD'
        )

    if not token:
        token = await authenticate(user, password, base_url=base_url)

    # The envelope is sized to MEASURED latency, not to the sandbox's.
    # Seafile answers an API call in ~4-8s on this deployment and a write is
    # several calls (mkdir, upload-link, upload, sidecar read, sidecar write,
    # stat), so writes were measured at 17-30s. ReliableDriver's 30s default
    # killed correct operations — the first live wiring test failed with
    # "driver timeout" on a write that was working. 180s is deliberately far
    # above the observed worst case: this bound exists to catch a HUNG store, and
    # a bound that also kills healthy-but-slow calls tells you nothing.
    #
    # The driver's own per-request timeout (30s) stays well under it, so a single
    # stuck call fails and is retried inside the envelope rather than consuming
    # it. Sizing them equally would make the inner timeout unreachable.
    driver = CachingDriver(
        ReliableDriver(
            SeafileDriver(repo_id, token, base_url=base_url, content_url=content_url),
            timeout=180.0,
        ),
        _read_cache(),
        namespace=f'seafile:{repo_id}',
    )
    _ARTIFACT_VFS = VFS(lambda ctx: driver, audit=_audit_sink())
    _ensure_flusher()
    return _ARTIFACT_VFS


async def _run_store(store: str, conversation_id: str, coro_factory):
    """Dispatch one op to the selected store, mapping errors identically."""
    if store not in _STORES:
        raise HTTPException(
            status_code=400, detail=f'unknown store {store!r} (expected one of {_STORES})'
        )
    if store == 'sandbox':
        return await _run(conversation_id, coro_factory)

    try:
        vfs = await _artifact_vfs()
    except _ArtifactStoreUnconfigured as exc:
        raise HTTPException(
            status_code=503, detail=f'artifact store unavailable: {exc}'
        ) from exc

    try:
        return await coro_factory(vfs)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise _map_error(exc) from exc


async def surface_store_read(conversation_id: str, path: str, store: str) -> bytes:
    """Read a file from a NAMED store, through that store's VFS pipeline.

    `surface_read` is hard-wired to the sandbox. An editor opening a document out
    of the durable library needs the same read path against the artifact store, so
    the file arrives with its policy, audit and read-your-writes behaviour intact
    rather than through a side channel that bypasses all three.
    """
    from cloudguard.vfs import VFSContext

    ctx = VFSContext(tenant=_TENANT, conversation=conversation_id, actor="surface")
    return await _run_store(store, conversation_id, lambda vfs: vfs.read(ctx, path))


async def surface_store_write(
    conversation_id: str,
    path: str,
    data: bytes,
    store: str,
    *,
    mime: str | None = None,
    actor: str = "surface",
):
    """Write bytes to a NAMED store through the VFS pipeline.

    The write side of surface_store_read. Going through the VFS is the point: a
    save into the library has to produce a VERSION and an audit record, which is
    the whole reason artifacts live there rather than in a container.
    """
    from cloudguard.vfs import VFSContext

    ctx = VFSContext(tenant=_TENANT, conversation=conversation_id, actor=actor)
    return await _run_store(
        store, conversation_id, lambda vfs: vfs.write(ctx, path, data, mime=mime)
    )


async def surface_read(conversation_id: str, path: str) -> bytes:
    """Read a workspace file THROUGH the VFS (read-your-writes aware). A surface
    that both writes and reads via the VFS (SRE-1b) uses this so a reopen after a
    degraded/buffered save sees the buffered bytes, not the stale backing file.
    Raises native VFS exceptions."""
    from cloudguard.vfs import VFSContext, VFSUnavailable

    ctx = VFSContext(tenant=_TENANT, conversation=conversation_id, actor="surface")
    resolved = await _resolve(conversation_id)
    try:
        return await _vfs_for(resolved).read(ctx, path)
    except VFSUnavailable:
        _invalidate_conv(conversation_id)
        raise


def _ctx(conversation_id: str, principal) -> "object":
    from cloudguard.vfs import VFSContext

    return VFSContext(
        tenant=_TENANT,
        conversation=conversation_id,
        actor=str(getattr(principal, "id", principal) or "console"),
    )


def _map_error(exc: Exception) -> HTTPException:
    from cloudguard.vfs import (
        VFSConflict,
        VFSDenied,
        VFSInvalidPath,
        VFSNotFound,
        VFSUnavailable,
    )

    if isinstance(exc, VFSInvalidPath):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, VFSConflict):
        # 409, because the caller can fix it — by choosing another name. Distinct
        # from a 403 (never allowed) and a 404 (not there): this is the one
        # failure the UI can offer a next step for, so flattening it into a
        # generic error would cost that.
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, VFSDenied):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, VFSNotFound):
        return HTTPException(status_code=404, detail="not found")
    if isinstance(exc, VFSUnavailable):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, NotImplementedError):
        # 501, not 500: the request was well formed and the store simply cannot
        # do this. A 500 would send someone hunting for a fault that isn't there.
        return HTTPException(status_code=501, detail=str(exc))
    return HTTPException(status_code=500, detail=f"vfs error: {exc}")


class WriteRequest(BaseModel):
    conversation_id: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    # exactly one of text / content_b64
    text: str | None = Field(default=None)
    content_b64: str | None = Field(default=None)
    mime: str | None = Field(default=None, max_length=128)
    # "sandbox" (default, unchanged behaviour) or "artifacts" (durable Seafile
    # library). Kept a body field rather than a query param so a write names its
    # destination in the same payload as its bytes.
    store: str = Field(default="sandbox", max_length=32)


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


# ── V5: surface flip helper ──────────────────────────────────────────────────
# Public entry other surface routes (ONLYOFFICE save-back, whiteboard, discovery)
# call to route a write through the SAME VFS pipeline the HTTP endpoints use —
# resolve → policy → driver(cache→buffer→reliable→sandbox) → event → audit. This
# is how a surface "flips" onto the VFS: it gets tamper-evident audit + buffer-not-
# fail durability for free, instead of a raw put_archive. Returns the VFSEntry.
async def surface_write(
    conversation_id: str,
    path: str,
    data: bytes,
    *,
    mime: str | None = None,
    actor: str = "surface",
):
    """Write bytes to a conversation's workspace THROUGH the VFS pipeline.

    `path` is workspace-relative (the sandbox driver joins the root itself).

    Raises the NATIVE VFS exception types (NOT the HTTP-mapped ones) so a caller
    can tell a security REJECTION apart from a transport failure — this is the
    CISO-1 contract: a surface must fall back to its legacy raw write ONLY on
    VFSUnavailable/infra errors, and must NEVER fall back on VFSDenied /
    VFSInvalidPath (those are authoritative decisions that a raw write would defeat).
      - VFSDenied      → policy rejected the write (WORM/mode/manifest)
      - VFSInvalidPath → path gate rejected it (traversal/absolute/…)
      - VFSUnavailable → driver/runtime down (safe to fall back or buffer)
    """
    from cloudguard.vfs import VFSContext, VFSUnavailable

    ctx = VFSContext(tenant=_TENANT, conversation=conversation_id, actor=actor)
    resolved = await _resolve(conversation_id)
    try:
        return await _vfs_for(resolved).write(ctx, path, data, mime=mime, dedup=False)
    except VFSUnavailable:
        _invalidate_conv(conversation_id)  # force re-attach next time
        raise


@router.get("/read")
async def vfs_read(
    conversation_id: str, path: str, store: str = "sandbox", _p=Depends(require_principal)
):
    data = await _run_store(
        store, conversation_id, lambda vfs: vfs.read(_ctx(conversation_id, _p), path)
    )
    return Response(content=data, media_type="application/octet-stream")


@router.get("/stat")
async def vfs_stat(
    conversation_id: str, path: str, store: str = "sandbox", _p=Depends(require_principal)
):
    e = await _run_store(
        store, conversation_id, lambda vfs: vfs.stat(_ctx(conversation_id, _p), path)
    )
    return JSONResponse(_entry_json(e))


@router.get("/list")
async def vfs_list(
    conversation_id: str,
    prefix: str = "",
    recursive: bool = True,
    store: str = "sandbox",
    _p=Depends(require_principal),
):
    entries = await _run_store(
        store,
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

    e = await _run_store(
        body.store,
        body.conversation_id,
        # dedup=False → one docker round-trip (no idempotency pre-stat); the sandbox
        # driver makes each round-trip expensive, and saves usually change content.
        lambda vfs: vfs.write(
            _ctx(body.conversation_id, _p), body.path, data, mime=body.mime, dedup=False
        ),
    )
    return JSONResponse(_entry_json(e))


class PublishRequest(BaseModel):
    conversation_id: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    # Where it lands in the library. Default is derived, see _artifact_dest.
    dest: str | None = Field(default=None, max_length=4096)
    mime: str | None = Field(default=None, max_length=128)


def _artifact_dest(conversation_id: str, path: str, dest: str | None) -> str:
    """Where a published artifact lands.

    Namespaced by conversation by DEFAULT, because the library is one shared
    store: two conversations that both produce `reports/final.md` would otherwise
    silently overwrite each other, and the loser would never know. An explicit
    `dest` is honoured for the case where a caller genuinely wants a shared name;
    the driver still guards it.

    (Conversation is the narrowest identity this route actually has. Tenant is
    the layer that should own this prefix, but _TENANT is still the placeholder
    "default" here — when tenancy is wired at this route, the prefix moves.)
    """
    if dest:
        return dest.lstrip('/')
    return f'conversations/{conversation_id}/{path.lstrip("/")}'


@router.post("/publish")
async def vfs_publish(body: PublishRequest = Body(...), _p=Depends(require_principal)):
    """Copy a file from the conversation's sandbox into the durable artifact store.

    Both halves run through the VFS pipeline, so the read is audited against the
    sandbox and the write is audited against the library — a published artifact
    has a record on both sides rather than appearing in the store from nowhere.

    The sandbox is ephemeral: its container is deleted when the conversation
    ends. This is the operation that makes a deliverable outlive the run.

    On verification: the returned entry's content_hash is sha256 of the bytes we
    read, so it does confirm the two halves agree. A stronger check — reading the
    file BACK out of the library and hashing that — is deliberately NOT done here,
    because it would be theatre: the artifact VFS wraps the driver in a
    CachingDriver that is write-through, so the read-back would be served from
    the cache entry the write just populated and could not detect a storage-side
    problem at all. A real end-to-end verification has to bypass the cache, and
    is worth adding as an explicit audit operation rather than pretending here.
    """
    ctx = _ctx(body.conversation_id, _p)
    data = await _run_store(
        'sandbox', body.conversation_id, lambda vfs: vfs.read(ctx, body.path)
    )

    dest = _artifact_dest(body.conversation_id, body.path, body.dest)
    entry = await _run_store(
        'artifacts',
        body.conversation_id,
        # dedup=True on purpose, unlike the sandbox write path: publishing the
        # same bytes twice should be a no-op returning the existing entry, not a
        # new version. A version bump is a claim that the artifact CHANGED, and
        # the extra stat costs little against a store this side of the network.
        lambda vfs: vfs.write(ctx, dest, data, mime=body.mime, dedup=True),
    )

    import hashlib

    source_hash = hashlib.sha256(data).hexdigest()
    if entry.content_hash != source_hash:
        raise HTTPException(
            status_code=500,
            detail=(
                f'publish integrity check failed: source {source_hash[:12]} != '
                f'stored {entry.content_hash[:12]}'
            ),
        )

    return JSONResponse({'source': body.path, 'dest': dest, **_entry_json(entry)})


@router.get("/versions")
async def vfs_versions(
    conversation_id: str,
    path: str,
    store: str = "artifacts",
    limit: int = 25,
    _p=Depends(require_principal),
):
    """Revisions of one file, newest first.

    Defaults to the artifact store because that is the one that keeps history —
    the sandbox is a working directory and answers with an empty list.
    """
    try:
        versions = await _run_store(
            store,
            conversation_id,
            lambda vfs: vfs.history(_ctx(conversation_id, _p), path, limit),
        )
    except HTTPException as exc:
        if exc.status_code != 501:
            raise
        # Say so plainly. "No earlier versions" would be a lie about a store that
        # never had any to begin with.
        return {"versioned": False, "versions": []}
    return {
        "versioned": True,
        "versions": [
            {
                "id": v.id,
                "path": v.path,
                "created_at": v.created_at,
                "size": v.size,
                "author": v.author,
                "is_current": v.is_current,
            }
            for v in versions
        ]
    }


@router.get("/read-version")
async def vfs_read_version(
    conversation_id: str,
    path: str,
    version_id: str,
    store: str = "artifacts",
    _p=Depends(require_principal),
):
    """The contents of one earlier revision, so it can be viewed before restoring.

    Served as a DOWNLOAD-SAFE octet-stream with an explicit
    `X-Content-Type-Options: nosniff` and an inline-forbidden disposition: this
    returns bytes an untrusted actor may have written, and letting a browser
    sniff them into HTML on the console's own origin would turn file history into
    a stored-XSS surface. The viewer decodes it as text itself.
    """
    try:
        data = await _run_store(
            store,
            conversation_id,
            lambda vfs: vfs.read_version(_ctx(conversation_id, _p), path, version_id),
        )
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=400, detail="this store does not version individual files"
        ) from exc
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "attachment",
        },
    )


class RevertFileRequest(BaseModel):
    conversation_id: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    version_id: str = Field(..., max_length=128)
    store: str = Field(default="artifacts", max_length=32)


@router.post("/revert-file")
async def vfs_revert_file(body: RevertFileRequest, _p=Depends(require_principal)):
    """Put one file back to an earlier revision.

    The revert is a NEW revision, not an erasure: the history keeps both what was
    there and the fact that someone reverted it, which is what makes this safe to
    expose to an analyst rather than to an administrator only.
    """
    try:
        await _run_store(
            body.store,
            body.conversation_id,
            lambda vfs: vfs.revert_file(
                _ctx(body.conversation_id, _p), body.path, body.version_id
            ),
        )
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=400, detail="this store does not version individual files"
        ) from exc
    return {"ok": True, "path": body.path, "version_id": body.version_id}


_EXPLAIN_OPS = ("read", "write", "delete", "restore", "checkpoint")


# ── namespace operations ─────────────────────────────────────────────────────
# These exist so the Files surface can be FIRST-PARTY. Until now the browser
# reached into Seafile's own API for rename, move, copy, mkdir and undelete,
# which meant those five operations bypassed the policy engine, the WORM zones
# and the audit chain entirely — the store enforced its own permissions, and
# ours never saw the request. Routing them through the VFS is the point of the
# rewrite, not a side effect of it.


class MkdirRequest(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    path: str = Field(..., max_length=4096)
    store: str = Field(default="artifacts", max_length=32)


class MoveRequest(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    src: str = Field(..., max_length=4096)
    dst: str = Field(..., max_length=4096)
    store: str = Field(default="artifacts", max_length=32)


class DeleteRequest(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    path: str = Field(..., max_length=4096)
    store: str = Field(default="artifacts", max_length=32)


class UntrashRequest(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    path: str = Field(..., max_length=4096)
    commit_id: str = Field(..., max_length=128)
    store: str = Field(default="artifacts", max_length=32)


# ── point in time ────────────────────────────────────────────────────────────
# The store keeps a full immutable history — that is why the artifact store is
# Seafile. The engine could already create a checkpoint and restore to one, but
# neither had a route and nothing could ENUMERATE the points in time available.
# A restore whose options you cannot see is not a feature anyone can use.


class CheckpointRequest(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    name: str = Field(..., max_length=256)
    description: str = Field(default="", max_length=1024)
    store: str = Field(default="artifacts", max_length=32)


class RestoreRequest(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    checkpoint_id: str = Field(..., max_length=128)
    store: str = Field(default="artifacts", max_length=32)


@router.get("/checkpoints")
async def vfs_checkpoints(
    conversation_id: str = "",
    limit: int = 50,
    store: str = "artifacts",
    _p=Depends(require_principal),
):
    try:
        items = await _run_store(
            store,
            conversation_id,
            lambda vfs: vfs.checkpoints(_ctx(conversation_id, _p), limit),
        )
    except NotImplementedError:
        return {"supported": False, "checkpoints": []}
    return {"supported": True, "checkpoints": items}


@router.post("/checkpoint")
async def vfs_checkpoint(body: CheckpointRequest, _p=Depends(require_principal)):
    cp = await _run_store(
        body.store,
        body.conversation_id,
        lambda vfs: vfs.checkpoint(
            _ctx(body.conversation_id, _p), body.name, description=body.description
        ),
    )
    return {
        "id": cp.id,
        "name": cp.name,
        "created_at": cp.created_at,
        "manifest_hash": cp.manifest_hash,
        "description": cp.description,
    }


@router.post("/restore")
async def vfs_restore(body: RestoreRequest, _p=Depends(require_principal)):
    """Point-in-time restore of the WHOLE library.

    Destructive and library-wide, which is why the policy treats `restore` as its
    own capability rather than folding it into write: it can undo work nobody
    asked to undo. The engine refuses it outside autonomous mode without
    approval; that refusal arrives here as a 403 and the UI must show it rather
    than retry.
    """
    await _run_store(
        body.store,
        body.conversation_id,
        lambda vfs: vfs.restore(_ctx(body.conversation_id, _p), body.checkpoint_id),
    )
    return {"ok": True, "checkpoint_id": body.checkpoint_id}


@router.get("/metadata")
async def vfs_metadata(
    conversation_id: str = "",
    path: str = "",
    store: str = "artifacts",
    _p=Depends(require_principal),
):
    """Seafile's extended properties and tags for one file.

    Surfaced because the store HAS them — metadata and tags are both enabled on
    this deployment — and a native browser that quietly dropped them would be a
    regression dressed up as a rewrite.
    """
    if not path:
        raise HTTPException(status_code=400, detail="path is required")
    try:
        data = await _run_store(
            store,
            conversation_id,
            lambda vfs: vfs.file_metadata(_ctx(conversation_id, _p), path),
        )
    except NotImplementedError:
        return {"enabled": False, "properties": {}, "tags": []}
    return data


@router.get("/list-dir")
async def vfs_list_dir(
    conversation_id: str = "",
    prefix: str = "",
    store: str = "artifacts",
    _p=Depends(require_principal),
):
    """One directory level, folders included — what the Files browser navigates.

    Separate from `/list`, which is a whole-library enumeration used for
    discovery and integrity work. Serving a browser from that would walk every
    directory and hash every file on every folder click.
    """
    entries = await _run_store(
        store,
        conversation_id,
        lambda vfs: vfs.list_dir(_ctx(conversation_id, _p), prefix),
    )
    return JSONResponse({"prefix": prefix, "entries": [_entry_json(e) for e in entries]})


@router.post("/mkdir")
async def vfs_mkdir(body: MkdirRequest, _p=Depends(require_principal)):
    entry = await _run_store(
        body.store,
        body.conversation_id,
        lambda vfs: vfs.mkdir(_ctx(body.conversation_id, _p), body.path),
    )
    return JSONResponse(_entry_json(entry))


@router.post("/move")
async def vfs_move(body: MoveRequest, _p=Depends(require_principal)):
    """Rename or relocate. One endpoint, because they are one operation.

    A rename is a move whose destination shares the source's parent, and giving
    them separate endpoints would mean two authorization paths for the same
    effect — the kind of split where one of them eventually forgets a check.
    """
    entry = await _run_store(
        body.store,
        body.conversation_id,
        lambda vfs: vfs.move(_ctx(body.conversation_id, _p), body.src, body.dst),
    )
    return JSONResponse(_entry_json(entry))


@router.post("/copy")
async def vfs_copy(body: MoveRequest, _p=Depends(require_principal)):
    entry = await _run_store(
        body.store,
        body.conversation_id,
        lambda vfs: vfs.copy(_ctx(body.conversation_id, _p), body.src, body.dst),
    )
    return JSONResponse(_entry_json(entry))


@router.post("/delete")
async def vfs_delete(body: DeleteRequest, _p=Depends(require_principal)):
    """POST, not DELETE-with-a-body.

    A request body on DELETE is legal but poorly supported end to end (proxies
    and some clients drop it), and this one needs the store alongside the path:
    the same relative path exists in the sandbox and in the library and means
    different files.
    """
    await _run_store(
        body.store,
        body.conversation_id,
        lambda vfs: vfs.delete(_ctx(body.conversation_id, _p), body.path),
    )
    return {"ok": True, "path": body.path}


@router.get("/trash")
async def vfs_trash(
    conversation_id: str = "",
    prefix: str = "/",
    limit: int = 100,
    store: str = "artifacts",
    _p=Depends(require_principal),
):
    try:
        items = await _run_store(
            store,
            conversation_id,
            lambda vfs: vfs.trash(_ctx(conversation_id, _p), prefix, limit),
        )
    except NotImplementedError:
        # Not an error. A store with no trash is a different fact from an empty
        # one, and the UI shows them differently.
        return {"supported": False, "items": []}
    return {"supported": True, "items": items}


@router.post("/untrash")
async def vfs_untrash(body: UntrashRequest, _p=Depends(require_principal)):
    await _run_store(
        body.store,
        body.conversation_id,
        lambda vfs: vfs.untrash(_ctx(body.conversation_id, _p), body.path, body.commit_id),
    )
    return {"ok": True, "path": body.path}


@router.get("/permissions")
async def vfs_permissions(
    conversation_id: str,
    path: str,
    store: str = "artifacts",
    _p=Depends(require_principal),
):
    """The effective permission matrix for one path.

    Answers for BOTH principals the engine distinguishes: the human at the
    console, who is the trusted control plane, and the agent, which is untrusted
    and bound by the capability manifest, the WORM zones and the mode gate. Those
    two get materially different answers on the same file, and that difference is
    the thing worth showing.

    Computed by asking the POLICY, not by restating its rules here — a matrix
    that drifts from the engine would tell someone an artifact is protected when
    it is not.
    """
    from cloudguard.vfs import VFSContext

    matrix = {}
    for actor in ("human", "agent"):
        ctx = VFSContext(tenant=_TENANT, conversation=conversation_id, actor=actor)
        matrix[actor] = await _run_store(
            store, conversation_id, lambda vfs, c=ctx: vfs.explain(c, path, _EXPLAIN_OPS)
        )
    # WHICH policy produced these answers, reported rather than assumed.
    #
    # Both stores are currently constructed as `VFS(resolve, audit=...)` with no
    # `policy=`, so the engine falls back to `AllowAllPolicy` and every cell in
    # this matrix is True — including the agent's. That is the honest state of
    # the deployment, and the UI has to be able to SAY it: a permission panel
    # showing green everywhere, with no indication that nothing is being
    # enforced, is worse than no panel, because it reads as "this artifact is
    # governed" when the WORM zones, the capability manifest and the mode gate
    # are all inert on this path.
    #
    # Wiring `VFSPolicy(load_manifest)` here turns on deny-by-default for the
    # agent and is a deliberate posture change, not a bug fix — it can revoke
    # access a running agent currently has. See the parity plan.
    try:
        vfs = await _artifact_vfs() if store == 'artifacts' else None
        policy_name = type(getattr(vfs, '_policy', None)).__name__ if vfs else 'unknown'
    except Exception:  # noqa: BLE001
        policy_name = 'unknown'

    return {
        "path": path,
        "store": store,
        "ops": list(_EXPLAIN_OPS),
        "matrix": matrix,
        "policy": policy_name,
        "enforcing": policy_name not in ('AllowAllPolicy', 'unknown'),
    }


# ── share grants ─────────────────────────────────────────────────────────────
# Recorded and audited, NOT enforced. `VFSPolicy.check` answers allow for every
# non-agent actor: the engine knows "human" and "agent", not WHICH human. Making
# a grant decide access means teaching the policy to distinguish human principals
# — a change to the trust model, not an extension of it — so these endpoints are
# deliberately a record of intent and say so in every response. See
# docs/design/files-surface-parity-plan.md 5b.

_SHARES = None


def _share_store():
    global _SHARES
    if _SHARES is None:
        from cloudguard.vfs.shares import ShareStore

        _SHARES = ShareStore()
    return _SHARES


def _audit_share(action: str, path: str, actor: str, **extra) -> None:
    """Grants land in the SAME hash chain the Activity view reads, so a change to
    who can see an artifact is visible beside the reads and writes of it. A share
    log kept somewhere else would be the one record nobody thinks to check."""
    try:
        from cloudguard import tenant_audit

        tenant_audit.append(
            _TENANT,
            action,
            actor=actor or "console",
            resource=path,
            decision="recorded",
            **extra,
        )
    except Exception:  # noqa: BLE001
        # A share that cannot be audited is still recorded; the caller is told
        # nothing different, because the grant itself succeeded. The audit gap is
        # the chain verify surface's problem to report, not this endpoint's.
        pass


class ShareRequest(BaseModel):
    path: str = Field(..., max_length=4096)
    principal: str = Field(..., max_length=200)
    permission: str = Field(default="read", max_length=16)
    store: str = Field(default="artifacts", max_length=32)


class UnshareRequest(BaseModel):
    path: str = Field(..., max_length=4096)
    principal: str = Field(..., max_length=200)
    store: str = Field(default="artifacts", max_length=32)


@router.get("/shares")
async def vfs_shares(path: str = "", _p=Depends(require_principal)):
    """Grants on one path, or every grant when no path is given."""
    from cloudguard.vfs.shares import PERMISSIONS

    rows = _share_store().list(_TENANT, path or None)
    return {
        "path": path,
        "grants": rows,
        "permissions": list(PERMISSIONS),
        # The UI renders this verbatim. It is not decoration: a share panel that
        # implies enforcement it does not have is worse than no share panel.
        "enforced": False,
        "note": (
            "Recorded and audited. Not yet enforced — the policy engine treats "
            "every console user as one trusted principal."
        ),
    }


@router.post("/share")
async def vfs_share(body: ShareRequest, _p=Depends(require_principal)):
    from cloudguard.vfs.shares import ShareError

    try:
        row = _share_store().grant(
            _TENANT,
            body.path,
            body.principal,
            body.permission,
            getattr(_p, "user_id", "") or "console",
        )
    except ShareError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    _audit_share(
        "vfs_share_grant",
        body.path,
        getattr(_p, "user_id", "") or "console",
        principal=row["principal"],
        permission=row["permission"],
    )
    return {"ok": True, "grant": row, "enforced": False}


@router.post("/unshare")
async def vfs_unshare(body: UnshareRequest, _p=Depends(require_principal)):
    from cloudguard.vfs.shares import ShareError

    try:
        removed = _share_store().revoke(_TENANT, body.path, body.principal)
    except ShareError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if removed:
        _audit_share(
            "vfs_share_revoke",
            body.path,
            getattr(_p, "user_id", "") or "console",
            principal=body.principal,
        )
    return {"ok": removed, "enforced": False}


@router.get("/artifact-store")
async def vfs_artifact_store(_p=Depends(require_principal)):
    """What the Files surface needs to know about the durable store.

    `browse_url` is a BROWSER-reachable origin, which is not the same value the
    driver uses: the driver talks to `http://seafile` over the compose network,
    a name that means nothing in the analyst's browser. Kept a separate setting
    rather than derived, because guessing it produces an embed that silently
    fails to load with no clue why.

    `available` is false when the store is not configured. The surface uses that
    to hide the library view instead of framing a broken page.
    """
    import os

    repo_id = (os.environ.get('CLOUDGUARD_SEAFILE_REPO_ID') or '').strip()
    browse_url = (os.environ.get('CLOUDGUARD_SEAFILE_BROWSE_URL') or '').strip().rstrip('/')
    return JSONResponse(
        {
            'available': bool(repo_id and browse_url),
            'repo_id': repo_id,
            'browse_url': browse_url,
            # Lands on the FILES ROOT, not deep inside one library. The root is
            # where a team sees what it has — its own libraries, what has been
            # shared with it, and what is shared across the workspace — which is
            # the view a collaborator needs first. Deep-linking one library
            # hides the other two and makes sharing invisible.
            'library_url': f'{browse_url}/' if (repo_id and browse_url) else '',
        }
    )


@router.get("/cache-stats")
async def vfs_cache_stats(_p=Depends(require_principal)):
    return JSONResponse(_read_cache().stats())


@router.get("/audit-stats")
async def vfs_audit_stats(_p=Depends(require_principal)):
    pending = None
    if _OUTBOX is not None:
        try:
            pending = len(await _OUTBOX.pending())
        except Exception:  # noqa: BLE001
            pending = None
    flusher = _FLUSHER.stats() if _FLUSHER is not None else {"running": False}
    anchor = None
    if _ANCHOR is not None:
        try:
            anchor = _audit_anchor().check(_TENANT)  # CISO-2 truncation cross-check
        except Exception:  # noqa: BLE001
            anchor = None
    buffer_depth = _WRITE_BUFFER.depth() if _WRITE_BUFFER is not None else 0
    drainer = _DRAINER.stats() if _DRAINER is not None else {"running": False}
    return JSONResponse(
        {
            "outbox_pending": pending,
            "flusher": flusher,
            "write_buffer_depth": buffer_depth,
            "buffer_drainer": drainer,
            "audit_anchor": anchor,
        }
    )


def _entry_json(e) -> dict:
    return {
        "path": e.path,
        "size": e.size,
        "mtime": e.mtime,
        "content_hash": e.content_hash,
        "version": e.version,
        "mime": e.mime,
        "kind": e.kind,
        "durable": getattr(e, "durable", True),
    }

"""ONLYOFFICE document-server integration — mounted on the OpenHands app server.

ONLYOFFICE requires a JWT-signed config object generated SERVER-SIDE: the shared
secret (ONLYOFFICE_JWT_SECRET) must stay on the server and never reach the
browser. This module owns the two server-side halves:

  POST /api/onlyoffice/token     → build + JWT-sign the document config; return
                                    { token, documentServerUrl, config }. The
                                    browser passes the token straight to the
                                    editor — it never sees the secret.
  POST /api/onlyoffice/callback  → the document server posts here on save. We
                                    validate the inbound JWT, log status/key/url,
                                    download the file on status==2, and always
                                    reply { "error": 0 }.

The secret is shared with the `onlyoffice-docs` container (docker-compose.onlyoffice.yml,
same env var). See ONLYOFFICE_SETUP.md — in particular the networking notes: the
ONLYOFFICE container resolves fileUrl / callbackUrl from INSIDE itself, so those
must use host.docker.internal (not localhost) on a single host.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import mimetypes
import os
import re
import secrets
import time
from pathlib import Path
from urllib.parse import quote, urlencode

import httpx
import jwt
from fastapi import APIRouter, Body, Depends, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import require_principal

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/onlyoffice")


# ── config ───────────────────────────────────────────────────────────────────
def _jwt_secret() -> str:
    """Shared secret used to sign the config and verify callbacks. Server-side only."""
    return os.environ.get(
        "ONLYOFFICE_JWT_SECRET", "your-super-secret-jwt-key-change-this"
    )


def _document_server_url() -> str:
    """Public origin the browser loads the editor JS from (published :80)."""
    return os.environ.get("ONLYOFFICE_SERVER_URL", "http://localhost").rstrip("/")


def _uploads_dir() -> Path:
    return Path(os.environ.get("ONLYOFFICE_UPLOADS_DIR", "/tmp/onlyoffice-uploads"))


# ── Branding (docs/rebranding/onlyoffice-branding-surface.md) ─────────────────
# Licence-SAFE customization: set our own logo + customer block + a compact
# header. We do NOT set about:false / feedback:false here — hiding those on
# ONLYOFFICE Community Edition (AGPL) requires a branding/commercial licence, so
# that removal is a separate, deliberate decision, not baked in.
_BRAND_NAME = "Inference Defense"


def _brand_logo_url() -> str:
    """Absolute, BROWSER-reachable URL to our editor logo. Served by the app
    frontend (public/brand/…). Overridable; empty ⇒ omit the logo override so we
    fall back to the default editor mark rather than a broken image."""
    return os.environ.get(
        "ONLYOFFICE_LOGO_URL", "http://localhost:3000/brand/onlyoffice-logo.svg"
    ).strip()


def _customization() -> dict:
    cz: dict = {
        "compactHeader": True,
        "customer": {"name": _BRAND_NAME},
        # Let the Save button / Ctrl+S force a save (status 6 callback) so edits
        # round-trip to the sandbox immediately, not only when the editor closes.
        "forcesave": True,
    }
    logo = _brand_logo_url()
    if logo:
        cz["logo"] = {"image": logo, "imageDark": logo, "url": ""}
    return cz


def _backend_origin() -> str:
    """Origin the ONLYOFFICE CONTAINER uses to reach this backend (file proxy +
    callback). localhost inside the container is the container itself, so on a
    single host this is host.docker.internal:<app-port>."""
    return os.environ.get(
        "ONLYOFFICE_BACKEND_ORIGIN", "http://host.docker.internal:3000"
    ).rstrip("/")


# ── signed file proxy ─────────────────────────────────────────────────────────
# CloudGuard files live inside per-conversation sandbox runtimes, reachable only
# through the app. ONLYOFFICE (a separate container) has no user session, so we
# hand it a SHORT-LIVED HMAC-SIGNED URL instead of a raw one: the signature binds
# the conversation id + path + expiry, so the document server can fetch exactly
# that one file for a limited window and nothing else. This keeps tenant isolation
# intact — the same reasoning as the jupyter proxy.
def _file_sig(cid: str, path: str, exp: int) -> str:
    msg = f"{cid}\n{path}\n{exp}".encode()
    return hmac.new(_jwt_secret().encode(), msg, hashlib.sha256).hexdigest()


def _signed_file_url(cid: str, path: str, ttl_seconds: int = 3600) -> str:
    exp = int(time.time()) + ttl_seconds
    qs = urlencode(
        {"cid": cid, "path": path, "exp": exp, "sig": _file_sig(cid, path, exp)}
    )
    return f"{_backend_origin()}/api/onlyoffice/file?{qs}"


# ── signed save-back callback ─────────────────────────────────────────────────
# ONLYOFFICE only tells us an opaque document `key` + a download `url` on save; it
# has no idea which conversation/workspace file it belongs to. We bind that target
# INTO the callbackUrl (ONLYOFFICE preserves its query string), HMAC-signed so a
# valid-JWT callback can't be pointed at an arbitrary path. No expiry: an editing
# session can outlive the file-read TTL.
def _callback_sig(cid: str, path: str) -> str:
    msg = f"callback\n{cid}\n{path}".encode()
    return hmac.new(_jwt_secret().encode(), msg, hashlib.sha256).hexdigest()


def _signed_callback_url(cid: str, path: str) -> str:
    qs = urlencode({"cid": cid, "path": path, "sig": _callback_sig(cid, path)})
    return f"{_backend_origin()}/api/onlyoffice/callback?{qs}"


def _write_sandbox_file(runtime, full_path: str, content: bytes) -> None:
    """Write RAW bytes back into the conversation's runtime container.

    The write-side mirror of _read_sandbox_file: stream a one-entry tar into the
    still-running container via the docker SDK (put_archive), keyed by
    container_name — same reason we `cat` on read rather than going through the
    action server. Falls back to runtime.copy_to for runtimes without a
    container_name (CLI/K8s).
    """
    import io
    import tarfile

    container_name = getattr(runtime, "container_name", None)
    dirpath = os.path.dirname(full_path) or "/"
    name = os.path.basename(full_path)
    if container_name:
        import docker as _docker

        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w") as tar:
            info = tarfile.TarInfo(name=name)
            info.size = len(content)
            info.mtime = int(time.time())
            info.mode = 0o644
            tar.addfile(info, io.BytesIO(content))
        buf.seek(0)
        container = _docker.from_env().containers.get(container_name)
        if not container.put_archive(dirpath, buf.getvalue()):
            raise RuntimeError("put_archive returned False")
        return

    # Fallback: stage under the correct basename on the host (copy_to keeps the
    # host filename) and let the runtime copy it in.
    import shutil
    import tempfile

    tmpdir = tempfile.mkdtemp()
    try:
        host_path = os.path.join(tmpdir, name)
        with open(host_path, "wb") as fh:
            fh.write(content)
        runtime.copy_to(host_path, dirpath)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _content_type_for(path: str) -> str:
    guessed, _ = mimetypes.guess_type(path)
    if guessed:
        return guessed
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    return {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "pdf": "application/pdf",
        "csv": "text/csv",
    }.get(ext, "application/octet-stream")


def _read_sandbox_file(runtime, full_path: str) -> bytes:
    """Read a single file's RAW bytes from the conversation's runtime container.

    Mirrors cloudguard-app/files_route.py select-file-binary: use the docker SDK
    to `cat` the file directly out of the still-running container (keyed by
    container_name). This avoids runtime.copy_from — which returns a ZIP via the
    action server's /download_files and also returns EMPTY when that server is
    stale (e.g. after an app restart). Falls back to copy_from + zip-extract for
    runtimes without a container_name (CLI/K8s).
    """
    container_name = getattr(runtime, "container_name", None)
    if container_name:
        import docker as _docker

        client = _docker.from_env()
        container = client.containers.get(container_name)
        exit_code, output = container.exec_run(["cat", full_path], demux=False)
        if exit_code != 0:
            detail = output.decode("utf-8", "replace") if output else "cat failed"
            raise HTTPException(status_code=404, detail=f"file not found: {detail}")
        return output or b""

    # Fallback: copy_from returns a zip archive of the requested path — extract it.
    import zipfile

    host_path = runtime.copy_from(full_path)
    try:
        with zipfile.ZipFile(host_path) as zf:
            names = [n for n in zf.namelist() if not n.endswith("/")]
            if not names:
                raise HTTPException(status_code=404, detail="file not found")
            want = os.path.basename(full_path)
            member = next((n for n in names if os.path.basename(n) == want), names[0])
            return zf.read(member)
    finally:
        try:
            os.unlink(host_path)
        except OSError:
            pass


@router.get("/file")
async def serve_file(cid: str, path: str, exp: int, sig: str) -> Response:
    """Stream a single sandbox-workspace file to the ONLYOFFICE container.

    Auth is the HMAC signature (not a user session — ONLYOFFICE has none). Rejects
    expired links, bad signatures, and path traversal, then reads the file from the
    conversation's live runtime and returns the raw bytes.
    """
    now = int(time.time())
    if exp < now:
        raise HTTPException(status_code=403, detail="link expired")
    if not hmac.compare_digest(sig, _file_sig(cid, path, exp)):
        raise HTTPException(status_code=403, detail="bad signature")
    # No traversal outside the workspace root.
    norm = os.path.normpath(path)
    if norm.startswith("..") or os.path.isabs(norm) or ".." in norm.split(os.sep):
        raise HTTPException(status_code=400, detail="invalid path")

    # Local import so a missing server dep never breaks module import / server start.
    from openhands.server.shared import conversation_manager

    conversation = None
    try:
        conversation = await conversation_manager.attach_to_conversation(cid, None)
        if conversation is None:
            raise HTTPException(status_code=404, detail="conversation not running")
        runtime = conversation.runtime
        full_path = os.path.join(
            runtime.config.workspace_mount_path_in_sandbox, norm
        )
        data = _read_sandbox_file(runtime, full_path)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("onlyoffice file proxy: %s (cid=%s path=%s)", exc, cid, path)
        raise HTTPException(status_code=502, detail=f"could not read file: {exc}") from exc
    finally:
        if conversation is not None:
            try:
                await conversation_manager.detach_from_conversation(conversation)
            except Exception:  # noqa: BLE001
                pass

    filename = os.path.basename(norm)
    return Response(
        content=data,
        media_type=_content_type_for(norm),
        headers={"Content-Disposition": f'inline; filename="{quote(filename)}"'},
    )


# fileType (extension) → ONLYOFFICE documentType.
#   word:  docx, doc, odt, txt, rtf
#   cell:  xlsx, xls, ods, csv
#   slide: pptx, ppt, odp
#   pdf:   pdf (native viewer in Document Server 8.x+)
_DOCUMENT_TYPE_BY_EXT: dict[str, str] = {
    # word
    "docx": "word", "doc": "word", "odt": "word", "txt": "word", "rtf": "word",
    "html": "word", "epub": "word", "djvu": "word", "xps": "word", "oxps": "word",
    # cell
    "xlsx": "cell", "xls": "cell", "ods": "cell", "csv": "cell",
    # slide
    "pptx": "slide", "ppt": "slide", "odp": "slide",
    # pdf
    "pdf": "pdf",
}


def _document_type(file_type: str) -> str:
    ext = (file_type or "").lower().lstrip(".")
    dt = _DOCUMENT_TYPE_BY_EXT.get(ext)
    if dt is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported fileType '{file_type}'. Expected one of {sorted(_DOCUMENT_TYPE_BY_EXT)}.",
        )
    return dt


def _make_key() -> str:
    """Unique per editing session. Reusing a key for a different file makes
    ONLYOFFICE serve a CACHED version, so this is minted fresh every time."""
    return f"{int(time.time() * 1000)}-{secrets.token_hex(8)}"


async def _file_version(cid: str, path: str) -> str | None:
    """Best-effort 'mtime-size' fingerprint of a workspace file (docker-exec stat).

    Used to build a STABLE-yet-content-aware ONLYOFFICE document key: an unchanged
    file keeps the same key → ONLYOFFICE reuses the server-side converted session
    (fast reopen, no re-conversion, no client cache needed — the doc's "reconnect
    to the same session"). When the agent REWRITES the file, mtime/size change →
    new key → fresh convert, so a stale cached copy is never served (the classic
    ONLYOFFICE key-caching trap). Returns None on any failure (→ unique key)."""
    from openhands.server.shared import conversation_manager

    conv = None
    try:
        conv = await conversation_manager.attach_to_conversation(cid, None)
        if conv is None:
            return None
        runtime = conv.runtime
        cname = getattr(runtime, "container_name", None)
        if not cname:
            return None
        norm = os.path.normpath(path)
        full = os.path.join(runtime.config.workspace_mount_path_in_sandbox, norm)
        import docker as _docker

        c = _docker.from_env().containers.get(cname)
        code, out = c.exec_run(["stat", "-c", "%Y-%s", full], demux=False)
        if code != 0:
            return None
        return out.decode("utf-8", "replace").strip() or None
    except Exception:  # noqa: BLE001 — never block token issuance on a stat failure
        return None
    finally:
        if conv is not None:
            try:
                await conversation_manager.detach_from_conversation(conv)
            except Exception:  # noqa: BLE001
                pass


def _document_key(cid: str, path: str, mode: str, version: str | None) -> str:
    """ONLYOFFICE document.key: stable per (conversation, file, version, mode) so
    reopening resumes the same server-side session; unique fallback when the file
    can't be fingerprinted. Max 120 chars, [A-Za-z0-9-_] (ONLYOFFICE constraint)."""
    if version is None:
        return _make_key()
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", f"{cid}-{path}-{version}-{mode}")
    return safe[:120]


# ── /token ───────────────────────────────────────────────────────────────────
class TokenRequest(BaseModel):
    # Either pass an explicit, container-reachable fileUrl…
    fileUrl: str | None = Field(default=None, max_length=4096)
    # …or a conversation id + workspace-relative path, and the backend mints a
    # short-lived signed proxy URL the ONLYOFFICE container can fetch.
    conversationId: str | None = Field(default=None, max_length=128)
    filePath: str | None = Field(default=None, max_length=4096)
    fileName: str = Field(..., max_length=512)
    fileType: str = Field(..., max_length=32)
    mode: str = Field(default="edit", max_length=8)
    callbackUrl: str | None = Field(default=None, max_length=4096)


@router.post("/token")
async def create_token(
    body: TokenRequest,
    _p=Depends(require_principal),
):
    """Build the ONLYOFFICE document config and return it JWT-signed.

    Gated by require_principal so only an authenticated same-origin caller (the
    self-hosted console admin under tenancy-off) can mint a config. The signing
    secret stays here; the browser only ever receives the resulting token.

    The file can be given as an explicit `fileUrl` OR as `conversationId` +
    `filePath` — in the latter case the backend mints a short-lived signed proxy
    URL (see /file) so ONLYOFFICE can read the sandbox file without a session.
    """
    mode = body.mode if body.mode in ("edit", "view") else "edit"
    ext = body.fileType.lower().lstrip(".")

    if body.fileUrl:
        file_url = body.fileUrl
        # Explicit URL: no sandbox file to fingerprint → a unique session each time.
        doc_key = _make_key()
    elif body.conversationId and body.filePath:
        file_url = _signed_file_url(body.conversationId, body.filePath)
        # FRESH key per open. A stable content-fingerprint key (the old A1 opt) made
        # the Document Server resurrect a prior editing session on page reload and
        # pop "The file version has been changed. The page will be reloaded." when
        # its cached state diverged from disk. A unique key means every open loads
        # the CURRENT workspace file cleanly — no stale-session reconciliation.
        # Save-back is keyed on (cid, path), NOT the doc key, so it is unaffected.
        # Trade-off: the DS re-converts on each open (negligible for these files);
        # correctness/no-glitch beats the resume micro-optimization.
        doc_key = _make_key()
    else:
        raise HTTPException(
            status_code=400,
            detail="provide either fileUrl or (conversationId and filePath)",
        )

    # Callback target: when we know the sandbox file (conversationId + filePath),
    # sign it INTO the callbackUrl so save-back writes to the right workspace path.
    # An explicit fileUrl has no known writeback target → plain callback (log-only).
    if body.callbackUrl:
        callback_url = body.callbackUrl
    elif body.conversationId and body.filePath:
        callback_url = _signed_callback_url(body.conversationId, body.filePath)
    else:
        callback_url = f"{_backend_origin()}/api/onlyoffice/callback"

    config: dict = {
        "document": {
            "fileType": ext,
            "key": doc_key,
            "title": body.fileName,
            "url": file_url,
        },
        "documentType": _document_type(body.fileType),
        "editorConfig": {
            "callbackUrl": callback_url,
            "mode": mode,
            "user": {
                "id": "user-1",
                "name": "Analyst",
            },
            "customization": _customization(),
        },
    }

    token = jwt.encode(config, _jwt_secret(), algorithm="HS256")
    return {
        "token": token,
        "documentServerUrl": _document_server_url(),
        "config": config,
    }


# ── /callback ────────────────────────────────────────────────────────────────
def _verify_callback_jwt(authorization: str | None, body: dict) -> None:
    """Validate the JWT ONLYOFFICE sends with a callback.

    The server sends it in the Authorization header (``Bearer <jwt>``, per
    JWT_HEADER) and/or as a ``token`` field in the body. Reject if neither is a
    valid signature — a callback we cannot verify must not be trusted to move files.
    """
    raw = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[len("bearer "):].strip()
    if raw is None:
        raw = body.get("token")
    if not raw:
        raise HTTPException(status_code=401, detail="missing callback JWT")
    try:
        jwt.decode(raw, _jwt_secret(), algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"invalid callback JWT: {exc}") from exc


def _vfs_writeback_enabled() -> bool:
    """V5 flip flag: route ONLYOFFICE save-back through the VFS pipeline (policy +
    tamper-evident audit + buffer-not-fail) instead of a raw put_archive. Default
    OFF so the flip is opt-in and zero-regression; a VFS failure falls back to the
    legacy direct write so an edit is never lost during rollout."""
    return os.environ.get("CLOUDGUARD_VFS_ONLYOFFICE_WRITEBACK", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


async def _save_to_sandbox(cid: str, path: str, content: bytes) -> None:
    """Write the edited document back to the conversation's workspace file."""
    norm = os.path.normpath(path)
    if norm.startswith("..") or os.path.isabs(norm) or ".." in norm.split(os.sep):
        raise ValueError(f"invalid writeback path: {path}")

    # V5: prefer the VFS seam when flipped on. Same target file, but the write now
    # runs the full pipeline (audit chain entry + event + buffer-not-fail). Any VFS
    # error falls through to the legacy direct write below so no edit is dropped.
    if _vfs_writeback_enabled():
        try:
            from openhands.server.routes.cloudguard_vfs import surface_write

            entry = await surface_write(
                cid, norm, content, mime=_content_type_for(norm), actor="onlyoffice"
            )
            logger.info(
                "onlyoffice save-back via VFS: %d bytes → %s (cid=%s hash=%s)",
                len(content),
                norm,
                cid,
                entry.content_hash,
            )
            return
        except Exception as exc:  # noqa: BLE001 — degrade to direct write, never lose the edit
            logger.warning(
                "onlyoffice VFS save-back failed (%s); falling back to direct write", exc
            )

    from openhands.server.shared import conversation_manager

    conversation = None
    try:
        conversation = await conversation_manager.attach_to_conversation(cid, None)
        if conversation is None:
            raise RuntimeError("conversation not running")
        runtime = conversation.runtime
        full_path = os.path.join(runtime.config.workspace_mount_path_in_sandbox, norm)
        _write_sandbox_file(runtime, full_path, content)
        logger.info(
            "onlyoffice save-back: wrote %d bytes → %s (cid=%s)",
            len(content),
            full_path,
            cid,
        )
    finally:
        if conversation is not None:
            try:
                await conversation_manager.detach_from_conversation(conversation)
            except Exception:  # noqa: BLE001
                pass


@router.post("/callback")
async def save_callback(
    body: dict = Body(...),
    authorization: str | None = Header(default=None),
    cid: str | None = None,
    path: str | None = None,
    sig: str | None = None,
):
    """Handle document-server save callbacks.

    status codes: 1=editing, 2=ready-to-save, 3=save-error, 4=closed-no-changes,
    6=force-save, 7=force-save-error. On 2/6 the document is downloadable at
    ``url``. If the callbackUrl carried a signed (cid, path) target we write the
    edited document straight back to that sandbox file; otherwise we fall back to
    the local uploads dir (log-only, e.g. an explicit fileUrl with no known path).
    We ALWAYS return {"error": 0} so ONLYOFFICE marks the callback handled (any
    other body makes it retry indefinitely).
    """
    _verify_callback_jwt(authorization, body)

    status = body.get("status")
    key = body.get("key")
    url = body.get("url")
    logger.info(
        "onlyoffice callback: status=%s key=%s cid=%s path=%s url=%s",
        status,
        key,
        cid,
        path,
        url,
    )

    if status in (2, 6) and url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
            content = resp.content

            target_ok = bool(cid and path and sig) and hmac.compare_digest(
                sig or "", _callback_sig(cid or "", path or "")
            )
            if target_ok:
                await _save_to_sandbox(cid, path, content)  # type: ignore[arg-type]
            else:
                # No verified sandbox target — keep a local copy so the edit isn't lost.
                uploads = _uploads_dir()
                uploads.mkdir(parents=True, exist_ok=True)
                dest = uploads / f"{key or _make_key()}"
                dest.write_bytes(content)
                logger.info(
                    "onlyoffice callback: no signed target, saved %d bytes → %s",
                    len(content),
                    dest,
                )
        except Exception as exc:  # noqa: BLE001 — never fail the callback on a save error
            logger.error("onlyoffice callback: download/save-back failed: %s", exc)

    return {"error": 0}

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
    elif body.conversationId and body.filePath:
        file_url = _signed_file_url(body.conversationId, body.filePath)
    else:
        raise HTTPException(
            status_code=400,
            detail="provide either fileUrl or (conversationId and filePath)",
        )

    # Default the callback to this backend's proxy origin so saves round-trip
    # without the caller having to know the container-side host.
    callback_url = body.callbackUrl or f"{_backend_origin()}/api/onlyoffice/callback"

    config: dict = {
        "document": {
            "fileType": ext,
            "key": _make_key(),
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


@router.post("/callback")
async def save_callback(
    body: dict = Body(...),
    authorization: str | None = Header(default=None),
):
    """Handle document-server save callbacks.

    status codes: 1=editing, 2=ready-to-save, 3=save-error, 4=closed-no-changes,
    6=force-save, 7=force-save-error. On 2/6 the document is downloadable at
    ``url``. We ALWAYS return {"error": 0} so ONLYOFFICE marks the callback
    handled (any other body makes it retry indefinitely).
    """
    _verify_callback_jwt(authorization, body)

    status = body.get("status")
    key = body.get("key")
    url = body.get("url")
    logger.info("onlyoffice callback: status=%s key=%s url=%s", status, key, url)

    if status in (2, 6) and url:
        try:
            uploads = _uploads_dir()
            uploads.mkdir(parents=True, exist_ok=True)
            # Best-effort filename from the doc key; ONLYOFFICE serves the saved doc.
            dest = uploads / f"{key or _make_key()}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                dest.write_bytes(resp.content)
            logger.info("onlyoffice callback: saved %d bytes → %s", len(resp.content), dest)
        except Exception as exc:  # noqa: BLE001 — never fail the callback on a save error
            logger.error("onlyoffice callback: download/save failed: %s", exc)

    return {"error": 0}

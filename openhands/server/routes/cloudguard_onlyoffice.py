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

import base64
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
from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import require_principal

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/onlyoffice")

# Internal token for sandbox→app office calls (office_convert / office_live). The
# agent's runtime is a trusted first party, but its calls carry no console session,
# so require_principal would reject them. We mint a per-process token here and
# forward it to each runtime's env (docker_runtime), so the sandbox tool can prove
# it's ours. Overridable via CLOUDGUARD_OFFICE_TOKEN; never a hardcoded secret.
os.environ.setdefault("CLOUDGUARD_OFFICE_TOKEN", secrets.token_hex(16))


async def _principal_or_internal(
    x_cloudguard_internal: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
):
    """Accept EITHER a valid console principal OR the internal office token (used by
    the sandbox MCP tools). Falls back to require_principal so browser calls are
    unaffected."""
    tok = os.environ.get("CLOUDGUARD_OFFICE_TOKEN", "")
    if tok and x_cloudguard_internal and hmac.compare_digest(x_cloudguard_internal, tok):
        return {"id": "agent", "internal": True}
    return await require_principal(authorization=authorization)


# ── config ───────────────────────────────────────────────────────────────────
def _jwt_secret() -> str:
    """Shared secret used to sign the config and verify callbacks. Server-side only."""
    return os.environ.get(
        "ONLYOFFICE_JWT_SECRET", "your-super-secret-jwt-key-change-this"
    )


def _document_server_url() -> str:
    """Public origin the browser loads the editor JS from. To make the editor
    FIRST-PARTY (same-origin as the app → service worker + co-authoring + save-back
    work), point this at the same-origin gateway. Env wins; else a marker file
    (toggle without recreating the container); else the published DS :80."""
    v = os.environ.get("ONLYOFFICE_SERVER_URL")
    if v:
        return v.rstrip("/")
    try:
        with open(os.environ.get("CLOUDGUARD_DS_URL_FILE", "/app/.cloudguard_ds_url")) as fh:
            u = fh.read().strip()
            if u:
                return u.rstrip("/")
    except Exception:  # noqa: BLE001
        pass
    return "http://localhost"


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

    # SRE-1b: when the writeback flip is on, read THROUGH the VFS so a reopen after
    # a buffered save serves read-your-writes content (the spooled bytes), not the
    # stale backing file. Falls back to the direct read on VFS-unavailable/error.
    if _vfs_writeback_enabled():
        from cloudguard.vfs import VFSNotFound

        try:
            from openhands.server.routes.cloudguard_vfs import surface_read

            data = await surface_read(cid, norm)
            filename = os.path.basename(norm)
            return Response(
                content=data,
                media_type=_content_type_for(norm),
                headers={"Content-Disposition": f'inline; filename="{quote(filename)}"'},
            )
        except VFSNotFound as exc:
            raise HTTPException(status_code=404, detail="file not found") from exc
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001 — VFS down/unexpected: fall back to direct read
            logger.warning(
                "onlyoffice VFS read failed (%s); falling back to direct read", exc
            )

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


# ── Layer 1: Document Builder (headless Office JS generation) ─────────────────
# The agent generates docx/xlsx/pptx by sending an Office JS script to the DS's
# /docbuilder endpoint — the SAME engine as the editor, so output is byte-perfect.
# Flow: host the script at a signed URL the DS can fetch → POST /docbuilder (JWT)
# → DS runs it headlessly → returns a cache fileUrl → we download the bytes.
def _ds_internal() -> str:
    """DS origin reachable FROM the app container (same docker network)."""
    return os.environ.get("ONLYOFFICE_INTERNAL_URL", "http://onlyoffice-docs").rstrip(
        "/"
    )


# id -> (script, expiry). Short-lived; the DS fetches each script once, immediately.
_SCRIPT_STORE: dict[str, tuple[str, float]] = {}


def _script_sig(sid: str, exp: int) -> str:
    msg = f"script\n{sid}\n{exp}".encode()
    return hmac.new(_jwt_secret().encode(), msg, hashlib.sha256).hexdigest()


def _host_script(script: str, ttl_seconds: int = 120) -> str:
    """Stash a docbuilder script and return a signed URL the DS container can GET."""
    sid = secrets.token_hex(8)
    exp = int(time.time()) + ttl_seconds
    _SCRIPT_STORE[sid] = (script, float(exp))
    # prune expired entries opportunistically
    now = time.time()
    for k in [k for k, (_, e) in _SCRIPT_STORE.items() if e < now]:
        _SCRIPT_STORE.pop(k, None)
    qs = urlencode({"id": sid, "exp": exp, "sig": _script_sig(sid, exp)})
    return f"{_backend_origin()}/api/onlyoffice/script?{qs}"


# ── Layer 3: Conversion (x2t via ConvertService) — WORKS on this DS ───────────
async def _convert_ds(
    source_url: str, from_ext: str, to_ext: str, timeout: float = 60.0
) -> bytes:
    """Convert a DS-fetchable file to another format; return the result bytes."""
    import uuid

    payload = {
        "async": False,
        "filetype": from_ext,
        "outputtype": to_ext,
        "key": f"conv-{uuid.uuid4().hex[:12]}",
        "url": source_url,
        "title": f"convert.{from_ext}",
    }
    token = jwt.encode({"payload": payload}, _jwt_secret(), algorithm="HS256")
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{_ds_internal()}/ConvertService.ashx",
            json={**payload, "token": token},
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("error"):
            raise RuntimeError(f"conversion error {data.get('error')}")
        file_url = data.get("fileUrl")
        if not file_url:
            raise RuntimeError(f"conversion incomplete: {data}")
        internal = file_url
        for pub in (_document_server_url(), "http://localhost", "https://localhost"):
            if pub and internal.startswith(pub):
                internal = _ds_internal() + internal[len(pub) :]
                break
        fr = await client.get(internal)
        fr.raise_for_status()
        return fr.content


@router.get("/docbuilder-selftest")
async def docbuilder_selftest(mode: str = "sync", _p=Depends(require_principal)):
    """Layer 1 docbuilder probe — dumps the RAW response so we can see where the
    v9.4.0 embedded converter puts the output URL."""
    script = (
        'builder.CreateFile("docx");'
        "var oDocument = Api.GetDocument();"
        "var oParagraph = Api.CreateParagraph();"
        'oParagraph.AddText("docbuilder works");'
        "oDocument.Push(oParagraph);"
        'builder.SaveFile("docx", "output.docx");'
        "builder.CloseFile();"
    )
    url = _host_script(script)
    is_async = mode == "async"
    token = jwt.encode(
        {"payload": {"async": is_async, "url": url}}, _jwt_secret(), algorithm="HS256"
    )
    out = []
    async with httpx.AsyncClient(timeout=60) as client:
        for _ in range(6):
            r = await client.post(
                f"{_ds_internal()}/docbuilder",
                json={"async": is_async, "url": url},
                headers={"Authorization": f"Bearer {token}"},
            )
            data = r.json()
            out.append(data)
            if not is_async or data.get("end"):
                break
            import asyncio

            await asyncio.sleep(1)
    return {"mode": mode, "responses": out}


@router.get("/office-selftest")
async def office_selftest(conversation_id: str, _p=Depends(require_principal)):
    """Prove the WORKING office stack in-process: code-gen (openpyxl/python-docx)
    produces valid files, and Layer 3 conversion round-trips through the real DS.
    (Layer 1 docbuilder is disabled — it crashes in this DS image.)"""
    import io
    import zipfile

    import docx
    import openpyxl

    out: dict = {}
    docx_bytes = _blank_ooxml("docx") or b""
    xlsx_bytes = _blank_ooxml("xlsx") or b""
    out["codegen"] = {
        "docx_bytes": len(docx_bytes),
        "docx_valid": docx.Document(io.BytesIO(docx_bytes)) is not None,
        "xlsx_bytes": len(xlsx_bytes),
        "xlsx_valid": openpyxl.load_workbook(io.BytesIO(xlsx_bytes)) is not None,
    }
    try:
        src = _signed_file_url(conversation_id, "pages/analysis.csv")
        data = await _convert_ds(src, "csv", "xlsx")
        z = zipfile.ZipFile(io.BytesIO(data))
        out["conversion"] = {"ok": True, "bytes": len(data), "valid_xlsx": z.testzip() is None}
    except Exception as exc:  # noqa: BLE001
        out["conversion"] = {"ok": False, "error": str(exc)}
    return out


# ── Office generation (code-gen) + workspace write — the agent-facing Layer 1 ──
def _gen_findings_xlsx(findings: list[dict], sheet_name: str, color: bool) -> bytes:
    from cloudguard.office import generate

    return generate.findings_workbook(findings, sheet_name)


def _gen_report_docx(title: str, blocks: list[dict]) -> bytes:
    from cloudguard.office import generate

    return generate.build_document(title, blocks)


async def _write_workspace_file(cid: str, path: str, data: bytes) -> str:
    """Write bytes to a conversation's workspace (creating parent dirs). Returns
    the absolute sandbox path."""
    norm = os.path.normpath(path)
    if norm.startswith("..") or os.path.isabs(norm) or ".." in norm.split(os.sep):
        raise HTTPException(status_code=400, detail="invalid path")
    from openhands.server.shared import conversation_manager

    conv = None
    try:
        conv = await conversation_manager.attach_to_conversation(cid, None)
        if conv is None:
            raise HTTPException(status_code=404, detail="conversation not running")
        runtime = conv.runtime
        full = os.path.join(runtime.config.workspace_mount_path_in_sandbox, norm)
        cname = getattr(runtime, "container_name", None)
        if cname:
            import docker as _docker

            c = _docker.from_env().containers.get(cname)
            parent = os.path.dirname(full)
            if parent:
                c.exec_run(["mkdir", "-p", parent])
        _write_sandbox_file(runtime, full, data)
        return full
    finally:
        if conv is not None:
            try:
                await conversation_manager.detach_from_conversation(conv)
            except Exception:  # noqa: BLE001
                pass


# ── Document checkpoints — agent-driven versioning (save + revert) ────────────
# A checkpoint is a sha256-integrity-hashed snapshot of a workspace document,
# stored in the sandbox under .cloudguard/checkpoints/<safe-path>/. The agent can
# snapshot the current document and later revert to any snapshot. Robustness:
#   * sha256 recorded at snapshot time + VERIFIED on revert (corruption → 409)
#   * revert AUTO-snapshots the pre-revert state first, so a revert is itself
#     undoable (no destructive, unrecoverable action)
#   * best-effort forcesave before snapshot so live editor edits are captured
async def _read_workspace_file(cid: str, path: str) -> bytes:
    norm = os.path.normpath(path)
    if norm.startswith("..") or os.path.isabs(norm) or ".." in norm.split(os.sep):
        raise HTTPException(status_code=400, detail="invalid path")
    from openhands.server.shared import conversation_manager

    conv = None
    try:
        conv = await conversation_manager.attach_to_conversation(cid, None)
        if conv is None:
            raise HTTPException(status_code=404, detail="conversation not running")
        runtime = conv.runtime
        full = os.path.join(runtime.config.workspace_mount_path_in_sandbox, norm)
        return _read_sandbox_file(runtime, full)
    finally:
        if conv is not None:
            try:
                await conversation_manager.detach_from_conversation(conv)
            except Exception:  # noqa: BLE001
                pass


def _ckpt_dir(path: str) -> str:
    safe = os.path.normpath(path).replace("..", "_").strip("/").replace("/", "__")
    return f".cloudguard/checkpoints/{safe}"


async def _ckpt_index_read(cid: str, path: str) -> list[dict]:
    import json as _json

    try:
        raw = await _read_workspace_file(cid, f"{_ckpt_dir(path)}/index.json")
        return _json.loads(raw or b"[]")
    except Exception:  # noqa: BLE001 — no index yet
        return []


async def _ckpt_index_write(cid: str, path: str, index: list[dict]) -> None:
    import json as _json

    await _write_workspace_file(
        cid, f"{_ckpt_dir(path)}/index.json", _json.dumps(index, indent=2).encode()
    )


async def _ckpt_create(cid: str, path: str, label: str = "", auto: bool = False) -> dict:
    try:  # best-effort: persist live editor edits so the snapshot is current
        await _live_forcesave(cid, path)
    except Exception:  # noqa: BLE001
        pass
    data = await _read_workspace_file(cid, path)
    sha = hashlib.sha256(data).hexdigest()
    ext = path.rsplit(".", 1)[-1] if "." in path else "bin"
    ckid = f"{int(time.time() * 1000)}-{secrets.token_hex(4)}"
    await _write_workspace_file(cid, f"{_ckpt_dir(path)}/{ckid}.{ext}", data)
    entry = {
        "id": ckid, "ts": int(time.time()), "label": label or ("auto" if auto else ""),
        "size": len(data), "sha256": sha, "auto": auto,
    }
    index = await _ckpt_index_read(cid, path)
    index.append(entry)
    await _ckpt_index_write(cid, path, index)
    return entry


async def _ckpt_revert(cid: str, path: str, checkpoint_id: str) -> dict:
    index = await _ckpt_index_read(cid, path)
    entry = next((e for e in index if e["id"] == checkpoint_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail=f"checkpoint not found: {checkpoint_id}")
    ext = path.rsplit(".", 1)[-1] if "." in path else "bin"
    data = await _read_workspace_file(cid, f"{_ckpt_dir(path)}/{checkpoint_id}.{ext}")
    if hashlib.sha256(data).hexdigest() != entry["sha256"]:
        raise HTTPException(status_code=409, detail="checkpoint integrity check failed (sha256 mismatch)")
    # safety: snapshot the CURRENT state before overwriting → revert is undoable
    safety = await _ckpt_create(cid, path, label=f"pre-revert-to-{checkpoint_id}", auto=True)
    await _write_workspace_file(cid, path, data)
    return {
        "reverted": True, "id": checkpoint_id, "sha256": entry["sha256"],
        "safety_checkpoint": safety["id"], "reload_required": True,
    }


class CheckpointRequest(BaseModel):
    conversationId: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    label: str = Field(default="", max_length=200)


class RevertRequest(BaseModel):
    conversationId: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    id: str = Field(..., max_length=64)


@router.post("/office/checkpoint")
async def office_checkpoint(body: CheckpointRequest, _p=Depends(_principal_or_internal)):
    """Snapshot the current document (agent versioning). Returns {id, sha256, ...}."""
    return await _ckpt_create(body.conversationId, body.path, body.label)


@router.get("/office/checkpoints")
async def office_checkpoints(conversation_id: str, path: str, _p=Depends(_principal_or_internal)):
    """List checkpoints for a document (newest last)."""
    return {"checkpoints": await _ckpt_index_read(conversation_id, path)}


@router.post("/office/revert")
async def office_revert(body: RevertRequest, _p=Depends(_principal_or_internal)):
    """Revert a document to a checkpoint (sha256-verified). Auto-snapshots the
    current state first. The open editor must reopen to show it (reload_required)."""
    return await _ckpt_revert(body.conversationId, body.path, body.id)


class SheetRequest(BaseModel):
    conversationId: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    findings: list[dict] = Field(default_factory=list)
    sheetName: str = Field(default="Findings", max_length=64)
    colorCoding: bool = True


class DocRequest(BaseModel):
    conversationId: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    title: str = Field(default="", max_length=256)
    blocks: list[dict] = Field(default_factory=list)


class ConvertRequest(BaseModel):
    conversationId: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)  # source, workspace-relative
    outputPath: str = Field(..., max_length=4096)
    fromType: str = Field(..., max_length=16)
    toType: str = Field(..., max_length=16)


@router.post("/office/sheet")
async def office_sheet(body: SheetRequest, _p=Depends(require_principal)):
    """Layer 1 (code-gen): write structured findings into a color-coded .xlsx."""
    data = _gen_findings_xlsx(body.findings, body.sheetName, body.colorCoding)
    full = await _write_workspace_file(body.conversationId, body.path, data)
    return {"path": full, "bytes": len(data), "rows": len(body.findings)}


@router.post("/office/doc")
async def office_doc(body: DocRequest, _p=Depends(require_principal)):
    """Layer 1 (code-gen): build a styled .docx report from structured blocks."""
    data = _gen_report_docx(body.title, body.blocks)
    full = await _write_workspace_file(body.conversationId, body.path, data)
    return {"path": full, "bytes": len(data), "blocks": len(body.blocks)}


class LiveCmdRequest(BaseModel):
    conversationId: str = Field(..., max_length=128)
    path: str = Field(..., max_length=4096)
    op: str = Field(..., max_length=32)
    args: dict = Field(default_factory=dict)
    timeout: float = Field(default=3.0, ge=0.1, le=10.0)


@router.post("/office/live")
async def office_live(body: LiveCmdRequest, _p=Depends(_principal_or_internal)):
    """Layer 2: send a live command to the analyst's open editor. Returns
    {"live": True, ...} if it executed there, or {"live": False, "reason": ...} so
    the agent knows to fall back (the file isn't open / the tab went away).

    op="save" is special: it force-persists the open editor's state (incl. the
    agent's live edits) back to the sandbox file, rather than routing a command."""
    if body.op == "save":
        return await _live_forcesave(body.conversationId, body.path)
    return await live_send(
        body.conversationId, body.path, body.op, body.args, timeout=body.timeout
    )


@router.post("/office/convert")
async def office_convert(body: ConvertRequest, _p=Depends(_principal_or_internal)):
    """Layer 3: convert a workspace file to another format via the DS."""
    src = _signed_file_url(body.conversationId, body.path)
    data = await _convert_ds(src, body.fromType.lstrip("."), body.toType.lstrip("."))
    full = await _write_workspace_file(body.conversationId, body.outputPath, data)
    return {"path": full, "bytes": len(data), "from": body.fromType, "to": body.toType}


# ── Layer 2: live editor co-pilot — session registry + command channel ────────
# Robustness model: Layer 2 is best-effort live sugar over the reliable Layer 1
# floor. Every measure below exists so a live command can NEVER hard-fail — it
# either executes in the open editor or the caller falls back to headless.
#
#   * Session registry with heartbeat TTL  → no "ghost" editors; a closed/crashed
#     tab expires and the router silently routes headless.
#   * Command envelope + ack + timeout      → a dropped socket / closed tab / macro
#     error all resolve to a clean fallback, never a hang.
#   * Keyed by (conversation, path)         → strict isolation; a command can only
#     reach that conversation's editor, never another user's.
#   * Bounded per-session queue (drop-oldest)→ an agent that floods commands can't
#     unbound memory.
import asyncio as _asyncio
import uuid as _uuid

_LIVE_TTL = 25.0  # seconds since last heartbeat before an editor is "closed"
_LIVE_MAX_QUEUE = 50  # per-session command backlog cap (drop-oldest)
# (conversation, norm_path) -> {"editor_id", "tab", "ts"}
_LIVE_SESSIONS: dict[tuple[str, str], dict] = {}
# (conversation, norm_path) -> list[envelope]
_LIVE_QUEUE: dict[tuple[str, str], list[dict]] = {}
# cmd_id -> {"ok": bool, "result": ..., "error": ...}
_LIVE_ACKS: dict[str, dict] = {}
# (conversation, norm_path) -> monotonically increasing per-shard sequence number.
# M2: seq gives the plugin gap/reorder detection across reconnects; envelopes carry
# a version so the protocol can evolve. Delivery is at-least-once (poll returns the
# queue WITHOUT popping — see live_plugin_poll) + idempotent (the plugin dedups by
# id and re-acks) → a dropped poll response or lost ack never loses/duplicates an
# effect. A command leaves the queue only on ack (live_plugin_ack) or send-timeout.
_LIVE_SEQ: dict[tuple[str, str], int] = {}
_LIVE_PROTO_V = 1
# shard -> the ONLYOFFICE document key of the currently-open editor, so we can
# forcesave THAT session (persist agent edits back to the sandbox file).
_LIVE_DOCKEY: dict[str, str] = {}

# ── M3: Redis-backed presence + seat accounting + save-lock ───────────────────
# Presence/seats live in Redis so they survive an app restart and are correct
# across replicas (the in-process dicts above can't be). EVERYTHING here degrades
# to a safe local fallback when Redis is unavailable, so M1/M2 never break.
_REDIS = None
_REDIS_TRIED = False
_LIVE_MAX_EDIT = int(os.environ.get("CLOUDGUARD_LIVE_MAX_EDIT", "25"))
_LIVE_MAX_VIEW = int(os.environ.get("CLOUDGUARD_LIVE_MAX_VIEW", "200"))


def _redis():
    """Lazy Redis client; None if unavailable (→ in-memory fallback). Non-fatal."""
    global _REDIS, _REDIS_TRIED
    if _REDIS_TRIED:
        return _REDIS
    _REDIS_TRIED = True
    url = os.environ.get("CLOUDGUARD_REDIS_URL", "redis://cloudguard-redis:6379/0")
    try:
        import redis as _r

        c = _r.from_url(url, socket_connect_timeout=0.5, socket_timeout=0.5, decode_responses=True)
        c.ping()
        _REDIS = c
    except Exception:  # noqa: BLE001
        _REDIS = None
    return _REDIS


def _live_tenant() -> str:
    """Tenant scope for the live keyspace. Tenancy is off here → 'default'."""
    return os.environ.get("CLOUDGUARD_TENANT", "default")


def _live_shard(cid: str, path: str) -> str:
    return f"{_live_tenant()}:{cid}:{os.path.normpath(path or '')}"


def _live_presence_touch(cid: str, path: str, conn: str, seat: str) -> dict:
    """Record a live connection (ZSET member=conn, score=now), prune expired, and
    return {"edit": n, "view": m, "admitted": bool, "cap": int}. Enforces per-shard
    seat caps atomically-enough (ZADD+ZCARD). Falls back to a permissive local view."""
    r = _redis()
    seat = "view" if seat == "view" else "edit"
    cap = _LIVE_MAX_VIEW if seat == "view" else _LIVE_MAX_EDIT
    if not r or not conn:
        return {"edit": 1 if seat == "edit" else 0, "view": 1 if seat == "view" else 0, "admitted": True, "cap": cap}
    now = time.time()
    ek = f"cg:live:conn:edit:{_live_shard(cid, path)}"
    vk = f"cg:live:conn:view:{_live_shard(cid, path)}"
    key = vk if seat == "view" else ek
    try:
        pipe = r.pipeline()
        pipe.zadd(key, {conn: now})
        pipe.zremrangebyscore(key, 0, now - _LIVE_TTL)
        pipe.expire(key, int(_LIVE_TTL * 3))
        pipe.zcard(ek)
        pipe.zcard(vk)
        res = pipe.execute()
        return {"edit": res[-2], "view": res[-1], "admitted": (res[-2 if seat == "edit" else -1] <= cap), "cap": cap}
    except Exception:  # noqa: BLE001
        return {"edit": 0, "view": 0, "admitted": True, "cap": cap}


def _live_presence(cid: str, path: str) -> dict:
    r = _redis()
    if not r:
        s = _LIVE_SESSIONS.get(_live_key(cid, path))
        return {"edit": 1 if s else 0, "view": 0, "conns": []}
    now = time.time()
    ek = f"cg:live:conn:edit:{_live_shard(cid, path)}"
    vk = f"cg:live:conn:view:{_live_shard(cid, path)}"
    try:
        for k in (ek, vk):
            r.zremrangebyscore(k, 0, now - _LIVE_TTL)
        return {
            "edit": r.zcard(ek),
            "view": r.zcard(vk),
            "conns": r.zrange(ek, 0, -1) + r.zrange(vk, 0, -1),
        }
    except Exception:  # noqa: BLE001
        return {"edit": 0, "view": 0, "conns": []}


def _live_savelock_acquire(cid: str, path: str, holder: str, ms: int = 10000) -> bool:
    """Serialize writes to a shard (a human save vs an agent write). No Redis → the
    single process is the only writer, so allow."""
    r = _redis()
    if not r:
        return True
    try:
        return bool(r.set(f"cg:live:savelock:{_live_shard(cid, path)}", holder, nx=True, px=ms))
    except Exception:  # noqa: BLE001
        return True


async def _live_forcesave(cid: str, path: str) -> dict:
    """Persist the OPEN editor's current state (incl. agent edits) back to the
    sandbox file, via the DS CommandService `forcesave` → save callback. Requires a
    live editor (we need its doc key)."""
    key = _LIVE_DOCKEY.get(_live_shard(cid, path))
    if not key:
        return {"saved": False, "reason": "no open editor for shard"}
    payload = {"c": "forcesave", "key": key}
    payload["token"] = jwt.encode(payload, _jwt_secret(), algorithm="HS256")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{_ds_internal()}/coauthoring/CommandService.ashx", json=payload
            )
            data = resp.json()
        # error 0 = queued/ok; 4 = no changes to save (already persisted) — both fine
        err = data.get("error")
        return {"saved": err in (0, 4), "ds_error": err}
    except Exception as exc:  # noqa: BLE001
        return {"saved": False, "reason": str(exc)}


def _live_publish_wake(cid: str, path: str) -> None:
    """Sub-second latency: publish a wake so an open SSE stream for this shard reads
    the queue immediately (instead of waiting for the next poll). No Redis → no-op
    (the plugin's 1 s poll still delivers)."""
    r = _redis()
    if not r:
        return
    try:
        r.publish(f"cg:live:evt:{_live_shard(cid, path)}", "1")
    except Exception:  # noqa: BLE001
        pass


def _live_savelock_release(cid: str, path: str, holder: str) -> None:
    r = _redis()
    if not r:
        return
    try:  # compare-and-delete so we only release our own lock
        r.eval(
            "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
            1, f"cg:live:savelock:{_live_shard(cid, path)}", holder,
        )
    except Exception:  # noqa: BLE001
        pass


# ── Automation-method allow-list (the 133 executeMethod surface, gated) ───────
# The generic `method` op → Asc.plugin.executeMethod(name, params). We do NOT expose
# all 133 — this is a curated ALLOW-LIST, grown in tested batches. Dangerous methods
# (InstallPlugin/RemovePlugin/UpdatePlugin, Get/SetMacros, GetVBAMacros, keychain,
# OnEncryption, SetCustomFunctions) are intentionally excluded. `kind` read/write is
# informational; `batch` gates rollout via CLOUDGUARD_LIVE_METHOD_BATCH.
_LIVE_METHODS: dict[str, dict] = {
    # Batch 1 — comments & review + selection reads
    "AddComment": {"kind": "write", "batch": 1},
    "GetAllComments": {"kind": "read", "batch": 1},
    "ChangeComment": {"kind": "write", "batch": 1},
    "RemoveComments": {"kind": "write", "batch": 1},
    "MoveToComment": {"kind": "write", "batch": 1},
    "AcceptReviewChanges": {"kind": "write", "batch": 1},
    "RejectReviewChanges": {"kind": "write", "batch": 1},
    "MoveToNextReviewChange": {"kind": "write", "batch": 1},
    "GetSelectedText": {"kind": "read", "batch": 1},
    "GetSelectionType": {"kind": "read", "batch": 1},
    "GetCurrentWord": {"kind": "read", "batch": 1},
    "GetCurrentSentence": {"kind": "read", "batch": 1},
    # Batch 2 — text edit / search-replace / insert
    "SearchAndReplace": {"kind": "write", "batch": 2},
    "SearchNext": {"kind": "read", "batch": 2},
    "ReplaceTextSmart": {"kind": "write", "batch": 2},
    "ReplaceCurrentWord": {"kind": "write", "batch": 2},
    "ReplaceCurrentSentence": {"kind": "write", "batch": 2},
    "InputText": {"kind": "write", "batch": 2},
    "PasteText": {"kind": "write", "batch": 2},
    "PasteHtml": {"kind": "write", "batch": 2},
    "ReplacePageContent": {"kind": "write", "batch": 2},
    # Batch 3 — undo/redo/action batching + navigation
    "Undo": {"kind": "write", "batch": 3},
    "Redo": {"kind": "write", "batch": 3},
    "CanUndo": {"kind": "read", "batch": 3},
    "CanRedo": {"kind": "read", "batch": 3},
    "StartAction": {"kind": "write", "batch": 3},
    "EndAction": {"kind": "write", "batch": 3},
    "GetCurrentPage": {"kind": "read", "batch": 3},
    "GoToPage": {"kind": "write", "batch": 3},
    "GetCurrentBookmark": {"kind": "read", "batch": 3},
    "MoveCursorToStart": {"kind": "write", "batch": 3},
    "MoveCursorToEnd": {"kind": "write", "batch": 3},
    # Batch 4 — content controls
    "AddContentControl": {"kind": "write", "batch": 4},
    "AddContentControlCheckBox": {"kind": "write", "batch": 4},
    "AddContentControlDatePicker": {"kind": "write", "batch": 4},
    "AddContentControlList": {"kind": "write", "batch": 4},
    "AddContentControlPicture": {"kind": "write", "batch": 4},
    "GetAllContentControls": {"kind": "read", "batch": 4},
    "GetCurrentContentControl": {"kind": "read", "batch": 4},
    "GetCurrentContentControlPr": {"kind": "read", "batch": 4},
    "SelectContentControl": {"kind": "write", "batch": 4},
    "MoveCursorToContentControl": {"kind": "write", "batch": 4},
    "RemoveContentControl": {"kind": "write", "batch": 4},
    "RemoveContentControls": {"kind": "write", "batch": 4},
    "InsertAndReplaceContentControls": {"kind": "write", "batch": 4},
    # Batch 5 — forms + add-in fields
    "GetAllForms": {"kind": "read", "batch": 5},
    "GetFormsByTag": {"kind": "read", "batch": 5},
    "GetFormValue": {"kind": "read", "batch": 5},
    "SetFormValue": {"kind": "write", "batch": 5},
    "IsFillingFormMode": {"kind": "read", "batch": 5},
    "IsFillingOFormMode": {"kind": "read", "batch": 5},
    "IsEditingOFormMode": {"kind": "read", "batch": 5},
    "IsFormSigned": {"kind": "read", "batch": 5},
    "GetAllAddinFields": {"kind": "read", "batch": 5},
    "GetCurrentAddinField": {"kind": "read", "batch": 5},
    "AddAddinField": {"kind": "write", "batch": 5},
    "RemoveAddinField": {"kind": "write", "batch": 5},
    "SelectAddinField": {"kind": "write", "batch": 5},
    "UpdateAddinFields": {"kind": "write", "batch": 5},
    "GetFields": {"kind": "read", "batch": 5},
    "MoveCursorToField": {"kind": "write", "batch": 5},
    "MoveCursorOutsideField": {"kind": "write", "batch": 5},
    # Batch 6 — OLE objects + images
    "AddOleObject": {"kind": "write", "batch": 6},
    "ChangeOleObject": {"kind": "write", "batch": 6},
    "ChangeOleObjects": {"kind": "write", "batch": 6},
    "EditOleObject": {"kind": "write", "batch": 6},
    "GetAllOleObjects": {"kind": "read", "batch": 6},
    "GetSelectedOleObjects": {"kind": "read", "batch": 6},
    "InsertOleObject": {"kind": "write", "batch": 6},
    "RemoveOleObject": {"kind": "write", "batch": 6},
    "RemoveOleObjects": {"kind": "write", "batch": 6},
    "SelectOleObject": {"kind": "write", "batch": 6},
    "GetImageDataFromSelection": {"kind": "read", "batch": 6},
    "PutImageDataToSelection": {"kind": "write", "batch": 6},
    "GetPageImage": {"kind": "read", "batch": 6},
    # Batch 7 — custom UI (menus, windows, helpers)
    "AddContextMenuItem": {"kind": "write", "batch": 7},
    "UpdateContextMenuItem": {"kind": "write", "batch": 7},
    "AddToolbarMenuItem": {"kind": "write", "batch": 7},
    "UpdateToolbarMenuItem": {"kind": "write", "batch": 7},
    "ShowButton": {"kind": "write", "batch": 7},
    "ShowError": {"kind": "write", "batch": 7},
    "ShowInputHelper": {"kind": "write", "batch": 7},
    "UnShowInputHelper": {"kind": "write", "batch": 7},
    "FocusEditor": {"kind": "write", "batch": 7},
    "ActivateWindow": {"kind": "write", "batch": 7},
    # Batch 8 — slideshow (Slide)
    "StartSlideShow": {"kind": "write", "batch": 8},
    "EndSlideShow": {"kind": "write", "batch": 8},
    "PauseSlideShow": {"kind": "write", "batch": 8},
    "ResumeSlideShow": {"kind": "write", "batch": 8},
    "GoToSlide": {"kind": "write", "batch": 8},
    "GoToSlideInSlideShow": {"kind": "write", "batch": 8},
    "GoToNextSlideInSlideShow": {"kind": "write", "batch": 8},
    "GoToPreviousSlideInSlideShow": {"kind": "write", "batch": 8},
    # Batch 9 — document reads + misc (safe)
    "GetDocumentLang": {"kind": "read", "batch": 9},
    "GetVersion": {"kind": "read", "batch": 9},
    "GetFontList": {"kind": "read", "batch": 9},
    "GetSelectedContent": {"kind": "read", "batch": 9},
    "GetFileHTML": {"kind": "read", "batch": 9},
    "ConvertDocument": {"kind": "read", "batch": 9},
    "GetInstalledPlugins": {"kind": "read", "batch": 9},
    "SetProperties": {"kind": "write", "batch": 9},
    "SetEditingRestrictions": {"kind": "write", "batch": 9},
    "SetDisplayModeInReview": {"kind": "write", "batch": 9},
    "CoAuthoringChatSendMessage": {"kind": "write", "batch": 9},
    # DELIBERATELY EXCLUDED (dangerous — never allow-listed): InstallPlugin,
    # RemovePlugin, UpdatePlugin, GetMacros, SetMacros, GetVBAMacros,
    # GetCustomFunctions, SetCustomFunctions, GetKeychainStorageInfo,
    # SetKeychainStorageInfo, OnEncryption, OnSignWithKeychain, OpenFile,
    # GetFileToDownload, getLocalImagePath, SetPluginsOptions, SendToWindow.
}


def _live_method_max_batch() -> int:
    """Rollout gate for method batches. Env wins; else the marker file's integer
    (lets us bump batches without recreating the container); else 1."""
    v = os.environ.get("CLOUDGUARD_LIVE_METHOD_BATCH")
    if v:
        try:
            return int(v)
        except ValueError:
            pass
    try:
        with open(os.environ.get("CLOUDGUARD_LIVE_METHOD_BATCH_FILE", "/app/.cloudguard_live_method_batch")) as fh:
            return int(fh.read().strip())
    except Exception:  # noqa: BLE001
        return 1


def _live_method_allowed(name: str) -> bool:
    m = _LIVE_METHODS.get(name or "")
    return bool(m) and m["batch"] <= _live_method_max_batch()


def _live_key(cid: str, path: str) -> tuple[str, str]:
    return (cid, os.path.normpath(path or ""))


def _live_is_open(cid: str, path: str) -> bool:
    s = _LIVE_SESSIONS.get(_live_key(cid, path))
    return bool(s) and (time.time() - s["ts"] < _LIVE_TTL)


def _live_prune() -> None:
    now = time.time()
    for k, s in list(_LIVE_SESSIONS.items()):
        if now - s["ts"] >= _LIVE_TTL:
            _LIVE_SESSIONS.pop(k, None)
            _LIVE_QUEUE.pop(k, None)


class LiveRegister(BaseModel):
    conversationId: str = Field(..., max_length=128)
    filePath: str = Field(..., max_length=4096)
    editorId: str = Field(..., max_length=128)
    tab: str = Field(default="", max_length=64)


@router.post("/live/register")
async def live_register(body: LiveRegister, _p=Depends(require_principal)):
    """Frontend registers an OPEN editor (after onDocumentReady) so the agent can
    target it live. Refreshed by /live/heartbeat."""
    _live_prune()
    _LIVE_SESSIONS[_live_key(body.conversationId, body.filePath)] = {
        "editor_id": body.editorId,
        "tab": body.tab,
        "ts": time.time(),
    }
    return {"registered": True}


class LiveRef(BaseModel):
    conversationId: str = Field(..., max_length=128)
    filePath: str = Field(..., max_length=4096)


@router.post("/live/heartbeat")
async def live_heartbeat(body: LiveRef, _p=Depends(require_principal)):
    """Keep-alive — misses expire the session (TTL) so the router goes headless."""
    s = _LIVE_SESSIONS.get(_live_key(body.conversationId, body.filePath))
    if s is not None:
        s["ts"] = time.time()
        return {"alive": True}
    return {"alive": False}  # frontend should re-register


@router.get("/live/poll")
async def live_poll(
    conversation_id: str, path: str, _p=Depends(require_principal)
):
    """Frontend pulls pending live commands for its open editor + refreshes the
    heartbeat in the same call. Returns [] when idle."""
    key = _live_key(conversation_id, path)
    s = _LIVE_SESSIONS.get(key)
    if s is not None:
        s["ts"] = time.time()  # poll doubles as heartbeat
    cmds = _LIVE_QUEUE.pop(key, [])
    return {"commands": cmds}


class LiveAck(BaseModel):
    id: str = Field(..., max_length=64)
    ok: bool = True
    result: dict | None = None
    error: str | None = None


@router.post("/live/ack")
async def live_ack(body: LiveAck, _p=Depends(require_principal)):
    """Frontend reports a command's execution result; unblocks the waiting tool."""
    _LIVE_ACKS[body.id] = {"ok": body.ok, "result": body.result, "error": body.error}
    return {"received": True}


@router.post("/live/deregister")
async def live_deregister(body: LiveRef, _p=Depends(require_principal)):
    key = _live_key(body.conversationId, body.filePath)
    _LIVE_SESSIONS.pop(key, None)
    _LIVE_QUEUE.pop(key, None)
    return {"deregistered": True}


async def live_send(
    cid: str, path: str, op: str, args: dict, timeout: float = 3.0
) -> dict:
    """Send a live command to an open editor and await its ack. Returns
    {"live": True, "ok": ..., "result"/"error": ...} when it reached the editor,
    or {"live": False, "reason": ...} so the caller falls back to Layer 1.

    Never raises for the not-live case — falling back is the normal path."""
    # `method` op → executeMethod(name,…): enforce the allow-list before it can reach
    # the editor. `macro`/highlight/comment/select are fixed server-defined ops.
    if op == "method" and not _live_method_allowed((args or {}).get("name", "")):
        return {"live": False, "reason": f"method not allowed: {(args or {}).get('name')}"}
    if not _live_is_open(cid, path):
        return {"live": False, "reason": "editor not open"}
    key = _live_key(cid, path)
    cmd_id = _uuid.uuid4().hex
    seq = _LIVE_SEQ.get(key, 0) + 1
    _LIVE_SEQ[key] = seq
    envelope = {
        "v": _LIVE_PROTO_V,
        "id": cmd_id,
        "seq": seq,
        "op": op,
        "args": args,
        "ts": time.time(),
        "deadline_ms": int(timeout * 1000),
    }
    q = _LIVE_QUEUE.setdefault(key, [])
    q.append(envelope)
    if len(q) > _LIVE_MAX_QUEUE:  # drop-oldest backpressure
        del q[: len(q) - _LIVE_MAX_QUEUE]
    _live_publish_wake(cid, path)  # sub-second: wake any open SSE stream for this shard
    deadline = time.time() + timeout
    while time.time() < deadline:
        ack = _LIVE_ACKS.pop(cmd_id, None)
        if ack is not None:
            return {"live": True, **ack}
        await _asyncio.sleep(0.05)
    # timed out — the tab likely closed mid-flight; drop the command so it can't
    # redeliver after the caller has already fallen back to headless.
    try:
        _LIVE_QUEUE.get(key, []).remove(envelope)
    except ValueError:
        pass
    return {"live": False, "reason": "timeout"}


@router.get("/live/status")
async def live_status(_p=Depends(require_principal)):
    """Observability: current open editors + queue depths."""
    _live_prune()
    now = time.time()
    return {
        "sessions": [
            {
                "conversation": k[0],
                "path": k[1],
                "tab": s["tab"],
                "age_s": round(now - s["ts"], 1),
                "queued": len(_LIVE_QUEUE.get(k, [])),
            }
            for k, s in _LIVE_SESSIONS.items()
        ]
    }


# ── M1: plugin-pull live bridge (Community-legal "connector" via a DS plugin) ──
# M0 proved Community DS won't deliver a parent->plugin PUSH, but a custom plugin
# CAN pull commands from us and drive the editor. The editor loads our ID-Live
# plugin with ?ctx=<signed>&api=<app-origin>; ctx binds it to a (cid, path) shard.
# The plugin polls plugin-poll for that shard's queue and plugin-acks results,
# reusing the SAME _LIVE_QUEUE / _LIVE_ACKS as the agent's office_live tool.
_LIVE_PLUGIN_GUID = "asc.{1D11FED0-C0DE-4A11-BE57-1EFE9CED0001}"


def _live_enabled() -> bool:
    if os.environ.get("CLOUDGUARD_LIVE_ENABLED", "0").lower() in ("1", "true", "yes", "on"):
        return True
    # marker file lets us toggle without recreating the container (ops/testing)
    return os.path.exists(
        os.environ.get("CLOUDGUARD_LIVE_FLAG_FILE", "/app/.cloudguard_live_enabled")
    )


def _live_app_origin() -> str:
    """Browser-facing app origin the plugin polls (localhost:3000 by default)."""
    return os.environ.get("CLOUDGUARD_LIVE_APP_ORIGIN", "http://localhost:3000").rstrip("/")


def _live_ctx_sign(cid: str, path: str, exp: int) -> str:
    msg = f"live\n{cid}\n{path}\n{exp}".encode()
    return hmac.new(_jwt_secret().encode(), msg, hashlib.sha256).hexdigest()


def _live_ctx(cid: str, path: str, ttl_seconds: int = 8 * 3600) -> str:
    """Opaque signed token binding an editor to its (cid, path) shard."""
    exp = int(time.time()) + ttl_seconds
    b64 = base64.urlsafe_b64encode(f"{cid}|{path}|{exp}".encode()).decode().rstrip("=")
    return f"{b64}.{_live_ctx_sign(cid, path, exp)}"


def _live_ctx_verify(ctx: str) -> tuple[str, str]:
    """Return (cid, path) for a valid, unexpired ctx, else raise 403."""
    try:
        b64, _, sig = (ctx or "").partition(".")
        pad = "=" * (-len(b64) % 4)
        cid, path, exp_s = base64.urlsafe_b64decode(b64 + pad).decode().split("|", 2)
        exp = int(exp_s)
    except Exception:
        raise HTTPException(status_code=403, detail="bad live ctx")
    if not hmac.compare_digest(sig, _live_ctx_sign(cid, path, exp)):
        raise HTTPException(status_code=403, detail="bad live ctx signature")
    if time.time() > exp:
        raise HTTPException(status_code=403, detail="live ctx expired")
    return cid, path


def _live_plugin_config_json(ctx: str) -> dict:
    """ONLYOFFICE plugin manifest. The plugin is served ENTIRELY by the app (this
    keeps the plugin's own origin == the poll target, and lets the editor resolve
    the plugin URL relative to this manifest — an absolute cross-origin URL gets
    mangled by the editor's `base + url` concatenation). `url` is RELATIVE to the
    manifest path (/api/onlyoffice/live/) and carries the shard ctx; the trailing
    `&_=1` keeps ctx clean when the editor appends its own `?lang=...`."""
    return {
        "name": "Inference Defense Live",
        "guid": _LIVE_PLUGIN_GUID,
        "version": "1.0.0",
        "variations": [
            {
                "description": "Agent live copilot bridge.",
                "url": f"plugin-index?ctx={quote(ctx)}&_=1",
                "icons": [],
                "isViewer": True,
                "isDisplayedInViewer": True,
                "EditorsSupport": ["word", "cell", "slide", "pdf"],
                "isVisual": True,
                "isModal": False,
                "isInsideMode": True,
                "isSystem": False,
                "initDataType": "none",
                "initData": "",
                "size": [300, 180],
                "buttons": [],
            }
        ],
    }


# The plugin, served by the app. It reads its shard ctx from its own URL and polls
# THIS app (window.location.origin) — no cross-origin api param needed. The
# ONLYOFFICE plugin SDK is loaded from the DS (absolute), which is where it lives.
def _id_live_index_html() -> str:
    sdk = f"{_document_server_url()}/sdkjs-plugins/v1/plugins.js"
    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8'/>"
        "<title>Inference Defense Live</title>"
        "<style>body{font:12px system-ui;margin:0;padding:8px}"
        "#s{font-family:monospace;font-size:11px;color:#333;white-space:pre-wrap}</style>"
        f"<script src='{sdk}'></script>"
        "<script src='plugin-code'></script>"
        "</head><body><b>Inference Defense Live</b><div id='s'>loading…</div></body></html>"
    )


_ID_LIVE_CODE_JS = r"""
(function (w) {
  "use strict";
  function qs(n){try{var m=new RegExp("[?&]"+n+"=([^&]+)").exec(w.location.search);return m?decodeURIComponent(m[1]):"";}catch(e){return "";}}
  var CTX = qs("ctx");
  var API = w.location.origin;               // plugin is app-served: our origin IS the app
  var POLL = API + "/api/onlyoffice/live/plugin-poll?ctx=" + encodeURIComponent(CTX);
  var ACK  = API + "/api/onlyoffice/live/plugin-ack?ctx=" + encodeURIComponent(CTX);
  function setS(m){try{var e=document.getElementById("s");if(e)e.textContent=String(m);}catch(x){}}
  function ack(id,ok,err){try{new Image().src=ACK+"&id="+encodeURIComponent(id)+"&ok="+(ok?1:0)+(err?"&error="+encodeURIComponent(err):"")+"&_="+Date.now();}catch(x){}}
  function highlight(range,rgb,done){rgb=(rgb&&rgb.length===3)?rgb:[244,204,204];w.Asc.scope.__id={range:range,rgb:rgb};
    w.Asc.plugin.callCommand(function(){var s=Api.GetActiveSheet();var c=Asc.scope.__id;s.GetRange(c.range).SetFillColor(Api.CreateColorFromRGB(c.rgb[0],c.rgb[1],c.rgb[2]));},false,true,function(){done&&done();});}
  function exec(cmd){setS("executing "+cmd.op);try{
    if(cmd.op==="highlight"){highlight((cmd.args||{}).range||"A1",(cmd.args||{}).rgb,function(){ack(cmd.id,true);});}
    else if(cmd.op==="comment"){w.Asc.plugin.executeMethod("AddComment",[{Text:String((cmd.args||{}).text||""),UserName:"Inference Defense"}],function(){ack(cmd.id,true);});}
    else if(cmd.op==="select"){w.Asc.plugin.executeMethod("SetSelection",[String((cmd.args||{}).cell||"A1")],function(){ack(cmd.id,true);});}
    else{ack(cmd.id,false,"unknown op");}
  }catch(e){ack(cmd.id,false,String(e));}}
  var busy=false;
  function poll(){if(busy||!CTX)return;busy=true;
    fetch(POLL+"&_="+Date.now(),{cache:"no-store"}).then(function(r){return r.json();})
      .then(function(d){((d&&d.commands)||[]).forEach(exec);}).catch(function(){}).then(function(){busy=false;});}
  w.Asc.plugin.init=function(){if(!CTX){setS("no ctx — idle");return;}setS("ID-Live ready — watching for agent actions");w.setInterval(poll,1000);poll();};
  w.Asc.plugin.button=function(){};
})(window);
"""


def _cors_json(payload: str) -> Response:
    r = Response(content=payload, media_type="application/json")
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Cache-Control"] = "no-store"
    return r


@router.get("/live/plugin-config")
async def live_plugin_config(ctx: str):
    """Public (ctx-signed): serve the ID-Live plugin manifest to the editor."""
    import json as _json

    _live_ctx_verify(ctx)  # reject tampered/expired ctx early
    return _cors_json(_json.dumps(_live_plugin_config_json(ctx)))


@router.get("/live/plugin-index")
async def live_plugin_index(ctx: str = ""):
    """Public: the plugin's HTML shell (reads ctx from its own URL client-side)."""
    r = Response(content=_id_live_index_html(), media_type="text/html")
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Cache-Control"] = "no-store"
    return r


@router.get("/live/plugin-code")
async def live_plugin_code():
    """Public: the plugin's executor JS."""
    r = Response(content=_ID_LIVE_CODE_JS, media_type="application/javascript")
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Cache-Control"] = "no-store"
    return r


def _live_verify_shard(cid: str, path: str, sig: str) -> None:
    """Authorize a plugin request. The plugin reads (cid, path, sig) from the
    editor's signed documentCallbackUrl; sig is the existing _callback_sig, so a
    valid one proves the caller is a legitimately-configured editor for that shard."""
    if not hmac.compare_digest(sig or "", _callback_sig(cid, path)):
        raise HTTPException(status_code=403, detail="bad shard signature")


@router.get("/live/plugin-poll")
async def live_plugin_poll(cid: str, path: str, sig: str, conn: str = "", seat: str = "edit"):
    """Public (shard-signed): the plugin pulls its shard's queued commands and keeps
    the session marked open so office_live routes live instead of headless. Also
    records M3 Redis presence/seat for this connection."""
    import json as _json

    _live_verify_shard(cid, path, sig)
    key = _live_key(cid, path)
    _LIVE_SESSIONS[key] = {"editor_id": conn or "plugin", "tab": "", "ts": time.time()}
    presence = _live_presence_touch(cid, path, conn, seat)  # M3: Redis presence + seat cap
    # M2: at-least-once — return the queue WITHOUT popping. Commands leave only on
    # ack (below) or send-timeout. The plugin dedups by id, so redelivery after a
    # dropped response is safe.
    cmds = list(_LIVE_QUEUE.get(key, []))
    return _cors_json(_json.dumps({"commands": cmds, "presence": presence}))


def _live_record_ack(cid: str, path: str, id: str, ok: bool, result, error: str) -> None:
    key = _live_key(cid, path)
    q = _LIVE_QUEUE.get(key)
    if q:
        _LIVE_QUEUE[key] = [e for e in q if e.get("id") != id]
    _LIVE_ACKS[id] = {"ok": bool(ok), "result": result, "error": (error or None)}


@router.get("/live/plugin-stream")
async def live_plugin_stream(cid: str, path: str, sig: str, conn: str = "", seat: str = "edit"):
    """Public (shard-signed): SSE push for sub-second delivery. Holds the connection,
    subscribes to the shard's Redis wake channel, and emits `event: cmd` frames the
    instant office_live enqueues. The plugin keeps its 1 s poll as a fallback and
    dedups by id, so SSE + poll never double-execute. No Redis → 200 ms fast-check."""
    import json as _json

    _live_verify_shard(cid, path, sig)
    key = _live_key(cid, path)

    async def gen():
        r = _redis()
        ps = None
        if r:
            try:
                ps = r.pubsub(ignore_subscribe_messages=True)
                ps.subscribe(f"cg:live:evt:{_live_shard(cid, path)}")
            except Exception:  # noqa: BLE001
                ps = None
        _LIVE_SESSIONS[key] = {"editor_id": conn or "plugin", "tab": "", "ts": time.time()}
        _live_presence_touch(cid, path, conn, seat)
        yield ": connected\n\n"
        sent: set[str] = set()
        last_ka = time.time()
        try:
            while True:
                for e in list(_LIVE_QUEUE.get(key, [])):
                    eid = e.get("id")
                    if eid and eid not in sent:
                        sent.add(eid)
                        yield f"event: cmd\ndata: {_json.dumps(e)}\n\n"
                s = _LIVE_SESSIONS.get(key)
                if s is not None:
                    s["ts"] = time.time()  # stream doubles as heartbeat
                _live_presence_touch(cid, path, conn, seat)
                woke = False
                if ps:
                    try:
                        msg = await _asyncio.to_thread(ps.get_message, timeout=1.0)
                        woke = bool(msg)
                    except Exception:  # noqa: BLE001
                        await _asyncio.sleep(0.2)
                else:
                    await _asyncio.sleep(0.2)  # no redis → fast server-side check
                if not woke and time.time() - last_ka > 15:
                    yield ": ka\n\n"
                    last_ka = time.time()
        finally:
            try:
                if ps:
                    ps.close()
            except Exception:  # noqa: BLE001
                pass

    resp = StreamingResponse(gen(), media_type="text/event-stream")
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"  # don't let a proxy buffer the stream
    return resp


@router.get("/live/plugin-ack")
async def live_plugin_ack(cid: str, path: str, sig: str, id: str, ok: int = 1, error: str = ""):
    """Public (shard-signed): simple ack (no result) — removes the command from the
    queue and unblocks office_live's live_send."""
    _live_verify_shard(cid, path, sig)
    _live_record_ack(cid, path, id, bool(ok), None, error)
    return _cors_json('{"received":true}')


@router.post("/live/plugin-ack")
async def live_plugin_ack_post(cid: str, path: str, sig: str, request: Request):
    """Public (shard-signed): ack WITH a result payload (for `method` read ops). The
    plugin POSTs text/plain JSON {id,ok,error,result} (text/plain = no CORS preflight)."""
    import json as _json

    _live_verify_shard(cid, path, sig)
    try:
        data = _json.loads((await request.body()) or b"{}")
    except Exception:  # noqa: BLE001
        data = {}
    _live_record_ack(
        cid, path, str(data.get("id", "")), bool(data.get("ok", 1)),
        data.get("result"), str(data.get("error") or ""),
    )
    return _cors_json('{"received":true}')


# ── DEV/TEST helpers (only when the live flag is on) — manual UI testing without
# running an agent. NOT a production surface; office_live (authed) is the real path.
@router.get("/live/dev-status")
async def live_dev_status():
    if not _live_enabled():
        raise HTTPException(status_code=404, detail="not enabled")
    _live_prune()
    now = time.time()
    return {
        "redis": _redis() is not None,
        "open": [
            {"cid": k[0], "path": k[1], "age_s": round(now - s["ts"], 1),
             "via": s.get("editor_id"), "queued": len(_LIVE_QUEUE.get(k, [])),
             "presence": _live_presence(k[0], k[1])}
            for k, s in _LIVE_SESSIONS.items()
        ]
    }


@router.get("/live/dev-enqueue")
async def live_dev_enqueue(cid: str, path: str, op: str = "highlight",
                           range: str = "A2:D8", rgb: str = "255,0,0",
                           text: str = "flagged by agent", cell: str = "A1",
                           name: str = "", params: str = ""):
    if not _live_enabled():
        raise HTTPException(status_code=404, detail="not enabled")
    import json as _json

    if op == "highlight":
        args = {"range": range, "rgb": [int(x) for x in rgb.split(",")][:3]}
    elif op == "comment":
        args = {"text": text}
    elif op == "select":
        args = {"cell": cell}
    elif op == "method":
        try:
            parsed = _json.loads(params) if params else []
        except Exception:  # noqa: BLE001
            parsed = []
        args = {"name": name, "params": parsed}
    else:
        args = {}
    res = await live_send(cid, path, op, args, timeout=6.0)
    return res


@router.get("/dev-harness", response_class=Response)
async def dev_harness(cid: str, path: str):
    """Dev-only same-origin editor harness (served by the app → reachable through the
    gateway at its origin). Lets us drive the REAL editor headless to debug save-back
    without the browser dance. Gated by live-enabled."""
    if not _live_enabled():
        raise HTTPException(status_code=404, detail="not enabled")
    import json as _json

    html = (
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>harness</title>"
        "<style>#log{position:fixed;right:0;top:0;width:40vw;height:100vh;overflow:auto;"
        "background:#111;color:#0f0;font:11px monospace;white-space:pre-wrap;padding:6px;z-index:9}</style>"
        "</head><body><div id='editor'></div><div id='log'></div><script>"
        "var CID=" + _json.dumps(cid) + ",P=" + _json.dumps(path) + ";window.__ready=false;window.__err=null;"
        "function log(m){var d=document.createElement('div');d.textContent=m;document.getElementById('log').appendChild(d);}"
        "(async function(){"
        "var r=await fetch('/api/onlyoffice/token',{method:'POST',headers:{'Content-Type':'application/json'},"
        "body:JSON.stringify({conversationId:CID,filePath:P,fileName:P.split('/').pop(),fileType:P.split('.').pop(),mode:'edit'})});"
        "var t=await r.json();log('token dsUrl='+t.documentServerUrl);"
        "await new Promise(function(res,rej){var s=document.createElement('script');"
        "s.src=t.documentServerUrl+'/web-apps/apps/api/documents/api.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});"
        "log('DocsAPI loaded');var cfg=Object.assign({},t.config,{token:t.token,width:'100%',height:'100%'});"
        "cfg.events={onDocumentReady:function(){log('onDocumentReady');window.__ready=true;},"
        "onError:function(e){log('EDITOR ERROR '+JSON.stringify(e&&e.data));window.__err=JSON.stringify(e&&e.data);}};"
        "window.docEditor=new DocsAPI.DocEditor('editor',cfg);"
        "})().catch(function(e){log('HARNESS ERR '+e);window.__err=String(e);});"
        "</script></body></html>"
    )
    r = Response(content=html, media_type="text/html")
    r.headers["Cache-Control"] = "no-store"
    return r


@router.get("/live/dev-save")
async def live_dev_save(cid: str, path: str):
    if not _live_enabled():
        raise HTTPException(status_code=404, detail="not enabled")
    return await _live_forcesave(cid, path)


@router.get("/live/methods")
async def live_methods():
    """Observability: the enabled automation-method allow-list (current batch)."""
    if not _live_enabled():
        raise HTTPException(status_code=404, detail="not enabled")
    return {
        "max_batch": _live_method_max_batch(),
        "enabled": sorted(n for n in _LIVE_METHODS if _live_method_allowed(n)),
        "registered": {n: m for n, m in _LIVE_METHODS.items()},
    }


@router.get("/script")
async def serve_script(id: str, exp: int, sig: str) -> Response:
    """Serve a docbuilder script to the ONLYOFFICE container (HMAC-signed, no session)."""
    now = int(time.time())
    if exp < now:
        raise HTTPException(status_code=403, detail="link expired")
    if not hmac.compare_digest(sig, _script_sig(id, exp)):
        raise HTTPException(status_code=403, detail="bad signature")
    entry = _SCRIPT_STORE.get(id)
    if entry is None or entry[1] < now:
        _SCRIPT_STORE.pop(id, None)
        raise HTTPException(status_code=404, detail="script not found")
    return Response(content=entry[0], media_type="application/javascript")


async def _docbuilder_build(script: str, timeout: float = 60.0) -> bytes:
    """Run an Office JS builder script headlessly on the DS; return the result bytes.

    The script MUST call builder.SaveFile(...) — the DS returns that file's cache
    URL, which we download (rewriting the public host to the DS-internal host so
    the app can reach it)."""
    script_url = _host_script(script)
    token = jwt.encode(
        {"payload": {"async": False, "url": script_url}},
        _jwt_secret(),
        algorithm="HS256",
    )
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{_ds_internal()}/docbuilder",
            json={"async": False, "url": script_url},
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("error"):
            raise RuntimeError(f"docbuilder error {data.get('error')}")
        file_url = data.get("fileUrl") or (data.get("urls") or {}).get("output")
        if not file_url:
            raise RuntimeError(f"docbuilder returned no fileUrl: {data}")
        # The DS emits its PUBLIC host (localhost); swap to the internal host so the
        # app can fetch it.
        internal = file_url
        for pub in (_document_server_url(), "http://localhost", "https://localhost"):
            if pub and internal.startswith(pub):
                internal = _ds_internal() + internal[len(pub) :]
                break
        fr = await client.get(internal)
        fr.raise_for_status()
        return fr.content


# File types we can seed with a minimal valid template when a scratch surface
# opens a path that doesn't exist yet. Text types are trivial; docx/xlsx are built
# in-memory as minimal-but-valid OOXML so ONLYOFFICE opens a clean blank document.
_SEEDABLE_TEXT = {"csv", "txt"}
_SEEDABLE_OOXML = {"docx", "xlsx"}

_NS_CT = "http://schemas.openxmlformats.org/package/2006/content-types"
_NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
_NS_OFFICE_DOC = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
)


def _blank_ooxml(ext: str) -> bytes | None:
    """A guaranteed-valid empty .docx / .xlsx, generated with python-docx /
    openpyxl (standard OOXML that ONLYOFFICE opens identically). This replaces an
    earlier hand-rolled minimal package, which the Document Server could reject."""
    import io

    if ext == "docx":
        import docx

        buf = io.BytesIO()
        docx.Document().save(buf)
        return buf.getvalue()
    if ext == "xlsx":
        import openpyxl

        buf = io.BytesIO()
        openpyxl.Workbook().save(buf)
        return buf.getvalue()
    return None


async def _ensure_seed_file(cid: str, path: str, ext: str) -> None:
    """Create `path` with minimal valid content if it doesn't exist (text +
    docx/xlsx). Best-effort — never blocks token issuance."""
    if ext not in _SEEDABLE_TEXT and ext not in _SEEDABLE_OOXML:
        return
    norm = os.path.normpath(path)
    if norm.startswith("..") or os.path.isabs(norm) or ".." in norm.split(os.sep):
        return

    from openhands.server.shared import conversation_manager

    conv = None
    try:
        conv = await conversation_manager.attach_to_conversation(cid, None)
        if conv is None:
            return
        runtime = conv.runtime
        cname = getattr(runtime, "container_name", None)
        if not cname:
            return
        full = os.path.join(runtime.config.workspace_mount_path_in_sandbox, norm)
        import docker as _docker

        c = _docker.from_env().containers.get(cname)
        code, _ = c.exec_run(["test", "-f", full])
        if code == 0:
            return  # already exists — nothing to seed
        if ext == "csv":
            content: bytes | None = b"\n"  # opens as a clean empty grid
        elif ext == "txt":
            content = b""
        else:
            content = _blank_ooxml(ext)  # docx / xlsx
        if content is None:
            return
        parent = os.path.dirname(full)
        if parent:
            c.exec_run(["mkdir", "-p", parent])
        _write_sandbox_file(runtime, full, content)
        logger.info("onlyoffice: seeded missing scratch file %s (cid=%s)", norm, cid)
    except Exception as exc:  # noqa: BLE001 — seeding is best-effort
        logger.warning("onlyoffice seed failed for %s: %s", path, exc)
    finally:
        if conv is not None:
            try:
                await conversation_manager.detach_from_conversation(conv)
            except Exception:  # noqa: BLE001
                pass


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
        # A scratch surface (e.g. the Canvas Sheet) opens a FIXED workspace path
        # that may not exist yet on a fresh conversation. Without the file, the
        # Document Server's download fails with "Download failed". Seed a minimal
        # valid file for text types so the editor opens a blank sheet instead.
        await _ensure_seed_file(body.conversationId, body.filePath, ext)
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

    # M1: attach the ID-Live plugin so the agent can drive THIS editor live (pull
    # model). Only when live is enabled and we know the (cid, path) shard to bind.
    if _live_enabled() and body.conversationId and body.filePath:
        _LIVE_DOCKEY[_live_shard(body.conversationId, body.filePath)] = doc_key  # for forcesave
        config["editorConfig"]["plugins"] = {
            "autostart": [_LIVE_PLUGIN_GUID],
            "pluginsData": [
                f"{_document_server_url()}/sdkjs-plugins/id-live-v2/config.json"
            ],
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
        from cloudguard.vfs import VFSDenied, VFSInvalidPath

        try:
            from openhands.server.routes.cloudguard_vfs import surface_write

            entry = await surface_write(
                cid, norm, content, mime=_content_type_for(norm), actor="onlyoffice"
            )
            if not entry.durable:
                # SRE-1b: the backing driver was down, so the save is DURABLY
                # SPOOLED (survives restart on the app-private volume) and the
                # background drainer will land it — but it is not yet on the file.
                # Flag it: a reopen before the drain serves read-your-writes buffer
                # content (surface_read), so the user never sees a stale doc.
                logger.warning(
                    "onlyoffice save-back BUFFERED (driver down) %d bytes → %s "
                    "(cid=%s hash=%s) — spooled + will drain",
                    len(content),
                    norm,
                    cid,
                    entry.content_hash,
                )
            else:
                logger.info(
                    "onlyoffice save-back via VFS: %d bytes → %s (cid=%s hash=%s)",
                    len(content),
                    norm,
                    cid,
                    entry.content_hash,
                )
            return
        except (VFSDenied, VFSInvalidPath) as sec:
            # CISO-1: an authoritative VFS security decision. Falling back to a raw
            # write would DEFEAT the policy/path gate — so we honor the rejection
            # and do NOT write. The caller (callback) returns error:0 regardless;
            # the edit is intentionally not persisted.
            logger.warning(
                "onlyoffice save-back REJECTED by VFS (%s) for %s — not falling back",
                sec,
                norm,
            )
            raise
        except Exception as exc:  # noqa: BLE001 — transport/infra only: degrade, never lose the edit
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

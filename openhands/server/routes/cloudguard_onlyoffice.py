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
    import io

    import openpyxl
    from openpyxl.styles import Font, PatternFill

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name[:31] or "Findings"
    headers = ["Severity", "Title", "Resource", "Control", "Status"]
    ws.append(headers)
    for col in range(1, len(headers) + 1):
        c = ws.cell(1, col)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F2E46")
    sev_fill = {"CRITICAL": "B4202A", "HIGH": "F85149", "MEDIUM": "D9A020", "LOW": "3FB950"}
    for f in findings:
        ws.append([
            f.get("severity", ""), f.get("title", ""), f.get("resource", ""),
            f.get("control", ""), f.get("status", "open"),
        ])
        if color:
            fill = sev_fill.get(str(f.get("severity", "")).upper())
            if fill:
                ws.cell(ws.max_row, 1).fill = PatternFill("solid", fgColor=fill)
                ws.cell(ws.max_row, 1).font = Font(bold=True, color="FFFFFF")
    for i, w in enumerate((12, 46, 34, 12, 10), 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _gen_report_docx(title: str, blocks: list[dict]) -> bytes:
    import io

    import docx

    d = docx.Document()
    if title:
        d.add_heading(title, 0)
    for b in blocks:
        kind = b.get("type")
        if kind == "heading":
            d.add_heading(b.get("text", ""), int(b.get("level", 1)))
        elif kind == "paragraph":
            d.add_paragraph(b.get("text", ""))
        elif kind == "bullet":
            for item in b.get("items", []):
                d.add_paragraph(str(item), style="List Bullet")
        elif kind == "table":
            rows = b.get("rows", [])
            if rows:
                t = d.add_table(rows=len(rows), cols=len(rows[0]))
                t.style = "Light Grid Accent 1"
                for ri, row in enumerate(rows):
                    for ci, val in enumerate(row):
                        t.cell(ri, ci).text = str(val)
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


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
    the agent knows to fall back (the file isn't open / the tab went away)."""
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
    if not _live_is_open(cid, path):
        return {"live": False, "reason": "editor not open"}
    key = _live_key(cid, path)
    cmd_id = _uuid.uuid4().hex
    envelope = {"id": cmd_id, "op": op, "args": args, "ts": time.time()}
    q = _LIVE_QUEUE.setdefault(key, [])
    q.append(envelope)
    if len(q) > _LIVE_MAX_QUEUE:  # drop-oldest backpressure
        del q[: len(q) - _LIVE_MAX_QUEUE]
    deadline = time.time() + timeout
    while time.time() < deadline:
        ack = _LIVE_ACKS.pop(cmd_id, None)
        if ack is not None:
            return {"live": True, **ack}
        await _asyncio.sleep(0.05)
    # timed out — the tab likely closed mid-flight; drop the command + go headless
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

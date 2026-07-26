"""V5 flip: the shared /upload-files endpoint (whiteboard + spreadsheet + any file
upload) routes through the VFS when the flag is on, and falls back to the legacy
FileWriteAction when the VFS errors — never dropping an upload."""

from __future__ import annotations

import io
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from starlette.datastructures import UploadFile

from openhands.server.routes import files as files_route


def _conv():
    runtime = SimpleNamespace(
        config=SimpleNamespace(workspace_mount_path_in_sandbox="/workspace"),
        run_action=lambda action: None,
    )
    return SimpleNamespace(sid="cid-xyz", runtime=runtime)


def _upload(name: str, data: bytes, ctype: str) -> UploadFile:
    return UploadFile(filename=name, file=io.BytesIO(data), headers={"content-type": ctype})


@pytest.mark.asyncio
async def test_flag_off_uses_file_write_action(monkeypatch):
    monkeypatch.delenv("CLOUDGUARD_VFS_UPLOAD_WRITEBACK", raising=False)
    assert files_route._vfs_upload_enabled() is False

    sw = AsyncMock()
    with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
        with patch.object(files_route, "call_sync_from_async", AsyncMock()) as csa:
            resp = await files_route.upload_files(
                [_upload("pages/x.csv", b"a,b\n1,2\n", "text/csv")], _conv()
            )
    sw.assert_not_called()
    csa.assert_awaited_once()  # legacy path
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_flag_on_routes_through_vfs(monkeypatch):
    monkeypatch.setenv("CLOUDGUARD_VFS_UPLOAD_WRITEBACK", "1")
    assert files_route._vfs_upload_enabled() is True

    sw = AsyncMock(return_value=SimpleNamespace(content_hash="h"))
    with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
        with patch.object(files_route, "call_sync_from_async", AsyncMock()) as csa:
            await files_route.upload_files(
                [_upload("diagrams/wb.drawio.svg", b"<mxfile/>", "application/xml")],
                _conv(),
                user_id=None,
            )
    sw.assert_awaited_once()
    args, kwargs = sw.call_args
    # workspace-relative path + raw bytes + actor tag; legacy path NOT used
    assert args[0] == "cid-xyz" and args[1] == "diagrams/wb.drawio.svg"
    assert args[2] == b"<mxfile/>"
    assert kwargs["actor"] == "upload"
    csa.assert_not_awaited()


@pytest.mark.asyncio
async def test_flag_on_transport_error_falls_back(monkeypatch):
    """A transport/infra failure per-file must degrade to the legacy write."""
    monkeypatch.setenv("CLOUDGUARD_VFS_UPLOAD_WRITEBACK", "on")

    sw = AsyncMock(side_effect=RuntimeError("vfs down"))
    with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
        with patch.object(files_route, "call_sync_from_async", AsyncMock()) as csa:
            resp = await files_route.upload_files(
                [_upload("pages/y.csv", b"x", "text/csv")], _conv(), user_id=None
            )
    sw.assert_awaited_once()
    csa.assert_awaited_once()  # fell back
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_flag_on_vfs_rejection_skips_no_fallback(monkeypatch):
    """CISO-1: a VFS security rejection must be SKIPPED, never written via the
    legacy raw path (which has no traversal gate)."""
    import json

    from cloudguard.vfs import VFSInvalidPath

    monkeypatch.setenv("CLOUDGUARD_VFS_UPLOAD_WRITEBACK", "1")
    sw = AsyncMock(side_effect=VFSInvalidPath("traversal"))
    with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
        with patch.object(files_route, "call_sync_from_async", AsyncMock()) as csa:
            resp = await files_route.upload_files(
                [_upload("../../etc/passwd", b"x", "text/plain")], _conv(), user_id=None
            )
    csa.assert_not_awaited()  # NO raw fallback
    body = json.loads(resp.body)
    assert body["uploaded_files"] == []
    assert body["skipped_files"] and "vfs rejected" in body["skipped_files"][0]["reason"]


@pytest.mark.asyncio
async def test_principal_threaded_as_actor(monkeypatch):
    """CISO-2: the authenticated user id is used as the audit actor."""
    monkeypatch.setenv("CLOUDGUARD_VFS_UPLOAD_WRITEBACK", "1")
    sw = AsyncMock(return_value=SimpleNamespace(content_hash="h"))
    with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
        await files_route.upload_files(
            [_upload("pages/x.csv", b"a", "text/csv")], _conv(), user_id="alice"
        )
    assert sw.call_args.kwargs["actor"] == "user:alice"

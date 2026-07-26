"""V5 flip: ONLYOFFICE save-back routes through the VFS when the flag is on, and
falls back to the legacy direct write when the VFS errors — never dropping an edit."""

from __future__ import annotations

import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from openhands.server.routes import cloudguard_onlyoffice as oo


@pytest.mark.asyncio
async def test_flag_off_uses_direct_write(monkeypatch):
    monkeypatch.delenv("CLOUDGUARD_VFS_ONLYOFFICE_WRITEBACK", raising=False)
    assert oo._vfs_writeback_enabled() is False

    # flag off → must NOT call surface_write; must call the legacy direct writer
    fake_runtime = SimpleNamespace(
        container_name="c1",
        config=SimpleNamespace(workspace_mount_path_in_sandbox="/workspace"),
    )
    fake_conv = SimpleNamespace(runtime=fake_runtime)
    cm = SimpleNamespace(
        attach_to_conversation=AsyncMock(return_value=fake_conv),
        detach_from_conversation=AsyncMock(),
    )
    with patch.dict("sys.modules", {"openhands.server.shared": SimpleNamespace(conversation_manager=cm)}):
        with patch.object(oo, "_write_sandbox_file") as direct:
            with patch("openhands.server.routes.cloudguard_vfs.surface_write") as sw:
                await oo._save_to_sandbox("cid1", "reports/a.docx", b"hello")
    direct.assert_called_once()
    sw.assert_not_called()


@pytest.mark.asyncio
async def test_flag_on_routes_through_vfs(monkeypatch):
    monkeypatch.setenv("CLOUDGUARD_VFS_ONLYOFFICE_WRITEBACK", "1")
    assert oo._vfs_writeback_enabled() is True

    entry = SimpleNamespace(content_hash="abc123")
    sw = AsyncMock(return_value=entry)
    with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
        with patch.object(oo, "_write_sandbox_file") as direct:
            await oo._save_to_sandbox("cid1", "reports/a.docx", b"hello")
    sw.assert_awaited_once()
    # workspace-relative path passed through, actor tagged, direct write skipped
    args, kwargs = sw.call_args
    # path is os.path.normpath'd (sep is / on the Linux runtime, \ on Windows dev)
    assert args[0] == "cid1"
    assert args[1] == os.path.normpath("reports/a.docx")
    assert args[2] == b"hello"
    assert kwargs["actor"] == "onlyoffice"
    direct.assert_not_called()


@pytest.mark.asyncio
async def test_flag_on_vfs_error_falls_back_to_direct(monkeypatch):
    """A VFS failure must degrade to the direct write, never lose the edit."""
    monkeypatch.setenv("CLOUDGUARD_VFS_ONLYOFFICE_WRITEBACK", "on")

    sw = AsyncMock(side_effect=RuntimeError("vfs down"))
    fake_runtime = SimpleNamespace(
        container_name="c1",
        config=SimpleNamespace(workspace_mount_path_in_sandbox="/workspace"),
    )
    fake_conv = SimpleNamespace(runtime=fake_runtime)
    cm = SimpleNamespace(
        attach_to_conversation=AsyncMock(return_value=fake_conv),
        detach_from_conversation=AsyncMock(),
    )
    with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
        with patch.dict("sys.modules", {"openhands.server.shared": SimpleNamespace(conversation_manager=cm)}):
            with patch.object(oo, "_write_sandbox_file") as direct:
                await oo._save_to_sandbox("cid1", "reports/a.docx", b"hello")
    sw.assert_awaited_once()
    direct.assert_called_once()  # fell back


@pytest.mark.asyncio
async def test_traversal_rejected_regardless_of_flag(monkeypatch):
    monkeypatch.setenv("CLOUDGUARD_VFS_ONLYOFFICE_WRITEBACK", "1")
    with pytest.raises(ValueError):
        await oo._save_to_sandbox("cid1", "../../etc/passwd", b"x")


@pytest.mark.asyncio
async def test_vfs_rejection_does_not_fall_back(monkeypatch):
    """CISO-1: a VFS security rejection (denied/invalid) must NOT degrade to the
    raw direct write — that would defeat the policy/path gate."""
    from cloudguard.vfs import VFSDenied, VFSInvalidPath

    monkeypatch.setenv("CLOUDGUARD_VFS_ONLYOFFICE_WRITEBACK", "1")
    for exc in (VFSDenied("worm"), VFSInvalidPath("bad")):
        sw = AsyncMock(side_effect=exc)
        with patch("openhands.server.routes.cloudguard_vfs.surface_write", sw):
            with patch.object(oo, "_write_sandbox_file") as direct:
                with pytest.raises(type(exc)):
                    await oo._save_to_sandbox("cid1", "reports/a.docx", b"x")
        direct.assert_not_called()  # rejection honored, no raw write

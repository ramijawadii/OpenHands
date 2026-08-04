"""CloudGuard artifact discovery — lists the workspace's report-type files with
metadata (path, size, mtime, kind) so the Report tab can browse + filter by type
and date and open each in the right viewer.

Reads the file listing directly from the running runtime container via the docker
SDK (`find -printf`) — the same "read straight from the container" approach the
ONLYOFFICE file proxy and select-file-binary use, which avoids the runtime action
server (whose /download_files goes stale after an app restart).
"""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/artifacts")

# extension → report kind (drives the Report tab's filter + which viewer opens).
_KIND_BY_EXT: dict[str, str] = {
    "pdf": "pdf",
    "docx": "document", "doc": "document", "odt": "document", "rtf": "document",
    "xlsx": "sheet", "xls": "sheet", "ods": "sheet", "csv": "sheet",
    "md": "markdown", "markdown": "markdown",
    "drawio": "diagram", "dio": "diagram", "xml": "diagram",
}


def _kind(path: str) -> str | None:
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    return _KIND_BY_EXT.get(ext)


@router.get("")
async def list_artifacts(conversation_id: str):
    """Return report-type workspace files as [{path, size, mtime, kind}].

    `path` is workspace-relative; `mtime` is epoch seconds (float). Non-report
    files and dotfiles are filtered out. conversation_id is a query param; the
    runtime is resolved via attach_to_conversation (same as the ONLYOFFICE proxy).
    """
    # Local import so a missing server dep never breaks module import / server start.
    from openhands.server.shared import conversation_manager

    conversation = None
    text = ""
    try:
        conversation = await conversation_manager.attach_to_conversation(
            conversation_id, None
        )
        if conversation is None:
            return {"artifacts": []}
        runtime = conversation.runtime
        root = runtime.config.workspace_mount_path_in_sandbox
        container_name = getattr(runtime, "container_name", None)
        if not container_name:
            return {"artifacts": []}

        import docker as _docker

        client = _docker.from_env()
        container = client.containers.get(container_name)
        # tab-separated: mtime(epoch) \t size(bytes) \t abs-path
        # SECURITY (SB zero-trust): only surface USER artifacts. Prune the baked SYSTEM/IP dirs — the
        # runtime skills/skills_graph, build scripts, and report-template scaffold are our IP and must
        # never appear in the analyst-facing Report tab (a `.md` under any of them is a leak). Dotdirs
        # (.git/.openhands) are already excluded by the -path filter below.
        _prune: list[str] = []
        for _d in ("cloudguard-runtime", "scripts", "templates", ".git", ".openhands", "node_modules"):
            _prune += ["-path", f"*/{_d}/*", "-o"]
        exit_code, output = container.exec_run(
            [
                "find", root,
                "(", *_prune, "-path", "*/.*", ")", "-prune",
                "-o",
                "-type", "f", "-printf", "%T@\t%s\t%p\n",
            ],
            demux=False,
        )
        if exit_code != 0:
            return {"artifacts": []}
        text = output.decode("utf-8", "replace") if output else ""
    except Exception as exc:  # noqa: BLE001 — never break the tab on a listing error
        logger.warning("artifacts listing failed: %s", exc)
        return {"artifacts": []}
    finally:
        if conversation is not None:
            try:
                await conversation_manager.detach_from_conversation(conversation)
            except Exception:  # noqa: BLE001
                pass

    artifacts = []
    prefix = root.rstrip("/") + "/"
    for line in text.splitlines():
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        mtime_s, size_s, abspath = parts
        rel = abspath[len(prefix):] if abspath.startswith(prefix) else abspath
        kind = _kind(rel)
        if kind is None:
            continue
        try:
            artifacts.append(
                {
                    "path": rel,
                    "size": int(size_s),
                    "mtime": float(mtime_s),
                    "kind": kind,
                }
            )
        except ValueError:
            continue

    artifacts.sort(key=lambda a: a["mtime"], reverse=True)
    return {"artifacts": artifacts}

"""CloudGuard approval + clarification routes, mounted on the OpenHands app server.

These run in the APP process (where CLOUDGUARD_APPROVAL_HMAC_KEY lives — NOT the
agent sandbox), so the decisions they sign cannot be forged by the agent. The chat
banner is a thin same-origin client over these endpoints:

  GET  /api/cloudguard/approvals?status=pending      → list (context has summary/path/diff)
  GET  /api/cloudguard/approvals/{rid}               → one request
  POST /api/cloudguard/approvals/{rid}/decision      → Approve/Reject/Other (signs the decision)
  GET  /api/cloudguard/clarifications?status=pending → list (questions)
  GET  /api/cloudguard/clarifications/{cid}          → one
  POST /api/cloudguard/clarifications/{cid}/answer   → record the user's answer

The stores are read from the env-configured dirs (CLOUDGUARD_APPROVAL_DIR /
CLOUDGUARD_CLARIFICATIONS_DIR) — a volume the app writes and the runtime reads.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from openhands.server.routes.cloudguard_principal import (
    gate_conversation,
    require_cap,
    require_principal,
)

app = APIRouter(prefix="/api/cloudguard")


class ApprovalDecision(BaseModel):
    approved: bool
    reviewer: str = Field(default="user", max_length=128)
    reason: str = Field(default="", max_length=4000)


class ClarificationAnswer(BaseModel):
    answers: list = Field(default_factory=list)


class ModeBody(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    mode: str = Field(default="autonomous", max_length=32)


class PlanDecisionBody(BaseModel):
    conversation_id: str = Field(default="", max_length=128)
    decision: str = Field(default="auto", max_length=32)  # auto | ask | changes


def _safe(import_name: str):
    """Import a cloudguard module; 503 if the package isn't on PYTHONPATH."""
    import importlib

    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _scope(records: list, conversation_id: str | None, id_getter) -> list:
    """Keep only records for this conversation. Records with no conversation id
    (legacy / unstamped) are kept for backward compatibility during rollout."""
    if not conversation_id:
        return records
    return [r for r in records if id_getter(r) in (conversation_id, "", None)]


# ── Approvals ─────────────────────────────────────────────────────────────────
@app.get("/approvals")
async def list_approvals(
    status: str | None = None,
    conversation_id: str | None = None,
    p=Depends(require_principal),
):
    gate_conversation(p, conversation_id)
    approval = _safe("cloudguard.approval")
    records = approval.list_requests(status)
    return {
        "approvals": _scope(
            records, conversation_id, lambda r: (r.get("context") or {}).get("conversation_id")
        )
    }


@app.get("/approvals/{rid}")
async def get_approval(rid: str, p=Depends(require_principal)):
    approval = _safe("cloudguard.approval")
    rec = approval.get_request(rid)
    if rec is None:
        raise HTTPException(status_code=404, detail="approval not found")
    gate_conversation(p, (rec.get("context") or {}).get("conversation_id"))
    return rec


@app.post("/approvals/{rid}/decision")
async def decide_approval(rid: str, body: ApprovalDecision, p=Depends(require_cap("remediate"))):
    """Approve / reject (Other = reject + a redirect reason). Signs the decision."""
    approval = _safe("cloudguard.approval")
    rec = approval.get_request(rid)
    if rec is None:
        raise HTTPException(status_code=404, detail="approval not found")
    gate_conversation(p, (rec.get("context") or {}).get("conversation_id"))
    ok = approval.decide(rid, approved=body.approved, reviewer=body.reviewer, reason=body.reason)
    if not ok:
        raise HTTPException(status_code=409, detail="approval not found or already decided")
    return approval.get_request(rid)


# ── Execution mode + plan-approval (conversation-scoped) ──────────────────────
@app.get("/mode")
async def get_mode_route(conversation_id: str | None = None, p=Depends(require_principal)):
    gate_conversation(p, conversation_id)
    modes = _safe("cloudguard.modes")
    return modes.get_record(conversation_id)


@app.post("/mode")
async def set_mode_route(body: ModeBody, p=Depends(require_cap("remediate"))):
    gate_conversation(p, body.conversation_id or None)
    modes = _safe("cloudguard.modes")
    return modes.set_mode(body.conversation_id or None, body.mode)


@app.post("/plan/decision")
async def decide_plan_route(body: PlanDecisionBody, p=Depends(require_cap("remediate"))):
    """The plan-approval banner posts here: auto -> autonomous, ask -> ask-before,
    changes -> stay in plan mode and re-plan. Returns the new mode record."""
    gate_conversation(p, body.conversation_id or None)
    modes = _safe("cloudguard.modes")
    return modes.decide_plan(body.conversation_id or None, body.decision)


# ── Tasks (Plane T — the single task plan, conversation-scoped) ───────────────
@app.get("/tasks")
async def list_tasks_route(conversation_id: str | None = None, p=Depends(require_principal)):
    """Return the Plane T task plan for this conversation (the chat plan panel polls
    this). Reads the shared-volume store the kernel writes — same cross-container
    pattern as approvals/clarifications."""
    gate_conversation(p, conversation_id)
    tasks = _safe("cloudguard.tasks")
    try:
        items = [t.to_dict() for t in tasks.list_tasks(conversation_id=conversation_id)]
    except Exception:  # noqa: BLE001
        items = []
    return {"tasks": items}


# ── File history (rewind points) — read the shared METADATA mirror the kernel writes ──
@app.get("/file-history")
async def list_file_history_route(conversation_id: str | None = None, p=Depends(require_principal)):
    """Return the file-history checkpoints for this conversation (the rewind panel polls
    this). Reads the read-only index the sandbox mirrors to /cloudguard-shared — the
    backups + the actual restore stay in the sandbox; the UI triggers rewind via the agent
    (file_rewind), which re-confines paths. Metadata only (no file content) is exposed."""
    gate_conversation(p, conversation_id)
    fh = _safe("cloudguard.file_history")
    try:
        import os as _os

        shared = _os.environ.get("CLOUDGUARD_FILE_HISTORY_SHARED_DIR") or "/cloudguard-shared/file_history"
        checkpoints = fh.list_snapshots(conversation_id=conversation_id, base_dir=shared)
    except Exception:  # noqa: BLE001
        checkpoints = []
    return {"checkpoints": checkpoints}


# ── Clarifications ────────────────────────────────────────────────────────────
@app.get("/clarifications")
async def list_clarifications(
    status: str | None = None,
    conversation_id: str | None = None,
    principal=Depends(require_principal),
):
    import glob
    import json
    import os

    gate_conversation(principal, conversation_id)
    clarification = _safe("cloudguard.clarification")
    out = []
    try:
        for path in sorted(glob.glob(os.path.join(clarification._dir(), "*.json"))):
            try:
                rec = json.loads(open(path, encoding="utf-8").read())
            except Exception:  # noqa: BLE001
                continue
            if status is None or rec.get("status") == status:
                out.append(rec)
    except Exception:  # noqa: BLE001
        pass
    return {"clarifications": _scope(out, conversation_id, lambda r: r.get("session_id"))}


@app.get("/clarifications/{cid}")
async def get_clarification(cid: str, principal=Depends(require_principal)):
    clarification = _safe("cloudguard.clarification")
    rec = clarification.get_request(cid)
    if rec is None:
        raise HTTPException(status_code=404, detail="clarification not found")
    gate_conversation(principal, rec.get("session_id"))
    return rec


@app.post("/clarifications/{cid}/answer")
async def answer_clarification(
    cid: str, body: ClarificationAnswer, principal=Depends(require_cap("remediate"))
):
    clarification = _safe("cloudguard.clarification")
    rec = clarification.get_request(cid)
    if rec is None:
        raise HTTPException(status_code=404, detail="clarification not found")
    gate_conversation(principal, rec.get("session_id"))
    ok = clarification.answer(cid, body.answers)
    if not ok:
        raise HTTPException(status_code=409, detail="clarification not found or already answered")
    return clarification.get_request(cid)

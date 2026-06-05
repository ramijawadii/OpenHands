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

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

app = APIRouter(prefix="/api/cloudguard")


class ApprovalDecision(BaseModel):
    approved: bool
    reviewer: str = Field(default="user", max_length=128)
    reason: str = Field(default="", max_length=4000)


class ClarificationAnswer(BaseModel):
    answers: list = Field(default_factory=list)


def _safe(import_name: str):
    """Import a cloudguard module; 503 if the package isn't on PYTHONPATH."""
    import importlib

    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


# ── Approvals ─────────────────────────────────────────────────────────────────
@app.get("/approvals")
async def list_approvals(status: str | None = None):
    approval = _safe("cloudguard.approval")
    return {"approvals": approval.list_requests(status)}


@app.get("/approvals/{rid}")
async def get_approval(rid: str):
    approval = _safe("cloudguard.approval")
    rec = approval.get_request(rid)
    if rec is None:
        raise HTTPException(status_code=404, detail="approval not found")
    return rec


@app.post("/approvals/{rid}/decision")
async def decide_approval(rid: str, body: ApprovalDecision):
    """Approve / reject (Other = reject + a redirect reason). Signs the decision."""
    approval = _safe("cloudguard.approval")
    ok = approval.decide(rid, approved=body.approved, reviewer=body.reviewer, reason=body.reason)
    if not ok:
        raise HTTPException(status_code=409, detail="approval not found or already decided")
    return approval.get_request(rid)


# ── Clarifications ────────────────────────────────────────────────────────────
@app.get("/clarifications")
async def list_clarifications(status: str | None = None):
    import glob
    import json
    import os

    clarification = _safe("cloudguard.clarification")
    out = []
    try:
        for p in sorted(glob.glob(os.path.join(clarification._dir(), "*.json"))):
            try:
                rec = json.loads(open(p, encoding="utf-8").read())
            except Exception:  # noqa: BLE001
                continue
            if status is None or rec.get("status") == status:
                out.append(rec)
    except Exception:  # noqa: BLE001
        pass
    return {"clarifications": out}


@app.get("/clarifications/{cid}")
async def get_clarification(cid: str):
    clarification = _safe("cloudguard.clarification")
    rec = clarification.get_request(cid)
    if rec is None:
        raise HTTPException(status_code=404, detail="clarification not found")
    return rec


@app.post("/clarifications/{cid}/answer")
async def answer_clarification(cid: str, body: ClarificationAnswer):
    clarification = _safe("cloudguard.clarification")
    ok = clarification.answer(cid, body.answers)
    if not ok:
        raise HTTPException(status_code=409, detail="clarification not found or already answered")
    return clarification.get_request(cid)

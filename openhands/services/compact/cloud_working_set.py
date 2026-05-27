"""
CloudGuard post-compact working set — durable operational state that survives
context compaction.

Unlike Claude Code (which re-reads local files), CloudGuard can't cheaply
re-query the cloud.  This store accumulates the cloud investigation context
and re-injects it after compaction so the agent picks up seamlessly.

Populated passively from ``session._on_event()`` by observing event-stream
events (CmdOutput, IPython, MCP, CondensationAction).  The agent reads it in
``_get_messages()`` to append the working-set block to the LLM context.

Thread safety: ``session._on_event`` (event-loop thread) writes; the agent's
``_get_messages`` (executor thread) reads.  All public methods acquire ``_lock``.
"""
from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── Token / size budgets ────────────────────────────────────────────────────
MAX_CMD_ENTRIES = 20
MAX_CMD_OUTPUT_CHARS = 2000
MAX_FINDINGS = 50
MAX_ARTIFACTS = 30
MAX_KG_ENTRIES = 10
FULL_BUDGET_CHARS = 50_000
COMPACT_BUDGET_CHARS = 2000

# ── Passive extraction patterns ─────────────────────────────────────────────
_CLOUD_CLI_RE = re.compile(r"^\s*(aws|gcloud|az|kubectl|eksctl|terraform)\b")
_REGION_RE = re.compile(r"--region[= ](\S+)")
_PROFILE_RE = re.compile(r"--profile[= ](\S+)")
_ARN_RE = re.compile(r"arn:aws[\w-]*:[\w-]+:[\w-]*:\d{12}:[^\s\"',]+")
_ACCOUNT_ID_RE = re.compile(r"\b(\d{12})\b")
_SAFE_PAGE_RE = re.compile(r"_safe_page\s*\(\s*[\"']([^\"']+)")
_SAFE_DIAGRAM_RE = re.compile(r"_safe_diagram\s*\(\s*[\"']([^\"']+)")


# ── Data classes ────────────────────────────────────────────────────────────
@dataclass
class _CmdEntry:
    command: str
    exit_code: int
    output_preview: str
    timestamp: float
    scope_hints: list


@dataclass
class _FindingEntry:
    tool_name: str
    args_preview: str
    timestamp: float


# ── Main store ──────────────────────────────────────────────────────────────
@dataclass
class CloudWorkingSet:
    """Per-session durable working set for CloudGuard investigations."""

    scope: set = field(default_factory=set)
    command_ledger: list = field(default_factory=list)
    findings: list = field(default_factory=list)
    artifacts: list = field(default_factory=list)
    kg_activity: list = field(default_factory=list)
    skills_used: list = field(default_factory=list)

    # Set by session._on_event when CondensationAction lands; consumed once
    # by _get_messages to inject the full working-set block.
    pending_full_reinject: bool = False

    _lock: threading.RLock = field(
        default_factory=threading.RLock, init=False, repr=False, compare=False
    )

    # ── Passive observers (called from session._on_event) ───────────────

    def observe_cmd(self, command: str, exit_code: int, output: str) -> None:
        """Extract scope + evidence from a CmdOutputObservation."""
        if not _CLOUD_CLI_RE.match(command):
            return
        with self._lock:
            hints = []
            text = command + " " + output[:500]
            for m in _REGION_RE.finditer(text):
                v = m.group(1)
                hints.append(v)
                self.scope.add(v)
            for m in _PROFILE_RE.finditer(text):
                v = m.group(1)
                hints.append(v)
                self.scope.add(f"profile:{v}")
            for m in _ARN_RE.finditer(text):
                self.scope.add(m.group(0)[:80])
            for m in _ACCOUNT_ID_RE.finditer(text):
                self.scope.add(f"account:{m.group(1)}")

            self.command_ledger.append(_CmdEntry(
                command=command[:500],
                exit_code=exit_code,
                output_preview=output[:MAX_CMD_OUTPUT_CHARS],
                timestamp=time.monotonic(),
                scope_hints=hints,
            ))
            if len(self.command_ledger) > MAX_CMD_ENTRIES:
                self.command_ledger = self.command_ledger[-MAX_CMD_ENTRIES:]

    def observe_mcp(self, name: str, arguments: dict) -> None:
        """Extract findings / KG activity from an MCP tool call."""
        with self._lock:
            if "store_finding" in name or "store_vulnerability" in name:
                self.findings.append(_FindingEntry(
                    tool_name=name,
                    args_preview=str(arguments)[:300],
                    timestamp=time.monotonic(),
                ))
                if len(self.findings) > MAX_FINDINGS:
                    self.findings = self.findings[-MAX_FINDINGS:]

            if name.startswith("kg_") or "knowledge" in name.lower():
                self.kg_activity.append({
                    "name": name,
                    "args_preview": str(arguments)[:200],
                    "ts": time.monotonic(),
                })
                if len(self.kg_activity) > MAX_KG_ENTRIES:
                    self.kg_activity = self.kg_activity[-MAX_KG_ENTRIES:]

    def observe_ipython(self, code: str) -> None:
        """Extract artifact names from IPython cell code."""
        with self._lock:
            for m in _SAFE_PAGE_RE.finditer(code):
                name = m.group(1)
                if name not in self.artifacts:
                    self.artifacts.append(name)
            for m in _SAFE_DIAGRAM_RE.finditer(code):
                name = m.group(1)
                if name not in self.artifacts:
                    self.artifacts.append(name)
            if len(self.artifacts) > MAX_ARTIFACTS:
                self.artifacts = self.artifacts[-MAX_ARTIFACTS:]

    def record_skill(self, skill_name: str) -> None:
        """Record that a security microagent was invoked."""
        with self._lock:
            if skill_name not in self.skills_used:
                self.skills_used.append(skill_name)

    # ── Compaction lifecycle ────────────────────────────────────────────

    def mark_pending_reinject(self) -> None:
        with self._lock:
            self.pending_full_reinject = True

    def consume_pending(self) -> bool:
        """Atomically read and clear the pending-reinject flag."""
        with self._lock:
            was = self.pending_full_reinject
            self.pending_full_reinject = False
            return was

    # ── Renderers (called from _get_messages) ───────────────────────────

    def render_full(self) -> str:
        """Full working-set block for post-compaction re-injection.

        Includes the 'resume seamlessly' instruction so the model doesn't
        pause to acknowledge the compaction.
        """
        with self._lock:
            parts = [
                "Continue the conversation from where it left off without "
                "asking the user any further questions. Resume directly — do "
                "not acknowledge the summary, do not recap what was happening, "
                "do not preface with \"I'll continue\" or similar. Pick up the "
                "last task as if the break never happened.",
            ]

            if self.scope:
                parts.append(
                    "## Cloud Scope\n" + ", ".join(sorted(self.scope)[:20])
                )

            if self.skills_used:
                parts.append(
                    "## Invoked Security Microagents\n"
                    + ", ".join(self.skills_used)
                )

            if self.findings:
                lines = ["## Findings Stored to Knowledge Graph"]
                for i, f in enumerate(self.findings[-20:], 1):
                    lines.append(f"  {i}. {f.tool_name}({f.args_preview})")
                parts.append("\n".join(lines))

            if self.command_ledger:
                lines = ["## Recent Cloud Commands (Evidence)"]
                for e in self.command_ledger[-15:]:
                    status = "✓" if e.exit_code == 0 else f"✗ exit={e.exit_code}"
                    lines.append(f"  [{status}] `{e.command}`")
                    if e.output_preview.strip():
                        lines.append(f"      → {e.output_preview[:500]}")
                parts.append("\n".join(lines))

            if self.artifacts:
                parts.append(
                    "## Generated Artifacts (Pages/Diagrams)\n"
                    + ", ".join(self.artifacts)
                )

            if self.kg_activity:
                lines = ["## Recent KG Queries"]
                for q in self.kg_activity[-5:]:
                    lines.append(f"  - {q['name']}({q['args_preview']})")
                parts.append("\n".join(lines))

            text = "\n\n".join(parts)
            return text[:FULL_BUDGET_CHARS]

    def render_compact(self) -> str:
        """One-line scope + counts for ambient every-turn injection."""
        with self._lock:
            bits = []
            if self.scope:
                bits.append(f"scope: {', '.join(sorted(self.scope)[:5])}")
            if self.findings:
                bits.append(f"{len(self.findings)} findings in KG")
            if self.command_ledger:
                bits.append(f"{len(self.command_ledger)} cloud commands executed")
            if self.artifacts:
                bits.append(f"artifacts: {', '.join(self.artifacts[-5:])}")
            if self.skills_used:
                bits.append(f"skills: {', '.join(self.skills_used[-5:])}")
            if self.kg_activity:
                bits.append(f"{len(self.kg_activity)} KG queries")
            if not bits:
                return ""
            return "CloudGuard working set: " + " | ".join(bits)

    def is_empty(self) -> bool:
        with self._lock:
            return (
                not self.scope
                and not self.command_ledger
                and not self.findings
                and not self.artifacts
                and not self.kg_activity
                and not self.skills_used
            )

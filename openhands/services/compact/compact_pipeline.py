"""
LLM-driven compaction for OpenHands CloudGuard fork.

Mirrors Claude Code's src/services/compact/compact.ts 13-step pipeline.

Architecture
------------
This module is provider-agnostic: it takes a ``list[dict]`` of API messages
(already in ``{"role": ..., "content": ...}`` format) and calls the supplied
``LLM`` instance.  Callers are responsible for converting their internal event
representation into that format before calling ``compact_conversation()``.

The ``LLMSummarizingCondenser`` in
``openhands/memory/condenser/impl/llm_summarizing_condenser.py`` is the primary
caller for the agent loop path; the resume pipeline (Layer 5) calls this module
directly with messages already in dict format.
"""
from __future__ import annotations

import re
import time
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from openhands.llm.llm import LLM

# ---------------------------------------------------------------------------
# Verbatim prompts (match Claude Code reference exactly)
# ---------------------------------------------------------------------------

NO_TOOLS_PREAMBLE: str = (
    "CRITICAL: This is a conversation summarization task. You must respond with TEXT ONLY.\n"
    "Do NOT call any tools. Do NOT use tool_use blocks.\n"
    "Do NOT make API calls. Do NOT execute code.\n"
    "ONLY produce a text summary following the instructions below.\n"
    "If you call any tools, the summarization will FAIL."
)

BASE_COMPACT_PROMPT: str = """\
Your task is to create a detailed summary of the conversation so far, paying close attention \
to the explicit requests and the files modified.

This is the structure you should follow:
1. Primary Request and Intent: What was the explicit goal? What did the user want?
2. Key Technical Concepts: Technologies, frameworks, patterns, constants explicitly discussed.
3. Files and Code Sections: Every file mentioned or modified. Include exact paths, function \
names, line numbers if stated.
4. Errors and Fixes: Any error messages, stack traces, and how they were resolved.
5. Problem Solving: Approaches tried, what worked, what was rejected and why.
6. All user messages: Include the full text of every message the user sent verbatim.
7. Pending Tasks: Unfinished work, TODOs, things mentioned but not done.
8. Current Work: The exact state at the time of this summary — what was in progress.
9. Optional Next Step: If there is an obvious next action, state it. One sentence only.\
"""

NO_TOOLS_TRAILER: str = (
    "REMINDER: Do NOT call any tools. Respond with TEXT ONLY.\n"
    "Your entire response should be the summary text, nothing else."
)

# ---------------------------------------------------------------------------
# Scalar constants
# ---------------------------------------------------------------------------

MAX_PTL_RETRIES: int = 3
COMPACT_MAX_OUTPUT_TOKENS: int = 20_000

# PTL error substrings (case-insensitive match against str(exception))
_PTL_MARKERS: tuple[str, ...] = (
    "prompt_too_long",
    "context_length",
    "context window",
    "too long",
    "maximum context",
    "input is too long",
    "input length",
)


# ---------------------------------------------------------------------------
# Boundary marker
# ---------------------------------------------------------------------------

def build_boundary_marker(summary: str, pre_compact_tokens: int) -> dict:
    """
    The 'summary' entry written to the JSONL transcript.

    This marker is what the resume pipeline uses to find the compaction
    boundary and re-inject context after a disconnect/reload.
    """
    return {
        "type": "summary",
        "summary": summary,
        "pre_compact_tokens": pre_compact_tokens,
        "timestamp": time.time(),
    }


# ---------------------------------------------------------------------------
# Post-compact injection message
# ---------------------------------------------------------------------------

def get_compact_user_summary_message(
    summary: str,
    transcript_path: Optional[str],
    suppress_follow_up_questions: bool = True,
) -> str:
    """
    Verbatim from Claude Code's getCompactUserSummaryMessage().

    This wraps the summary and injects it as the first user message
    in the resumed session so the agent can continue without a fresh start.
    """
    if suppress_follow_up_questions:
        continue_instructions = (
            "Continue the conversation from where it left off without asking the user any "
            "further questions. Resume directly — do not acknowledge the summary, do not recap "
            "what was happening, do not preface with \"I'll continue\" or similar. "
            "Pick up the last task as if the break never happened."
        )
    else:
        continue_instructions = (
            "The conversation has been compacted. Resume from where it left off."
        )

    path_note = (
        f"\n\nIf you need specific details from before compaction (like exact code snippets, "
        f"error messages, or content you generated), read the full transcript at: {transcript_path}"
        if transcript_path
        else ""
    )

    return (
        "This session is being continued from a previous conversation that ran out of context. "
        "The summary below covers the earlier portion of the conversation.\n\n"
        f"Summary:\n{summary}"
        f"{path_note}\n"
        f"{continue_instructions}"
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def compact_conversation(
    messages: list[dict],
    llm: "LLM",
    pre_compact_tokens: int,
    custom_instructions: str = "",
    transcript_path: Optional[str] = None,
    suppress_follow_up_questions: bool = True,
) -> tuple[dict, list[dict]]:
    """
    Run the LLM summarization pipeline.

    Parameters
    ----------
    messages:
        Conversation history in ``{"role": ..., "content": ...}`` API format.
    llm:
        LLM instance to use for summarization.
    pre_compact_tokens:
        Token count of the conversation being compacted (stored in the boundary
        marker so the resume pipeline can skip already-summarized history).
    custom_instructions:
        Optional additional summarization instructions appended after
        ``BASE_COMPACT_PROMPT`` and before ``NO_TOOLS_TRAILER``.
    transcript_path:
        Absolute path to the JSONL transcript file, included in the summary
        message so the agent can read raw history if needed.
    suppress_follow_up_questions:
        When True (default), the injected message instructs the agent to
        resume without asking clarifying questions.

    Returns
    -------
    (boundary_marker, new_messages)
        ``boundary_marker`` is the dict to write to the JSONL transcript.
        ``new_messages`` is the new minimal conversation history:
        ``[summary_user_msg, assistant_ack]``.
        Callers should append post-compact file/skill/plan attachments.
    """
    # Step 2: strip images / document blocks
    stripped = _strip_images(messages)

    # Step 3: build compaction system prompt
    prompt_parts = [NO_TOOLS_PREAMBLE, BASE_COMPACT_PROMPT]
    if custom_instructions:
        prompt_parts.append(f"Additional instructions:\n{custom_instructions}")
    prompt_parts.append(NO_TOOLS_TRAILER)
    system_prompt = "\n\n".join(prompt_parts)

    # Steps 4-5-6: summarise with PTL retry
    raw_summary = _summarize_with_ptl_retry(stripped, system_prompt, llm)

    # Step 7: format (strip <analysis>, unwrap <summary>)
    summary_clean = _format_compact_summary(raw_summary)

    # Step 8: build boundary marker
    boundary = build_boundary_marker(summary_clean, pre_compact_tokens)

    # Build post-compact message pair
    summary_user_msg = get_compact_user_summary_message(
        summary_clean, transcript_path, suppress_follow_up_questions
    )
    new_messages: list[dict] = [
        {"role": "user",      "content": summary_user_msg},
        {"role": "assistant", "content": "Understood. Continuing from the summary."},
    ]

    return boundary, new_messages


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _summarize_with_ptl_retry(
    messages: list[dict],
    system_prompt: str,
    llm: "LLM",
) -> str:
    """
    Call the LLM with the system prompt prepended as a system-role message.

    On a prompt-too-long error, drop the oldest user+assistant round and retry
    up to MAX_PTL_RETRIES times.
    """
    current_messages = list(messages)
    last_error: Optional[Exception] = None

    for attempt in range(MAX_PTL_RETRIES):
        try:
            full_messages = [{"role": "system", "content": system_prompt}] + current_messages
            response = llm.completion(
                messages=full_messages,
                max_tokens=COMPACT_MAX_OUTPUT_TOKENS,
            )
            return response.choices[0].message.content or ""
        except Exception as exc:
            last_error = exc
            error_str = str(exc).lower()
            is_ptl = any(marker in error_str for marker in _PTL_MARKERS)
            if not is_ptl:
                raise
            if attempt >= MAX_PTL_RETRIES - 1:
                break
            current_messages = _truncate_oldest_round(current_messages)

    raise RuntimeError(
        f"Compaction PTL retry exhausted after {MAX_PTL_RETRIES} attempts"
    ) from last_error


def _truncate_oldest_round(messages: list[dict]) -> list[dict]:
    """Drop the oldest user+assistant pair.  Called on each PTL retry."""
    rounds = _group_into_api_rounds(messages)
    if len(rounds) <= 1:
        return messages
    return [m for r in rounds[1:] for m in r]


def _group_into_api_rounds(messages: list[dict]) -> list[list[dict]]:
    """
    Group a flat message list into logical API rounds.

    Each new round begins at a user-role message.  Non-user messages at the
    start (e.g. a leading system message) form their own group.
    """
    rounds: list[list[dict]] = []
    current: list[dict] = []
    for msg in messages:
        if msg.get("role") == "user" and current:
            rounds.append(current)
            current = [msg]
        else:
            current.append(msg)
    if current:
        rounds.append(current)
    return rounds


def _strip_images(messages: list[dict]) -> list[dict]:
    """
    Replace image/document content blocks with a placeholder text block.

    String content is left as-is.  Only list-of-blocks content is inspected.
    """
    result: list[dict] = []
    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, list):
            new_blocks: list[dict] = []
            for block in content:
                if isinstance(block, dict) and block.get("type") in {"image", "document"}:
                    new_blocks.append({
                        "type": "text",
                        "text": f"[{block['type']} removed for compaction]",
                    })
                else:
                    new_blocks.append(block)
            result.append({**msg, "content": new_blocks})
        else:
            result.append(msg)
    return result


def _format_compact_summary(raw: str) -> str:
    """
    Verbatim from Claude Code's formatCompactSummary():

    - Remove ``<analysis>`` blocks (model thinking output leaked into response)
    - Unwrap ``<summary>`` tags if the model wrapped its output in them
    """
    cleaned = re.sub(r"<analysis>[\s\S]*?</analysis>", "", raw).strip()
    cleaned = re.sub(r"^<summary>\n?", "", cleaned)
    cleaned = re.sub(r"\n?</summary>$", "", cleaned)
    return cleaned

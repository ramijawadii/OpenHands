"""
Per-model context window constants and auto-compact threshold.

Mirrors Claude Code's ``src/utils/context.ts``.

Architecture note
-----------------
OpenHands discovers context-window sizes at LLM init time via the litellm
model-info API (``init_model_info()`` in ``llm.py``).  That path is correct
for long-tail models, but it requires a live API round-trip and silently
falls back to ``None`` when the model is unknown.

This module provides:
1. A hardcoded table for the models we actively deploy.  ``get_context_window()``
   checks this table *first* so the warm path has zero I/O.
2. An env-var override (``OPENHANDS_MAX_CONTEXT_TOKENS``) so operators can cap
   context usage without changing code.
3. ``should_auto_compact()`` — the 95 % threshold function consumed by
   ``AgentController._step()``.
4. Constants that future layers (slot reservation, compaction, post-compact
   re-injection) can import from a single place instead of repeating magic
   numbers across modules.

Slot reservation note
---------------------
``CAPPED_DEFAULT_MAX_TOKENS = 8_000`` is the target ``max_completion_tokens``
for *routine* agent turns (tool selection, short answers).  Reserving a full
32 K–64 K output slot on every request wastes API latency for turns that the
model will answer in under 200 tokens.  Applying this cap requires knowing
whether a turn is "escalated" (file rewrite, report generation) vs. routine —
that detection logic belongs to Layer 7.  **Do not apply CAPPED_DEFAULT_MAX_TOKENS
in llm.py until Layer 7 is implemented**, or you will truncate legitimate
large-output turns.
"""
from __future__ import annotations

import os

# ---------------------------------------------------------------------------
# Per-model context window table (input tokens)
# ---------------------------------------------------------------------------

_CONTEXT_WINDOWS: dict[str, int] = {
    # Claude 4.x family
    "claude-opus-4-7":            200_000,
    "claude-opus-4-6":            200_000,
    "claude-sonnet-4-6":          200_000,
    "claude-haiku-4-5":           200_000,
    # Claude 3.5 family
    "claude-3-5-sonnet-20241022": 200_000,
    "claude-3-5-haiku-20241022":  200_000,
    # Claude 3 family
    "claude-3-opus-20240229":     200_000,
    "claude-3-haiku-20240307":    200_000,
    # Gemini family
    "gemini-2.5-pro":           1_048_576,
    "gemini-2.5-flash":         1_048_576,
    "gemini-2.0-flash":         1_048_576,
    # GPT-4o family
    "gpt-4o":                     128_000,
    "gpt-4-turbo":                128_000,
    "gpt-4":                        8_192,
    # Mistral
    "mistral-large":              131_072,
    "mistral-medium":              32_768,
}

# Per-model output token limits.
# "default" = slot reserved for routine turns (not escalated).
# "upper"   = hard maximum the model supports.
_OUTPUT_LIMITS: dict[str, dict[str, int]] = {
    "claude-opus-4-7":            {"default":  32_000, "upper": 128_000},
    "claude-opus-4-6":            {"default":  64_000, "upper": 128_000},
    "claude-sonnet-4-6":          {"default":  32_000, "upper": 128_000},
    "claude-haiku-4-5":           {"default":  16_000, "upper":  32_000},
    "claude-3-5-sonnet-20241022": {"default":   8_192, "upper":  32_000},
    "claude-3-5-haiku-20241022":  {"default":   8_192, "upper":  16_000},
    "claude-3-opus-20240229":     {"default":   4_096, "upper":   4_096},
    "claude-3-haiku-20240307":    {"default":   4_096, "upper":   4_096},
    "gemini-2.5-pro":             {"default":   8_192, "upper":  65_536},
    "gemini-2.5-flash":           {"default":   8_192, "upper":  65_536},
    "gemini-2.0-flash":           {"default":   8_192, "upper":  65_536},
    "gpt-4o":                     {"default":  16_384, "upper":  16_384},
    "gpt-4-turbo":                {"default":   4_096, "upper":   4_096},
}

# ---------------------------------------------------------------------------
# Scalar constants
# ---------------------------------------------------------------------------

#: Fallback input context window when the model is not in ``_CONTEXT_WINDOWS``.
MODEL_CONTEXT_WINDOW_DEFAULT: int = 200_000

#: Fallback output token limit for unknown models (non-escalated).
MAX_OUTPUT_TOKENS_DEFAULT: int = 32_000

#: Maximum output tokens for the compaction summarization call.
#: The summary must fit in 20 K tokens so downstream resume can parse it.
COMPACT_MAX_OUTPUT_TOKENS: int = 20_000

#: Slot reservation for *routine* turns — tool selection, short answers.
#: See the module docstring for why this is not yet applied in ``llm.py``.
CAPPED_DEFAULT_MAX_TOKENS: int = 8_000

#: Output token limit for *escalated* turns — report generation, large file rewrites.
ESCALATED_MAX_TOKENS: int = 64_000

#: Trigger proactive compaction when context usage is at or above this fraction.
#: Override via AUTO_COMPACT_THRESHOLD env var (e.g. "0.10" for testing).
import os as _os
AUTO_COMPACT_THRESHOLD: float = float(_os.environ.get("AUTO_COMPACT_THRESHOLD", "0.95"))

#: Virtual context window used for BOTH the context-ring display and the
#: auto-compaction trigger. On huge real windows (e.g. Gemini's 1M) the per-call
#: context stays a tiny fraction of the window, so the ring never moves and
#: auto-compaction effectively never fires. Capping at this value makes the ring
#: meaningful AND makes the agent self-compact when the ring fills. Shared by
#: session.py (ring) and get_auto_compact_threshold() so the two stay aligned.
#: Override via CONTEXT_DISPLAY_CAP env var.
CONTEXT_DISPLAY_CAP: int = int(_os.environ.get("CONTEXT_DISPLAY_CAP", "200000"))
#: Trigger buffer subtracted from the display cap (mirrors the ring's math).
CONTEXT_DISPLAY_BUFFER: int = 13_000
#: Operator override for the context window size (e.g. "8000" for compaction testing).
_MAX_CTX_OVERRIDE = _os.environ.get("OPENHANDS_MAX_CONTEXT_TOKENS", "")


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def _lookup_model_context_window(model: str) -> int:
    """Substring match against ``_CONTEXT_WINDOWS`` table; no env-var override."""
    best_key = ""
    best_val = 0
    for key, size in _CONTEXT_WINDOWS.items():
        if key in model and len(key) > len(best_key):
            best_key = key
            best_val = size
    return best_val if best_key else MODEL_CONTEXT_WINDOW_DEFAULT


def get_model_context_window(model: str) -> int:
    """
    Return the model's **real** context window from the hardware table.

    Unlike ``get_context_window()``, this function **never** reads
    ``OPENHANDS_MAX_CONTEXT_TOKENS``.  It is used exclusively for the
    auto-compact threshold so that the threshold is always derived from
    what the model can actually accept, not an arbitrary operator cap.

    ``OPENHANDS_MAX_CONTEXT_TOKENS`` is a *cost-control* knob; using it as
    the compact trigger produces a threshold far below the system-prompt size
    and causes infinite compact loops (see COMPACT-BUG-DIAGNOSIS.md Fix 1).
    """
    return _lookup_model_context_window(model)


def get_context_window(model: str) -> int:
    """
    Return the input context window size (tokens) for *model*.

    Lookup order:
    1. ``OPENHANDS_MAX_CONTEXT_TOKENS`` env var (operator override).
    2. ``_CONTEXT_WINDOWS`` table — substring match, longest key wins.
    3. ``MODEL_CONTEXT_WINDOW_DEFAULT`` (200 K).
    """
    env = os.environ.get("OPENHANDS_MAX_CONTEXT_TOKENS", _MAX_CTX_OVERRIDE)
    if env.isdigit():
        return int(env)
    return _lookup_model_context_window(model)


def get_output_limit(model: str, *, escalated: bool = False) -> int:
    """
    Return the output token limit for *model*.

    Parameters
    ----------
    model:
        Model name string (may include provider prefix).
    escalated:
        If ``True``, return the upper hard limit (for report generation,
        large file rewrites).  If ``False``, return the default slot
        reservation value.
    """
    best_key = ""
    best_limits: dict[str, int] = {}
    for key, limits in _OUTPUT_LIMITS.items():
        if key in model and len(key) > len(best_key):
            best_key = key
            best_limits = limits
    if best_key:
        return best_limits["upper"] if escalated else best_limits["default"]
    return ESCALATED_MAX_TOKENS if escalated else CAPPED_DEFAULT_MAX_TOKENS


def context_pressure(
    prompt_tokens: int,
    completion_tokens: int,
    model: str,
) -> float:
    """
    Return context usage as a fraction in ``[0.0, 1.0]``.

    Uses ``get_context_window()`` (which respects the env-var override) so
    that callers such as the display layer get the operator-visible window.
    Auto-compact triggering uses ``get_auto_compact_threshold()`` directly.
    """
    window = get_context_window(model)
    return min(1.0, (prompt_tokens + completion_tokens) / window)


def get_auto_compact_threshold(model: str) -> int:
    """
    Return the token count at which auto-compact should fire.

    Always derived from the **model's real context window** minus a reserved
    output slot — never from ``OPENHANDS_MAX_CONTEXT_TOKENS``.  Using the
    operator cap as the trigger threshold is the root cause of the infinite
    compact loop (system prompt alone can exceed the cap).

    Mirrors Claude Code's ``getAutoCompactThreshold()`` in
    ``src/services/compact/autoCompact.ts:72``:
        effective_window = model_window - output_reserve
        threshold        = effective_window - autocompact_buffer
    """
    real_window = get_model_context_window(model)
    # Reserve output slot + small buffer so compact fires with room to respond.
    effective_window = real_window - COMPACT_MAX_OUTPUT_TOKENS  # e.g. 1M - 20k
    buffer = max(5_000, int(real_window * 0.01))               # 1 % or 5k minimum
    real_threshold = effective_window - buffer
    # Align with the context-ring display cap: auto-compaction fires when the
    # ring visually fills (DISPLAY_CAP − buffer), not only near the true window.
    # On small real windows the real threshold is lower and wins via min().
    display_threshold = max(1, CONTEXT_DISPLAY_CAP - CONTEXT_DISPLAY_BUFFER)
    return min(real_threshold, display_threshold)


def should_auto_compact(
    prompt_tokens: int,
    completion_tokens: int,
    model: str,
) -> bool:
    """
    Return ``True`` if context usage has exceeded the auto-compact threshold.

    The threshold is derived from the **model's real context window**, not the
    ``OPENHANDS_MAX_CONTEXT_TOKENS`` env var.  See ``get_auto_compact_threshold()``.
    """
    total = prompt_tokens + completion_tokens
    return total >= get_auto_compact_threshold(model)

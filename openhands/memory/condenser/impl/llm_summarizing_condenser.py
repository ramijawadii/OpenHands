from __future__ import annotations

from openhands.core.config.condenser_config import LLMSummarizingCondenserConfig
from openhands.core.message import Message, TextContent
from openhands.events.action.agent import CondensationAction
from openhands.events.observation.agent import AgentCondensationObservation
from openhands.events.serialization.event import truncate_content
from openhands.llm.llm import LLM
from openhands.llm.llm_registry import LLMRegistry
from openhands.memory.condenser.condenser import (
    Condensation,
    RollingCondenser,
    View,
)
from openhands.services.compact.compact_pipeline import (
    BASE_COMPACT_PROMPT,
    COMPACT_MAX_OUTPUT_TOKENS,
    MAX_PTL_RETRIES,
    NO_TOOLS_PREAMBLE,
    NO_TOOLS_TRAILER,
    _PTL_MARKERS,
    _format_compact_summary,
)


class LLMSummarizingCondenser(RollingCondenser):
    """A condenser that summarizes forgotten events.

    Maintains a condensed history and forgets old events when it grows too large,
    keeping a special summarization event after the prefix that summarizes all previous summarizations
    and newly forgotten events.
    """

    def __init__(
        self,
        llm: LLM,
        max_size: int = 100,
        keep_first: int = 1,
        max_event_length: int = 10_000,
    ):
        if keep_first >= max_size // 2:
            raise ValueError(
                f'keep_first ({keep_first}) must be less than half of max_size ({max_size})'
            )
        if keep_first < 0:
            raise ValueError(f'keep_first ({keep_first}) cannot be negative')
        if max_size < 1:
            raise ValueError(f'max_size ({max_size}) cannot be non-positive')

        self.max_size = max_size
        self.keep_first = keep_first
        self.max_event_length = max_event_length
        self.llm = llm

        super().__init__()

    def _truncate(self, content: str) -> str:
        """Truncate the content to fit within the specified maximum event length."""
        return truncate_content(content, max_chars=self.max_event_length)

    def get_condensation(self, view: View) -> Condensation:
        head = view[: self.keep_first]
        target_size = self.max_size // 2
        # Number of events to keep from the tail — target size minus prefix events
        # minus one slot for the summarization event itself.
        events_from_tail = target_size - len(head) - 1

        summary_event = (
            view[self.keep_first]
            if isinstance(view[self.keep_first], AgentCondensationObservation)
            else AgentCondensationObservation('No events summarized')
        )

        # Identify events to be forgotten (those not in head or tail)
        forgotten_events = []
        for event in view[self.keep_first : -events_from_tail]:
            if not isinstance(event, AgentCondensationObservation):
                forgotten_events.append(event)

        # Build structured compaction system prompt (NO_TOOLS enforced)
        system_prompt = f"{NO_TOOLS_PREAMBLE}\n\n{BASE_COMPACT_PROMPT}\n\n{NO_TOOLS_TRAILER}"

        # Helper: build the user message text for a given set of forgotten events.
        def _build_user_text(events: list) -> str:
            summary_event_content = self._truncate(
                summary_event.message if summary_event.message else ''
            )
            lines = [
                f'<PREVIOUS SUMMARY>\n{summary_event_content}\n</PREVIOUS SUMMARY>',
                '',
            ]
            for ev in events:
                lines.append(f'<EVENT id={ev.id}>\n{self._truncate(str(ev))}\n</EVENT>')
            lines.append('Now summarize the events using the structure above.')
            return '\n'.join(lines)

        # PTL retry: on context-length error, drop oldest forgotten event and retry.
        current_forgotten = list(forgotten_events)
        last_error: Exception | None = None
        raw_summary: str | None = None

        for attempt in range(MAX_PTL_RETRIES):
            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": _build_user_text(current_forgotten)},
                ]
                response = self.llm.completion(
                    messages=messages,
                    max_tokens=COMPACT_MAX_OUTPUT_TOKENS,
                    extra_body={'metadata': self.llm_metadata},
                )
                raw_summary = response.choices[0].message.content or ''
                break
            except Exception as exc:
                last_error = exc
                error_str = str(exc).lower()
                is_ptl = any(marker in error_str for marker in _PTL_MARKERS)
                if not is_ptl:
                    raise
                if attempt >= MAX_PTL_RETRIES - 1:
                    break
                # Drop the oldest forgotten event and retry
                if len(current_forgotten) > 1:
                    current_forgotten = current_forgotten[1:]

        if raw_summary is None:
            raise RuntimeError(
                f"LLMSummarizingCondenser PTL retry exhausted after {MAX_PTL_RETRIES} attempts"
            ) from last_error

        summary = _format_compact_summary(raw_summary)

        self.add_metadata('response', response.model_dump())
        self.add_metadata('metrics', self.llm.metrics.get())

        return Condensation(
            action=CondensationAction(
                forgotten_events_start_id=min(event.id for event in forgotten_events),
                forgotten_events_end_id=max(event.id for event in forgotten_events),
                summary=summary,
                summary_offset=self.keep_first,
            )
        )

    def should_condense(self, view: View) -> bool:
        # Also fire when there is an explicit condensation request and we have
        # enough history to summarize (more than keep_first + 2 events).
        # Without this, ConversationWindowCondenser intercepts the request first
        # and produces summary=None — no LLM, no structured summary.
        if view.unhandled_condensation_request and len(view) > self.keep_first + 2:
            return True
        return len(view) > self.max_size

    @classmethod
    def from_config(
        cls, config: LLMSummarizingCondenserConfig, llm_registry: LLMRegistry
    ) -> LLMSummarizingCondenser:
        # This condenser cannot take advantage of prompt caching. If it happens
        # to be set, we'll pay for the cache writes but never get a chance to
        # save on a read.
        llm_config = config.llm_config.model_copy()
        llm_config.caching_prompt = False
        llm = llm_registry.get_llm('condenser', llm_config)

        return LLMSummarizingCondenser(
            llm=llm,
            max_size=config.max_size,
            keep_first=config.keep_first,
            max_event_length=config.max_event_length,
        )


LLMSummarizingCondenser.register_config(LLMSummarizingCondenserConfig)

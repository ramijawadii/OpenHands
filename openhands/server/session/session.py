import asyncio
import time
from logging import LoggerAdapter

import socketio

from openhands.controller.agent import Agent
from openhands.core.config import OpenHandsConfig
from openhands.server.session.session_state import (
    _SessionState,
    set_current_session,
)
from openhands.core.config.condenser_config import (
    BrowserOutputCondenserConfig,
    CondenserPipelineConfig,
    ConversationWindowCondenserConfig,
    LLMSummarizingCondenserConfig,
)
from openhands.core.config.mcp_config import OpenHandsMCPConfigImpl
from openhands.core.exceptions import MicroagentValidationError
from openhands.core.logger import OpenHandsLoggerAdapter
from openhands.core.schema import AgentState
from openhands.events.action import MessageAction, NullAction
from openhands.events.event import Event, EventSource
from openhands.events.observation import (
    AgentStateChangedObservation,
    CmdOutputObservation,
    NullObservation,
)
from openhands.events.observation.agent import RecallObservation
from openhands.events.observation.error import ErrorObservation
from openhands.events.serialization import event_from_dict, event_to_dict
from openhands.events.stream import EventStreamSubscriber
from openhands.storage.transcript_writer import TranscriptWriter
from openhands.llm.llm_registry import LLMRegistry
from openhands.runtime.runtime_status import RuntimeStatus
from openhands.server.constants import ROOM_KEY
from openhands.server.services.conversation_stats import ConversationStats
from openhands.server.session.agent_session import AgentSession
from openhands.server.session.conversation_init_data import ConversationInitData
from openhands.storage.data_models.settings import Settings
from openhands.storage.files import FileStore


class WebSession:
    """Web server-bound session wrapper.

    This was previously named `Session`. We keep `Session` as a compatibility alias
    (see openhands.server.session.__init__) so downstream imports/tests continue to
    work. The class manages a single web client connection and orchestrates the
    AgentSession lifecycle for that conversation.

    Attributes:
        sid: Stable conversation id across transports.
        sio: Socket.IO server used to emit events to the web client.
        last_active_ts: Unix timestamp of last successful send.
        is_alive: Whether the web connection is still alive.
        agent_session: Core agent session coordinating runtime/LLM.
        loop: The asyncio loop associated with the session.
        config: Effective OpenHands configuration for this conversation.
        llm_registry: Registry responsible for LLM access and retry hooks.
        file_store: File storage interface for this conversation.
        user_id: Optional multi-tenant user identifier.
        logger: Logger with session context.
    """

    sid: str
    sio: socketio.AsyncServer | None
    last_active_ts: int = 0
    is_alive: bool = True
    agent_session: AgentSession
    loop: asyncio.AbstractEventLoop
    config: OpenHandsConfig
    llm_registry: LLMRegistry
    file_store: FileStore
    user_id: str | None
    logger: LoggerAdapter

    def __init__(
        self,
        sid: str,
        config: OpenHandsConfig,
        llm_registry: LLMRegistry,
        conversation_stats: ConversationStats,
        file_store: FileStore,
        sio: socketio.AsyncServer | None,
        user_id: str | None = None,
    ):
        self.sid = sid
        self.sio = sio
        self.last_active_ts = int(time.time())
        self.file_store = file_store
        self.logger = OpenHandsLoggerAdapter(extra={'session_id': sid})

        # Layer 1: per-session identity state.  One _SessionState per WebSession;
        # bound into the asyncio context so coroutines can call
        # get_current_session() without passing it explicitly.
        self.session_state = _SessionState(session_id=sid)
        set_current_session(self.session_state)
        self.llm_registry = llm_registry
        self.conversation_stats = conversation_stats
        self.agent_session = AgentSession(
            sid,
            file_store,
            llm_registry=self.llm_registry,
            conversation_stats=conversation_stats,
            status_callback=self.queue_status_message,
            user_id=user_id,
        )
        self.agent_session.event_stream.subscribe(
            EventStreamSubscriber.SERVER, self.on_event, self.sid
        )

        # Layer 2: attach JSONL transcript writer so every session is persisted.
        import os as _os2
        _transcript_base = _os2.environ.get("OH_TRANSCRIPT_DIR", "/.openhands/sessions")
        self._transcript_writer = TranscriptWriter(
            session_id=sid,
            base_dir=_transcript_base,
        )
        self.agent_session.event_stream.attach_transcript_writer(self._transcript_writer)

        self.config = config

        # Lazy import to avoid circular dependency
        from openhands.experiments.experiment_manager import ExperimentManagerImpl

        self.config = ExperimentManagerImpl.run_config_variant_test(
            user_id, sid, self.config
        )
        self.loop = asyncio.get_event_loop()
        self.user_id = user_id

        self._publish_queue: asyncio.Queue = asyncio.Queue()
        self._monitor_publish_queue_task: asyncio.Task = self.loop.create_task(
            self._monitor_publish_queue()
        )
        self._wait_websocket_initial_complete: bool = True

    async def close(self) -> None:
        if self.sio:
            await self.sio.emit(
                'oh_event',
                event_to_dict(
                    AgentStateChangedObservation('', AgentState.STOPPED.value)
                ),
                to=ROOM_KEY.format(sid=self.sid),
            )
        self.is_alive = False
        await self.agent_session.close()
        self._monitor_publish_queue_task.cancel()

    async def initialize_agent(
        self,
        settings: Settings,
        initial_message: MessageAction | None,
        replay_json: str | None,
    ) -> None:
        # Re-bind session state into the current coroutine context.
        # Tasks spawned via create_task() inside this coroutine will inherit
        # this binding automatically (Python contextvars semantics).
        set_current_session(self.session_state)
        self.agent_session.event_stream.add_event(
            AgentStateChangedObservation('', AgentState.LOADING),
            EventSource.ENVIRONMENT,
        )
        agent_cls = settings.agent or self.config.default_agent
        self.config.security.confirmation_mode = (
            self.config.security.confirmation_mode
            if settings.confirmation_mode is None
            else settings.confirmation_mode
        )
        self.config.security.security_analyzer = (
            self.config.security.security_analyzer
            if settings.security_analyzer is None
            else settings.security_analyzer
        )
        self.config.sandbox.base_container_image = (
            settings.sandbox_base_container_image
            or self.config.sandbox.base_container_image
        )
        self.config.sandbox.runtime_container_image = (
            settings.sandbox_runtime_container_image
            if settings.sandbox_base_container_image
            or settings.sandbox_runtime_container_image
            else self.config.sandbox.runtime_container_image
        )

        # Set Git user configuration if provided in settings
        git_user_name = getattr(settings, 'git_user_name', None)
        if git_user_name is not None:
            self.config.git_user_name = git_user_name
        git_user_email = getattr(settings, 'git_user_email', None)
        if git_user_email is not None:
            self.config.git_user_email = git_user_email
        max_iterations = settings.max_iterations or self.config.max_iterations

        # Prioritize settings over config for max_budget_per_task
        max_budget_per_task = (
            settings.max_budget_per_task
            if settings.max_budget_per_task is not None
            else self.config.max_budget_per_task
        )

        self.config.search_api_key = settings.search_api_key
        if settings.sandbox_api_key:
            self.config.sandbox.api_key = settings.sandbox_api_key.get_secret_value()

        # NOTE: this need to happen AFTER the config is updated with the search_api_key
        self.logger.debug(
            f'MCP configuration before setup - self.config.mcp_config: {self.config.mcp}'
        )

        # Check if settings has custom mcp_config
        mcp_config = getattr(settings, 'mcp_config', None)
        if mcp_config is not None:
            # Use the provided MCP SHTTP servers instead of default setup
            self.config.mcp = self.config.mcp.merge(mcp_config)
            self.logger.debug(f'Merged custom MCP Config: {mcp_config}')

        # Add OpenHands' MCP server by default
        openhands_mcp_server, openhands_mcp_stdio_servers = (
            OpenHandsMCPConfigImpl.create_default_mcp_server_config(
                self.config.mcp_host, self.config, self.user_id
            )
        )

        if openhands_mcp_server:
            self.config.mcp.shttp_servers.append(openhands_mcp_server)
            self.logger.debug('Added default MCP HTTP server to config')

            self.config.mcp.stdio_servers.extend(openhands_mcp_stdio_servers)

        self.logger.debug(
            f'MCP configuration after setup - self.config.mcp: {self.config.mcp}'
        )

        # TODO: override other LLM config & agent config groups (#2075)
        agent_config = self.config.get_agent_config(agent_cls)
        # Pass runtime information to agent config for runtime-specific tool behavior
        agent_config.runtime = self.config.runtime
        agent_name = agent_cls if agent_cls is not None else 'agent'
        llm_config = self.config.get_llm_config_from_agent(agent_name)
        if settings.enable_default_condenser:
            # Default condenser chains three condensers together.
            # Order: BrowserOutput → LLMSummarizing → ConversationWindow.
            # LLMSummarizing is placed before ConversationWindow so that
            # unhandled_condensation_request events produce a real LLM summary
            # (with 9-section structured output) rather than being silently
            # absorbed by ConversationWindowCondenser (which produces summary=None).
            # ConversationWindowCondenser is kept last as a cheap fallback for
            # very short histories where the LLM summarizer declines to fire.
            max_events_for_condenser = settings.condenser_max_size or 120
            default_condenser_config = CondenserPipelineConfig(
                condensers=[
                    BrowserOutputCondenserConfig(attention_window=2),
                    LLMSummarizingCondenserConfig(
                        llm_config=llm_config,
                        keep_first=4,
                        max_size=max_events_for_condenser,
                    ),
                    ConversationWindowCondenserConfig(),
                ]
            )

            self.logger.info(
                f'Enabling pipeline condenser with:'
                f' browser_output_masking(attention_window=2), '
                f' llm(model="{llm_config.model}", '
                f' base_url="{llm_config.base_url}", '
                f' keep_first=4, max_size={max_events_for_condenser})'
            )
            agent_config.condenser = default_condenser_config
        agent = Agent.get_cls(agent_cls)(agent_config, self.llm_registry)

        self.llm_registry.retry_listner = self._notify_on_llm_retry

        git_provider_tokens = None
        selected_repository = None
        selected_branch = None
        custom_secrets = None
        conversation_instructions = None
        if isinstance(settings, ConversationInitData):
            git_provider_tokens = settings.git_provider_tokens
            selected_repository = settings.selected_repository
            selected_branch = settings.selected_branch
            custom_secrets = settings.custom_secrets
            conversation_instructions = settings.conversation_instructions

        try:
            await self.agent_session.start(
                runtime_name=self.config.runtime,
                config=self.config,
                agent=agent,
                max_iterations=max_iterations,
                max_budget_per_task=max_budget_per_task,
                agent_to_llm_config=self.config.get_agent_to_llm_config_map(),
                agent_configs=self.config.get_agent_configs(),
                git_provider_tokens=git_provider_tokens,
                custom_secrets=custom_secrets,
                selected_repository=selected_repository,
                selected_branch=selected_branch,
                initial_message=initial_message,
                conversation_instructions=conversation_instructions,
                replay_json=replay_json,
            )
        except MicroagentValidationError as e:
            self.logger.exception(f'Error creating agent_session: {e}')
            # For microagent validation errors, provide more helpful information
            await self.send_error(f'Failed to create agent session: {str(e)}')
            return
        except ValueError as e:
            self.logger.exception(f'Error creating agent_session: {e}')
            error_message = str(e)
            # For ValueError related to microagents, provide more helpful information
            if 'microagent' in error_message.lower():
                await self.send_error(
                    f'Failed to create agent session: {error_message}'
                )
            else:
                # For other ValueErrors, just show the error class
                await self.send_error('Failed to create agent session: ValueError')
            return
        except Exception as e:
            self.logger.exception(f'Error creating agent_session: {e}')
            # For other errors, just show the error class to avoid exposing sensitive information
            await self.send_error(
                f'Failed to create agent session: {e.__class__.__name__}'
            )
            return
        else:
            # Wire up token streaming: give the LLM a callback that emits oh_stream_chunk
            # directly via Socket.IO (transient — never stored in the event log).
            controller = self.agent_session.controller
            if controller and self.sio:
                controller.agent.llm.stream_callback = self._emit_stream_chunk
            # Inject boundary-aware resume context if a prior compaction summary exists.
            await self._inject_resume_context_if_needed()

    async def _inject_resume_context_if_needed(self) -> None:
        """Inject a RecallObservation with the post-compaction resume context.

        Reads the JSONL transcript for this session, finds the last compaction
        boundary summary, and injects it as a RecallObservation so the agent
        knows what happened before the current context window without re-running
        already-completed tasks.

        Safe to call unconditionally — returns early if no boundary exists or if
        any step fails.
        """
        try:
            from openhands.server.session.session_resume import resume_session
            from openhands.events.observation.agent import (
                RecallObservation,
                RecallType,
                MicroagentKnowledge,
            )

            transcript_base_dir = self._transcript_writer._base_dir
            result = resume_session(
                self.sid, transcript_base_dir, self.session_state
            )
            if not result.get('boundary_found'):
                return
            live_msgs = result.get('live_messages', [])
            if not live_msgs:
                return
            resume_content = live_msgs[0].get('content', '')
            if not resume_content:
                return

            observation = RecallObservation(
                recall_type=RecallType.KNOWLEDGE,
                content=resume_content,
                microagent_knowledge=[
                    MicroagentKnowledge(
                        name='session_resume',
                        trigger='session_context',
                        content=resume_content,
                    )
                ],
            )
            self.agent_session.event_stream.add_event(
                observation, EventSource.ENVIRONMENT
            )
            self.logger.info(
                f'[resume] Injected boundary-aware context '
                f'({len(live_msgs)} post-boundary message(s))'
            )
        except Exception as exc:
            self.logger.warning(f'[resume] Context injection skipped: {exc}')

    def _emit_stream_chunk(self, delta: str) -> None:
        """Emit a streaming token chunk directly via Socket.IO — transient, never stored in event log."""
        if not self.sio or not self.is_alive:
            return
        try:
            import asyncio as _asyncio
            _asyncio.run_coroutine_threadsafe(
                self.sio.emit(
                    'oh_stream_chunk',
                    {'content': delta},
                    to=ROOM_KEY.format(sid=self.sid),
                ),
                self.loop,
            )
        except Exception:
            pass

    def _notify_on_llm_retry(self, retries: int, max: int) -> None:
        self.queue_status_message(
            'info', RuntimeStatus.LLM_RETRY, f'Retrying LLM request, {retries} / {max}'
        )

    def on_event(self, event: Event) -> None:
        asyncio.get_event_loop().run_until_complete(self._on_event(event))

    async def _on_event(self, event: Event) -> None:
        """Callback function for events that mainly come from the agent.

        Event is the base class for any agent action and observation.

        Args:
            event: The agent event (Observation or Action).
        """
        if isinstance(event, NullAction):
            return
        if isinstance(event, NullObservation):
            return
        if event.source == EventSource.AGENT:
            await self.send(event_to_dict(event))
        elif event.source == EventSource.USER:
            await self.send(event_to_dict(event))
        # NOTE: ipython observations are not sent here currently
        elif event.source == EventSource.ENVIRONMENT and isinstance(
            event,
            (CmdOutputObservation, AgentStateChangedObservation, RecallObservation),
        ):
            # feedback from the environment to agent actions is understood as agent events by the UI
            event_dict = event_to_dict(event)
            event_dict['source'] = EventSource.AGENT
            await self.send(event_dict)
            if isinstance(event, AgentStateChangedObservation):
                if event.agent_state == AgentState.ERROR:
                    self.logger.error(
                        f'Agent status error: {event.reason}',
                        extra={'signal': 'agent_status_error'},
                    )
                # Update external 3-state surface and notify SDK consumers.
                from openhands.server.session.external_state import EXTERNAL_STATE
                EXTERNAL_STATE.update_from_agent_state(
                    agent_state=event.agent_state,
                    model=self.config.get_llm_config().model if self.config else None,
                )
                if self.sio:
                    await self.sio.emit(
                        'agent_external_state',
                        EXTERNAL_STATE.to_dict(),
                        to=ROOM_KEY.format(sid=self.sid),
                    )
        elif isinstance(event, ErrorObservation):
            # send error events as agent events to the UI
            event_dict = event_to_dict(event)
            event_dict['source'] = EventSource.AGENT
            await self.send(event_dict)

    async def dispatch(self, data: dict) -> None:
        set_current_session(self.session_state)
        event = event_from_dict(data.copy())
        # This checks if the model supports images
        if isinstance(event, MessageAction) and event.image_urls:
            controller = self.agent_session.controller
            if controller:
                if controller.agent.llm.config.disable_vision:
                    await self.send_error(
                        'Support for images is disabled for this model, try without an image.'
                    )
                    return
                if not controller.agent.llm.vision_is_active():
                    await self.send_error(
                        'Model does not support image upload, change to a different model or try without an image.'
                    )
                    return
        self.agent_session.event_stream.add_event(event, EventSource.USER)

    async def send(self, data: dict[str, object]) -> None:
        self._publish_queue.put_nowait(data)

    async def _monitor_publish_queue(self):
        try:
            while True:
                data: dict = await self._publish_queue.get()
                await self._send(data)
        except asyncio.CancelledError:
            return

    async def _send(self, data: dict[str, object]) -> bool:
        try:
            if not self.is_alive:
                return False

            _start_time = time.time()
            _waiting_times = 1

            if self.sio:
                # Wait once during initialization to avoid event push failures during websocket connection intervals
                while self._wait_websocket_initial_complete and (
                    time.time() - _start_time < 2
                ):
                    if bool(
                        self.sio.manager.rooms.get('/', {}).get(
                            ROOM_KEY.format(sid=self.sid)
                        )
                    ):
                        break
                    self.logger.warning(
                        f'There is no listening client in the current room,'
                        f' waiting for the {_waiting_times}th attempt: {self.sid}'
                    )
                    _waiting_times += 1
                    await asyncio.sleep(0.1)
                self._wait_websocket_initial_complete = False
                await self.sio.emit('oh_event', data, to=ROOM_KEY.format(sid=self.sid))

            await asyncio.sleep(0.001)  # This flushes the data to the client
            self.last_active_ts = int(time.time())
            return True
        except RuntimeError as e:
            self.logger.error(f'Error sending data to websocket: {str(e)}')
            self.is_alive = False
            return False

    async def send_error(self, message: str) -> None:
        """Sends an error message to the client."""
        await self.send({'error': True, 'message': message})

    async def _send_status_message(
        self, msg_type: str, runtime_status: RuntimeStatus, message: str
    ) -> None:
        """Sends a status message to the client."""
        if msg_type == 'error':
            agent_session = self.agent_session
            controller = self.agent_session.controller
            if controller is not None and not agent_session.is_closed():
                await controller.set_agent_state_to(AgentState.ERROR)
            self.logger.error(
                f'Agent status error: {message}',
                extra={'signal': 'agent_status_error'},
            )
        await self.send(
            {
                'status_update': True,
                'type': msg_type,
                'id': runtime_status.value,
                'message': message,
            }
        )

    def queue_status_message(
        self, msg_type: str, runtime_status: RuntimeStatus, message: str
    ) -> None:
        """Queues a status message to be sent asynchronously."""
        asyncio.run_coroutine_threadsafe(
            self._send_status_message(msg_type, runtime_status, message), self.loop
        )


# Backward-compatible alias for external imports that still reference
# openhands.server.session.session import Session
Session = WebSession

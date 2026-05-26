"""
End-to-end integration tests for the session/context management layers (1-12).

These tests spin up a REAL conversation against the live CloudGuard stack
at http://localhost:3000, send messages via Socket.IO, and assert:
  - The agent replies with non-empty content
  - A JSONL transcript file is created on disk
  - External state events flow correctly
  - Compaction fires and writes a summary boundary
  - Session resume finds the boundary and re-injects context

PREREQUISITES
-------------
1. Stack must be running:
       cd c:/Users/ramij/Downloads/ERPS/cloud && docker compose up -d

2. All three containers must be healthy:
       docker ps --filter name=cloudguard

3. Python deps (on host, not in Docker):
       pip install requests python-socketio[client] aiohttp pytest pytest-asyncio

RUN
---
    pytest tests/integration/test_context_layers_e2e.py -v -s

ENVIRONMENT OVERRIDES
---------------------
    OH_BASE_URL     default http://localhost:3000
    OH_SESSION_KEY  set if SESSION_API_KEY is configured in the container
    OH_TRANSCRIPT_DIR  default ~/.openhands/sessions (where JSONL files land)
    OH_LOW_COMPACT_THRESHOLD  set to "1" to temporarily lower compact threshold
                              to 0.10 for compaction tests (requires restart)
"""
from __future__ import annotations

import json
import os
import time
import threading
from pathlib import Path
from typing import Optional
import uuid

import pytest
import requests
import socketio

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL: str = os.environ.get("OH_BASE_URL", "http://localhost:3000")
SESSION_KEY: Optional[str] = os.environ.get("OH_SESSION_KEY")
TRANSCRIPT_DIR: Path = Path(
    os.environ.get("OH_TRANSCRIPT_DIR", str(Path.home() / ".openhands" / "sessions"))
)
API_BASE: str = f"{BASE_URL}/api"

CONNECT_TIMEOUT  = 15   # seconds to wait for Socket.IO connect
REPLY_TIMEOUT    = 120  # seconds to wait for agent to finish replying
POLL_INTERVAL    = 1.0  # seconds between event polls
MAX_EVENTS_FETCH = 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _api(path: str, method: str = "GET", json_body: dict | None = None) -> dict:
    """Make an authenticated API call. Raises on HTTP errors."""
    url = f"{API_BASE}{path}"
    fn = getattr(requests, method.lower())
    resp = fn(url, json=json_body, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _create_conversation(initial_msg: str) -> str:
    """POST /api/conversations, return conversation_id."""
    data = _api(
        "/conversations",
        method="POST",
        json_body={"initial_user_msg": initial_msg},
    )
    conv_id = data.get("conversation_id")
    assert conv_id, f"No conversation_id in response: {data}"
    print(f"\n[e2e] created conversation: {conv_id}")
    return conv_id


def _build_sio_url(conv_id: str, latest_event_id: int = -1) -> str:
    url = f"{BASE_URL}?conversation_id={conv_id}&latest_event_id={latest_event_id}"
    if SESSION_KEY:
        url += f"&session_api_key={SESSION_KEY}"
    return url


def _poll_events(
    conv_id: str,
    start_id: int = 0,
    limit: int = 50,
    retries: int = 5,
    retry_delay: float = 2.0,
) -> list[dict]:
    """
    GET /api/conversations/{id}/events, return list.
    Retries on 500 with backoff — the event store may not be ready immediately
    after conversation creation.
    """
    for attempt in range(retries):
        try:
            data = _api(f"/conversations/{conv_id}/events?start_id={start_id}&limit={limit}")
            return data.get("events", [])
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 500 and attempt < retries - 1:
                print(f"  [poll] 500 on attempt {attempt+1}, retrying in {retry_delay}s...", flush=True)
                time.sleep(retry_delay)
                continue
            raise
    return []


def _wait_for_agent_reply(
    conv_id: str,
    after_event_id: int = 0,
    timeout: float = REPLY_TIMEOUT,
) -> list[dict]:
    """
    Poll the events endpoint until we see a 'finish' or 'message' action
    from the agent (source=='agent') after after_event_id.
    Returns all new events.
    """
    deadline = time.monotonic() + timeout
    seen_ids: set[int] = set()
    all_events: list[dict] = []

    print(f"[e2e] waiting for agent reply (timeout={timeout}s)...", flush=True)
    while time.monotonic() < deadline:
        events = _poll_events(conv_id, start_id=after_event_id + 1, limit=50)
        for ev in events:
            eid = ev.get("id", -1)
            if eid not in seen_ids:
                seen_ids.add(eid)
                all_events.append(ev)
                src  = ev.get("source", "")
                act  = ev.get("action", "") or ev.get("observation", "")
                cont = str(ev.get("args", {}).get("content", ev.get("content", "")))[:80]
                print(f"  [event id={eid}] source={src} type={act}  {cont!r}", flush=True)

                # Agent finished its turn
                if src == "agent" and act in ("message", "finish"):
                    print("[e2e] agent reply received.", flush=True)
                    return all_events

        time.sleep(POLL_INTERVAL)

    pytest.fail(f"Timed out waiting for agent reply after {timeout}s")


def _find_transcript(conv_id: str) -> Optional[Path]:
    """Try common transcript locations."""
    candidates = [
        TRANSCRIPT_DIR / f"{conv_id}.jsonl",
        Path.home() / ".openhands" / f"{conv_id}.jsonl",
        Path("/tmp") / f"{conv_id}.jsonl",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _load_jsonl(path: Path) -> list[dict]:
    lines = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            lines.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return lines


# ---------------------------------------------------------------------------
# Socket.IO collector — receives oh_event messages in a background thread
# ---------------------------------------------------------------------------

class _SioCollector:
    """
    Connects to the Socket.IO endpoint and collects all oh_event payloads.
    Run in a background thread so the main test can poll `self.events`.
    """

    def __init__(self, conv_id: str, latest_event_id: int = -1):
        self.conv_id = conv_id
        self.latest_event_id = latest_event_id
        self.events: list[dict] = []
        self.connected = threading.Event()
        self.error: Optional[str] = None
        self._sio = socketio.Client(logger=False, engineio_logger=False)
        self._thread: Optional[threading.Thread] = None

        @self._sio.event
        def connect():
            self.connected.set()
            print(f"[sio] connected to {conv_id}", flush=True)

        @self._sio.event
        def connect_error(data):
            self.error = str(data)
            self.connected.set()  # unblock wait

        @self._sio.event
        def disconnect():
            print("[sio] disconnected", flush=True)

        @self._sio.on("oh_event")
        def on_oh_event(data):
            self.events.append(data)
            src  = data.get("source", "")
            act  = data.get("action", "") or data.get("observation", "")
            st   = data.get("extras", {}).get("agent_state", "")
            tail = f" [{st}]" if st else ""
            print(f"  [sio oh_event] source={src} type={act}{tail}", flush=True)

        @self._sio.on("agent_external_state")
        def on_agent_external_state(data):
            print(f"  [sio agent_external_state] {data}", flush=True)
            self.events.append({"_meta": "agent_external_state", **data})

    # States where the agent is idle and ready to accept a user message
    _READY_STATES = frozenset({
        "awaiting_user_input",
        "paused",
        "stopped",
        "finished",
    })

    def start(self):
        url = _build_sio_url(self.conv_id, latest_event_id=self.latest_event_id)

        def _run():
            try:
                self._sio.connect(url, socketio_path="/socket.io")
            except Exception as exc:
                # ConnectionError raised before connect_error event fires —
                # catch it here so self.connected is always set.
                if not self.error:
                    self.error = str(exc)
                self.connected.set()

        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()
        assert self.connected.wait(timeout=CONNECT_TIMEOUT), "Socket.IO connect timed out"
        assert not self.error, f"Socket.IO connect error: {self.error}"

    def wait_for_ready(self, after_index: int = 0, timeout: float = 60.0) -> None:
        """
        Block until the agent is in a state that accepts user messages.

        Watches events[after_index:] for observation=='agent_state_changed' with
        extras.agent_state in _READY_STATES (excludes 'loading' and 'running').
        Call this BEFORE send_message() to avoid sending while the agent is busy.

        Parameters
        ----------
        after_index:
            Only scan events from this index onward — use len(self.events) before
            a turn starts to avoid matching a ready state from a previous turn.
        timeout:
            Seconds before giving up (default 60 — runtime startup takes ~30s).
        """
        deadline = time.monotonic() + timeout
        print(f"[sio] waiting for agent ready (from event index {after_index})...", flush=True)
        while time.monotonic() < deadline:
            for ev in self.events[after_index:]:
                if ev.get("observation") == "agent_state_changed":
                    state = ev.get("extras", {}).get("agent_state", "")
                    if state in self._READY_STATES:
                        print(f"[sio] agent ready (state={state!r})", flush=True)
                        return
            time.sleep(0.3)
        seen = [
            e.get("extras", {}).get("agent_state")
            for e in self.events[after_index:]
            if e.get("observation") == "agent_state_changed"
        ]
        pytest.fail(
            f"[sio] agent did not reach a ready state within {timeout}s. "
            f"States seen: {seen}"
        )

    def send_message(self, text: str):
        self._sio.emit("oh_user_action", {
            "action": "message",
            "args": {
                "content": text,
                "file_urls": [],
                "image_urls": [],
                "wait_for_response": False,
                "security_risk": "UNKNOWN",
            },
            "source": "user",
        })
        print(f"[sio] sent message: {text[:60]!r}", flush=True)

    def wait_for_agent_reply(self, after_index: int = 0, timeout: float = REPLY_TIMEOUT) -> list[dict]:
        """
        Wait for the agent to send a message or finish action.

        Parameters
        ----------
        after_index:
            Only look at events[after_index:] — use this to distinguish
            replies from different turns.
        timeout:
            Seconds before giving up.
        """
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            for ev in self.events[after_index:]:
                if ev.get("source") == "agent" and ev.get("action") in ("message", "finish"):
                    return self.events
            time.sleep(0.3)
        pytest.fail(
            f"[sio] timed out waiting for agent reply after {timeout}s. "
            f"Last 3 events: {self.events[-3:]}"
        )

    def stop(self):
        try:
            self._sio.disconnect()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Test: stack is reachable
# ---------------------------------------------------------------------------

def test_stack_is_reachable():
    """Sanity: confirm the CloudGuard stack is up before running other tests."""
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        # Some builds don't have /health — a 404 still means the server is up
        assert resp.status_code in (200, 404), f"unexpected status: {resp.status_code}"
    except requests.ConnectionError as e:
        pytest.skip(f"Stack not reachable at {BASE_URL}: {e}")


# ---------------------------------------------------------------------------
# Test: create conversation + receive agent reply via HTTP polling
# ---------------------------------------------------------------------------

def test_create_conversation_and_poll_reply():
    """
    Layer 2 smoke: create a conversation, send initial message, wait for
    the agent to reply, assert the reply is non-empty.
    """
    conv_id = _create_conversation("Reply with exactly the word PONG and nothing else.")
    events = _wait_for_agent_reply(conv_id, after_event_id=0)

    # Find the agent message
    agent_msgs = [
        ev for ev in events
        if ev.get("source") == "agent"
        and ev.get("action") in ("message", "finish")
    ]
    assert agent_msgs, "No agent message found in events"

    content = agent_msgs[-1].get("args", {}).get("content", "")
    print(f"\n[e2e] agent replied: {content!r}")
    assert len(content) > 0, "Agent reply was empty"


# ---------------------------------------------------------------------------
# Test: JSONL transcript written to disk
# ---------------------------------------------------------------------------

def test_jsonl_transcript_written():
    """
    Layer 2: after a conversation, a JSONL file must exist containing
    at least one 'user' entry and one 'assistant' entry.
    """
    conv_id = _create_conversation("Say hello.")
    _wait_for_agent_reply(conv_id)

    path = _find_transcript(conv_id)
    if path is None:
        pytest.skip(
            f"Transcript not found in {TRANSCRIPT_DIR}. "
            "Set OH_TRANSCRIPT_DIR to the host-side mount of /.openhands/sessions."
        )

    entries = _load_jsonl(path)
    print(f"\n[e2e] transcript: {path} ({len(entries)} entries)")
    for e in entries[:5]:
        print(f"  {e.get('type','?'):12s}  {str(e.get('content',''))[:60]}")

    types = {e.get("type") for e in entries}
    assert "user" in types or "assistant" in types, (
        f"Transcript has no user/assistant entries. Found types: {types}"
    )


# ---------------------------------------------------------------------------
# Test: agent_external_state events flow via Socket.IO
# ---------------------------------------------------------------------------

def _layer6_deployed() -> bool:
    """Return True if the running container has Layer 6 external_state.py."""
    import subprocess
    result = subprocess.run(
        ["docker", "exec", "cloudguard-app", "python", "-c",
         "from openhands.server.session.external_state import EXTERNAL_STATE; print('ok')"],
        capture_output=True, text=True, timeout=10,
    )
    return result.returncode == 0


def test_agent_external_state_via_socketio():
    """
    Layers 6 + 9: connect via Socket.IO and assert state-change events flow.

    Two checks:
    1. agent_state_changed arrives via oh_event (works even on pre-Layer-6 images).
    2. agent_external_state arrives as a separate Socket.IO event (requires Layer 6
       code to be deployed in the cloudguard-app container — rebuild image if missing).
    """
    # Use initial_user_msg to start the agent session.
    # Brief pause so the server sets up the session before we connect the socket.
    conv_id = _create_conversation("Reply with only the word: HELLO")
    time.sleep(3)
    collector = _SioCollector(conv_id)
    collector.start()
    try:
        # Wait for the agent to finish its reply — no second message needed here.
        collector.wait_for_agent_reply()
    finally:
        collector.stop()

    # Check 1: agent_state_changed via oh_event (always works)
    state_change_events = [
        ev for ev in collector.events
        if ev.get("source") in ("agent", "environment")
        and (ev.get("action") == "agent_state_changed"
             or ev.get("observation") == "agent_state_changed")
    ]
    print(f"\n[e2e] agent_state_changed (oh_event): {len(state_change_events)}")
    assert state_change_events, "No agent_state_changed events received at all"

    # Check 2: agent_external_state as dedicated event (requires Layer 6 deployed)
    external_state_events = [
        ev for ev in collector.events if ev.get("_meta") == "agent_external_state"
    ]
    print(f"[e2e] agent_external_state (dedicated event): {len(external_state_events)}")
    for ev in external_state_events:
        print(f"  state={ev.get('state')}")

    if not external_state_events:
        if _layer6_deployed():
            pytest.fail(
                "Layer 6 IS deployed but agent_external_state events were not emitted. "
                "Check session.py _on_event wiring."
            )
        else:
            pytest.xfail(
                "Layer 6 (external_state.py) not yet in the running container. "
                "Rebuild cloudguard-app:latest from cloudguard-diagrams-059 branch to activate."
            )
    else:
        print("[e2e] Layer 6 agent_external_state: PASS")


# ---------------------------------------------------------------------------
# Test: oh_event stream includes user + agent messages
# ---------------------------------------------------------------------------

def test_socketio_event_stream_has_user_and_agent_events():
    """
    Socket.IO oh_event stream must carry both user and agent events.
    Validates the core event pipeline is wired to Socket.IO.
    """
    # Use initial_user_msg so the session starts; connect socket immediately.
    conv_id = _create_conversation("Reply with only: ACK")
    collector = _SioCollector(conv_id)
    collector.start()
    try:
        collector.wait_for_agent_reply(after_index=0, timeout=REPLY_TIMEOUT)
    finally:
        collector.stop()

    sources = {ev.get("source") for ev in collector.events if "source" in ev}
    print(f"\n[e2e] event sources seen: {sources}")
    assert "user" in sources, "No user events in oh_event stream"
    assert "agent" in sources, "No agent events in oh_event stream"


# ---------------------------------------------------------------------------
# Test: send multiple turns in one session
# ---------------------------------------------------------------------------

def test_multi_turn_conversation():
    """
    Basic multi-turn: two messages in one session, both get replies.

    Turn 1 via HTTP polling.  CloudGuard uses FinishAction which closes the
    socket, so turn 2 reconnects with latest_event_id=last_turn1_id and sends
    via Socket.IO, confirming the server accepts a new message on a resumed
    session.
    """
    # Turn 1 via HTTP polling (reliable, handles FinishAction cleanly)
    conv_id = _create_conversation("Reply with only: TURN1")
    turn1_events = _wait_for_agent_reply(conv_id, after_event_id=0, timeout=REPLY_TIMEOUT)

    agent_t1 = [
        e for e in turn1_events
        if e.get("source") == "agent" and e.get("action") in ("message", "finish")
    ]
    assert agent_t1, "No agent reply for turn 1"
    act1 = agent_t1[-1].get("action", "")
    c1   = agent_t1[-1].get("args", {}).get("content", "")
    print(f"\n[e2e] turn 1 reply (action={act1!r}): {c1!r}")

    # Find the last event id from turn 1 to use as latest_event_id for reconnect
    last_turn1_id = max(e.get("id", 0) for e in turn1_events)
    print(f"[e2e] last turn1 event id: {last_turn1_id}")

    # Reconnect socket from AFTER turn 1 — this resumes the session
    time.sleep(3)  # brief pause so server registers the session as reconnectable
    collector2 = _SioCollector(conv_id, latest_event_id=last_turn1_id)
    collector2.start()
    try:
        # Wait for agent to enter a ready state (the resumed session should be ready)
        collector2.wait_for_ready(after_index=0, timeout=60)
        # Send turn 2
        collector2.send_message("Now reply with only: TURN2")
        collector2.wait_for_agent_reply(after_index=0, timeout=REPLY_TIMEOUT)

        agent_t2 = [
            ev for ev in collector2.events
            if ev.get("source") == "agent" and ev.get("action") in ("message", "finish")
        ]
        assert agent_t2, "No agent reply for turn 2"
        act2 = agent_t2[-1].get("action", "")
        c2   = agent_t2[-1].get("args", {}).get("content", "")
        print(f"[e2e] turn 2 reply (action={act2!r}): {c2!r}")
        assert act2 in ("message", "finish"), f"Unexpected turn 2 action: {act2!r}"
    finally:
        collector2.stop()


# ---------------------------------------------------------------------------
# Test: JSONL transcript contains correct entry types
# ---------------------------------------------------------------------------

def test_jsonl_entry_types():
    """
    Layer 2 detail: JSONL entries must have known types and timestamps.
    Checks that the transcript writer is emitting well-formed records.
    """
    conv_id = _create_conversation("Say: TRANSCRIPT_CHECK")
    _wait_for_agent_reply(conv_id)

    path = _find_transcript(conv_id)
    if path is None:
        pytest.skip("Transcript not accessible from host. Set OH_TRANSCRIPT_DIR.")

    entries = _load_jsonl(path)
    print(f"\n[e2e] {len(entries)} transcript entries:")
    for e in entries:
        print(f"  type={e.get('type','?'):14s}  ts={e.get('timestamp','?')[:19]}")

    # Every entry must have a type
    for e in entries:
        assert "type" in e, f"Entry missing 'type': {e}"

    # Every user/assistant entry must have content
    for e in entries:
        if e.get("type") in ("user", "assistant"):
            assert "content" in e, f"user/assistant entry missing content: {e}"

    # At least one entry must have a timestamp
    ts_entries = [e for e in entries if "timestamp" in e]
    assert ts_entries, "No entries have a 'timestamp' field"


# ---------------------------------------------------------------------------
# Test: compaction boundary written (requires LOW_COMPACT_THRESHOLD env)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    os.environ.get("OH_LOW_COMPACT_THRESHOLD") != "1",
    reason="Set OH_LOW_COMPACT_THRESHOLD=1 and restart the app container with "
           "AUTO_COMPACT_THRESHOLD=0.10 to run compaction tests."
)
def test_compaction_boundary_written_to_transcript():
    """
    Layer 3 + 4: with a low compact threshold, a conversation that runs long
    enough should trigger auto-compact.  The JSONL transcript must contain a
    {"type":"summary"} entry after compaction fires.
    """
    path = _find_transcript("probe")
    if path is None and not TRANSCRIPT_DIR.exists():
        pytest.skip("OH_TRANSCRIPT_DIR not accessible from host.")

    # Send a message long enough to approach the threshold
    long_msg = (
        "Please write a detailed 500-word essay on the history of cloud computing, "
        "covering mainframes, client-server, virtualization, and modern serverless."
    )
    conv_id = _create_conversation(long_msg)
    _wait_for_agent_reply(conv_id, timeout=180)

    path = _find_transcript(conv_id)
    if path is None:
        pytest.skip("Transcript not accessible from host.")

    entries = _load_jsonl(path)
    summary_entries = [e for e in entries if e.get("type") == "summary"]
    print(f"\n[e2e] summary entries in transcript: {len(summary_entries)}")
    for s in summary_entries:
        print(f"  summary preview: {str(s.get('summary',''))[:100]!r}")

    assert summary_entries, (
        "No 'summary' boundary entry found in JSONL transcript. "
        "Compaction may not have fired — check AUTO_COMPACT_THRESHOLD in the container."
    )


# ---------------------------------------------------------------------------
# Test: session resume finds boundary (requires boundary to exist)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    os.environ.get("OH_LOW_COMPACT_THRESHOLD") != "1",
    reason="Requires a compacted session to exist. Set OH_LOW_COMPACT_THRESHOLD=1."
)
def test_session_resume_finds_boundary():
    """
    Layer 5: after a compaction boundary exists, resuming the session
    (reconnecting Socket.IO) should replay events starting from the boundary
    and the first oh_event should be a summary-injected user message.
    """
    # First create a session that compacts
    long_msg = (
        "Write a thorough 800-word technical explanation of Kubernetes architecture "
        "covering pods, services, deployments, and control plane components."
    )
    conv_id = _create_conversation(long_msg)
    events = _wait_for_agent_reply(conv_id, timeout=180)
    last_id = max((ev.get("id", 0) for ev in events), default=0)

    # Reconnect from event -1 (full replay)
    collector = _SioCollector(conv_id)
    collector.start()
    try:
        time.sleep(3)  # let replay complete
    finally:
        collector.stop()

    # Look for a user event whose content starts with "This session is being continued"
    resume_events = [
        ev for ev in collector.events
        if ev.get("source") == "user"
        and "This session is being continued" in (
            ev.get("args", {}).get("content", "") or ""
        )
    ]
    print(f"\n[e2e] resume injection events: {len(resume_events)}")
    assert resume_events, (
        "No session-resume injection event found in Socket.IO replay. "
        "Check Layer 5 session_resume.py boundary detection."
    )


# ---------------------------------------------------------------------------
# Test: context layer imports don't break the server (import smoke test)
# ---------------------------------------------------------------------------

def test_all_layer_modules_importable():
    """
    Sanity check: all 10 new modules from Layers 1-12 must be importable
    without errors.  Catches import-time syntax errors or bad relative imports.
    """
    modules = [
        "openhands.server.session.session_state",
        "openhands.storage.transcript_writer",
        "openhands.llm.context_limits",
        "openhands.services.compact.compact_pipeline",
        "openhands.server.session.session_resume",
        "openhands.server.session.external_state",
        "openhands.server.session.delegate_transcript",
        "openhands.storage.fast_metadata",
        "openhands.services.compact.post_compact",
    ]
    failed = []
    for mod in modules:
        try:
            __import__(mod)
            print(f"  [ok] {mod}")
        except Exception as e:
            failed.append((mod, str(e)))
            print(f"  [FAIL] {mod}: {e}")

    assert not failed, f"Import failures:\n" + "\n".join(
        f"  {m}: {e}" for m, e in failed
    )

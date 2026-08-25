import React from "react";

/**
 * Autosave for the artifact editors — markdown, diagrams, and anything else
 * holding unsaved bytes in a tab that can be closed at any moment.
 *
 * TWO TIERS, AND THE REASON IS THE VERSIONED STORE
 * ────────────────────────────────────────────────
 * Every durable write to the library mints a NEW REVISION. A naive autosave
 * that saved on a two-second debounce would therefore produce a version history
 * of several hundred entries per editing session, which destroys the one feature
 * the history exists for: being able to find the meaningful earlier state of a
 * document. Autosave must not make version history unusable in the name of not
 * losing work.
 *
 * So there are two tiers:
 *
 *   LOCAL DRAFT   — every change, debounced a few hundred ms, into
 *                   `localStorage`. Free, private to the browser, mints no
 *                   version. This is what survives a crash, a killed tab, a
 *                   lost connection, or a machine that simply goes away.
 *   DURABLE SAVE  — after a real pause in typing, and on every signal that the
 *                   page is going away. This is the one that writes to the
 *                   store and creates a revision.
 *
 * A draft is deleted only once a durable save for the same content succeeds, so
 * there is never a moment where neither tier holds the work.
 *
 * WHY `pagehide` AND `visibilitychange`, NOT `beforeunload`
 * ─────────────────────────────────────────────────────────
 * `beforeunload` does not fire reliably on mobile, on tab discard, or when the
 * browser kills a background tab, and work started inside it is routinely
 * cancelled. `visibilitychange → hidden` and `pagehide` are the two the platform
 * actually guarantees, and they are the last point at which anything can be
 * done. The flush issued there uses `keepalive`, which lets a request outlive
 * the document that started it — the only way a save survives the tab closing
 * mid-flight.
 *
 * `keepalive` is capped at 64 KB by the spec. A document larger than that cannot
 * be flushed on the way out, which is precisely why the local draft is not an
 * optimisation but the load-bearing half of this design.
 */

/* ------------------------------------------------------------------ *
 * The server-side draft tier
 * ------------------------------------------------------------------ */

/**
 * Post the draft to the server, with a queue that outlives the page.
 *
 * WHY A THIRD TIER EXISTS. The `localStorage` draft survives a killed tab, but
 * only on THAT machine in THAT browser — and it cannot help at all if the
 * machine itself does not come back. `POST /vfs/draft` puts the same bytes
 * somewhere durable, and a background worker on the server promotes the last
 * one into a real version once the editing stops.
 *
 * WHY IT IS QUEUED RATHER THAN AWAITED. The case this is for is a network that
 * is not there: an autosave issued into a dead connection has to be retried, and
 * the retry has to survive the reload that often follows. So every attempt is
 * appended to a small queue in `localStorage` first, and a sender drains it with
 * backoff — on a timer, when the browser reports it is back online, and once at
 * startup for anything a previous session left behind.
 *
 * `seq` is monotonic per document and the server discards anything not newer, so
 * a retry that arrives after a later save cannot overwrite it.
 */
const OUTBOX_KEY = "cg-draft-outbox";
const OUTBOX_CAP = 24;

interface Outgoing {
  path: string;
  store: string;
  conversationId: string;
  contentB64: string;
  mime: string;
  seq: number;
}

function readOutbox(): Outgoing[] {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? (JSON.parse(raw) as Outgoing[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: Outgoing[]): void {
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — the durable save path still applies */
  }
}

/** Queue one draft. Supersedes any earlier queued draft for the SAME document:
 *  only the newest matters, and keeping the others would replay stale bytes. */
function enqueue(item: Outgoing): void {
  const rest = readOutbox().filter(
    (q) => !(q.path === item.path && q.store === item.store),
  );
  writeOutbox([...rest, item].slice(-OUTBOX_CAP));
}

function encodeUtf8ToB64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    // Chunked: `String.fromCharCode(...bytes)` throws RangeError on a document
    // of any real size.
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function sameItem(a: Outgoing, b: Outgoing): boolean {
  return a.path === b.path && a.store === b.store && a.seq === b.seq;
}

async function postDraft(item: Outgoing): Promise<boolean> {
  try {
    const res = await fetch("/api/cloudguard/vfs/draft", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: item.conversationId,
        path: item.path,
        content_b64: item.contentB64,
        mime: item.mime,
        store: item.store,
        seq: item.seq,
      }),
    });
    // 4xx is not retryable — a rejected draft retried forever is a busy loop
    // against an endpoint that will keep saying no. Drop it and move on.
    return res.ok || (res.status >= 400 && res.status < 500);
  } catch {
    return false;
  }
}

let draining = false;

/** Drain the queue. Safe to call often; only one drain runs at a time. */
export async function flushDraftOutbox(): Promise<void> {
  if (draining || !navigator.onLine) return;
  draining = true;
  try {
    // Re-read between sends: an editor may enqueue while this is running, and
    // writing back a snapshot taken before that would drop the newer draft.
    for (let guard = 0; guard < OUTBOX_CAP; guard += 1) {
      const queue = readOutbox();
      const item = queue[0];
      if (!item) return;
      // eslint-disable-next-line no-await-in-loop -- sequential by design
      const ok = await postDraft(item);
      if (!ok) return; // still offline or the server is down; try again later
      writeOutbox(
        readOutbox().filter((q) => q !== queue[0] && !sameItem(q, item)),
      );
    }
  } finally {
    draining = false;
  }
}

/**
 * The last-gasp send, for `pagehide`.
 *
 * `sendBeacon` rather than `fetch(keepalive)`: the browser takes ownership of a
 * beacon and delivers it after the document is gone, which is the one thing a
 * normal request cannot promise during unload. It is fire-and-forget, so the
 * queued copy is left in place and cleared on the next successful drain — a
 * duplicate draft is harmless (the server compares `seq`), a lost one is not.
 */
function beaconDraft(item: Outgoing): boolean {
  try {
    const blob = new Blob(
      [
        JSON.stringify({
          conversation_id: item.conversationId,
          path: item.path,
          content_b64: item.contentB64,
          mime: item.mime,
          store: item.store,
          seq: item.seq,
        }),
      ],
      { type: "application/json" },
    );
    return navigator.sendBeacon?.("/api/cloudguard/vfs/draft", blob) ?? false;
  } catch {
    return false;
  }
}

// Retry whatever a previous session could not deliver, and again whenever the
// browser says the network came back. Registered once at module load rather
// than per editor, because the queue is shared and one drainer is enough.
if (typeof window !== "undefined") {
  const drain = () => {
    flushDraftOutbox().catch(() => {
      /* the queue survives; the next attempt retries it */
    });
  };
  window.addEventListener("online", drain);
  // Once shortly after load, for anything a previous session could not deliver.
  window.setTimeout(drain, 1500);
  window.setInterval(drain, 30_000);
}

export type AutosaveState =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "failed"; message: string };

export interface AutosaveOptions {
  /** Off for read-only panes — nothing to save, and no draft worth keeping. */
  enabled: boolean;
  /** Stable per document. Changing it abandons the previous document's timers. */
  draftKey: string;
  /** The current content. Called at save time, never stored. */
  getSnapshot: () => string;
  /** The durable write. MUST reject on failure. */
  save: (content: string) => Promise<void>;
  /** What the store last gave us, so an unchanged buffer is never written. */
  baseline: string;
  /** Quiet period before a durable save. Long on purpose: each save is a
   *  revision, and a revision per pause is the most history anyone wants. */
  idleMs?: number;
  /** Debounce for the local draft. Short — this costs nothing. */
  draftMs?: number;
  /** Identifies the document to the SERVER draft tier. Omit to keep autosave
   *  browser-only — the two local tiers still apply. */
  remote?: {
    path: string;
    store: string;
    conversationId: string;
    mime?: string;
  };
}

const DRAFT_PREFIX = "cg-editor-draft:";

interface Draft {
  content: string;
  at: number;
}

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    return typeof parsed?.content === "string" ? parsed : null;
  } catch {
    // Storage can be unavailable (private mode, quota, a browser configured to
    // block it). A missing draft is not an error — it just means this tier is
    // not available and the durable save is on its own.
    return null;
  }
}

function writeDraft(key: string, content: string): void {
  try {
    window.localStorage.setItem(
      DRAFT_PREFIX + key,
      JSON.stringify({ content, at: Date.now() } satisfies Draft),
    );
  } catch {
    /* see readDraft */
  }
}

function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* see readDraft */
  }
}

/** Any draft left over from a previous session for this document. Read ONCE, at
 *  mount, before the editor has had a chance to overwrite it. */
export function recoverDraft(
  draftKey: string,
  baseline: string,
): { content: string; at: number } | null {
  const draft = readDraft(draftKey);
  // A draft identical to what the store already has is not recovery, it is
  // noise — offering to restore the document you are already looking at.
  if (!draft || draft.content === baseline) return null;
  return draft;
}

export function discardDraft(draftKey: string): void {
  clearDraft(draftKey);
}

export function useAutosave({
  enabled,
  draftKey,
  getSnapshot,
  save,
  baseline,
  idleMs = 8000,
  draftMs = 600,
  remote,
}: AutosaveOptions) {
  const [state, setState] = React.useState<AutosaveState>({ kind: "idle" });

  // Held in refs so the timers and the unload listener always see current
  // values without being torn down and rebuilt on every keystroke — a listener
  // re-registered per character is how "save on close" ends up bound to a stale
  // closure over an empty document.
  const snapshotRef = React.useRef(getSnapshot);
  /**
   * A LIVE MIRROR of the content, updated on every change.
   *
   * THE UNMOUNT FLUSH CANNOT TRUST `getSnapshot`. That function reaches into the
   * editor (`ref.current?.getMarkdown() ?? markdown`), and by the time a parent's
   * cleanup runs React may already have cleared that ref — so it falls through
   * to the ORIGINAL loaded text, which equals the saved baseline, and the flush
   * decides there is nothing to save. Closing the viewer therefore threw away
   * everything typed since the last idle save, silently, which is exactly the
   * failure autosave exists to prevent.
   *
   * The mirror is written while the editor is definitely alive, so the value on
   * the way out is real regardless of ref lifecycle.
   */
  const liveRef = React.useRef<string | null>(null);

  /** What to save. The mirror when we have one, the editor otherwise. */
  const currentContent = React.useCallback(
    () => (liveRef.current !== null ? liveRef.current : snapshotRef.current()),
    [],
  );
  const saveRef = React.useRef(save);
  const baselineRef = React.useRef(baseline);
  const enabledRef = React.useRef(enabled);
  const keyRef = React.useRef(draftKey);
  const remoteRef = React.useRef(remote);
  remoteRef.current = remote;
  /** Monotonic per document. The server discards a draft whose seq is not
   *  greater than the one it holds, which is what makes a retry that arrives
   *  late unable to overwrite newer work. */
  const seqRef = React.useRef(0);
  snapshotRef.current = getSnapshot;
  saveRef.current = save;
  baselineRef.current = baseline;
  enabledRef.current = enabled;
  keyRef.current = draftKey;

  /** What the last durable save actually wrote, so an unchanged buffer never
   *  mints a second identical revision. */
  const savedRef = React.useRef(baseline);
  React.useEffect(() => {
    savedRef.current = baseline;
    // Cleared with the baseline: a mirror left over from the PREVIOUS document
    // would be written to the new document's path on the next flush.
    liveRef.current = null;
  }, [baseline]);

  const idleTimer = React.useRef<number | null>(null);
  const draftTimer = React.useRef<number | null>(null);
  /** Guards against two saves overlapping — the second would race the first and
   *  could land an older buffer on top of a newer one. */
  const inFlight = React.useRef(false);

  const doSave = React.useCallback(async (): Promise<void> => {
    if (!enabledRef.current || inFlight.current) return;
    const content = currentContent();
    if (content === savedRef.current) {
      setState({ kind: "idle" });
      return;
    }
    inFlight.current = true;
    setState({ kind: "saving" });
    try {
      await saveRef.current(content);
      savedRef.current = content;
      // Cleared only NOW. Until this point the draft is the only copy that
      // survives the tab going away.
      clearDraft(keyRef.current);
      setState({ kind: "saved", at: Date.now() });
    } catch (e: unknown) {
      // The draft is deliberately left in place: a failed durable save is
      // exactly when the local copy matters.
      setState({
        kind: "failed",
        message: e instanceof Error ? e.message : "Autosave failed.",
      });
    } finally {
      inFlight.current = false;
    }
  }, [currentContent]);

  /** Hand the current content to the server draft tier. */
  const queueRemote = React.useCallback((content: string) => {
    const r = remoteRef.current;
    if (!r || !enabledRef.current) return;
    seqRef.current = Math.max(seqRef.current + 1, Date.now());
    enqueue({
      path: r.path,
      store: r.store,
      conversationId: r.conversationId,
      contentB64: encodeUtf8ToB64(content),
      mime: r.mime ?? "",
      seq: seqRef.current,
    });
    flushDraftOutbox().catch(() => {
      /* queued; retried by the drainer */
    });
  }, []);

  /** Force a durable save now — on unmount, on hide, or from a Save button. */
  const flush = React.useCallback(() => doSave(), [doSave]);

  /** Call on every change. Writes the draft soon and schedules the real save. */
  const onChange = React.useCallback(() => {
    if (!enabledRef.current) return;
    // Read WHILE THE EDITOR IS ALIVE — see `liveRef`. Cheap: this is a string
    // the editor already holds, not a re-serialisation of the document.
    liveRef.current = snapshotRef.current();
    setState((s) => (s.kind === "saving" ? s : { kind: "dirty" }));

    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      const content = currentContent();
      writeDraft(keyRef.current, content);
      // And to the server, through the queue. Same debounce as the local draft:
      // this is a small write to a sidecar, not a version, so it can be
      // frequent — and being frequent is what makes the recovered copy the LAST
      // edit rather than an old one.
      queueRemote(content);
    }, draftMs);

    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      doSave().catch(() => {
        /* recorded in state by doSave */
      });
    }, idleMs);
  }, [doSave, draftMs, idleMs, currentContent, queueRemote]);

  // The last chance to do anything. Both events, because neither alone covers
  // every way a page goes away, and a duplicate flush is harmless (the content
  // check makes the second a no-op).
  React.useEffect(() => {
    if (!enabled) return undefined;
    const onGone = () => {
      if (!enabledRef.current) return;
      const content = currentContent();
      if (content === savedRef.current) return;
      // Draft first, and SYNCHRONOUSLY: localStorage is the one write that
      // cannot be cancelled by the document going away.
      writeDraft(keyRef.current, content);
      // Then a BEACON to the server tier. The browser delivers this after the
      // document is gone, which no ordinary request can promise during unload —
      // and it is queued as well, so a beacon the network swallows is retried
      // by the next session rather than lost.
      const r = remoteRef.current;
      if (r) {
        seqRef.current = Math.max(seqRef.current + 1, Date.now());
        const item = {
          path: r.path,
          store: r.store,
          conversationId: r.conversationId,
          contentB64: encodeUtf8ToB64(content),
          mime: r.mime ?? "",
          seq: seqRef.current,
        };
        enqueue(item);
        beaconDraft(item);
      }
      // Then the durable attempt. It may not complete — that is what the draft
      // above is for — but with `keepalive` in the underlying fetch it usually
      // does.
      saveRef.current(content).then(
        () => clearDraft(keyRef.current),
        () => {
          /* the draft stands */
        },
      );
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onGone();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onGone);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onGone);
    };
  }, [enabled, currentContent]);

  // Closing the pane is a page-going-away for this document even though the tab
  // survives, so unmount flushes too.
  React.useEffect(
    () => () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (!enabledRef.current) return;
      // The mirror, NOT the editor: its ref may already be gone. This is the
      // line that decides whether closing a pane keeps your work.
      const content = liveRef.current;
      if (content === null || content === savedRef.current) return;
      writeDraft(keyRef.current, content);
      saveRef.current(content).then(
        () => clearDraft(keyRef.current),
        () => {
          /* the draft stands */
        },
      );
    },
    [],
  );

  return { state, onChange, flush };
}

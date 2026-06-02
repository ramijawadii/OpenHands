// ── Artifact Health Interface (frontend producer) ──────────────────────────────
//
// A single live channel that reports the *health* of the Pages/Artifact panel back
// to the workspace so the agent can query it on demand (sub-second file read).
//
// This is NOT just an error log. Every artifact viewer (mermaid / PDF / xlsx /
// markdown) reports a structured record describing WHAT is currently displaying,
// its render status, type-specific metadata (PDF page count, sheet dims, diagram
// kind), settings (zoom, active sheet) and any error. The panel also reports which
// artifact is selected and whether it is open.
//
// All of it is merged into ONE file the agent reads:  /workspace/.artifact_health.json
//
// Honest constraint: a record is only produced when the browser actually renders
// the artifact (panel open). The panel auto-switches to the newest artifact, so
// health lands ~1–3 s after publish. The agent's read is instant; the production
// side is near-real-time, not a forced server-side render.

import ConversationService from "#/api/conversation-service/conversation-service.api";

export type ArtifactStatus = "rendering" | "ok" | "error" | "empty";

export interface ArtifactHealthEntry {
  /** Workspace-relative file name, e.g. "report-v3.pdf" */
  file: string;
  /** Which viewer produced this: "diagram" | "pdf" | "xlsx" | "markdown" */
  tab: string;
  /** Render lifecycle state */
  status: ArtifactStatus;
  /** Error message when status === "error" */
  error?: string;
  /** Type-specific metadata + live settings (pages, zoom, sheets, dims, kind…) */
  meta?: Record<string, unknown>;
  /** Last update (epoch ms) */
  ts: number;
}

export interface PanelState {
  /** File currently selected in the panel */
  active_file?: string | null;
  /** Active tab id (e.g. "diagrams") */
  tab?: string | null;
  /** Whether the artifact panel is open/visible */
  open?: boolean;
  ts?: number;
}

const HEALTH_FILE = ".artifact_health.json";
const MAX_ENTRIES = 50;
const FLUSH_DEBOUNCE_MS = 600;

// Module-level state — shared across all viewers in the page.
const entries = new Map<string, ArtifactHealthEntry>();
let panel: PanelState = {};
let conversationId: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPayload = "";

function buildPayload(): string {
  const artifacts = [...entries.values()]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, MAX_ENTRIES);
  return JSON.stringify(
    {
      schema: "cloudguard.artifact_health/v1",
      updated: Date.now(),
      panel,
      artifacts,
    },
    null,
    2,
  );
}

function flush(): void {
  if (!conversationId) return;
  const payload = buildPayload();
  // Skip upload if nothing meaningful changed (avoids churn on repeated polls).
  // `updated` always differs, so compare the body without it.
  const stripped = payload.replace(/"updated":\s*\d+,?\s*/, "");
  if (stripped === lastPayload) return;
  lastPayload = stripped;
  try {
    const f = new File([payload], HEALTH_FILE, { type: "application/json" });
    ConversationService.uploadFiles(conversationId, [f]).catch(() => {
      // non-critical — best-effort telemetry
    });
  } catch {
    // ignore
  }
}

function schedule(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_DEBOUNCE_MS);
}

/** Bind the conversation the health file is written into. Call on panel mount.
 *
 * When the conversation CHANGES (the same browser tab navigating between
 * conversations), the accumulated in-memory entries belong to the previous
 * conversation — clear them so the new conversation's .artifact_health.json
 * only ever reflects ITS OWN artifacts. Without this reset, stale artifacts
 * from other conversations leak into the file and the agent could chase a
 * phantom error that belongs to a different conversation. */
export function setHealthConversation(id: string | null): void {
  if (id !== conversationId) {
    entries.clear();
    panel = {};
    lastPayload = "";
  }
  conversationId = id;
}

/** Report (or update) the health of one artifact. Keyed by tab+file. */
export function reportArtifactHealth(
  e: Omit<ArtifactHealthEntry, "ts"> & { ts?: number },
): void {
  const ts = e.ts ?? Date.now();
  entries.set(`${e.tab}:${e.file}`, { ...e, ts });
  schedule();
}

/** Report the panel-level selection/visibility state. */
export function reportPanelState(p: PanelState): void {
  panel = { ...panel, ...p, ts: Date.now() };
  schedule();
}

/** Clear a previously-reported error/entry for a file (e.g. on successful re-render). */
export function clearArtifactHealth(tab: string, file: string): void {
  if (entries.delete(`${tab}:${file}`)) schedule();
}

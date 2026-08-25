/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  History,
  Info,
  Download,
} from "lucide-react";
import {
  auditApi,
  VfsError,
  DEFAULT_STORE,
  type AuditEntry,
  type TrashItem,
} from "./files-api";
import { formatWhen, formatSize } from "./files-dialogs";
import {
  describeAction,
  rootedLocation,
  targetName,
  looksLikeStorePath,
  GROUP_TINT,
} from "./files-audit-actions";
import { AuditEntryDialog } from "./files-audit-detail";
import { FileArt, FolderArt } from "./files-icons";
import {
  getSessionEvents,
  subscribeSessionEvents,
  clearSessionEvents,
  SESSION_EVENT_LABELS,
} from "./files-session-log";
import { isAuthoredArtifact } from "./files-filetypes";
import {
  DateRangeFilter,
  Pager,
  withinRange,
  PAGE_SIZE,
  type DateRange,
} from "./files-feed";

/**
 * Deleted items, as a FOLDER rather than a dialog.
 *
 * A modal was the wrong shape for this. Recovering something means looking at
 * what was removed, remembering where it lived, and often checking several
 * candidates — all of which a dialog interrupts. The trash is a place in the
 * library, so it is a view in the library, drawn with the same tiles as
 * everywhere else.
 */
export function TrashView({
  items,
  loading,
  error,
  onRestore,
  onContextMenu,
  selected,
  onSelect,
}: {
  items: TrashItem[];
  loading: boolean;
  error: string;
  onRestore: (item: TrashItem) => void;
  onContextMenu: (item: TrashItem, ev: React.MouseEvent) => void;
  selected?: string;
  onSelect: (item: TrashItem) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-[12px] text-[var(--cg-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading deleted items…
      </div>
    );
  }
  if (error) {
    return <div className="p-6 text-[12px] text-amber-400">{error}</div>;
  }
  if (!items.length) {
    return (
      <div className="p-6 text-[12px] text-[var(--cg-text-muted)]">
        Nothing has been deleted here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1 overflow-auto p-3">
      {items.map((item) => (
        <button
          key={`${item.path}:${item.commit_id}`}
          type="button"
          title={`${item.path} — deleted ${formatWhen(item.deleted_at)}${
            item.is_dir ? "" : ` — ${formatSize(item.size)}`
          }`}
          onClick={() => onSelect(item)}
          onDoubleClick={() => onRestore(item)}
          onContextMenu={(ev) => {
            ev.preventDefault();
            onSelect(item);
            onContextMenu(item, ev);
          }}
          className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 ${
            selected === item.path
              ? "border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-bg-hover)]"
              : "border-transparent hover:bg-[var(--cg-bg-hover)]"
          }`}
        >
          {/* Dimmed, because these are not present in the library. A deleted item
              drawn at full strength beside a live one is a real hazard when the
              two views use identical tiles. */}
          <span className="opacity-45">
            {item.is_dir ? (
              <FolderArt size={48} />
            ) : (
              <FileArt path={item.path} kind="file" size={48} />
            )}
          </span>
          <span className="line-clamp-2 w-full break-all text-center text-[11px] leading-tight text-[var(--cg-text-muted)]">
            {item.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Activity — the tenant audit ledger.
 *
 * Real entries from `/api/cloudguard/audit/ledger`, not a UI-local event log.
 * The chain state sits beside the feed because "these are the entries" and "the
 * entries have not been altered" are two different claims, and only the second
 * makes the first worth reading.
 */
/**
 * Did this entry CHANGE the library, as opposed to look at it?
 *
 * This was a substring match over a second, hand-kept list of action ids that
 * lived only in this file. Two lists of the same vocabulary drift, and the
 * failure is silent in the direction that matters: an action missing from the
 * copy simply never appears under "Agent activity", so the feed looks calm.
 * The registry answers it now, keyed on the exact id.
 */
function changedSomething(action: string): boolean {
  const spec = describeAction(action);
  return (
    spec.writes === true ||
    spec.group === "create" ||
    spec.group === "organize" ||
    spec.group === "remove" ||
    spec.group === "recover"
  );
}

/**
 * What each chain is CALLED on screen.
 *
 * The server names them after where they are stored — `vfs` for the
 * file-operation chain, `control` for the governance one. Those are
 * implementation facts. A person reading their own activity log wants to know a
 * row came from Files or from the platform, so the display name says that and
 * the raw name stays in the entry details for anyone debugging the chain itself.
 */
const CHAIN_LABELS: Record<string, string> = {
  vfs: "Files",
  control: "Platform",
};

/**
 * Download what is ON SCREEN, as CSV.
 *
 * The FILTERED rows, not the whole ledger: someone who narrowed to "agent
 * activity, last 7 days" and pressed Export means that, and handing back 4000
 * unrelated rows would be a different document than the one they were reading.
 * `/audit/export` still serves the complete signed ledger for anyone who needs
 * the whole chain with its integrity verdicts.
 *
 * CSV because the destination is a spreadsheet or a ticket, and the columns are
 * flat. Quoting is applied to every field rather than only to those that look
 * like they need it — a resource path containing a comma is exactly the case a
 * "clever" exporter gets wrong.
 */
function exportEntriesCsv(rows: AuditEntry[], scopeLabel: string): void {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "time",
    "action",
    "action_id",
    "target",
    "location",
    "actor",
    "decision",
    "source",
    "sequence",
    "entry_hash",
  ];
  const body = rows.map((e) =>
    [
      new Date(e.ts).toISOString(),
      // The same words the table shows, from the same helpers — an export that
      // said `vfs_write` where the screen said "File saved" would be a second,
      // contradictory vocabulary.
      describeAction(e.action).label,
      e.action,
      targetName(e.resource),
      looksLikeStorePath(e.resource, e.action)
        ? rootedLocation(e.resource, e.details?.store)
        : "",
      e.actor,
      e.decision,
      CHAIN_LABELS[e.chain] ?? e.chain,
      e.seq,
      e.entry_hash,
    ]
      .map(cell)
      .join(","),
  );
  const csv = [header.map(cell).join(","), ...body].join("\r\n");
  // A BOM, so Excel opens UTF-8 correctly instead of mangling every path with a
  // non-ASCII character in it.
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = "noopener";
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ActivityView({
  conversationId = "",
  store = DEFAULT_STORE,
}: {
  /** Threaded through so the detail modal can read a file's history. The ledger
   *  itself is tenant-scoped and needs neither. */
  conversationId?: string;
  /** The store the browser is currently in, used ONLY as the fallback for
   *  entries written before the ledger recorded one. */
  store?: string;
}) {
  const [scope, setScope] = React.useState<
    "all" | "mine" | "agent" | "session"
  >("all");
  // Subscribed rather than polled, so the list updates as you browse.
  const sessionEvents = React.useSyncExternalStore(
    subscribeSessionEvents,
    getSessionEvents,
    getSessionEvents,
  );
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [chain, setChain] = React.useState<{
    ok: boolean;
    count: number;
    broken: string[];
  } | null>(null);
  const [range, setRange] = React.useState<DateRange>("all");
  const [page, setPage] = React.useState(0);
  /** The entry whose detail panel is open. Held as the WHOLE entry rather than a
   *  seq: the panel must render exactly what was in the feed, not re-fetch a row
   *  that could have been re-paged out from under it. */
  const [opened, setOpened] = React.useState<AuditEntry | null>(null);
  const [state, setState] = React.useState<{ loading: boolean; error: string }>(
    {
      loading: true,
      error: "",
    },
  );

  React.useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: "" });
    // The ledger can filter by an EXACT actor server-side, but "mine" is every
    // actor that is not the agent — the console writes entries under a user id,
    // and there is no single literal to ask for. So the split is applied here
    // over one fetch, rather than sending an actor string the server would match
    // literally and return nothing for.
    auditApi
      .ledger({ limit: 300 })
      .then((d) => {
        if (cancelled) return;
        setEntries(d.entries);
        setState({ loading: false, error: "" });
      })
      .catch((e: VfsError) => {
        if (!cancelled) setState({ loading: false, error: e.message });
      });
    auditApi
      .verify()
      .then((v) => {
        if (cancelled) return;
        setChain({
          ok: v.ok,
          count: v.count,
          // Named, not counted. "1 of 2 chains broken" tells a responder
          // nothing; "the vfs chain is broken" tells them where to look.
          // Named in the READER'S vocabulary, not the server's — `vfs` and
          // `control` are the directories these chains live in, which nobody
          // reading an activity log knows or should have to know.
          broken: (v.chains ?? [])
            .filter((c) => !c.ok)
            .map((c) => CHAIN_LABELS[c.chain] ?? c.chain),
        });
      })
      .catch(() => {
        // A ledger that lists but cannot verify still shows its entries; it just
        // does not get to claim they are intact.
        if (!cancelled) setChain(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * "Agent activity" means the agent CHANGED AN ARTIFACT — a report, a
   * spreadsheet, a deck, a diagram, a notebook — not that it called a tool.
   *
   * The ledger is full of `mcp_call` rows, which are a runtime trace: useful for
   * debugging the agent, useless for reviewing its work. Someone opening this
   * tab wants "the agent rewrote finding-3.docx", so the scope filters to
   * write-shaped actions on paths whose type the agent actually authors.
   */
  const filtered = React.useMemo(() => {
    const inRange = entries.filter((e) => withinRange(e.ts, range));
    if (scope === "agent") {
      return inRange.filter(
        (e) =>
          e.actor === "agent" &&
          changedSomething(e.action) &&
          isAuthoredArtifact(e.resource),
      );
    }
    if (scope === "mine") return inRange.filter((e) => e.actor !== "agent");
    return inRange;
  }, [entries, scope, range]);

  // Clamped rather than reset: paging to the end of a 300-row feed and then
  // narrowing the date should land on the last page of the smaller list, not
  // silently jump back to the first.
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const scopes = [
    ["all", "All activity"],
    ["mine", "My activity"],
    ["agent", "Agent activity"],
    ["session", "This session"],
  ] as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--cg-border)] px-3 py-1.5">
        {scopes.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setScope(id);
              setPage(0);
            }}
            className={`rounded px-2 py-0.5 text-[11px] ${
              scope === id
                ? "bg-[var(--cg-bg-hover)] text-[var(--cg-text-nav)]"
                : "text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-2">
          <DateRangeFilter
            value={range}
            onChange={(r) => {
              setRange(r);
              setPage(0);
            }}
          />
        </span>
        {/* Exports the FILTERED set, which is what the person is looking at.
            Disabled with nothing to export rather than silently producing a
            header-only file. */}
        <button
          type="button"
          disabled={scope === "session" || filtered.length === 0}
          onClick={() => exportEntriesCsv(filtered, scope)}
          title={
            scope === "session"
              ? "Session events are a UI breadcrumb trail, not ledger entries — there is nothing signed to export."
              : `Download these ${filtered.length} entries as CSV`
          }
          className="ml-1 flex items-center gap-1 rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[10px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
        {chain && (
          <span
            className={`ml-auto flex items-center gap-1 text-[10px] ${
              chain.ok ? "text-[var(--cg-ok)]" : "text-amber-400"
            }`}
            title={
              chain.ok
                ? "Every entry hash matches the one before it, in every chain."
                : `The hash chain does not verify${
                    chain.broken.length ? ` (${chain.broken.join(", ")})` : ""
                  } — entries may have been altered, or the signing key changed after they were written.`
            }
          >
            {chain.ok ? (
              <ShieldCheck className="h-3 w-3" />
            ) : (
              <ShieldAlert className="h-3 w-3" />
            )}
            {chain.ok
              ? `chain verified · ${chain.count}`
              : `chain broken${
                  chain.broken.length ? ` · ${chain.broken.join(", ")}` : ""
                }`}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {scope === "session" && (
          <>
            <p className="mb-3 rounded-md border border-[var(--cg-border)] bg-[var(--cg-bg-hover)] px-3 py-2 text-[10px] leading-relaxed text-[var(--cg-text-muted)]">
              Browsing, searching and view changes happen in your browser and
              are NOT in the audit chain — the server records operations on
              files, and padding a tamper-evident chain with navigation would
              weaken the thing it exists to prove. This list is session-only and
              is lost on reload.
            </p>
            {sessionEvents.length === 0 ? (
              <p className="text-[12px] text-[var(--cg-text-muted)]">
                Nothing yet this session.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={clearSessionEvents}
                  className="mb-2 rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[10px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
                >
                  Clear
                </button>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                      <th className="pb-2 font-medium">What</th>
                      <th className="pb-2 font-medium">Detail</th>
                      <th className="pb-2 font-medium">Store</th>
                      <th className="pb-2 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionEvents.map((e) => (
                      <tr
                        key={e.id}
                        className="border-t border-[var(--cg-border)]"
                      >
                        <td className="py-1.5 pr-3 text-[var(--cg-text-nav)]">
                          {SESSION_EVENT_LABELS[e.kind]}
                        </td>
                        <td className="max-w-[280px] truncate py-1.5 pr-3 text-[var(--cg-text-muted)]">
                          {e.detail}
                        </td>
                        <td className="py-1.5 pr-3 text-[var(--cg-text-muted)]">
                          {e.store}
                        </td>
                        <td className="whitespace-nowrap py-1.5 text-[var(--cg-text-muted)]">
                          {new Date(e.at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {scope !== "session" && state.loading && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading the audit ledger…
          </div>
        )}
        {scope !== "session" && state.error && (
          <div className="text-[12px] text-amber-400">{state.error}</div>
        )}
        {scope !== "session" &&
          !state.loading &&
          !state.error &&
          shown.length === 0 && (
            <div className="text-[12px] text-[var(--cg-text-muted)]">
              {scope === "agent"
                ? "The agent has not created or changed an artifact in this period."
                : "No activity recorded for this scope."}
            </div>
          )}
        {scope !== "session" && shown.length > 0 && (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Target</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium">Actor</th>
                <th className="pb-2 font-medium">Decision</th>
                <th className="pb-2 font-medium">Time</th>
                <th aria-label="Open the entry" />
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const spec = describeAction(e.action);
                // The button says what it will actually show. A row for a shell
                // command or a refused write has no revisions behind it, and
                // labelling it "Versions" would send a reviewer to a panel that
                // can only tell them there is nothing there.
                const hasRevisions =
                  looksLikeStorePath(e.resource, e.action) &&
                  e.decision !== "deny" &&
                  e.decision !== "denied";
                return (
                  <tr
                    key={`${e.chain}:${e.seq}`}
                    className="border-t border-[var(--cg-border)]"
                  >
                    {/* The words, not the id. The id is one click away in the
                        detail panel and is also the row's tooltip, so nothing
                        is hidden — it just stops being the first thing read. */}
                    <td
                      className={`py-1.5 pr-3 ${GROUP_TINT[spec.group]}`}
                      title={e.action}
                    >
                      {spec.label}
                    </td>
                    {/* Name and location split into two columns: a single path
                        column truncates from the right, which eats the filename
                        — the one part of the path a reviewer scans for. */}
                    <td
                      className="max-w-[200px] truncate py-1.5 pr-3 text-[var(--cg-text-nav)]"
                      title={e.resource}
                    >
                      {targetName(e.resource) || "—"}
                    </td>
                    <td
                      className="max-w-[240px] truncate py-1.5 pr-3 font-mono text-[11px] text-[var(--cg-text-muted)]"
                      title={rootedLocation(e.resource, e.details?.store)}
                    >
                      {looksLikeStorePath(e.resource, e.action)
                        ? rootedLocation(e.resource, e.details?.store)
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--cg-text-muted)]">
                      {e.actor}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={
                          e.decision === "allowed" || e.decision === "allow"
                            ? "text-[var(--cg-ok)]"
                            : "text-amber-400"
                        }
                      >
                        {e.decision}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3 text-[var(--cg-text-muted)]">
                      {formatWhen(e.ts)}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setOpened(e)}
                        title={
                          hasRevisions
                            ? "What the artifact looked like around this action"
                            : "The full entry, as recorded in the chain"
                        }
                        className="flex items-center gap-1 rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
                      >
                        {hasRevisions ? (
                          <History className="h-3 w-3" />
                        ) : (
                          <Info className="h-3 w-3" />
                        )}
                        {hasRevisions ? "Versions" : "Details"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {scope !== "session" && (
        <Pager page={current} total={filtered.length} onPage={setPage} />
      )}
      {opened && (
        <AuditEntryDialog
          entry={opened}
          conversationId={conversationId}
          fallbackStore={store}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  );
}

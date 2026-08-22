/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  auditApi,
  VfsError,
  type AuditEntry,
  type TrashItem,
} from "./files-api";
import { formatWhen, formatSize } from "./files-dialogs";
import { FileArt, FolderArt } from "./files-icons";
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
/** Actions that mean something was written, as they appear in the ledger. */
const MUTATIONS = [
  "vfs_write",
  "vfs_mkdir",
  "vfs_move",
  "vfs_copy",
  "vfs_delete",
  "vfs_revert",
  "vfs_untrash",
  "office_write",
  "write_file",
  "edit_file",
  "str_replace",
];

export function ActivityView() {
  const [scope, setScope] = React.useState<"all" | "mine" | "agent">("all");
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [chain, setChain] = React.useState<{
    ok: boolean;
    count: number;
  } | null>(null);
  const [range, setRange] = React.useState<DateRange>("all");
  const [page, setPage] = React.useState(0);
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
        if (!cancelled) setChain({ ok: v.ok, count: v.count });
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
          MUTATIONS.some((m) => e.action.includes(m)) &&
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
        {chain && (
          <span
            className={`ml-auto flex items-center gap-1 text-[10px] ${
              chain.ok ? "text-emerald-400" : "text-amber-400"
            }`}
            title={
              chain.ok
                ? "Every entry hash matches the one before it."
                : "The hash chain does not verify — entries may have been altered."
            }
          >
            {chain.ok ? (
              <ShieldCheck className="h-3 w-3" />
            ) : (
              <ShieldAlert className="h-3 w-3" />
            )}
            {chain.ok ? `chain verified · ${chain.count}` : "chain broken"}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {state.loading && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading the audit ledger…
          </div>
        )}
        {state.error && (
          <div className="text-[12px] text-amber-400">{state.error}</div>
        )}
        {!state.loading && !state.error && shown.length === 0 && (
          <div className="text-[12px] text-[var(--cg-text-muted)]">
            {scope === "agent"
              ? "The agent has not created or changed an artifact in this period."
              : "No activity recorded for this scope."}
          </div>
        )}
        {shown.length > 0 && (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Resource</th>
                <th className="pb-2 font-medium">Actor</th>
                <th className="pb-2 font-medium">Decision</th>
                <th className="pb-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.seq} className="border-t border-[var(--cg-border)]">
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-[var(--cg-text-nav)]">
                    {e.action}
                  </td>
                  <td className="max-w-[220px] truncate py-1.5 pr-3 text-[var(--cg-text-muted)]">
                    {e.resource}
                  </td>
                  <td className="py-1.5 pr-3 text-[var(--cg-text-muted)]">
                    {e.actor}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={
                        e.decision === "allowed" || e.decision === "allow"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {e.decision}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-[var(--cg-text-muted)]">
                    {formatWhen(e.ts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager page={current} total={filtered.length} onPage={setPage} />
    </div>
  );
}

/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  Loader2,
  X,
  AlertTriangle,
  RotateCcw,
  Eye,
  Shield,
  Tag,
  Clock,
} from "lucide-react";
import {
  filesApi,
  VfsError,
  baseName,
  type Checkpoint,
  type FileVersion,
  type TrashItem,
} from "./files-api";

/* ── shell ─────────────────────────────────────────────────────────────────
 * One dialog shape for every panel in this surface, so version history,
 * permissions and point-in-time read as the same control rather than three
 * different ones that happen to sit in the same tab.
 */

interface ShellProps {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({
  title,
  subtitle,
  wide,
  onClose,
  children,
}: ShellProps) {
  // Escape closes. Bound on the dialog itself rather than the document so a
  // stacked dialog (a version preview over the history list) closes only the
  // top one — closing both would end the comparison the analyst is in the
  // middle of.
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* A focusable dialog container handling its own Escape is the correct
          ARIA pattern — role="dialog" + tabIndex + aria-modal — but the rule
          cannot distinguish it from a handler bolted onto a decorative div.
          Escape is bound HERE rather than on the document so a stacked dialog
          closes only the top one. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className={`flex max-h-[82vh] w-full ${
          wide ? "max-w-[880px]" : "max-w-[560px]"
        } flex-col overflow-hidden rounded-lg border border-[var(--cg-border)] bg-[var(--cg-bg-card,var(--cg-bg-page))] shadow-xl outline-none`}
      >
        <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-4 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[var(--cg-text-nav)]">
              {title}
            </div>
            {subtitle && (
              <div className="truncate text-[11px] text-[var(--cg-text-muted)]">
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function Busy({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-[12px] text-[var(--cg-text-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function Problem({ error }: { error: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-[var(--cg-text-nav)]">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span>{error}</span>
    </div>
  );
}

export function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u += 1;
  }
  return `${n < 10 && u > 0 ? n.toFixed(1) : Math.round(n)} ${units[u]}`;
}

export function formatWhen(value: string | number): string {
  if (!value) return "";
  const n = Number(value);
  const d =
    Number.isFinite(n) && String(value).trim() !== ""
      ? new Date(n > 1e12 ? n : n * 1000)
      : new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

/* ── version history ───────────────────────────────────────────────────────
 * View sits beside Restore on every row, including the current one. Restoring
 * to find out what a version contained is a guess that costs a write, and on a
 * WORM path it may not be reversible — so the safe question is answerable
 * without asking the destructive one.
 */

const VIEW_LIMIT = 512 * 1024;

function VersionPreviewDialog({
  path,
  versionId,
  when,
  conversationId,
  onClose,
}: {
  path: string;
  versionId: string;
  when: string;
  conversationId: string;
  onClose: () => void;
}) {
  const [body, setBody] = React.useState<
    | { kind: "loading" }
    | { kind: "text"; text: string; note: string }
    | { kind: "note"; note: string }
  >({ kind: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    filesApi
      .readVersion(path, versionId, conversationId)
      .then((bytes) => {
        if (cancelled) return;
        // A NUL byte in the first kilobyte is the cheap, reliable binary
        // signal. Rendering a .docx as mojibake would look like corruption of
        // the very file someone is deciding whether to trust.
        const probe = bytes.subarray(0, 1024);
        if (probe.includes(0)) {
          setBody({
            kind: "note",
            note: `This version is a binary file (${formatSize(bytes.length)}). Restore it to open it in an editor.`,
          });
          return;
        }
        const truncated = bytes.length > VIEW_LIMIT;
        const text = new TextDecoder("utf-8", { fatal: false }).decode(
          truncated ? bytes.subarray(0, VIEW_LIMIT) : bytes,
        );
        setBody({
          kind: "text",
          text,
          note:
            formatSize(bytes.length) +
            (truncated ? ` — showing the first ${formatSize(VIEW_LIMIT)}` : ""),
        });
      })
      .catch(() => {
        if (!cancelled)
          setBody({ kind: "note", note: "Could not read this version." });
      });
    return () => {
      cancelled = true;
    };
  }, [path, versionId, conversationId]);

  return (
    <Dialog
      wide
      title={baseName(path)}
      subtitle={when || "earlier version"}
      onClose={onClose}
    >
      {body.kind === "loading" && <Busy label="Reading version…" />}
      {body.kind === "note" && (
        <div className="text-[12px] text-[var(--cg-text-muted)]">
          {body.note}
        </div>
      )}
      {body.kind === "text" && (
        <>
          <div className="pb-2 text-[11px] text-[var(--cg-text-muted)]">
            {body.note}
          </div>
          {/* Rendered as TEXT, never markup: these bytes may be anything an
              agent wrote, and this dialog is on the console's own origin. */}
          <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--cg-border)] bg-[var(--cg-bg-hover)] p-3 font-mono text-[12px] leading-relaxed text-[var(--cg-text-nav)]">
            {body.text}
          </pre>
        </>
      )}
    </Dialog>
  );
}

export function VersionHistoryDialog({
  path,
  conversationId,
  onClose,
  onRestored,
}: {
  path: string;
  conversationId: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [state, setState] = React.useState<{
    loading: boolean;
    versioned: boolean;
    versions: FileVersion[];
    error: string;
  }>({ loading: true, versioned: true, versions: [], error: "" });
  const [busyId, setBusyId] = React.useState("");
  const [preview, setPreview] = React.useState<{
    id: string;
    when: string;
  } | null>(null);

  const load = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    filesApi
      .versions(path, conversationId)
      .then((d) =>
        setState({
          loading: false,
          versioned: d.versioned,
          versions: d.versions,
          error: "",
        }),
      )
      .catch((e: VfsError) =>
        setState({
          loading: false,
          versioned: true,
          versions: [],
          error: e.message,
        }),
      );
  }, [path, conversationId]);

  React.useEffect(load, [load]);

  const restore = (v: FileVersion) => {
    setBusyId(v.id);
    filesApi
      .revertFile(path, v.id, conversationId)
      .then(() => {
        setBusyId("");
        onRestored();
        load();
      })
      .catch((e: VfsError) => {
        // Surfaced, never swallowed. A restore that silently does nothing is the
        // worst outcome for a recovery feature, because people stop checking.
        setBusyId("");
        setState((s) => ({ ...s, error: `Restore failed: ${e.message}` }));
      });
  };

  return (
    <>
      <Dialog
        title={baseName(path)}
        subtitle="Version history"
        onClose={onClose}
      >
        {state.error && <Problem error={state.error} />}
        {state.loading && <Busy label="Reading history…" />}
        {!state.loading && !state.versioned && (
          <div className="py-4 text-[12px] text-[var(--cg-text-muted)]">
            This store does not keep per-file history.
          </div>
        )}
        {!state.loading && state.versioned && state.versions.length === 0 && (
          <div className="py-4 text-[12px] text-[var(--cg-text-muted)]">
            No earlier versions of this file.
          </div>
        )}
        {state.versions.length > 0 && (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                <th className="pb-2 font-medium">When</th>
                <th className="pb-2 font-medium">Author</th>
                <th className="pb-2 font-medium">Size</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {state.versions.map((v) => (
                <tr key={v.id} className="border-t border-[var(--cg-border)]">
                  <td className="py-2 pr-2 text-[var(--cg-text-nav)]">
                    {formatWhen(v.created_at)}
                    {v.is_current && (
                      <span className="ml-2 rounded bg-[var(--cg-bg-hover)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                        current
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-[var(--cg-text-muted)]">
                    {v.author}
                  </td>
                  <td className="py-2 pr-2 text-[var(--cg-text-muted)]">
                    {formatSize(v.size)}
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            id: v.id,
                            when: formatWhen(v.created_at),
                          })
                        }
                        className="flex items-center gap-1 rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)]"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                      {!v.is_current && (
                        <button
                          type="button"
                          disabled={busyId === v.id}
                          onClick={() => restore(v)}
                          className="flex items-center gap-1 rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)] disabled:opacity-60"
                        >
                          <RotateCcw className="h-3 w-3" />
                          {busyId === v.id ? "Restoring…" : "Restore"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Dialog>
      {preview && (
        <VersionPreviewDialog
          path={path}
          versionId={preview.id}
          when={preview.when}
          conversationId={conversationId}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}

/* ── permissions ───────────────────────────────────────────────────────────
 * Shows what the ENGINE would allow for both principals it distinguishes: the
 * human at the console (trusted control plane) and the agent (untrusted, bound
 * by the capability manifest, the WORM zones and the mode gate). Those two get
 * materially different answers on the same file, and that difference is the
 * point of the panel.
 */

export function PermissionsDialog({
  path,
  conversationId,
  onClose,
}: {
  path: string;
  conversationId: string;
  onClose: () => void;
}) {
  const [data, setData] = React.useState<{
    loading: boolean;
    ops: string[];
    matrix: Record<string, Record<string, { allow: boolean; reason?: string }>>;
    error: string;
  }>({ loading: true, ops: [], matrix: {}, error: "" });

  React.useEffect(() => {
    filesApi
      .permissions(path, conversationId)
      .then((d) =>
        setData({ loading: false, ops: d.ops, matrix: d.matrix, error: "" }),
      )
      .catch((e: VfsError) =>
        setData({ loading: false, ops: [], matrix: {}, error: e.message }),
      );
  }, [path, conversationId]);

  const actors = Object.keys(data.matrix);
  return (
    <Dialog
      title={baseName(path)}
      subtitle="Effective permissions"
      onClose={onClose}
    >
      {data.error && <Problem error={data.error} />}
      {data.loading && <Busy label="Asking the policy engine…" />}
      {!data.loading && actors.length > 0 && (
        <>
          <p className="mb-3 text-[11px] leading-relaxed text-[var(--cg-text-muted)]">
            Answered by the policy engine itself, not restated here — a matrix
            that drifted from the engine would say an artifact is protected when
            it is not.
          </p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                <th className="pb-2 font-medium">Operation</th>
                {actors.map((a) => (
                  <th key={a} className="pb-2 font-medium capitalize">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ops.map((op) => (
                <tr key={op} className="border-t border-[var(--cg-border)]">
                  <td className="py-2 capitalize text-[var(--cg-text-nav)]">
                    {op}
                  </td>
                  {actors.map((a) => {
                    const cell = data.matrix[a]?.[op];
                    return (
                      <td key={a} className="py-2">
                        <span
                          title={cell?.reason || ""}
                          className={
                            cell?.allow
                              ? "text-emerald-400"
                              : "text-[var(--cg-text-muted)]"
                          }
                        >
                          {cell?.allow ? "allowed" : "denied"}
                        </span>
                        {!cell?.allow && cell?.reason && (
                          <div className="text-[10px] leading-tight text-[var(--cg-text-muted)] opacity-80">
                            {cell.reason}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Dialog>
  );
}

/* ── file details: stat + Seafile's extended properties and tags ───────────── */

export function DetailsDialog({
  entry,
  conversationId,
  onClose,
}: {
  entry: {
    path: string;
    size: number;
    mtime: number;
    content_hash: string;
    version: number;
    mime: string | null;
  };
  conversationId: string;
  onClose: () => void;
}) {
  const [meta, setMeta] = React.useState<{
    loading: boolean;
    enabled: boolean;
    properties: Record<string, unknown>;
    tags: unknown[];
  }>({ loading: true, enabled: false, properties: {}, tags: [] });

  React.useEffect(() => {
    filesApi
      .metadata(entry.path, conversationId)
      .then((d) =>
        setMeta({
          loading: false,
          enabled: d.enabled,
          properties: d.properties,
          tags: d.tags,
        }),
      )
      .catch(() =>
        setMeta({ loading: false, enabled: false, properties: {}, tags: [] }),
      );
  }, [entry.path, conversationId]);

  const rows: [string, string][] = [
    ["Path", entry.path],
    ["Size", formatSize(entry.size)],
    ["Modified", formatWhen(entry.mtime)],
    ["Version", entry.version ? String(entry.version) : "—"],
    ["Type", entry.mime || "—"],
    // The sha256 is the chain-of-custody value the audit trail records, so it is
    // shown in full rather than truncated: a hash you cannot compare is decoration.
    ["SHA-256", entry.content_hash || "not recorded"],
  ];

  return (
    <Dialog title={baseName(entry.path)} subtitle="Details" onClose={onClose}>
      <table className="w-full text-[12px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr
              key={k}
              className="border-b border-[var(--cg-border)] last:border-0"
            >
              <td className="w-28 py-2 align-top text-[var(--cg-text-muted)]">
                {k}
              </td>
              <td className="break-all py-2 font-mono text-[11px] text-[var(--cg-text-nav)]">
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--cg-text-muted)]">
        <Tag className="h-3 w-3" />
        Library metadata
      </div>
      {meta.loading && <Busy label="Reading metadata…" />}
      {!meta.loading && !meta.enabled && (
        <div className="py-2 text-[12px] text-[var(--cg-text-muted)]">
          Extended properties are not enabled on this library.
        </div>
      )}
      {!meta.loading && meta.enabled && (
        <>
          {Object.keys(meta.properties).length === 0 &&
            meta.tags.length === 0 && (
              <div className="py-2 text-[12px] text-[var(--cg-text-muted)]">
                No properties or tags set on this file.
              </div>
            )}
          {Object.entries(meta.properties).map(([k, v]) => (
            <div
              key={k}
              className="flex gap-3 border-b border-[var(--cg-border)] py-1.5 text-[12px] last:border-0"
            >
              <span className="w-28 shrink-0 text-[var(--cg-text-muted)]">
                {k}
              </span>
              <span className="break-all text-[var(--cg-text-nav)]">
                {String(v)}
              </span>
            </div>
          ))}
          {meta.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meta.tags.map((t, i) => (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="rounded bg-[var(--cg-bg-hover)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)]"
                >
                  {typeof t === "string" ? t : JSON.stringify(t)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

/* ── trash ─────────────────────────────────────────────────────────────────── */

export function TrashDialog({
  prefix,
  conversationId,
  onClose,
  onRestored,
}: {
  prefix: string;
  conversationId: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [state, setState] = React.useState<{
    loading: boolean;
    supported: boolean;
    items: TrashItem[];
    error: string;
  }>({ loading: true, supported: true, items: [], error: "" });
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    filesApi
      .trash(prefix, conversationId)
      .then((d) =>
        setState({
          loading: false,
          supported: d.supported,
          items: d.items,
          error: "",
        }),
      )
      .catch((e: VfsError) =>
        setState({
          loading: false,
          supported: true,
          items: [],
          error: e.message,
        }),
      );
  }, [prefix, conversationId]);

  React.useEffect(load, [load]);

  const restore = (item: TrashItem) => {
    setBusy(item.path);
    filesApi
      .untrash(item.path, item.commit_id, conversationId)
      .then(() => {
        setBusy("");
        onRestored();
        load();
      })
      .catch((e: VfsError) => {
        setBusy("");
        setState((s) => ({ ...s, error: `Restore failed: ${e.message}` }));
      });
  };

  return (
    <Dialog
      wide
      title="Deleted items"
      subtitle={prefix ? `in ${prefix}` : "whole library"}
      onClose={onClose}
    >
      {state.error && <Problem error={state.error} />}
      {state.loading && <Busy label="Reading deleted items…" />}
      {!state.loading && !state.supported && (
        <div className="py-4 text-[12px] text-[var(--cg-text-muted)]">
          This store keeps no trash.
        </div>
      )}
      {!state.loading && state.supported && state.items.length === 0 && (
        <div className="py-4 text-[12px] text-[var(--cg-text-muted)]">
          Nothing has been deleted here.
        </div>
      )}
      {state.items.length > 0 && (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--cg-text-muted)]">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Deleted</th>
              <th className="pb-2 font-medium">Size</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {state.items.map((item) => (
              <tr
                key={`${item.path}:${item.commit_id}`}
                className="border-t border-[var(--cg-border)]"
              >
                <td className="py-2 pr-2 text-[var(--cg-text-nav)]">
                  {item.name}
                  <div className="text-[10px] text-[var(--cg-text-muted)]">
                    {item.path}
                  </div>
                </td>
                <td className="py-2 pr-2 text-[var(--cg-text-muted)]">
                  {formatWhen(item.deleted_at)}
                </td>
                <td className="py-2 pr-2 text-[var(--cg-text-muted)]">
                  {item.is_dir ? "folder" : formatSize(item.size)}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={busy === item.path}
                    onClick={() => restore(item)}
                    className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)] disabled:opacity-60"
                  >
                    {busy === item.path ? "Restoring…" : "Restore"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Dialog>
  );
}

/* ── point in time ─────────────────────────────────────────────────────────
 * Library-wide and destructive: it can undo work nobody asked to undo. So the
 * list is descriptive (each point carries the change that made it) and the
 * action is confirmed in place rather than on a single click.
 */

export function PointInTimeDialog({
  conversationId,
  onClose,
  onRestored,
}: {
  conversationId: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [state, setState] = React.useState<{
    loading: boolean;
    supported: boolean;
    items: Checkpoint[];
    error: string;
  }>({ loading: true, supported: true, items: [], error: "" });
  const [confirming, setConfirming] = React.useState("");
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    filesApi
      .checkpoints(conversationId)
      .then((d) =>
        setState({
          loading: false,
          supported: d.supported,
          items: d.checkpoints,
          error: "",
        }),
      )
      .catch((e: VfsError) =>
        setState({
          loading: false,
          supported: true,
          items: [],
          error: e.message,
        }),
      );
  }, [conversationId]);

  React.useEffect(load, [load]);

  const restore = (cp: Checkpoint) => {
    setBusy(cp.id);
    filesApi
      .restore(cp.id, conversationId)
      .then(() => {
        setBusy("");
        setConfirming("");
        onRestored();
      })
      .catch((e: VfsError) => {
        setBusy("");
        setConfirming("");
        // 403 here is the mode gate refusing a destructive action without
        // approval — a real answer, not a fault, so it is shown as given.
        setState((s) => ({ ...s, error: `Restore failed: ${e.message}` }));
      });
  };

  return (
    <Dialog
      wide
      title="Point in time"
      subtitle="Restore the whole library to an earlier state"
      onClose={onClose}
    >
      {state.error && <Problem error={state.error} />}
      <p className="mb-3 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--cg-text-muted)]">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Each entry is a point the library can be returned to. This affects every
        file, not just one — to put a single file back, use its version history.
      </p>
      {state.loading && <Busy label="Reading library history…" />}
      {!state.loading && !state.supported && (
        <div className="py-4 text-[12px] text-[var(--cg-text-muted)]">
          This store keeps no checkpoints.
        </div>
      )}
      {state.items.length > 0 && (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--cg-text-muted)]">
              <th className="pb-2 font-medium">When</th>
              <th className="pb-2 font-medium">Change</th>
              <th className="pb-2 font-medium">By</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {state.items.map((cp) => (
              <tr key={cp.id} className="border-t border-[var(--cg-border)]">
                <td className="whitespace-nowrap py-2 pr-3 text-[var(--cg-text-nav)]">
                  {formatWhen(cp.created_at)}
                </td>
                <td className="py-2 pr-3 text-[var(--cg-text-muted)]">
                  {cp.description}
                </td>
                <td className="py-2 pr-3 text-[var(--cg-text-muted)]">
                  {cp.author}
                </td>
                <td className="py-2 text-right">
                  {confirming === cp.id ? (
                    <span className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busy === cp.id}
                        onClick={() => restore(cp)}
                        className="rounded border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] disabled:opacity-60"
                      >
                        {busy === cp.id ? "Restoring…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming("")}
                        className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)]"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(cp.id)}
                      className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)]"
                    >
                      Restore to here
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Dialog>
  );
}

/* ── prompt / confirm ──────────────────────────────────────────────────────
 * In-surface, not `window.prompt` / `window.confirm`.
 *
 * The native ones are unstyled, block the whole tab, cannot show the store's
 * own refusal reason next to the field that caused it, and in an embedded
 * console read as the browser interrupting rather than the product asking. They
 * are also unusable for a name collision, which is the single most common
 * outcome here and the one that needs the previous value kept and corrected.
 */

export function PromptDialog({
  title,
  label,
  initial = "",
  confirmLabel = "OK",
  onCancel,
  onSubmit,
}: {
  title: string;
  label: string;
  initial?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = React.useState(initial);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    // Select the STEM, not the extension: renaming "report.docx" almost always
    // means changing "report", and selecting everything makes the extension easy
    // to destroy by accident.
    const dot = initial.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);

  return (
    <Dialog title={title} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = value.trim();
          if (next) onSubmit(next);
        }}
      >
        <label
          className="block text-[11px] text-[var(--cg-text-muted)]"
          htmlFor="id-prompt-input"
        >
          {label}
        </label>
        <input
          id="id-prompt-input"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--cg-border)] bg-[var(--cg-bg-page)] px-2.5 py-1.5 text-[13px] text-[var(--cg-text-nav)] outline-none focus:border-[var(--cg-accent,#4C9AFF)]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--cg-border)] px-3 py-1 text-[12px] hover:bg-[var(--cg-bg-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded-md border border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-accent,#4C9AFF)]/15 px-3 py-1 text-[12px] text-[var(--cg-text-nav)] disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function ConfirmDialog({
  title,
  body,
  detail,
  confirmLabel = "Delete",
  destructive = true,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  detail?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p className="text-[13px] text-[var(--cg-text-nav)]">{body}</p>
      {detail && (
        <p className="mt-2 break-all font-mono text-[11px] text-[var(--cg-text-muted)]">
          {detail}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--cg-border)] px-3 py-1 text-[12px] hover:bg-[var(--cg-bg-hover)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-md border px-3 py-1 text-[12px] text-[var(--cg-text-nav)] ${
            destructive
              ? "border-amber-500/60 bg-amber-500/10"
              : "border-[var(--cg-border)] hover:bg-[var(--cg-bg-hover)]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export const DialogIcons = { Shield };

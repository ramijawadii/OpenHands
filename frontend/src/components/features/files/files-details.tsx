/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { X, Star, Loader2, History as HistoryIcon } from "lucide-react";
import {
  filesApi,
  baseName,
  VfsError,
  type VfsEntry,
  type PermissionMatrix,
  type FileMetadata,
  parentOf,
} from "./files-api";
import { formatSize, formatWhen } from "./files-dialogs";
import { FileArt } from "./files-icons";

/**
 * The details inspector.
 *
 * Docked, not modal. Deciding whether an artifact is the right one is something
 * you do WHILE looking at the list — a dialog that covers the list makes you
 * close it to compare, which is why Seafile docks its own info panel too.
 *
 * Everything here is read-only, and that is a backend fact rather than a choice:
 * `/metadata` reads Seafile's extended properties and tags, but no VFS route
 * writes them. Rendering an editable field over a missing endpoint would be a
 * control that silently does nothing.
 */

type Tab = "details" | "permissions";

export interface DetailsPanelProps {
  entry: VfsEntry;
  conversationId: string;
  store: string;
  pinned: boolean;
  onTogglePin: () => void;
  onOpenHistory: () => void;
  onClose: () => void;
}

/** The human name for the format, matching what the tiles draw. A properties
 *  panel saying "application/vnd.openxmlformats-officedocument..." where the
 *  desktop says "Microsoft Word Document" is technically right and useless. */
function typeName(entry: { path: string; kind: string; mime: string | null }) {
  if (entry.kind === "dir") return "File folder";
  const name = entry.path.slice(entry.path.lastIndexOf("/") + 1);
  const i = name.lastIndexOf(".");
  const ext = i > 0 ? name.slice(i + 1).toUpperCase() : "";
  return ext ? `${ext} file` : entry.mime || "File";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-[var(--cg-border)] py-1.5 last:border-0">
      <span className="w-24 shrink-0 text-[11px] text-[var(--cg-text-muted)]">
        {label}
      </span>
      <span className="min-w-0 break-all text-[11px] text-[var(--cg-text-nav)]">
        {value}
      </span>
    </div>
  );
}

export function FilesDetailsPanel({
  entry,
  conversationId,
  store,
  pinned,
  onTogglePin,
  onOpenHistory,
  onClose,
}: DetailsPanelProps) {
  const [tab, setTab] = React.useState<Tab>("details");
  const [meta, setMeta] = React.useState<FileMetadata | null>(null);
  const [perms, setPerms] = React.useState<PermissionMatrix | null>(null);
  const [permError, setPermError] = React.useState("");

  React.useEffect(() => {
    setMeta(null);
    setPerms(null);
    setPermError("");
    let cancelled = false;
    filesApi
      .metadata(entry.path, conversationId, store)
      .then((d) => !cancelled && setMeta(d))
      .catch(
        () =>
          !cancelled && setMeta({ enabled: false, properties: {}, tags: [] }),
      );
    filesApi
      .permissions(entry.path, conversationId, store)
      .then((d) => !cancelled && setPerms(d))
      .catch((e: VfsError) => !cancelled && setPermError(e.message));
    return () => {
      cancelled = true;
    };
  }, [entry.path, conversationId, store]);

  const isDir = entry.kind === "dir";
  const [contains, setContains] = React.useState<{
    files: number;
    dirs: number;
  } | null>(null);

  // Counted only for folders, and only one level deep — the store has no
  // recursive-size call, and walking the tree to fill in one line of a panel
  // would issue a request per subdirectory every time someone clicked a folder.
  React.useEffect(() => {
    if (!isDir) {
      setContains(null);
      return undefined;
    }
    let cancelled = false;
    filesApi
      .listDir(entry.path, conversationId, store)
      .then((d) => {
        if (cancelled) return;
        setContains({
          files: d.entries.filter((e) => e.kind === "file").length,
          dirs: d.entries.filter((e) => e.kind === "dir").length,
        });
      })
      .catch(() => {
        if (!cancelled) setContains(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isDir, entry.path, conversationId, store]);

  return (
    <aside
      aria-label="Details"
      className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-[var(--cg-border)]"
    >
      <div className="flex items-center gap-1 border-b border-[var(--cg-border)] px-3 py-2">
        <FileArt path={entry.path} kind={entry.kind} size={20} />
        <span
          className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--cg-text-nav)]"
          title={entry.path}
        >
          {baseName(entry.path)}
        </span>
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? "Unpin" : "Pin"}
          title={pinned ? "Unpin from this browser" : "Pin in this browser"}
          className="rounded p-1 hover:bg-[var(--cg-bg-hover)]"
        >
          <Star
            className={`h-3.5 w-3.5 ${
              pinned
                ? "fill-amber-400 text-amber-400"
                : "text-[var(--cg-text-muted)]"
            }`}
          />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-[var(--cg-border)] px-2 py-1">
        {(["details", "permissions"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-2 py-0.5 text-[11px] capitalize ${
              tab === t
                ? "bg-[var(--cg-bg-hover)] text-[var(--cg-text-nav)]"
                : "text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
        {tab === "details" && (
          <>
            <Field label="Type" value={typeName(entry)} />
            {/* "Location" is the CONTAINING folder, as a properties dialog shows
                it — the full path is already in the header tooltip, and
                repeating it here wastes the most useful row in the panel. */}
            <Field
              label="Location"
              value={parentOf(entry.path) || "the library root"}
            />
            <Field
              label="Size"
              value={
                isDir
                  ? "—"
                  : `${formatSize(entry.size)} (${entry.size.toLocaleString()} bytes)`
              }
            />
            {isDir && (
              <Field
                label="Contains"
                value={
                  contains
                    ? `${contains.files} file${contains.files === 1 ? "" : "s"}, ${contains.dirs} folder${contains.dirs === 1 ? "" : "s"}`
                    : "counting…"
                }
              />
            )}
            <Field label="Modified" value={formatWhen(entry.mtime)} />
            {/* Deliberately present and empty rather than omitted: a properties
                panel that silently lacks a field people expect looks incomplete,
                while one that says the store does not keep it is an answer. */}
            <Field label="Created" value="not recorded by this store" />
            <Field
              label="Version"
              value={
                <span className="flex items-center gap-1.5">
                  {entry.version ? `v${entry.version}` : "—"}
                  {!isDir && (
                    <button
                      type="button"
                      onClick={onOpenHistory}
                      title="Version history"
                      aria-label="Version history"
                      className="rounded p-0.5 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-nav)]"
                    >
                      <HistoryIcon className="h-3 w-3" />
                    </button>
                  )}
                </span>
              }
            />

            {/* Shown in full, never truncated: this is the chain-of-custody
                value the audit trail records, and a hash you cannot compare is
                decoration. */}
            <Field
              label="SHA-256"
              value={
                <span className="font-mono">
                  {entry.content_hash || "not recorded"}
                </span>
              }
            />

            {!isDir && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-[var(--cg-border)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
              >
                <HistoryIcon className="h-3 w-3" />
                Version history
              </button>
            )}

            <div className="mt-4 text-[10px] font-medium uppercase tracking-wide text-[var(--cg-text-muted)]">
              Library metadata
            </div>
            {!meta && (
              <div className="flex items-center gap-2 py-2 text-[11px] text-[var(--cg-text-muted)]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Reading…
              </div>
            )}
            {meta && !meta.enabled && (
              <p className="py-2 text-[11px] leading-relaxed text-[var(--cg-text-muted)]">
                Extended properties are not enabled on this library.
              </p>
            )}
            {meta?.enabled && (
              <>
                {Object.entries(meta.properties).map(([k, v]) => (
                  <Field key={k} label={k} value={String(v)} />
                ))}
                {meta.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {meta.tags.map((t, i) => (
                      <span
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        className="rounded bg-[var(--cg-bg-hover)] px-1.5 py-0.5 text-[10px] text-[var(--cg-text-nav)]"
                      >
                        {typeof t === "string" ? t : JSON.stringify(t)}
                      </span>
                    ))}
                  </div>
                ) : (
                  Object.keys(meta.properties).length === 0 && (
                    <p className="py-2 text-[11px] text-[var(--cg-text-muted)]">
                      No properties or tags on this file.
                    </p>
                  )
                )}
              </>
            )}
          </>
        )}

        {tab === "permissions" && (
          <>
            {perms && perms.enforcing === false && (
              // The single most important thing this tab can say. Every cell
              // below is green, and without this they read as "governed".
              <p className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-[var(--cg-text-nav)]">
                <strong>Nothing is being enforced.</strong> This store is
                running {perms.policy || "AllowAll"}, so every operation is
                permitted for both principals — the WORM zones, the agent
                capability manifest and the mode gate are all inert on this
                path.
              </p>
            )}
            <p className="pb-2 text-[10px] leading-relaxed text-[var(--cg-text-muted)]">
              Answered by the policy engine, not restated here.
            </p>
            {permError && (
              <p className="text-[11px] text-amber-400">{permError}</p>
            )}
            {!perms && !permError && (
              <div className="flex items-center gap-2 py-2 text-[11px] text-[var(--cg-text-muted)]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Asking the policy engine…
              </div>
            )}
            {perms && (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                    <th className="pb-1 font-medium">Op</th>
                    {Object.keys(perms.matrix).map((a) => (
                      <th key={a} className="pb-1 font-medium capitalize">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perms.ops.map((op) => (
                    <tr key={op} className="border-t border-[var(--cg-border)]">
                      <td className="py-1 capitalize text-[var(--cg-text-nav)]">
                        {op}
                      </td>
                      {Object.keys(perms.matrix).map((a) => {
                        const cell = perms.matrix[a]?.[op];
                        return (
                          <td key={a} className="py-1">
                            <span
                              title={cell?.reason || ""}
                              className={
                                cell?.allow
                                  ? "text-emerald-400"
                                  : "text-[var(--cg-text-muted)]"
                              }
                            >
                              {cell?.allow ? "allow" : "deny"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

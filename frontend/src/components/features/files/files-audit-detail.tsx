/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Loader2, Eye, Link2, FileClock } from "lucide-react";
import {
  filesApi,
  VfsError,
  DEFAULT_STORE,
  type AuditEntry,
  type FileVersion,
} from "./files-api";
import {
  Dialog,
  VersionPreviewDialog,
  formatWhen,
  formatSize,
} from "./files-dialogs";
import {
  describeAction,
  looksLikeStorePath,
  rootedLocation,
  targetName,
} from "./files-audit-actions";

/**
 * One audit entry, opened.
 *
 * THE QUESTION THIS ANSWERS is not "what does the row say" — the row already
 * says it. It is "what did the artifact look like on either side of this
 * action", which is the only way to review a change rather than merely notice
 * one. A ledger that records that a report was rewritten at 14:02 and cannot
 * show what it said at 14:01 has recorded an event, not evidence.
 *
 * The two halves are kept visibly separate:
 *
 *   THE ENTRY is what the hash chain commits to. It is displayed exactly as
 *   stored, raw action id included, and nothing here interprets it away.
 *
 *   THE REVISIONS are read LIVE from the store at open time and are NOT part of
 *   the chain. They can disagree with the entry — a file may since have been
 *   deleted, a store may not keep history at all — and when they do, this says
 *   so instead of quietly showing fewer rows.
 */

/** Seafile hands back epoch seconds for file history while the ledger writes ISO
 *  strings. Both are parsed here rather than at four call sites that would each
 *  get one of the two cases wrong. */
function toMillis(value: string | number): number {
  if (value === "" || value === null || value === undefined) return NaN;
  const n = Number(value);
  if (Number.isFinite(n) && String(value).trim() !== "") {
    return n > 1e12 ? n : n * 1000;
  }
  return new Date(String(value)).getTime();
}

/**
 * How far AFTER a revision's own timestamp an entry may still be its cause.
 *
 * THE TWO CLOCKS DO NOT AGREE, and not only by rounding. A VFS entry is written
 * to a durable outbox on the fast path and drained into the hash chain by a
 * background flusher (see `_audit_sink` in `cloudguard_vfs.py`), so the ledger's
 * `ts` is the moment the entry was CHAINED, not the moment the operation ran.
 * The flusher is notified after every op, so the gap is normally well under a
 * second — and it always leans the same way: the entry is never EARLIER than the
 * write it describes.
 *
 * Matching exactly would therefore attribute a write to the revision before it,
 * which is precisely the mistake this panel exists to prevent, so the boundary
 * is deliberately generous in the one direction the skew runs.
 *
 * The residual limit is stated in the UI rather than papered over: if the same
 * file were written twice inside this window, the pairing below is a best match
 * and not a proof.
 */
const CLOCK_SLACK_MS = 5000;

export interface Revisions {
  /** Newest first, as the store returns them. */
  all: FileVersion[];
  /**
   * The revision that was current the instant this entry was written.
   *
   * For a write that IS the revision the action produced; for everything else it
   * is simply the state the actor was looking at.
   */
  atAction: FileVersion | null;
  /** The revision a write REPLACED — the file as it stood before. */
  before: FileVersion | null;
}

/**
 * Line up an entry against a file's history.
 *
 * Exported and pure so the matching rule — the part that would be silently
 * wrong — is testable without mounting a dialog.
 */
export function alignRevisions(
  versions: FileVersion[],
  entryTs: string,
  writes: boolean,
): Revisions {
  const stamp = toMillis(entryTs);
  const all = [...versions].sort(
    (a, b) => toMillis(b.created_at) - toMillis(a.created_at),
  );
  if (!Number.isFinite(stamp)) return { all, atAction: null, before: null };

  const index = all.findIndex(
    (v) => toMillis(v.created_at) <= stamp + CLOCK_SLACK_MS,
  );
  if (index < 0) {
    // Every revision is NEWER than the entry. That happens on a read of a file
    // that has since been rewritten, and there is nothing to point at without
    // guessing.
    return { all, atAction: null, before: null };
  }
  const atAction = all[index] ?? null;
  // Only a write has a "before". For a read, the revision at the time and the
  // revision before it are two different files and pairing them would imply a
  // change that never happened.
  const before = writes ? (all[index + 1] ?? null) : null;
  return { all, atAction, before };
}

function Fact({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
        {label}
      </div>
      <div
        className={`break-all text-[12px] text-[var(--cg-text-nav)] ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** One revision, as a card. `tone` carries which side of the action it is on. */
function RevisionCard({
  title,
  note,
  version,
  onView,
}: {
  title: string;
  note: string;
  version: FileVersion | null;
  onView: (v: FileVersion) => void;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-md border border-[var(--cg-border)] bg-[var(--cg-bg-hover)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
        {title}
      </div>
      {version ? (
        <>
          <div className="mt-1 text-[12px] text-[var(--cg-text-nav)]">
            {formatWhen(version.created_at)}
          </div>
          <div className="text-[11px] text-[var(--cg-text-muted)]">
            {version.author || "unknown author"} · {formatSize(version.size)}
          </div>
          <div className="mt-0.5 break-all font-mono text-[10px] text-[var(--cg-text-muted)]">
            {version.id.slice(0, 12)}
          </div>
          <button
            type="button"
            onClick={() => onView(version)}
            className="mt-2 flex items-center gap-1 rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-card)]"
          >
            <Eye className="h-3 w-3" />
            View this version
          </button>
        </>
      ) : (
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--cg-text-muted)]">
          {note}
        </div>
      )}
    </div>
  );
}

export function AuditEntryDialog({
  entry,
  conversationId,
  fallbackStore = DEFAULT_STORE,
  onClose,
}: {
  entry: AuditEntry;
  conversationId: string;
  /**
   * Which store to look in when the ENTRY does not say.
   *
   * Entries written before the store-tagging sink carry no store, and the same
   * relative path exists in both libraries. The browser's current store is the
   * best available guess and the panel LABELS IT AS A GUESS — silently reading
   * the wrong library would show a reviewer a stranger's history under the right
   * filename, which is worse than showing nothing.
   */
  fallbackStore?: string;
  onClose: () => void;
}) {
  const spec = describeAction(entry.action);
  const details = entry.details ?? {};
  const store = details.store || fallbackStore;
  const storeIsInferred = !details.store;
  const addressable = looksLikeStorePath(entry.resource, entry.action);
  const denied = entry.decision === "deny" || entry.decision === "denied";

  const [state, setState] = React.useState<{
    loading: boolean;
    versioned: boolean;
    error: string;
    revisions: Revisions;
  }>({
    loading: addressable,
    versioned: true,
    error: "",
    revisions: { all: [], atAction: null, before: null },
  });
  const [preview, setPreview] = React.useState<FileVersion | null>(null);

  React.useEffect(() => {
    // A denial changed nothing, and an entry whose resource is a command line or
    // a checkpoint id has no history to read. Asking anyway would put a spinner
    // and then an error in front of a reviewer for a question that was never
    // sensible.
    if (!addressable || denied) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    filesApi
      .versions(entry.resource, conversationId, store)
      .then((d) => {
        if (cancelled) return;
        setState({
          loading: false,
          versioned: d.versioned,
          error: "",
          revisions: alignRevisions(d.versions, entry.ts, spec.writes === true),
        });
      })
      .catch((e: VfsError) => {
        if (cancelled) return;
        setState({
          loading: false,
          versioned: true,
          // The store's own reason is kept: "no such path" after a delete is a
          // DIFFERENT fact from "this store keeps no history", and collapsing
          // them into "unavailable" throws away the half a reviewer needs.
          error: e.isMissing
            ? "This path no longer exists in the store, so its history cannot be read. The entry below is still intact."
            : e.message,
          revisions: { all: [], atAction: null, before: null },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [entry.resource, entry.ts, entry.action, conversationId, store]);

  const sourcePath = spec.sourceIsPath ? details.source : "";

  return (
    <>
      <Dialog
        wide
        title={spec.label}
        subtitle={`${formatWhen(entry.ts)} · ${entry.actor}`}
        onClose={onClose}
      >
        <p className="text-[12px] leading-relaxed text-[var(--cg-text-muted)]">
          {spec.blurb}
        </p>
        {spec.unregistered && (
          <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
            This action id is not in the console&apos;s action registry, so the
            title above is derived from the id rather than written for it.
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-[var(--cg-border)] p-3 sm:grid-cols-3">
          <Fact label="Target">{targetName(entry.resource) || "—"}</Fact>
          <Fact label="Location" mono>
            {rootedLocation(entry.resource, details.store) || "—"}
          </Fact>
          <Fact label="When">{formatWhen(entry.ts)}</Fact>
          <Fact label="Actor">{entry.actor}</Fact>
          <Fact label="Decision">
            <span className={denied ? "text-amber-400" : "text-[var(--cg-ok)]"}>
              {entry.decision || "—"}
            </span>
          </Fact>
          <Fact label="Recorded action" mono>
            {entry.action}
          </Fact>
          {details.version !== undefined && (
            <Fact label="Artifact version">v{String(details.version)}</Fact>
          )}
          {details.content_hash && (
            <Fact label="Content hash" mono>
              {String(details.content_hash).slice(0, 16)}…
            </Fact>
          )}
          {sourcePath && (
            <Fact label="Came from" mono>
              {sourcePath}
            </Fact>
          )}
          {details.principal && (
            <Fact label="Granted to">
              {details.principal}
              {details.permission ? ` · ${details.permission}` : ""}
            </Fact>
          )}
          {details.checkpoint_id && (
            <Fact label="Checkpoint" mono>
              {details.checkpoint_id}
            </Fact>
          )}
          {details.version_id && (
            <Fact label="Revision used" mono>
              {String(details.version_id).slice(0, 12)}
            </Fact>
          )}
          {details.reason && <Fact label="Reason">{details.reason}</Fact>}
        </div>

        {/* ── the artifact on either side of this action ───────────────── */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--cg-text-muted)]">
            <FileClock className="h-3.5 w-3.5" />
            The artifact around this action
          </div>

          {!addressable && (
            <p className="mt-2 text-[12px] text-[var(--cg-text-muted)]">
              This entry does not refer to a stored file, so there is no version
              history to line it up against.
            </p>
          )}

          {addressable && denied && (
            <p className="mt-2 text-[12px] text-[var(--cg-text-muted)]">
              This operation was REFUSED, so nothing was written and there is no
              revision to compare. The refusal itself is the record.
            </p>
          )}

          {addressable && !denied && (
            <>
              {storeIsInferred && (
                <p className="mt-2 rounded-md border border-[var(--cg-border)] bg-[var(--cg-bg-hover)] px-3 py-2 text-[10px] leading-relaxed text-[var(--cg-text-muted)]">
                  This entry predates store tagging, so the history below was
                  read from the <strong>{store}</strong> store — the one you are
                  browsing. The same path can exist in the other store with a
                  different history.
                </p>
              )}
              {state.loading && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading this file&apos;s history…
                </div>
              )}
              {state.error && (
                <p className="mt-2 text-[12px] leading-relaxed text-amber-400">
                  {state.error}
                </p>
              )}
              {!state.loading && !state.error && !state.versioned && (
                <p className="mt-2 text-[12px] text-[var(--cg-text-muted)]">
                  This store does not keep per-file history, so the state before
                  and after cannot be shown.
                </p>
              )}

              {!state.loading && !state.error && state.versioned && (
                <>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    {spec.writes ? (
                      <>
                        <RevisionCard
                          title="Before this action"
                          note="No earlier revision — this action created the file."
                          version={state.revisions.before}
                          onView={setPreview}
                        />
                        <RevisionCard
                          title="Produced by this action"
                          note="The store has no revision stamped at this moment. It may have been pruned, or the write may have landed in a store that does not version it."
                          version={state.revisions.atAction}
                          onView={setPreview}
                        />
                      </>
                    ) : (
                      <RevisionCard
                        title="The revision that was current"
                        note="No revision of this file predates the entry."
                        version={state.revisions.atAction}
                        onView={setPreview}
                      />
                    )}
                  </div>

                  {(state.revisions.atAction || state.revisions.before) && (
                    <p className="mt-2 text-[10px] leading-relaxed text-[var(--cg-text-muted)]">
                      Revisions are matched to this entry BY TIME. The entry is
                      chained a moment after the operation runs, so a file
                      written twice within a few seconds could pair with the
                      wrong revision. Where the entry carries a content hash,
                      that hash — not this pairing — is what the chain commits
                      to.
                    </p>
                  )}

                  {state.revisions.all.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[11px] text-[var(--cg-text-muted)] hover:text-[var(--cg-text-nav)]">
                        Full history of this file ({state.revisions.all.length})
                      </summary>
                      <table className="mt-2 w-full text-[12px]">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                            <th className="pb-1 font-medium">When</th>
                            <th className="pb-1 font-medium">Author</th>
                            <th className="pb-1 font-medium">Size</th>
                            <th aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {state.revisions.all.map((v) => {
                            const isAt = v.id === state.revisions.atAction?.id;
                            const isBefore =
                              v.id === state.revisions.before?.id;
                            return (
                              <tr
                                key={v.id}
                                className="border-t border-[var(--cg-border)]"
                              >
                                <td className="py-1.5 pr-2 text-[var(--cg-text-nav)]">
                                  {formatWhen(v.created_at)}
                                  {isAt && (
                                    <span className="ml-2 rounded bg-[var(--cg-bg-hover)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                                      {spec.writes
                                        ? "this action"
                                        : "current then"}
                                    </span>
                                  )}
                                  {isBefore && (
                                    <span className="ml-2 rounded bg-[var(--cg-bg-hover)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                                      before
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 pr-2 text-[var(--cg-text-muted)]">
                                  {v.author}
                                </td>
                                <td className="py-1.5 pr-2 text-[var(--cg-text-muted)]">
                                  {formatSize(v.size)}
                                </td>
                                <td className="py-1.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setPreview(v)}
                                    className="rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </details>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── the chain ────────────────────────────────────────────────────
         * Shown last and shown RAW. This is the part that makes the entry
         * evidence rather than a log line, and truncating it to something
         * prettier would remove the only thing a reviewer could check against
         * an export.
         */}
        <div className="mt-4 rounded-md border border-[var(--cg-border)] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--cg-text-muted)]">
            <Link2 className="h-3.5 w-3.5" />
            Chain position
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Fact label="Sequence">#{entry.seq}</Fact>
            <Fact label="This entry" mono>
              {entry.entry_hash || "—"}
            </Fact>
            <Fact label="Previous entry" mono>
              {entry.prev_hash || "—"}
            </Fact>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--cg-text-muted)]">
            Each entry commits to the one before it. Verification is a property
            of the WHOLE chain, not of this row — the header on the activity
            feed reports it.
          </p>
        </div>
      </Dialog>

      {preview && (
        <VersionPreviewDialog
          path={entry.resource}
          versionId={preview.id}
          when={formatWhen(preview.created_at)}
          conversationId={conversationId}
          store={store}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}

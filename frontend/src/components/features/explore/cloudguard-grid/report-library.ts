import { filesApi, DEFAULT_STORE } from "#/components/features/files/files-api";

/**
 * "Save to reports" — writes a one-page report into the ARTIFACT LIBRARY.
 *
 * WHY THIS EXISTS RATHER THAN `ConversationService.uploadFiles`
 * ─────────────────────────────────────────────────────────────
 * That call puts a file in the agent's SANDBOX working directory: a container
 * that is deleted when the conversation ends. A saved finding that disappears
 * with the session is not a report, it is a scratch file — and worse, it never
 * appeared in the Files tab, so the button looked like it had done nothing.
 *
 * Going through `/api/cloudguard/vfs/write` puts it in the durable library
 * instead, which means it is versioned, policy-checked and written into the
 * audit chain like every other artifact. Saving the same finding twice produces
 * a second REVISION of one file rather than a second file — the Seafile upload
 * is `replace=1` and the parent directory is created on demand — so re-saving
 * after raising a ticket updates the report and keeps the old text in history.
 */

/**
 * Where saved reports live.
 *
 * `pages` because that is the folder the Files surface already treats as
 * authored documents — the wiki reads from it and the markdown editor opens
 * them for editing. Putting findings anywhere else would make the one thing
 * people want to do next (open it, fix a sentence, send it) a move operation
 * first.
 */
export const REPORT_FOLDER = "pages";

export interface SaveResult {
  /** Full library path, e.g. `pages/report-evt-2-public-bucket.md`. */
  path: string;
  /** The store's version counter after the write — 1 on the first save. */
  version: number;
}

/**
 * Write one markdown report into the library.
 *
 * Throws on failure rather than returning a flag: every caller renders a
 * "Save failed — retry" state, and a helper that swallowed the error would make
 * that state unreachable while the file silently never arrived.
 */
export async function saveReportToLibrary(
  filename: string,
  markdown: string,
  conversationId: string,
): Promise<SaveResult> {
  const path = `${REPORT_FOLDER}/${filename}`;
  // A File rather than a raw string so this shares `filesApi.upload`'s chunked
  // base64 encoding — a long report with a big evidence table is well past the
  // argument limit that `String.fromCharCode(...bytes)` throws RangeError on.
  const file = new File([markdown], filename, { type: "text/markdown" });
  const entry = await filesApi.upload(
    path,
    file,
    conversationId,
    DEFAULT_STORE,
  );
  return { path, version: entry.version };
}

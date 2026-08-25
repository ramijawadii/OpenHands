import { filesApi, baseName, type VfsEntry } from "./files-api";

/**
 * Search the whole library, not just the folder you happen to be standing in.
 *
 * The filter box used to match names in the CURRENT listing only, which meant
 * the answer to "where is that report" depended on already knowing where it was.
 * This walks the tree.
 *
 * Bounded on purpose, and the bounds are reported rather than hidden: a library
 * can be arbitrarily deep, and an unbounded walk from a keystroke handler is how
 * a search box takes the surface down.
 */

const MAX_NODES = 4000;
const MAX_DEPTH = 12;
const MAX_CONCURRENCY = 6;

export interface SearchHit {
  entry: VfsEntry;
  /** Folder the hit lives in, for the "in …" line under the name. */
  parent: string;
  /** Higher is better. Sorted descending before display. */
  score: number;
}

export interface SearchOutcome {
  hits: SearchHit[];
  scanned: number;
  /** True when a bound stopped the walk, so the UI can say results are partial
   *  instead of implying the list is exhaustive. */
  truncated: boolean;
}

/**
 * Rank a candidate against the query.
 *
 * Ordering matters more than the absolute numbers: an exact name is what you
 * meant, a prefix is probably what you meant, a substring might be, and a
 * path-only match is a last resort. Returns 0 for no match.
 */
function score(entry: VfsEntry, needle: string): number {
  const name = baseName(entry.path).toLowerCase();
  const path = entry.path.toLowerCase();
  if (name === needle) return 100;
  if (name.startsWith(needle)) return 80;
  // A match at a word boundary reads as intentional; mid-token does not.
  if (
    /[\s._-]/.test(name.charAt(name.indexOf(needle) - 1) || " ") &&
    name.includes(needle)
  )
    return 65;
  if (name.includes(needle)) return 50;
  if (path.includes(needle)) return 25;
  return 0;
}

/** Folders sort ahead of files at equal relevance — a search that turns up a
 *  folder is usually a navigation, and you want it first. */
function kindRank(kind: string): number {
  return kind === "dir" ? 0 : 1;
}

/**
 * Walk the tree breadth-first, collecting matches.
 *
 * Breadth-first because shallow results are almost always the ones wanted, so
 * hitting a bound costs the least relevant part of the tree rather than a
 * whole branch near the root. Directories are matched too — "where is the
 * evidence folder" is the same question as "where is that file".
 */
export async function searchLibrary(
  query: string,
  conversationId: string,
  store: string,
  signal?: { cancelled: boolean },
): Promise<SearchOutcome> {
  const needle = query.trim().toLowerCase();
  if (!needle) return { hits: [], scanned: 0, truncated: false };

  const hits: SearchHit[] = [];
  let scanned = 0;
  let truncated = false;

  let frontier: string[] = [""];
  for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth += 1) {
    if (signal?.cancelled) break;
    const next: string[] = [];

    // Fetched in small parallel batches: one request per folder in series makes
    // a deep tree feel broken, and unbounded parallelism buries the app.
    for (let i = 0; i < frontier.length; i += MAX_CONCURRENCY) {
      if (signal?.cancelled || scanned >= MAX_NODES) break;
      const batch = frontier.slice(i, i + MAX_CONCURRENCY);
      // eslint-disable-next-line no-await-in-loop -- batches are deliberately sequential
      const listings = await Promise.all(
        batch.map((prefix) =>
          filesApi
            .listDir(prefix, conversationId, store)
            .then((d) => d.entries)
            // A folder that cannot be listed contributes nothing; one
            // unreadable subtree must not fail the whole search.
            .catch(() => [] as VfsEntry[]),
        ),
      );
      // A plain loop, not `forEach`: the callback would close over the mutable
      // `scanned` / `truncated` counters declared outside it.
      for (const entry of listings.flat()) {
        scanned += 1;
        if (scanned > MAX_NODES) {
          truncated = true;
          break;
        }
        const s = score(entry, needle);
        if (s > 0) {
          const parent = entry.path.includes("/")
            ? entry.path.slice(0, entry.path.lastIndexOf("/"))
            : "";
          hits.push({ entry, parent, score: s });
        }
        if (entry.kind === "dir") next.push(entry.path);
      }
    }

    if (scanned >= MAX_NODES) {
      truncated = true;
      break;
    }
    frontier = next;
  }

  if (frontier.length && !truncated) truncated = true;

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      // Folders first at equal relevance — you are usually navigating to one.
      kindRank(a.entry.kind) - kindRank(b.entry.kind) ||
      baseName(a.entry.path).localeCompare(baseName(b.entry.path)),
  );

  return { hits: hits.slice(0, 200), scanned, truncated };
}

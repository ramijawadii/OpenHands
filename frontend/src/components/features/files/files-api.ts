/**
 * Typed client for the artifact store's VFS API.
 *
 * Every call goes through `/api/cloudguard/vfs/*`, never to Seafile directly.
 * That is the point of the native browser: rename, move, copy, mkdir and
 * undelete used to be issued against seahub from inside the framed UI, which
 * meant those five operations bypassed the policy engine, the WORM zones and
 * the audit chain entirely. Here they are ordinary VFS operations and are
 * authorized, evented and audited like any other write.
 */

export type EntryKind = "file" | "dir";

export interface VfsEntry {
  path: string;
  size: number;
  mtime: number;
  content_hash: string;
  version: number;
  mime: string | null;
  kind: EntryKind;
  /** Who last changed it, per the store. Present on every listing entry. */
  author?: string;
}

export interface FileVersion {
  id: string;
  path: string;
  created_at: string;
  size: number;
  author: string;
  is_current: boolean;
}

export interface TrashItem {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
  deleted_at: string;
  commit_id: string;
}

export interface Checkpoint {
  id: string;
  description: string;
  author: string;
  /** Unix SECONDS from this endpoint, unlike `FileVersion.created_at`, which is
   *  an ISO string — the two come from different Seafile APIs and neither
   *  normalizes the other. `formatWhen` accepts both rather than the callers
   *  having to remember which is which. */
  created_at: string | number;
}

export interface FileMetadata {
  enabled: boolean;
  properties: Record<string, unknown>;
  tags: unknown[];
}

/** One entry in the tamper-evident audit chain. `prev_hash` is carried so the
 *  UI can show the chain, not just a list — an activity feed you cannot verify
 *  is indistinguishable from one that was edited after the fact. */
export interface AuditEntry {
  /**
   * Which chain the entry came from: "control" (governance, search, agent
   * conversation actions) or "vfs" (every file operation).
   *
   * A tenant has TWO independent hash chains, and `seq` restarts at 1 in each —
   * so `seq` alone is NOT an identity across the feed and must never be used as
   * a list key on its own.
   */
  chain: "control" | "vfs" | string;
  seq: number;
  ts: string;
  actor: string;
  category: string;
  action: string;
  resource: string;
  decision: string;
  entry_hash: string;
  prev_hash: string;
  /**
   * The call site's own fields, as published by the ledger's allowlist.
   *
   * Kept in their own bag rather than flattened onto the entry so a reader can
   * tell them apart from the six the hash chain guarantees. Every key is
   * OPTIONAL and entries written before a field existed simply will not have it
   * — `store` in particular is absent on everything older than the store-tagging
   * sink, and the UI must degrade rather than guess.
   */
  details?: {
    /** Which library the path is in: "artifacts" or "sandbox". */
    store?: string;
    /** For a move or a copy, the path it came FROM. For agent actions, the
     *  event origin ("conversation") — the two are told apart by action. */
    source?: string;
    version_id?: string;
    commit_id?: string;
    checkpoint_id?: string;
    trigger?: string;
    conversation?: string;
    session_id?: string;
    content_hash?: string;
    /** The store's version counter for this path AFTER the operation. */
    version?: number | string;
    /** Why a denial was a denial. */
    reason?: string;
    principal?: string;
    permission?: string;
    name?: string;
    description?: string;
    item?: string;
    tab?: string;
  };
}

/** One recorded share. `granted_at` is ISO from the server. */
export interface Grant {
  path: string;
  principal: string;
  permission: string;
  granted_by: string;
  granted_at: string;
}

export interface PermissionMatrix {
  path: string;
  store: string;
  ops: string[];
  matrix: Record<string, Record<string, { allow: boolean; reason?: string }>>;
  /** The policy class that produced the matrix, e.g. `AllowAllPolicy`. */
  policy?: string;
  /** False when the engine is running AllowAll — every cell is True and NOTHING
   *  is being enforced. The UI must say so: a panel of green ticks with no such
   *  warning reads as "this artifact is governed" when it is not. */
  enforcing?: boolean;
}

const BASE = "/api/cloudguard/vfs";

/** The durable store. The API also knows "sandbox" — the agent's working
 *  directory — which callers may pass explicitly; it resolves per conversation
 *  and so is only reachable when there IS one. */
export const DEFAULT_STORE = "artifacts";

/**
 * A refusal the UI must be able to act on differently from a generic failure.
 *
 * `status` is carried because the three the store returns mean genuinely
 * different things to a person: 409 the name is taken (pick another), 403 the
 * policy refuses (nothing to retry), 404 it is gone (refresh). Collapsing them
 * into one "error" is what makes a file manager feel untrustworthy.
 */
export class VfsError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "VfsError";
    this.status = status;
  }

  /** The destination name is already taken. */
  get isConflict() {
    return this.status === 409;
  }

  get isDenied() {
    return this.status === 403;
  }

  get isMissing() {
    return this.status === 404;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  Object.entries(init?.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    ...init,
    credentials: "same-origin",
    headers: init?.body
      ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
      : init?.headers,
  });
  if (!res.ok) {
    // The API answers {"detail": "..."}. Kept verbatim: the store's own reason
    // ("ops-test already exists", "WORM zone: no delete") is more useful than
    // anything this layer could invent, and it is what the analyst needs to
    // decide what to do next.
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* a non-JSON error body is still an error; keep the status */
    }
    throw new VfsError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

/** Conversation id is optional for the artifact store — it is a shared library,
 *  not per-conversation state — but it is threaded through so the audit trail
 *  records which session an action came from when there is one. */
export const filesApi = {
  listDir(
    prefix: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{ entries: VfsEntry[] }> {
    return request("/list-dir", {
      query: { conversation_id: conversationId, prefix, store },
    });
  },

  stat(
    path: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<VfsEntry> {
    return request("/stat", {
      query: { conversation_id: conversationId, path, store },
    });
  },

  mkdir(
    path: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<VfsEntry> {
    return post("/mkdir", {
      conversation_id: conversationId,
      path,
      store,
    });
  },

  /** Rename AND relocate — one operation, as it is on the server. */
  move(
    src: string,
    dst: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<VfsEntry> {
    return post("/move", {
      conversation_id: conversationId,
      src,
      dst,
      store,
    });
  },

  copy(
    src: string,
    dst: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<VfsEntry> {
    return post("/copy", {
      conversation_id: conversationId,
      src,
      dst,
      store,
    });
  },

  remove(
    path: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{ ok: boolean }> {
    return post("/delete", {
      conversation_id: conversationId,
      path,
      store,
    });
  },

  versions(
    path: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{
    versioned: boolean;
    versions: FileVersion[];
  }> {
    return request("/versions", {
      query: { conversation_id: conversationId, path, store },
    });
  },

  /** The bytes of one earlier revision, for viewing BEFORE restoring it. */
  async readVersion(
    path: string,
    versionId: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<Uint8Array> {
    const url = new URL(`${BASE}/read-version`, window.location.origin);
    url.searchParams.set("conversation_id", conversationId);
    url.searchParams.set("path", path);
    url.searchParams.set("version_id", versionId);
    url.searchParams.set("store", store);
    const res = await fetch(url.toString(), { credentials: "same-origin" });
    if (!res.ok) throw new VfsError(res.status, `HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },

  revertFile(
    path: string,
    versionId: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{ ok: boolean }> {
    return post("/revert-file", {
      conversation_id: conversationId,
      path,
      version_id: versionId,
      store,
    });
  },

  trash(
    prefix = "",
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{ supported: boolean; items: TrashItem[] }> {
    return request("/trash", {
      query: { conversation_id: conversationId, prefix, store },
    });
  },

  untrash(
    path: string,
    commitId: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{ ok: boolean }> {
    return post("/untrash", {
      conversation_id: conversationId,
      path,
      commit_id: commitId,
      store,
    });
  },

  checkpoints(
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{ supported: boolean; checkpoints: Checkpoint[] }> {
    return request("/checkpoints", {
      query: { conversation_id: conversationId, store },
    });
  },

  createCheckpoint(
    name: string,
    description = "",
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<Checkpoint> {
    return post("/checkpoint", {
      conversation_id: conversationId,
      name,
      description,
      store,
    });
  },

  /** Point-in-time restore of the WHOLE library. Destructive and library-wide. */
  restore(
    checkpointId: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<{ ok: boolean }> {
    return post("/restore", {
      conversation_id: conversationId,
      checkpoint_id: checkpointId,
      store,
    });
  },

  metadata(
    path: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<FileMetadata> {
    return request("/metadata", {
      query: { conversation_id: conversationId, path, store },
    });
  },

  permissions(
    path: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<PermissionMatrix> {
    return request("/permissions", {
      query: { conversation_id: conversationId, path, store },
    });
  },

  shares(path?: string): Promise<{
    grants: Grant[];
    permissions: string[];
    /** False today. The UI MUST surface this rather than implying protection:
     *  the policy engine treats every console user as one trusted principal, so
     *  a per-user grant has nothing to decide against yet. */
    enforced: boolean;
    note: string;
  }> {
    return request("/shares", { query: { path: path ?? "" } });
  },

  share(
    path: string,
    principal: string,
    permission: string,
  ): Promise<{ ok: boolean }> {
    return post("/share", { path, principal, permission });
  },

  unshare(path: string, principal: string): Promise<{ ok: boolean }> {
    return post("/unshare", { path, principal });
  },

  /**
   * Find artifacts by NAME and by CONTENT, in one request.
   *
   * Server-side (`/vfs/search`) rather than a walk from the browser: content
   * search client-side is one round trip per file from a keystroke handler.
   * `truncated` is carried so the UI can say results are partial instead of
   * implying the list is exhaustive.
   */
  search(
    q: string,
    conversationId = "",
    store = DEFAULT_STORE,
    opts: { prefix?: string; limit?: number } = {},
  ): Promise<{
    hits: {
      path: string;
      kind: EntryKind;
      match: "name" | "content";
      line: number;
      text: string;
    }[];
    scanned: number;
    truncated: boolean;
  }> {
    return request("/search", {
      query: {
        conversation_id: conversationId,
        q,
        store,
        prefix: opts.prefix,
        limit: opts.limit,
      },
    });
  },

  /** Download URL for a file. A plain link, so the browser streams it rather
   *  than the tab holding the whole artifact in memory to hand it back. */
  downloadUrl(
    path: string,
    conversationId = "",
    store = DEFAULT_STORE,
  ): string {
    const url = new URL(`${BASE}/read`, window.location.origin);
    url.searchParams.set("conversation_id", conversationId);
    url.searchParams.set("path", path);
    url.searchParams.set("store", store);
    return url.toString();
  },

  /** Upload one file. Base64 rather than multipart because `/write` takes a
   *  JSON body — one write path for the agent and the analyst, so both are
   *  policed and audited identically. */
  async upload(
    path: string,
    file: File,
    conversationId = "",
    store = DEFAULT_STORE,
  ): Promise<VfsEntry> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    // Chunked: String.fromCharCode(...bytes) blows the argument limit on
    // anything of real size and throws RangeError on a file a user would
    // reasonably upload.
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return post("/write", {
      conversation_id: conversationId,
      path,
      content_b64: btoa(binary),
      mime: file.type || undefined,
      store,
    });
  },
};

/**
 * The audit ledger, which is a DIFFERENT service from the VFS — its own router,
 * its own tenant scoping, its own hash chain. Kept beside the files client
 * because the Activity view is the only consumer here, but never folded into
 * `filesApi`: they answer to different authorities and fail independently.
 */
export const auditApi = {
  async ledger(
    opts: { actor?: string; category?: string; limit?: number } = {},
  ): Promise<{ entries: AuditEntry[]; total: number }> {
    const url = new URL("/api/cloudguard/audit/ledger", window.location.origin);
    if (opts.actor) url.searchParams.set("actor", opts.actor);
    if (opts.category) url.searchParams.set("category", opts.category);
    url.searchParams.set("limit", String(opts.limit ?? 200));
    const res = await fetch(url.toString(), { credentials: "same-origin" });
    if (!res.ok)
      throw new VfsError(res.status, `audit unavailable (${res.status})`);
    return res.json();
  },

  /** Whether the chains still verify. Shown next to the feed, because "these are
   *  the entries" and "the entries have not been tampered with" are two
   *  different claims and only the second one makes the first worth anything.
   *
   *  `chains` is per-chain: the combined `ok` says the audit log is sound, but
   *  WHICH chain broke is the first thing anyone responding to a break needs. */
  async verify(): Promise<{
    ok: boolean;
    count: number;
    broken_at: number;
    reason: string;
    chains?: {
      chain: string;
      ok: boolean;
      count: number;
      broken_at: number;
      reason: string;
    }[];
  }> {
    const res = await fetch("/api/cloudguard/audit/verify", {
      credentials: "same-origin",
    });
    if (!res.ok)
      throw new VfsError(res.status, `audit unavailable (${res.status})`);
    return res.json();
  },
};

/** `a/b/c.txt` -> [{name:"a",path:"a"},{name:"b",path:"a/b"}] — breadcrumb trail
 *  for a directory prefix. */
export function crumbsFor(prefix: string): { name: string; path: string }[] {
  if (!prefix) return [];
  const parts = prefix.split("/").filter(Boolean);
  return parts.map((name, i) => ({
    name,
    path: parts.slice(0, i + 1).join("/"),
  }));
}

export function joinPath(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name;
}

export function parentOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

export function baseName(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? path : path.slice(i + 1);
}

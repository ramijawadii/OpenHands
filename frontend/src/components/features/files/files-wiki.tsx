/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  Loader2,
  Plus,
  Users,
  Building2,
  Lock,
  Share2,
  FileText,
} from "lucide-react";
import {
  filesApi,
  VfsError,
  baseName,
  type VfsEntry,
  type Grant,
} from "./files-api";
import { formatWhen, PromptDialog } from "./files-dialogs";

/**
 * Wiki — markdown pages meant to be READ BY OTHER PEOPLE.
 *
 * The distinction from the rest of the library is intent, not storage. Artifacts
 * are evidence: produced by a run, versioned, cited. A wiki page is written for
 * an audience — a runbook, a standard, an onboarding note — and its defining
 * question is "who can see this", which is why sharing is on the surface here
 * rather than buried in a context menu.
 *
 * Everything is an ordinary file under `wiki/`, so pages get the same
 * versioning, history, point-in-time restore and audit as everything else. This
 * is a VIEW with a different emphasis, not a second storage system — a wiki that
 * kept its own copies would be one more place for the truth to diverge.
 */

const WIKI_ROOT = "wiki";

/** The three audiences a page can be written for. Ordered narrowest first, so
 *  the safest option is the one nearest the cursor. */
const SCOPES = [
  {
    id: "private",
    label: "Private",
    icon: Lock,
    hint: "Only this workspace's console",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Users,
    hint: "Everyone in this workspace",
  },
  {
    id: "org",
    label: "Organisation",
    icon: Building2,
    hint: "Everyone in the org",
  },
] as const;

const TEMPLATE = (title: string) =>
  `# ${title}\n\n> Status: draft\n\n## Purpose\n\nWhat this page is for, in one or two sentences.\n\n## Detail\n\n`;

export function WikiView({
  conversationId,
  store,
  onOpen,
  onShare,
  refreshToken,
  onChanged,
}: {
  conversationId: string;
  store: string;
  onOpen: (path: string) => void;
  onShare: (path: string) => void;
  refreshToken: number;
  onChanged: () => void;
}) {
  const [pages, setPages] = React.useState<VfsEntry[]>([]);
  const [grants, setGrants] = React.useState<Grant[]>([]);
  const [state, setState] = React.useState<{ loading: boolean; error: string }>(
    {
      loading: true,
      error: "",
    },
  );
  const [creating, setCreating] = React.useState(false);
  const [scope, setScope] = React.useState<string>("workspace");

  const load = React.useCallback(() => {
    setState({ loading: true, error: "" });
    filesApi
      .listDir(WIKI_ROOT, conversationId, store)
      .then((d) => {
        setPages(
          d.entries.filter(
            (e) => e.kind === "file" && /\.(md|markdown)$/i.test(e.path),
          ),
        );
        setState({ loading: false, error: "" });
      })
      .catch((e: VfsError) => {
        // A missing wiki folder is an EMPTY wiki, not a failure — it simply has
        // not been created yet, and the first page will make it.
        if (e.isMissing) {
          setPages([]);
          setState({ loading: false, error: "" });
          return;
        }
        setState({ loading: false, error: e.message });
      });
    filesApi
      .shares()
      .then((d) => setGrants(d.grants))
      .catch(() => setGrants([]));
  }, [conversationId, store]);

  React.useEffect(load, [load, refreshToken]);

  const create = (title: string) => {
    const slug =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "untitled";
    const path = `${WIKI_ROOT}/${slug}.md`;
    fetch("/api/cloudguard/vfs/write", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        path,
        text: TEMPLATE(title.trim()),
        mime: "text/markdown",
        store,
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          let detail = `HTTP ${r.status}`;
          try {
            detail = (await r.json())?.detail ?? detail;
          } catch {
            /* a non-JSON error body is still an error */
          }
          throw new Error(detail);
        }
        // The chosen audience is recorded as a grant straight away, so a page is
        // never briefly created with an audience the author did not pick.
        if (scope !== "private") {
          await filesApi.share(path, scope, "read").catch(() => undefined);
        }
        setCreating(false);
        onChanged();
        load();
        onOpen(path);
      })
      .catch((e: Error) => {
        setCreating(false);
        setState((s) => ({ ...s, error: e.message }));
      });
  };

  const audienceFor = (path: string) => {
    const mine = grants.filter((g) => g.path === path);
    if (mine.some((g) => g.principal === "org")) return SCOPES[2];
    if (mine.some((g) => g.principal === "workspace")) return SCOPES[1];
    return SCOPES[0];
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cg-border)] px-3 py-2">
        <span className="text-[11px] text-[var(--cg-text-muted)]">
          Pages written to be read by other people. Same versioning and audit as
          every other artifact.
        </span>
        <div className="ml-auto flex items-center gap-1">
          {SCOPES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              title={sc.hint}
              onClick={() => setScope(sc.id)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                scope === sc.id
                  ? "border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-bg-hover)] text-[var(--cg-text-nav)]"
                  : "border-[var(--cg-border-card)] text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
              }`}
            >
              <sc.icon className="h-3 w-3" />
              {sc.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="ml-1 flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
          >
            <Plus className="h-3 w-3" />
            New page
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {state.loading && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading the wiki…
          </div>
        )}
        {state.error && (
          <div className="text-[12px] text-amber-400">{state.error}</div>
        )}
        {!state.loading && !state.error && pages.length === 0 && (
          <div className="p-6 text-center text-[12px] leading-relaxed text-[var(--cg-text-muted)]">
            <p className="text-[var(--cg-text-nav)]">No wiki pages yet.</p>
            <p className="mt-1">
              Pick an audience above and create one — it becomes a markdown file
              under <code>wiki/</code>, versioned like everything else.
            </p>
          </div>
        )}
        {pages.length > 0 && (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 font-medium">Audience</th>
                <th className="pb-2 font-medium">Version</th>
                <th className="pb-2 font-medium">Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {pages.map((e) => {
                const aud = audienceFor(e.path);
                return (
                  <tr
                    key={e.path}
                    className="border-t border-[var(--cg-border)]"
                  >
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => onOpen(e.path)}
                        className="flex items-center gap-2 text-left text-[var(--cg-text-nav)] hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5 text-[var(--cg-text-muted)]" />
                        {baseName(e.path).replace(/\.(md|markdown)$/i, "")}
                      </button>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        title={aud.hint}
                        className="flex items-center gap-1 text-[11px] text-[var(--cg-text-muted)]"
                      >
                        <aud.icon className="h-3 w-3" />
                        {aud.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-[var(--cg-text-muted)]">
                      {e.version ? `v${e.version}` : "—"}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-[var(--cg-text-muted)]">
                      {formatWhen(e.mtime)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onShare(e.path)}
                        className="flex items-center gap-1 rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
                      >
                        <Share2 className="h-3 w-3" />
                        Share
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <PromptDialog
          title="New wiki page"
          label={`Title — shared with ${
            SCOPES.find((s) => s.id === scope)?.label ?? "this workspace"
          }`}
          confirmLabel="Create"
          onCancel={() => setCreating(false)}
          onSubmit={create}
        />
      )}
    </div>
  );
}

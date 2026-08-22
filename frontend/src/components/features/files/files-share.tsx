/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Users, Building2, User, Trash2, Info, Loader2 } from "lucide-react";
import { filesApi, VfsError, baseName, type Grant } from "./files-api";
import { FileArt } from "./files-icons";
import { Dialog } from "./files-dialogs";
import { Dropdown } from "./files-menu";

/**
 * Choose people to share with.
 *
 * The desktop shape: a picker with an Add button, then a table of Name against
 * Permission Level, with a per-row dropdown and a way to remove a row.
 *
 * One honest departure from that shape, stated on the panel itself rather than
 * buried: these grants are RECORDED AND AUDITED, not enforced. The VFS policy
 * models two trust levels — the human console and the untrusted agent — and has
 * no concept of which human, so a per-user grant has nothing to decide against
 * yet. The banner says so because a share panel that implies protection it does
 * not provide is worse than no share panel: someone would rely on it.
 */

const SCOPES: {
  id: string;
  label: string;
  icon: typeof Users;
  hint: string;
}[] = [
  {
    id: "workspace",
    label: "Everyone in the workspace",
    icon: Users,
    hint: "Every member of this workspace",
  },
  {
    id: "org",
    label: "Everyone in the organisation",
    icon: Building2,
    hint: "Every member of the org, across workspaces",
  },
];

const LEVELS: { id: string; label: string; hint: string }[] = [
  { id: "read", label: "Read", hint: "View and download" },
  { id: "update", label: "Update", hint: "View, download and write back" },
  {
    id: "clone",
    label: "Clone",
    hint: "Take a copy out of this library, away from its retention rules",
  },
];

function principalLabel(principal: string): string {
  if (principal === "workspace") return "Everyone in the workspace";
  if (principal === "org") return "Everyone in the organisation";
  return principal.replace(/^user:/, "");
}

function PrincipalIcon({ principal }: { principal: string }) {
  if (principal === "workspace")
    return <Users className="h-4 w-4 text-[var(--cg-text-muted)]" />;
  if (principal === "org")
    return <Building2 className="h-4 w-4 text-[var(--cg-text-muted)]" />;
  return <User className="h-4 w-4 text-[var(--cg-text-muted)]" />;
}

export function ShareDialog({
  path,
  onClose,
}: {
  path: string;
  onClose: () => void;
}) {
  const [grants, setGrants] = React.useState<Grant[]>([]);
  const [enforced, setEnforced] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [entry, setEntry] = React.useState("");
  const [level, setLevel] = React.useState("read");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    filesApi
      .shares(path)
      .then((d) => {
        setGrants(d.grants);
        setEnforced(d.enforced);
        setNote(d.note || "");
        setLoading(false);
      })
      .catch((e: VfsError) => {
        setError(e.message);
        setLoading(false);
      });
  }, [path]);

  React.useEffect(load, [load]);

  const add = () => {
    const raw = entry.trim();
    if (!raw) return;
    // A bare string is a person; the two scopes are picked from the list. There
    // is no directory to autocomplete against — `cloudguard_org` exposes roles
    // and nothing that lists members — so the field takes an identifier rather
    // than pretending to search one.
    const principal = SCOPES.some((sc) => sc.id === raw) ? raw : `user:${raw}`;
    setBusy(true);
    setError("");
    filesApi
      .share(path, principal, level)
      .then(() => {
        setEntry("");
        setBusy(false);
        load();
      })
      .catch((e: VfsError) => {
        setBusy(false);
        setError(e.message);
      });
  };

  const remove = (principal: string) => {
    setBusy(true);
    filesApi
      .unshare(path, principal)
      .then(() => {
        setBusy(false);
        load();
      })
      .catch((e: VfsError) => {
        setBusy(false);
        setError(e.message);
      });
  };

  return (
    <Dialog
      wide
      title="Choose people to share with"
      subtitle={baseName(path)}
      onClose={onClose}
    >
      {!enforced && note && (
        // First thing in the panel, not a footnote. Someone deciding who may see
        // an artifact needs to know the answer before they act on it.
        <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-[var(--cg-text-nav)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{note}</span>
        </div>
      )}

      <p className="mb-2 text-[12px] text-[var(--cg-text-muted)]">
        Type a name and click Add, or pick a group.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="name@example.com"
          aria-label="Person to share with"
          className="min-w-0 flex-1 rounded-md border border-[var(--cg-border)] bg-[var(--cg-bg-page)] px-2.5 py-1.5 text-[12px] text-[var(--cg-text-nav)] outline-none focus:border-[var(--cg-accent,#4C9AFF)]"
        />
        <Dropdown
          value={level}
          options={LEVELS.map((l) => ({
            id: l.id,
            label: l.label,
            hint: l.hint,
          }))}
          onChange={setLevel}
          ariaLabel="Permission level"
        />
        <button
          type="button"
          onClick={add}
          disabled={!entry.trim() || busy}
          className="rounded-md border border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-accent,#4C9AFF)]/15 px-3 py-1.5 text-[12px] text-[var(--cg-text-nav)] disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {SCOPES.map((sc) => (
          <button
            key={sc.id}
            type="button"
            title={sc.hint}
            onClick={() => setEntry(sc.id)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--cg-border)] px-2.5 py-1 text-[11px] text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
          >
            <sc.icon className="h-3 w-3" />
            {sc.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-[11px] text-amber-400">{error}</p>}

      <table className="mt-4 w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Permission level</th>
            <th className="pb-2 font-medium">Granted</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {/* The owner row is not a grant and cannot be removed — it is the
              console itself. Shown because a permission table that omits the
              owner reads as though nobody has full access. */}
          <tr className="border-t border-[var(--cg-border)]">
            <td className="flex items-center gap-2 py-2 pr-3 text-[var(--cg-text-nav)]">
              <User className="h-4 w-4 text-[var(--cg-text-muted)]" />
              This console
            </td>
            <td className="py-2 pr-3 text-[var(--cg-text-muted)]">Owner</td>
            <td className="py-2 pr-3 text-[var(--cg-text-muted)]">—</td>
            <td aria-label="No actions for the owner" />
          </tr>
          {grants.map((g) => (
            <tr
              key={g.principal}
              className="border-t border-[var(--cg-border)]"
            >
              <td className="py-2 pr-3">
                <span className="flex items-center gap-2 text-[var(--cg-text-nav)]">
                  <PrincipalIcon principal={g.principal} />
                  {principalLabel(g.principal)}
                </span>
              </td>
              <td className="py-2 pr-3">
                <Dropdown
                  compact
                  value={g.permission}
                  options={LEVELS.map((l) => ({
                    id: l.id,
                    label: l.label,
                    hint: l.hint,
                  }))}
                  ariaLabel={`Permission for ${principalLabel(g.principal)}`}
                  onChange={(next) => {
                    // Re-granting the same principal REPLACES the level rather
                    // than stacking a row, so the table always shows one
                    // effective answer per name.
                    setBusy(true);
                    filesApi
                      .share(path, g.principal, next)
                      .then(() => {
                        setBusy(false);
                        load();
                      })
                      .catch((err: VfsError) => {
                        setBusy(false);
                        setError(err.message);
                      });
                  }}
                />
              </td>
              <td className="py-2 pr-3 text-[10px] text-[var(--cg-text-muted)]">
                {g.granted_at?.replace("T", " ").replace("+00:00", "") || "—"}
              </td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(g.principal)}
                  aria-label={`Remove ${principalLabel(g.principal)}`}
                  className="rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)] hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {loading && (
        <div className="flex items-center gap-2 py-3 text-[11px] text-[var(--cg-text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Reading grants…
        </div>
      )}
      {!loading && grants.length === 0 && (
        <p className="py-3 text-[11px] text-[var(--cg-text-muted)]">
          Not shared with anyone yet.
        </p>
      )}
    </Dialog>
  );
}

/**
 * Shared by me / Shared with me.
 *
 * "By me" is real: every path this tenant has granted, read straight from the
 * grant store and grouped so one file with three grants is one row, not three.
 *
 * "With me" cannot be real yet and says so rather than showing a convincing
 * empty list. Answering it needs to know WHO you are and which grants name you,
 * and the console has no user identity to match against — the same gap that
 * stops grants being enforced. An empty list with no explanation would read as
 * "nobody has shared anything with you", which is a different and false claim.
 */
export function SharedView({
  mode,
  onOpenFolder,
  onShare,
}: {
  mode: "by-me" | "with-me";
  onOpenFolder: (prefix: string) => void;
  onShare: (path: string) => void;
}) {
  const [grants, setGrants] = React.useState<Grant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (mode === "with-me") {
      setLoading(false);
      return;
    }
    setLoading(true);
    filesApi
      .shares()
      .then((d) => {
        setGrants(d.grants);
        setLoading(false);
      })
      .catch((e: VfsError) => {
        setError(e.message);
        setLoading(false);
      });
  }, [mode]);

  if (mode === "with-me") {
    return (
      <div className="p-6 text-[12px] leading-relaxed text-[var(--cg-text-muted)]">
        <p className="mb-2 text-[var(--cg-text-nav)]">
          This cannot be answered yet.
        </p>
        <p>
          Showing what others shared with you means matching grants against your
          identity, and the console has no per-user identity to match — the same
          gap that stops grants being enforced. An empty list here would claim
          nobody has shared anything with you, which is not what we know.
        </p>
      </div>
    );
  }

  // One row per PATH. A file granted to three principals is one shared artifact,
  // and listing it three times would overstate how much has been shared.
  const byPath = new Map<string, Grant[]>();
  grants.forEach((g) => {
    const list = byPath.get(g.path);
    if (list) list.push(g);
    else byPath.set(g.path, [g]);
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-[12px] text-[var(--cg-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading grants…
      </div>
    );
  }
  if (error)
    return <div className="p-6 text-[12px] text-amber-400">{error}</div>;
  if (!byPath.size) {
    return (
      <div className="p-6 text-[12px] text-[var(--cg-text-muted)]">
        You have not shared anything yet.
      </div>
    );
  }

  return (
    <div className="overflow-auto p-3">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
            <th className="pb-2 font-medium">File</th>
            <th className="pb-2 font-medium">Shared with</th>
            <th className="pb-2 font-medium">Folder</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {[...byPath.entries()].map(([path, list]) => (
            <tr key={path} className="border-t border-[var(--cg-border)]">
              <td className="py-2 pr-3">
                <span className="flex items-center gap-2 text-[var(--cg-text-nav)]">
                  <FileArt path={path} kind="file" size={18} />
                  {baseName(path)}
                </span>
              </td>
              <td className="py-2 pr-3">
                <span className="flex flex-wrap gap-1">
                  {list.map((g) => (
                    <span
                      key={g.principal}
                      title={`${g.permission} — granted ${g.granted_at}`}
                      className="rounded-full border border-[var(--cg-border)] px-2 py-0.5 text-[10px] text-[var(--cg-text-muted)]"
                    >
                      {principalLabel(g.principal)} · {g.permission}
                    </span>
                  ))}
                </span>
              </td>
              <td className="py-2 pr-3 text-[11px] text-[var(--cg-text-muted)]">
                {path.includes("/")
                  ? path.slice(0, path.lastIndexOf("/"))
                  : "the root"}
              </td>
              <td className="py-2 text-right">
                <span className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenFolder(
                        path.includes("/")
                          ? path.slice(0, path.lastIndexOf("/"))
                          : "",
                      )
                    }
                    className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)]"
                  >
                    Show in folder
                  </button>
                  <button
                    type="button"
                    onClick={() => onShare(path)}
                    className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)]"
                  >
                    Manage
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

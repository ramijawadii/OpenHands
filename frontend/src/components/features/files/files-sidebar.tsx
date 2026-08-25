/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  Star,
  Clock,
  Folder,
  FolderOpen,
  ChevronRight,
  Database,
  HardDrive,
  Trash2,
  History,
  ScrollText,
  FileText,
  Share2,
  Inbox,
  BookText,
  Check,
} from "lucide-react";
import type { RailSection } from "#/components/admin/admin-kit";
import { filesApi, baseName, type VfsEntry } from "./files-api";

/**
 * The Files rail, expressed as data for `SideRailPanel` — the same component the
 * Session settings tab renders. One rail implementation across the product means
 * the spacing, the active treatment, the heading rules and the keyboard
 * behaviour are fixed in one place; a second hand-rolled rail is how two panes
 * in the same drawer end up subtly different.
 *
 * The rail renders a FLAT, depth-indented list and does not own the taxonomy, so
 * the folder tree is flattened here: this hook keeps the expansion set and the
 * per-folder children, and emits one section per visible node.
 *
 * The rail uses LINE ICONS, not the file-type artwork the main pane draws. A
 * navigation list wants one consistent glyph weight at 16px; the detailed
 * artwork shrunk to rail size reads as clutter. The artwork earns its place in
 * the tiles, where the icon IS how you identify a file.
 */

export type Special = "trash" | "history";

/** `store:x` | `dir:<path>` | `pin:<path>` | `recent:<path>` | `special:x`.
 *  Namespaced because a rail is a flat id space and a file called "trash" must
 *  not collide with the trash view. */
export type RailId = string;

export function parseRailId(id: RailId): {
  kind: "store" | "dir" | "file" | "special";
  value: string;
} {
  const i = id.indexOf(":");
  const head = id.slice(0, i);
  const value = id.slice(i + 1);
  if (head === "store") return { kind: "store", value };
  if (head === "dir") return { kind: "dir", value };
  if (head === "pin" || head === "recent") return { kind: "file", value };
  return { kind: "special", value };
}

const ICON = 16;

/**
 * The indent guides, twisty and folder mark for one tree row.
 *
 * Built as ONE node in the rail's `icon` slot rather than using its `depth`
 * padding, because a padded row gives no way to draw the ancestry: the light
 * vertical rules that let you follow a nested folder back to its parent have to
 * be real elements, one per ancestor level.
 *
 * The twisty is a `span[role=button]`, not a `<button>`: the rail row is itself
 * a button, and nesting one inside another is invalid HTML — the inner control
 * stops receiving clicks in some browsers, which is exactly the kind of bug that
 * only shows up for some users.
 */
function TreeAffordance({
  depth,
  expandable,
  expanded,
  onToggle,
  label,
}: {
  depth: number;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <span className="flex items-center">
      {Array.from({ length: depth }, (_, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          aria-hidden="true"
          className="flex h-5 w-3 shrink-0 justify-center"
        >
          <span className="h-full w-px bg-[var(--cg-border)]" />
        </span>
      ))}
      <span
        role={expandable ? "button" : undefined}
        aria-label={
          expandable
            ? `${expanded ? "Collapse" : "Expand"} ${label}`
            : undefined
        }
        tabIndex={-1}
        onClick={
          expandable
            ? (e) => {
                // The row navigates; the twisty only opens. Without this a click
                // on the arrow would also change folder, so there would be no way
                // to peek at a subtree without leaving where you are.
                e.stopPropagation();
                onToggle();
              }
            : undefined
        }
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
          expandable
            ? "cursor-pointer text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-nav)]"
            : "opacity-0"
        }`}
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </span>
      {expanded ? (
        <FolderOpen size={ICON} className="ml-0.5 shrink-0" />
      ) : (
        <Folder size={ICON} className="ml-0.5 shrink-0" />
      )}
    </span>
  );
}

interface Options {
  store: string;
  prefix: string;
  pinned: string[];
  recent: string[];
  conversationId: string;
  refreshToken: number;
}

export function useFilesRail({
  store,
  prefix,
  pinned,
  recent,
  conversationId,
  refreshToken,
}: Options) {
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const [children, setChildren] = React.useState<Record<string, VfsEntry[]>>(
    {},
  );

  // Two passes, on purpose.
  //
  // Pass 1 lists the open folders, which is what the tree renders. Pass 2 lists
  // each folder that pass 1 just revealed — not to draw it, but to know whether
  // it has subfolders, which is the only way to decide if it gets a twisty.
  // Showing an arrow on every folder means half of them open onto nothing;
  // showing none means a nested tree looks flat.
  //
  // The cost is one request per VISIBLE folder, cached in `children` and reused
  // the moment that folder is actually expanded, so opening it is then free.
  React.useEffect(() => {
    let cancelled = false;

    const listAll = async (paths: string[]) => {
      const pairs = await Promise.all(
        paths.map(async (path) => {
          try {
            const d = await filesApi.listDir(path, conversationId, store);
            return [path, d.entries.filter((e) => e.kind === "dir")] as const;
          } catch {
            // A folder that cannot be listed contributes no children. The error
            // belongs in the main pane where the analyst is working, not as a
            // broken twisty in the rail.
            return [path, [] as VfsEntry[]] as const;
          }
        }),
      );
      return Object.fromEntries(pairs);
    };

    (async () => {
      const level = await listAll(["", ...expanded]);
      if (cancelled) return;
      setChildren(level);

      const probes = Object.values(level)
        .flat()
        .map((e) => e.path)
        .filter((path) => !(path in level))
        // Bounded: a folder with hundreds of subfolders must not turn one
        // navigation into hundreds of requests. Beyond this the remaining rows
        // simply keep their twisty, which is the safe default.
        .slice(0, 60);
      if (!probes.length) return;

      const deeper = await listAll(probes);
      if (!cancelled) setChildren((prev) => ({ ...deeper, ...prev }));
    })();

    return () => {
      cancelled = true;
    };
  }, [expanded, conversationId, store, refreshToken]);

  // Switching stores must drop the expansion set: the paths belong to the store
  // that was open, and carrying them over would list directories that do not
  // exist in the new one.
  React.useEffect(() => {
    setExpanded([]);
    setChildren({});
  }, [store]);

  const toggle = React.useCallback((path: string) => {
    setExpanded((prev) =>
      prev.includes(path)
        ? // Collapsing a folder collapses everything under it — leaving orphaned
          // descendants expanded makes the next expand render a tree that was
          // never opened.
          prev.filter((p) => p !== path && !p.startsWith(`${path}/`))
        : [...prev, path],
    );
  }, []);

  const sections = React.useMemo<RailSection[]>(() => {
    const out: RailSection[] = [];

    out.push({ id: "h:stores", label: "Stores", heading: true });
    // A TICK on the store in use.
    //
    // The rail's active highlight tracks the folder, not the store, so with two
    // stores that hold the same relative paths there was nothing on screen
    // saying which one you were reading — and `artifacts://reports` and
    // `sandbox://reports` are different files with different durability.
    out.push({
      id: "store:artifacts",
      label: "Artifact library",
      icon:
        store === "artifacts" ? (
          <Check size={ICON} className="text-[var(--cg-ok)]" />
        ) : (
          <Database size={ICON} />
        ),
    });
    // The sandbox resolves per conversation, so it is only reachable when there
    // is one. Offering it otherwise is a store that 4xx's on every click.
    if (conversationId) {
      out.push({
        id: "store:sandbox",
        label: "Sandbox",
        icon:
          store === "sandbox" ? (
            <Check size={ICON} className="text-[var(--cg-ok)]" />
          ) : (
            <HardDrive size={ICON} />
          ),
      });
    }

    out.push({ id: "h:folders", label: "Folders", heading: true });
    out.push({
      id: "dir:",
      label: "All files",
      icon: <FolderOpen size={ICON} />,
    });

    // Above the folder tree: the wiki is a destination people go to on purpose,
    // not a folder they happen to browse into.
    out.push({
      id: "special:wiki",
      label: "Wiki",
      icon: <BookText size={ICON} />,
    });
    out.push({
      id: "special:shared-by-me",
      label: "Shared by me",
      icon: <Share2 size={ICON} />,
    });
    out.push({
      id: "special:shared-with-me",
      label: "Shared with me",
      icon: <Inbox size={ICON} />,
    });

    const walk = (parent: string, depth: number) => {
      (children[parent] ?? []).forEach((entry) => {
        const isOpen = expanded.includes(entry.path);
        // `undefined` means "not probed yet" — keep the twisty. An empty array
        // means we looked and there is nothing, so drop it.
        const probed = children[entry.path];
        const hasSubfolders = probed === undefined || probed.length > 0;
        out.push({
          id: `dir:${entry.path}`,
          label: baseName(entry.path),
          // `depth` is deliberately NOT set: the affordance draws its own indent
          // so the guide rules line up with it. Letting the rail pad as well
          // would double the indent and leave the rules floating.
          icon: (
            <TreeAffordance
              depth={depth}
              expandable={hasSubfolders}
              expanded={isOpen}
              onToggle={() => toggle(entry.path)}
              label={baseName(entry.path)}
            />
          ),
        });
        if (isOpen) walk(entry.path, depth + 1);
      });
    };
    walk("", 0);

    if (pinned.length) {
      // "Pinned", not "Favorites": these live in THIS browser only. Seafile's
      // starred-files API is not exposed through the VFS, and borrowing its
      // label would imply a shared, server-side list that does not exist.
      out.push({
        id: "h:pinned",
        label: "Pinned here",
        heading: true,
        icon: <Star size={11} />,
      });
      pinned.slice(0, 12).forEach((p) => {
        out.push({
          id: `pin:${p}`,
          label: baseName(p),
          icon: <FileText size={ICON} />,
        });
      });
    }

    if (recent.length) {
      out.push({
        id: "h:recent",
        label: "Recent",
        heading: true,
        icon: <Clock size={11} />,
      });
      recent.slice(0, 8).forEach((p) => {
        out.push({
          id: `recent:${p}`,
          label: baseName(p),
          icon: <FileText size={ICON} />,
        });
      });
    }

    out.push({ id: "h:others", label: "Others", heading: true });
    // Ordered by how far back they look: the audit log is everything that has
    // happened, version history is what changed in the library, deleted is what
    // is recoverable right now. Labels renamed to say what they ARE — "Activity"
    // could mean either of the first two, and did.
    //
    // The IDS ARE UNCHANGED. A rename must not move a route: `special:activity`
    // is still the audit log, so any link or restored view state keeps working.
    out.push({
      id: "special:activity",
      label: "Audit log",
      icon: <ScrollText size={ICON} />,
    });
    out.push({
      id: "special:history",
      label: "Version history",
      icon: <History size={ICON} />,
    });
    out.push({
      id: "special:trash",
      label: "Deleted",
      icon: <Trash2 size={ICON} />,
    });

    return out;
  }, [children, expanded, pinned, recent, conversationId, toggle, store]);

  /** What the rail shows as active, derived from where the surface actually is —
   *  so navigating by breadcrumb or double-click moves the rail too, and a
   *  special view highlights ITS row rather than leaving a folder lit. */
  const activeFor = React.useCallback(
    (view: string) =>
      view === "trash" ||
      view === "history" ||
      view === "activity" ||
      view === "shared-by-me" ||
      view === "shared-with-me" ||
      view === "wiki"
        ? `special:${view}`
        : `dir:${prefix}`,
    [prefix],
  );

  return { sections, activeFor, toggle, expanded };
}

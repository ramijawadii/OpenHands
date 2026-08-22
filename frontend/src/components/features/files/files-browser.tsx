/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridReadyEvent,
  type RowDoubleClickedEvent,
  type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {
  FolderPlus,
  Upload,
  RefreshCw,
  Clock,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Table2,
  Images,
  LayoutGrid,
  Info,
  Tag,
  HardDrive,
  Download,
  Trash2,
  Copy,
  FolderInput,
  Pencil,
  X,
  CheckSquare,
  Search,
  FolderOpen,
  FileText,
  ClipboardCopy,
  Share2,
  Shield,
  RotateCcw,
  History as HistoryIcon,
} from "lucide-react";
import { gridThemeFor } from "#/components/features/explore/cloudguard-grid/theme";
import { useTheme } from "#/context/theme-context";
import { SurfaceErrorBoundary } from "#/components/features/reliability/surface-error-boundary";
import {
  filesApi,
  VfsError,
  DEFAULT_STORE,
  baseName,
  crumbsFor,
  joinPath,
  parentOf,
  type VfsEntry,
  type TrashItem,
} from "./files-api";
import {
  ConfirmDialog,
  PermissionsDialog,
  PointInTimeDialog,
  PromptDialog,
  VersionHistoryDialog,
  formatSize,
  formatWhen,
} from "./files-dialogs";
import { SideRailPanel } from "#/components/admin/admin-kit";
import { useFilesRail, parseRailId } from "./files-sidebar";
import { FilesDetailsPanel } from "./files-details";
import { GalleryView, HistoryView, TilesView } from "./files-views";
import { TrashView, ActivityView } from "./files-activity";
import { ShareDialog, SharedView } from "./files-share";
import { FileViewer, openKindFor } from "./files-open";
import {
  SortGroupControls,
  sortEntries,
  dateBucket,
  type SortKey,
  type GroupKey,
} from "./files-sortmenu";
import { FileArt } from "./files-icons";

// Community only (MIT). Registering a single Enterprise module would put the
// grid into licensed mode and paint a watermark without a paid key.
ModuleRegistry.registerModules([AllCommunityModule]);

const MENU_WIDTH = 208;

const OPEN_LABELS: Record<string, string> = {
  office: "Open in ONLYOFFICE",
  diagram: "Open in draw.io",
  notebook: "Open in JupyterLab",
  text: "Open",
  none: "Download",
};
const PIN_KEY = "cloudguard.files.pinned";

const TYPE_NAMES: Record<string, string> = {
  md: "Markdown",
  markdown: "Markdown",
  txt: "Text",
  json: "JSON",
  csv: "Spreadsheet",
  xlsx: "Spreadsheet",
  xls: "Spreadsheet",
  ods: "Spreadsheet",
  docx: "Document",
  doc: "Document",
  odt: "Document",
  rtf: "Document",
  pptx: "Presentation",
  ppt: "Presentation",
  odp: "Presentation",
  pdf: "PDF",
  png: "Image",
  jpg: "Image",
  jpeg: "Image",
  gif: "Image",
  svg: "Image",
  drawio: "Diagram",
  ipynb: "Notebook",
  py: "Python",
  yaml: "YAML",
  yml: "YAML",
  sh: "Shell",
  zip: "Archive",
  tar: "Archive",
  gz: "Archive",
};

function typeLabel(entry?: VfsEntry): string {
  if (!entry) return "";
  if (entry.kind === "dir") return "Folder";
  const name = baseName(entry.path);
  const i = name.lastIndexOf(".");
  if (i < 0) return "File";
  const ext = name.slice(i + 1).toLowerCase();
  return TYPE_NAMES[ext] || ext.toUpperCase();
}

/** Module level, not an inline closure in the column defs: a component defined
 *  during render is a new type on every render, and React would tear down and
 *  rebuild every cell's DOM each time the grid re-rendered. */
function NameCell({ data }: { data?: VfsEntry }) {
  if (!data) return null;
  // The SAME artwork the tiles draw, at row height — one icon vocabulary across
  // the surface, so a .docx is recognisably a .docx in either view.
  return (
    <span className="flex items-center gap-2">
      <FileArt
        path={data.path}
        kind={data.kind}
        size={18}
        className="shrink-0"
      />
      <span className="truncate">{baseName(data.path)}</span>
    </span>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  active,
  compact,
}: {
  icon: typeof FolderPlus;
  label: string;
  onClick: () => void;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] text-[var(--cg-text-nav)] ${
        active
          ? "border-[var(--cg-border)] bg-[var(--cg-bg-hover)]"
          : "border-transparent hover:border-[var(--cg-border)] hover:bg-[var(--cg-bg-hover)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {!compact && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}

/** The list's own shape, drawn before the list is there — so the panel holds its
 *  geometry from the first frame instead of flashing empty. */
function FilesSkeleton() {
  const rows = React.useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  return (
    <div
      className="flex flex-col gap-2 p-3"
      aria-busy="true"
      aria-label="Loading files"
    >
      {rows.map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="cg-skel h-4 w-4 shrink-0 rounded" />
          <div className="cg-skel h-4 min-w-0 flex-1 rounded" />
          <div className="cg-skel hidden h-4 w-20 rounded md:block" />
          <div className="cg-skel hidden h-4 w-16 rounded lg:block" />
          <div className="cg-skel h-4 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

interface MenuItem {
  label: string;
  icon?: typeof FolderPlus;
  act?: () => void;
  /** Why this row cannot be used. Shown as a tooltip; the row stays visible,
   *  because a missing entry reads as a bug while a disabled one explains
   *  itself. */
  disabled?: string;
  sep?: boolean;
  danger?: boolean;
}

interface MenuState {
  x: number;
  y: number;
  entry: VfsEntry;
}

/**
 * One menu for every item, in one order.
 *
 * Entries that do not apply are DISABLED with the reason rather than hidden — a
 * missing item reads as a bug, a disabled one explains itself. Version history
 * on a folder is the case that matters: history is kept per file.
 */
function ContextMenu({
  state,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onMove,
  onDuplicate,
  onDelete,
  onHistory,
  onPermissions,
  onDetails,
  onCopyPath,
  onRestore,
  onShare,
  isTrash = false,
}: {
  state: MenuState;
  onClose: () => void;
  onOpen: (e: VfsEntry) => void;
  onDownload: (e: VfsEntry) => void;
  onRename: (e: VfsEntry) => void;
  onMove: (e: VfsEntry) => void;
  onDuplicate: (e: VfsEntry) => void;
  onDelete: (e: VfsEntry) => void;
  onHistory: (e: VfsEntry) => void;
  onPermissions: (e: VfsEntry) => void;
  onDetails: (e: VfsEntry) => void;
  onCopyPath: (e: VfsEntry) => void;
  onRestore: (e: VfsEntry) => void;
  onShare: (e: VfsEntry) => void;
  /** The trash gets a different, shorter menu — not the same menu with rows
   *  greyed out. */
  isTrash?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const { entry } = state;
  const isDir = entry.kind === "dir";
  // Named after the tool that will actually open it, so the menu says what is
  // about to happen rather than a generic "Open".
  const openLabel = OPEN_LABELS[openKindFor(entry.path)];
  const run = (fn: (e: VfsEntry) => void) => () => {
    onClose();
    fn(entry);
  };

  const items: MenuItem[] = isTrash
    ? [
        // A deleted item cannot be renamed, moved, duplicated or deleted again.
        // Offering those greyed out would be four dead rows, so the trash menu
        // is simply a different, shorter menu.
        { label: "Restore", icon: RotateCcw, act: run(onRestore) },
        { sep: true, label: "sep-1" },
        { label: "Properties", icon: Info, act: run(onDetails) },
      ]
    : [
        // Open and Download are SEPARATE rows for a file we can render. They are
        // different intents — read it here, or take a copy away — and collapsing
        // them meant the only way to look at a report was to download it.
        {
          label: isDir ? "Open" : openLabel,
          icon: isDir ? FolderOpen : FileText,
          act: run(onOpen),
        },
        ...(isDir
          ? []
          : [{ label: "Download", icon: Download, act: run(onDownload) }]),
        { sep: true, label: "sep-1" },
        { label: "Copy path", icon: ClipboardCopy, act: run(onCopyPath) },
        { label: "Duplicate", icon: Copy, act: run(onDuplicate) },
        { label: "Rename", icon: Pencil, act: run(onRename) },
        { label: "Move to…", icon: FolderInput, act: run(onMove) },
        { sep: true, label: "sep-2" },
        { label: "Share…", icon: Share2, act: run(onShare) },
        { sep: true, label: "sep-3" },
        {
          label: "Version history",
          icon: HistoryIcon,
          act: isDir ? undefined : run(onHistory),
          disabled: isDir ? "History is kept per file" : undefined,
        },
        { label: "Permissions", icon: Shield, act: run(onPermissions) },
        { label: "Properties", icon: Info, act: run(onDetails) },
        { sep: true, label: "sep-4" },
        { label: "Delete", icon: Trash2, act: run(onDelete), danger: true },
      ];

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: state.x, top: state.y, width: MENU_WIDTH }}
      className="fixed z-50 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-bg-card,var(--cg-bg-page))] p-1 shadow-xl"
    >
      {items.map((item) =>
        item.sep ? (
          <div key={item.label} className="my-1 h-px bg-[var(--cg-border)]" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={!item.act}
            title={item.disabled || ""}
            onClick={item.act}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--cg-bg-hover)] disabled:cursor-default disabled:opacity-45 disabled:hover:bg-transparent ${
              item.danger ? "text-red-400" : "text-[var(--cg-text-nav)]"
            }`}
          >
            {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0" />}
            <span className="flex-1">{item.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

type Dialogs =
  | { kind: "none" }
  | { kind: "history"; path: string }
  | { kind: "permissions"; path: string }
  | { kind: "share"; path: string }
  | { kind: "pit" };

/** An action waiting on the analyst for a name or a confirmation. Held as state
 *  rather than asked with `window.prompt`, which is unstyled, blocks the whole
 *  tab, and cannot show the store's refusal beside the field that caused it —
 *  which is the most common outcome here, since a name collision is refused. */
type Pending =
  | { kind: "none" }
  | { kind: "newFolder" }
  | { kind: "rename"; entry: VfsEntry }
  | { kind: "move"; entry: VfsEntry }
  | { kind: "delete"; entry: VfsEntry }
  | { kind: "deleteMany"; paths: string[] };

/** Display names, kept apart from the view IDS so a rename never moves a route. */
const VIEW_LABELS: Record<string, string> = {
  activity: "Audit log",
  history: "Version history",
  trash: "Deleted",
  "shared-by-me": "Shared by me",
  "shared-with-me": "Shared with me",
};

type View =
  | "tiles"
  | "table"
  | "gallery"
  | "history"
  | "trash"
  | "activity"
  | "shared-by-me"
  | "shared-with-me";

function readPinned(): string[] {
  // Wrapped because the accessor itself throws in a private window or when site
  // data is blocked — not just returns empty.
  try {
    const raw = window.localStorage.getItem(PIN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function Browser({ conversationId }: { conversationId: string }) {
  const { theme } = useTheme();
  const [store, setStore] = React.useState(DEFAULT_STORE);
  const [prefix, setPrefix] = React.useState("");
  const [view, setView] = React.useState<View>("tiles");
  const [rows, setRows] = React.useState<VfsEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [menu, setMenu] = React.useState<MenuState | null>(null);
  const [dialog, setDialog] = React.useState<Dialogs>({ kind: "none" });
  const [pending, setPending] = React.useState<Pending>({ kind: "none" });
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(0);
  const [selected, setSelected] = React.useState<VfsEntry | null>(null);
  /** Ticked items. Separate from `selected`, which is the ONE item the
   *  details panel describes — clicking a row to inspect it must not silently
   *  arm it for a batch delete. */
  const [checked, setChecked] = React.useState<string[]>([]);
  const [showDetails, setShowDetails] = React.useState(false);
  const [viewing, setViewing] = React.useState<string | null>(null);
  const [pinned, setPinned] = React.useState<string[]>(readPinned);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [tagFilter, setTagFilter] = React.useState("");
  const [query, setQuery] = React.useState("");
  /** Tiles have no column headers to click, so sorting needs its own control.
   *  The table keeps using AG Grid's headers — two sort UIs for one list would
   *  disagree the moment someone used both. */
  const [sort, setSort] = React.useState<SortKey>("name");
  const [ascending, setAscending] = React.useState(true);
  const [group, setGroup] = React.useState<GroupKey>("none");
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [trash, setTrash] = React.useState<{
    items: TrashItem[];
    loading: boolean;
    error: string;
  }>({ items: [], loading: false, error: "" });
  const fileInput = React.useRef<HTMLInputElement | null>(null);

  const load = React.useCallback(
    (target = prefix, s = store) => {
      setLoading(true);
      setError("");
      filesApi
        .listDir(target, conversationId, s)
        .then((d) => {
          setRows(d.entries);
          setLoading(false);
        })
        .catch((e: VfsError) => {
          setRows([]);
          setLoading(false);
          setError(e.message);
        });
    },
    [prefix, store, conversationId],
  );

  React.useEffect(() => {
    load(prefix, store);
    // Ticks are per-listing: carrying them across a navigation would arm a batch
    // action against paths the analyst can no longer see.
    setChecked([]);
  }, [prefix, store, load]);

  // A transient confirmation, so an action that changes nothing visible on
  // screen (a copy into another folder, say) still says it worked.
  const flash = React.useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((n) => (n === message ? "" : n)), 4000);
  }, []);

  const fail = React.useCallback((e: VfsError) => {
    // The store's own reason is kept verbatim — "already exists", "WORM zone: no
    // delete" — because it is what tells someone what to do next.
    setError(e.message);
  }, []);

  const done = React.useCallback(
    (message: string) => {
      setPending({ kind: "none" });
      flash(message);
      // Bumped so the sidebar tree refetches too — a folder renamed in the main
      // pane that stays under its old name in the rail is worse than no rail.
      setRefreshToken((n) => n + 1);
      load();
    },
    [flash, load],
  );

  const toggleCheck = React.useCallback((path: string) => {
    setChecked((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  }, []);

  const togglePin = React.useCallback((path: string) => {
    setPinned((prev) => {
      const next = prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path];
      try {
        window.localStorage.setItem(PIN_KEY, JSON.stringify(next));
      } catch {
        /* a pin that cannot be persisted still works for this session */
      }
      return next;
    });
  }, []);

  const open = React.useCallback(
    (entry: VfsEntry) => {
      if (entry.kind === "dir") {
        setPrefix(entry.path);
        setSelected(null);
        return;
      }
      setRecent((r) =>
        [entry.path, ...r.filter((p) => p !== entry.path)].slice(0, 12),
      );
      // A type we can render opens IN the library, view-only. Everything else
      // downloads through a plain link so the browser streams it — holding an
      // artifact in the tab's memory to hand it back would be pure cost.
      if (openKindFor(entry.path) !== "none") {
        setViewing(entry.path);
        return;
      }
      window.open(
        filesApi.downloadUrl(entry.path, conversationId, store),
        "_blank",
        "noopener",
      );
    },
    [conversationId, store],
  );

  const doDuplicate = React.useCallback(
    (entry: VfsEntry) => {
      // Seafile auto-renames on collision, so the store would happily produce
      // "report (1).docx" itself — but silently. The VFS refuses the collision,
      // so the name is chosen here where the analyst can see it.
      const name = baseName(entry.path);
      const dot = name.lastIndexOf(".");
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      const copyName = `${stem} copy${ext}`;
      filesApi
        .copy(
          entry.path,
          joinPath(parentOf(entry.path), copyName),
          conversationId,
          store,
        )
        .then(() => done(`Duplicated as ${copyName}`))
        .catch(fail);
    },
    [conversationId, store, done, fail],
  );

  const uploadFiles = React.useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setUploading(list.length);
      setError("");
      // Sequential, not parallel. Each upload is a commit in the library, and a
      // burst of concurrent writes contends on the same head — measurably
      // slower, and noisier in the history, than doing them in order.
      list
        .reduce(
          (chain, file) =>
            chain.then(() =>
              filesApi
                .upload(
                  joinPath(prefix, file.name),
                  file,
                  conversationId,
                  store,
                )
                .then(() => setUploading((n) => n - 1))
                .catch((e: VfsError) => {
                  setUploading((n) => n - 1);
                  setError(`${file.name}: ${e.message}`);
                }),
            ),
          Promise.resolve(),
        )
        .then(() => {
          setUploading(0);
          flash(
            list.length === 1
              ? `Uploaded ${list[0].name}`
              : `Uploaded ${list.length} files`,
          );
          setRefreshToken((n) => n + 1);
          load();
        });
    },
    [prefix, conversationId, store, flash, load],
  );

  const columns = React.useMemo<ColDef<VfsEntry>[]>(
    () => [
      {
        headerName: "Name",
        field: "path",
        flex: 3,
        minWidth: 200,
        sortable: true,
        // Folders sort above files in BOTH directions: a file manager that
        // interleaves them is harder to scan, and the comparator is the one
        // place that ordering can be stated once.
        comparator: (a, b, na, nb) => {
          const ea = na.data as VfsEntry | undefined;
          const eb = nb.data as VfsEntry | undefined;
          if (ea && eb && ea.kind !== eb.kind)
            return ea.kind === "dir" ? -1 : 1;
          return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
        },
        cellRenderer: NameCell,
      },
      {
        headerName: "Type",
        colId: "type",
        flex: 1,
        minWidth: 90,
        sortable: true,
        valueGetter: (p) => typeLabel(p.data),
      },
      {
        headerName: "Size",
        field: "size",
        flex: 1,
        minWidth: 90,
        sortable: true,
        valueFormatter: (p) =>
          (p.data as VfsEntry | undefined)?.kind === "dir"
            ? "—"
            : formatSize(p.value ?? 0),
      },
      {
        headerName: "Version",
        field: "version",
        flex: 1,
        minWidth: 80,
        sortable: true,
        valueFormatter: (p) => (p.value ? `v${p.value}` : "—"),
      },
      {
        headerName: "Modified",
        field: "mtime",
        flex: 2,
        minWidth: 150,
        sort: "desc",
        sortable: true,
        valueFormatter: (p) => (p.value ? formatWhen(p.value) : "—"),
      },
    ],
    [],
  );

  const {
    sections,
    activeFor,
    toggle: toggleFolder,
    expanded,
  } = useFilesRail({
    store,
    prefix,
    pinned,
    recent,
    conversationId,
    refreshToken,
  });

  /**
   * One handler for every rail row, because the rail is a flat id space.
   *
   * Clicking the folder you are already in collapses it. A rail with no twisty
   * needs some way to close a branch, and re-selecting the active node is the
   * gesture that reads as "I'm done with this" — it never navigates away, so it
   * cannot lose your place.
   */
  const onRailSelect = React.useCallback(
    (id: string) => {
      const { kind, value } = parseRailId(id);
      if (kind === "store") {
        setStore(value);
        setPrefix("");
        setSelected(null);
        setView("tiles");
        return;
      }
      if (kind === "dir") {
        if (value && value === prefix && expanded.includes(value)) {
          toggleFolder(value);
          return;
        }
        setPrefix(value);
        if (value) toggleFolder(value);
        setView("tiles");
        return;
      }
      if (kind === "file") {
        // Pinned and recent entries are FILES; the rail navigates to the folder
        // that holds one and selects it, rather than downloading from the rail —
        // a rail click that starts a download is a surprise.
        setPrefix(parentOf(value));
        setView("tiles");
        setSelected(rows.find((r) => r.path === value) ?? null);
        return;
      }
      // trash | history | activity are all views of the library, so they are
      // views here too — the trash in particular was a dialog, which forced you
      // to close it to look at anything you were comparing against.
      setView(value as View);
    },
    [prefix, expanded, toggleFolder, rows],
  );

  // Loaded only when its view is open. The trash is a whole-library query and
  // fetching it on every navigation would cost a request per folder click.
  React.useEffect(() => {
    if (view !== "trash") return;
    setTrash((t) => ({ ...t, loading: true, error: "" }));
    filesApi
      .trash(prefix, conversationId, store)
      .then((d) => setTrash({ items: d.items, loading: false, error: "" }))
      .catch((e: VfsError) =>
        setTrash({ items: [], loading: false, error: e.message }),
      );
  }, [view, prefix, conversationId, store, refreshToken]);

  const restoreFromTrash = React.useCallback(
    (item: TrashItem) => {
      filesApi
        .untrash(item.path, item.commit_id, conversationId, store)
        .then(() => {
          flash(`Restored ${item.name}`);
          setRefreshToken((n) => n + 1);
          load();
        })
        .catch(fail);
    },
    [conversationId, store, flash, load, fail],
  );

  /** Tiles, Table and Gallery are views OF A FOLDER; trash, history and activity
   *  are not. Only the first group gets breadcrumbs, the folder filter, the type
   *  chips and the view toggle — a "Filter this folder" box above the audit
   *  ledger is chrome that does nothing. */
  const isListing = view === "tiles" || view === "table" || view === "gallery";

  /** The address, in the store’s own terms. Rooted at the store name rather
   *  than a bare relative path, because "reports/q3" alone does not say WHICH
   *  store it is in, and the sandbox and the library both have one. */
  const fullPath = `${store === "sandbox" ? "sandbox" : "artifacts"}://${prefix}`;

  const crumbs = crumbsFor(prefix);
  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (
        tagFilter &&
        r.kind !== "dir" &&
        typeLabel(r).toLowerCase() !== tagFilter
      )
        return false;
      // Matched on the base name, not the full path: searching "report" inside
      // /reports/ would otherwise match every file in the folder.
      return !needle || baseName(r.path).toLowerCase().includes(needle);
    });
    return sortEntries(filtered, sort, ascending, typeLabel);
  }, [rows, tagFilter, query, sort, ascending]);

  /** Groups in the order the sort produced, so grouping re-buckets the listing
   *  rather than reordering it — the two controls compose instead of fighting. */
  const grouped = React.useMemo(() => {
    if (group === "none") return null;
    const buckets = new Map<string, VfsEntry[]>();
    visible.forEach((e) => {
      const key = group === "type" ? typeLabel(e) : dateBucket(e.mtime);
      const list = buckets.get(key);
      if (list) list.push(e);
      else buckets.set(key, [e]);
    });
    return [...buckets.entries()];
  }, [visible, group]);

  // Types present in THIS folder, so the filter rail never offers a chip that
  // matches nothing.
  const types = React.useMemo(() => {
    const seen = new Map<string, number>();
    rows
      .filter((r) => r.kind === "file")
      .forEach((r) => {
        const t = typeLabel(r).toLowerCase();
        seen.set(t, (seen.get(t) ?? 0) + 1);
      });
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rows]);

  return (
    <div
      style={{ height: "100%", minHeight: 0 }}
      // Suppressed for the WHOLE surface, not per row. Children that have their
      // own menu call preventDefault too, but empty space, the rail and the gaps
      // between tiles did not — and a native browser menu appearing over a file
      // manager offers "Save image as…" for an artifact the analyst is supposed
      // to be governing through the app.
      onContextMenu={(e) => e.preventDefault()}
    >
      <SideRailPanel
        // The page colour, not the card colour: this pane IS the tab, and a card
        // background here would read as a panel floating on the surface rather
        // than as the surface. Same call the Session settings tab makes.
        background="var(--cg-bg-page)"
        title={store === "sandbox" ? "Sandbox files" : "Artifact library"}
        subtitle={
          store === "sandbox"
            ? "The agent's working directory. Not durable."
            : "Durable, versioned and audited. Every action goes through the VFS."
        }
        sections={sections}
        active={activeFor(view)}
        onSelect={onRailSelect}
        actions={
          <>
            <ToolButton
              icon={FolderPlus}
              label="New folder"
              onClick={() => setPending({ kind: "newFolder" })}
            />
            <ToolButton
              icon={Upload}
              label="Upload"
              onClick={() => fileInput.current?.click()}
            />
            <ToolButton
              icon={Clock}
              label="Point in time"
              onClick={() => setDialog({ kind: "pit" })}
            />
            <ToolButton
              icon={Info}
              label="Details"
              compact
              active={showDetails}
              onClick={() => setShowDetails((v) => !v)}
            />
            <ToolButton
              icon={RefreshCw}
              label="Refresh"
              compact
              onClick={() => {
                setRefreshToken((n) => n + 1);
                load();
              }}
            />
          </>
        }
      >
        <div className="flex h-full min-h-0 w-full">
          <div
            className="relative flex min-w-0 flex-1 flex-col"
            role="presentation"
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragging) setDragging(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer?.files?.length)
                uploadFiles(e.dataTransfer.files);
            }}
          >
            <div className="flex flex-wrap items-center gap-1 border-b border-[var(--cg-border)] px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setPrefix("");
                  setView("tiles");
                }}
                className="rounded px-1.5 py-0.5 text-[12px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
              >
                {store === "sandbox" ? "Sandbox" : "Library"}
              </button>
              {view !== "history" &&
                crumbs.map((c) => (
                  <React.Fragment key={c.path}>
                    <ChevronRight className="h-3 w-3 shrink-0 text-[var(--cg-text-muted)]" />
                    <button
                      type="button"
                      onClick={() => setPrefix(c.path)}
                      className="max-w-[180px] truncate rounded px-1.5 py-0.5 text-[12px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
                    >
                      {c.name}
                    </button>
                  </React.Fragment>
                ))}
              {!isListing && (
                <>
                  <ChevronRight className="h-3 w-3 shrink-0 text-[var(--cg-text-muted)]" />
                  <span className="px-1.5 text-[12px] capitalize text-[var(--cg-text-muted)]">
                    {VIEW_LABELS[view] ?? view.replace(/-/g, " ")}
                  </span>
                </>
              )}

              <div className="ml-auto flex items-center gap-1">
                {isListing && (
                  <label className="mr-1 flex items-center gap-1 rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-1">
                    <Search className="h-3 w-3 text-[var(--cg-text-muted)]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Filter this folder"
                      aria-label="Filter this folder"
                      className="w-28 bg-transparent text-[11px] text-[var(--cg-text-nav)] outline-none placeholder:text-[var(--cg-text-muted)] focus:w-40"
                    />
                  </label>
                )}
                {isListing && (
                  <SortGroupControls
                    sort={sort}
                    onSort={setSort}
                    group={group}
                    onGroup={setGroup}
                    ascending={ascending}
                    onDirection={setAscending}
                  />
                )}
                <div className="mr-1 flex items-center gap-0.5 rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] p-0.5">
                  <ToolButton
                    icon={LayoutGrid}
                    label="Tiles"
                    compact
                    active={view === "tiles"}
                    onClick={() => setView("tiles")}
                  />
                  <ToolButton
                    icon={Table2}
                    label="Table"
                    compact
                    active={view === "table"}
                    onClick={() => setView("table")}
                  />
                  <ToolButton
                    icon={Images}
                    label="Gallery"
                    compact
                    active={view === "gallery"}
                    onClick={() => setView("gallery")}
                  />
                </div>
              </div>
            </div>

            {checked.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 border-b border-[var(--cg-border)] bg-[var(--cg-bg-hover)] px-3 py-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-[var(--cg-accent,#4C9AFF)]" />
                <span className="mr-2 text-[11px] text-[var(--cg-text-nav)]">
                  {checked.length} selected
                </span>

                {/* Single-item actions disappear on a multi-selection rather than
                acting on an arbitrary member of it. */}
                {checked.length === 1 && (
                  <>
                    <ToolButton
                      icon={Download}
                      label="Download"
                      onClick={() => {
                        const e = rows.find((r) => r.path === checked[0]);
                        if (e) open(e);
                      }}
                    />
                    <ToolButton
                      icon={Pencil}
                      label="Rename"
                      onClick={() => {
                        const e = rows.find((r) => r.path === checked[0]);
                        if (e) setPending({ kind: "rename", entry: e });
                      }}
                    />
                    <ToolButton
                      icon={FolderInput}
                      label="Move"
                      onClick={() => {
                        const e = rows.find((r) => r.path === checked[0]);
                        if (e) setPending({ kind: "move", entry: e });
                      }}
                    />
                    <ToolButton
                      icon={Copy}
                      label="Duplicate"
                      onClick={() => {
                        const e = rows.find((r) => r.path === checked[0]);
                        if (e) doDuplicate(e);
                      }}
                    />
                  </>
                )}

                <ToolButton
                  icon={Trash2}
                  label="Delete"
                  onClick={() =>
                    setPending({ kind: "deleteMany", paths: checked })
                  }
                />
                <button
                  type="button"
                  onClick={() => setChecked([])}
                  className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-page)]"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>
            )}

            {isListing && (
              <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-3 py-1">
                <HardDrive className="h-3 w-3 shrink-0 text-[var(--cg-text-muted)]" />
                {/* Selectable, and copyable in one click. The path is the value
                someone pastes into a report or a command; making them retype it
                from breadcrumbs is the small friction that makes a file manager
                feel like a toy. */}
                <button
                  type="button"
                  title="Copy this path"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(fullPath)
                      .then(() => flash(`Copied ${fullPath}`))
                      .catch(() =>
                        setError("The browser refused clipboard access."),
                      );
                  }}
                  className="min-w-0 flex-1 truncate text-left font-mono text-[11px] text-[var(--cg-text-muted)] hover:text-[var(--cg-text-nav)]"
                >
                  {fullPath}
                </button>
              </div>
            )}

            {isListing && checked.length === 0 && types.length > 1 && (
              <div className="flex flex-wrap items-center gap-1 border-b border-[var(--cg-border)] px-3 py-1.5">
                <Tag className="h-3 w-3 text-[var(--cg-text-muted)]" />
                {types.map(([t, n]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTagFilter((f) => (f === t ? "" : t))}
                    className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${
                      tagFilter === t
                        ? "border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-bg-hover)] text-[var(--cg-text-nav)]"
                        : "border-[var(--cg-border)] text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
                    }`}
                  >
                    {t} {n}
                  </button>
                ))}
                {tagFilter && (
                  <button
                    type="button"
                    onClick={() => setTagFilter("")}
                    className="ml-1 text-[10px] text-[var(--cg-text-muted)] underline"
                  >
                    clear
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const el = e.currentTarget;
                if (el.files) uploadFiles(el.files);
                // Cleared so choosing the SAME file twice in a row still fires a
                // change event; without it the second attempt silently does nothing.
                el.value = "";
              }}
            />

            {(error || notice || uploading > 0) && (
              <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-3 py-1.5 text-[11px]">
                {error && (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <span className="text-[var(--cg-text-nav)]">{error}</span>
                    <button
                      type="button"
                      onClick={() => setError("")}
                      className="ml-auto rounded px-1.5 py-0.5 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
                    >
                      Dismiss
                    </button>
                  </>
                )}
                {!error && uploading > 0 && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--cg-text-muted)]" />
                    <span className="text-[var(--cg-text-muted)]">
                      Uploading {uploading} file{uploading === 1 ? "" : "s"}…
                    </span>
                  </>
                )}
                {!error && uploading === 0 && notice && (
                  <span className="text-[var(--cg-text-muted)]">{notice}</span>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1">
              {view === "activity" && <ActivityView />}

              {(view === "shared-by-me" || view === "shared-with-me") && (
                <SharedView
                  mode={view === "shared-by-me" ? "by-me" : "with-me"}
                  onOpenFolder={(p) => {
                    setPrefix(p);
                    setView("tiles");
                  }}
                  onShare={(p) => setDialog({ kind: "share", path: p })}
                />
              )}

              {view === "trash" && (
                <TrashView
                  items={trash.items}
                  loading={trash.loading}
                  error={trash.error}
                  onRestore={restoreFromTrash}
                  selected={selected?.path}
                  onSelect={(item) =>
                    setSelected({
                      path: item.path,
                      size: item.size,
                      mtime: 0,
                      content_hash: "",
                      version: 0,
                      mime: null,
                      kind: item.is_dir ? "dir" : "file",
                    })
                  }
                  onContextMenu={(item, ev) =>
                    setMenu({
                      x: Math.min(
                        ev.clientX,
                        window.innerWidth - MENU_WIDTH - 8,
                      ),
                      y: ev.clientY,
                      entry: {
                        path: item.path,
                        size: item.size,
                        mtime: 0,
                        content_hash: "",
                        version: 0,
                        mime: null,
                        kind: item.is_dir ? "dir" : "file",
                      },
                    })
                  }
                />
              )}

              {view === "history" && (
                <HistoryView
                  conversationId={conversationId}
                  store={store}
                  onRestore={() => setDialog({ kind: "pit" })}
                />
              )}

              {view === "tiles" && rows.length > 0 && visible.length === 0 && (
                <div className="p-6 text-[12px] text-[var(--cg-text-muted)]">
                  Nothing here matches the current filter.
                </div>
              )}

              {view === "tiles" &&
                (rows.length === 0 || visible.length > 0) &&
                (grouped ? (
                  <div className="h-full overflow-auto">
                    {grouped.map(([label, items]) => (
                      <section key={label}>
                        {/* The count belongs in the header: it is what a grouped
                            view is FOR — "how many of these are there". Sticky,
                            so the band you are reading under stays named while
                            you scroll a long group. */}
                        <h3 className="sticky top-0 z-10 flex items-center gap-2 bg-[var(--cg-bg-page)] px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--cg-text-muted)]">
                          {label}
                          <span className="opacity-70">{items.length}</span>
                          <span
                            aria-hidden
                            className="ml-1 h-px flex-1 bg-[var(--cg-border)]"
                          />
                        </h3>
                        <TilesView
                          entries={items}
                          conversationId={conversationId}
                          store={store}
                          onOpen={open}
                          onSelect={setSelected}
                          checked={checked}
                          onToggleCheck={toggleCheck}
                          onContextMenu={(entry, ev) =>
                            setMenu({
                              x: Math.min(
                                ev.clientX,
                                window.innerWidth - MENU_WIDTH - 8,
                              ),
                              y: ev.clientY,
                              entry,
                            })
                          }
                          selected={selected?.path}
                        />
                      </section>
                    ))}
                  </div>
                ) : (
                  <TilesView
                    entries={visible}
                    conversationId={conversationId}
                    store={store}
                    onOpen={open}
                    onSelect={setSelected}
                    checked={checked}
                    onToggleCheck={toggleCheck}
                    onContextMenu={(entry, ev) =>
                      setMenu({
                        x: Math.min(
                          ev.clientX,
                          window.innerWidth - MENU_WIDTH - 8,
                        ),
                        y: ev.clientY,
                        entry,
                      })
                    }
                    selected={selected?.path}
                  />
                ))}

              {view === "gallery" && (
                <GalleryView
                  entries={visible}
                  conversationId={conversationId}
                  store={store}
                  onOpen={open}
                  onSelect={(e) => {
                    setSelected(e);
                    setShowDetails(true);
                  }}
                  selected={selected?.path}
                />
              )}

              {view === "table" &&
                (loading && rows.length === 0 ? (
                  <FilesSkeleton />
                ) : (
                  <AgGridReact<VfsEntry>
                    theme={gridThemeFor(theme === "light" ? "light" : "dark")}
                    rowData={visible}
                    columnDefs={columns}
                    getRowId={(p) => p.data.path}
                    animateRows={false}
                    headerHeight={32}
                    rowHeight={30}
                    suppressCellFocus
                    onGridReady={(e: GridReadyEvent) =>
                      e.api.sizeColumnsToFit()
                    }
                    onRowClicked={(e: RowClickedEvent<VfsEntry>) => {
                      if (e.data) setSelected(e.data);
                    }}
                    onRowDoubleClicked={(
                      e: RowDoubleClickedEvent<VfsEntry>,
                    ) => {
                      if (e.data) open(e.data);
                    }}
                    onCellContextMenu={(e) => {
                      const ev = e.event as MouseEvent | undefined;
                      if (!e.data || !ev) return;
                      ev.preventDefault();
                      setSelected(e.data);
                      // Folded back inside the viewport near an edge, so the menu is
                      // never clipped by the panel.
                      setMenu({
                        x: Math.min(
                          ev.clientX,
                          window.innerWidth - MENU_WIDTH - 8,
                        ),
                        y: ev.clientY,
                        entry: e.data,
                      });
                    }}
                    overlayNoRowsTemplate='<span style="font-size:12px;opacity:.7">This folder is empty</span>'
                  />
                ))}
            </div>

            {dragging && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-bg-page)]/80">
                <span className="text-[13px] text-[var(--cg-text-nav)]">
                  Drop to upload into {prefix || "the root"}
                </span>
              </div>
            )}
          </div>

          {showDetails && selected && (
            <FilesDetailsPanel
              entry={selected}
              conversationId={conversationId}
              store={store}
              pinned={pinned.includes(selected.path)}
              onTogglePin={() => togglePin(selected.path)}
              onOpenHistory={() =>
                setDialog({ kind: "history", path: selected.path })
              }
              onClose={() => setShowDetails(false)}
            />
          )}
        </div>
      </SideRailPanel>

      {viewing && (
        <FileViewer
          path={viewing}
          store={store}
          conversationId={conversationId}
          onClose={() => setViewing(null)}
        />
      )}

      {menu && (
        <ContextMenu
          state={menu}
          onClose={() => setMenu(null)}
          onOpen={open}
          onDownload={(entry) =>
            window.open(
              filesApi.downloadUrl(entry.path, conversationId, store),
              "_blank",
              "noopener",
            )
          }
          onRename={(entry) => setPending({ kind: "rename", entry })}
          onMove={(entry) => setPending({ kind: "move", entry })}
          onDuplicate={doDuplicate}
          onDelete={(entry) => setPending({ kind: "delete", entry })}
          onHistory={(entry) =>
            setDialog({ kind: "history", path: entry.path })
          }
          onPermissions={(entry) =>
            setDialog({ kind: "permissions", path: entry.path })
          }
          onDetails={(entry) => {
            setSelected(entry);
            setShowDetails(true);
          }}
          onCopyPath={(entry) => {
            // Clipboard access can be refused (insecure context, permission), so
            // the confirmation only claims success after the write resolves.
            navigator.clipboard
              ?.writeText(entry.path)
              .then(() => flash(`Copied ${entry.path}`))
              .catch(() => setError("The browser refused clipboard access."));
          }}
          onRestore={(entry) => {
            const item = trash.items.find((t) => t.path === entry.path);
            if (item) restoreFromTrash(item);
          }}
          onShare={(entry) => setDialog({ kind: "share", path: entry.path })}
          isTrash={view === "trash"}
        />
      )}

      {pending.kind === "newFolder" && (
        <PromptDialog
          title="New folder"
          label={`Created in ${prefix || "the root"}`}
          confirmLabel="Create"
          onCancel={() => setPending({ kind: "none" })}
          onSubmit={(name) =>
            filesApi
              .mkdir(joinPath(prefix, name), conversationId, store)
              .then(() => done(`Created ${name}`))
              .catch(fail)
          }
        />
      )}

      {pending.kind === "rename" && (
        <PromptDialog
          title="Rename"
          label="New name"
          initial={baseName(pending.entry.path)}
          confirmLabel="Rename"
          onCancel={() => setPending({ kind: "none" })}
          onSubmit={(name) => {
            if (name.includes("/")) {
              setError("A name cannot contain “/”. Use Move to change folder.");
              return;
            }
            const { entry } = pending;
            filesApi
              .move(
                entry.path,
                joinPath(parentOf(entry.path), name),
                conversationId,
                store,
              )
              .then(() => done(`Renamed to ${name}`))
              .catch(fail);
          }}
        />
      )}

      {pending.kind === "move" && (
        <PromptDialog
          title="Move"
          label="Destination folder (blank for the root)"
          initial={parentOf(pending.entry.path)}
          confirmLabel="Move"
          onCancel={() => setPending({ kind: "none" })}
          onSubmit={(dest) => {
            const { entry } = pending;
            const clean = dest.replace(/^\/+|\/+$/g, "");
            const target = joinPath(clean, baseName(entry.path));
            if (target === entry.path) {
              setPending({ kind: "none" });
              return;
            }
            filesApi
              .move(entry.path, target, conversationId, store)
              .then(() => done(`Moved to ${clean || "the root"}`))
              .catch(fail);
          }}
        />
      )}

      {pending.kind === "delete" && (
        <ConfirmDialog
          title="Delete"
          body={
            pending.entry.kind === "dir"
              ? "Delete this folder and everything in it? It can be brought back from Deleted items."
              : "Delete this file? It can be brought back from Deleted items."
          }
          detail={pending.entry.path}
          onCancel={() => setPending({ kind: "none" })}
          onConfirm={() => {
            const { entry } = pending;
            filesApi
              .remove(entry.path, conversationId, store)
              .then(() => {
                if (selected?.path === entry.path) setSelected(null);
                done(
                  `Deleted ${baseName(entry.path)} — recoverable from Deleted items`,
                );
              })
              .catch(fail);
          }}
        />
      )}

      {pending.kind === "deleteMany" && (
        <ConfirmDialog
          title="Delete"
          body={`Delete ${pending.paths.length} items? They can be brought back from Deleted items.`}
          detail={
            pending.paths.length > 6
              ? `${pending.paths.slice(0, 6).join(", ")} and ${pending.paths.length - 6} more`
              : pending.paths.join(", ")
          }
          onCancel={() => setPending({ kind: "none" })}
          onConfirm={() => {
            const { paths } = pending;
            // Sequential, like uploads: each delete is a commit, and firing them
            // together contends on the same head. Failures are collected so one
            // WORM-protected file does not hide the fact the rest succeeded.
            const failures: string[] = [];
            paths
              .reduce(
                (chain, path) =>
                  chain.then(() =>
                    filesApi
                      .remove(path, conversationId, store)
                      .then(() => undefined)
                      .catch((e: VfsError) => {
                        failures.push(`${baseName(path)}: ${e.message}`);
                      }),
                  ),
                Promise.resolve(),
              )
              .then(() => {
                setChecked([]);
                setSelected(null);
                if (failures.length) setError(failures.join(" · "));
                done(
                  `Deleted ${paths.length - failures.length} of ${paths.length} items`,
                );
              });
          }}
        />
      )}

      {dialog.kind === "history" && (
        <VersionHistoryDialog
          path={dialog.path}
          conversationId={conversationId}
          onClose={() => setDialog({ kind: "none" })}
          onRestored={() => {
            flash("Restored");
            load();
          }}
        />
      )}
      {dialog.kind === "share" && (
        <ShareDialog
          path={dialog.path}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "permissions" && (
        <PermissionsDialog
          path={dialog.path}
          conversationId={conversationId}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "pit" && (
        <PointInTimeDialog
          conversationId={conversationId}
          onClose={() => setDialog({ kind: "none" })}
          onRestored={() => {
            flash("Library restored to the selected point in time");
            setRefreshToken((n) => n + 1);
            load();
          }}
        />
      )}
    </div>
  );
}

export interface FilesBrowserProps {
  conversationId?: string;
}

/**
 * FilesBrowser — the artifact library as a native React surface.
 *
 * Replaces the framed seahub UI. Every operation goes through the VFS API, so
 * rename, move, copy, mkdir and undelete are policed, evented and audited like
 * any other write — which they were not when the frame issued them straight to
 * Seafile.
 *
 * Scope is set by docs/design/files-surface-parity-plan.md: sharing is absent
 * because the proxy refuses it deliberately, and Kanban/Map are absent because
 * nothing can write the metadata columns that would drive them.
 */
export default function FilesBrowser({
  conversationId = "",
}: FilesBrowserProps) {
  return (
    <SurfaceErrorBoundary surface="tab" name="Artifact library">
      <Browser conversationId={conversationId} />
    </SurfaceErrorBoundary>
  );
}

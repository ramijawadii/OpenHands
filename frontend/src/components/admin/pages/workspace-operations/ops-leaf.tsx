/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → config-driven leaf engine */
import React from "react";
import {
  RefreshCcw,
  Download,
  LayoutGrid,
  Activity as ActivityIcon,
  History,
  Search as SearchIcon,
  type LucideIcon,
} from "lucide-react";
import {
  StatRow,
  KVGrid,
  HeaderButton,
  EmptyState,
  SampleTag,
  SideRailDrawer,
  RowMenu,
  T,
  type Column,
  type CommandItem,
  type StripIcon,
} from "#/components/admin/admin-kit";
import {
  StatStripPlain,
  ColumnChooser,
  type StatStripItem,
} from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * ops-leaf — the config-driven engine behind every Workspace Operations leaf
 * (Catalog & Discovery · Requests & Approvals · Automation · Alerts). Rather than
 * hand-author ~25 near-identical framework surfaces, each leaf declares a compact
 * `OpsLeafConfig` (fields · stats · toolbar) and this engine renders the full
 * Platform-Settings surface from it: StatStripPlain · DiscoveryListView (toolbar ·
 * search · filter pills · column chooser · datatable · bulk/row actions) ·
 * SideRailDrawer detail. One framework, N leaves — the systematic-rollout answer.
 *
 * No operations backend yet → deterministic representative sample data (tagged
 * `Sample`); swap the generated rows for the live feed when the backend lands, the
 * component API is unchanged. See the per-subsection specs under
 * docs/workspace/workspace_module/…/Workspace Operations/.
 */

// ── deterministic sample helpers (shared with the bespoke governance leaves) ──────────────────────
export function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
export const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Shared sample pools so every operations leaf draws from one consistent estate.
export const WORKSPACES = [
  "Payments Production",
  "Retail Web",
  "Data Lake",
  "Identity Core",
  "Analytics Platform",
  "Billing Engine",
  "Research Sandbox",
  "Shared Services",
];
export const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
export const OWNERS = [
  "Cloud Team",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];
export const ENVIRONMENTS = ["Production", "Staging", "Development", "Sandbox"];

type Tone = "ok" | "warn" | "danger" | "neutral";

// Status / severity → colour. Superset across every operations leaf; unknown → muted.
const TONE_WORD: Record<string, Tone> = {
  // healthy / done
  Active: "ok",
  Approved: "ok",
  Completed: "ok",
  Succeeded: "ok",
  Success: "ok",
  Resolved: "ok",
  Published: "ok",
  Enabled: "ok",
  Healthy: "ok",
  Running: "ok",
  Available: "ok",
  Verified: "ok",
  "Within SLA": "ok",
  Acknowledged: "ok",
  // in-flight / attention
  Pending: "warn",
  "In Progress": "warn",
  "In Review": "warn",
  Queued: "warn",
  Scheduled: "warn",
  Approaching: "warn",
  Warning: "warn",
  Degraded: "warn",
  Draft: "neutral",
  Paused: "neutral",
  Suppressed: "neutral",
  Archived: "neutral",
  Deprecated: "neutral",
  Escalated: "warn",
  Delegated: "warn",
  Open: "warn",
  // bad
  Failed: "danger",
  Rejected: "danger",
  Breached: "danger",
  Expired: "danger",
  Blocked: "danger",
  Cancelled: "neutral",
  Withdrawn: "neutral",
  // severity
  Critical: "danger",
  High: "danger",
  Medium: "warn",
  Low: "neutral",
  Info: "neutral",
};
function toneColor(t: Tone): string {
  if (t === "ok") return T.success;
  if (t === "warn") return T.warning;
  if (t === "danger") return T.danger;
  return T.textMuted;
}
function wordTone(v: string): Tone {
  return TONE_WORD[v] ?? "neutral";
}

function WordBadge({ value, dot }: { value: string; dot?: boolean }) {
  const c = toneColor(wordTone(value));
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      {dot && (
        <span
          style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
        />
      )}
      {value}
    </span>
  );
}

// ── field model — the declarative column/filter/row spec ──────────────────────────────────────────
export type FieldKind =
  | "primary" // icon + text, the row title column
  | "text"
  | "mono" // monospace id
  | "num"
  | "money" // $Nk
  | "pct" // N%
  | "date"
  | "status" // dot badge, tone by word
  | "sev" // tone by severity word, no dot
  | "rel"; // relative time, plain

export interface FieldSpec {
  key: string;
  header: string;
  kind: FieldKind;
  pool?: string[]; // value pool for text/status/sev/rel; [prefix] for mono
  min?: number;
  max?: number;
  filter?: boolean; // render a filter pill for this field
  noCol?: boolean; // in the record + drawer but not a table column
  searchable?: boolean; // include in free-text search
}

export interface StatSpec {
  label: string;
  kind: "count" | "where" | "sum" | "avg";
  field?: string;
  eq?: string[]; // for "where"
  suffix?: string; // "%", "k"…
  tone?: Tone | ((v: number) => Tone);
}

export interface OpsLeafConfig {
  entity: string; // singular noun ("workspace", "request", "alert")
  title: string;
  desc: string;
  icon: LucideIcon;
  idPrefix: string; // sample id prefix, e.g. "REQ"
  count?: number; // sample row count (default 16)
  primaryIcon?: LucideIcon; // icon in the primary column (default = icon)
  fields: FieldSpec[];
  stats: StatSpec[];
  toolbar: { label: string; icon: React.ReactNode; primary?: boolean }[];
  rowMenu?: string[]; // row action labels (default View/Edit/Export)
  bulk?: { label: string; icon: React.ReactNode }[];
  pageSize?: number;
  initialSortKey?: string;
}

type Row = Record<string, string | number> & { id: string };

// ── sample-row generator — deterministic from field pools ─────────────────────────────────────────
function buildRows(cfg: OpsLeafConfig): Row[] {
  const count = cfg.count ?? 16;
  const rows: Row[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = `${cfg.idPrefix}-${(1000 + i * 7).toString().padStart(5, "0")}`;
    const row: Row = { id };
    cfg.fields.forEach((f) => {
      const n = hashId(`${id}-${f.key}`);
      switch (f.kind) {
        case "num":
          row[f.key] =
            (f.min ?? 0) + (n % Math.max(1, (f.max ?? 100) - (f.min ?? 0)));
          break;
        case "money":
          row[f.key] =
            (f.min ?? 1) + (n % Math.max(1, (f.max ?? 200) - (f.min ?? 1)));
          break;
        case "pct":
          row[f.key] =
            (f.min ?? 60) + (n % Math.max(1, (f.max ?? 100) - (f.min ?? 60)));
          break;
        case "mono":
          row[f.key] =
            `${f.pool?.[0] ?? cfg.idPrefix}-${(3000 + (n % 8999)).toString()}`;
          break;
        case "date":
          row[f.key] =
            `2026-${(1 + (n % 8)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`;
          break;
        case "rel":
          row[f.key] = pick(
            f.pool ?? ["5 min", "2 h", "yesterday", "3 days"],
            n,
          );
          break;
        default:
          row[f.key] = pick(f.pool ?? ["—"], n);
      }
    });
    rows.push(row);
  }
  return rows;
}

function renderCell(
  f: FieldSpec,
  r: Row,
  PrimaryIcon: LucideIcon,
): React.ReactNode {
  const v = r[f.key];
  switch (f.kind) {
    case "primary":
      return (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PrimaryIcon size={14} color={T.textMuted} />
          {v}
        </span>
      );
    case "mono":
      return <span style={{ fontFamily: "monospace" }}>{v}</span>;
    case "num":
      return (v as number).toLocaleString();
    case "money":
      return `$${v}k`;
    case "pct":
      return `${v}%`;
    case "status":
      return <WordBadge value={v as string} dot />;
    case "sev":
      return <WordBadge value={v as string} />;
    default:
      return v;
  }
}

function facet(vals: (string | number)[]) {
  return [
    { value: "", label: "All" },
    ...Array.from(new Set(vals.map(String)))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

// ── the engine ─────────────────────────────────────────────────────────────────────────────────
export function OpsLeaf({ cfg }: { cfg: OpsLeafConfig }) {
  const PrimaryIcon = cfg.primaryIcon ?? cfg.icon;
  const records = React.useMemo(() => buildRows(cfg), [cfg]);
  const filterFields = cfg.fields.filter((f) => f.filter);
  const searchFields = cfg.fields.filter(
    (f) => f.searchable || f.kind === "primary",
  );

  const [search, setSearch] = React.useState("");
  const [fVals, setFVals] = React.useState<Record<string, string>>({});
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const setF = (k: string, v: string) => setFVals((s) => ({ ...s, [k]: v }));

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      searchFields.some((f) => String(r[f.key]).toLowerCase().includes(q));
    const matchesFilters = filterFields.every(
      (f) => !fVals[f.key] || String(r[f.key]) === fVals[f.key],
    );
    return matchesSearch && matchesFilters;
  });
  const clearFilters = () => {
    setSearch("");
    setFVals({});
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const cols: Column<Row>[] = cfg.fields
    .filter((f) => !f.noCol)
    .map((f) => ({
      key: f.key,
      header: f.header,
      sortValue: (r: Row) => r[f.key],
      render: (r: Row) => renderCell(f, r, PrimaryIcon),
    }));

  const statItems = cfg.stats.map((s) => {
    let value: number;
    if (s.kind === "count") value = rows.length;
    else if (s.kind === "where")
      value = rows.filter((r) =>
        (s.eq ?? []).includes(String(r[s.field!])),
      ).length;
    else if (s.kind === "sum")
      value = rows.reduce((a, r) => a + Number(r[s.field!] || 0), 0);
    else
      value = rows.length
        ? Math.round(
            rows.reduce((a, r) => a + Number(r[s.field!] || 0), 0) /
              rows.length,
          )
        : 0;
    const raw = typeof s.tone === "function" ? s.tone(value) : s.tone;
    // StatStripPlain has no "neutral" — map it to "muted".
    const tone: StatStripItem["tone"] = raw === "neutral" ? "muted" : raw;
    return { label: s.label, value: `${value}${s.suffix ?? ""}`, tone };
  });

  const toolbar: CommandItem[] = cfg.toolbar.map((t, i) => ({
    key: `${t.label}-${i}`,
    label: t.label,
    icon: t.icon,
    onClick: i === 0 ? undefined : () => setSelId(null),
    disabled: i !== 0 && !t.label.toLowerCase().includes("refresh"),
  }));
  // Make an explicit Refresh always work.
  const refreshIdx = cfg.toolbar.findIndex((t) =>
    t.label.toLowerCase().includes("refresh"),
  );
  if (refreshIdx >= 0) {
    toolbar[refreshIdx] = {
      ...toolbar[refreshIdx],
      onClick: () => setSelId(null),
      disabled: false,
    };
  }

  const menuLabels = cfg.rowMenu ?? ["View", "Edit", "Export"];

  return (
    <>
      <StatStripPlain items={statItems} />

      <DiscoveryListView
        title={cfg.title}
        desc={cfg.desc}
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={`Search ${cfg.entity}s — ${searchFields.map((f) => f.header.toLowerCase()).join(", ")}…`}
        count={rows.length}
        pills={filterFields.map((f) => ({
          key: f.key,
          label: f.header,
          value: fVals[f.key] ?? "",
          onChange: (v: string) => setF(f.key, v),
          options: facet(records.map((r) => r[f.key])),
        }))}
        presets={[{ label: `All ${cfg.entity}s`, onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={cfg.pageSize ?? 12}
        initialSort={
          cfg.initialSortKey
            ? { key: cfg.initialSortKey, dir: "desc" }
            : undefined
        }
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            {(
              cfg.bulk ?? [{ label: "Export", icon: <Download size={13} /> }]
            ).map((b) => (
              <HeaderButton key={b.label} icon={b.icon} onClick={clear}>
                {b.label} ({ids.length})
              </HeaderButton>
            ))}
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={menuLabels.map((label) => ({
              label,
              onClick: () => setSelId(r.id),
              danger:
                /delete|remove|revoke|disconnect|reject|cancel|withdraw|suppress/i.test(
                  label,
                ),
            }))}
          />
        )}
        empty={
          <EmptyState
            icon={<cfg.icon size={20} />}
            title={`No ${cfg.entity}s found.`}
            hint={cfg.desc}
          />
        }
      />

      {sel && <OpsDrawer cfg={cfg} rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

function OpsDrawer({
  cfg,
  rec,
  onClose,
}: {
  cfg: OpsLeafConfig;
  rec: Row;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  const primary = cfg.fields.find((f) => f.kind === "primary");
  const subFields = cfg.fields
    .filter((f) => f.kind === "status" || f.kind === "sev")
    .slice(0, 2);
  const subtitle = [rec.id, ...subFields.map((f) => rec[f.key])].join(" · ");
  const events = [
    "Created",
    "Updated",
    "State Changed",
    "Reviewed",
    "Exported",
  ];
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={String(rec[primary?.key ?? "id"])}
      subtitle={subtitle}
      width={840}
      onClose={onClose}
      footer={
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton icon={<RefreshCcw size={13} />}>Refresh</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && (
        <Section title="Overview">
          <KVGrid
            items={cfg.fields.map((f) => ({
              k: f.header,
              v:
                f.kind === "money"
                  ? `$${rec[f.key]}k`
                  : f.kind === "pct"
                    ? `${rec[f.key]}%`
                    : String(rec[f.key]),
              sample: f.kind !== "primary" && f.kind !== "mono",
            }))}
          />
        </Section>
      )}
      {tab === "activity" && (
        <Section title="Recent activity" sample>
          {events.map((e, i) => (
            <StatRow
              key={e}
              label={e}
              value={`${pick(["Administrator", "Automation Engine", "gov.admin"], hashId(rec.id) + i)} · ${pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago`}
              sample
            />
          ))}
        </Section>
      )}
      {tab === "audit" && (
        <Section title="Audit history" sample>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: T.textMuted,
              marginBottom: 12,
            }}
          >
            <SearchIcon size={14} /> Read-only immutable log <SampleTag />
          </div>
          {events.map((e, i) => (
            <StatRow
              key={e}
              label={e}
              value={`${pick(["Administrator", "gov.admin"], i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
              tone="ok"
              sample
            />
          ))}
        </Section>
      )}
    </SideRailDrawer>
  );
}

function Section({
  title,
  children,
  sample,
}: {
  title: string;
  children: React.ReactNode;
  sample?: boolean;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {title}
        {sample && <SampleTag />}
      </div>
      {children}
    </div>
  );
}

// Leaf type shared by every Workspace-Management console shell.
export interface Leaf {
  id: string;
  label: string;
  Icon: StripIcon;
  render?: () => React.ReactNode;
}

/** A leaf whose surface is generated from an OpsLeafConfig. */
export function opsLeaf(
  id: string,
  label: string,
  Icon: StripIcon,
  cfg: OpsLeafConfig,
): Leaf {
  return { id, label, Icon, render: () => <OpsLeaf cfg={cfg} /> };
}

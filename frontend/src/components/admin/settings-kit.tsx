/* eslint-disable i18next/no-literal-string, react/no-unstable-nested-components -- settings framework kit */
import React from "react";
import {
  Activity,
  BadgeCheck,
  Bell,
  Boxes,
  Clock,
  Columns3,
  Eye,
  Fingerprint,
  GitBranch,
  History,
  Inbox,
  Info,
  KeyRound,
  Lock,
  Mail,
  Network,
  Plug,
  ScrollText,
  Server,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import {
  DiscoveryListView,
  type DiscoveryPill,
} from "#/components/admin/discovery-kit";
import {
  RowMenu,
  EmptyState,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";

/**
 * Platform Settings — UI framework kit.
 *
 * The sanctioned, packaged way to build any settings/admin tab so every surface
 * shares one experience. Describe a tab as data (`SettingsTabConfig`) and render
 * it with `<SettingsTab>`; the factory emits the exact uniform layout:
 *
 *   stat strip → action toolbar (right) → filters + Choose columns (left)
 *   → presets + search (right) → data table (rail selection + pagination)
 *   → row-click entity drawer (left rail sections + optional sub-tabs).
 *
 * Styling is NOT expressed here per-tab — it is inherited from the primitives
 * (`discovery-kit` + the tokens in `docs/design/ui-system.json`). A tab author
 * writes a config, never bespoke JSX, so nothing can drift.
 *
 * See `docs/design/platform-settings-ui-patterns-kit.md` for the full spec.
 */

// ════════════════════════ railIcon — label → meaningful SVG ════════════════════════

/**
 * A meaningful icon for a drawer rail tab / section, chosen from its label.
 * Ordered specific → generic so distinct concepts get distinct marks and the
 * `Boxes` default is a genuine last resort. Uses only shared lucide icons.
 */
export function railIcon(label: string): React.ReactNode {
  const l = label.toLowerCase();
  const has = (...ks: string[]) => ks.some((k) => l.includes(k));
  const sz = 16;
  if (has("mail", "email", "message", "comment", "note", "tip"))
    return <Mail size={sz} />;
  if (has("detection", "detect", "signal", "indicator")) return <Eye size={sz} />;
  if (has("evidence", "artifact", "attachment", "collected"))
    return <Inbox size={sz} />;
  if (has("response", "respond", "remediat", "contain", "mitigat", "action", "resolve", "resolution"))
    return <SlidersHorizontal size={sz} />;
  if (has("risk", "threat", "attack", "alert", "violation", "suspicious", "anomal"))
    return <ShieldAlert size={sz} />;
  if (has("review", "certification", "attestation", "approval", "approve", "approver", "certif"))
    return <BadgeCheck size={sz} />;
  if (has("assign", "delegation", "delegate", "grant", "workflow", "chain", "pipeline", "escalat"))
    return <GitBranch size={sz} />;
  if (has("integration", "connector", "provider", "federation", "sync"))
    return <Plug size={sz} />;
  if (has("session")) return <Activity size={sz} />;
  if (has("credential", "mfa", "password", "passkey", "token", "secret", "key"))
    return <KeyRound size={sz} />;
  if (has("identity", "sign-in", "signin", "authentication", "auth", "method"))
    return <Fingerprint size={sz} />;
  if (has("role")) return <Shield size={sz} />;
  if (has("permission", "access", "scope", "entitle", "allowed", "capabilit"))
    return <Lock size={sz} />;
  if (has("group", "member", "team", "owner", "analyst", "reviewer", "assignee", "people"))
    return <Users size={sz} />;
  if (has("policy", "policies", "rule", "governance", "requirement", "justification", "sod", "segregation"))
    return <ScrollText size={sz} />;
  if (has("config", "setting", "attribute", "mapping", "parameter"))
    return <SlidersHorizontal size={sz} />;
  if (has("network", "connection", "endpoint", "architecture", "topology", "path", "graph"))
    return <Network size={sz} />;
  if (has("lifecycle", "provision", "recovery", "schedule", "expir", "age", "date", "time"))
    return <Clock size={sz} />;
  if (has("activity", "history", "log", "audit", "event", "timeline", "change"))
    return <History size={sz} />;
  if (has("service", "machine", "workload", "server", "agent", "application", "app", "api"))
    return <Server size={sz} />;
  if (has("category", "type", "tag", "label", "classification")) return <Tag size={sz} />;
  if (has("profile", "basic", "overview", "general", "about", "person", "contact"))
    return <User size={sz} />;
  if (has("employ", "organization", "org", "company", "department", "workspace", "tenant"))
    return <Boxes size={sz} />;
  if (has("statistic", "metric", "impact", "inventory", "summary", "information", "metadata", "detail", "adoption"))
    return <Info size={sz} />;
  if (has("notification", "notify")) return <Bell size={sz} />;
  return <Boxes size={sz} />;
}

// ════════════════════════ Shared CSS (self-contained, scoped) ════════════════════════

/** One style block for the whole kit — stat row, rail tabs, form-control font.
 *  Scoped under `.cg-settings-kit` so it never leaks and needs no page setup. */
const KIT_CSS = `
  .cg-settings-kit button, .cg-settings-kit input,
  .cg-settings-kit select, .cg-settings-kit textarea { font-family: ${APP_FONT}; }
  .cg-settings-kit .cg-stat-row {
    display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 0; margin: 0 10px 16px;
  }
  .cg-settings-kit .cg-stat-tile { border-left: 1px solid var(--cg-border); padding: 0 16px; }
  .cg-settings-kit .cg-stat-tile:first-child { border-left: none; padding-left: 0; }
  .cg-settings-kit .cg-rail-tab { transition: background-color .12s, color .12s; }
  .cg-settings-kit .cg-rail-tab:hover { background: var(--cg-bg-hover); color: var(--cg-text-primary); }
  .cg-settings-kit .cg-rail-tab:focus:not(:focus-visible) { outline: none; }
`;

// ════════════════════════ Stat figure ════════════════════════

export interface StatFigure {
  label: string;
  value: string | number;
  /** Risk tint — the only colour a figure carries. */
  tone?: "warn" | "danger";
}

function StatTile({ label, value, tone }: StatFigure) {
  const color =
    tone === "danger"
      ? "var(--cgx-critical)"
      : tone === "warn"
        ? "#e09a2d"
        : "var(--cg-text-primary)";
  return (
    <div className="cg-stat-tile" style={{ minWidth: 120, flexShrink: 0, fontFamily: APP_FONT }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--cg-text-muted)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 20,
          lineHeight: 1.15,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color,
        }}
      >
        {String(value)}
      </div>
    </div>
  );
}

// ════════════════════════ ColumnChooser ════════════════════════

export function ColumnChooser({
  cols,
  hidden,
  onToggle,
}: {
  cols: readonly { key: string; header: string }[];
  hidden: Set<string>;
  onToggle: (k: string) => void;
}) {
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!pos) return undefined;
    const close = (e?: Event) => {
      if (e && menuRef.current?.contains(e.target as Node)) return;
      setPos(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pos]);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          const r = btnRef.current?.getBoundingClientRect();
          if (r)
            setPos(
              pos
                ? null
                : { top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) },
            );
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          color: "var(--cg-text-nav)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: APP_FONT,
        }}
      >
        <Columns3 size={14} /> Choose columns
      </button>
      {pos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            minWidth: 200,
            background: "var(--cg-workspace-dropdown-bg)",
            border: "1px solid var(--cg-border-strong)",
            borderRadius: 8,
            boxShadow: "var(--cg-shadow-dropdown)",
            padding: 6,
            zIndex: 2000,
          }}
        >
          {cols.map((c) => (
            <label
              key={c.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "6px 6px",
                fontSize: 12.5,
                color: "var(--cg-text-nav)",
                cursor: "pointer",
                fontFamily: APP_FONT,
              }}
            >
              <input
                type="checkbox"
                checked={!hidden.has(c.key)}
                onChange={() => onToggle(c.key)}
              />
              {c.header}
            </label>
          ))}
        </div>
      )}
    </>
  );
}

// ════════════════════════ EntityDrawer (rail + sub-tabs) ════════════════════════

export interface DrawerSection {
  label: string;
  /** Optional explicit icon; omit to auto-pick one from the label via railIcon. */
  icon?: React.ReactNode;
  /** Section body. Omit when the section only holds sub-views. */
  render?: () => React.ReactNode;
  /** Optional horizontal sub-tab strip within this section. */
  subs?: { label: string; render: () => React.ReactNode }[];
}

/**
 * The canonical entity/detail drawer: page-colour surface, left rail of sections
 * (icons auto-chosen), an optional sub-tab strip per section, scroll body, footer.
 * Use this for any row-click detail drawer so all drawers read as one surface.
 */
export function EntityDrawer({
  initials,
  title,
  meta,
  actions,
  sections,
  footer,
  width = 940,
  onClose,
}: {
  initials?: string;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  sections: DrawerSection[];
  footer?: React.ReactNode;
  width?: number;
  onClose: () => void;
}) {
  const [sec, setSec] = React.useState(0);
  const [sub, setSub] = React.useState(0);
  const active = sections[sec] ?? sections[0];
  const subs = active?.subs ?? [];
  return (
    <div
      onClick={onClose}
      className="cg-overlay-anim cg-settings-kit"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cg-overlay)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cg-drawer-anim"
        style={{
          width,
          maxWidth: "98vw",
          height: "100%",
          background: "var(--cg-bg-page)",
          borderLeft: "1px solid var(--cg-border-strong)",
          display: "flex",
          flexDirection: "column",
          fontFamily: APP_FONT,
        }}
      >
        <style>{KIT_CSS}</style>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 20px",
            borderBottom: "1px solid var(--cg-border)",
          }}
        >
          {initials && (
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--cg-accent)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {initials}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--cg-text-primary)", lineHeight: 1.3 }}>
              {title}
            </div>
            {meta && <div style={{ marginTop: 3 }}>{meta}</div>}
          </div>
          {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", color: "var(--cg-text-muted)", cursor: "pointer", alignSelf: "flex-start" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: rail + content */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div
            className="custom-scrollbar"
            style={{
              width: 208,
              flexShrink: 0,
              borderRight: "1px solid var(--cg-border)",
              padding: "12px 10px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {sections.map((s, i) => {
              const on = i === sec;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setSec(i);
                    setSub(0);
                  }}
                  className={on ? "cg-rail-tab cg-rail-item-active" : "cg-rail-tab"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 7,
                    border: "none",
                    background: on ? undefined : "transparent",
                    color: on ? undefined : "var(--cg-text-nav)",
                    fontSize: 12.5,
                    fontWeight: on ? 600 : 400,
                    fontFamily: APP_FONT,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      opacity: on ? 1 : 0.5,
                    }}
                  >
                    {s.icon ?? railIcon(s.label)}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {subs.length > 0 && (
              <div
                className="custom-scrollbar"
                style={{
                  display: "flex",
                  gap: 2,
                  padding: "0 20px",
                  borderBottom: "1px solid var(--cg-border)",
                  overflowX: "auto",
                  flexShrink: 0,
                }}
              >
                {subs.map((sv, i) => {
                  const on = i === sub;
                  return (
                    <button
                      key={sv.label}
                      type="button"
                      onClick={() => setSub(i)}
                      style={{
                        padding: "12px 12px 10px",
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid ${on ? "var(--cg-accent)" : "transparent"}`,
                        color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
                        fontSize: 13,
                        fontWeight: on ? 600 : 400,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      {sv.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 20, minWidth: 0 }}>
              {subs.length > 0 ? subs[sub]?.render() : active?.render?.()}
            </div>
          </div>
        </div>

        {footer && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              padding: "14px 20px",
              borderTop: "1px solid var(--cg-border)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════ SettingsTab (the factory) ════════════════════════

export interface SettingsFilterApi {
  clearAll: () => void;
  setSearch: (s: string) => void;
  setFilter: (key: string, value: string) => void;
}

export interface SettingsTabConfig<R extends { id: string }> {
  title: string;
  desc?: string;
  searchPlaceholder?: string;
  /** KPI figures. Omit → auto: Total + a breakdown by the first filter dimension. */
  kpis?: (rows: R[]) => StatFigure[];
  commands?: CommandItem[];
  commandFarItems?: React.ReactNode;
  /** Filter pills; each key is faceted from the rows automatically. */
  filters?: { key: string; label: string }[];
  /** Saved views. `apply` gets an api to set search/filters. */
  presets?: { label: string; apply: (api: SettingsFilterApi) => void }[];
  columns: Column<R>[];
  pageSize?: number;
  /** Selection checkbox column. Defaults to on for a uniform first column. */
  selectable?: boolean;
  bulk?: (ids: string[], clear: () => void) => React.ReactNode;
  rowMenu?: (
    r: R,
    open: () => void,
  ) => { label: string; danger?: boolean; onClick: () => void }[];
  /** Row-click detail drawer. Prefer `EntityDrawer` inside. */
  drawer?: (r: R, close: () => void) => React.ReactNode;
}

/**
 * Render a complete, uniform settings tab from a config. This is the single
 * sanctioned way to build a settings/admin list surface.
 */
export function SettingsTab<R extends { id: string }>({
  config,
  rows,
}: {
  config: SettingsTabConfig<R>;
  rows: R[];
}) {
  const {
    title,
    desc,
    searchPlaceholder = "Search…",
    kpis,
    commands,
    commandFarItems,
    filters = [],
    presets,
    columns,
    pageSize = 12,
    selectable = true,
    bulk,
    rowMenu,
    drawer,
  } = config;

  const [search, setSearch] = React.useState("");
  const [filterVals, setFilterVals] = React.useState<Record<string, string>>({});
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [sel, setSel] = React.useState<R | null>(null);

  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const facet = (key: string) => [
    { value: "", label: "All" },
    ...Array.from(
      new Set(rows.map((r) => String((r as Record<string, unknown>)[key] ?? "")).filter(Boolean)),
    )
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const filtered = rows.filter(
    (r) =>
      (!search ||
        Object.values(r as Record<string, unknown>).some((v) =>
          String(v).toLowerCase().includes(search.toLowerCase()),
        )) &&
      filters.every(
        (f) =>
          !filterVals[f.key] ||
          String((r as Record<string, unknown>)[f.key]) === filterVals[f.key],
      ),
  );

  const filterApi: SettingsFilterApi = {
    clearAll: () => {
      setSearch("");
      setFilterVals({});
    },
    setSearch,
    setFilter: (k, v) => setFilterVals((f) => ({ ...f, [k]: v })),
  };

  // KPI figures: caller-supplied, else Total + breakdown by the first filter dim.
  const figures: StatFigure[] = React.useMemo(() => {
    if (kpis) return kpis(rows);
    const tiles: StatFigure[] = [{ label: "Total", value: rows.length }];
    const fd = filters[0];
    if (fd) {
      const counts = new Map<string, number>();
      rows.forEach((r) => {
        const v = String((r as Record<string, unknown>)[fd.key] ?? "").trim();
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      });
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([k, n]) => tiles.push({ label: k, value: n }));
    }
    return tiles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, kpis, filters]);

  const pills: DiscoveryPill[] = filters.map((f) => ({
    key: f.key,
    label: f.label,
    value: filterVals[f.key] ?? "",
    onChange: (v: string) => setFilterVals((prev) => ({ ...prev, [f.key]: v })),
    options: facet(f.key),
  }));

  return (
    <div className="cg-settings-kit">
      <style>{KIT_CSS}</style>

      <div className="cg-stat-row">
        {figures.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} tone={t.tone} />
        ))}
      </div>

      <DiscoveryListView<R>
        title={title}
        desc={desc}
        commands={commands}
        commandFarItems={commandFarItems}
        presets={
          presets?.map((p) => ({
            label: p.label,
            onApply: () => p.apply(filterApi),
          })) ?? [{ label: "All", onApply: filterApi.clearAll }]
        }
        pills={pills}
        filterRightSlot={
          <ColumnChooser cols={columns} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder={searchPlaceholder}
        count={filtered.length}
        columns={columns.filter((c) => !hidden.has(c.key))}
        rows={filtered}
        pageSize={pageSize}
        onRowClick={drawer ? (r) => setSel(r) : undefined}
        selectable={selectable}
        bulkActions={bulk}
        rowActions={
          rowMenu ? (r) => <RowMenu items={rowMenu(r, () => setSel(r))} /> : undefined
        }
        empty={
          <EmptyState
            icon={<Boxes size={20} />}
            title="Nothing to show yet"
            hint="No items match the current view."
          />
        }
      />

      {sel && drawer?.(sel, () => setSel(null))}
    </div>
  );
}

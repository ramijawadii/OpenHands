/* eslint-disable react/require-default-props, i18next/no-literal-string, no-nested-ternary, react/jsx-no-useless-fragment, @typescript-eslint/no-use-before-define, jsx-a11y/control-has-associated-label -- CloudGuard admin console kit */
import React from "react";
import { Link, useSearchParams } from "react-router";
import { Lock, ShieldAlert, ArrowUpRight } from "lucide-react";

/**
 * URL-addressable tab state — backs a page's active tab with `?tab=<id>` so a tab
 * is deep-linkable / shareable (global search lands exactly on it). The default
 * tab omits the param for clean URLs.
 */
export function useTabParam(defaultId: string): [string, (id: string) => void] {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? defaultId;
  const set = (id: string) => {
    const next = new URLSearchParams(sp);
    if (id === defaultId) next.delete("tab");
    else next.set("tab", id);
    setSp(next);
  };
  return [tab, set];
}

/**
 * Admin console component kit — the clean-ground rebuild (docs/architecture/org-admin-implementation
 * /07_UI_DESIGN.md). It composes the existing `--cg-*` design tokens so the new two-console admin UI
 * is visually native to CloudGuard, and adds the net-new governance primitives the spec needs:
 * `InheritedField` (the §3/§39.5 inheritance overlay), `FloorBadge`, `ExceptionChip`,
 * `EnforcementPill`, `PostureCard`, `DirectoryTable`, `PageHeader`.
 *
 * Existing kit primitives (Toggle, SaveBar, ConfirmButton, EmptyState, RoleChip, ScopeBadge…) are
 * re-exported from settings-kit — the admin pages import them from here so there's one kit surface.
 */

export {
  Toggle,
  SaveBar,
  ConfirmButton,
  EmptyState,
  Skeleton,
  LiveCardSkeleton,
  RoleChip,
  ScopeBadge,
  RelatedLinks,
  useUndoToast,
  useDirty,
  useDialogA11y,
} from "#/components/features/settings/settings-kit";

export const T = {
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  cardBg: "var(--cg-bg-card)",
  badgeBg: "var(--cg-bg-badge)",
  accent: "var(--cg-accent)",
  purple: "var(--cg-accent-purple)",
  danger: "var(--cg-danger)",
  success: "#4caf7d",
  warning: "#e09a2d",
} as const;

// ── EffectiveValue — the §3 inheritance resolution shape (mirrors admin/inheritance.py F2) ────────
export type PolicyValue = string | number | boolean;
export interface Provenance {
  level: "enterprise" | "business_unit" | "workspace" | "agent";
  value: PolicyValue;
}
export interface EffectiveValue {
  key: string;
  effective: PolicyValue;
  direct?: Provenance | null; // set at this scope?
  inherited?: Provenance | null; // nearest ancestor that set it
  overridePermitted: boolean;
  mandatoryFloor?: PolicyValue | null; // most-restrictive enterprise control
  exception?: {
    id: string;
    approver: string;
    expiry: string;
    justification?: string;
  } | null;
  enforcement?: string; // §9.8 enforcement status
}

const LEVEL_LABEL: Record<Provenance["level"], string> = {
  enterprise: "Enterprise",
  business_unit: "Business unit",
  workspace: "Workspace",
  agent: "Agent",
};

function fmt(v: PolicyValue): string {
  if (typeof v === "boolean") return v ? "On" : "Off";
  return String(v);
}

// ── FloorBadge — "Mandatory, set by Enterprise" (§39.4) ───────────────────────────────────────────
export function FloorBadge({ floor }: { floor?: PolicyValue | null }) {
  return (
    <span
      title="A mandatory control set by Enterprise. You may set a stricter value, not a weaker one."
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        padding: "0 8px",
        borderRadius: 99,
        fontSize: 11,
        color: T.purple,
        background: "var(--cg-accent-purple-bg)",
        whiteSpace: "nowrap",
      }}
    >
      <Lock size={11} strokeWidth={2} />
      Mandatory — Enterprise{floor != null ? `: ${fmt(floor)}` : ""}
    </span>
  );
}

// ── ExceptionChip — active time-boxed waiver (§9.6) ───────────────────────────────────────────────
export function ExceptionChip({
  approver,
  expiry,
}: {
  approver: string;
  expiry: string;
}) {
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
  const expiringSoon = days <= 7;
  return (
    <span
      title={`Exception approved by ${approver}, expires ${expiry}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        padding: "0 8px",
        borderRadius: 99,
        fontSize: 11,
        color: T.danger,
        background: "var(--cg-danger-bg)",
        border: `1px solid var(--cg-danger-border)`,
        whiteSpace: "nowrap",
      }}
    >
      <ShieldAlert size={11} strokeWidth={2} />
      Exception · {approver}
      {expiringSoon && Number.isFinite(days) ? ` · ${days}d left` : ""}
    </span>
  );
}

// ── EnforcementPill — §9.8 ────────────────────────────────────────────────────────────────────────
const ENF_TONE: Record<string, string> = {
  enforced: T.success,
  "monitoring-only": T.warning,
  monitoring: T.warning,
  draft: T.textMuted,
  scheduled: T.accent,
  "partially-enforced": T.warning,
  "enforcement-error": T.danger,
  "conflicting-policy": T.danger,
  "unsupported-enforcement": T.textMuted,
};
export function EnforcementPill({ status }: { status?: string }) {
  if (!status) return null;
  const color = ENF_TONE[status] ?? T.textMuted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: color }}
      />
      {status.replace(/-/g, " ")}
    </span>
  );
}

// ── InheritedField — THE control that makes §3 / §39.5 real on every config page ──────────────────
export function InheritedField({
  label,
  hint,
  ev,
  children,
}: {
  label: string;
  hint?: string;
  ev: EffectiveValue;
  children: React.ReactNode; // the actual control (Toggle/select/segmented), provided by the page
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "14px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>
            {label}
          </div>
          {hint && (
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
              {hint}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>

      {/* Provenance line — direct / inherited / effective / floor / exception / enforcement */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          fontSize: 11.5,
          color: T.textMuted,
        }}
      >
        <span>
          Effective:{" "}
          <strong style={{ color: T.textPrimary }}>{fmt(ev.effective)}</strong>
        </span>
        {ev.direct ? (
          <span>· Set at {LEVEL_LABEL[ev.direct.level].toLowerCase()}</span>
        ) : ev.inherited ? (
          <span>
            · Inherited: {fmt(ev.inherited.value)} (
            {LEVEL_LABEL[ev.inherited.level]})
          </span>
        ) : null}
        {!ev.overridePermitted && <FloorBadge floor={ev.mandatoryFloor} />}
        {ev.overridePermitted && !ev.direct && (
          <span style={{ color: T.accent }}>· Override allowed</span>
        )}
        {ev.exception && (
          <ExceptionChip
            approver={ev.exception.approver}
            expiry={ev.exception.expiry}
          />
        )}
        {ev.enforcement && (
          <>
            <span>·</span>
            <EnforcementPill status={ev.enforcement} />
          </>
        )}
      </div>
    </div>
  );
}

// ── PostureCard — overview/posture grids (§5, §20) ────────────────────────────────────────────────
export function PostureCard({
  title,
  value,
  sub,
  tone = "muted",
  to,
  cta,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "ok" | "warn" | "danger" | "muted";
  to?: string;
  cta?: string;
}) {
  const dot =
    tone === "ok"
      ? T.success
      : tone === "warn"
        ? T.warning
        : tone === "danger"
          ? T.danger
          : T.textMuted;
  return (
    <div
      style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: T.textMuted }}>{title}</div>
      <div
        style={{
          fontSize: 22,
          color: T.textPrimary,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: T.textNav,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dot,
              flexShrink: 0,
            }}
          />
          {sub}
        </div>
      )}
      {to && cta && (
        <Link
          to={to}
          style={{
            marginTop: 2,
            fontSize: 12,
            color: T.accent,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {cta} <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}

export function PostureGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 22,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 19,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>{actions}</div>
      )}
    </div>
  );
}

// ── DirectoryTable — dense, sortable, paginated list (§8.1, §22, §13…) ────────────────────────────
export interface Column<R> {
  key: string;
  header: string;
  render: (row: R) => React.ReactNode;
  width?: number | string;
  // Provide to make the column sortable; returns the comparable value.
  sortValue?: (row: R) => string | number;
}
export function DirectoryTable<R extends { id: string }>({
  columns,
  rows,
  onRowClick,
  empty,
  pageSize,
  rowActions,
  initialSort,
  selectable,
  bulkActions,
}: {
  columns: Column<R>[];
  rows: R[];
  onRowClick?: (row: R) => void;
  empty?: React.ReactNode;
  pageSize?: number;
  rowActions?: (row: R) => React.ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  selectable?: boolean;
  bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode;
}) {
  const [sort, setSort] = React.useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(initialSort ?? null);
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const clearSel = () => setSelected(new Set());
  const toggleRow = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    const out = [...rows].sort((a, b) => {
      const av = sv(a);
      const bv = sv(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, sort, columns]);

  const total = sorted.length;
  const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const cur = Math.min(page, pages - 1);
  const view = pageSize
    ? sorted.slice(cur * pageSize, cur * pageSize + pageSize)
    : sorted;

  React.useEffect(() => {
    setPage(0);
  }, [sort, rows.length]);

  if (rows.length === 0 && empty) return <>{empty}</>;

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const pageIds = view.map((r) => r.id);
  const allOnPage =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPage) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });

  return (
    <>
      {selectable && bulkActions && selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "9px 14px",
            marginBottom: 8,
            borderRadius: 8,
            background: "var(--cg-accent-bg-strong)",
            border: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{ fontSize: 12.5, color: T.textPrimary, fontWeight: 500 }}
          >
            {selected.size} selected
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {bulkActions(Array.from(selected), clearSel)}
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={clearSel}
            style={{
              background: "transparent",
              border: "none",
              color: T.accent,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      )}
      <div
        className="cg-tablewrap"
        style={{
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          overflowX: "auto",
          maxWidth: "100%",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}
        >
          <thead>
            <tr>
              {selectable && (
                <th
                  style={{
                    width: 38,
                    borderBottom: `1px solid ${T.border}`,
                    padding: "0 0 0 12px",
                  }}
                >
                  <CheckBox
                    checked={allOnPage}
                    onChange={toggleAll}
                    ariaLabel="Select all"
                  />
                </th>
              )}
              {columns.map((c) => {
                const sortable = !!c.sortValue;
                const on = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: on ? T.textPrimary : T.textMuted,
                      borderBottom: `2px solid var(--cg-border-card)`,
                      width: c.width,
                      whiteSpace: "nowrap",
                      cursor: sortable ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    {c.header}
                    {sortable && on && (
                      <span style={{ marginLeft: 6, color: T.accent }}>
                        {sort!.dir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th
                  style={{ width: 44, borderBottom: `1px solid ${T.border}` }}
                />
              )}
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr
                key={row.id}
                className="cg-row"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {selectable && (
                  <td
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 38,
                      padding: "0 0 0 12px",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    <CheckBox
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      ariaLabel="Select row"
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      padding: "14px 16px",
                      color: T.textNav,
                      borderBottom: `1px solid ${T.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "6px 10px",
                      borderBottom: `1px solid ${T.border}`,
                      textAlign: "right",
                    }}
                  >
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && total > pageSize && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            fontSize: 12,
            color: T.textMuted,
          }}
        >
          <span>
            {cur * pageSize + 1}–{Math.min(total, cur * pageSize + pageSize)} of{" "}
            {total}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <PagerBtn disabled={cur === 0} onClick={() => setPage(cur - 1)}>
              ← Prev
            </PagerBtn>
            <span style={{ alignSelf: "center" }}>
              {cur + 1} / {pages}
            </span>
            <PagerBtn
              disabled={cur >= pages - 1}
              onClick={() => setPage(cur + 1)}
            >
              Next →
            </PagerBtn>
          </div>
        </div>
      )}
    </>
  );
}

export function CheckBox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: `1.5px solid ${checked ? T.accent : T.borderStrong}`,
        background: checked ? T.accent : "transparent",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        color: "#fff",
        fontSize: 11,
        lineHeight: 1,
      }}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

// ── RowMenu — the ⋮ overflow menu for per-row actions (Microsoft "More actions" pattern) ──────────
export function RowMenu({
  items,
}: {
  items: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }[];
}) {
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(
    null,
  );
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const MENU_W = 190;
  const open = !!pos;

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const estH = 8 + items.length * 32;
    const below = window.innerHeight - r.bottom;
    const top = below < estH && r.top > estH ? r.top - estH - 2 : r.bottom + 2;
    setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
  };

  React.useEffect(() => {
    if (!open) return undefined;
    const close = (e?: Event) => {
      if (e && menuRef.current && menuRef.current.contains(e.target as Node))
        return;
      setPos(null);
    };
    const onScroll = () => setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="More actions"
        onClick={(e) => {
          e.stopPropagation();
          if (open) setPos(null);
          else place();
        }}
        style={{
          background: "transparent",
          border: "none",
          color: T.textMuted,
          cursor: "pointer",
          padding: "4px 6px",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ⋮
      </button>
      {pos && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            width: MENU_W,
            background: "var(--cg-workspace-dropdown-bg)",
            border: `1px solid ${T.borderStrong}`,
            borderRadius: 8,
            boxShadow: "var(--cg-shadow-dropdown)",
            padding: 4,
            zIndex: 2000,
          }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              disabled={it.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setPos(null);
                it.onClick();
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!it.disabled) el.style.background = "var(--cg-bg-hover)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "transparent";
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: it.disabled
                  ? T.textMuted
                  : it.danger
                    ? T.danger
                    : T.textNav,
                fontSize: 12.5,
                cursor: it.disabled ? "not-allowed" : "pointer",
                transition: "background 0.1s ease",
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function PagerBtn({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 11px",
        borderRadius: 6,
        border: `1px solid ${T.border}`,
        background: "transparent",
        color: T.textNav,
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

// Standard content padding for an admin page body — fills the available width.
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 36px 28px",
        maxWidth: 1760,
        margin: "0 auto",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

// ── Tabs — in-page sub-views for a section's sub-areas (§ sub-trees) ───────────────────────────────
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; badge?: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        flexWrap: "wrap",
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 22,
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              flexShrink: 0,
              position: "relative",
              height: 36,
              padding: "0 13px",
              border: "none",
              background: "transparent",
              color: on ? T.textPrimary : T.textNav,
              fontSize: 13,
              fontWeight: on ? 600 : 400,
              cursor: "pointer",
              borderBottom: `2px solid ${on ? T.accent : "transparent"}`,
              marginBottom: -1,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {t.icon}
            {t.label}
            {t.badge && (
              <span
                style={{
                  height: 17,
                  padding: "0 6px",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 600,
                  color: T.textNav,
                  background: T.badgeBg,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── SubTabStrip — the second-level pill+icon sub-navigation (Microsoft 365 / Users-module parity) ──
// Used under a page's primary Tabs to switch a section's sub-views. Mirrors the Identity console
// SubTabStrip so every admin surface shares one look: rounded pills, accent border/fill when active,
// a lucide icon that recolors on selection.
export type StripIcon = React.ComponentType<{ size?: number; color?: string }>;
export function SubTabStrip({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; Icon?: StripIcon; badge?: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        const { Icon } = t;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 30,
              padding: "0 11px",
              borderRadius: 6,
              border: `1px solid ${on ? "var(--cg-accent)" : "var(--cg-border-card)"}`,
              background: on ? "var(--cg-accent-bg)" : "transparent",
              color: on ? T.textPrimary : T.textNav,
              fontSize: 12.5,
              fontWeight: on ? 600 : 400,
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {Icon && <Icon size={13} color={on ? T.accent : T.textMuted} />}
            {t.label}
            {t.badge && (
              <span
                style={{
                  height: 16,
                  padding: "0 6px",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 600,
                  color: T.textNav,
                  background: T.badgeBg,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── SampleTag — honest marker that a value is representative sample data, not a live reading ───────
export function SampleTag() {
  return (
    <span
      title="Representative sample data — this field is not yet wired to a live backend signal."
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 16,
        padding: "0 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: T.warning,
        background: "rgba(224,154,45,0.12)",
        border: "1px solid rgba(224,154,45,0.3)",
      }}
    >
      Sample
    </span>
  );
}

// Sample banners are disabled — kept as a no-op so call sites stay unchanged.
export function SampleBanner({ what }: { what: string }) {
  return what ? null : null;
}

// ── Card — titled container for a sub-area group ──────────────────────────────────────────────────
export function Card({
  title,
  desc,
  right,
  children,
}: {
  title?: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        background: T.cardBg,
        marginBottom: 18,
        overflow: "hidden",
      }}
    >
      {(title || right) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "13px 16px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div>
            {title && (
              <div
                style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}
              >
                {title}
              </div>
            )}
            {desc && (
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {desc}
              </div>
            )}
          </div>
          {right}
        </div>
      )}
      <div style={{ padding: "6px 16px 18px" }}>{children}</div>
    </div>
  );
}

// ── StatRow — label · value · status, the workhorse posture/attestation row ───────────────────────
export function StatRow({
  label,
  value,
  tone,
  hint,
  sample,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "ok" | "warn" | "danger" | "muted";
  hint?: string;
  sample?: boolean;
}) {
  const dot =
    tone === "ok"
      ? T.success
      : tone === "warn"
        ? T.warning
        : tone === "danger"
          ? T.danger
          : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "11px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: T.textPrimary,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {label}
          {sample && <SampleTag />}
        </div>
        {hint && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
            {hint}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          fontSize: 12.5,
          color: T.textNav,
          textAlign: "right",
        }}
      >
        {dot && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dot,
            }}
          />
        )}
        {value}
      </div>
    </div>
  );
}

// ── KVGrid — compact key/value grid ───────────────────────────────────────────────────────────────
export function KVGrid({
  items,
  cols = 2,
}: {
  items: { k: string; v: React.ReactNode; sample?: boolean }[];
  cols?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16,
        padding: "12px 0",
      }}
    >
      {items.map((it) => (
        <div
          key={it.k}
          style={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <span
            style={{
              fontSize: 11,
              color: T.textMuted,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {it.k}
            {it.sample && <SampleTag />}
          </span>
          <span style={{ fontSize: 13, color: T.textPrimary }}>{it.v}</span>
        </div>
      ))}
    </div>
  );
}

// ── HeaderButton — the standard page-header / table action button ─────────────────────────────────
export function HeaderButton({
  onClick,
  icon,
  children,
  variant = "secondary",
  disabled,
  title,
}: {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const style: React.CSSProperties =
    variant === "primary"
      ? {
          background: "var(--cg-btn-cta-bg)",
          color: "var(--cg-btn-cta-text)",
          border: "none",
        }
      : variant === "danger"
        ? {
            background: "transparent",
            color: T.danger,
            border: `1px solid var(--cg-danger-border)`,
          }
        : {
            background: "transparent",
            color: T.textNav,
            border: `1px solid ${T.borderStrong}`,
          };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 34,
        padding: "0 13px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: variant === "primary" ? 500 : 400,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Select — faceted filter dropdown ──────────────────────────────────────────────────────────────
export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 32,
        padding: "0 8px",
        background: "var(--cg-input-bg)",
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        color: T.textPrimary,
        fontSize: 12.5,
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── FilterBar — search + facets + result count + clear, the standard list toolbar ─────────────────
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  children,
  count,
  total,
  onClear,
  showClear,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  count?: number;
  total?: number;
  onClear?: () => void;
  showClear?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 14,
      }}
    >
      {onSearch && (
        <div style={{ position: "relative", minWidth: 240 }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: 8,
              color: T.textMuted,
              fontSize: 13,
            }}
          >
            ⌕
          </span>
          <input
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
            style={{
              height: 32,
              width: "100%",
              padding: "0 10px 0 26px",
              background: "var(--cg-input-bg)",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              color: T.textPrimary,
              fontSize: 12.5,
              outline: "none",
            }}
          />
        </div>
      )}
      {children}
      {showClear && onClear && (
        <button
          type="button"
          onClick={onClear}
          style={{
            height: 32,
            padding: "0 10px",
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: T.accent,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Clear filters
        </button>
      )}
      <div style={{ flex: 1 }} />
      {count != null && (
        <span style={{ fontSize: 12, color: T.textMuted }}>
          {count}
          {total != null && total !== count ? ` of ${total}` : ""} result
          {count === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

// ── RefreshButton + freshness stamp — data-trust affordance for live pages ────────────────────────
export function RefreshControl({
  onRefresh,
  isFetching,
  updatedAt,
}: {
  onRefresh: () => void;
  isFetching?: boolean;
  updatedAt?: number;
}) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(force, 15000);
    return () => clearInterval(t);
  }, []);
  const ago = updatedAt
    ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000))
    : null;
  const agoLabel =
    ago == null
      ? ""
      : ago < 5
        ? "just now"
        : ago < 60
          ? `${ago}s ago`
          : `${Math.round(ago / 60)}m ago`;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {agoLabel && (
        <span style={{ fontSize: 11.5, color: T.textMuted }}>
          Updated {agoLabel}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isFetching}
        title="Refresh"
        style={{
          height: 34,
          width: 34,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: `1px solid ${T.borderStrong}`,
          background: "transparent",
          color: T.textNav,
          cursor: isFetching ? "wait" : "pointer",
        }}
      >
        <span
          style={{
            display: "inline-block",
            animation: isFetching ? "cg-spin 0.8s linear infinite" : "none",
            fontSize: 15,
          }}
        >
          ⟳
        </span>
      </button>
    </span>
  );
}

// ── CommandBar — the Microsoft DetailsList toolbar (icon + label actions + divider + overflow) ─────
export interface CommandItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  disabled?: boolean;
}
export function CommandBar({
  items,
  farItems,
}: {
  items: CommandItem[];
  farItems?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 14,
        paddingBottom: 6,
        minWidth: 0,
      }}
    >
      <div
        className="custom-scrollbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flex: "1 1 auto",
          minWidth: 0,
          overflowX: "auto",
        }}
      >
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={(e) => it.onClick?.(e)}
            disabled={it.disabled}
            title={it.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 36,
              padding: "0 10px",
              border: "none",
              background: "transparent",
              color: it.disabled ? T.textMuted : T.textPrimary,
              fontSize: 13,
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: it.disabled ? "not-allowed" : "pointer",
              opacity: it.disabled ? 0.5 : 1,
            }}
          >
            <span
              style={{ color: T.accent, display: "inline-flex", flexShrink: 0 }}
            >
              {it.icon}
            </span>
            {it.label}
          </button>
        ))}
      </div>
      {farItems && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          {farItems}
        </div>
      )}
    </div>
  );
}

// ── FilterSet — "Filter set: Commonly used ▾" + facet pills (Microsoft pattern) ───────────────────
export interface FilterPillDef {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}
export interface FilterPreset {
  label: string;
  onApply: () => void;
}
export function FilterSet({
  savedLabel = "Commonly used",
  pills,
  presets,
  rightSlot,
}: {
  savedLabel?: string;
  pills: FilterPillDef[];
  presets?: FilterPreset[];
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 14,
      }}
    >
      <span style={{ fontSize: 12.5, color: T.textMuted }}>Filter set:</span>
      {presets && presets.length > 0 ? (
        <PresetMenu label={savedLabel} presets={presets} />
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 13,
            fontWeight: 600,
            color: T.textPrimary,
          }}
        >
          {savedLabel}{" "}
          <span style={{ color: T.textMuted, fontSize: 11 }}>▾</span>
        </span>
      )}
      <span style={{ width: 6 }} />
      {pills.map((p) => (
        <FilterPill key={p.key} def={p} />
      ))}
      {rightSlot && (
        <>
          <div style={{ flex: 1 }} />
          {rightSlot}
        </>
      )}
    </div>
  );
}

function PresetMenu({
  label,
  presets,
}: {
  label: string;
  presets: FilterPreset[];
}) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!pos) return undefined;
    const close = (e?: Event) => {
      if (e && menuRef.current && menuRef.current.contains(e.target as Node))
        return;
      setPos(null);
    };
    const onScroll = () => setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [pos]);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setPos(pos ? null : { top: r.bottom + 4, left: r.left });
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          fontWeight: 600,
          color: T.accent,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {label} <span style={{ fontSize: 11 }}>▾</span>
      </button>
      {pos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            minWidth: 200,
            background: "var(--cg-workspace-dropdown-bg)",
            border: `1px solid ${T.borderStrong}`,
            borderRadius: 8,
            boxShadow: "var(--cg-shadow-dropdown)",
            padding: 4,
            zIndex: 2000,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "6px 10px 2px",
            }}
          >
            Standard filters set
          </div>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                p.onApply();
                setPos(null);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: T.textNav,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function FilterPill({ def }: { def: FilterPillDef }) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const active = !!def.value;
  const current = def.options.find((o) => o.value === def.value);
  React.useEffect(() => {
    if (!pos) return undefined;
    const close = (e?: Event) => {
      if (e && menuRef.current && menuRef.current.contains(e.target as Node))
        return;
      setPos(null);
    };
    const onScroll = () => setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [pos]);
  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
  };
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (pos ? setPos(null) : open())}
        style={{
          height: 28,
          padding: "0 12px",
          borderRadius: 4,
          border: `1px solid ${active ? "var(--cg-accent)" : "var(--cg-border-card)"}`,
          background: active
            ? "var(--cg-accent-bg-strong)"
            : "var(--cg-bg-badge)",
          color: active ? T.accent : T.textPrimary,
          fontSize: 13,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {def.label}
        {active && current ? `: ${current.label}` : ""}
        <span style={{ color: T.textMuted, fontSize: 10 }}>▾</span>
      </button>
      {pos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            minWidth: 180,
            background: "var(--cg-workspace-dropdown-bg)",
            border: `1px solid ${T.borderStrong}`,
            borderRadius: 8,
            boxShadow: "var(--cg-shadow-dropdown)",
            padding: 4,
            zIndex: 2000,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {def.options.map((o) => (
            <button
              key={o.value || "all"}
              type="button"
              onClick={() => {
                def.onChange(o.value);
                setPos(null);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                borderRadius: 6,
                border: "none",
                background:
                  o.value === def.value ? "var(--cg-bg-hover)" : "transparent",
                color: T.textNav,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ── Drawer — the single right-side panel used for all detail/edit/wizard surfaces ──────────────────
// Replaces centered modal popups everywhere so the format is consistent, with a light slide-in entry.
export function Drawer({
  title,
  subtitle,
  children,
  footer,
  onClose,
  width = 480,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      className="cg-overlay-anim"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cg-overlay)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cg-drawer-anim"
        style={{
          width,
          maxWidth: "96vw",
          height: "100%",
          background: T.cardBg,
          borderLeft: `1px solid ${T.borderStrong}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "18px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div>
            <div
              style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}
            >
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: T.textMuted,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

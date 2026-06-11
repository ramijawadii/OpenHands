/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- CloudGuard ACP UI kit (mock) */
import React from "react";

export const A = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  danger: "var(--cg-danger)",
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

export function PageHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: A.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {sub && (
          <p
            style={{
              fontSize: 13,
              color: A.textMuted,
              margin: "6px 0 0",
              lineHeight: 1.5,
              maxWidth: 720,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

export function SubTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        borderBottom: `1px solid ${A.border}`,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          style={{
            height: 34,
            padding: "0 12px",
            background: "none",
            border: "none",
            borderBottom: `2px solid ${value === t ? A.accent : "transparent"}`,
            color: value === t ? A.textPrimary : A.textMuted,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: -1,
            whiteSpace: "nowrap",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: A.cardBg,
        border: `1px solid ${A.border}`,
        borderRadius: 10,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function H2({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: A.textPrimary,
          margin: 0,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: 12.5,
            color: A.textMuted,
            margin: "5px 0 0",
            lineHeight: 1.5,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function Badge({
  text,
  tone,
}: {
  text: string;
  tone: "ok" | "warn" | "danger" | "info" | "muted" | "purple";
}) {
  const c = {
    ok: A.success,
    warn: A.warning,
    danger: A.danger,
    info: A.accent,
    muted: A.textMuted,
    purple: A.purple,
  }[tone];
  const bg = {
    ok: "rgba(76,175,125,0.15)",
    warn: "rgba(224,154,45,0.15)",
    danger: "rgba(224,82,82,0.15)",
    info: "rgba(45,134,212,0.15)",
    muted: A.badgeBg,
    purple: "rgba(155,135,245,0.15)",
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        justifySelf: "start",
        alignSelf: "center",
        padding: "2px 7px",
        borderRadius: 99,
        fontSize: 10.5,
        lineHeight: 1.1,
        fontWeight: 600,
        color: c,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

// Theme-aware inline SVG icon set (replaces emoji in the ACP UI).
const ICONS: Record<string, React.ReactNode> = {
  warn: (
    <path
      d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  check: (
    <path
      d="M4 12.5 9 17.5 20 6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  skipBack: (
    <path
      d="M19 5v14L9 12l10-7ZM5 5v14"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  stepBack: (
    <path
      d="M15 5v14L5 12l10-7Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  stepFwd: (
    <path d="M9 5v14l10-7L9 5Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  skipFwd: (
    <path
      d="M5 5v14l10-7L5 5ZM19 5v14"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  rollback: (
    <path
      d="M4 8h9a5 5 0 0 1 0 10H6M4 8l4-4M4 8l4 4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  block: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" strokeLinecap="round" />
    </>
  ),
  diff: (
    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
  ),
};
export function Icon({
  name,
  size = 14,
  color = "currentColor",
}: {
  name: keyof typeof ICONS | string;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      {ICONS[name] ?? null}
    </svg>
  );
}

// §1.2 severity palette: critical=red · high=amber · medium=green · low=blue · info=grey
export function Sev({ s }: { s: string }) {
  const k = s.toLowerCase();
  const t =
    k === "critical"
      ? "danger"
      : k === "high"
        ? "warn"
        : k === "medium"
          ? "ok"
          : k === "low"
            ? "info"
            : "muted";
  return (
    <Badge text={s} tone={t as "danger" | "warn" | "ok" | "info" | "muted"} />
  );
}

// §1.2 mode badges: auto=red · supervised=amber · plan=blue · read-only=green
export function Mode({ m }: { m: string }) {
  const k = m.toLowerCase();
  const t =
    k === "auto"
      ? "danger"
      : k === "supervised"
        ? "warn"
        : k === "plan"
          ? "info"
          : k === "read-only"
            ? "ok"
            : "muted";
  return <Badge text={m} tone={t as "danger" | "warn" | "info" | "ok"} />;
}

export function Breadcrumb({
  items,
  status,
}: {
  items: { label: string; onClick?: () => void }[];
  status?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12,
        color: A.textMuted,
        marginBottom: 14,
        flexWrap: "wrap",
      }}
    >
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.6 }}>›</span>}
          {it.onClick && i < items.length - 1 ? (
            <button
              type="button"
              onClick={it.onClick}
              style={{
                background: "none",
                border: "none",
                color: A.accent,
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {it.label}
            </button>
          ) : (
            <span
              style={{
                color: i === items.length - 1 ? A.textSecondary : A.textMuted,
              }}
            >
              {it.label}
            </span>
          )}
        </React.Fragment>
      ))}
      {status && <span style={{ marginLeft: 4 }}>{status}</span>}
    </div>
  );
}

export function FilterBar({
  placeholder,
  search,
  onSearch,
  children,
  right,
}: {
  placeholder: string;
  search: string;
  onSearch: (v: string) => void;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
        flexWrap: "wrap",
      }}
    >
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{ ...acpInput, flex: 1, minWidth: 220 }}
      />
      {children}
      {right && (
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {right}
        </div>
      )}
    </div>
  );
}

export function FSelect({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={acpSelect}
    >
      <option value="" style={acpOpt}>
        {all}
      </option>
      {options.map((o) => (
        <option key={o} value={o} style={acpOpt}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function ExportBtn({ label = "Export CSV" }: { label?: string }) {
  return (
    <button
      type="button"
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: 6,
        background: A.cardBg,
        border: `1px solid ${A.borderStrong}`,
        color: A.textSecondary,
        fontSize: 12.5,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function Hash({ h, link }: { h: string; link?: boolean }) {
  const short = h.length > 10 ? `${h.slice(0, 8)}…` : h;
  return (
    <span
      title={h}
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        color: link ? A.accent : A.textMuted,
        cursor: link ? "pointer" : "default",
      }}
    >
      {short}
    </span>
  );
}

export function KillBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 8,
        background: "rgba(224,82,82,0.12)",
        border: "1px solid rgba(224,82,82,0.4)",
        marginBottom: 18,
      }}
    >
      <Icon name="block" size={16} color={A.danger} />
      <span style={{ fontSize: 13, color: A.textSecondary }}>
        <strong style={{ color: A.danger }}>Org-wide kill switch ACTIVE</strong>{" "}
        — set by alice@acme 14m ago · Reason: "Investigating anomaly"
      </span>
      <button
        type="button"
        style={{
          marginLeft: "auto",
          height: 28,
          padding: "0 12px",
          borderRadius: 6,
          background: A.cardBg,
          border: `1px solid ${A.danger}`,
          color: A.danger,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Resume
      </button>
    </div>
  );
}

export function Decision({ d }: { d: string }) {
  const t =
    d === "Allow"
      ? "ok"
      : d === "Ask"
        ? "warn"
        : d === "Deny" || d === "Blocked"
          ? "danger"
          : "muted";
  return <Badge text={d} tone={t as "ok" | "warn" | "danger"} />;
}

export function Table({
  cols,
  rows,
  grid,
}: {
  cols: string[];
  rows: React.ReactNode[][];
  grid: string;
}) {
  return (
    <div
      className="cg-tablewrap"
      style={{ borderRadius: 8, border: `1px solid ${A.border}` }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: grid,
          padding: "8px 16px",
          borderBottom: `1px solid ${A.border}`,
        }}
      >
        {cols.map((c, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: A.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {c}
          </span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="cg-row"
          style={{
            display: "grid",
            gridTemplateColumns: grid,
            padding: "10px 16px",
            borderBottom:
              i < rows.length - 1
                ? "1px solid var(--cg-border-subtle)"
                : "none",
            alignItems: "center",
          }}
        >
          {r.map((cell, j) => (
            <div
              key={j}
              style={{
                fontSize: 12.5,
                color: A.textSecondary,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const acpInput: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  background: A.inputBg,
  border: `1px solid ${A.border}`,
  borderRadius: 6,
  color: A.textPrimary,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
export const acpSelect: React.CSSProperties = {
  ...acpInput,
  padding: "0 26px 0 10px",
  appearance: "none" as const,
  cursor: "pointer",
};
export const acpOpt = { background: "var(--cg-bg-card)" } as const;
export const mono: React.CSSProperties = { fontFamily: "monospace" };

// High-contrast primary button (white pill + dark text in dark mode; inverts
// in light mode). Replaces the old solid-blue accent buttons.
export const primaryBtn: React.CSSProperties = {
  height: 32,
  padding: "0 14px",
  borderRadius: 7,
  background: "var(--cg-text-primary)",
  color: "var(--cg-bg-card)",
  fontSize: 12.5,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

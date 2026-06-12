/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { SettingsSaveBar } from "#/components/features/settings/settings-save-bar";
import {
  ScopeBadge,
  useDialogA11y,
} from "#/components/features/settings/settings-kit";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const WORKSPACES = [
  "Sentinel Security Workspace",
  "Production Cloud",
  "Sandbox / Dev",
];
const ROLES = ["Admin", "Security Engineer", "Analyst", "Viewer"];
const CPU_OPTIONS = ["2 vCPU", "4 vCPU", "8 vCPU", "16 vCPU"];
const RAM_OPTIONS = ["4 GB", "8 GB", "16 GB", "32 GB"];

interface Alloc {
  id: string;
  workspace: string;
  role: string;
  cpu: string;
  ram: string;
  autoScale: boolean;
  geo?: string;
}

// Each workspace pins its sandbox data-residency region (inherited unless overridden).
const WS_REGION: Record<string, string> = {
  "Sentinel Security Workspace": "EU (eu-west-1)",
  "Production Cloud": "US (us-east-1)",
  "Sandbox / Dev": "APAC (ap-southeast-1)",
};
const REGION_OPTIONS = [
  "US (us-east-1)",
  "EU (eu-west-1)",
  "UK (eu-west-2)",
  "APAC (ap-southeast-1)",
];
const allocGeo = (a: Alloc) =>
  a.geo ?? WS_REGION[a.workspace] ?? "EU (eu-west-1)";

interface UsageRow {
  date: string;
  workspace: string;
  role: string;
  sessions: number;
  cpuHours: number;
  peakRam: string;
}

const INITIAL_ALLOCS: Alloc[] = [
  {
    id: "a1",
    workspace: "Sentinel Security Workspace",
    role: "Admin",
    cpu: "8 vCPU",
    ram: "16 GB",
    autoScale: true,
  },
  {
    id: "a2",
    workspace: "Sentinel Security Workspace",
    role: "Security Engineer",
    cpu: "4 vCPU",
    ram: "8 GB",
    autoScale: true,
  },
  {
    id: "a3",
    workspace: "Sentinel Security Workspace",
    role: "Analyst",
    cpu: "2 vCPU",
    ram: "4 GB",
    autoScale: false,
  },
  {
    id: "a4",
    workspace: "Production Cloud",
    role: "Security Engineer",
    cpu: "8 vCPU",
    ram: "32 GB",
    autoScale: true,
  },
  {
    id: "a5",
    workspace: "Production Cloud",
    role: "Viewer",
    cpu: "2 vCPU",
    ram: "4 GB",
    autoScale: false,
  },
  {
    id: "a6",
    workspace: "Sandbox / Dev",
    role: "Analyst",
    cpu: "4 vCPU",
    ram: "8 GB",
    autoScale: true,
  },
];

const USAGE: UsageRow[] = [
  {
    date: "Jun 8",
    workspace: "Sentinel Security Workspace",
    role: "Admin",
    sessions: 14,
    cpuHours: 38.2,
    peakRam: "14.1 GB",
  },
  {
    date: "Jun 8",
    workspace: "Production Cloud",
    role: "Security Engineer",
    sessions: 9,
    cpuHours: 51.7,
    peakRam: "27.8 GB",
  },
  {
    date: "Jun 7",
    workspace: "Sentinel Security Workspace",
    role: "Security Engineer",
    sessions: 11,
    cpuHours: 22.4,
    peakRam: "7.2 GB",
  },
  {
    date: "Jun 7",
    workspace: "Sandbox / Dev",
    role: "Analyst",
    sessions: 6,
    cpuHours: 12.9,
    peakRam: "6.8 GB",
  },
  {
    date: "Jun 6",
    workspace: "Production Cloud",
    role: "Viewer",
    sessions: 3,
    cpuHours: 2.1,
    peakRam: "1.9 GB",
  },
  {
    date: "Jun 6",
    workspace: "Sentinel Security Workspace",
    role: "Analyst",
    sessions: 8,
    cpuHours: 9.4,
    peakRam: "3.6 GB",
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
};
const optBg = { background: "var(--cg-bg-card)" } as const;

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div style={{ minWidth: 180 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: S.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="" style={optBg}>
          All
        </option>
        {options.map((o) => (
          <option key={o} value={o} style={optBg}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "Admin"
      ? S.purple
      : role === "Security Engineer"
        ? S.accent
        : S.textMuted;
  const bg =
    role === "Admin"
      ? "rgba(155,135,245,0.15)"
      : role === "Security Engineer"
        ? "rgba(45,134,212,0.15)"
        : S.badgeBg;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        color,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {role}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const dref = useDialogA11y(true, onClose);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        ref={dref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "92vw",
          background: S.cardBg,
          border: `1px solid ${S.borderStrong}`,
          borderRadius: 12,
          padding: 24,
          outline: "none",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: S.textMuted,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            {subtitle}
          </p>
        )}
        <div style={{ marginTop: 18 }}>{children}</div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}

function MField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          color: S.textMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SandboxComputeSettings() {
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fRole, setFRole] = React.useState("");
  const [allocs, setAllocs] = React.useState<Alloc[]>(INITIAL_ALLOCS);
  const [editing, setEditing] = React.useState<Alloc | null>(null);
  const [draft, setDraft] = React.useState<Alloc | null>(null);

  const match = <T extends { workspace: string; role: string }>(r: T) =>
    (!fWorkspace || r.workspace === fWorkspace) && (!fRole || r.role === fRole);

  const shownAllocs = allocs.filter(match);
  const shownUsage = USAGE.filter(match);

  const openEdit = (a: Alloc) => {
    setEditing(a);
    setDraft({ ...a });
  };
  const saveEdit = () => {
    if (draft) setAllocs((p) => p.map((a) => (a.id === draft.id ? draft : a)));
    setEditing(null);
    setDraft(null);
  };

  const th = (h: string, extra?: React.CSSProperties) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: S.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        ...extra,
      }}
    >
      {h}
    </span>
  );

  return (
    <div style={{ padding: "40px 48px", maxWidth: 820 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          Sandbox Compute
        </h1>
        <ScopeBadge scope="This workspace" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        Set and upgrade the per-session agent sandbox resources, by workspace
        and role, and review usage history.
      </p>

      <div
        style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}
      >
        <FilterSelect
          label="Workspace"
          value={fWorkspace}
          onChange={setFWorkspace}
          options={WORKSPACES}
        />
        <FilterSelect
          label="User role"
          value={fRole}
          onChange={setFRole}
          options={ROLES}
        />
      </div>

      <div style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: S.textPrimary,
            paddingBottom: 12,
            borderBottom: `1px solid ${S.border}`,
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Compute Allocations
        </h2>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${S.border}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 120px 64px 70px 150px 78px 60px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {th("Workspace")}
            {th("Role")}
            {th("vCPU")}
            {th("RAM")}
            {th("Data residency")}
            {th("Auto-scale")}
            {th("", { textAlign: "right" })}
          </div>
          {shownAllocs.length === 0 && (
            <div style={{ padding: "16px", fontSize: 13, color: S.textMuted }}>
              No allocations match the current filters.
            </div>
          )}
          {shownAllocs.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 120px 64px 70px 150px 78px 60px",
                padding: "10px 16px",
                borderBottom:
                  i < shownAllocs.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.workspace}
              </span>
              <div>
                <RoleBadge role={a.role} />
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: S.textPrimary,
                  fontFamily: "monospace",
                }}
              >
                {a.cpu.replace(" vCPU", "")}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: S.textPrimary,
                  fontFamily: "monospace",
                }}
              >
                {a.ram}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textMuted,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {allocGeo(a)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: a.autoScale ? S.success : S.textMuted,
                }}
              >
                {a.autoScale ? "On" : "Off"}
              </span>
              <button
                type="button"
                onClick={() => openEdit(a)}
                style={{
                  justifySelf: "end",
                  background: "none",
                  border: "none",
                  color: S.accent,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: S.textPrimary,
            paddingBottom: 12,
            borderBottom: `1px solid ${S.border}`,
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Usage History
        </h2>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${S.border}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1.4fr 130px 80px 100px 100px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {th("Date")}
            {th("Workspace")}
            {th("Role")}
            {th("Sessions")}
            {th("CPU-hours")}
            {th("Peak RAM")}
          </div>
          {shownUsage.length === 0 && (
            <div style={{ padding: "16px", fontSize: 13, color: S.textMuted }}>
              No usage matches the current filters.
            </div>
          )}
          {shownUsage.map((u, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1.4fr 130px 80px 100px 100px",
                padding: "10px 16px",
                borderBottom:
                  i < shownUsage.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: S.textMuted }}>{u.date}</span>
              <span
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.workspace}
              </span>
              <div>
                <RoleBadge role={u.role} />
              </div>
              <span style={{ fontSize: 12, color: S.textMuted }}>
                {u.sessions}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textMuted,
                  fontFamily: "monospace",
                }}
              >
                {u.cpuHours.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textMuted,
                  fontFamily: "monospace",
                }}
              >
                {u.peakRam}
              </span>
            </div>
          ))}
        </div>
      </div>

      {editing && draft && (
        <Modal
          title="Edit sandbox compute"
          subtitle={`${draft.workspace} · ${draft.role}`}
          onClose={() => {
            setEditing(null);
            setDraft(null);
          }}
          footer={
            <button
              type="button"
              onClick={saveEdit}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 6,
                background: "var(--cg-text-primary)",
                color: "var(--cg-bg-card)",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Apply
            </button>
          }
        >
          <MField label="vCPU">
            <select
              value={draft.cpu}
              onChange={(e) => setDraft({ ...draft, cpu: e.target.value })}
              style={selectStyle}
            >
              {CPU_OPTIONS.map((o) => (
                <option key={o} value={o} style={optBg}>
                  {o}
                </option>
              ))}
            </select>
          </MField>
          <MField label="RAM">
            <select
              value={draft.ram}
              onChange={(e) => setDraft({ ...draft, ram: e.target.value })}
              style={selectStyle}
            >
              {RAM_OPTIONS.map((o) => (
                <option key={o} value={o} style={optBg}>
                  {o}
                </option>
              ))}
            </select>
          </MField>
          <MField label="Data residency (sandbox region)">
            <select
              value={allocGeo(draft)}
              onChange={(e) => setDraft({ ...draft, geo: e.target.value })}
              style={selectStyle}
            >
              {REGION_OPTIONS.map((o) => (
                <option key={o} value={o} style={optBg}>
                  {o}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: S.textMuted, marginTop: 5 }}>
              Sandboxes for {draft.workspace} run in this region. Defaults to
              the workspace's region.
            </div>
          </MField>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: S.textSecondary }}>
                Allow auto-scaling
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                Burst above the base size for heavy scans.
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({ ...draft, autoScale: !draft.autoScale })
              }
              style={{
                width: 32,
                height: 18,
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                background: draft.autoScale ? S.accent : "var(--cg-toggle-off)",
                position: "relative",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: draft.autoScale ? 14 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: S.textPrimary,
                  transition: "left 120ms ease",
                }}
              />
            </button>
          </div>
        </Modal>
      )}

      <SettingsSaveBar
        tab="sandbox-compute"
        doc={{ allocs }}
        onLoad={(d) => {
          if (Array.isArray(d.allocs)) setAllocs(d.allocs as Alloc[]);
        }}
      />
    </div>
  );
}

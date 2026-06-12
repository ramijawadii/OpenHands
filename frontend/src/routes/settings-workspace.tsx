/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ScopeBadge,
  SaveBar,
  useDirty,
  useDialogA11y,
} from "#/components/features/settings/settings-kit";
import {
  useSettingsDoc,
  useSaveSettingsDoc,
} from "#/hooks/query/use-cloudguard";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const LS_KEY = "cg_workspace";

interface WorkspaceData {
  name: string;
  workspaceId: string;
  environment: string;
  region: string;
  owner: string;
  description: string;
  cloudScope: string[];
  allowPersonalTokens: boolean;
  inferenceGeo: string;
  sandboxCpu: string;
  sandboxRam: string;
  autoScale: boolean;
}

const ENV_OPTIONS = ["Production", "Staging", "Development"];
const REGION_OPTIONS = [
  "US (us-east-1)",
  "EU (eu-west-1)",
  "UK (eu-west-2)",
  "APAC (ap-southeast-1)",
];

interface WorkspaceRow {
  name: string;
  slug: string;
  clouds: string[];
  members: number;
  role: string;
}

const ALL_CLOUDS = ["AWS", "Azure", "GCP"];
const GEO_OPTIONS = [
  "US (us-central1)",
  "EU (europe-west4)",
  "APAC (asia-southeast1)",
  "Auto (nearest)",
];
const CPU_OPTIONS = ["2 vCPU", "4 vCPU", "8 vCPU", "16 vCPU"];
const RAM_OPTIONS = ["4 GB", "8 GB", "16 GB", "32 GB"];
const ROLE_OPTIONS = ["Admin", "Security Engineer", "Analyst", "Viewer"];

const INITIAL_WORKSPACES: WorkspaceRow[] = [
  {
    name: "Sentinel Security Workspace",
    slug: "sentinel-security",
    clouds: ["AWS", "Azure"],
    members: 8,
    role: "Admin",
  },
  {
    name: "Production Cloud",
    slug: "prod-cloud",
    clouds: ["AWS"],
    members: 5,
    role: "Security Engineer",
  },
  {
    name: "Sandbox / Dev",
    slug: "sandbox-dev",
    clouds: ["GCP"],
    members: 3,
    role: "Analyst",
  },
];

function load(): WorkspaceData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaults(), ...(JSON.parse(raw) as WorkspaceData) };
  } catch {
    /* ignore */
  }
  return defaults();
}

function defaults(): WorkspaceData {
  return {
    name: "Sentinel Security Workspace",
    workspaceId: "ws_8c2f4a1e9b3d",
    environment: "Production",
    region: "EU (eu-west-1)",
    owner: "Rami Sentinel",
    description: "",
    cloudScope: ["AWS", "Azure"],
    allowPersonalTokens: true,
    inferenceGeo: "EU (europe-west4)",
    sandboxCpu: "4 vCPU",
    sandboxRam: "8 GB",
    autoScale: true,
  };
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 12,
          borderBottom: `1px solid ${S.border}`,
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div style={{ flexShrink: 0, maxWidth: 280 }}>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div style={{ flex: 1, maxWidth: 360 }}>{children}</div>
    </div>
  );
}

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

function Toggle({
  on,
  onChange,
  label,
  sublabel,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          background: on ? S.accent : "var(--cg-toggle-off)",
          position: "relative",
          transition: "background 120ms ease",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 14 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: S.textPrimary,
            transition: "left 120ms ease",
          }}
        />
      </button>
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt],
    );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 26,
              padding: "0 10px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              border: `1px solid ${active ? S.accent : S.border}`,
              background: active ? "rgba(45,134,212,0.12)" : S.badgeBg,
              color: active ? S.accent : S.textSecondary,
              transition: "all 120ms ease",
            }}
          >
            {active && "✓ "}
            {opt}
          </button>
        );
      })}
    </div>
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
          width: 480,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
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

function CloudDots({ clouds }: { clouds: string[] }) {
  const color: Record<string, string> = {
    AWS: "#FF9900",
    Azure: "#0078D4",
    GCP: "#34A853",
  };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {clouds.map((c) => (
        <span
          key={c}
          title={c}
          style={{
            height: 20,
            padding: "0 7px",
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            background: color[c] ?? S.textMuted,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export default function WorkspaceSettings() {
  const [data, setData] = React.useState<WorkspaceData>(load);
  const [workspaces, setWorkspaces] =
    React.useState<WorkspaceRow[]>(INITIAL_WORKSPACES);
  const [savedAt, setSavedAt] = React.useState(0);
  const { dirty, baseline, reset } = useDirty(data);
  const [modal, setModal] = React.useState<null | "create" | "invite">(null);
  const [inviteTarget, setInviteTarget] = React.useState<string>("");

  // create-workspace form
  const [newWs, setNewWs] = React.useState({
    name: "",
    slug: "",
    clouds: [] as string[],
    region: REGION_OPTIONS[1],
    sandboxCpu: "4 vCPU",
    sandboxRam: "8 GB",
  });
  // invite form
  const [invite, setInvite] = React.useState({
    email: "",
    role: "Analyst",
    workspace: "",
  });

  const upd = (patch: Partial<WorkspaceData>) =>
    setData((p) => ({ ...p, ...patch }));

  const docQ = useSettingsDoc("workspace");
  const saveMut = useSaveSettingsDoc("workspace");
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    const d = docQ.data;
    if (!hydrated.current && d && Object.keys(d).length) {
      hydrated.current = true;
      if (d.data) {
        setData(d.data as WorkspaceData);
        reset(d.data as WorkspaceData);
      }
      if (Array.isArray(d.workspaces))
        setWorkspaces(d.workspaces as WorkspaceRow[]);
    }
  }, [docQ.data, reset]);

  const handleSave = () => {
    saveMut.mutate({ data, workspaces } as unknown as Record<string, unknown>, {
      onSuccess: () => {
        reset(data);
        setSavedAt(Date.now());
      },
    });
  };

  const createWorkspace = () => {
    if (!newWs.name.trim()) return;
    const slug = (newWs.slug || newWs.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setWorkspaces((p) => [
      ...p,
      {
        name: newWs.name.trim(),
        slug,
        clouds: newWs.clouds,
        members: 1,
        role: "Admin",
      },
    ]);
    setNewWs({
      name: "",
      slug: "",
      clouds: [],
      region: REGION_OPTIONS[1],
      sandboxCpu: "4 vCPU",
      sandboxRam: "8 GB",
    });
    setModal(null);
  };

  const sendInvite = () => {
    if (!invite.email.trim()) return;
    setWorkspaces((p) =>
      p.map((w) =>
        w.slug === invite.workspace ? { ...w, members: w.members + 1 } : w,
      ),
    );
    setInvite({ email: "", role: "Analyst", workspace: "" });
    setModal(null);
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 760 }}>
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
          Workspace
        </h1>
        <ScopeBadge scope="This workspace" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 32,
          marginTop: 0,
        }}
      >
        Manage your workspaces, members, and default scan + sandbox settings.
      </p>

      <Section
        title="Workspaces"
        action={
          <button
            type="button"
            onClick={() => setModal("create")}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              background: "var(--cg-text-primary)",
              color: "var(--cg-bg-card)",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            + Create workspace
          </button>
        }
      >
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
              gridTemplateColumns: "1.4fr 1fr 90px 110px 90px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["Workspace", "Clouds", "Members", "Your role", ""].map((h, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {workspaces.map((w, i) => (
            <div
              key={w.slug}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 90px 110px 90px",
                padding: "10px 16px",
                borderBottom:
                  i < workspaces.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: S.textSecondary,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {w.name}
                </div>
                <div style={{ fontSize: 11, color: S.textMuted }}>
                  cloudguard.io/{w.slug}
                </div>
              </div>
              <CloudDots clouds={w.clouds} />
              <span style={{ fontSize: 13, color: S.textMuted }}>
                {w.members}
              </span>
              <span style={{ fontSize: 13, color: S.textSecondary }}>
                {w.role}
              </span>
              <button
                type="button"
                onClick={() => {
                  setInvite((p) => ({ ...p, workspace: w.slug }));
                  setInviteTarget(w.name);
                  setModal("invite");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: S.accent,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                  justifySelf: "end",
                }}
              >
                Invite
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Workspace Identity">
        <Row label="Workspace name">
          <input
            type="text"
            value={data.name}
            onChange={(e) => upd({ name: e.target.value })}
            style={inputStyle}
          />
        </Row>
        <Row
          label="Workspace ID"
          sublabel="Immutable identifier used in API paths and audit logs."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                color: S.textMuted,
                fontFamily: "monospace",
              }}
            >
              {data.workspaceId}
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(data.workspaceId)}
              style={{
                height: 24,
                padding: "0 8px",
                borderRadius: 5,
                background: "transparent",
                border: `1px solid ${S.borderStrong}`,
                color: S.textSecondary,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Copy
            </button>
          </div>
        </Row>
        <Row
          label="Environment"
          sublabel="Drives the change-control policy (set under Environments & Tags)."
        >
          <select
            value={data.environment}
            onChange={(e) => upd({ environment: e.target.value })}
            style={selectStyle}
          >
            {ENV_OPTIONS.map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label="Data residency region"
          sublabel="Where this workspace's data is stored. Set at creation, cannot change."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, color: S.textSecondary }}>
              {data.region}
            </span>
            <span
              style={{
                height: 18,
                padding: "0 7px",
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 600,
                color: S.textMuted,
                background: S.badgeBg,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Locked
            </span>
          </div>
        </Row>
        <Row
          label="Owner"
          sublabel="Primary point of contact for this workspace."
        >
          <input
            type="text"
            value={data.owner}
            onChange={(e) => upd({ owner: e.target.value })}
            style={inputStyle}
          />
        </Row>
        <Row label="Description">
          <textarea
            value={data.description}
            onChange={(e) => upd({ description: e.target.value })}
            placeholder="Describe the scope of this workspace…"
            style={{
              ...inputStyle,
              height: 80,
              padding: "8px 10px",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </Row>
      </Section>

      <Section title="Default Scan & Sandbox Settings">
        <Row
          label="Default cloud scope"
          sublabel="Clouds new scans target by default."
        >
          <ChipGroup
            options={ALL_CLOUDS}
            value={data.cloudScope}
            onChange={(v) => upd({ cloudScope: v })}
          />
        </Row>
        <Toggle
          on={data.allowPersonalTokens}
          onChange={(v) => upd({ allowPersonalTokens: v })}
          label="Members can create personal API tokens"
          sublabel="Allow members to mint personal tokens for CLI/local scripts."
        />
        <Row
          label="Inference geo preference"
          sublabel="Region where model inference runs (data residency)."
        >
          <select
            value={data.inferenceGeo}
            onChange={(e) => upd({ inferenceGeo: e.target.value })}
            style={selectStyle}
          >
            {GEO_OPTIONS.map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label="Default sandbox CPU"
          sublabel="Per-session agent sandbox vCPU."
        >
          <select
            value={data.sandboxCpu}
            onChange={(e) => upd({ sandboxCpu: e.target.value })}
            style={selectStyle}
          >
            {CPU_OPTIONS.map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Default sandbox RAM">
          <select
            value={data.sandboxRam}
            onChange={(e) => upd({ sandboxRam: e.target.value })}
            style={selectStyle}
          >
            {RAM_OPTIONS.map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
        <Toggle
          on={data.autoScale}
          onChange={(v) => upd({ autoScale: v })}
          label="Allow auto-scaling when required"
          sublabel="Temporarily raise sandbox CPU/RAM for heavy scans, then scale back."
        />
      </Section>

      <SaveBar
        dirty={dirty}
        savedAt={savedAt}
        onSave={handleSave}
        onDiscard={() => setData(baseline)}
      />

      {modal === "create" && (
        <Modal
          title="Create workspace"
          subtitle="A workspace groups connectors, scans and members."
          onClose={() => setModal(null)}
          footer={
            <button
              type="button"
              onClick={createWorkspace}
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
              Create
            </button>
          }
        >
          <MField label="Workspace name">
            <input
              value={newWs.name}
              onChange={(e) =>
                setNewWs((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. EU Production"
              style={inputStyle}
            />
          </MField>
          <MField label="Slug (optional)">
            <input
              value={newWs.slug}
              onChange={(e) =>
                setNewWs((p) => ({ ...p, slug: e.target.value }))
              }
              placeholder="auto-generated from name"
              style={inputStyle}
            />
          </MField>
          <MField label="Cloud scope">
            <ChipGroup
              options={ALL_CLOUDS}
              value={newWs.clouds}
              onChange={(v) => setNewWs((p) => ({ ...p, clouds: v }))}
            />
          </MField>
          <MField label="Data residency region">
            <select
              value={newWs.region}
              onChange={(e) =>
                setNewWs((p) => ({ ...p, region: e.target.value }))
              }
              style={selectStyle}
            >
              {REGION_OPTIONS.map((o) => (
                <option key={o} value={o} style={optBg}>
                  {o}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: S.textMuted, marginTop: 5 }}>
              Where this workspace's data is stored — cannot be changed later.
            </div>
          </MField>
          <MField label="Sandbox capacity">
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={newWs.sandboxCpu}
                onChange={(e) =>
                  setNewWs((p) => ({ ...p, sandboxCpu: e.target.value }))
                }
                style={{ ...selectStyle, flex: 1 }}
              >
                {CPU_OPTIONS.map((o) => (
                  <option key={o} value={o} style={optBg}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                value={newWs.sandboxRam}
                onChange={(e) =>
                  setNewWs((p) => ({ ...p, sandboxRam: e.target.value }))
                }
                style={{ ...selectStyle, flex: 1 }}
              >
                {RAM_OPTIONS.map((o) => (
                  <option key={o} value={o} style={optBg}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 11, color: S.textMuted, marginTop: 5 }}>
              Default per-session sandbox size for this workspace.
            </div>
          </MField>
        </Modal>
      )}

      {modal === "invite" && (
        <Modal
          title={`Invite to ${inviteTarget || "workspace"}`}
          subtitle="They'll receive an email to join this workspace."
          onClose={() => setModal(null)}
          footer={
            <button
              type="button"
              onClick={sendInvite}
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
              Send invite
            </button>
          }
        >
          <MField label="Email address">
            <input
              type="email"
              value={invite.email}
              onChange={(e) =>
                setInvite((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="name@company.com"
              style={inputStyle}
            />
          </MField>
          <MField label="Workspace">
            <select
              value={invite.workspace}
              onChange={(e) =>
                setInvite((p) => ({ ...p, workspace: e.target.value }))
              }
              style={selectStyle}
            >
              {workspaces.map((w) => (
                <option key={w.slug} value={w.slug} style={optBg}>
                  {w.name}
                </option>
              ))}
            </select>
          </MField>
          <MField label="Role">
            <select
              value={invite.role}
              onChange={(e) =>
                setInvite((p) => ({ ...p, role: e.target.value }))
              }
              style={selectStyle}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} style={optBg}>
                  {r}
                </option>
              ))}
            </select>
          </MField>
        </Modal>
      )}
    </div>
  );
}

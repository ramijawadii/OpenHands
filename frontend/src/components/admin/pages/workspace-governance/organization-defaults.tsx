/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → Organization Defaults */
import React from "react";
import { useNavigate } from "react-router";
import {
  Pencil,
  Upload,
  Download,
  RefreshCcw,
  Eye,
  ClipboardCheck,
  Send,
  Undo2,
  History,
  GitCompare,
  Building2,
  ShieldCheck,
  BadgeCheck,
  Cog,
  Boxes,
  Users,
  Brain,
  Cable,
  CircleDollarSign,
  Bell,
  Network,
  Lock,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Card,
  StatRow,
  DirectoryTable,
  CommandBar,
  HeaderButton,
  SubTabStrip,
  EmptyState,
  SampleTag,
  ScopeBadge,
  PostureCard,
  PostureGrid,
  InheritedField,
  FloorBadge,
  T,
  type EffectiveValue,
  type PolicyValue,
  type StripIcon,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Organization Defaults — the enterprise-wide baseline configuration automatically inherited by every
 * Business Unit, Workspace Template and Workspace unless explicitly overridden. The HIGHEST level of the
 * workspace-governance inheritance hierarchy (the §3 / §39.5 inheritance model realised through the
 * admin-kit InheritedField / FloorBadge / EffectiveValue primitives). Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/organization_defaults.md.
 *
 * Config surface (not a datatable): Operational Dashboard · toolbar · a SubTabStrip over the ten default
 * domains + Inheritance Preview + Override Rules + Version History. Values are the §3 EffectiveValue
 * shape; there is no inheritance backend yet, so they are representative (tagged `Sample`) — swap the
 * ev() sample builder for admin/inheritance.py resolution when it lands.
 */

// ── EffectiveValue sample builder (mirrors admin/inheritance.py F2 resolution) ──────────────────────
function ev(
  key: string,
  effective: PolicyValue,
  opts: Partial<EffectiveValue> = {},
): EffectiveValue {
  return {
    key,
    effective,
    direct: { level: "enterprise", value: effective },
    overridePermitted: true,
    ...opts,
  };
}
const locked = (key: string, effective: PolicyValue): EffectiveValue =>
  ev(key, effective, {
    overridePermitted: false,
    mandatoryFloor: effective,
    enforcement: "enforced",
  });

// A read-only value pill used as the InheritedField control (the settings backend is not wired).
function ValuePill({ v }: { v: PolicyValue }) {
  const label = typeof v === "boolean" ? (v ? "On" : "Off") : String(v);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 26,
        padding: "0 12px",
        borderRadius: 6,
        fontSize: 12.5,
        color: T.textPrimary,
        background: "var(--cg-bg-badge)",
        border: `1px solid ${T.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

interface Setting {
  label: string;
  hint?: string;
  ev: EffectiveValue;
}
function SettingsCard({
  title,
  desc,
  settings,
}: {
  title: string;
  desc: string;
  settings: Setting[];
}) {
  return (
    <Card title={title} desc={desc}>
      {settings.map((s) => (
        <InheritedField key={s.label} label={s.label} hint={s.hint} ev={s.ev}>
          <ValuePill v={s.ev.effective} />
        </InheritedField>
      ))}
    </Card>
  );
}

// ── Default domains (spec §Platform…Notification Defaults) ──────────────────────────────────────────
const DOMAINS: {
  id: string;
  label: string;
  Icon: StripIcon;
  title: string;
  desc: string;
  settings: Setting[];
}[] = [
  {
    id: "platform",
    label: "Platform",
    Icon: Building2,
    title: "Platform Defaults",
    desc: "Enterprise platform standards inherited by every workspace.",
    settings: [
      {
        label: "Workspace Naming Convention",
        hint: "Enforced name pattern for new workspaces.",
        ev: locked("naming", "bu-env-name"),
      },
      { label: "Default Language", ev: ev("lang", "English (US)") },
      { label: "Time Zone", ev: ev("tz", "UTC") },
      { label: "Date Format", ev: ev("date", "ISO 8601") },
      {
        label: "Workspace Metadata",
        hint: "Baseline metadata policy applied at creation.",
        ev: ev("meta", "Enterprise Workspace Metadata"),
      },
      {
        label: "Lifecycle Policy",
        ev: ev("lifecycle", "Standard 90-day review"),
      },
      {
        label: "Workspace Template",
        ev: ev("template", "Enterprise Production Baseline"),
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    Icon: ShieldCheck,
    title: "Security Defaults",
    desc: "Enterprise security baseline. Mandatory controls are locked floors — a workspace may set a stricter value, not a weaker one.",
    settings: [
      { label: "Authentication", ev: locked("auth", "SSO (Entra ID)") },
      {
        label: "MFA",
        hint: "Multi-factor authentication requirement.",
        ev: locked("mfa", true),
      },
      { label: "Password Policy", ev: ev("pw", "Enterprise strong") },
      { label: "Session Timeout", ev: ev("session", "8 hours") },
      { label: "Conditional Access", ev: ev("ca", true) },
      { label: "Encryption", ev: locked("enc", "AES-256 + KMS") },
      { label: "Secrets Management", ev: ev("secrets", "Vault-backed") },
      { label: "DLP", ev: ev("dlp", true) },
      { label: "Audit Logging", ev: locked("audit", true) },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    Icon: BadgeCheck,
    title: "Compliance Defaults",
    desc: "Enterprise compliance baseline inherited by every workspace.",
    settings: [
      {
        label: "Default Compliance Profile",
        ev: ev("profile", "Enterprise Baseline"),
      },
      {
        label: "Mandatory Frameworks",
        ev: locked("frameworks", "ISO 27001, SOC 2"),
      },
      { label: "Evidence Collection", ev: ev("evidence", true) },
      { label: "Continuous Monitoring", ev: ev("monitoring", true) },
      { label: "Control Library", ev: ev("library", "CIS + NIST CSF") },
      { label: "Risk Thresholds", ev: ev("risk", "Medium") },
      { label: "Audit Frequency", ev: ev("frequency", "Quarterly") },
    ],
  },
  {
    id: "operational",
    label: "Operational",
    Icon: Cog,
    title: "Operational Defaults",
    desc: "Enterprise operational standards.",
    settings: [
      { label: "Maintenance Window", ev: ev("maint", "Sun 02:00–04:00 UTC") },
      { label: "Monitoring", ev: ev("mon", true) },
      { label: "Alerting", ev: ev("alert", true) },
      { label: "Automation", ev: ev("auto", "Approval required") },
      { label: "Health Checks", ev: ev("health", true) },
      { label: "Backups", ev: locked("backup", "Daily") },
      { label: "Retention", ev: ev("retention", "35 days") },
      { label: "Operational Hours", ev: ev("hours", "24×7") },
      { label: "Incident Escalation", ev: ev("escalation", "2-stage") },
    ],
  },
  {
    id: "resource",
    label: "Resource",
    Icon: Boxes,
    title: "Resource Defaults",
    desc: "Default infrastructure configuration provisioned for new workspaces.",
    settings: [
      { label: "Preferred Cloud Provider", ev: ev("cloud", "AWS") },
      { label: "Default Region", ev: ev("region", "us-east-1") },
      { label: "Resource Quotas", ev: ev("quota", "Standard profile") },
      { label: "Storage Defaults", ev: ev("storage", "Encrypted, versioned") },
      { label: "Networking", ev: ev("net", "Private + egress-controlled") },
      { label: "Kubernetes Defaults", ev: ev("k8s", "Hardened profile") },
      { label: "Container Registry", ev: ev("registry", "Enterprise ECR") },
      { label: "Resource Tags", ev: locked("tags", "cost-center, owner, env") },
      { label: "Cost Center", ev: ev("cc", "Inherited from BU") },
    ],
  },
  {
    id: "identity",
    label: "Identity",
    Icon: Users,
    title: "Identity Defaults",
    desc: "Identity and access baseline.",
    settings: [
      { label: "Identity Provider", ev: locked("idp", "Microsoft Entra ID") },
      { label: "SSO", ev: locked("sso", true) },
      { label: "SCIM", ev: ev("scim", true) },
      { label: "Default Roles", ev: ev("roles", "Least privilege") },
      { label: "Workspace Administrators", ev: ev("admins", "BU-delegated") },
      { label: "Approval Chains", ev: ev("chains", "2-stage governance") },
      { label: "RBAC Model", ev: ev("rbac", "Scoped assignments") },
    ],
  },
  {
    id: "ai",
    label: "AI",
    Icon: Brain,
    title: "AI Defaults",
    desc: "Enterprise AI baseline for agent runtime.",
    settings: [
      { label: "Default AI Provider", ev: ev("provider", "Anthropic") },
      { label: "Default Model", ev: ev("model", "Claude (latest)") },
      { label: "Fallback Model", ev: ev("fallback", "Claude Haiku") },
      { label: "Memory Policy", ev: ev("memory", "Session-scoped") },
      { label: "Prompt Guardrails", ev: locked("guardrails", true) },
      { label: "Knowledge Sources", ev: ev("knowledge", "Approved KB only") },
      { label: "Execution Mode", ev: ev("mode", "Ask") },
      { label: "Human Approval", ev: ev("approval", "Consequential actions") },
      {
        label: "Safety Policies",
        ev: locked("safety", "Enterprise safety set"),
      },
    ],
  },
  {
    id: "integration",
    label: "Integration",
    Icon: Cable,
    title: "Integration Defaults",
    desc: "Enterprise integrations automatically inherited (see the Integrations table below).",
    settings: [],
  },
  {
    id: "cost",
    label: "Cost",
    Icon: CircleDollarSign,
    title: "Cost Defaults",
    desc: "Enterprise financial baseline.",
    settings: [
      { label: "Default Budget", ev: ev("budget", "$10k / month") },
      { label: "Quota Profile", ev: ev("quota", "Standard") },
      { label: "Chargeback", ev: ev("chargeback", true) },
      { label: "Cost Allocation", ev: locked("alloc", "By cost center") },
      { label: "Cost Alerts", ev: ev("alerts", "80% / 100%") },
      { label: "Usage Thresholds", ev: ev("thresholds", "Standard") },
    ],
  },
  {
    id: "notification",
    label: "Notification",
    Icon: Bell,
    title: "Notification Defaults",
    desc: "Default notification routing for enterprise events.",
    settings: [
      { label: "Workspace Events", ev: ev("ws", true) },
      { label: "Security Alerts", ev: locked("sec", true) },
      { label: "Compliance Alerts", ev: ev("comp", true) },
      { label: "Provisioning", ev: ev("prov", true) },
      { label: "Maintenance", ev: ev("maint", true) },
      { label: "Approvals", ev: ev("appr", true) },
      { label: "Operational Incidents", ev: locked("inc", true) },
    ],
  },
];

const INTEGRATIONS = [
  "Microsoft Entra ID",
  "Okta",
  "Slack",
  "Microsoft Teams",
  "Jira",
  "GitHub",
  "SIEM",
  "ITSM",
  "Cloud Providers",
  "MCP Servers",
  "Email",
  "Webhooks",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}

const SUB_TABS: { id: string; label: string; Icon: StripIcon }[] = [
  ...DOMAINS.map((d) => ({ id: d.id, label: d.label, Icon: d.Icon })),
  { id: "inheritance-preview", label: "Inheritance Preview", Icon: Network },
  { id: "override-rules", label: "Override Rules", Icon: Lock },
  { id: "version-history", label: "Version History", Icon: History },
];

export function OrganizationDefaultsView() {
  const navigate = useNavigate();
  const [sub, setSub] = React.useState(DOMAINS[0].id);

  const lockedCount = DOMAINS.reduce(
    (a, d) => a + d.settings.filter((s) => !s.ev.overridePermitted).length,
    0,
  );
  const totalSettings = DOMAINS.reduce((a, d) => a + d.settings.length, 0);

  const toolbar: CommandItem[] = [
    {
      key: "edit",
      label: "Edit Defaults",
      icon: <Pencil size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSub(DOMAINS[0].id),
    },
    {
      key: "preview",
      label: "Preview Inheritance",
      icon: <Eye size={15} />,
      onClick: () => setSub("inheritance-preview"),
    },
    {
      key: "validate",
      label: "Validate Defaults",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "publish",
      label: "Publish Changes",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "restore",
      label: "Restore Previous Version",
      icon: <Undo2 size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <GitCompare size={15} />,
      onClick: () => setSub("version-history"),
    },
    {
      key: "history",
      label: "View History",
      icon: <History size={15} />,
      onClick: () => setSub("version-history"),
    },
  ];

  const curDomain = DOMAINS.find((d) => d.id === sub);

  return (
    <>
      {/* Operational Dashboard (spec §Operational Dashboard) */}
      <PostureGrid>
        <PostureCard
          title="Organization Defaults"
          value={totalSettings}
          sub={
            <>
              Baseline settings <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Inherited Workspaces"
          value={312}
          tone="ok"
          sub={
            <>
              Deriving from this baseline <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Overrides"
          value={18}
          tone="warn"
          sub={
            <>
              Across the estate <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Locked Settings"
          value={lockedCount}
          sub={
            <>
              Mandatory floors <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Configuration Drift"
          value={4}
          tone="warn"
          sub={
            <>
              Workspaces off-baseline <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Pending Publications"
          value={1}
          sub={
            <>
              Awaiting approval <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Compliance"
          value="94%"
          tone="ok"
          sub={
            <>
              Against baseline <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <Card
        title="Enterprise baseline"
        desc="Organization Defaults are the root of the workspace governance inheritance model — a single enterprise baseline from which every business unit, template and workspace derives its effective configuration. Mandatory controls carry a lock; a workspace may set a stricter value, not a weaker one."
      >
        <CommandBar items={toolbar} />
        <SubTabStrip tabs={SUB_TABS} active={sub} onChange={setSub} />

        {curDomain && curDomain.id !== "integration" && (
          <SettingsCard
            title={curDomain.title}
            desc={curDomain.desc}
            settings={curDomain.settings}
          />
        )}

        {sub === "integration" && <IntegrationDefaults />}
        {sub === "inheritance-preview" && <InheritancePreview />}
        {sub === "override-rules" && <OverrideRules />}
        {sub === "version-history" && <VersionHistory />}
      </Card>
    </>
  );
}

export function OrganizationDefaultsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Organization Defaults"
        subtitle="Configure the enterprise-wide baseline inherited by all workspaces, ensuring consistent governance, security, compliance and operational standards."
        actions={
          <>
            {/* `ScopeBadge` models three scopes — You / This workspace /
                Organization. "Enterprise" is not one of them, and widening a
                shared primitive for a single call site is the larger change;
                this page IS the organization-wide baseline, so the existing
                scope is the accurate one. */}
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Pencil size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=inheritance")
              }
            >
              Edit Defaults
            </HeaderButton>
          </>
        }
      />
      <OrganizationDefaultsView />
    </Page>
  );
}

// ── Integration Defaults (spec §Integration Defaults — table) ──
function IntegrationDefaults() {
  const list = INTEGRATIONS.map((integration) => {
    const n = hashId(integration);
    return {
      id: integration,
      integration,
      enabled: n % 4 === 0 ? "No" : "Yes",
      inherited: "Yes",
      required: n % 3 === 0 ? "Required" : "Optional",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "integration", header: "Integration", render: (r) => r.integration },
    { key: "enabled", header: "Enabled", render: (r) => r.enabled },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    {
      key: "required",
      header: "Required",
      render: (r) => (r.required === "Required" ? <FloorBadge /> : r.required),
    },
  ];
  return (
    <Card
      title="Integration Defaults"
      desc="Enterprise integrations automatically inherited by every workspace."
    >
      <DirectoryTable columns={cols} rows={list} />
    </Card>
  );
}

// ── Inheritance Preview (spec §Inheritance Preview) ──
function InheritancePreview() {
  return (
    <Card
      title="Inheritance Preview"
      desc="Visualizes how the enterprise baseline flows down the governance chain to a workspace's effective configuration."
      right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <HeaderButton icon={<Eye size={13} />}>
            Preview Workspace
          </HeaderButton>
          <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      <FlowChain
        steps={[
          "Organization Defaults",
          "Business Unit",
          "Workspace Template",
          "Workspace",
          "Effective Configuration",
        ]}
      />
      <div style={{ marginTop: 12 }}>
        <StatRow
          label="Inherited Settings"
          value="52 from the enterprise baseline"
          tone="ok"
          sample
        />
        <StatRow
          label="Locked Settings"
          value="14 mandatory floors"
          tone="warn"
          sample
        />
        <StatRow label="Overridden Settings" value="6 at lower scopes" sample />
        <StatRow
          label="Effective Values"
          value="Resolved for the selected workspace"
          sample
        />
      </div>
    </Card>
  );
}

// ── Override Rules (spec §Override Rules — table) ──
function OverrideRules() {
  const MODES = [
    "Not Allowed",
    "Allowed",
    "Approval Required",
    "Organization Locked",
  ];
  const rows = DOMAINS.flatMap((d) =>
    d.settings.map((s) => {
      const mode = s.ev.overridePermitted
        ? MODES[1 + (hashId(s.label) % 2)]
        : "Organization Locked";
      return {
        id: `${d.id}-${s.label}`,
        configuration: `${d.label} · ${s.label}`,
        overrideAllowed: s.ev.overridePermitted ? "Yes" : "No",
        approvalRequired: mode === "Approval Required" ? "Yes" : "No",
        locked: s.ev.overridePermitted ? "No" : "Yes",
        effectiveScope: s.ev.overridePermitted
          ? "Business Unit + Workspace"
          : "Enterprise",
        mode,
      };
    }),
  );
  const cols: Column<(typeof rows)[number]>[] = [
    {
      key: "configuration",
      header: "Configuration",
      sortValue: (r) => r.configuration,
      render: (r) => r.configuration,
    },
    {
      key: "overrideAllowed",
      header: "Override Allowed",
      render: (r) => r.overrideAllowed,
    },
    {
      key: "approvalRequired",
      header: "Approval Required",
      render: (r) => r.approvalRequired,
    },
    {
      key: "locked",
      header: "Locked",
      render: (r) => (r.locked === "Yes" ? <FloorBadge /> : "No"),
    },
    {
      key: "effectiveScope",
      header: "Effective Scope",
      render: (r) => r.effectiveScope,
    },
  ];
  return (
    <Card
      title="Override Rules"
      desc="Defines which defaults may be overridden — Not Allowed · Allowed · Approval Required · Organization Locked."
    >
      <DirectoryTable
        columns={cols}
        rows={rows}
        pageSize={14}
        initialSort={{ key: "configuration", dir: "asc" }}
      />
    </Card>
  );
}

// ── Version History (spec §Version History) ──
function VersionHistory() {
  const versions = [
    {
      id: "v8",
      version: "v8",
      state: "Published",
      author: "Platform Admin",
      date: "2026-07-09",
      summary: "Locked encryption + audit logging floors",
    },
    {
      id: "v7",
      version: "v7",
      state: "Archived",
      author: "Governance Admin",
      date: "2026-05-21",
      summary: "Added AI safety default set",
    },
    {
      id: "v6",
      version: "v6",
      state: "Archived",
      author: "Platform Admin",
      date: "2026-03-02",
      summary: "Tightened default region + tags",
    },
    {
      id: "v5",
      version: "v5",
      state: "Archived",
      author: "Aisha Khan",
      date: "2025-12-14",
      summary: "Initial enterprise baseline",
    },
  ];
  const cols: Column<(typeof versions)[number]>[] = [
    { key: "version", header: "Version", render: (r) => r.version },
    { key: "state", header: "State", render: (r) => r.state },
    { key: "author", header: "Modified By", render: (r) => r.author },
    { key: "date", header: "Date", render: (r) => r.date },
    { key: "summary", header: "Change Summary", render: (r) => r.summary },
  ];
  return (
    <Card
      title="Version History"
      desc="Draft · Published · Archived · Rollback. Compare or restore a prior enterprise baseline."
      right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
          <HeaderButton icon={<Undo2 size={13} />}>Restore</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {versions.length === 0 ? (
        <EmptyState
          icon={<History size={20} />}
          title="No versions yet."
          hint="Publish the enterprise baseline to create the first version."
        />
      ) : (
        <DirectoryTable columns={cols} rows={versions} />
      )}
    </Card>
  );
}

// ── shared flow-chain visual ──
function FlowChain({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12.5,
              color: T.textNav,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background:
                i === steps.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
            }}
          >
            <span
              style={{
                color: T.textMuted,
                fontFamily: "monospace",
                fontSize: 11,
              }}
            >
              {(i + 1).toString().padStart(2, "0")}
            </span>
            {s}
          </div>
          {i < steps.length - 1 && (
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 12 }}
            >
              ↓
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

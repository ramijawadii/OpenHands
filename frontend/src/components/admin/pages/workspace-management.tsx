/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, no-bitwise -- CloudGuard Workspace Management (§8) */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  LayoutGrid,
  Eye,
  Copy,
  Pencil,
  Trash2,
  Lock,
} from "lucide-react";
import {
  useWorkspaces,
  addLocalWorkspace,
} from "#/components/admin/workspace-context";
import {
  Page,
  PageHeader,
  Tabs,
  Card,
  StatRow,
  DirectoryTable,
  FilterBar,
  HeaderButton,
  ScopeBadge,
  SampleTag,
  FloorBadge,
  EmptyState,
  ConfirmButton,
  Select,
  KVGrid,
  T,
  type Column,
  useTabParam,
} from "#/components/admin/admin-kit";

/**
 * Workspace Management (§8) — directory + create wizard + inspectable/creatable templates +
 * lifecycle + deletion. Templates expose their full configured bundle (§8.3) and can be created /
 * cloned / edited. The wizard makes provenance explicit on every predefined value — who defined it
 * (Enterprise floor / Template / Workspace default) and whether it is editable or a mandatory floor.
 */

// ── Enterprise catalogues a template/workspace selects from (representative until §13/§14 backend) ──
const ENTERPRISE_MODELS = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "gpt-5",
  "gemini-2.5-pro",
];
const ENTERPRISE_TOOLS = [
  "aws-cli",
  "prowler",
  "kubescape",
  "trivy",
  "remediation-engine",
  "iam-graph",
];
const FRAMEWORKS = [
  "SOC 2",
  "ISO 27001",
  "NIST CSF",
  "PCI DSS",
  "HIPAA",
  "DORA",
  "GDPR",
];
const WS_ROLES = [
  "Workspace Owner",
  "Workspace Admin",
  "Security Engineer",
  "Cloud Engineer",
  "Approver",
  "Auditor",
  "Viewer",
];

// Enterprise mandatory floors (who: Enterprise Security Admin). A workspace/template may strengthen,
// never weaken these — the wizard enforces it.
const FLOORS = {
  minApprovers: 2, // §9.3
  minRetentionDays: 365, // §10.4 / §30.6
  prohibitedModels: ["gpt-5"], // §13.3 — cannot be enabled
  deleteGate: "ask", // §9.2 — cannot be looser than "ask"
};

interface TemplateBundle {
  autonomy: string;
  deleteGate: string;
  sandboxProfile: string;
  retentionDays: number;
  network: string;
  minApprovers: number;
  approvedModels: string[];
  approvedTools: string[];
  frameworks: string[];
  roles: string[];
}
interface WorkspaceTemplate {
  id: string;
  name: string;
  desc: string;
  source: "CloudGuard" | "Custom";
  definedBy: string;
  bundle: TemplateBundle;
}

const PREDEFINED: WorkspaceTemplate[] = [
  {
    id: "prod",
    name: "Production cloud",
    desc: "Strict guardrails, approval-gated remediation, 365-day retention.",
    source: "CloudGuard",
    definedBy: "CloudGuard platform",
    bundle: {
      autonomy: "ask",
      deleteGate: "ask",
      sandboxProfile: "Standard",
      retentionDays: 365,
      network: "allowlist",
      minApprovers: 2,
      approvedModels: ["claude-opus-4-8", "claude-sonnet-4-6"],
      approvedTools: ["aws-cli", "prowler", "iam-graph", "remediation-engine"],
      frameworks: ["SOC 2", "ISO 27001", "NIST CSF"],
      roles: [
        "Workspace Owner",
        "Workspace Admin",
        "Security Engineer",
        "Approver",
        "Viewer",
      ],
    },
  },
  {
    id: "fin",
    name: "Regulated financial",
    desc: "Most-restrictive floors, DORA + PCI frameworks, EU residency.",
    source: "CloudGuard",
    definedBy: "CloudGuard platform",
    bundle: {
      autonomy: "plan",
      deleteGate: "plan",
      sandboxProfile: "Isolated",
      retentionDays: 2555,
      network: "deny-all",
      minApprovers: 3,
      approvedModels: ["claude-opus-4-8"],
      approvedTools: ["aws-cli", "prowler", "iam-graph"],
      frameworks: ["DORA", "PCI DSS", "ISO 27001", "SOC 2"],
      roles: [
        "Workspace Owner",
        "Workspace Admin",
        "Security Engineer",
        "Approver",
        "Auditor",
      ],
    },
  },
  {
    id: "dev",
    name: "Development",
    desc: "Relaxed gates, short retention, lower sandbox limits.",
    source: "CloudGuard",
    definedBy: "CloudGuard platform",
    bundle: {
      autonomy: "autonomous",
      deleteGate: "ask",
      sandboxProfile: "Standard",
      retentionDays: 365,
      network: "allowlist",
      minApprovers: 2,
      approvedModels: ["claude-sonnet-4-6", "claude-haiku-4-5"],
      approvedTools: ["aws-cli", "prowler", "kubescape", "trivy"],
      frameworks: ["SOC 2"],
      roles: ["Workspace Owner", "Cloud Engineer", "Viewer"],
    },
  },
  {
    id: "assess",
    name: "Read-only assessment",
    desc: "Discovery only, no execution, evidence retention.",
    source: "CloudGuard",
    definedBy: "CloudGuard platform",
    bundle: {
      autonomy: "plan",
      deleteGate: "plan",
      sandboxProfile: "Isolated",
      retentionDays: 365,
      network: "allowlist",
      minApprovers: 2,
      approvedModels: ["claude-sonnet-4-6"],
      approvedTools: ["prowler", "kubescape", "iam-graph"],
      frameworks: ["SOC 2", "ISO 27001"],
      roles: ["Workspace Owner", "Auditor", "Viewer"],
    },
  },
  {
    id: "airgap",
    name: "Air-gapped",
    desc: "No egress, on-premise relay, sealed evidence.",
    source: "CloudGuard",
    definedBy: "CloudGuard platform",
    bundle: {
      autonomy: "ask",
      deleteGate: "plan",
      sandboxProfile: "Isolated",
      retentionDays: 2555,
      network: "deny-all",
      minApprovers: 3,
      approvedModels: ["claude-opus-4-8"],
      approvedTools: ["prowler", "iam-graph"],
      frameworks: ["ISO 27001", "NIST CSF"],
      roles: ["Workspace Owner", "Security Engineer", "Auditor"],
    },
  },
];

const TPL_KEY = "cg_admin_templates";
function readCustom(): WorkspaceTemplate[] {
  try {
    const raw = localStorage.getItem(TPL_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceTemplate[]) : [];
  } catch {
    return [];
  }
}
function writeCustom(list: WorkspaceTemplate[]) {
  try {
    localStorage.setItem(TPL_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

// ── Workspace record: enriched view + per-workspace status & metadata stores ──
// Until admin/org_model.py ships, status (lifecycle) and editable metadata (owners, assignment)
// persist locally; immutable identity comes from the workspace registry. Consumption / health are
// representative (tagged `Sample` in the UI).
const STATUS_KEY = "cg_ws_status";
const META_KEY = "cg_ws_meta";

interface WsMeta {
  businessUnit?: string;
  legalEntity?: string;
  region?: string;
  classification?: string;
  costCentre?: string;
  supportTier?: string;
  businessOwner?: string;
  securityOwner?: string;
  technicalOwner?: string;
}
interface WsRecord extends Required<WsMeta> {
  id: string;
  name: string;
  status: string;
  criticality: string;
  residency: string;
  protectedResources: number;
  workflowUnits: number;
  sandboxHours: number;
  activeWorkflows: number;
  connectors: number;
  lastActivity: string;
  health: "ok" | "degraded";
}

function readMap(key: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
function writeMap(key: string, m: Record<string, unknown>) {
  try {
    localStorage.setItem(key, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

const BUS = ["Payments", "Platform", "Security", "Data"];
const CRIT = ["Low", "Medium", "High", "Critical"];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}

function enrich(
  w: { id: string; name: string; classification?: string; region?: string },
  status: Record<string, unknown>,
  meta: Record<string, unknown>,
): WsRecord {
  const n = hashId(w.id);
  const m = (meta[w.id] ?? {}) as WsMeta;
  const cls =
    m.classification ??
    (w.classification && w.classification !== "Current"
      ? w.classification
      : "Production");
  return {
    id: w.id,
    name: w.name,
    status: String(status[w.id] ?? "active"),
    classification: cls,
    region: m.region ?? w.region ?? "eu-west-1",
    businessUnit: m.businessUnit ?? BUS[n % BUS.length],
    legalEntity: m.legalEntity ?? "Acme Financial Ltd",
    costCentre: m.costCentre ?? `CC-${1000 + (n % 900)}`,
    supportTier: m.supportTier ?? ["Standard", "Premium", "Enterprise"][n % 3],
    businessOwner: m.businessOwner ?? "owner@company.com",
    securityOwner: m.securityOwner ?? "sec-lead@company.com",
    technicalOwner: m.technicalOwner ?? "tech-lead@company.com",
    criticality: CRIT[n % CRIT.length],
    residency: "EU",
    protectedResources: 50 + (n % 1500),
    workflowUnits: n % 500,
    sandboxHours: n % 200,
    activeWorkflows: n % 4,
    connectors: 1 + (n % 5),
    lastActivity: "2026-06-22",
    health: n % 5 === 0 ? "degraded" : "ok",
  };
}

function useRecords() {
  const { workspaces } = useWorkspaces();
  const [, bump] = React.useReducer((x) => x + 1, 0);
  const status = readMap(STATUS_KEY);
  const meta = readMap(META_KEY);
  const records = workspaces.map((w) => enrich(w, status, meta));
  const setStatus = (id: string, s: string) => {
    const next = { ...readMap(STATUS_KEY), [id]: s };
    writeMap(STATUS_KEY, next);
    bump();
  };
  const setMeta = (id: string, patch: WsMeta) => {
    const cur = readMap(META_KEY);
    writeMap(META_KEY, { ...cur, [id]: { ...(cur[id] as object), ...patch } });
    bump();
  };
  return { records, setStatus, setMeta, refresh: bump };
}

// Lifecycle transitions allowed from each state (§8.8).
const TRANSITIONS: Record<
  string,
  { to: string; label: string; danger?: boolean }[]
> = {
  active: [
    { to: "restricted", label: "Restrict" },
    { to: "read-only", label: "Set read-only" },
    { to: "suspended", label: "Suspend", danger: true },
    { to: "decommissioning", label: "Decommission", danger: true },
  ],
  restricted: [
    { to: "active", label: "Resume" },
    { to: "suspended", label: "Suspend", danger: true },
  ],
  "read-only": [
    { to: "active", label: "Resume" },
    { to: "suspended", label: "Suspend", danger: true },
  ],
  suspended: [
    { to: "active", label: "Resume" },
    { to: "decommissioning", label: "Decommission", danger: true },
  ],
  decommissioning: [{ to: "archived", label: "Archive", danger: true }],
  archived: [],
};

const STATUS_TONE: Record<string, string> = {
  active: T.success,
  restricted: T.warning,
  "read-only": T.warning,
  suspended: T.danger,
  decommissioning: T.danger,
  archived: T.textMuted,
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_TONE[status] ?? T.textMuted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: c,
      }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {status}
    </span>
  );
}

const TABS = [
  { id: "directory", label: "Directory" },
  { id: "templates", label: "Templates" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "deletion", label: "Deletion" },
];

export function WorkspaceManagementPage() {
  const [tab, setTab] = useTabParam("directory");
  const [wizard, setWizard] = React.useState<{
    open: boolean;
    template?: WorkspaceTemplate;
  }>({ open: false });

  return (
    <Page>
      <PageHeader
        title="Workspace Management"
        subtitle="Create, classify and govern the isolated workspaces under this organization."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setWizard({ open: true })}
            >
              Create workspace
            </HeaderButton>
          </>
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "directory" && (
        <DirectoryTab onCreate={() => setWizard({ open: true })} />
      )}
      {tab === "templates" && (
        <TemplatesTab
          onUse={(tpl) => setWizard({ open: true, template: tpl })}
        />
      )}
      {tab === "lifecycle" && <LifecycleTab />}
      {tab === "deletion" && <DeletionTab />}
      {wizard.open && (
        <CreateWizard
          template={wizard.template}
          onClose={() => setWizard({ open: false })}
        />
      )}
    </Page>
  );
}

// ════════════ §8.1 Directory ════════════
function DirectoryTab({ onCreate }: { onCreate: () => void }) {
  const navigate = useNavigate();
  const { records, setStatus, setMeta } = useRecords();
  const [search, setSearch] = React.useState("");
  const [bu, setBu] = React.useState("");
  const [cls, setCls] = React.useState("");
  const [st, setSt] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [transferId, setTransferId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const rows = records.filter(
    (r) =>
      (!search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.id.includes(search)) &&
      (!bu || r.businessUnit === bu) &&
      (!cls || r.classification === cls) &&
      (!st || r.status === st),
  );
  const hasFilters = !!(search || bu || cls || st);
  const sel = records.find((r) => r.id === selId) ?? null;

  const cols: Column<WsRecord>[] = [
    {
      key: "name",
      header: "Workspace",
      sortValue: (r) => r.name,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <LayoutGrid size={14} color={T.textMuted} />
          <span>
            {r.name}
            <span
              style={{
                display: "block",
                fontFamily: "monospace",
                fontSize: 10.5,
                color: T.textMuted,
              }}
            >
              {r.id}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "bu",
      header: "Business unit",
      sortValue: (r) => r.businessUnit,
      render: (r) => r.businessUnit,
    },
    {
      key: "class",
      header: "Classification",
      sortValue: (r) => r.classification,
      render: (r) => r.classification,
    },
    {
      key: "crit",
      header: "Criticality",
      sortValue: (r) => r.criticality,
      render: (r) => (
        <span
          style={{
            color:
              r.criticality === "Critical"
                ? T.danger
                : r.criticality === "High"
                  ? T.warning
                  : T.textNav,
          }}
        >
          {r.criticality}
        </span>
      ),
    },
    { key: "region", header: "Region", render: (r) => r.region },
    {
      key: "res",
      header: "Resources",
      sortValue: (r) => r.protectedResources,
      render: (r) => r.protectedResources.toLocaleString(),
    },
    {
      key: "health",
      header: "Health",
      render: (r) => (
        <span style={{ color: r.health === "ok" ? T.success : T.warning }}>
          ● {r.health}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  const facetOpts = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  return (
    <Card
      title="Workspace directory"
      desc="Every workspace is an isolated tenant boundary (workspace_id == tenant id). Click a row for full detail and lifecycle actions."
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name or ID…"
        count={rows.length}
        total={records.length}
        showClear={hasFilters}
        onClear={() => {
          setSearch("");
          setBu("");
          setCls("");
          setSt("");
        }}
      >
        <Select
          label="Business unit"
          value={bu}
          onChange={setBu}
          options={facetOpts(records.map((r) => r.businessUnit))}
        />
        <Select
          label="Classification"
          value={cls}
          onChange={setCls}
          options={facetOpts(records.map((r) => r.classification))}
        />
        <Select
          label="Status"
          value={st}
          onChange={setSt}
          options={facetOpts(records.map((r) => r.status))}
        />
      </FilterBar>
      <DirectoryTable
        columns={cols}
        rows={rows}
        pageSize={15}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        rowActions={(r) => (
          <button
            type="button"
            title="Open workspace console"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/workspace/${r.id}/overview`);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: T.accent,
              cursor: "pointer",
              padding: 4,
            }}
          >
            <ArrowRight size={15} />
          </button>
        )}
        empty={
          <EmptyState
            icon={<Plus size={20} />}
            title="No workspaces match"
            hint="Adjust filters or create a workspace."
            cta="Create workspace"
            onCta={onCreate}
          />
        }
      />

      {sel && (
        <WorkspaceDetail
          rec={sel}
          onClose={() => setSelId(null)}
          onOpen={() => navigate(`/workspace/${sel.id}/overview`)}
          onStatus={(s) => setStatus(sel.id, s)}
          onTransfer={() => setTransferId(sel.id)}
          onDelete={() => setDeleteId(sel.id)}
        />
      )}
      {transferId && (
        <TransferModal
          rec={records.find((r) => r.id === transferId)!}
          onClose={() => setTransferId(null)}
          onSave={(patch) => {
            setMeta(transferId, patch);
            setTransferId(null);
          }}
        />
      )}
      {deleteId && (
        <DeleteWorkflow
          rec={records.find((r) => r.id === deleteId)!}
          onClose={() => setDeleteId(null)}
          onArchive={() => {
            setStatus(deleteId, "archived");
          }}
        />
      )}
    </Card>
  );
}

// ── Workspace detail drawer (§8.1 fields + §8.5 ownership + §8.6 assignment + lifecycle actions) ──
function WorkspaceDetail({
  rec,
  onClose,
  onOpen,
  onStatus,
  onTransfer,
  onDelete,
}: {
  rec: WsRecord;
  onClose: () => void;
  onOpen: () => void;
  onStatus: (s: string) => void;
  onTransfer: () => void;
  onDelete: () => void;
}) {
  const transitions = TRANSITIONS[rec.status] ?? [];
  return (
    <Drawer
      title={rec.name}
      subtitle={`${rec.id} · ${rec.classification} · ${rec.region}`}
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
          <HeaderButton onClick={onOpen} icon={<ArrowRight size={13} />}>
            Open console
          </HeaderButton>
          <HeaderButton onClick={onTransfer}>Transfer</HeaderButton>
          <HeaderButton
            variant="danger"
            onClick={onDelete}
            icon={<Trash2 size={13} />}
          >
            Delete
          </HeaderButton>
        </div>
      }
    >
      <Section title="Status & lifecycle">
        <StatRow
          label="Current state"
          value={<StatusBadge status={rec.status} />}
        />
        {transitions.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              padding: "10px 0",
            }}
          >
            {transitions.map((t) => (
              <ConfirmButton
                key={t.to}
                variant={t.danger ? "ghost" : "link"}
                label={t.label}
                title={`${t.label} workspace`}
                body={`Move "${rec.name}" to "${t.to}". ${t.to === "suspended" ? "Workflows stop and writes are disabled; evidence is preserved." : t.to === "decommissioning" ? "Begins teardown — proceed to deletion next." : "This changes the workspace lifecycle state."} The action is audited.`}
                confirmLabel={t.label}
                onConfirm={() => onStatus(t.to)}
              />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.textMuted, padding: "8px 0" }}>
            No further transitions from “{rec.status}”.
          </div>
        )}
      </Section>

      <Section title="Ownership (§8.5)" sample>
        <KVGrid
          items={[
            { k: "Business owner", v: rec.businessOwner, sample: true },
            { k: "Security owner", v: rec.securityOwner, sample: true },
            { k: "Technical owner", v: rec.technicalOwner, sample: true },
          ]}
        />
      </Section>

      <Section title="Assignment (§8.6)">
        <KVGrid
          items={[
            { k: "Business unit", v: rec.businessUnit },
            { k: "Legal entity", v: rec.legalEntity, sample: true },
            { k: "Region", v: rec.region },
            { k: "Cost centre", v: rec.costCentre, sample: true },
            { k: "Support tier", v: rec.supportTier, sample: true },
            { k: "Data residency", v: rec.residency },
          ]}
        />
      </Section>

      <Section title="Scope & consumption" sample>
        <KVGrid
          items={[
            {
              k: "Protected resources",
              v: rec.protectedResources.toLocaleString(),
              sample: true,
            },
            {
              k: "Active workflows",
              v: String(rec.activeWorkflows),
              sample: true,
            },
            {
              k: "Workflow units (mo)",
              v: String(rec.workflowUnits),
              sample: true,
            },
            {
              k: "Sandbox hours (mo)",
              v: String(rec.sandboxHours),
              sample: true,
            },
            { k: "Connectors", v: String(rec.connectors), sample: true },
            { k: "Last activity", v: rec.lastActivity, sample: true },
          ]}
        />
        <StatRow
          label="Health"
          value={rec.health}
          tone={rec.health === "ok" ? "ok" : "warn"}
          sample
        />
      </Section>
    </Drawer>
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
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: 4,
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

// ── §8.9 Transfer ──
function TransferModal({
  rec,
  onClose,
  onSave,
}: {
  rec: WsRecord;
  onClose: () => void;
  onSave: (patch: WsMeta) => void;
}) {
  const [bu, setBu] = React.useState(rec.businessUnit);
  const [entity, setEntity] = React.useState(rec.legalEntity);
  const [region, setRegion] = React.useState(rec.region);
  const changed =
    bu !== rec.businessUnit ||
    entity !== rec.legalEntity ||
    region !== rec.region;
  return (
    <div onClick={onClose} style={ovl}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "96vw",
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>
            Transfer workspace
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
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 14 }}>
            Re-parenting “{rec.name}” re-evaluates inherited policy, residency
            and compliance scope.
          </div>
          <Field label="Business unit">
            <Sel value={bu} onChange={setBu} opts={BUS} />
          </Field>
          <Field label="Legal entity">
            <Sel
              value={entity}
              onChange={setEntity}
              opts={["Acme Financial Ltd", "Acme EU GmbH", "Acme US Inc"]}
            />
          </Field>
          <Field label="Region (bounded by residency floor)">
            <Sel
              value={region}
              onChange={setRegion}
              opts={["eu-west-1", "eu-central-1", "us-east-1"]}
            />
          </Field>
          {changed && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                fontSize: 12,
                color: T.textNav,
              }}
            >
              On transfer: inheritance re-resolves from the new parent ·
              residency re-validated against the new region floor · compliance
              scope recomputed.
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 20px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          <HeaderButton
            variant="primary"
            disabled={!changed}
            onClick={() =>
              onSave({ businessUnit: bu, legalEntity: entity, region })
            }
          >
            Confirm transfer
          </HeaderButton>
        </div>
      </div>
    </div>
  );
}

// ── §8.10 Deletion workflow (gated + certificate) ──
function DeleteWorkflow({
  rec,
  onClose,
  onArchive,
}: {
  rec: WsRecord;
  onClose: () => void;
  onArchive: () => void;
}) {
  const blocked = rec.activeWorkflows > 0;
  const [typed, setTyped] = React.useState("");
  const [done, setDone] = React.useState<null | { cert: string; ts: string }>(
    null,
  );
  const phrase = `DELETE ${rec.name}`;
  const checks = [
    {
      label: "Dependency review",
      detail: `${rec.connectors} connectors, ${rec.protectedResources.toLocaleString()} resources`,
      ok: true,
    },
    {
      label: "Active-workflow check",
      detail: blocked
        ? `${rec.activeWorkflows} active — must drain first`
        : "No active workflows",
      ok: !blocked,
    },
    {
      label: "Evidence export & retention",
      detail: "Audit + evidence exported before destruction",
      ok: true,
    },
    {
      label: "Crypto-erasure",
      detail: "Per-tenant DEK destroyed — data irrecoverable",
      ok: true,
    },
  ];
  const run = () => {
    onArchive();
    setDone({
      cert: `del-cert-${rec.id}-${Date.now().toString(36)}`,
      ts: new Date().toISOString(),
    });
  };
  return (
    <div onClick={onClose} style={ovl}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "96vw",
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: done ? T.textPrimary : T.danger,
            }}
          >
            {done ? "Workspace deleted" : "Delete workspace"}
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
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {done ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  color: T.success,
                  fontSize: 13,
                }}
              >
                <Check size={18} /> “{rec.name}” decommissioned and
                crypto-erased.
              </div>
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.textNav,
                    marginBottom: 10,
                  }}
                >
                  Deletion certificate
                </div>
                <StatRow
                  label="Certificate ID"
                  value={
                    <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
                      {done.cert}
                    </span>
                  }
                  tone="ok"
                />
                <StatRow
                  label="Workspace"
                  value={`${rec.name} (${rec.id})`}
                  tone="ok"
                />
                <StatRow
                  label="Issued"
                  value={new Date(done.ts).toLocaleString()}
                  tone="ok"
                />
                <StatRow
                  label="Guarantee"
                  value="Crypto-erasure — data irrecoverable"
                  tone="ok"
                />
              </div>
            </>
          ) : (
            <>
              <div
                style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 14 }}
              >
                An ordered, audited teardown. This cannot be undone.
              </div>
              {checks.map((c) => (
                <StatRow
                  key={c.label}
                  label={c.label}
                  value={c.detail}
                  tone={c.ok ? "ok" : "danger"}
                />
              ))}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}
                >
                  Type <strong style={{ color: T.textNav }}>{phrase}</strong> to
                  confirm
                </div>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={blocked}
                  style={inp}
                />
                {blocked && (
                  <div style={{ marginTop: 8, fontSize: 12, color: T.danger }}>
                    Cannot delete while workflows are active — suspend the
                    workspace first.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 20px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          {done ? (
            <HeaderButton variant="primary" onClick={onClose}>
              Done
            </HeaderButton>
          ) : (
            <>
              <HeaderButton onClick={onClose}>Cancel</HeaderButton>
              <HeaderButton
                variant="danger"
                disabled={blocked || typed !== phrase}
                onClick={run}
              >
                Delete permanently
              </HeaderButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════ §8.3 Templates — inspectable + creatable ════════════
function TemplatesTab({ onUse }: { onUse: (tpl: WorkspaceTemplate) => void }) {
  const [custom, setCustom] = React.useState<WorkspaceTemplate[]>(() =>
    readCustom(),
  );
  const [view, setView] = React.useState<WorkspaceTemplate | null>(null);
  const [edit, setEdit] = React.useState<WorkspaceTemplate | null>(null);
  const all = [...PREDEFINED, ...custom];

  const save = (tpl: WorkspaceTemplate) => {
    const next = [...custom.filter((c) => c.id !== tpl.id), tpl];
    setCustom(next);
    writeCustom(next);
    setEdit(null);
  };
  const del = (id: string) => {
    const next = custom.filter((c) => c.id !== id);
    setCustom(next);
    writeCustom(next);
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, color: T.textMuted }}>
          A template predefines a workspace&apos;s policy, roles, models, tools,
          retention, network and frameworks. CloudGuard templates are read-only;
          clone one to customize.
        </div>
        <HeaderButton
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => setEdit(blankTemplate())}
        >
          Create template
        </HeaderButton>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
        }}
      >
        {all.map((t) => (
          <div
            key={t.id}
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              background: T.cardBg,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div
                style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}
              >
                {t.name}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: t.source === "Custom" ? T.accent : T.textMuted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                {t.source}
              </span>
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: T.textMuted,
                flex: 1,
                lineHeight: 1.5,
              }}
            >
              {t.desc}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted }}>
              Defined by: {t.definedBy}
            </div>
            {/* quick bundle summary */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <Pill>{t.bundle.approvedModels.length} models</Pill>
              <Pill>{t.bundle.approvedTools.length} tools</Pill>
              <Pill>{t.bundle.retentionDays}d retention</Pill>
              <Pill>{t.bundle.minApprovers} approvers</Pill>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <HeaderButton icon={<Eye size={13} />} onClick={() => setView(t)}>
                View
              </HeaderButton>
              <HeaderButton variant="primary" onClick={() => onUse(t)}>
                Use
              </HeaderButton>
              <HeaderButton
                icon={<Copy size={13} />}
                onClick={() => setEdit(cloneTemplate(t))}
              >
                Clone
              </HeaderButton>
              {t.source === "Custom" && (
                <>
                  <HeaderButton
                    icon={<Pencil size={13} />}
                    onClick={() => setEdit(t)}
                  >
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    variant="danger"
                    icon={<Trash2 size={13} />}
                    onClick={() => del(t.id)}
                  >
                    Delete
                  </HeaderButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {view && (
        <TemplateDetail
          tpl={view}
          onClose={() => setView(null)}
          onUse={() => {
            onUse(view);
            setView(null);
          }}
        />
      )}
      {edit && (
        <TemplateEditor
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={save}
        />
      )}
    </>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: T.textNav,
        background: T.badgeBg,
        borderRadius: 99,
        padding: "2px 8px",
      }}
    >
      {children}
    </span>
  );
}

function TemplateDetail({
  tpl,
  onClose,
  onUse,
}: {
  tpl: WorkspaceTemplate;
  onClose: () => void;
  onUse: () => void;
}) {
  const b = tpl.bundle;
  const rows: [string, React.ReactNode][] = [
    ["Autonomy mode", b.autonomy],
    ["Delete-action gate", b.deleteGate],
    ["Sandbox profile", b.sandboxProfile],
    ["Network egress", b.network],
    ["Evidence retention", `${b.retentionDays} days`],
    ["Min approvers", String(b.minApprovers)],
    ["Approved models", b.approvedModels.join(", ")],
    ["Approved tools", b.approvedTools.join(", ")],
    ["Compliance frameworks", b.frameworks.join(", ")],
    ["Seeded roles", b.roles.join(", ")],
  ];
  return (
    <Drawer
      title={tpl.name}
      subtitle={`${tpl.source} template · defined by ${tpl.definedBy}`}
      onClose={onClose}
      footer={
        <HeaderButton variant="primary" onClick={onUse}>
          Use this template
        </HeaderButton>
      }
    >
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 16 }}>
        {tpl.desc}
      </div>
      {rows.map(([k, v]) => (
        <StatRow key={k} label={k} value={v} tone="ok" />
      ))}
      <div style={{ marginTop: 14, fontSize: 11.5, color: T.textMuted }}>
        This bundle seeds a new workspace&apos;s defaults. Enterprise mandatory
        floors still apply on top — a template cannot weaken them.
      </div>
    </Drawer>
  );
}

function TemplateEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: WorkspaceTemplate;
  onClose: () => void;
  onSave: (t: WorkspaceTemplate) => void;
}) {
  const [t, setT] = React.useState<WorkspaceTemplate>(initial);
  const set = (patch: Partial<WorkspaceTemplate>) => setT({ ...t, ...patch });
  const setB = (patch: Partial<TemplateBundle>) =>
    setT({ ...t, bundle: { ...t.bundle, ...patch } });
  const valid = t.name.trim().length > 0;
  return (
    <Drawer
      title={
        initial.source === "Custom" &&
        readCustom().some((c) => c.id === initial.id)
          ? "Edit template"
          : "Create template"
      }
      subtitle="Define the workspace bundle this template will seed."
      onClose={onClose}
      footer={
        <HeaderButton
          variant="primary"
          disabled={!valid}
          onClick={() =>
            onSave({ ...t, source: "Custom", definedBy: t.definedBy || "You" })
          }
        >
          Save template
        </HeaderButton>
      }
    >
      <Field label="Template name">
        <input
          value={t.name}
          onChange={(e) => set({ name: e.target.value })}
          style={inp}
        />
      </Field>
      <Field label="Description">
        <input
          value={t.desc}
          onChange={(e) => set({ desc: e.target.value })}
          style={inp}
        />
      </Field>
      <Field label="Autonomy mode">
        <Sel
          value={t.bundle.autonomy}
          onChange={(v) => setB({ autonomy: v })}
          opts={["autonomous", "ask", "plan"]}
        />
      </Field>
      <Field label="Delete-action gate">
        <Sel
          value={t.bundle.deleteGate}
          onChange={(v) => setB({ deleteGate: v })}
          opts={["autonomous", "ask", "plan"]}
        />
      </Field>
      <Field label="Sandbox profile">
        <Sel
          value={t.bundle.sandboxProfile}
          onChange={(v) => setB({ sandboxProfile: v })}
          opts={["Isolated", "Standard", "Elevated"]}
        />
      </Field>
      <Field label="Network egress">
        <Sel
          value={t.bundle.network}
          onChange={(v) => setB({ network: v })}
          opts={["deny-all", "allowlist", "open"]}
        />
      </Field>
      <Field label="Evidence retention (days)">
        <input
          type="number"
          value={t.bundle.retentionDays}
          onChange={(e) => setB({ retentionDays: Number(e.target.value) || 0 })}
          style={{ ...inp, width: 160 }}
        />
      </Field>
      <Field label="Minimum approvers">
        <input
          type="number"
          value={t.bundle.minApprovers}
          onChange={(e) => setB({ minApprovers: Number(e.target.value) || 0 })}
          style={{ ...inp, width: 160 }}
        />
      </Field>
      <Field label="Approved models">
        <Multi
          all={ENTERPRISE_MODELS}
          value={t.bundle.approvedModels}
          onChange={(v) => setB({ approvedModels: v })}
        />
      </Field>
      <Field label="Approved tools">
        <Multi
          all={ENTERPRISE_TOOLS}
          value={t.bundle.approvedTools}
          onChange={(v) => setB({ approvedTools: v })}
        />
      </Field>
      <Field label="Compliance frameworks">
        <Multi
          all={FRAMEWORKS}
          value={t.bundle.frameworks}
          onChange={(v) => setB({ frameworks: v })}
        />
      </Field>
      <Field label="Seeded roles">
        <Multi
          all={WS_ROLES}
          value={t.bundle.roles}
          onChange={(v) => setB({ roles: v })}
        />
      </Field>
    </Drawer>
  );
}

// ════════════ §8.8 Lifecycle — per-workspace, operable ════════════
function LifecycleTab() {
  const { records, setStatus } = useRecords();
  const states = [
    "draft",
    "provisioning",
    "onboarding",
    "active",
    "restricted",
    "read-only",
    "suspended",
    "decommissioning",
    "archived",
  ];
  const cols: Column<WsRecord>[] = [
    {
      key: "name",
      header: "Workspace",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    { key: "bu", header: "Business unit", render: (r) => r.businessUnit },
    {
      key: "status",
      header: "State",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "Transitions",
      render: (r) => {
        const ts = TRANSITIONS[r.status] ?? [];
        if (ts.length === 0)
          return <span style={{ color: T.textMuted }}>—</span>;
        return (
          <span
            style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}
            onClick={(e) => e.stopPropagation()}
          >
            {ts.map((t) => (
              <ConfirmButton
                key={t.to}
                variant={t.danger ? "ghost" : "link"}
                label={t.label}
                title={`${t.label} ${r.name}`}
                body={`Move "${r.name}" to "${t.to}". The action is audited.`}
                confirmLabel={t.label}
                onConfirm={() => setStatus(r.id, t.to)}
              />
            ))}
          </span>
        );
      },
    },
  ];
  return (
    <>
      <Card
        title="Lifecycle state machine"
        desc="A workspace moves through these states; transitions provision or tear down the isolation substrate."
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "10px 0",
          }}
        >
          {states.map((s, i) => (
            <span
              key={s}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: STATUS_TONE[s] ?? T.textNav,
                  border: `1px solid ${T.border}`,
                  borderRadius: 99,
                  padding: "3px 11px",
                }}
              >
                {s}
              </span>
              {i < states.length - 1 && (
                <span style={{ color: T.textMuted }}>→</span>
              )}
            </span>
          ))}
        </div>
      </Card>
      <Card
        title="Manage workspace state"
        desc="Transition any workspace through its lifecycle. Use the directory drawer for transfer & deletion."
      >
        <DirectoryTable
          columns={cols}
          rows={records}
          pageSize={15}
          empty={
            <EmptyState
              title="No workspaces"
              hint="Create a workspace to manage its lifecycle."
            />
          }
        />
      </Card>
    </>
  );
}

// ════════════ §8.10 Deletion — per-workspace gated workflow ════════════
function DeletionTab() {
  const { records, setStatus } = useRecords();
  const [target, setTarget] = React.useState<WsRecord | null>(null);
  const active = records.filter((r) => r.status !== "archived");
  const cols: Column<WsRecord>[] = [
    {
      key: "name",
      header: "Workspace",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    {
      key: "status",
      header: "State",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "wf",
      header: "Active workflows",
      sortValue: (r) => r.activeWorkflows,
      render: (r) => (
        <span style={{ color: r.activeWorkflows > 0 ? T.warning : T.textNav }}>
          {r.activeWorkflows}
        </span>
      ),
    },
    {
      key: "res",
      header: "Resources",
      render: (r) => r.protectedResources.toLocaleString(),
    },
  ];
  return (
    <>
      <Card
        title="Workspace deletion"
        desc="An ordered, audited teardown ending in crypto-erasure + a signed deletion certificate. Select a workspace to begin."
      >
        <DirectoryTable
          columns={cols}
          rows={active}
          pageSize={15}
          rowActions={(r) => (
            <button
              type="button"
              title="Delete workspace"
              onClick={() => setTarget(r)}
              style={{
                background: "transparent",
                border: "none",
                color: T.danger,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
          empty={
            <EmptyState
              title="Nothing to delete"
              hint="No active workspaces."
            />
          }
        />
      </Card>
      {target && (
        <DeleteWorkflow
          rec={target}
          onClose={() => setTarget(null)}
          onArchive={() => setStatus(target.id, "archived")}
        />
      )}
    </>
  );
}

// ════════════ §8.2 Create Workspace wizard — provenance-aware ════════════
const PHASES = [
  "Identity",
  "Placement",
  "Scope",
  "Access",
  "Capability",
  "Review",
];

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "workspace"
  );
}

interface WizState {
  name: string;
  classification: string;
  region: string;
  businessUnit: string;
  retention: number;
  minApprovers: number;
  models: string[];
  tools: string[];
  frameworks: string[];
  sandboxProfile: string;
}

function CreateWizard({
  template,
  onClose,
}: {
  template?: WorkspaceTemplate;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const b = template?.bundle;
  const [s, setS] = React.useState<WizState>({
    name: "",
    classification: "Production",
    region: "eu-west-1",
    businessUnit: "Payments",
    retention: Math.max(
      FLOORS.minRetentionDays,
      b?.retentionDays ?? FLOORS.minRetentionDays,
    ),
    minApprovers: Math.max(
      FLOORS.minApprovers,
      b?.minApprovers ?? FLOORS.minApprovers,
    ),
    models: (b?.approvedModels ?? ["claude-opus-4-8"]).filter(
      (m) => !FLOORS.prohibitedModels.includes(m),
    ),
    tools: b?.approvedTools ?? ["aws-cli", "prowler"],
    frameworks: b?.frameworks ?? ["SOC 2"],
    sandboxProfile: b?.sandboxProfile ?? "Standard",
  });
  const id = slug(s.name);
  const canNext = step !== 0 || s.name.trim().length > 0;
  const finish = () => {
    addLocalWorkspace({
      id,
      name: s.name.trim(),
      classification: s.classification,
      region: s.region,
    });
    onClose();
    navigate(`/workspace/${id}/overview`);
  };

  return (
    <div onClick={onClose} style={ovl}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 780,
          maxWidth: "96vw",
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div>
            <div
              style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}
            >
              Create workspace
            </div>
            {template && (
              <div style={{ fontSize: 11.5, color: T.accent, marginTop: 2 }}>
                From template: {template.name}
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "14px 20px",
            borderBottom: `1px solid ${T.border}`,
            flexWrap: "wrap",
          }}
        >
          {PHASES.map((p, i) => (
            <span
              key={p}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color:
                  i === step
                    ? T.textPrimary
                    : i < step
                      ? T.success
                      : T.textMuted,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  background:
                    i <= step ? "var(--cg-accent-bg-strong)" : "transparent",
                  border: `1px solid ${i <= step ? "transparent" : T.border}`,
                }}
              >
                {i < step ? <Check size={11} /> : i + 1}
              </span>
              {p}
              {i < PHASES.length - 1 && (
                <span style={{ color: T.textMuted, marginLeft: 2 }}>›</span>
              )}
            </span>
          ))}
        </div>

        <div
          style={{
            padding: 20,
            minHeight: 280,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {step === 0 && (
            <Phase title="Workspace identity">
              <Field label="Workspace name">
                <input
                  value={s.name}
                  onChange={(e) => setS({ ...s, name: e.target.value })}
                  placeholder="e.g. acme-prod"
                  style={inp}
                />
              </Field>
              <Field label="Workspace ID (auto)">
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    color: T.textMuted,
                  }}
                >
                  {id}
                </span>
              </Field>
            </Phase>
          )}
          {step === 1 && (
            <Phase title="Placement & classification">
              <Field label="Environment classification">
                <Sel
                  value={s.classification}
                  onChange={(v) => setS({ ...s, classification: v })}
                  opts={[
                    "Production",
                    "Pre-production",
                    "Development",
                    "Regulated",
                    "Research",
                  ]}
                />
              </Field>
              <Field label="Business unit">
                <Sel
                  value={s.businessUnit}
                  onChange={(v) => setS({ ...s, businessUnit: v })}
                  opts={["Payments", "Platform", "Security", "Data"]}
                />
              </Field>
              <ProvField
                who="Enterprise residency floor (§10.4)"
                editable
                label="Data residency region"
                hint="Bounded by the enterprise-approved region set; restricted regions are not selectable."
              >
                <Sel
                  value={s.region}
                  onChange={(v) => setS({ ...s, region: v })}
                  opts={["eu-west-1", "eu-central-1", "us-east-1", "us-west-2"]}
                />
              </ProvField>
            </Phase>
          )}
          {step === 2 && (
            <Phase title="Resource scope (§21)">
              <div
                style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 8 }}
              >
                Agents may only act on resources explicitly in scope.
              </div>
              <StatRow
                label="Cloud accounts"
                value="None added yet — discovery-only until set"
                tone="warn"
              />
              <ProvField
                who="Enterprise execution policy (§21.7)"
                editable
                label="Execution eligibility"
                hint="Workspace may set a stricter level than the enterprise maximum."
              >
                <Sel
                  value="Discovery only"
                  onChange={() => {}}
                  opts={[
                    "Discovery only",
                    "Investigation",
                    "Approval-gated execution",
                  ]}
                />
              </ProvField>
              <HeaderButton icon={<Plus size={14} />}>
                Add cloud account
              </HeaderButton>
            </Phase>
          )}
          {step === 3 && (
            <Phase title="Users & access">
              <StatRow
                label="Initial members"
                value="You (Workspace Owner)"
                tone="ok"
              />
              <ProvField
                who={
                  template ? `Template: ${template.name}` : "Workspace default"
                }
                editable
                label="Seeded roles"
                hint="Roles created in the new workspace; editable later in Identity → Roles."
              >
                <span style={{ fontSize: 12.5, color: T.textNav }}>
                  {(
                    b?.roles ?? ["Workspace Owner", "Workspace Admin", "Viewer"]
                  ).join(", ")}
                </span>
              </ProvField>
              <HeaderButton icon={<Plus size={14} />}>
                Invite member
              </HeaderButton>
            </Phase>
          )}
          {step === 4 && (
            <Phase title="Capability & limits">
              <ProvField
                who={
                  template
                    ? `Template: ${template.name} · from Enterprise model catalogue (§13)`
                    : "Enterprise model catalogue (§13)"
                }
                editable
                label="Approved models"
                hint="Select from the enterprise-approved models. Prohibited models cannot be enabled."
              >
                <Multi
                  all={ENTERPRISE_MODELS}
                  value={s.models}
                  onChange={(v) => setS({ ...s, models: v })}
                  locked={FLOORS.prohibitedModels}
                  lockedReason="Prohibited org-wide (§13.3)"
                />
              </ProvField>
              <ProvField
                who={
                  template
                    ? `Template: ${template.name} · from Enterprise tool catalogue (§14)`
                    : "Enterprise tool catalogue (§14)"
                }
                editable
                label="Approved tools"
              >
                <Multi
                  all={ENTERPRISE_TOOLS}
                  value={s.tools}
                  onChange={(v) => setS({ ...s, tools: v })}
                />
              </ProvField>
              <ProvField
                who="Enterprise approval floor (§9.3)"
                floor={`≥ ${FLOORS.minApprovers}`}
                label="Minimum approvers"
                hint="Set by Enterprise Security Admin. You may require more approvers, never fewer."
              >
                <input
                  type="number"
                  min={FLOORS.minApprovers}
                  value={s.minApprovers}
                  onChange={(e) =>
                    setS({
                      ...s,
                      minApprovers: Math.max(
                        FLOORS.minApprovers,
                        Number(e.target.value) || FLOORS.minApprovers,
                      ),
                    })
                  }
                  style={{ ...inp, width: 110 }}
                />
              </ProvField>
              <ProvField
                who="Enterprise retention floor (§30.6)"
                floor={`≥ ${FLOORS.minRetentionDays}d`}
                label="Evidence retention (days)"
                hint="You may retain longer than the enterprise minimum, never shorter."
              >
                <input
                  type="number"
                  min={FLOORS.minRetentionDays}
                  value={s.retention}
                  onChange={(e) =>
                    setS({
                      ...s,
                      retention: Math.max(
                        FLOORS.minRetentionDays,
                        Number(e.target.value) || FLOORS.minRetentionDays,
                      ),
                    })
                  }
                  style={{ ...inp, width: 110 }}
                />
              </ProvField>
              <ProvField
                who={
                  template ? `Template: ${template.name}` : "Workspace default"
                }
                editable
                label="Sandbox profile"
              >
                <Sel
                  value={s.sandboxProfile}
                  onChange={(v) => setS({ ...s, sandboxProfile: v })}
                  opts={["Isolated", "Standard", "Elevated"]}
                />
              </ProvField>
              <ProvField
                who="Enterprise compliance scope (§11)"
                editable
                label="Compliance frameworks"
                hint="Must include any enterprise-mandated frameworks; you may add more."
              >
                <Multi
                  all={FRAMEWORKS}
                  value={s.frameworks}
                  onChange={(v) => setS({ ...s, frameworks: v })}
                />
              </ProvField>
            </Phase>
          )}
          {step === 5 && (
            <Phase title="Review & activate">
              <div
                style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}
              >
                On create, the isolation substrate is provisioned: dedicated
                cell, per-tenant DEK, and a fresh tamper-evident audit chain.
              </div>
              <StatRow
                label="Workspace"
                value={`${s.name || "—"}  (${id})`}
                tone="ok"
              />
              <StatRow
                label="Classification · region"
                value={`${s.classification} · ${s.region}`}
                tone="ok"
              />
              <StatRow
                label="Approved models"
                value={s.models.join(", ") || "—"}
                tone="ok"
              />
              <StatRow
                label="Approved tools"
                value={s.tools.join(", ") || "—"}
                tone="ok"
              />
              <StatRow
                label="Min approvers · retention"
                value={`${s.minApprovers} · ${s.retention}d`}
                tone="ok"
              />
              <StatRow
                label="Frameworks"
                value={s.frameworks.join(", ") || "—"}
                tone="ok"
              />
              <StatRow
                label="Provisioning"
                value="cell + per-tenant DEK + audit chain"
                tone="ok"
              />
            </Phase>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <HeaderButton
            icon={<ArrowLeft size={14} />}
            disabled={step === 0}
            onClick={() => setStep((x) => Math.max(0, x - 1))}
          >
            Back
          </HeaderButton>
          {step < PHASES.length - 1 ? (
            <HeaderButton
              variant="primary"
              disabled={!canNext}
              onClick={() => setStep((x) => x + 1)}
            >
              Continue <ArrowRight size={14} />
            </HeaderButton>
          ) : (
            <HeaderButton variant="primary" onClick={finish}>
              <Check size={14} /> Create workspace
            </HeaderButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ── provenance-aware field: shows who defined the value + editable/locked ──
function ProvField({
  who,
  label,
  hint,
  children,
  editable,
  floor,
}: {
  who: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  editable?: boolean;
  floor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        padding: "12px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11.5,
          color: T.textMuted,
          flexWrap: "wrap",
        }}
      >
        <span>
          Defined by: <span style={{ color: T.textNav }}>{who}</span>
        </span>
        {floor ? (
          <FloorBadge floor={floor} />
        ) : editable ? (
          <span style={{ color: T.accent }}>· editable here</span>
        ) : null}
      </div>
    </div>
  );
}

// ── multiselect (chips) with optional locked (prohibited) options ──
function Multi({
  all,
  value,
  onChange,
  locked = [],
  lockedReason,
}: {
  all: string[];
  value: string[];
  onChange: (v: string[]) => void;
  locked?: string[];
  lockedReason?: string;
}) {
  const toggle = (o: string) => {
    if (locked.includes(o)) return;
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  };
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        justifyContent: "flex-end",
        maxWidth: 380,
      }}
    >
      {all.map((o) => {
        const on = value.includes(o);
        const isLocked = locked.includes(o);
        return (
          <button
            key={o}
            type="button"
            title={isLocked ? lockedReason : undefined}
            onClick={() => toggle(o)}
            style={{
              height: 26,
              padding: "0 9px",
              borderRadius: 99,
              border: `1px solid ${on ? "transparent" : T.border}`,
              background: isLocked
                ? "var(--cg-danger-bg)"
                : on
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
              color: isLocked ? T.danger : on ? T.accent : T.textNav,
              fontSize: 11.5,
              cursor: isLocked ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              opacity: isLocked ? 0.7 : 1,
            }}
          >
            {isLocked && <Lock size={10} />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── shared ──
const ovl: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "var(--cg-overlay)",
  zIndex: 1100,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "40px 20px",
  overflowY: "auto",
};
const inp: React.CSSProperties = {
  height: 34,
  width: "100%",
  padding: "0 11px",
  background: "var(--cg-input-bg)",
  border: `1px solid ${T.border}`,
  borderRadius: 6,
  color: T.textPrimary,
  fontSize: 13,
  outline: "none",
};

function Drawer({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cg-overlay)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
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
            }}
          >
            <X size={18} />
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
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Phase({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: T.textPrimary,
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: 12, color: T.textMuted }}>{label}</span>
      {children}
    </div>
  );
}

function Sel({
  value,
  onChange,
  opts,
}: {
  value: string;
  onChange: (v: string) => void;
  opts: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, height: 34, cursor: "pointer", width: 220 }}
    >
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

function blankTemplate(): WorkspaceTemplate {
  return {
    id: `custom-${Date.now()}`,
    name: "",
    desc: "",
    source: "Custom",
    definedBy: "You",
    bundle: {
      autonomy: "ask",
      deleteGate: "ask",
      sandboxProfile: "Standard",
      retentionDays: 365,
      network: "allowlist",
      minApprovers: 2,
      approvedModels: ["claude-sonnet-4-6"],
      approvedTools: ["aws-cli", "prowler"],
      frameworks: ["SOC 2"],
      roles: ["Workspace Owner", "Viewer"],
    },
  };
}
function cloneTemplate(t: WorkspaceTemplate): WorkspaceTemplate {
  return {
    ...t,
    id: `custom-${Date.now()}`,
    name: `${t.name} (copy)`,
    source: "Custom",
    definedBy: "You",
    bundle: { ...t.bundle },
  };
}

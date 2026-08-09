/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Ownership & Administration → Business Ownership */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  RefreshCcw,
  ArrowLeftRight,
  UserCog,
  Trash2,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  Building2,
  Network,
  Wallet,
  Scale,
  Activity as ActivityIcon,
  History,
  DollarSign,
  Crown,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
  StatRow,
  KVGrid,
  DirectoryTable,
  HeaderButton,
  Select,
  EmptyState,
  SampleTag,
  SideRailDrawer,
  RowMenu,
  ScopeBadge,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Business Ownership — organizational accountability for a workspace from a business perspective.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/02_Ownership & Administration/business_ownership.md.
 *
 * Where Workspace Owners are individual people, Business Ownership identifies WHICH organizational
 * entity (Business Unit, Department, Division, Product Organization, Program, Cost Center, Regional
 * Organization) owns a workspace, so that Compliance, Billing, AI Governance, Reporting, Risk
 * Management and Chargeback can align to the enterprise org structure. Reuses the Enterprise
 * Administration UX pattern shared with the Users module (Banner · Toolbar · Filters · Search · Data
 * Table · Bulk/Row actions · Business Ownership Detail Drawer with 7 sub-tabs).
 *
 * There is no business-ownership backend yet, so the assignment set is representative sample data
 * (tagged `Sample` in the UI). When admin/org_model.py lands, swap SAMPLE_OWNERSHIP for the live
 * query — the component API stays identical.
 */

// ── Status model ──────────────────────────────────────────────────────────────────────────────────
type Status = "Active" | "Pending Review" | "Transferring" | "Inactive";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  "Pending Review": T.warning,
  Transferring: T.accent,
  Inactive: T.textMuted,
};

// ── Business owner categories — drive the View sub-navigation (spec Navigation) ────────────────────
const OWNER_TYPES = [
  "Business Unit",
  "Department",
  "Division",
  "Product Organization",
  "Program",
  "Cost Center",
  "Regional Organization",
] as const;
type OwnerType = (typeof OWNER_TYPES)[number];

const VIEW_TABS = [
  { id: "assignments", label: "Ownership Assignments" },
  { id: "Business Unit", label: "Business Units" },
  { id: "Department", label: "Departments" },
  { id: "Division", label: "Divisions" },
  { id: "Product Organization", label: "Product Organizations" },
  { id: "Program", label: "Programs" },
  { id: "Cost Center", label: "Cost Centers" },
  { id: "Regional Organization", label: "Regional Organizations" },
];

// ── Reference data pools ──────────────────────────────────────────────────────────────────────────
const BUSINESS_UNITS = [
  "Finance",
  "Payments",
  "Platform Engineering",
  "Retail",
  "Data & Analytics",
  "Security",
  "Marketing",
  "Customer Success",
];
const DEPARTMENTS = [
  "Payments",
  "Core Banking",
  "Infrastructure",
  "Storefront",
  "Data Platform",
  "GRC",
  "Growth",
  "Support Operations",
];
const DIVISIONS = [
  "Global Technology",
  "Consumer Banking",
  "Enterprise Services",
  "Digital Products",
];
const PRODUCT_ORGS = [
  "Payments Platform",
  "Merchant Services",
  "Analytics Cloud",
  "Identity Cloud",
];
const PROGRAMS = [
  "Cloud Migration",
  "Zero Trust",
  "Data Modernization",
  "Cost Optimization",
];
const REGIONS = ["North America", "EMEA", "APAC", "LATAM"];
const PORTFOLIOS = [
  "Core Platform",
  "Customer Experience",
  "Compliance & Risk",
  "Data Services",
];
const EXEC_SPONSORS = [
  "Sarah Johnson",
  "Michael Chen",
  "Priya Nair",
  "David Okafor",
  "Elena Rossi",
  "James Park",
];
const OWNERS = [
  "Alice Smith",
  "Marco Rossi",
  "Sara Ahmed",
  "Tom Becker",
  "Lena Wu",
  "Omar Haddad",
];
const CHARGEBACK_PROFILES = [
  "Showback",
  "Full Chargeback",
  "Shared Allocation",
  "Fixed Allocation",
];
const FUNDING_MODELS = ["OpEx", "CapEx", "Project-Funded", "Grant-Funded"];
const RISK_LEVELS = ["Low", "Moderate", "High", "Critical"];
const REGULATORY_SCOPES = ["PCI DSS", "SOC 2", "GDPR", "HIPAA", "ISO 27001"];
const COMPLIANCE_PROGRAMS = [
  "PCI DSS",
  "SOC 2 Type II",
  "ISO 27001",
  "GDPR",
  "NIST CSF",
];
const APPLICABLE_POLICIES = [
  "Data Residency",
  "Encryption at Rest",
  "Least Privilege Access",
  "Retention & Deletion",
  "Third-Party Risk",
];
const ENVIRONMENTS = ["Production", "Development", "Sandbox", "Pre-production"];
const WORKSPACE_NAMES = [
  "PCI Production",
  "Core Banking",
  "Merchant Portal",
  "Data Lakehouse",
  "Fraud Analytics",
  "Identity Broker",
  "Retail Sandbox",
  "Ledger Services",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface OwnedWorkspace {
  id: string;
  name: string;
  environment: string;
  owner: string;
  compliance: number;
  status: Status;
  monthlyCost: number;
}

interface OwnershipRecord {
  id: string;
  ownerType: OwnerType;
  workspace: string; // representative / primary workspace
  businessUnit: string;
  department: string;
  division: string;
  organization: string; // product organization
  program: string;
  portfolio: string;
  costCenter: string;
  region: string;
  executiveSponsor: string;
  primaryOwner: string;
  status: Status;
  effectiveDate: string;
  notes: string;
  // financial ownership
  budgetOwner: string;
  chargebackProfile: string;
  billingAccount: string;
  businessCode: string;
  projectCode: string;
  fundingModel: string;
  monthlySpend: number;
  annualSpend: number;
  forecast: number;
  allocatedBudget: number;
  remainingBudget: number;
  // governance
  riskLevel: string;
  regulatoryScope: string[];
  compliancePrograms: string[];
  applicablePolicies: string[];
  complianceAccountability: string;
  riskOwner: string;
  policyOwner: string;
  dataOwner: string;
  aiGovernanceOwner: string;
  operationalGovernanceOwner: string;
  executiveOversight: string;
  // statistics
  complianceScore: number;
  ownedWorkspaces: OwnedWorkspace[];
}

// ── Deterministic representative ownership set ────────────────────────────────────────────────────
const SAMPLE_OWNERSHIP: OwnershipRecord[] = Array.from(
  { length: 14 },
  (_, i) => {
    const id = `BO-${(1004 + i * 3).toString().padStart(5, "0")}`;
    const n = hashId(id);
    const status = pick<Status>(
      [
        "Active",
        "Active",
        "Active",
        "Pending Review",
        "Transferring",
        "Inactive",
      ],
      n,
    );
    const wsCount = 2 + (n % 5);
    const ownedWorkspaces: OwnedWorkspace[] = Array.from(
      { length: wsCount },
      (_unused, w) => {
        const m = hashId(`${id}-ws-${w}`);
        return {
          id: `${id}-ws-${w}`,
          name: `${pick(WORKSPACE_NAMES, m)} ${pick(["A", "B", "C", "D"], m >> 2)}`,
          environment: pick(ENVIRONMENTS, m),
          owner: pick(OWNERS, m >> 1),
          compliance: 72 + (m % 27),
          status: pick<Status>(
            ["Active", "Active", "Pending Review", "Inactive"],
            m,
          ),
          monthlyCost: 1800 + (m % 60) * 210,
        };
      },
    );
    const monthlySpend = ownedWorkspaces.reduce((s, w) => s + w.monthlyCost, 0);
    const annualSpend = monthlySpend * 12;
    const allocatedBudget = Math.round(annualSpend * 1.18);
    return {
      id,
      ownerType: pick<OwnerType>([...OWNER_TYPES], n),
      workspace: ownedWorkspaces[0].name,
      businessUnit: pick(BUSINESS_UNITS, n),
      department: pick(DEPARTMENTS, n >> 1),
      division: pick(DIVISIONS, n >> 2),
      organization: pick(PRODUCT_ORGS, n >> 3),
      program: pick(PROGRAMS, n >> 1),
      portfolio: pick(PORTFOLIOS, n >> 2),
      costCenter: `CC-${(10040 + (n % 60)).toString()}`,
      region: pick(REGIONS, n >> 2),
      executiveSponsor: pick(EXEC_SPONSORS, n),
      primaryOwner: pick(OWNERS, n),
      status,
      effectiveDate: `2026-0${1 + (n % 8)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      notes: `Business ownership assigned to ${pick(BUSINESS_UNITS, n)} for enterprise accountability and chargeback alignment.`,
      budgetOwner: pick(OWNERS, n + 1),
      chargebackProfile: pick(CHARGEBACK_PROFILES, n),
      billingAccount: `BA-${(880000 + (n % 900)).toString()}`,
      businessCode: `BUS-${pick(BUSINESS_UNITS, n).slice(0, 3).toUpperCase()}`,
      projectCode: `PRJ-${(2200 + (n % 700)).toString()}`,
      fundingModel: pick(FUNDING_MODELS, n),
      monthlySpend,
      annualSpend,
      forecast: Math.round(annualSpend * 1.07),
      allocatedBudget,
      remainingBudget: allocatedBudget - annualSpend,
      riskLevel: pick(RISK_LEVELS, n >> 1),
      regulatoryScope: [
        pick(REGULATORY_SCOPES, n),
        pick(REGULATORY_SCOPES, n + 2),
      ].filter((v, idx, a) => a.indexOf(v) === idx),
      compliancePrograms: [
        pick(COMPLIANCE_PROGRAMS, n),
        pick(COMPLIANCE_PROGRAMS, n + 1),
      ].filter((v, idx, a) => a.indexOf(v) === idx),
      applicablePolicies: [
        pick(APPLICABLE_POLICIES, n),
        pick(APPLICABLE_POLICIES, n + 1),
        pick(APPLICABLE_POLICIES, n + 3),
      ].filter((v, idx, a) => a.indexOf(v) === idx),
      complianceAccountability: pick(EXEC_SPONSORS, n + 1),
      riskOwner: pick(OWNERS, n + 2),
      policyOwner: pick(OWNERS, n + 3),
      dataOwner: pick(OWNERS, n + 4),
      aiGovernanceOwner: pick(EXEC_SPONSORS, n + 2),
      operationalGovernanceOwner: pick(OWNERS, n + 5),
      executiveOversight: pick(EXEC_SPONSORS, n + 3),
      complianceScore: 78 + (n % 21),
      ownedWorkspaces,
    };
  },
);

const money = (v: number) =>
  `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const RISK_TONE: Record<string, string> = {
  Low: T.success,
  Moderate: T.warning,
  High: T.warning,
  Critical: T.danger,
};

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {status}
    </span>
  );
}

/**
 * Embeddable body — Organizational Dashboard + Ownership Hierarchy + sub-navigation + directory +
 * detail drawer, WITHOUT the outer <Page> or the page banner. Uses local state for the View sub-nav
 * so it never collides with a host page's `?tab=`.
 */
export function BusinessOwnershipView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("assignments");

  const [search, setSearch] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fDept, setFDept] = React.useState("");
  const [fDivision, setFDivision] = React.useState("");
  const [fRegion, setFRegion] = React.useState("");
  const [fCostCenter, setFCostCenter] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fSponsor, setFSponsor] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_OWNERSHIP;
  const isType = OWNER_TYPES.includes(view as OwnerType);

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!isType || r.ownerType === view) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.division.toLowerCase().includes(q) ||
        r.costCenter.toLowerCase().includes(q) ||
        r.executiveSponsor.toLowerCase().includes(q)) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fDept || r.department === fDept) &&
      (!fDivision || r.division === fDivision) &&
      (!fRegion || r.region === fRegion) &&
      (!fCostCenter || r.costCenter === fCostCenter) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fSponsor || r.executiveSponsor === fSponsor) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFBu("");
    setFDept("");
    setFDivision("");
    setFRegion("");
    setFCostCenter("");
    setFWorkspace("");
    setFSponsor("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Organizational Dashboard aggregates (spec §Organizational Dashboard) ──
  const totalWorkspaces = records.reduce(
    (s, r) => s + r.ownedWorkspaces.length,
    0,
  );
  const totalMonthly = records.reduce((s, r) => s + r.monthlySpend, 0);
  const avgCompliance = Math.round(
    records.reduce((s, r) => s + r.complianceScore, 0) / records.length,
  );
  const uniqueBu = new Set(records.map((r) => r.businessUnit)).size;
  const uniqueDept = new Set(records.map((r) => r.department)).size;
  const uniqueSponsors = new Set(records.map((r) => r.executiveSponsor)).size;
  const uniqueCostCenters = new Set(records.map((r) => r.costCenter)).size;

  const toolbar: CommandItem[] = [
    {
      key: "assign",
      label: "Assign Business Owner",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=business-ownership"),
    },
    // Administrative Actions
    {
      key: "transfer",
      label: "Transfer Ownership",
      icon: <ArrowLeftRight size={15} />,
      disabled: true,
    },
    {
      key: "update",
      label: "Update Assignment",
      icon: <UserCog size={15} />,
      disabled: true,
    },
    {
      key: "remove",
      label: "Remove Assignment",
      icon: <Trash2 size={15} />,
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
      disabled: true,
    },
    // Governance Actions
    {
      key: "validate",
      label: "Validate Ownership",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Review Assignments",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Ownership Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<OwnershipRecord>[] = [
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
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
          {r.workspace}
        </span>
      ),
    },
    {
      key: "bu",
      header: "Business Unit",
      sortValue: (r) => r.businessUnit,
      render: (r) => r.businessUnit,
    },
    {
      key: "dept",
      header: "Department",
      sortValue: (r) => r.department,
      render: (r) => r.department,
    },
    {
      key: "cc",
      header: "Cost Center",
      sortValue: (r) => r.costCenter,
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.costCenter}
        </span>
      ),
    },
    {
      key: "sponsor",
      header: "Executive Sponsor",
      sortValue: (r) => r.executiveSponsor,
      render: (r) => r.executiveSponsor,
    },
    {
      key: "owner",
      header: "Primary Owner",
      sortValue: (r) => r.primaryOwner,
      render: (r) => r.primaryOwner,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      {/* Organizational Dashboard (spec §Organizational Dashboard) */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Organizational dashboard <SampleTag />
      </div>
      <div style={{ marginBottom: 18 }}>
        <StatStripPlain
          items={[
            { label: "Business Units", value: uniqueBu, tone: "ok" },
            { label: "Departments", value: uniqueDept },
            { label: "Owned Workspaces", value: totalWorkspaces, tone: "ok" },
            { label: "Executive Sponsors", value: uniqueSponsors },
            { label: "Cost Centers", value: uniqueCostCenters },
            {
              label: "Monthly Spend",
              value: money(totalMonthly),
              tone: "warn",
            },
            {
              label: "Compliance Coverage",
              value: `${avgCompliance}%`,
              tone: avgCompliance >= 85 ? "ok" : "warn",
            },
          ]}
        />
      </div>

      {/* Ownership Hierarchy (spec §Ownership Hierarchy) */}

      <div style={{ display: "flex", marginBottom: 14, marginTop: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <DiscoveryListView
        title="Business ownership assignments"
        commands={toolbar}
        pills={[
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "dept",
            label: "Department",
            value: fDept,
            onChange: setFDept,
            options: facet(records.map((r) => r.department)),
          },
          {
            key: "division",
            label: "Division",
            value: fDivision,
            onChange: setFDivision,
            options: facet(records.map((r) => r.division)),
          },
          {
            key: "region",
            label: "Region",
            value: fRegion,
            onChange: setFRegion,
            options: facet(records.map((r) => r.region)),
          },
          {
            key: "costCenter",
            label: "Cost Center",
            value: fCostCenter,
            onChange: setFCostCenter,
            options: facet(records.map((r) => r.costCenter)),
          },
          {
            key: "workspace",
            label: "Workspace",
            value: fWorkspace,
            onChange: setFWorkspace,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "sponsor",
            label: "Executive Sponsor",
            value: fSponsor,
            onChange: setFSponsor,
            options: facet(records.map((r) => r.executiveSponsor)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All assignments", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search business ownership — workspace, business unit, department, division, cost center, executive sponsor…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "workspace", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<UserCog size={13} />} onClick={clear}>
              Assign ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<ArrowLeftRight size={13} />} onClick={clear}>
              Transfer
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit Assignment", onClick: () => setSelId(r.id) },
              { label: "Transfer", onClick: () => setSelId(r.id) },
              {
                label: "View Workspaces",
                onClick: () => setSelId(r.id),
              },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Building2 size={20} />}
            title="No business ownership assignments found."
            hint="Adjust filters, or assign business ownership to align workspaces with the enterprise organizational structure."
            cta="Assign Business Ownership"
            onCta={() => navigate("/admin/workspaces?tab=business-ownership")}
          />
        }
      />

      {sel && (
        <OwnershipDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function BusinessOwnershipPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Business Ownership"
        subtitle="Assign organizational ownership for workspaces to support governance, budgeting, compliance, reporting, and operational accountability."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspaces?tab=business-ownership")
              }
            >
              Assign Business Owner
            </HeaderButton>
          </>
        }
      />
      <BusinessOwnershipView />
    </Page>
  );
}

// ════════════ Business Ownership Detail Drawer — 7 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "organization", label: "Organization", icon: <Network size={13} /> },
  {
    id: "workspaces",
    label: "Assigned Workspaces",
    icon: <Building2 size={13} />,
  },
  {
    id: "financial",
    label: "Financial Ownership",
    icon: <Wallet size={13} />,
  },
  { id: "governance", label: "Governance", icon: <Scale size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function OwnershipDetailDrawer({
  rec,
  onClose,
}: {
  rec: OwnershipRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.businessUnit} · ${rec.department}`}
      // Drawer Header displays: Business Unit · Department · Owned Workspaces · Executive Sponsor · Status
      subtitle={`${rec.ownedWorkspaces.length} owned workspaces · Sponsor: ${rec.executiveSponsor} · ${rec.status}`}
      width={760}
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
          {/* Drawer Header Quick Actions: Edit · Transfer · Export */}
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<ArrowLeftRight size={13} />}>
            Transfer
          </HeaderButton>
          <HeaderButton variant="primary" icon={<UserCog size={13} />}>
            Edit
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "organization" && <OrganizationTab rec={rec} />}
      {tab === "workspaces" && <WorkspacesTab rec={rec} />}
      {tab === "financial" && <FinancialTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
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

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: OwnershipRecord }) {
  const [sub, setSub] = React.useState("general");
  const ws = rec.ownedWorkspaces;
  const countEnv = (env: string) =>
    ws.filter((w) => w.environment === env).length;
  const archived = ws.filter((w) => w.status === "Inactive").length;
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Department", v: rec.department },
              { k: "Division", v: rec.division },
              { k: "Organization", v: rec.organization },
              { k: "Cost Center", v: rec.costCenter },
              { k: "Region", v: rec.region },
              { k: "Executive Sponsor", v: rec.executiveSponsor, sample: true },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.notes}
          </div>
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Workspaces", v: ws.length, sample: true },
              { k: "Production", v: countEnv("Production"), sample: true },
              { k: "Development", v: countEnv("Development"), sample: true },
              { k: "Sandbox", v: countEnv("Sandbox"), sample: true },
              { k: "Archived", v: archived, sample: true },
              { k: "Annual Cost", v: money(rec.annualSpend), sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Organization (hierarchy + org displays) ──
const ORGANIZATION_SUBS = [
  {
    id: "organizational-ownership-hierarchy",
    label: "Organizational ownership hierarchy",
  },
  { id: "organization-details", label: "Organization details" },
];
function OrganizationTab({ rec }: { rec: OwnershipRecord }) {
  const [sub, setSub] = React.useState("organizational-ownership-hierarchy");
  return (
    <>
      <Tabs tabs={ORGANIZATION_SUBS} active={sub} onChange={setSub} />

      {sub === "organization-details" && (
        <Section title="Organization details" sample>
          <StatRow label="Division" value={rec.division} sample />
          <StatRow label="Business Unit" value={rec.businessUnit} sample />
          <StatRow label="Department" value={rec.department} sample />
          <StatRow label="Program" value={rec.program} sample />
          <StatRow label="Portfolio" value={rec.portfolio} sample />
        </Section>
      )}
    </>
  );
}

// ── Assigned Workspaces ──
function WorkspacesTab({ rec }: { rec: OwnershipRecord }) {
  const cols: Column<OwnedWorkspace>[] = [
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
          <LayoutGrid size={13} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "env",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "compliance",
      header: "Compliance",
      sortValue: (r) => r.compliance,
      render: (r) => (
        <span
          style={{ color: r.compliance >= 85 ? T.success : T.warning }}
        >{`${r.compliance}%`}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "cost",
      header: "Monthly Cost",
      sortValue: (r) => r.monthlyCost,
      render: (r) => money(r.monthlyCost),
    },
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<Plus size={13} />}>Assign Workspace</HeaderButton>
        <HeaderButton icon={<ArrowLeftRight size={13} />}>
          Transfer
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable
        columns={cols}
        rows={rec.ownedWorkspaces}
        initialSort={{ key: "name", dir: "asc" }}
      />
    </>
  );
}

// ── Financial Ownership ──
const FINANCIAL_SUBS = [
  { id: "financial-accountability", label: "Financial accountability" },
  { id: "financial-statistics", label: "Financial statistics" },
];
function FinancialTab({ rec }: { rec: OwnershipRecord }) {
  const [sub, setSub] = React.useState("financial-accountability");
  return (
    <>
      <Tabs tabs={FINANCIAL_SUBS} active={sub} onChange={setSub} />
      {sub === "financial-accountability" && (
        <Section title="Financial accountability" sample>
          <KVGrid
            items={[
              { k: "Cost Center", v: rec.costCenter, sample: true },
              { k: "Budget Owner", v: rec.budgetOwner, sample: true },
              {
                k: "Chargeback Profile",
                v: rec.chargebackProfile,
                sample: true,
              },
              { k: "Billing Account", v: rec.billingAccount, sample: true },
              { k: "Business Code", v: rec.businessCode, sample: true },
              { k: "Project Code", v: rec.projectCode, sample: true },
              { k: "Funding Model", v: rec.fundingModel, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "financial-statistics" && (
        <Section title="Financial statistics" sample>
          <StatRow
            label="Monthly Spend"
            value={money(rec.monthlySpend)}
            sample
          />
          <StatRow label="Annual Spend" value={money(rec.annualSpend)} sample />
          <StatRow label="Forecast" value={money(rec.forecast)} sample />
          <StatRow
            label="Allocated Budget"
            value={money(rec.allocatedBudget)}
            sample
          />
          <StatRow
            label="Remaining Budget"
            value={money(rec.remainingBudget)}
            tone={rec.remainingBudget >= 0 ? "ok" : "danger"}
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Governance ──
const GOVERNANCE_SUBS = [
  { id: "governance-responsibilities", label: "Governance responsibilities" },
  { id: "governance-scope", label: "Governance scope" },
];
function GovernanceTab({ rec }: { rec: OwnershipRecord }) {
  const [sub, setSub] = React.useState("governance-responsibilities");
  return (
    <>
      <Tabs tabs={GOVERNANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "governance-responsibilities" && (
        <Section title="Governance responsibilities" sample>
          <StatRow
            label="Compliance Accountability"
            value={rec.complianceAccountability}
            sample
          />
          <StatRow label="Risk Ownership" value={rec.riskOwner} sample />
          <StatRow label="Policy Ownership" value={rec.policyOwner} sample />
          <StatRow label="Data Ownership" value={rec.dataOwner} sample />
          <StatRow label="AI Governance" value={rec.aiGovernanceOwner} sample />
          <StatRow
            label="Operational Governance"
            value={rec.operationalGovernanceOwner}
            sample
          />
          <StatRow
            label="Executive Oversight"
            value={rec.executiveOversight}
            sample
          />
        </Section>
      )}
      {sub === "governance-scope" && (
        <Section title="Governance scope" sample>
          <KVGrid
            items={[
              {
                k: "Applicable Policies",
                v: rec.applicablePolicies.join(", "),
                sample: true,
              },
              {
                k: "Compliance Programs",
                v: rec.compliancePrograms.join(", "),
                sample: true,
              },
              {
                k: "Risk Level",
                v: (
                  <span style={{ color: RISK_TONE[rec.riskLevel] }}>
                    {rec.riskLevel}
                  </span>
                ),
                sample: true,
              },
              {
                k: "Regulatory Scope",
                v: rec.regulatoryScope.join(", "),
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Activity timeline (spec §Activity) ──
function ActivityTab() {
  const events = [
    { label: "Business Owner Assigned", category: "Ownership", Icon: Crown },
    { label: "Department Changed", category: "Organization", Icon: Network },
    { label: "Budget Updated", category: "Financial", Icon: DollarSign },
    { label: "Workspace Added", category: "Workspaces", Icon: Plus },
    { label: "Workspace Removed", category: "Workspaces", Icon: Trash2 },
    {
      label: "Ownership Transferred",
      category: "Ownership",
      Icon: ArrowLeftRight,
    },
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Select
          label="Actor"
          value=""
          onChange={() => {}}
          options={FACET_ALL}
        />
        <Select
          label="Category"
          value=""
          onChange={() => {}}
          options={FACET_ALL}
        />
        <Select label="Date" value="" onChange={() => {}} options={FACET_ALL} />
        <SampleTag />
      </div>
      {events.map((e, i) => (
        <div
          key={e.label}
          style={{
            display: "flex",
            gap: 12,
            padding: "10px 0",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--cg-accent-bg-strong)",
              color: T.accent,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <e.Icon size={13} />
          </span>
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e.label}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {e.category} · {pick(EXEC_SPONSORS, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

const FACET_ALL = [{ value: "", label: "All" }];

// ── Audit History (immutable) ──
function AuditTab() {
  const events = [
    "Business Ownership Assigned",
    "Business Ownership Updated",
    "Department Changed",
    "Cost Center Updated",
    "Executive Sponsor Changed",
    "Workspace Assigned",
    "Workspace Removed",
    "Ownership Transferred",
  ];
  return (
    <>
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
        <ShieldCheck size={14} /> Read-only immutable log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow
          key={e}
          label={e}
          value={`${pick(OWNERS, i)} · 2026-08-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

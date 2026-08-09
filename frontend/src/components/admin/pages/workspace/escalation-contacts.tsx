/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Ownership & Administration → Escalation Contacts */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Copy,
  Upload,
  Download,
  RefreshCcw,
  ShieldCheck,
  Siren,
  ClipboardCheck,
  Check,
  Ban,
  User,
  Users,
  Bell,
  Clock,
  GitBranch,
  History,
  Send,
  Eye,
  AlertTriangle,
  LayoutGrid,
  MapPin,
  Activity as ActivityIcon,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  Card,
  StatRow,
  KVGrid,
  HeaderButton,
  Select,
  EmptyState,
  SampleTag,
  SideRailDrawer,
  RowMenu,
  ScopeBadge,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Escalation Contacts — the individuals, teams, and on-call groups notified or engaged when workspace
 * events require escalation. Authoritative spec:
 * docs/workspace/workspace_module/…/02_Ownership & Administration/escalation_contacts.md.
 *
 * Unlike Workspace Owners (accountable) or Delegated Administrators (operate), Escalation Contacts
 * exist solely to route incidents, approvals, operational failures, security events, compliance
 * issues and business-critical situations to the right stakeholders. They are consumed across the
 * platform by automation, monitoring, incident management, compliance workflows, AI agents, support
 * and notifications. Reuses the Enterprise-Administration UX pattern shared with the Users module
 * (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Escalation Contact Detail
 * Drawer with 7 sub-tabs), plus the Operational Dashboard and Coverage Map from the spec.
 *
 * There is no contacts backend yet, so the contact set is representative sample data (tagged `Sample`
 * in the UI). When the escalation registry lands, swap SAMPLE_CONTACTS for the live query — the
 * component API stays identical.
 */

// ── Status model ──────────────────────────────────────────────────────────────────────────────────
type Status = "Active" | "Disabled" | "Draft" | "Archived";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Disabled: T.textMuted,
  Draft: T.warning,
  Archived: T.textMuted,
};

// ── Second-level sub-navigation (spec Navigation tree) ────────────────────────────────────────────
const VIEW_TABS = [
  { id: "active", label: "Active Contacts" },
  { id: "groups", label: "Escalation Groups" },
  { id: "oncall", label: "On-Call Schedules" },
  { id: "notification", label: "Notification Policies" },
  { id: "escalation", label: "Escalation Policies" },
  { id: "emergency", label: "Emergency Contacts" },
  { id: "external", label: "External Contacts" },
  { id: "archived", label: "Archived" },
];

// ── Domain vocabularies (spec) ────────────────────────────────────────────────────────────────────
// Role = the escalation domain (spec "Escalation Categories").
const ROLES = [
  "Security",
  "Compliance",
  "Cloud",
  "Infrastructure",
  "Workspace",
  "AI",
  "Support",
  "Commercial",
  "Identity",
  "Platform",
  "Executive",
];
// Category = the escalation scenario (spec Purpose "Examples").
const CATEGORIES = [
  "Security Incident",
  "Compliance Escalation",
  "Executive Escalation",
  "Production Outage",
  "AI Safety Incident",
  "Cloud Service Failure",
  "Critical Vulnerability",
  "Business Continuity Event",
  "Support Escalation",
  "Billing Escalation",
];
const CONTACT_TYPES = ["Person", "Team", "On-Call Group"];
const WORKSPACES = [
  "Production",
  "Payments Prod",
  "Platform Core",
  "Data Lake",
  "Retail Pre-prod",
  "Security Ops",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const AVAILABILITY = [
  "24x7",
  "Business Hours",
  "Regional Coverage",
  "Follow-the-Sun",
];
const PRIORITIES = ["P1", "P2", "P3", "P4"];
const DEPARTMENTS = [
  "Security Operations",
  "Governance, Risk & Compliance",
  "Cloud Platform",
  "Site Reliability",
  "AI Safety",
  "Customer Support",
  "Finance",
  "Executive Office",
];
const TEAMS = [
  "SOC",
  "GRC Team",
  "Cloud Ops Bridge",
  "SRE On-Call",
  "AI Safety Council",
  "Support Tier-3",
  "Billing Desk",
  "Executive On-Call",
];
const CONTACT_NAMES = [
  "SOC On-Call",
  "Compliance Team",
  "Executive On-Call",
  "Platform SRE",
  "AI Safety Council",
  "Cloud Ops Bridge",
  "Vulnerability Response",
  "BC/DR Coordinator",
  "Support Tier-3",
  "Billing Desk",
  "Identity Response",
  "Network NOC",
  "Data Protection Officer",
  "Payments War Room",
];
const ACTORS = [
  "David Chen",
  "Aisha Khan",
  "Tomás Silva",
  "Priya Nair",
  "Marco Rossi",
];

// Notification methods (spec Notification Routing → Methods).
const NOTIFICATION_METHODS = [
  "Email",
  "SMS",
  "Voice Call",
  "Microsoft Teams",
  "Slack",
  "PagerDuty",
  "ServiceNow",
  "Webhook",
  "Push Notification",
];
// Priority routing SLA (spec Notification Routing → Priority Routing).
const PRIORITY_ROUTING: { priority: string; sla: string }[] = [
  { priority: "P1", sla: "Immediate" },
  { priority: "P2", sla: "15 Minutes" },
  { priority: "P3", sla: "1 Hour" },
  { priority: "P4", sla: "Business Hours" },
];
// Responsibilities categories (spec Responsibilities).
const RESPONSIBILITY_CATEGORIES = [
  "Security Incidents",
  "Compliance",
  "Cloud Operations",
  "Platform Operations",
  "AI Safety",
  "Workspace Administration",
  "Support",
  "Billing",
  "Business Continuity",
  "Executive Escalation",
];
// Supported escalation rules (spec Escalation Rules → Supported Rules).
const ESCALATION_RULES = [
  "No Response",
  "Severity",
  "Category",
  "Business Hours",
  "After Hours",
  "Repeated Failures",
  "SLA Breach",
];
// Escalation ladder (spec Escalation Rules → Visualization).
const ESCALATION_LADDER = [
  "Alert",
  "Primary Contact",
  "Timeout",
  "Secondary Contact",
  "Manager",
  "Executive",
];
// Coverage Map core categories (spec Coverage Map visualization).
const COVERAGE_CORE = [
  "Security",
  "Compliance",
  "Operations",
  "Support",
  "Executive",
  "Business",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Map a role (escalation domain) onto a Coverage-Map core category.
function coreOf(role: string): string {
  switch (role) {
    case "Security":
    case "Identity":
      return "Security";
    case "Compliance":
      return "Compliance";
    case "Support":
      return "Support";
    case "Executive":
      return "Executive";
    case "Commercial":
      return "Business";
    default:
      return "Operations"; // Cloud, Infrastructure, Workspace, AI, Platform
  }
}

interface ContactRecord {
  id: string;
  contact: string;
  contactType: string;
  role: string;
  category: string;
  workspace: string;
  businessUnit: string;
  department: string;
  team: string;
  priority: string;
  availability: string;
  status: Status;
  email: string;
  phone: string;
  onCall: boolean;
  emergency: boolean;
  external: boolean;
  hasNotificationPolicy: boolean;
  hasEscalationPolicy: boolean;
  primaryContact: string;
  secondaryContact: string;
  rotation: string;
  timezone: string;
  businessHours: string;
  holidaySchedule: string;
  backupContact: string;
  created: string;
  modified: string;
  activeEscalations: number;
  avgResponseMin: number;
  acknowledgements: number;
  resolvedIncidents: number;
  failedNotifications: number;
}

// Deterministic representative contact set.
const SAMPLE_CONTACTS: ContactRecord[] = Array.from({ length: 14 }, (_, i) => {
  const id = `ESC-${(1040 + i * 3).toString().padStart(6, "0")}`;
  const n = hashId(id);
  const contact = pick(CONTACT_NAMES, i);
  const contactType = pick(CONTACT_TYPES, n);
  const status = pick<Status>(
    ["Active", "Active", "Active", "Disabled", "Draft", "Archived"],
    n,
  );
  const role = pick(ROLES, n);
  return {
    id,
    contact,
    contactType,
    role,
    category: pick(CATEGORIES, n),
    workspace: pick(WORKSPACES, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    department: pick(DEPARTMENTS, n),
    team: pick(TEAMS, n >> 3),
    priority: pick(PRIORITIES, n),
    availability: pick(AVAILABILITY, n >> 2),
    status,
    email: `${contact.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@corp.example`,
    phone: `+1-555-0${(100 + (n % 899)).toString()}`,
    onCall: n % 2 === 0,
    emergency: n % 4 === 0,
    external: n % 5 === 0,
    hasNotificationPolicy: n % 3 !== 0,
    hasEscalationPolicy: n % 3 !== 1,
    primaryContact: pick(ACTORS, n),
    secondaryContact: pick(ACTORS, n + 1),
    rotation: pick(["Weekly", "Bi-weekly", "Daily", "Monthly"], n),
    timezone: pick(
      ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"],
      n,
    ),
    businessHours: "09:00–17:00 local",
    holidaySchedule: pick(["Standard", "Follow-the-Sun override", "None"], n),
    backupContact: pick(ACTORS, n + 2),
    created: `2026-05-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    modified: `2026-08-${(1 + ((n + 4) % 27)).toString().padStart(2, "0")}`,
    activeEscalations: n % 5,
    avgResponseMin: 3 + (n % 22),
    acknowledgements: 12 + (n % 80),
    resolvedIncidents: 4 + (n % 60),
    failedNotifications: n % 6 === 0 ? 1 + (n % 3) : 0,
  };
});

// View id → predicate over a contact (drives the second-level sub-nav).
const VIEW_PREDICATE: Record<string, (r: ContactRecord) => boolean> = {
  active: (r) => r.status === "Active",
  groups: (r) => r.contactType !== "Person",
  oncall: (r) => r.onCall,
  notification: (r) => r.hasNotificationPolicy,
  escalation: (r) => r.hasEscalationPolicy,
  emergency: (r) => r.emergency,
  external: (r) => r.external,
  archived: (r) => r.status === "Archived",
};

const PRIORITY_TONE: Record<string, string> = {
  P1: T.danger,
  P2: T.warning,
  P3: T.textNav,
  P4: T.textMuted,
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
 * Embeddable body — Operational Dashboard + Coverage Map + sub-navigation + directory + escalation
 * contact detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone
 * route and as a tab of the Workspace Management console. Uses local state for the view sub-nav so it
 * never collides with a host page's `?tab=`.
 */
export function EscalationContactsView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("active");

  const [search, setSearch] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fRole, setFRole] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOnCall, setFOnCall] = React.useState("");
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

  const records = SAMPLE_CONTACTS;
  const viewPred = VIEW_PREDICATE[tab] ?? (() => true);

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      viewPred(r) &&
      (!q ||
        r.contact.toLowerCase().includes(q) ||
        r.team.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fCategory || r.category === fCategory) &&
      (!fRole || r.role === fRole) &&
      (!fType || r.contactType === fType) &&
      (!fPriority || r.priority === fPriority) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOnCall || (fOnCall === "On-Call" ? r.onCall : !r.onCall)) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFWorkspace("");
    setFCategory("");
    setFRole("");
    setFType("");
    setFPriority("");
    setFBu("");
    setFOnCall("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard metrics (spec Operational Dashboard) ──
  const activeCount = records.filter((r) => r.status === "Active").length;
  const onCallCount = records.filter((r) => r.onCall).length;
  const emergencyCount = records.filter((r) => r.emergency).length;
  const failedNotifications = records.reduce(
    (a, r) => a + r.failedNotifications,
    0,
  );
  const recentEscalations = records.reduce(
    (a, r) => a + r.activeEscalations,
    0,
  );
  const avgResponse = Math.round(
    records.reduce((a, r) => a + r.avgResponseMin, 0) / records.length,
  );
  // Coverage Map: is each core category covered by ≥1 active contact?
  const coverage = COVERAGE_CORE.map((core) => {
    const count = records.filter(
      (r) => r.status === "Active" && coreOf(r.role) === core,
    ).length;
    return { core, count, covered: count > 0 };
  });
  const coverageGaps = coverage.filter((c) => !c.covered).length;

  // ── Toolbar (spec Toolbar: Add + Administrative + Governance actions) ──
  const toolbar: CommandItem[] = [
    {
      key: "add",
      label: "Add Escalation Contact",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=escalation"),
    },
    { key: "edit", label: "Edit", icon: <Pencil size={15} />, disabled: true },
    { key: "clone", label: "Clone", icon: <Copy size={15} />, disabled: true },
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
      onClick: () => {},
    },
    {
      key: "validate",
      label: "Validate Coverage",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "test",
      label: "Test Escalation",
      icon: <Siren size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Review Contacts",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
  ];

  // ── Table columns (spec Table: Contact · Role · Category · Workspace · Priority · Availability · Status) ──
  const cols: Column<ContactRecord>[] = [
    {
      key: "contact",
      header: "Contact",
      sortValue: (r) => r.contact,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {r.contactType === "Person" ? (
            <User size={14} color={T.textMuted} />
          ) : (
            <Users size={14} color={T.textMuted} />
          )}
          {r.contact}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (r) => r.role,
      render: (r) => r.role,
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      render: (r) => r.category,
    },
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => (
        <span
          style={{
            color: T.textNav,
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
      key: "priority",
      header: "Priority",
      sortValue: (r) => PRIORITIES.indexOf(r.priority),
      render: (r) => (
        <span style={{ color: PRIORITY_TONE[r.priority] }}>{r.priority}</span>
      ),
    },
    {
      key: "availability",
      header: "Availability",
      sortValue: (r) => r.availability,
      render: (r) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: T.textNav,
          }}
        >
          <Clock size={13} color={T.textMuted} />
          {r.availability}
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

  return (
    <>
      {/* ── Operational Dashboard (spec) ── */}
      <Card
        title="Operational dashboard"
        desc="Live escalation-contact posture across the organization — coverage, on-call reach, and notification reliability."
        right={<SampleTag />}
      >
        <PostureGrid>
          <PostureCard
            title="Active Contacts"
            value={activeCount}
            sub="Enabled escalation contacts"
            tone="ok"
          />
          <PostureCard
            title="Coverage Gaps"
            value={coverageGaps}
            sub="Core categories with no active contact"
            tone={coverageGaps > 0 ? "danger" : "ok"}
          />
          <PostureCard
            title="On-Call Coverage"
            value={`${onCallCount}/${records.length}`}
            sub="Contacts currently on a rotation"
            tone={onCallCount > 0 ? "ok" : "warn"}
          />
          <PostureCard
            title="Recent Escalations"
            value={recentEscalations}
            sub="Triggered in the last 30 days"
            tone="muted"
          />
          <PostureCard
            title="Average Response Time"
            value={`${avgResponse}m`}
            sub="Acknowledgement latency (P1–P4)"
            tone={avgResponse <= 15 ? "ok" : "warn"}
          />
          <PostureCard
            title="Failed Notifications"
            value={failedNotifications}
            sub="Delivery failures needing review"
            tone={failedNotifications > 0 ? "danger" : "ok"}
          />
          <PostureCard
            title="Emergency Contacts"
            value={emergencyCount}
            sub="Break-glass responders"
            tone="muted"
          />
        </PostureGrid>
      </Card>

      {/* ── Coverage Map (spec) ── */}
      <Card
        title="Coverage map"
        desc="Whether every escalation category has at least one assigned active contact for the workspace."
        right={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: T.textMuted,
              fontSize: 12,
            }}
          >
            <MapPin size={14} /> Workspace → categories <SampleTag />
          </span>
        }
      >
        <PostureGrid>
          {coverage.map((c) => (
            <PostureCard
              key={c.core}
              title={c.core}
              value={c.covered ? `${c.count} assigned` : "No contact"}
              sub={c.covered ? "Category covered" : "Coverage gap"}
              tone={c.covered ? "ok" : "danger"}
            />
          ))}
        </PostureGrid>
      </Card>

      {/* ── Second-level sub-nav as the first FilterBar-style facet (spec Navigation) ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <DiscoveryListView
        title="Escalation contacts"
        commands={toolbar}
        pills={[
          {
            key: "workspace",
            label: "Workspace",
            value: fWorkspace,
            onChange: setFWorkspace,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "category",
            label: "Category",
            value: fCategory,
            onChange: setFCategory,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "role",
            label: "Role",
            value: fRole,
            onChange: setFRole,
            options: facet(records.map((r) => r.role)),
          },
          {
            key: "type",
            label: "Contact Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.contactType)),
          },
          {
            key: "priority",
            label: "Priority",
            value: fPriority,
            onChange: setFPriority,
            options: facet(records.map((r) => r.priority)),
          },
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "oncall",
            label: "On-Call",
            value: fOnCall,
            onChange: setFOnCall,
            options: [
              { value: "", label: "All" },
              { value: "On-Call", label: "On-Call" },
              { value: "Not On-Call", label: "Not On-Call" },
            ],
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All contacts", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search escalation contacts — person, team, workspace, category, email, phone…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "priority", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Check size={13} />} onClick={clear}>
              Enable ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Ban size={13} />} onClick={clear}>
              Disable
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
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Test Notification", onClick: () => setSelId(r.id) },
              {
                label: "Disable",
                onClick: () => setSelId(r.id),
                danger: true,
              },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Bell size={20} />}
            title="No escalation contacts configured."
            hint="Add an escalation contact or import contacts so critical events are routed to the right stakeholders."
            cta="Add Escalation Contact"
            onCta={() => navigate("/admin/workspaces?tab=escalation")}
          />
        }
      />

      {sel && <ContactDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function EscalationContactsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Escalation Contacts"
        subtitle="Manage workspace escalation contacts, notification routing, emergency responders, and operational escalation policies."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=escalation")}
            >
              Add Escalation Contact
            </HeaderButton>
          </>
        }
      />
      <EscalationContactsView />
    </Page>
  );
}

// ════════════ Escalation Contact Detail Drawer — 7 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "responsibilities",
    label: "Responsibilities",
    icon: <ShieldCheck size={13} />,
  },
  { id: "routing", label: "Notification Routing", icon: <Bell size={13} /> },
  { id: "oncall", label: "On-Call Schedule", icon: <Clock size={13} /> },
  { id: "rules", label: "Escalation Rules", icon: <GitBranch size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ContactDetailDrawer({
  rec,
  onClose,
}: {
  rec: ContactRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.contact} · ${rec.role}`}
      subtitle={`${rec.priority} · ${rec.availability} · ${rec.status}`}
      width={740}
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
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<Siren size={13} />}>Test</HeaderButton>
          <HeaderButton variant="primary" icon={<Pencil size={13} />}>
            Edit
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "responsibilities" && <ResponsibilitiesTab rec={rec} />}
      {tab === "routing" && <RoutingTab rec={rec} />}
      {tab === "oncall" && <OnCallTab rec={rec} />}
      {tab === "rules" && <RulesTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

function Section({
  title,
  children,
  sample,
  right,
}: {
  title: string;
  children: React.ReactNode;
  sample?: boolean;
  right?: React.ReactNode;
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
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {title}
          {sample && <SampleTag />}
        </span>
        {right}
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
function OverviewTab({ rec }: { rec: ContactRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Contact", v: rec.contact },
              { k: "Role", v: rec.role },
              { k: "Team", v: rec.team, sample: true },
              { k: "Department", v: rec.department, sample: true },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Workspace", v: rec.workspace },
              { k: "Priority", v: rec.priority },
              { k: "Status", v: rec.status },
              { k: "Created", v: rec.created, sample: true },
              { k: "Modified", v: rec.modified, sample: true },
            ]}
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              fontSize: 12,
              color: T.textMuted,
              paddingTop: 6,
            }}
          >
            <span>Email: {rec.email}</span>
            <span>Phone: {rec.phone}</span>
            <span>Type: {rec.contactType}</span>
            <span>Category: {rec.category}</span>
          </div>
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={2}
            items={[
              {
                k: "Active Escalations",
                v: rec.activeEscalations,
                sample: true,
              },
              {
                k: "Average Response Time",
                v: `${rec.avgResponseMin} min`,
                sample: true,
              },
              {
                k: "Acknowledgements",
                v: rec.acknowledgements,
                sample: true,
              },
              {
                k: "Resolved Incidents",
                v: rec.resolvedIncidents,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Responsibilities (when this contact is used) ──
function ResponsibilitiesTab({ rec }: { rec: ContactRecord }) {
  const n = hashId(rec.id);
  return (
    <Section
      title="Responsibilities"
      sample
      right={
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>
          Defines when this contact is used
        </span>
      }
    >
      {RESPONSIBILITY_CATEGORIES.map((cat, i) => {
        const assigned = (n + i) % 3 !== 0;
        return (
          <StatRow
            key={cat}
            label={cat}
            value={assigned ? "Assigned" : "Not assigned"}
            tone={assigned ? "ok" : "muted"}
            sample
          />
        );
      })}
    </Section>
  );
}

// ── Notification Routing (methods + priority routing + toolbar) ──
const ROUTING_SUBS = [
  { id: "methods", label: "Methods" },
  { id: "priority-routing", label: "Priority routing" },
];
function RoutingTab({ rec }: { rec: ContactRecord }) {
  const [sub, setSub] = React.useState("methods");
  const n = hashId(rec.id);
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton icon={<Send size={13} />}>Test Notification</HeaderButton>
        <HeaderButton icon={<Eye size={13} />}>Preview Routing</HeaderButton>
        <SampleTag />
      </div>

      <Tabs tabs={ROUTING_SUBS} active={sub} onChange={setSub} />
      {sub === "methods" && (
        <Section title="Methods" sample>
          {NOTIFICATION_METHODS.map((m, i) => {
            const enabled = (n + i) % 3 !== 1;
            return (
              <StatRow
                key={m}
                label={m}
                value={enabled ? "Enabled" : "Disabled"}
                tone={enabled ? "ok" : "muted"}
                sample
              />
            );
          })}
        </Section>
      )}

      {sub === "priority-routing" && (
        <Section title="Priority routing" sample>
          {PRIORITY_ROUTING.map((p) => (
            <StatRow
              key={p.priority}
              label={p.priority}
              value={p.sla}
              tone={p.priority === "P1" ? "danger" : "muted"}
              sample
            />
          ))}
        </Section>
      )}
    </>
  );
}

// ── On-Call Schedule (availability) ──
function OnCallTab({ rec }: { rec: ContactRecord }) {
  return (
    <>
      <Section
        title="On-call schedule"
        sample
        right={
          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>
            Defines contact availability
          </span>
        }
      >
        <KVGrid
          items={[
            { k: "Primary Contact", v: rec.primaryContact, sample: true },
            { k: "Secondary Contact", v: rec.secondaryContact, sample: true },
            { k: "Rotation", v: rec.rotation, sample: true },
            { k: "Timezone", v: rec.timezone, sample: true },
            { k: "Business Hours", v: rec.businessHours, sample: true },
            { k: "Holiday Schedule", v: rec.holidaySchedule, sample: true },
          ]}
        />
      </Section>

      <Section title="Supported coverage models" sample>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AVAILABILITY.map((a) => {
            const on = a === rec.availability;
            return (
              <span
                key={a}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  color: on ? T.accent : T.textNav,
                  border: `1px solid ${on ? "var(--cg-accent)" : T.border}`,
                  background: on ? "var(--cg-accent-bg)" : "transparent",
                }}
              >
                <Clock size={12} />
                {a}
              </span>
            );
          })}
        </div>
      </Section>
    </>
  );
}

// ── Escalation Rules (ladder visualization + supported rules) ──
function RulesTab({ rec }: { rec: ContactRecord }) {
  const n = hashId(rec.id);
  return (
    <>
      <Section
        title="Escalation ladder"
        sample
        right={
          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>
            Defines escalation logic
          </span>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ESCALATION_LADDER.map((step, i) => (
            <React.Fragment key={step}>
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
                {step}
              </div>
              {i < ESCALATION_LADDER.length - 1 && (
                <span
                  style={{
                    color: T.textMuted,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  ↓
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </Section>

      <Section title="Supported rules" sample>
        {ESCALATION_RULES.map((r, i) => {
          const active = (n + i) % 2 === 0;
          return (
            <StatRow
              key={r}
              label={r}
              value={active ? "Enabled" : "Available"}
              tone={active ? "ok" : "muted"}
              sample
            />
          );
        })}
      </Section>

      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        <HeaderButton icon={<AlertTriangle size={13} />}>Escalate</HeaderButton>
        <HeaderButton icon={<Siren size={13} />}>Test Escalation</HeaderButton>
      </div>
    </>
  );
}

// ── Activity timeline (with actor/category/date filters) ──
function ActivityTab() {
  const events = [
    "Contact Added",
    "Notification Sent",
    "Escalation Triggered",
    "Acknowledged",
    "Updated",
    "Disabled",
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
          options={[
            { value: "", label: "Actor: All" },
            ...ACTORS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Category"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Category: All" },
            ...CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Date: Any" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
          ]}
        />
        <SampleTag />
      </div>
      {events.map((e, i) => (
        <div
          key={e}
          style={{
            display: "flex",
            gap: 12,
            padding: "10px 0",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: T.accent,
              marginTop: 5,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {pick(ACTORS, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (immutable) ──
function AuditTab() {
  const events = [
    "Contact Created",
    "Contact Updated",
    "Notification Tested",
    "Escalation Triggered",
    "Schedule Updated",
    "Routing Modified",
    "Contact Disabled",
    "Deleted",
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
          value={`${pick(ACTORS, i)} · 2026-08-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

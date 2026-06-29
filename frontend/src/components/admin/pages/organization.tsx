/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, react/jsx-no-useless-fragment -- CloudGuard Organization (§6) */
import React from "react";
import {
  Plus,
  X,
  Trash2,
  Building2,
  Pencil,
  Download,
  Clock,
  RotateCw,
  ChevronDown,
  Globe,
  Palette,
  Coins,
  Shield,
  Users,
  Tag,
  Activity,
} from "lucide-react";
import { useOrgRoles } from "#/hooks/query/use-cloudguard";
import {
  Page,
  PageHeader,
  Tabs,
  Card,
  StatRow,
  KVGrid,
  DirectoryTable,
  FilterBar,
  HeaderButton,
  ConfirmButton,
  ScopeBadge,
  SampleBanner,
  SampleTag,
  FloorBadge,
  LiveCardSkeleton,
  T,
  type Column,
  useTabParam,
} from "#/components/admin/admin-kit";

/**
 * Organization (§6) — the enterprise's structural model: profile, legal entities, business units,
 * regions, domains, administrative hierarchy, the enterprise default configuration (§6.7 — the top
 * inheritance level every workspace inherits), and organization lifecycle.
 *
 * Live: administrative hierarchy reads /org/roles (the authoritative RBAC roles). Profile, entities,
 * units, regions, domains, defaults and lifecycle persist locally (tagged `Sample`) until
 * admin/org_model.py ships; the structures and CRUD are final.
 */

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "entities", label: "Legal Entities" },
  { id: "units", label: "Business Units" },
  { id: "regions", label: "Regions" },
  { id: "domains", label: "Domains" },
  { id: "hierarchy", label: "Admin Hierarchy" },
  { id: "defaults", label: "Default Configuration" },
  { id: "selfservice", label: "Self-Service & Collaboration" },
  { id: "lifecycle", label: "Lifecycle" },
];

function useLocal<T>(key: string, seed: T): [T, (v: T) => void] {
  const [v, setV] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : seed;
    } catch {
      return seed;
    }
  });
  const set = (nv: T) => {
    setV(nv);
    try {
      localStorage.setItem(key, JSON.stringify(nv));
    } catch {
      /* ignore */
    }
  };
  return [v, set];
}

export function OrganizationPage() {
  const [tab, setTab] = useTabParam("profile");
  return (
    <Page>
      <PageHeader
        title="Organization"
        subtitle="Structure, ownership, regions, domains, default configuration and lifecycle."
        actions={<ScopeBadge scope="Organization" />}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "profile" && <ProfileTab />}
      {tab === "entities" && <EntitiesTab />}
      {tab === "units" && <UnitsTab />}
      {tab === "regions" && <RegionsTab />}
      {tab === "domains" && <DomainsTab />}
      {tab === "hierarchy" && <HierarchyTab />}
      {tab === "defaults" && <DefaultsTab />}
      {tab === "selfservice" && <SelfServiceTab />}
      {tab === "lifecycle" && <LifecycleTab />}
    </Page>
  );
}

// ════════════ §6.2 Legal Entities ════════════
interface Entity {
  id: string;
  name: string;
  jurisdiction: string;
  role: string;
  admins: string;
}
function EntitiesTab() {
  const [list, setList] = useLocal<Entity[]>("cg_org_entities", [
    {
      id: "1",
      name: "Acme Financial Ltd",
      jurisdiction: "Ireland (EU)",
      role: "Data controller",
      admins: "ciso@company.com",
    },
    {
      id: "2",
      name: "Acme US Inc",
      jurisdiction: "Delaware (US)",
      role: "Data processor",
      admins: "us-admin@company.com",
    },
  ]);
  const [edit, setEdit] = React.useState<Entity | null>(null);
  const cols: Column<Entity>[] = [
    {
      key: "n",
      header: "Legal entity",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    { key: "j", header: "Jurisdiction", render: (r) => r.jurisdiction },
    { key: "r", header: "Data role", render: (r) => r.role },
    {
      key: "a",
      header: "Entity admin",
      render: (r) => <span style={{ color: T.textMuted }}>{r.admins}</span>,
    },
  ];
  return (
    <>
      <SampleBanner what="Legal entities" />
      <Card
        title="Legal entities (§6.2)"
        desc="Contracting entities, data-controller/processor roles and jurisdictions."
        right={
          <HeaderButton
            icon={<Plus size={14} />}
            variant="primary"
            onClick={() =>
              setEdit({
                id: `e${Date.now()}`,
                name: "",
                jurisdiction: "",
                role: "Data controller",
                admins: "",
              })
            }
          >
            Add entity
          </HeaderButton>
        }
      >
        <DirectoryTable
          columns={cols}
          rows={list}
          pageSize={10}
          onRowClick={(r) => setEdit(r)}
          rowActions={(r) => (
            <ConfirmButton
              variant="link"
              label={<Trash2 size={13} color={T.danger} />}
              title="Delete entity"
              body={`Remove ${r.name}?`}
              confirmLabel="Delete"
              onConfirm={() => setList(list.filter((x) => x.id !== r.id))}
            />
          )}
        />
      </Card>
      {edit && (
        <Modal
          title={
            list.some((x) => x.id === edit.id)
              ? "Edit legal entity"
              : "Add legal entity"
          }
          onClose={() => setEdit(null)}
          footer={
            <HeaderButton
              variant="primary"
              disabled={!edit.name.trim()}
              onClick={() => {
                setList([...list.filter((x) => x.id !== edit.id), edit]);
                setEdit(null);
              }}
            >
              Save
            </HeaderButton>
          }
        >
          <Field label="Name">
            <input
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              style={inp}
            />
          </Field>
          <Field label="Jurisdiction">
            <input
              value={edit.jurisdiction}
              onChange={(e) =>
                setEdit({ ...edit, jurisdiction: e.target.value })
              }
              style={inp}
            />
          </Field>
          <Field label="Data role">
            <Sel
              value={edit.role}
              onChange={(v) => setEdit({ ...edit, role: v })}
              opts={["Data controller", "Data processor", "Joint controller"]}
            />
          </Field>
          <Field label="Entity admin">
            <input
              value={edit.admins}
              onChange={(e) => setEdit({ ...edit, admins: e.target.value })}
              style={inp}
            />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ════════════ §6.3 Business Units ════════════
interface Unit {
  id: string;
  name: string;
  parent: string;
  owner: string;
  costCentre: string;
  workspaces: number;
}
function UnitsTab() {
  const [list, setList] = useLocal<Unit[]>("cg_org_units", [
    {
      id: "1",
      name: "Payments",
      parent: "—",
      owner: "vp-payments@company.com",
      costCentre: "CC-1001",
      workspaces: 4,
    },
    {
      id: "2",
      name: "Platform",
      parent: "—",
      owner: "vp-platform@company.com",
      costCentre: "CC-1002",
      workspaces: 6,
    },
    {
      id: "3",
      name: "Security",
      parent: "Platform",
      owner: "ciso@company.com",
      costCentre: "CC-1003",
      workspaces: 2,
    },
  ]);
  const [search, setSearch] = React.useState("");
  const [edit, setEdit] = React.useState<Unit | null>(null);
  const rows = list.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase()),
  );
  const cols: Column<Unit>[] = [
    {
      key: "n",
      header: "Business unit",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    { key: "p", header: "Parent", render: (r) => r.parent },
    {
      key: "o",
      header: "Owner",
      render: (r) => <span style={{ color: T.textMuted }}>{r.owner}</span>,
    },
    { key: "c", header: "Cost centre", render: (r) => r.costCentre },
    {
      key: "w",
      header: "Workspaces",
      sortValue: (r) => r.workspaces,
      render: (r) => r.workspaces,
    },
  ];
  return (
    <>
      <SampleBanner what="Business units" />
      <Card
        title="Business units (§6.3)"
        desc="Org hierarchy, owners, cost centres and assigned workspaces."
        right={
          <HeaderButton
            icon={<Plus size={14} />}
            variant="primary"
            onClick={() =>
              setEdit({
                id: `u${Date.now()}`,
                name: "",
                parent: "—",
                owner: "",
                costCentre: "",
                workspaces: 0,
              })
            }
          >
            Add unit
          </HeaderButton>
        }
      >
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search units…"
          count={rows.length}
          total={list.length}
        />
        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={10}
          onRowClick={(r) => setEdit(r)}
          rowActions={(r) => (
            <ConfirmButton
              variant="link"
              label={<Trash2 size={13} color={T.danger} />}
              title="Delete unit"
              body={`Remove ${r.name}?`}
              confirmLabel="Delete"
              onConfirm={() => setList(list.filter((x) => x.id !== r.id))}
            />
          )}
        />
      </Card>
      {edit && (
        <Modal
          title={
            list.some((x) => x.id === edit.id)
              ? "Edit business unit"
              : "Add business unit"
          }
          onClose={() => setEdit(null)}
          footer={
            <HeaderButton
              variant="primary"
              disabled={!edit.name.trim()}
              onClick={() => {
                setList([...list.filter((x) => x.id !== edit.id), edit]);
                setEdit(null);
              }}
            >
              Save
            </HeaderButton>
          }
        >
          <Field label="Name">
            <input
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              style={inp}
            />
          </Field>
          <Field label="Parent unit">
            <Sel
              value={edit.parent}
              onChange={(v) => setEdit({ ...edit, parent: v })}
              opts={["—", ...list.map((u) => u.name)]}
            />
          </Field>
          <Field label="Business owner">
            <input
              value={edit.owner}
              onChange={(e) => setEdit({ ...edit, owner: e.target.value })}
              style={inp}
            />
          </Field>
          <Field label="Cost centre">
            <input
              value={edit.costCentre}
              onChange={(e) => setEdit({ ...edit, costCentre: e.target.value })}
              style={inp}
            />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ════════════ §6.4 Regions ════════════
function RegionsTab() {
  const [approved, setApproved] = useLocal<string[]>("cg_org_regions_ok", [
    "eu-west-1",
    "eu-central-1",
  ]);
  const [restricted, setRestricted] = useLocal<string[]>("cg_org_regions_no", [
    "us-east-1",
    "ap-southeast-1",
  ]);
  const [na, setNa] = React.useState("");
  const [nr, setNr] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  return (
    <>
      <OrgTabActionBar
        title="Regions"
        exportName="org-regions"
        exportData={{ approved, restricted }}
        onRefresh={() => {}}
        edit={{
          editing,
          dirty: editing,
          onEdit: () => setEditing(true),
          onSave: () => setEditing(false),
          onCancel: () => setEditing(false),
        }}
        values={[
          { k: "Approved regions", v: approved.join(", ") || "—" },
          { k: "Restricted regions", v: restricted.join(", ") || "—" },
        ]}
      />
      <fieldset
        disabled={!editing}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <Card
          title="Approved operating regions (§6.4)"
          desc="Where the organization permits processing and storage. This is the residency floor for workspaces."
        >
          <ChipEdit
            items={approved}
            onAdd={(v) => setApproved([...approved, v])}
            onRemove={(v) => setApproved(approved.filter((x) => x !== v))}
            value={na}
            setValue={setNa}
            placeholder="e.g. eu-north-1"
            tone="ok"
          />
        </Card>
        <Card
          title="Restricted regions (floor)"
          desc="Prohibited for processing, storage or model inference."
        >
          <ChipEdit
            items={restricted}
            onAdd={(v) => setRestricted([...restricted, v])}
            onRemove={(v) => setRestricted(restricted.filter((x) => x !== v))}
            value={nr}
            setValue={setNr}
            placeholder="e.g. cn-north-1"
            tone="danger"
          />
        </Card>
        <Card title="On-premise & private locations">
          <StatRow
            label="Dublin DC (primary)"
            value="Private cloud · EU"
            tone="ok"
            sample
          />
          <StatRow
            label="Frankfurt DC (DR)"
            value="Private cloud · EU"
            tone="ok"
            sample
          />
        </Card>
      </fieldset>
    </>
  );
}

// ════════════ §6.5 Domains ════════════
interface Domain {
  id: string;
  domain: string;
  kind: string;
  status: "verified" | "pending";
}
function DomainsTab() {
  const [list, setList] = useLocal<Domain[]>("cg_org_domains", [
    { id: "1", domain: "company.com", kind: "Email + IdP", status: "verified" },
    { id: "2", domain: "acme.com", kind: "Email", status: "verified" },
  ]);
  const [nd, setNd] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const cols: Column<Domain>[] = [
    {
      key: "d",
      header: "Domain",
      sortValue: (r) => r.domain,
      render: (r) => (
        <span style={{ color: T.textPrimary, fontFamily: "monospace" }}>
          {r.domain}
        </span>
      ),
    },
    { key: "k", header: "Use", render: (r) => r.kind },
    {
      key: "s",
      header: "Verification",
      render: (r) => (
        <span
          style={{ color: r.status === "verified" ? T.success : T.warning }}
        >
          ● {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <OrgTabActionBar
        title="Domains"
        exportName="org-domains"
        exportData={list}
        onRefresh={() => {}}
        edit={{
          editing,
          dirty: editing,
          onEdit: () => setEditing(true),
          onSave: () => setEditing(false),
          onCancel: () => setEditing(false),
        }}
        values={[
          { k: "Verified domains", v: list.map((d) => d.domain).join(", ") },
        ]}
      />
      <Card
        title="Verified domains (§6.5)"
        desc="Email, identity-provider and trusted domains. Verify via DNS TXT before a domain is trusted for SSO/JIT."
      >
        <DirectoryTable
          columns={cols}
          rows={list}
          pageSize={10}
          rowActions={(r) =>
            !editing ? null : r.status === "pending" ? (
              <HeaderButton
                onClick={() =>
                  setList(
                    list.map((x) =>
                      x.id === r.id ? { ...x, status: "verified" } : x,
                    ),
                  )
                }
              >
                Verify
              </HeaderButton>
            ) : (
              <ConfirmButton
                variant="link"
                label={<Trash2 size={13} color={T.danger} />}
                title="Remove domain"
                body={`Remove ${r.domain}?`}
                confirmLabel="Remove"
                onConfirm={() => setList(list.filter((x) => x.id !== r.id))}
              />
            )
          }
        />
        <div
          style={{
            display: editing ? "flex" : "none",
            gap: 8,
            padding: "10px 0",
          }}
        >
          <input
            value={nd}
            onChange={(e) => setNd(e.target.value)}
            placeholder="add-domain.com"
            style={inp}
          />
          <HeaderButton
            icon={<Plus size={14} />}
            disabled={!nd.trim()}
            onClick={() => {
              setList([
                ...list,
                {
                  id: `d${Date.now()}`,
                  domain: nd.trim(),
                  kind: "Email",
                  status: "pending",
                },
              ]);
              setNd("");
            }}
          >
            Add domain
          </HeaderButton>
        </div>
      </Card>
    </>
  );
}

// ════════════ §6.6 Admin Hierarchy (LIVE roles) ════════════
function HierarchyTab() {
  const q = useOrgRoles();
  const roles = q.data?.roles ?? [];
  const adminRoles = roles.filter(
    (r) =>
      r.role.toLowerCase().includes("admin") ||
      r.role.toLowerCase().includes("owner") ||
      r.capabilities.includes("admin"),
  );
  const cols: Column<(typeof roles)[number] & { id: string }>[] = [
    {
      key: "r",
      header: "Administrative role",
      sortValue: (r) => r.role,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.role}</span>,
    },
    {
      key: "c",
      header: "Capabilities",
      render: (r) => (
        <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
          {r.capabilities.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 11,
                color: T.textNav,
                background: T.badgeBg,
                borderRadius: 99,
                padding: "1px 8px",
              }}
            >
              {c}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "t",
      header: "Max tier",
      render: (r) => (
        <span style={{ color: r.max_tier >= 4 ? T.danger : T.textNav }}>
          T{r.max_tier}
        </span>
      ),
    },
    {
      key: "n",
      header: "Assigned",
      render: () => (
        <span style={{ color: T.textMuted }}>
          —<SampleTag />
        </span>
      ),
    },
  ];
  return (
    <>
      <OrgTabActionBar
        title="Admin Hierarchy"
        exportName="org-admin-hierarchy"
        exportData={adminRoles}
        onRefresh={() => q.refetch()}
        values={[
          { k: "Administrative roles", v: String(adminRoles.length) },
          { k: "Source", v: "cloudguard.rbac (live)" },
        ]}
      />
      <Card
        title="Administrative hierarchy (§6.6)"
        desc="The administrative roles enforced by the engine (live from cloudguard.rbac), from org-wide to delegated. Assignments are managed in Identity → Role Assignments."
      >
        {q.isLoading ? (
          <LiveCardSkeleton lines={5} />
        ) : (
          <DirectoryTable
            columns={cols}
            rows={adminRoles.map((r) => ({ ...r, id: r.role }))}
            initialSort={{ key: "t", dir: "desc" }}
            pageSize={12}
          />
        )}
      </Card>
    </>
  );
}

// ════════════ §6.7 Default Configuration (enterprise inheritance level) ════════════
function DefaultsTab() {
  const seed = {
    region: "eu-west-1",
    retention: 365,
    sandboxProfile: "Standard",
    autonomy: "ask",
    minApprovers: 2,
    network: "allowlist",
    monthlyBudget: 5000,
  };
  const [form, setForm] = useLocal("cg_org_defaults", seed);
  const [base, setBase] = React.useState(form);
  const [editing, setEditing] = React.useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
          padding: "11px 14px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.cardBg,
          marginBottom: 18,
        }}
      >
        <Building2
          size={15}
          color={T.accent}
          style={{ marginTop: 1, flexShrink: 0 }}
        />
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
          This is the{" "}
          <strong style={{ color: T.textNav }}>
            enterprise default configuration (§6.7)
          </strong>{" "}
          — the top of the inheritance chain. Every new workspace inherits these
          unless a more-restrictive value is set below. Mark a value mandatory
          to make it a floor workspaces cannot weaken.
        </div>
      </div>
      <OrgTabActionBar
        title="Default Configuration"
        exportName="org-default-configuration"
        exportData={form}
        onRefresh={() => setForm(base)}
        edit={{
          editing,
          dirty,
          onEdit: () => setEditing(true),
          onSave: () => {
            setBase(form);
            setEditing(false);
          },
          onCancel: () => {
            setForm(base);
            setEditing(false);
          },
        }}
        values={[
          { k: "Default region", v: String(form.region) },
          { k: "Retention", v: `${form.retention} days` },
          { k: "Execution mode", v: String(form.autonomy) },
          { k: "Min approvers", v: String(form.minApprovers) },
        ]}
      />
      <Card title="Defaults inherited by every workspace">
        <fieldset
          disabled={!editing}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <SelRow
            label="Default region"
            value={form.region}
            onChange={(v) => setForm({ ...form, region: v })}
            opts={["eu-west-1", "eu-central-1", "us-east-1"]}
            floor="mandatory"
          />
          <NumRowD
            label="Default evidence retention (days)"
            value={form.retention}
            onChange={(v) => setForm({ ...form, retention: v })}
            floor="mandatory ≥"
          />
          <SelRow
            label="Default sandbox profile"
            value={form.sandboxProfile}
            onChange={(v) => setForm({ ...form, sandboxProfile: v })}
            opts={["Isolated", "Standard", "Elevated"]}
          />
          <SelRow
            label="Default autonomy mode"
            value={form.autonomy}
            onChange={(v) => setForm({ ...form, autonomy: v })}
            opts={["autonomous", "ask", "plan"]}
            floor="mandatory"
          />
          <NumRowD
            label="Default minimum approvers"
            value={form.minApprovers}
            onChange={(v) => setForm({ ...form, minApprovers: v })}
            floor="mandatory ≥"
          />
          <SelRow
            label="Default network policy"
            value={form.network}
            onChange={(v) => setForm({ ...form, network: v })}
            opts={["deny-all", "allowlist", "open"]}
          />
          <NumRowD
            label="Default monthly budget (USD)"
            value={form.monthlyBudget}
            onChange={(v) => setForm({ ...form, monthlyBudget: v })}
          />
        </fieldset>
      </Card>
    </>
  );
}

// ════════════ Self-Service & Collaboration (org-wide governance defaults) ════════════
function SelfServiceTab() {
  const seed = {
    workspaceCreate: "Admins only",
    groupCreate: "Approval required",
    appRegister: "Approval required",
    connectorRegister: "Catalog only",
    toolRegister: "Catalog only",
    externalCollab: "Domain-restricted",
    guestAccess: "Read-only",
    guestExpiry: "90 days",
  };
  const [form, setForm] = useLocal("cg_org_selfservice", seed);
  const [base, setBase] = React.useState(form);
  const [editing, setEditing] = React.useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  const sel = (
    k: keyof typeof seed,
    label: string,
    opts: string[],
    floor?: string,
  ) => (
    <SelRow
      label={label}
      value={String(form[k])}
      onChange={(v) => setForm({ ...form, [k]: v })}
      opts={opts}
      floor={floor}
    />
  );
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
          padding: "11px 14px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.cardBg,
          marginBottom: 18,
        }}
      >
        <Building2
          size={15}
          color={T.accent}
          style={{ marginTop: 1, flexShrink: 0 }}
        />
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
          Org-wide self-service & collaboration defaults. These govern what a
          workspace member may do without an administrator, and are inherited by
          every workspace. Mark a control mandatory to make it a floor.
        </div>
      </div>
      <OrgTabActionBar
        title="Self-Service & Collaboration"
        exportName="org-self-service"
        exportData={form}
        onRefresh={() => setForm(base)}
        edit={{
          editing,
          dirty,
          onEdit: () => setEditing(true),
          onSave: () => {
            setBase(form);
            setEditing(false);
          },
          onCancel: () => {
            setForm(base);
            setEditing(false);
          },
        }}
        values={[
          { k: "Workspace creation", v: String(form.workspaceCreate) },
          { k: "Group creation", v: String(form.groupCreate) },
          { k: "External collaboration", v: String(form.externalCollab) },
          { k: "Guest access", v: String(form.guestAccess) },
        ]}
      />
      <fieldset
        disabled={!editing}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <Card
          title="Self-service creation"
          desc="Who may create resources without an administrator."
        >
          {sel(
            "workspaceCreate",
            "Workspace self-service creation",
            ["Admins only", "BU admins", "Any member"],
            "mandatory",
          )}
          {sel("groupCreate", "Group self-service creation", [
            "Blocked",
            "Approval required",
            "Allowed",
          ])}
          {sel("appRegister", "API / app client self-registration", [
            "Blocked",
            "Approval required",
            "Allowed",
          ])}
          {sel(
            "connectorRegister",
            "Connector self-registration",
            ["Catalog only", "Approval required", "Allowed"],
            "mandatory",
          )}
          {sel(
            "toolRegister",
            "Tool / MCP self-registration",
            ["Catalog only", "Approval required", "Allowed"],
            "mandatory",
          )}
        </Card>
        <Card
          title="External & guest collaboration"
          desc="Whether and how outside identities can be invited into workspaces."
        >
          {sel("externalCollab", "External collaboration", [
            "Blocked",
            "Domain-restricted",
            "Allowed",
          ])}
          {sel("guestAccess", "Default guest access level", [
            "No access",
            "Read-only",
            "Collaborator",
          ])}
          {sel("guestExpiry", "Guest access expiry", [
            "30 days",
            "90 days",
            "180 days",
            "No expiry",
          ])}
        </Card>
      </fieldset>
    </>
  );
}

// ════════════ §6.8 Lifecycle ════════════
const ORG_STATES = [
  "active",
  "restricted",
  "read-only",
  "suspended",
  "under-investigation",
  "terminating",
  "archived",
];
const ORG_TONE: Record<string, string> = {
  active: T.success,
  restricted: T.warning,
  "read-only": T.warning,
  suspended: T.danger,
  "under-investigation": T.danger,
  terminating: T.danger,
  archived: T.textMuted,
};
function LifecycleTab() {
  const [state, setState] = useLocal("cg_org_state", "active");
  const transitions =
    state === "active"
      ? ["restricted", "read-only", "under-investigation"]
      : state === "archived"
        ? []
        : ["active", "suspended", "terminating"];
  return (
    <>
      <Card
        title="Organization lifecycle (§6.8)"
        desc="The org-wide state. Restricted/read-only/suspended propagate to every workspace."
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "8px 0 16px",
          }}
        >
          {ORG_STATES.map((s, i) => (
            <span
              key={s}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: s === state ? ORG_TONE[s] : T.textMuted,
                  border: `1px solid ${s === state ? "var(--cg-danger-border)" : T.border}`,
                  borderRadius: 99,
                  padding: "3px 11px",
                  background:
                    s === state ? "rgba(76,175,125,0.08)" : "transparent",
                  fontWeight: s === state ? 600 : 400,
                }}
              >
                {s}
              </span>
              {i < ORG_STATES.length - 1 && (
                <span style={{ color: T.textMuted }}>·</span>
              )}
            </span>
          ))}
        </div>
        <StatRow
          label="Current state"
          value={
            <span style={{ color: ORG_TONE[state], fontWeight: 600 }}>
              {state}
            </span>
          }
        />
        {transitions.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              paddingTop: 10,
            }}
          >
            {transitions.map((t) => (
              <ConfirmButton
                key={t}
                variant={
                  ["suspended", "terminating", "under-investigation"].includes(
                    t,
                  )
                    ? "danger"
                    : "ghost"
                }
                label={`→ ${t}`}
                title={`Move organization to "${t}"`}
                body={`This sets the entire organization to "${t}". ${["restricted", "read-only", "suspended"].includes(t) ? "It propagates to every workspace and is fully audited." : "The action is audited."}`}
                confirmWord={
                  ["suspended", "terminating"].includes(t)
                    ? t.toUpperCase().slice(0, 7)
                    : undefined
                }
                confirmLabel={`Set ${t}`}
                onConfirm={() => setState(t)}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

// ════════════ shared ════════════
function ChipEdit({
  items,
  onAdd,
  onRemove,
  value,
  setValue,
  placeholder,
  tone,
}: {
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  tone: "ok" | "danger";
}) {
  const c = tone === "ok" ? T.success : T.danger;
  return (
    <>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 0" }}
      >
        {items.map((it) => (
          <span
            key={it}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: c,
              background:
                tone === "ok" ? "rgba(76,175,125,0.1)" : "var(--cg-danger-bg)",
              border: `1px solid ${tone === "ok" ? "rgba(76,175,125,0.3)" : "var(--cg-danger-border)"}`,
              borderRadius: 99,
              padding: "3px 10px",
              fontFamily: "monospace",
            }}
          >
            {it}
            <button
              type="button"
              onClick={() => onRemove(it)}
              style={{
                background: "transparent",
                border: "none",
                color: c,
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "4px 0" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{ ...inp, width: 240 }}
        />
        <HeaderButton
          icon={<Plus size={14} />}
          disabled={!value.trim()}
          onClick={() => {
            onAdd(value.trim());
            setValue("");
          }}
        >
          Add
        </HeaderButton>
      </div>
    </>
  );
}
function SelRow({
  label,
  value,
  onChange,
  opts,
  floor,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opts: string[];
  floor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "11px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: T.textPrimary,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {label} {floor && <FloorBadge floor={floor} />}
      </span>
      <Sel value={value} onChange={onChange} opts={opts} />
    </div>
  );
}
function NumRowD({
  label,
  value,
  onChange,
  floor,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  floor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "11px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: T.textPrimary,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {label} {floor && <FloorBadge floor={floor} />}
      </span>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        style={{ ...inp, width: 130 }}
      />
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
      style={{ ...inp, cursor: "pointer", width: 240 }}
    >
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
// Right-side drawer (kept the name `Modal` so existing call sites are unchanged).
function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
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
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>
            {title}
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
// ════════════ §6.1 Profile — configuration domain in the Users design language ════════════
// Action Bar (Edit/Save/Cancel/Refresh/Export/Audit/More) · Section Cards (status +
// last-modified + History) · inline edit · lightweight drawer (Overview/Dependencies/
// Audit/History — no nested tabs) · Activity timeline.

const ORG_DEPENDENCIES = [
  "Identity & Access",
  "Workspace Management",
  "Compliance Center",
  "Billing",
  "Security Policies",
  "Notification Engine",
  "Reports",
];

type OrgTone = "ok" | "warn" | "muted";
function StatusChip({ tone, label }: { tone: OrgTone; label: string }) {
  const c =
    tone === "ok" ? T.success : tone === "warn" ? T.warning : T.textMuted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        color: c,
        border: `1px solid ${c}55`,
        background: `${c}14`,
        borderRadius: 999,
        padding: "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: c }}
      />
      {label}
    </span>
  );
}

function OrgField({
  label,
  value,
  editing,
  onChange,
  inherited,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange?: (v: string) => void;
  inherited?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "10px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: T.textPrimary,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {label}
        {inherited && (
          <span
            style={{
              fontSize: 10,
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            Inherited
          </span>
        )}
      </span>
      {editing && onChange ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inp, width: 340 }}
        />
      ) : (
        <span style={{ fontSize: 12.5, color: T.textNav, textAlign: "right" }}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function OrgSectionCard({
  title,
  desc,
  statusTone = "ok",
  statusLabel = "Validated",
  modified,
  modifiedBy,
  onHistory,
  children,
}: {
  title: string;
  desc?: string;
  statusTone?: OrgTone;
  statusLabel?: string;
  modified: string;
  modifiedBy: string;
  onHistory: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card
      title={title}
      desc={desc}
      right={<StatusChip tone={statusTone} label={statusLabel} />}
    >
      {children}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 12,
          fontSize: 11.5,
          color: T.textMuted,
        }}
      >
        <span>
          Last modified {modified} · by {modifiedBy}
        </span>
        <button
          type="button"
          onClick={onHistory}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "transparent",
            border: "none",
            color: T.accent,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Clock size={13} /> History
        </button>
      </div>
    </Card>
  );
}

// Lightweight Organization drawer — horizontal sub-tabs (no nested left rail).
const ORG_DRAWER_SUBS = ["Overview", "Dependencies", "Audit", "History"];
function OrgDrawer({
  title,
  values,
  modified,
  modifiedBy,
  onClose,
}: {
  title: string;
  values: { k: string; v: React.ReactNode }[];
  modified: string;
  modifiedBy: string;
  onClose: () => void;
}) {
  const [sub, setSub] = React.useState(0);
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
          width: 560,
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
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px 14px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div>
            <div
              style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}
            >
              {title}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
              Organization configuration · Applies to Organization
            </div>
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
          className="custom-scrollbar"
          style={{
            display: "flex",
            gap: 2,
            padding: "0 22px",
            borderBottom: `1px solid ${T.border}`,
            overflowX: "auto",
          }}
        >
          {ORG_DRAWER_SUBS.map((label, i) => {
            const on = i === sub;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSub(i)}
                style={{
                  padding: "12px 12px 10px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${on ? T.accent : "transparent"}`,
                  color: on ? T.textPrimary : T.textNav,
                  fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {sub === 0 && (
            <>
              <SecHead>Current configuration</SecHead>
              <KVGrid cols={1} items={values} />
              <SecHead>Status</SecHead>
              <KVGrid
                cols={1}
                items={[
                  {
                    k: "Validation",
                    v: <StatusChip tone="ok" label="Validated" />,
                  },
                  { k: "Last modified", v: modified },
                  { k: "Modified by", v: modifiedBy },
                  { k: "Scope", v: "Organization" },
                ]}
              />
            </>
          )}
          {sub === 1 && (
            <>
              <SecHead>Consumed by</SecHead>
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {ORG_DEPENDENCIES.map((d, i) => (
                  <div
                    key={d}
                    style={{
                      padding: "10px 14px",
                      fontSize: 13,
                      color: T.textPrimary,
                      borderBottom:
                        i < ORG_DEPENDENCIES.length - 1
                          ? `1px solid ${T.border}`
                          : "none",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </>
          )}
          {sub === 2 && (
            <>
              <SecHead>Field changes</SecHead>
              <AuditRows
                rows={[
                  {
                    field: "Display name",
                    oldV: "Acme Corp",
                    newV: "Acme",
                    by: "rami@inferencedefense.com",
                    at: "2026-06-20 14:22",
                  },
                  {
                    field: "Primary region",
                    oldV: "us-east-1",
                    newV: "eu-west-1",
                    by: "platform@inferencedefense.com",
                    at: "2026-05-12 09:03",
                  },
                ]}
              />
            </>
          )}
          {sub === 3 && (
            <>
              <SecHead>Versions</SecHead>
              <AuditRows
                version
                rows={[
                  {
                    field: "v8",
                    oldV: "Published",
                    newV: "Brand color + support URL",
                    by: "rami@inferencedefense.com",
                    at: "2026-06-20",
                  },
                  {
                    field: "v7",
                    oldV: "Published",
                    newV: "Region change",
                    by: "platform@inferencedefense.com",
                    at: "2026-05-12",
                  },
                  {
                    field: "v6",
                    oldV: "Published",
                    newV: "Initial profile",
                    by: "rami@inferencedefense.com",
                    at: "2025-01-06",
                  },
                ]}
              />
            </>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "13px 22px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <HeaderButton onClick={onClose}>Close</HeaderButton>
        </div>
      </div>
    </div>
  );
}
function SecHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: T.textMuted,
        margin: "16px 0 8px",
      }}
    >
      {children}
    </div>
  );
}
function AuditRows({
  rows,
  version,
}: {
  rows: { field: string; oldV: string; newV: string; by: string; at: string }[];
  version?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {rows.map((r, i) => (
        <div
          key={r.field}
          style={{
            padding: "10px 14px",
            borderBottom:
              i < rows.length - 1 ? `1px solid ${T.border}` : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: T.textPrimary,
            }}
          >
            <span>{version ? `${r.field} · ${r.newV}` : r.field}</span>
            <span style={{ color: T.textMuted, fontSize: 12 }}>{r.at}</span>
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
            {version ? (
              <>
                {r.oldV} · by {r.by}
              </>
            ) : (
              <>
                {r.oldV} → <span style={{ color: T.textNav }}>{r.newV}</span> ·
                by {r.by}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrgMoreMenu({
  onClone,
  onExport,
}: {
  onClone: () => void;
  onExport: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <HeaderButton onClick={() => setOpen((o) => !o)}>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          More <ChevronDown size={13} />
        </span>
      </HeaderButton>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 200,
            background: "var(--cg-workspace-dropdown-bg)",
            border: `1px solid ${T.borderStrong}`,
            borderRadius: 8,
            boxShadow: "var(--cg-shadow-dropdown)",
            padding: 4,
            zIndex: 50,
          }}
        >
          {[
            { label: "Clone Configuration", run: onClone },
            { label: "Compare Versions", run: onExport },
            { label: "Restore Previous Version", run: onExport },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                a.run();
                setOpen(false);
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
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Download any config object as a JSON file.
function downloadJson(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function OrgActionBar({
  showEdit = true,
  editing,
  dirty,
  onEdit,
  onSave,
  onCancel,
  onRefresh,
  onExport,
  onAudit,
  onClone,
}: {
  showEdit?: boolean;
  editing: boolean;
  dirty: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onAudit: () => void;
  onClone: () => void;
}) {
  const [flash, setFlash] = React.useState(false);
  const refresh = () => {
    onRefresh();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 600);
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      {showEdit &&
        (editing ? (
          <>
            <HeaderButton variant="primary" disabled={!dirty} onClick={onSave}>
              Save
            </HeaderButton>
            <HeaderButton onClick={onCancel}>Cancel</HeaderButton>
          </>
        ) : (
          <HeaderButton variant="primary" onClick={onEdit}>
            <span
              style={{ display: "inline-flex", gap: 5, alignItems: "center" }}
            >
              <Pencil size={13} /> Edit
            </span>
          </HeaderButton>
        ))}
      <HeaderButton onClick={refresh}>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <RotateCw size={13} /> {flash ? "Refreshed" : "Refresh"}
        </span>
      </HeaderButton>
      <HeaderButton onClick={onExport}>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <Download size={13} /> Export Configuration
        </span>
      </HeaderButton>
      <HeaderButton onClick={onAudit}>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <Clock size={13} /> View Audit History
        </span>
      </HeaderButton>
      <OrgMoreMenu onClone={onClone} onExport={onExport} />
    </div>
  );
}

const ORG_ACTIVITY = [
  {
    e: "Configuration published",
    by: "rami@inferencedefense.com",
    at: "2026-06-20 14:25",
  },
  {
    e: "Field updated — Display name",
    by: "rami@inferencedefense.com",
    at: "2026-06-20 14:22",
  },
  {
    e: "Ownership changed — Security Owner",
    by: "platform@inferencedefense.com",
    at: "2026-05-30 10:01",
  },
  { e: "Validation completed", by: "system", at: "2026-05-12 09:04" },
  {
    e: "Configuration created",
    by: "rami@inferencedefense.com",
    at: "2025-01-06 08:00",
  },
];

function ProfileTab() {
  const seed = {
    // Identity
    legalName: "Inference Defense Ltd",
    displayName: "Inference Defense",
    orgId: "org_8f2c1a9e",
    industry: "Cybersecurity",
    primaryBusiness: "Cloud security posture management",
    website: "https://inferencedefense.com",
    description: "Enterprise cloud security reasoning platform.",
    // Corporate identity
    logo: "id-logo.svg",
    brandColor: "#0078D4",
    supportEmail: "support@inferencedefense.com",
    supportUrl: "https://inferencedefense.com/support",
    primaryContact: "rami@inferencedefense.com",
    // Geography
    hq: "Dublin, Ireland",
    region: "eu-west-1",
    timeZone: "Europe/Dublin (GMT)",
    language: "English (en)",
    // Fiscal
    currency: "EUR (€)",
    fiscalYear: "January – December",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "1.234,56",
    // Security metadata
    uuid: "8f2c1a9e-3b6d-47f1-a0c2-9d4e7b1f0a52",
    tenantId: "tnt_inferencedefense",
    idp: "Microsoft Entra ID",
    authPolicy: "Phishing-resistant MFA required",
    complianceTier: "Tier 3 (regulated)",
    dataResidency: "European Union (EU)",
    workspacePolicy: "Locked-down baseline",
    retention: "7 years (audit)",
    encryption: "HYOK · per-tenant CMEK",
    managedBy: "Security Operations",
    // Ownership
    execOwner: "rami@inferencedefense.com",
    secOwner: "ciso@inferencedefense.com",
    platOwner: "platform@inferencedefense.com",
    billOwner: "billing@inferencedefense.com",
    compOwner: "compliance@inferencedefense.com",
    escalation: "soc@inferencedefense.com",
    emergency: "+353 •• ••• ••",
    // Classification
    businessModel: "B2B SaaS",
    orgSize: "Mid-market",
    employees: "289",
    cloudMaturity: "Advanced",
    criticalInfra: "Yes (financial sector clients)",
    regClass: "SOC2 · ISO27001 · PCI DSS · DORA",
  };
  const [form, setForm] = useLocal("cg_org_profile_v2", seed);
  const [base, setBase] = React.useState(form);
  const [editing, setEditing] = React.useState(false);
  const [drawer, setDrawer] = React.useState<{
    title: string;
    values: { k: string; v: React.ReactNode }[];
  } | null>(null);
  const [section, setSection] = React.useState(0);
  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  const set = (k: keyof typeof seed, v: string) => setForm({ ...form, [k]: v });
  const fld = (k: keyof typeof seed, label: string, inherited?: boolean) => (
    <OrgField
      label={label}
      value={String((form as Record<string, string>)[k] ?? "")}
      editing={editing}
      onChange={(v) => set(k, v)}
      inherited={inherited}
    />
  );
  const openDrawer = (
    title: string,
    values: { k: string; v: React.ReactNode }[],
  ) => setDrawer({ title, values });

  return (
    <>
      <SampleBanner what="Organization profile (authoritative enterprise metadata)" />
      <OrgActionBar
        editing={editing}
        dirty={dirty}
        onEdit={() => setEditing(true)}
        onSave={() => {
          setBase(form);
          setEditing(false);
        }}
        onCancel={() => {
          setForm(base);
          setEditing(false);
        }}
        onRefresh={() => setForm(base)}
        onExport={() => downloadJson(form, "org-profile")}
        onClone={() => downloadJson(form, "org-profile-clone")}
        onAudit={() =>
          openDrawer("Organization", [
            { k: "Legal name", v: form.legalName },
            { k: "Display name", v: form.displayName },
            { k: "Organization ID", v: form.orgId },
          ])
        }
      />

      <ProfileSubNav active={section} onChange={setSection} />

      {section === 0 && (
        <OrgSectionCard
          title="Identity"
          desc="The primary enterprise identity used throughout the platform."
          modified="2026-06-20"
          modifiedBy="rami@inferencedefense.com"
          onHistory={() =>
            openDrawer("Identity", [
              { k: "Legal organization name", v: form.legalName },
              { k: "Display name", v: form.displayName },
              { k: "Organization ID", v: form.orgId },
              { k: "Industry", v: form.industry },
              { k: "Primary business", v: form.primaryBusiness },
              { k: "Website", v: form.website },
            ])
          }
        >
          {fld("legalName", "Legal organization name")}
          {fld("displayName", "Display name")}
          {fld("orgId", "Organization ID")}
          {fld("industry", "Industry")}
          {fld("primaryBusiness", "Primary business")}
          {fld("website", "Website")}
          {fld("description", "Description")}
        </OrgSectionCard>
      )}

      {section === 1 && (
        <OrgSectionCard
          title="Corporate identity"
          desc="Branding and support surfaces shown to users."
          modified="2026-06-20"
          modifiedBy="rami@inferencedefense.com"
          onHistory={() =>
            openDrawer("Corporate identity", [
              { k: "Brand color", v: form.brandColor },
              { k: "Support email", v: form.supportEmail },
              { k: "Support URL", v: form.supportUrl },
            ])
          }
        >
          {fld("logo", "Logo")}
          {fld("brandColor", "Brand color")}
          {fld("supportEmail", "Support email")}
          {fld("supportUrl", "Support URL")}
          {fld("primaryContact", "Primary contact")}
        </OrgSectionCard>
      )}

      {section === 2 && (
        <OrgSectionCard
          title="Geography"
          desc="Headquarters and regional defaults. Some values are inherited by workspaces."
          modified="2026-05-12"
          modifiedBy="platform@inferencedefense.com"
          onHistory={() =>
            openDrawer("Geography", [
              { k: "Headquarters", v: form.hq },
              { k: "Primary region", v: form.region },
              { k: "Time zone", v: form.timeZone },
            ])
          }
        >
          {fld("hq", "Headquarters")}
          {fld("region", "Primary region")}
          {fld("timeZone", "Time zone", true)}
          {fld("language", "Default language", true)}
        </OrgSectionCard>
      )}

      {section === 3 && (
        <OrgSectionCard
          title="Fiscal settings"
          desc="Currency and formatting used across billing and reports."
          modified="2025-01-06"
          modifiedBy="billing@inferencedefense.com"
          onHistory={() =>
            openDrawer("Fiscal settings", [
              { k: "Currency", v: form.currency },
              { k: "Fiscal year", v: form.fiscalYear },
            ])
          }
        >
          {fld("currency", "Currency")}
          {fld("fiscalYear", "Fiscal year")}
          {fld("dateFormat", "Date format")}
          {fld("numberFormat", "Number format")}
        </OrgSectionCard>
      )}

      {section === 4 && (
        <OrgSectionCard
          title="Security metadata"
          desc="Consumed by IAM, Audit and Compliance. Most fields are system-managed."
          statusTone="ok"
          statusLabel="Managed"
          modified="2026-06-01"
          modifiedBy="system"
          onHistory={() =>
            openDrawer("Security metadata", [
              { k: "Organization UUID", v: form.uuid },
              { k: "Primary identity provider", v: form.idp },
              { k: "Compliance tier", v: form.complianceTier },
              { k: "Data residency", v: form.dataResidency },
            ])
          }
        >
          {fld("uuid", "Organization UUID")}
          {fld("tenantId", "Security tenant ID")}
          {fld("idp", "Primary identity provider")}
          {fld("authPolicy", "Default authentication policy", true)}
          {fld("complianceTier", "Compliance tier")}
          {fld("dataResidency", "Data residency", true)}
          {fld("workspacePolicy", "Default workspace policy", true)}
          {fld("retention", "Retention policy")}
          {fld("encryption", "Encryption profile")}
          {fld("managedBy", "Managed by")}
        </OrgSectionCard>
      )}

      {section === 5 && (
        <OrgSectionCard
          title="Ownership"
          desc="Accountable owners and escalation paths for the organization."
          modified="2026-05-30"
          modifiedBy="platform@inferencedefense.com"
          onHistory={() =>
            openDrawer("Ownership", [
              { k: "Executive owner", v: form.execOwner },
              { k: "Security owner", v: form.secOwner },
              { k: "Compliance owner", v: form.compOwner },
            ])
          }
        >
          {fld("execOwner", "Executive owner")}
          {fld("secOwner", "Security owner")}
          {fld("platOwner", "Platform owner")}
          {fld("billOwner", "Billing owner")}
          {fld("compOwner", "Compliance owner")}
          {fld("escalation", "Escalation contacts")}
          {fld("emergency", "Emergency contacts")}
        </OrgSectionCard>
      )}

      {section === 6 && (
        <OrgSectionCard
          title="Classification"
          desc="Business and regulatory classification used for risk and compliance baselines."
          modified="2026-04-12"
          modifiedBy="compliance@inferencedefense.com"
          onHistory={() =>
            openDrawer("Classification", [
              { k: "Business model", v: form.businessModel },
              { k: "Organization size", v: form.orgSize },
              { k: "Regulatory classifications", v: form.regClass },
            ])
          }
        >
          {fld("industry", "Industry")}
          {fld("businessModel", "Business model")}
          {fld("orgSize", "Organization size")}
          {fld("employees", "Employee count")}
          {fld("cloudMaturity", "Cloud maturity")}
          {fld("criticalInfra", "Critical infrastructure")}
          {fld("regClass", "Regulatory classifications")}
        </OrgSectionCard>
      )}

      {section === 7 && (
        <Card
          title="Activity timeline"
          desc="Recent configuration changes to the organization profile."
        >
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {ORG_ACTIVITY.map((a, i) => (
              <div
                key={a.e + a.at}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderBottom:
                    i < ORG_ACTIVITY.length - 1
                      ? `1px solid ${T.border}`
                      : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: T.textPrimary }}>
                    {a.e}
                  </div>
                  <div
                    style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}
                  >
                    by {a.by}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: T.textMuted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.at}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {drawer && (
        <OrgDrawer
          title={drawer.title}
          values={drawer.values}
          modified="2026-06-20"
          modifiedBy="rami@inferencedefense.com"
          onClose={() => setDrawer(null)}
        />
      )}
    </>
  );
}

// Reusable action bar for the configuration tabs (Regions, Domains, Admin
// Hierarchy, Default Configuration, Self-Service) — same controls as Profile.
// Controlled action bar for a configuration tab. `edit` (optional) wires the
// Edit/Save/Cancel controls to the tab's real edit state; `exportData` and
// `onRefresh` operate on that tab's actual data.
function OrgTabActionBar({
  title,
  exportName,
  exportData,
  values,
  onRefresh,
  edit,
}: {
  title: string;
  exportName: string;
  exportData: unknown;
  values: { k: string; v: React.ReactNode }[];
  onRefresh: () => void;
  edit?: {
    editing: boolean;
    dirty: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
  };
}) {
  const [audit, setAudit] = React.useState(false);
  return (
    <>
      <OrgActionBar
        showEdit={!!edit}
        editing={edit?.editing ?? false}
        dirty={edit?.dirty ?? false}
        onEdit={() => edit?.onEdit()}
        onSave={() => edit?.onSave()}
        onCancel={() => edit?.onCancel()}
        onRefresh={onRefresh}
        onExport={() => downloadJson(exportData, exportName)}
        onAudit={() => setAudit(true)}
        onClone={() => downloadJson(exportData, `${exportName}-clone`)}
      />
      {audit && (
        <OrgDrawer
          title={title}
          values={values}
          modified="2026-06-20"
          modifiedBy="rami@inferencedefense.com"
          onClose={() => setAudit(false)}
        />
      )}
    </>
  );
}

// Profile sub-navigation — pill tabs (same pattern as the Users sub-nav).
const PROFILE_SECTIONS = [
  { label: "Identity", Icon: Building2 },
  { label: "Corporate Identity", Icon: Palette },
  { label: "Geography", Icon: Globe },
  { label: "Fiscal Settings", Icon: Coins },
  { label: "Security Metadata", Icon: Shield },
  { label: "Ownership", Icon: Users },
  { label: "Classification", Icon: Tag },
  { label: "Activity", Icon: Activity },
];
function ProfileSubNav({
  active,
  onChange,
}: {
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 16,
        flexWrap: "wrap",
      }}
    >
      {PROFILE_SECTIONS.map((s, i) => {
        const on = i === active;
        return (
          <button
            key={s.label}
            type="button"
            onClick={() => onChange(i)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              border: `1px solid ${on ? "var(--cg-accent)" : "var(--cg-border-card)"}`,
              background: on ? "var(--cg-accent-bg)" : "transparent",
              color: on ? T.textPrimary : T.textNav,
              fontSize: 13,
              fontWeight: on ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <s.Icon size={14} color={on ? T.accent : T.textMuted} /> {s.label}
          </button>
        );
      })}
    </div>
  );
}

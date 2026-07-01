/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/label-has-associated-control -- CloudGuard Identity & Enterprise Access (§7) */
import React from "react";
import { useSearchParams } from "react-router";
import {
  Plus,
  Trash2,
  ShieldCheck,
  Clock,
  Plug,
  X,
  KeyRound,
  RotateCw,
  Check,
  AlertTriangle,
  Download,
  Users,
  UsersRound,
  Columns3,
  Mail,
  UserPlus,
  Upload,
  RotateCcw,
  ChevronLeft,
  Filter,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Lock,
  Fingerprint,
  Usb,
  ScrollText,
  Activity,
  Shield,
  Boxes,
  Tag,
  BadgeCheck,
  Scale,
  Inbox,
  History,
  Target,
  Share2,
  Wrench,
  Monitor,
  Server,
  ShieldAlert,
  CalendarClock,
  Zap,
  Undo2,
  Bell,
  BellOff,
  ArrowUp,
  GitBranch,
  SlidersHorizontal,
  Network,
  Cable,
  ChevronRight,
  Minimize2,
  Maximize2,
  Play,
  Search,
  Expand,
  Minimize,
  Star,
  Bot,
  ArrowLeft,
} from "lucide-react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import expandCollapse from "cytoscape-expand-collapse";
import undoRedo from "cytoscape-undo-redo";
import ec2Icon from "thesvg/aws-amazon-ec2";
import lambdaIcon from "thesvg/aws-aws-lambda";
import s3Icon from "thesvg/aws-res-amazon-simple-storage-service-bucket";
import elbIcon from "thesvg/aws-res-elastic-load-balancing-gateway-load-balancer";
import albIcon from "thesvg/aws-res-elastic-load-balancing-application-load-balancer";
import igwIcon from "thesvg/aws-res-amazon-vpc-internet-gateway";
import dbIcon from "thesvg/aws-amazon-dynamodb";
import { ImpactAnalysis } from "./impact-analysis";
import {
  GraphNavigator as SharedGraphNavigator,
  GraphMinimap,
  graphToolBtn,
  type Severity,
  SEV_ORDER,
  SEV_COLOUR,
  SevChip,
  Field as SchemaField,
  GroupHead,
  drawerShell,
  drawerHead,
  drawerTabStrip,
  drawerTab,
  CHROME,
  DRAWER_W,
  GraphWatermark,
  RemediationTimeline,
  remediationFor,
  LogList,
  logsFor,
  NotesPanel,
  useNotes,
  MultiFilter,
} from "./graph-shell";
import {
  useCollection,
  useAddCollectionItem,
  useRemoveCollectionItem,
  useUpdateCollectionItem,
  useCloudGuardSession,
} from "#/hooks/query/use-cloudguard";
import type { CGCollectionItem } from "#/api/cloudguard-service";
import {
  Page,
  PageHeader,
  Tabs,
  Card,
  KVGrid,
  DirectoryTable,
  CommandBar,
  FilterSet,
  HeaderButton,
  ConfirmButton,
  RowMenu,
  ScopeBadge,
  SampleTag,
  SampleBanner,
  EmptyState,
  LiveCardSkeleton,
  T,
  type Column,
  type CommandItem,
  type FilterPillDef,
  type FilterPreset,
} from "#/components/admin/admin-kit";

/**
 * Identity & Enterprise Access (§7) — every sub-area built to the IAM use-cases an enterprise
 * actually runs: joiner/mover/leaver lifecycle, just-in-time privileged access, access
 * certification, credential hygiene, separation-of-duties + effective-permission resolution, and a
 * full authentication policy. Live: Roles (/org/roles), Users & Sessions (/collections). The
 * remaining areas run on representative state (tagged `Sample`) but are fully interactive so the
 * workflows are real to operate; they bind to the IdP / PIM / SCIM backends when those land.
 */

// §7 navigation — two groups (Identity / Access); several leaves carry sub-views.
const NAV_GROUPS = [
  {
    group: "Identity",
    tabs: [
      { id: "users", label: "Users" },
      { id: "service", label: "Service Identities" },
      { id: "providers", label: "Identity Providers" },
      { id: "auth", label: "Authentication & Credentials" },
      { id: "sessions", label: "Sessions" },
    ],
  },
  {
    group: "Access",
    tabs: [
      { id: "groups", label: "Groups" },
      { id: "roles", label: "Roles" },
      { id: "assignments", label: "Assignments" },
      { id: "privileged", label: "Privileged Access" },
      { id: "reviews", label: "Reviews & Certifications" },
    ],
  },
  {
    group: "Alerts",
    tabs: [
      { id: "alerts-active", label: "Active Alerts" },
      { id: "alerts-risks", label: "Threats & Risks" },
      { id: "alerts-gov", label: "Governance Violations" },
      { id: "alerts-config", label: "Configuration" },
      { id: "alerts-history", label: "History" },
    ],
  },
  {
    group: "IAM Graph",
    tabs: [
      { id: "graph-explorer", label: "Explorer" },
      { id: "graph-impact", label: "Security Graph" },
    ],
  },
];
const GROUP_BY_PARAM: Record<string, string> = {
  identity: "Identity",
  access: "Access",
  alerts: "Alerts",
  "iam-graph": "IAM Graph",
};

const ROLE_OPTS = [
  "Organization Owner",
  "Enterprise Security Administrator",
  "Workspace Administrator",
  "Compliance Administrator",
  "Auditor",
  "Viewer",
];

export function IdentityPage({ scope }: { scope: "workspace" | "enterprise" }) {
  const [params, setParams] = useSearchParams();
  const groupId =
    GROUP_BY_PARAM[params.get("group") ?? "identity"] ?? "Identity";
  const groupDef = NAV_GROUPS.find((g) => g.group === groupId) ?? NAV_GROUPS[0];
  // tab is URL-driven (?tab=) so a sub-tab is deep-linkable; it falls back to the
  // group's first leaf when the param is missing or doesn't belong to the group.
  const tabParam = params.get("tab");
  const tab = groupDef.tabs.some((t) => t.id === tabParam)
    ? (tabParam as string)
    : groupDef.tabs[0].id;
  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next);
  };
  return (
    <Page>
      <PageHeader
        title={`Identity & Access · ${groupId}`}
        subtitle={
          groupId === "Identity"
            ? "Users, service identities, providers, credentials and sessions."
            : groupId === "Access"
              ? "Groups, roles, assignments, privileged access and certification."
              : groupId === "Alerts"
                ? "Identity-security monitoring: threats, privilege & authentication risks, governance and approval violations."
                : "Explore the identity graph — principals, groups, roles, assignments and resource access paths."
        }
        actions={
          <ScopeBadge
            scope={scope === "workspace" ? "This workspace" : "Organization"}
          />
        }
      />
      <Tabs tabs={groupDef.tabs} active={tab} onChange={setTab} />
      {tab === "users" && <UsersArea />}
      {tab === "service" && <ServiceTab />}
      {tab === "providers" && <ProvidersTab />}
      {tab === "auth" && <AuthArea />}
      {tab === "sessions" && <SessionsTab />}
      {tab === "groups" && <GroupsArea />}
      {tab === "roles" && <RolesArea />}
      {tab === "assignments" && <AssignmentsArea />}
      {tab === "privileged" && <PrivilegedArea />}
      {tab === "reviews" && <ReviewsArea />}
      {tab === "alerts-active" && <ActiveAlerts />}
      {tab === "alerts-risks" && <ThreatsRisksGroup />}
      {tab === "alerts-gov" && <GovernanceGroup />}
      {tab === "alerts-config" && <AlertConfigGroup />}
      {tab === "alerts-history" && <AlertHistory />}
      {tab === "graph-explorer" && <GraphExplorer />}
      {tab === "graph-impact" && <ImpactAnalysis />}
    </Page>
  );
}

// ════════════ §7.2 Users — JML lifecycle (LIVE + actions) ════════════
interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  idp: string;
  bu: string;
  lastLogin: string;
  mfa: boolean;
  mfaStatus: string;
}
function UsersTab({
  templates = [],
  onOpenTemplates,
  onSoftDelete,
}: {
  templates?: UserTemplate[];
  onOpenTemplates?: () => void;
  onSoftDelete?: (u: { id: string; email: string; role: string }) => void;
}) {
  const q = useCollection("members");
  const add = useAddCollectionItem("members");
  const update = useRemoveCollectionItem("members"); // remove==deprovision; status via local overlay
  const patch = useUpdateCollectionItem("members"); // edit user profile (PATCH)
  const session = useCloudGuardSession();
  const canEdit = session.can("admin");
  const [search, setSearch] = React.useState("");
  const [statusF, setStatusF] = React.useState("");
  const [roleF, setRoleF] = React.useState("");
  const [mfaF, setMfaF] = React.useState("");
  const [idpF, setIdpF] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const [addMulti, setAddMulti] = React.useState(false);
  const [resetting, setResetting] = React.useState<UserRow | null>(null);
  const [tplMenu, setTplMenu] = React.useState<{
    top: number;
    left: number;
  } | null>(null);
  const [fromTpl, setFromTpl] = React.useState<UserTemplate | null>(null);
  const [sel, setSel] = React.useState<UserRow | null>(null);
  const [overlay, setOverlay] = React.useState<Record<string, string>>({}); // id -> status override (suspend/reactivate)
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const clearAllFilters = () => {
    setSearch("");
    setStatusF("");
    setRoleF("");
    setMfaF("");
    setIdpF("");
  };

  const items = (q.data ?? []) as CGCollectionItem[];
  const all: UserRow[] = items.map((m) => {
    const st = overlay[m.id] ?? String(m.status ?? "active");
    const mfaOn = m.mfa !== false;
    // Prefer an explicit mfa_status from the record; otherwise derive a meaningful posture.
    const mfaStatus = String(
      m.mfa_status ??
        (st === "suspended"
          ? "Locked"
          : st === "invited"
            ? "Pending"
            : mfaOn
              ? "Enabled"
              : "Disabled"),
    );
    return {
      id: m.id,
      email: String(m.email ?? m.name ?? m.id),
      name: String(m.name ?? m.email ?? m.id),
      role: String(m.role ?? "Viewer"),
      status: st,
      idp: String(m.idp ?? "Microsoft Entra ID"),
      bu: String(m.bu ?? "Payments"),
      lastLogin: String(m.last_login ?? "2026-06-21"),
      mfa: mfaOn,
      mfaStatus,
    };
  });
  const rows = all.filter(
    (u) =>
      (!search || u.email.toLowerCase().includes(search.toLowerCase())) &&
      (!statusF || u.status === statusF) &&
      (!roleF || u.role === roleF) &&
      (!mfaF || u.mfaStatus === mfaF) &&
      (!idpF || u.idp === idpF),
  );
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const cols: Column<UserRow>[] = [
    {
      key: "email",
      header: "User",
      sortValue: (r) => r.email,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.email}</span>,
    },
    {
      key: "role",
      header: "Enterprise role",
      sortValue: (r) => r.role,
      render: (r) => r.role,
    },
    { key: "bu", header: "Business unit", render: (r) => r.bu },
    { key: "idp", header: "Identity provider", render: (r) => r.idp },
    {
      key: "mfa",
      header: "MFA",
      sortValue: (r) => r.mfaStatus,
      render: (r) => <MfaBadge status={r.mfaStatus} />,
    },
    {
      key: "login",
      header: "Last login",
      sortValue: (r) => r.lastLogin,
      render: (r) => r.lastLogin,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusPill status={r.status} />,
    },
  ];

  const setStatus = (id: string, s: string) =>
    setOverlay((o) => ({ ...o, [id]: s }));

  // Deprovision = soft-delete: push to the recoverable "Deleted users" view, then remove from active.
  const deprovision = (id: string) => {
    const u = all.find((x) => x.id === id);
    if (u) onSoftDelete?.({ id: u.id, email: u.email, role: u.role });
    update.mutate(id);
  };

  const exportCsv = () => {
    const cols2 = ["email", "role", "bu", "idp", "mfa", "status", "lastLogin"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols2.join(",")]
      .concat(
        rows.map((r) =>
          cols2
            .map((c) => esc((r as unknown as Record<string, unknown>)[c]))
            .join(","),
        ),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ListView<UserRow>
        title="Users — joiner / mover / leaver"
        desc="Provision, re-role, suspend and deprovision identities. Click a user for full detail and lifecycle actions."
        loading={q.isLoading}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search active users list"
        count={rows.length}
        commands={[
          {
            key: "add",
            label: "Add a user",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () => setInviting(true),
          },
          {
            key: "templates",
            label: "User templates",
            icon: <Users size={15} />,
            onClick: (e) => {
              const r = (
                e?.currentTarget as HTMLElement | undefined
              )?.getBoundingClientRect();
              if (r) setTplMenu({ top: r.bottom + 4, left: r.left });
            },
          },
          {
            key: "multi",
            label: "Add multiple users",
            icon: <UsersRound size={15} />,
            disabled: !canEdit,
            onClick: () => setAddMulti(true),
          },
          {
            key: "mfa",
            label: "Multi-factor authentication",
            icon: <ShieldCheck size={15} />,
            onClick: () => {},
          },
          {
            key: "del",
            label: "Delete a user",
            icon: <Trash2 size={15} />,
            onClick: () => {},
          },
          {
            key: "refresh",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => q.refetch(),
          },
          {
            key: "export",
            label: "Export users",
            icon: <Download size={15} />,
            onClick: exportCsv,
          },
        ]}
        commandFarItems={
          <RowMenu
            items={[
              { label: "Export users", onClick: exportCsv },
              { label: "Change view", onClick: () => {} },
              { label: "Directory synchronization", onClick: () => {} },
            ]}
          />
        }
        presets={[
          { label: "All users", onApply: clearAllFilters },
          {
            label: "Active users",
            onApply: () => {
              clearAllFilters();
              setStatusF("active");
            },
          },
          {
            label: "Invited users",
            onApply: () => {
              clearAllFilters();
              setStatusF("invited");
            },
          },
          {
            label: "Suspended users",
            onApply: () => {
              clearAllFilters();
              setStatusF("suspended");
            },
          },
          {
            label: "MFA-disabled users",
            onApply: () => {
              clearAllFilters();
              setMfaF("Disabled");
            },
          },
          {
            label: "MFA at risk",
            onApply: () => {
              clearAllFilters();
              setMfaF("At Risk");
            },
          },
          {
            label: "Administrators",
            onApply: () => {
              clearAllFilters();
              setRoleF("Admin");
            },
          },
        ]}
        filterRightSlot={
          <ColumnChooser
            cols={cols}
            hidden={hidden}
            onToggle={(k) =>
              setHidden((s) => {
                const n = new Set(s);
                if (n.has(k)) n.delete(k);
                else n.add(k);
                return n;
              })
            }
          />
        }
        pills={[
          {
            key: "status",
            label: "Status",
            value: statusF,
            onChange: setStatusF,
            options: facet(all.map((u) => u.status)),
          },
          {
            key: "role",
            label: "Role",
            value: roleF,
            onChange: setRoleF,
            options: facet(all.map((u) => u.role)),
          },
          {
            key: "mfa",
            label: "MFA",
            value: mfaF,
            onChange: setMfaF,
            options: [
              { value: "", label: "All" },
              ...MFA_STATUSES.map((s) => ({ value: s, label: s })),
            ],
          },
          {
            key: "idp",
            label: "Identity provider",
            value: idpF,
            onChange: setIdpF,
            options: facet(all.map((u) => u.idp)),
          },
        ]}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={15}
        onRowClick={(r) => setSel(r)}
        selectable={canEdit}
        bulkActions={(ids, clear) => (
          <>
            <ConfirmButton
              variant="ghost"
              label={`Suspend (${ids.length})`}
              title="Suspend selected users"
              body={`Suspend ${ids.length} user(s)? Their sessions are revoked and sign-in is blocked.`}
              confirmLabel="Suspend"
              onConfirm={() => {
                ids.forEach((id) => setStatus(id, "suspended"));
                clear();
              }}
            />
            <HeaderButton onClick={clear}>Reset MFA</HeaderButton>
            <ConfirmButton
              variant="danger"
              label={`Deprovision (${ids.length})`}
              title="Deprovision selected users"
              body={`Permanently remove ${ids.length} user(s)? This revokes all their access.`}
              confirmWord="DEPROVISION"
              confirmLabel="Deprovision"
              onConfirm={() => {
                ids.forEach((id) => deprovision(id));
                clear();
              }}
            />
          </>
        )}
        rowActions={
          canEdit
            ? (r) => (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <button
                    type="button"
                    title="Reset password"
                    onClick={() => setResetting(r)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: T.textMuted,
                      cursor: "pointer",
                      padding: "4px 6px",
                    }}
                  >
                    <KeyRound size={14} />
                  </button>
                  <RowMenu
                    items={[
                      { label: "View details", onClick: () => setSel(r) },
                      {
                        label: "Reset password",
                        onClick: () => setResetting(r),
                      },
                      { label: "Reset MFA", onClick: () => {} },
                      r.status === "suspended"
                        ? {
                            label: "Reactivate",
                            onClick: () => setStatus(r.id, "active"),
                          }
                        : {
                            label: "Suspend",
                            onClick: () => setStatus(r.id, "suspended"),
                          },
                      {
                        label: "Deprovision",
                        danger: true,
                        onClick: () => deprovision(r.id),
                      },
                    ]}
                  />
                </span>
              )
            : undefined
        }
        empty={
          <EmptyState
            icon={<Plus size={20} />}
            title="No users yet"
            hint="Invite your first administrator."
            cta={canEdit ? "Invite user" : undefined}
            onCta={canEdit ? () => setInviting(true) : undefined}
          />
        }
      />
      {inviting && (
        <AddUserWizard
          domains={Array.from(
            new Set(all.map((u) => u.email.split("@")[1]).filter(Boolean)),
          )}
          onClose={() => setInviting(false)}
          onAdd={(u) => {
            add.mutate(u);
            setInviting(false);
          }}
        />
      )}
      {tplMenu && (
        <TemplatePickerFlyout
          anchor={tplMenu}
          templates={templates}
          onClose={() => setTplMenu(null)}
          onPick={(t) => {
            setTplMenu(null);
            setFromTpl(t);
          }}
          onManage={() => {
            setTplMenu(null);
            onOpenTemplates?.();
          }}
        />
      )}
      {fromTpl && (
        <AddUserWizard
          template={fromTpl}
          domains={Array.from(
            new Set(all.map((u) => u.email.split("@")[1]).filter(Boolean)),
          )}
          onClose={() => setFromTpl(null)}
          onAdd={(u) => {
            add.mutate(u);
            setFromTpl(null);
          }}
        />
      )}
      {addMulti && (
        <AddMultipleUsersWizard
          domains={Array.from(
            new Set(all.map((u) => u.email.split("@")[1]).filter(Boolean)),
          )}
          onClose={() => setAddMulti(false)}
          onAdd={(list) => {
            list.forEach((u) => add.mutate(u));
            setAddMulti(false);
          }}
        />
      )}
      {sel && (
        <UserDetailsDrawer
          key={sel.id}
          user={all.find((u) => u.id === sel.id) ?? sel}
          canEdit={canEdit}
          onClose={() => setSel(null)}
          onSave={(body) => {
            patch.mutate({ id: sel.id, body });
            setSel(null);
          }}
          onReset={() => {
            setResetting(sel);
            setSel(null);
          }}
          onStatus={(s) => setStatus(sel.id, s)}
          onDeprovision={() => {
            deprovision(sel.id);
            setSel(null);
          }}
        />
      )}
      {resetting && (
        <ResetPasswordDrawer
          email={resetting.email}
          onClose={() => setResetting(null)}
          onReset={() => setResetting(null)}
        />
      )}
    </>
  );
}

// ── User-templates flyout (attached menu): search + pick a template to start
//    "Add a user", or jump to Manage templates. ─────────────────────────────
function TemplatePickerFlyout({
  anchor,
  templates,
  onClose,
  onPick,
  onManage,
}: {
  anchor: { top: number; left: number };
  templates: UserTemplate[];
  onClose: () => void;
  onPick: (t: UserTemplate) => void;
  onManage: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const menuRef = React.useRef<HTMLDivElement>(null);
  const rows = templates.filter(
    (t) =>
      !query ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase()),
  );
  React.useEffect(() => {
    const close = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose]);
  const left = Math.min(anchor.left, window.innerWidth - 332);
  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: anchor.top,
        left: Math.max(8, left),
        width: 320,
        background: "var(--cg-workspace-dropdown-bg)",
        border: `1px solid ${T.borderStrong}`,
        borderRadius: 8,
        boxShadow: "var(--cg-shadow-dropdown)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        maxHeight: 420,
      }}
    >
      <div style={{ padding: 10, borderBottom: `1px solid ${T.border}` }}>
        <div
          style={{
            fontSize: 12,
            color: T.textMuted,
            margin: "0 2px 8px",
          }}
        >
          Add a user from a template
        </div>
        <span style={{ position: "relative", display: "block" }}>
          <span
            style={{
              position: "absolute",
              left: 9,
              top: 7,
              color: T.textMuted,
              fontSize: 13,
            }}
          >
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
            style={{
              height: 32,
              width: "100%",
              padding: "0 10px 0 26px",
              background: "var(--cg-input-bg)",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              color: T.textPrimary,
              fontSize: 13,
              outline: "none",
            }}
          />
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: "16px 12px",
              fontSize: 12.5,
              color: T.textMuted,
              textAlign: "center",
            }}
          >
            No templates found.
          </div>
        ) : (
          rows.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "var(--cg-bg-hover)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "transparent";
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: T.textPrimary,
                cursor: "pointer",
                display: "block",
                transition: "background 0.1s ease",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <Users size={13} color={T.textMuted} /> {t.name}
                {!t.published && (
                  <span style={{ fontSize: 10.5, color: T.textMuted }}>
                    · Private
                  </span>
                )}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 11.5,
                  color: T.textMuted,
                  marginTop: 2,
                  marginLeft: 20,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {[t.role, t.domain].filter(Boolean).join(" · ") ||
                  t.description ||
                  "—"}
              </span>
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onManage}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          width: "100%",
          padding: "10px 12px",
          borderTop: `1px solid ${T.border}`,
          background: "transparent",
          border: "none",
          borderTopColor: T.border,
          color: T.accent,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <Plus size={14} /> Manage templates
      </button>
    </div>
  );
}

// ── Choose columns dropdown (Microsoft "Choose columns") ──
function ColumnChooser({
  cols,
  hidden,
  onToggle,
}: {
  cols: Column<UserRow>[];
  hidden: Set<string>;
  onToggle: (k: string) => void;
}) {
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(
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
                : {
                    top: r.bottom + 4,
                    right: Math.max(8, window.innerWidth - r.right),
                  },
            );
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          color: T.textNav,
          background: "transparent",
          border: "none",
          cursor: "pointer",
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
            border: `1px solid ${T.borderStrong}`,
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
                color: T.textNav,
                cursor: "pointer",
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

// ── Add-user wizard — right-side stepped panel (Microsoft "Add a user") ──
interface NewUser {
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  domain: string;
  autoPassword: boolean;
  requireChange: boolean;
  location: string;
  role: string;
  noRole: boolean;
  jobTitle: string;
  department: string;
}
const WIZ_STEPS = [
  "Basics",
  "Roles & access",
  "Optional settings",
  "Review & finish",
];
function AddUserWizard({
  domains,
  initial,
  template,
  canEdit = true,
  onClose,
  onAdd,
  onUpdate,
}: {
  domains: string[];
  initial?: UserRow | null;
  template?: UserTemplate | null;
  canEdit?: boolean;
  onClose: () => void;
  onAdd: (u: Record<string, unknown>) => void;
  onUpdate?: (id: string, body: Record<string, unknown>) => void;
}) {
  const isEdit = !!initial;
  const dom = domains.length ? domains : ["sentinel-org.io"];
  const initUser = initial?.email?.split("@")[0] ?? "";
  const initDomain =
    initial?.email?.split("@")[1] ?? template?.domain ?? dom[0];
  // Editing opens straight on the Review step so the data is displayed and Save is in reach.
  const [step, setStep] = React.useState(isEdit ? WIZ_STEPS.length - 1 : 0);
  const [f, setF] = React.useState<NewUser>({
    firstName: "",
    lastName: "",
    displayName: initial?.name ?? "",
    username: initUser,
    domain: dom.includes(initDomain) ? initDomain : dom[0],
    autoPassword: template?.autoPassword ?? true,
    requireChange: template?.requireChange ?? true,
    location: "Tunisia",
    role: initial?.role ?? template?.role ?? "Viewer",
    noRole: false,
    jobTitle: template?.jobTitle ?? "",
    department:
      initial && initial.bu !== "—" ? initial.bu : (template?.department ?? ""),
  });
  const set = (p: Partial<NewUser>) => setF({ ...f, ...p });
  const errors = {
    displayName: !f.displayName.trim(),
    username: !f.username.trim(),
  };
  const hasErrors = errors.displayName || errors.username;
  const stepHasError = (i: number) => (i === 0 ? hasErrors : false);
  const onReview = step === WIZ_STEPS.length - 1;
  // High-water mark so visited steps stay checked when you click back to an earlier one.
  const maxRef = React.useRef(step);
  maxRef.current = Math.max(maxRef.current, step);
  const reachedMax = maxRef.current;

  const finish = () => {
    if (hasErrors) {
      setStep(3);
      return;
    }
    const body = {
      email: `${f.username.trim()}@${f.domain}`,
      name: f.displayName.trim(),
      role: f.noRole ? "Viewer" : f.role,
      bu: f.department || "—",
    };
    if (isEdit && initial) {
      onUpdate?.(initial.id, body);
    } else {
      onAdd({ ...body, status: "invited", mfa: false, idp: "Local" });
    }
  };

  return (
    <div
      onClick={onClose}
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
        style={{
          width: 760,
          maxWidth: "98vw",
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
            padding: "18px 24px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}
            >
              {isEdit ? "Edit user" : "Add a user"}
            </div>
            {template && !isEdit && (
              <span
                title={`Created from template “${template.name}”`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 24,
                  padding: "0 9px",
                  borderRadius: 4,
                  background: "var(--cg-accent-bg)",
                  border: `1px solid ${T.accent}`,
                  color: T.textPrimary,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                <Users size={12} color={T.accent} />
                Template: {template.name}
              </span>
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
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Stepper rail */}
          <div
            style={{
              width: 220,
              flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              padding: "24px 20px",
            }}
          >
            {WIZ_STEPS.map((s, i) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: i < WIZ_STEPS.length - 1 ? 4 : 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
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
                      fontSize: 11,
                      color: "#fff",
                      background:
                        onReview && stepHasError(i)
                          ? T.danger
                          : i <= reachedMax
                            ? T.accent
                            : "transparent",
                      border:
                        i > reachedMax && !(onReview && stepHasError(i))
                          ? `1.5px solid ${T.borderStrong}`
                          : "none",
                    }}
                  >
                    {onReview && stepHasError(i)
                      ? "✕"
                      : i <= reachedMax && i !== step
                        ? "✓"
                        : ""}
                  </span>
                  {i < WIZ_STEPS.length - 1 && (
                    <span
                      style={{
                        width: 1,
                        flex: 1,
                        minHeight: 22,
                        background: T.border,
                        margin: "2px 0",
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: i === step ? T.textPrimary : T.textNav,
                    fontSize: 13,
                    fontWeight: i === step ? 600 : 400,
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                    height: 18,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {s}
                </button>
              </div>
            ))}
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {step === 0 && (
              <>
                <H>Set up the basics</H>
                <P>
                  To get started, fill out some basic information about who
                  you’re adding as a user.
                </P>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <Field label="First name">
                    <input
                      value={f.firstName}
                      onChange={(e) => set({ firstName: e.target.value })}
                      style={inp}
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      value={f.lastName}
                      onChange={(e) => set({ lastName: e.target.value })}
                      style={inp}
                    />
                  </Field>
                </div>
                <Req label="Display name" err={errors.displayName}>
                  <input
                    value={f.displayName}
                    onChange={(e) => set({ displayName: e.target.value })}
                    style={errInp(errors.displayName)}
                  />
                </Req>
                {/* Username + @ + Domains — labels and inputs on aligned grid rows */}
                <div style={{ padding: "8px 0" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 28px 1fr",
                      gap: 0,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12.5,
                        color: T.textPrimary,
                        fontWeight: 500,
                      }}
                    >
                      Username <span style={{ color: T.danger }}>*</span>
                    </span>
                    <span />
                    <span style={{ fontSize: 12.5, color: T.textMuted }}>
                      Domains
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 28px 1fr",
                      gap: 0,
                      alignItems: "center",
                    }}
                  >
                    <input
                      value={f.username}
                      onChange={(e) => set({ username: e.target.value })}
                      style={errInp(errors.username)}
                    />
                    <span style={{ textAlign: "center", color: T.textMuted }}>
                      @
                    </span>
                    <select
                      value={f.domain}
                      onChange={(e) => set({ domain: e.target.value })}
                      style={{ ...inp, cursor: "pointer" }}
                    >
                      {dom.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  {errors.username && (
                    <span style={{ fontSize: 11.5, color: T.danger }}>
                      This field is required.
                    </span>
                  )}
                </div>
                <Chk
                  label="Automatically create a password"
                  on={f.autoPassword}
                  onChange={(v) => set({ autoPassword: v })}
                />
                <Chk
                  label="Require this user to change their password when they first sign in"
                  on={f.requireChange}
                  onChange={(v) => set({ requireChange: v })}
                />
              </>
            )}
            {step === 1 && (
              <>
                <H>Assign roles & access</H>
                <P>
                  Choose the enterprise role and home location for this user.
                </P>
                <Req label="Location">
                  <Sel
                    value={f.location}
                    onChange={(v) => set({ location: v })}
                    opts={["Tunisia", "Ireland", "United States", "Germany"]}
                  />
                </Req>
                <div
                  style={{
                    borderTop: `1px solid ${T.border}`,
                    paddingTop: 16,
                    marginTop: 8,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      marginBottom: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={!f.noRole}
                      onChange={() => set({ noRole: false })}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <span
                        style={{
                          fontSize: 13,
                          color: T.textPrimary,
                          fontWeight: 500,
                        }}
                      >
                        Assign an enterprise role
                      </span>
                      <span style={{ display: "block", marginTop: 8 }}>
                        <Sel
                          value={f.role}
                          onChange={(v) => set({ role: v })}
                          opts={ROLE_OPTS}
                        />
                      </span>
                    </span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={f.noRole}
                      onChange={() => set({ noRole: true })}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <span
                        style={{
                          fontSize: 13,
                          color: T.textPrimary,
                          fontWeight: 500,
                        }}
                      >
                        Create user without a role (not recommended)
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: T.textMuted,
                          marginTop: 2,
                        }}
                      >
                        They’ll have no access until you assign a role.
                      </span>
                    </span>
                  </label>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <H>Optional settings</H>
                <P>Profile information — you can fill this in now or later.</P>
                <Field label="Job title">
                  <input
                    value={f.jobTitle}
                    onChange={(e) => set({ jobTitle: e.target.value })}
                    style={inp}
                  />
                </Field>
                <Field label="Department / business unit">
                  <input
                    value={f.department}
                    onChange={(e) => set({ department: e.target.value })}
                    style={inp}
                  />
                </Field>
              </>
            )}
            {step === 3 && (
              <>
                <H>Review and finish</H>
                <P>
                  Review all the info and settings for this user before you
                  finish adding them.
                </P>
                <ReviewSec
                  title="Display and username"
                  onEdit={() => setStep(0)}
                  errors={[
                    errors.displayName ? "Please provide a display name." : "",
                    errors.username ? "Please provide a username." : "",
                  ].filter(Boolean)}
                >
                  <KV k="Display name" v={f.displayName || "—"} />
                  <KV
                    k="Username"
                    v={f.username ? `${f.username}@${f.domain}` : "—"}
                  />
                </ReviewSec>
                <ReviewSec title="Password" onEdit={() => setStep(0)}>
                  <KV
                    k="Type"
                    v={f.autoPassword ? "Auto-generated" : "Custom"}
                  />
                  <KV
                    k="Change on first sign-in"
                    v={f.requireChange ? "Required" : "No"}
                  />
                </ReviewSec>
                <ReviewSec title="Roles & access" onEdit={() => setStep(1)}>
                  <KV k="Location" v={f.location} />
                  <KV k="Role" v={f.noRole ? "None (no access)" : f.role} />
                </ReviewSec>
                <ReviewSec title="Profile info" onEdit={() => setStep(2)}>
                  <KV k="Job title" v={f.jobTitle || "—"} />
                  <KV k="Department" v={f.department || "—"} />
                </ReviewSec>
              </>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <HeaderButton
            disabled={step === 0}
            onClick={() => setStep((x) => Math.max(0, x - 1))}
          >
            Back
          </HeaderButton>
          <div style={{ display: "flex", gap: 10 }}>
            {onReview ? (
              <HeaderButton
                variant="primary"
                disabled={hasErrors || !canEdit}
                onClick={finish}
              >
                {isEdit ? "Save" : "Finish adding"}
              </HeaderButton>
            ) : (
              <HeaderButton
                variant="primary"
                onClick={() => setStep((x) => x + 1)}
              >
                Next
              </HeaderButton>
            )}
            <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          </div>
        </div>
      </div>
    </div>
  );
}
function H({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: T.textPrimary,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: T.textMuted,
        marginBottom: 22,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
function Req({
  label,
  err,
  children,
}: {
  label: string;
  err?: boolean;
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
      <span style={{ fontSize: 12.5, color: T.textPrimary, fontWeight: 500 }}>
        {label} <span style={{ color: T.danger }}>*</span>
      </span>
      {children}
      {err && (
        <span style={{ fontSize: 11.5, color: T.danger }}>
          This field is required.
        </span>
      )}
    </div>
  );
}
function errInp(err?: boolean): React.CSSProperties {
  return { ...inp, border: `1px solid ${err ? T.danger : T.border}` };
}
function Chk({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 0",
        fontSize: 13,
        color: T.textPrimary,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function ReviewSec({
  title,
  onEdit,
  errors,
  children,
}: {
  title: string;
  onEdit: () => void;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: T.textPrimary,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {(errors ?? []).map((e) => (
        <div
          key={e}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 6,
            background: "var(--cg-danger-bg)",
            border: `1px solid var(--cg-danger-border)`,
            fontSize: 12.5,
            color: T.danger,
            marginBottom: 6,
          }}
        >
          <AlertTriangle size={14} /> {e}
        </div>
      ))}
      {children}
      <button
        type="button"
        onClick={onEdit}
        style={{
          background: "transparent",
          border: "none",
          color: T.accent,
          fontSize: 12.5,
          cursor: "pointer",
          padding: "4px 0 0",
        }}
      >
        Edit
      </button>
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "2px 0" }}>
      <span style={{ color: T.textMuted, minWidth: 150 }}>{k}</span>
      <span style={{ color: T.textPrimary }}>{v}</span>
    </div>
  );
}

// ════════════ §7.4 Enterprise Roles (LIVE) + SoD + workspace roles ════════════

// ════════════ §7.5 Role Assignments + effective-permission resolver ════════════

// ════════════ §7.6 Privileged Access — JIT/PIM activation ════════════

// ════════════════════════════════════════════════════════════════════════════
// §7.9 Sessions — operational control plane for active access. Same Users
// hierarchy: 6 collections (Active / Privileged / Service / Failed Sign-ins /
// Risky / Session Policies), each a ListView collection + shared DetailDrawer.
// Reuses AuthCollection / AuthEntityDrawer / flows. Representative `Sample` data.
// ════════════════════════════════════════════════════════════════════════════
const SESSION_SUBS = [
  "Active Sessions",
  "Privileged Sessions",
  "Service Sessions",
  "Failed Sign-ins",
  "Risky Sessions",
  "Session Policies",
];
function SessionsTab() {
  const [sub, setSub] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={SESSION_SUBS} active={sub} onChange={setSub} />
      {sub === 0 && <ActiveSessions />}
      {sub === 1 && <PrivilegedSessions />}
      {sub === 2 && <ServiceSessions />}
      {sub === 3 && <FailedSignins />}
      {sub === 4 && <RiskySessions />}
      {sub === 5 && <SessionPolicies />}
    </div>
  );
}

// ── 1. ACTIVE SESSIONS ──────────────────────────────────────────────────────
function ActiveSessions() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      identity: "rami@inferencedefense.com",
      idtype: "Human",
      workspace: "Production",
      app: "Admin Console",
      device: "MacBook Pro",
      ip: "196.203.•.•",
      location: "Tunis, TN",
      method: "Passkey",
      started: "2026-06-24 07:42",
      lastActivity: "2026-06-24 09:10",
      risk: "Low",
      status: "Active",
    },
    {
      id: "1",
      identity: "marc@sentinel-org.io",
      idtype: "Human",
      workspace: "SOC",
      app: "Findings",
      device: "Windows 11",
      ip: "84.12.•.•",
      location: "Paris, FR",
      method: "Password",
      started: "2026-06-24 06:30",
      lastActivity: "2026-06-24 08:55",
      risk: "High",
      status: "Active",
    },
    {
      id: "2",
      identity: "ci-deploy",
      idtype: "Service",
      workspace: "Production",
      app: "Deploy API",
      device: "Runner",
      ip: "10.0.•.•",
      location: "eu-west-1",
      method: "OIDC",
      started: "2026-06-24 09:00",
      lastActivity: "2026-06-24 09:09",
      risk: "Low",
      status: "Idle",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const term = (ids: string[]) =>
    setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
  const pick = () =>
    rows.map((r) => ({
      id: r.id,
      label: r.identity,
      sub: `${r.app} · ${r.location}`,
    }));
  const cols = aCols([
    ["identity", "Identity"],
    ["idtype", "Identity Type"],
    ["workspace", "Workspace"],
    ["app", "Application"],
    ["device", "Device"],
    ["ip", "IP Address"],
    ["location", "Location"],
    ["method", "Auth Method"],
    ["started", "Session Started"],
    ["lastActivity", "Last Activity"],
    ["risk", "Risk", (r) => <AStatus s={r.risk} />],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Active Sessions — monitor / investigate / terminate"
        desc="View and manage active authenticated sessions across users, service identities and federated identities."
        searchPlaceholder="Search active sessions"
        kpi={
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6,1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <MetricTile label="Active sessions" value={String(rows.length)} />
            <MetricTile label="Unique users" value="2" />
            <MetricTile label="Privileged sessions" value="1" tone="warn" />
            <MetricTile label="Service sessions" value="1" />
            <MetricTile label="High risk sessions" value="1" tone="danger" />
            <MetricTile label="Avg session duration" value="42m" />
          </div>
        }
        commands={[
          {
            key: "term",
            label: "Terminate Sessions",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Terminate session"
                  subtitle="Choose a session to terminate."
                  items={pick()}
                  actionLabel="Terminate"
                  danger
                  onApply={(id) => {
                    term([id]);
                    setFlow(null);
                    setToast("Session terminated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "termuser",
            label: "Terminate User Sessions",
            icon: <Users size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Terminate user sessions"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setRows((rs) =>
                      rs.filter((r) => !s.includes(r.identity.split("@")[0])),
                    );
                    setFlow(null);
                    setToast(`Sessions terminated for ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "revoke",
            label: "Revoke Tokens",
            icon: <KeyRound size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke tokens"
                  subtitle="Choose a session to revoke its tokens."
                  items={pick()}
                  actionLabel="Revoke tokens"
                  danger
                  onApply={() => {
                    setFlow(null);
                    setToast("Tokens revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "reauth",
            label: "Force Re-authentication",
            icon: <ShieldCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Force re-authentication"
                  subtitle="Choose a session to force re-auth."
                  items={pick()}
                  actionLabel="Force re-auth"
                  onApply={() => {
                    setFlow(null);
                    setToast("Re-authentication required");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export Sessions",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "active-sessions"),
          },
        ]}
        filterDefs={[
          { key: "status", label: "Status" },
          { key: "idtype", label: "Identity Type" },
          { key: "workspace", label: "Workspace" },
          { key: "location", label: "Location" },
          { key: "device", label: "Device" },
          { key: "app", label: "Application" },
          { key: "risk", label: "Risk" },
          { key: "method", label: "Auth Method" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <ConfirmButton
                    variant="danger"
                    label={`Terminate Sessions (${ids.length})`}
                    title="Terminate sessions"
                    body={`Terminate ${ids.length} session(s)? Those users must re-authenticate.`}
                    confirmLabel="Terminate"
                    onConfirm={() => {
                      term(ids);
                      clear();
                    }}
                  />
                  <HeaderButton
                    onClick={() => {
                      setToast("Tokens revoked");
                      clear();
                    }}
                  >
                    Revoke Tokens
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setToast("Re-authentication forced");
                      clear();
                    }}
                  >
                    Force Re-authentication
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Terminate Session",
                  danger: true,
                  onClick: () => term([r.id]),
                },
                {
                  label: "Revoke Tokens",
                  onClick: () => setToast(`Tokens revoked for ${r.identity}`),
                },
                {
                  label: "Force Re-authentication",
                  onClick: () => setToast(`Re-auth forced for ${r.identity}`),
                },
                {
                  label: "Open Investigation",
                  onClick: () =>
                    setFlow(
                      <InvestigationFlow
                        prefill={`Session — ${r.identity}`}
                        onClose={() => setFlow(null)}
                        onDone={(t) => {
                          setFlow(null);
                          setToast(`Investigation “${t}” opened`);
                        }}
                      />,
                    ),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.identity)}
            title={r.identity}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.idtype} · <AStatus s={r.status} /> · {r.location}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    onClick={() => {
                      term([r.id]);
                      close();
                    }}
                  >
                    Terminate
                  </HeaderButton>
                  <HeaderButton onClick={() => setToast("Tokens revoked")}>
                    Revoke Tokens
                  </HeaderButton>
                  <HeaderButton onClick={() => setToast("Re-auth forced")}>
                    Force Re-auth
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Identity",
                    content: kvb([
                      { k: "User", v: r.identity },
                      { k: "Type", v: r.idtype },
                      { k: "Workspace", v: r.workspace },
                      { k: "Application", v: r.app },
                    ]),
                  },
                  {
                    label: "Session",
                    content: kvb([
                      { k: "Session ID", v: `sess_${r.id}f2c1a9e` },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      { k: "Started", v: r.started },
                      { k: "Duration", v: "1h 28m" },
                      { k: "Last activity", v: r.lastActivity },
                    ]),
                  },
                  {
                    label: "Device & Network",
                    content: kvb([
                      { k: "IP address", v: r.ip },
                      { k: "Location", v: r.location },
                      { k: "Device", v: r.device },
                      { k: "Browser", v: "Safari 18" },
                      {
                        k: "Operating system",
                        v: r.device.includes("Mac") ? "macOS 15" : "Windows 11",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Authentication",
                subs: [
                  {
                    label: "Authentication",
                    content: (
                      <>
                        {kvb([
                          { k: "Authentication method", v: r.method },
                          {
                            k: "MFA method",
                            v:
                              r.method === "Passkey"
                                ? "Passkey (FIDO2)"
                                : "Authenticator",
                          },
                          { k: "Identity provider", v: "Microsoft Entra ID" },
                          {
                            k: "Authentication strength",
                            v: (
                              <AStatus
                                s={
                                  r.method === "Passkey"
                                    ? "Phishing-resistant"
                                    : "Strong"
                                }
                              />
                            ),
                          },
                          { k: "Token type", v: "OIDC access + refresh" },
                          { k: "Session risk", v: <AStatus s={r.risk} /> },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              onClick={() => setToast("Tokens revoked")}
                            >
                              Revoke Tokens
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Re-auth required")}
                            >
                              Require Re-authentication
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Login",
                        secondary: `${r.method} · ${r.location}`,
                        right: r.started,
                      },
                      {
                        primary: "MFA challenge",
                        secondary: "passed",
                        right: r.started,
                      },
                      {
                        primary: "Token refresh",
                        secondary: "—",
                        right: "08:30",
                      },
                      {
                        primary: "Application access",
                        secondary: r.app,
                        right: r.lastActivity,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Access",
                subs: [
                  {
                    label: "Access",
                    content: tlb([
                      {
                        primary: "Applications accessed",
                        secondary: `${r.app}, Reports`,
                        right: "",
                      },
                      {
                        primary: "Workspaces accessed",
                        secondary: r.workspace,
                        right: "",
                      },
                      {
                        primary: "Sensitive resources",
                        secondary: r.risk === "High" ? "Audit ledger" : "None",
                        right: "",
                      },
                      {
                        primary: "Administrative actions",
                        secondary: r.idtype === "Human" ? "3" : "0",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Session created",
                        secondary: r.method,
                        right: r.started,
                      },
                      {
                        primary: "Authentication successful",
                        secondary: "MFA",
                        right: r.started,
                      },
                      {
                        primary:
                          r.risk === "High"
                            ? "Risk detected"
                            : "Token refreshed",
                        secondary:
                          r.risk === "High" ? "anomalous location" : "—",
                        right: r.lastActivity,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 2. PRIVILEGED SESSIONS ──────────────────────────────────────────────────
function PrivilegedSessions() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "rami@inferencedefense.com",
      role: "Enterprise Security Administrator",
      elevSource: "PIM activation",
      duration: "5h 18m left",
      risk: "Low",
      status: "Active",
    },
    {
      id: "1",
      user: "security-ops@inferencedefense.com",
      role: "Compliance Administrator",
      elevSource: "Break-glass",
      duration: "42m left",
      risk: "High",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const term = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const pick = () =>
    rows.map((r) => ({ id: r.id, label: r.user, sub: r.role }));
  const cols = aCols([
    ["user", "User"],
    ["role", "Privileged Role"],
    ["elevSource", "Elevation Source"],
    ["duration", "Duration"],
    ["risk", "Risk", (r) => <AStatus s={r.risk} />],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Privileged Sessions — elevated access monitoring"
        desc="Monitor and control sessions operating under privileged roles."
        searchPlaceholder="Search privileged sessions"
        kpi={
          <InfoBanner icon={<ShieldCheck size={15} />}>
            A privileged session is an active elevation. These are governed
            end-to-end (eligibility, approval, JIT expiry, recording) in{" "}
            <strong>Access → Privileged Access → Active Access</strong>; this
            view is the live session lens of that store.
          </InfoBanner>
        }
        commands={[
          {
            key: "term",
            label: "Terminate Session",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Terminate privileged session"
                  subtitle="Choose a session to terminate."
                  items={pick()}
                  actionLabel="Terminate"
                  danger
                  onApply={(id) => {
                    term(id);
                    setFlow(null);
                    setToast("Session terminated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "elev",
            label: "Remove Elevation",
            icon: <RotateCcw size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Remove elevation"
                  subtitle="Choose a session to drop to standard access."
                  items={pick()}
                  actionLabel="Remove elevation"
                  danger
                  onApply={(id) => {
                    term(id);
                    setFlow(null);
                    setToast("Elevation removed");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "privileged-sessions"),
          },
        ]}
        filterDefs={[
          { key: "role", label: "Role" },
          { key: "elevSource", label: "Elevation Type" },
          { key: "risk", label: "Risk" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Remove Elevation",
                  danger: true,
                  onClick: () => term(r.id),
                },
                {
                  label: "Terminate Session",
                  danger: true,
                  onClick: () => term(r.id),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.user}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.role} · <AStatus s={r.risk} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    onClick={() => {
                      term(r.id);
                      close();
                    }}
                  >
                    Remove Elevation
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      term(r.id);
                      close();
                    }}
                  >
                    Terminate Session
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "User", v: r.user },
                      { k: "Privileged role", v: r.role },
                      { k: "Elevation source", v: r.elevSource },
                      { k: "Duration", v: r.duration },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Elevation",
                subs: [
                  {
                    label: "Elevation",
                    content: kvb([
                      { k: "Role", v: r.role },
                      { k: "Elevation source", v: r.elevSource },
                      {
                        k: "Approval chain",
                        v:
                          r.elevSource === "Break-glass"
                            ? "Bypassed (alarmed)"
                            : "ciso@inferencedefense.com",
                      },
                      { k: "Approval date", v: "2026-06-24 07:40" },
                      { k: "Expiration", v: r.duration },
                    ]),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Privileged operation",
                        secondary: "Policy change",
                        right: "08:12",
                      },
                      {
                        primary: "Elevation activated",
                        secondary: r.elevSource,
                        right: "07:42",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Approvals",
                subs: [
                  {
                    label: "Approvals",
                    content: tlb([
                      {
                        primary:
                          r.elevSource === "Break-glass"
                            ? "Break-glass used"
                            : "Activation approved",
                        secondary:
                          r.elevSource === "Break-glass"
                            ? "alarmed to SIEM"
                            : "by ciso@inferencedefense.com",
                        right: "07:40",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Elevation granted",
                        secondary: r.role,
                        right: "07:42",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 3. SERVICE SESSIONS ─────────────────────────────────────────────────────
function ServiceSessions() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      identity: "ci-deploy",
      type: "Service Account",
      workspace: "Production",
      credential: "OIDC token",
      lastActivity: "2026-06-24 09:09",
      status: "Active",
    },
    {
      id: "1",
      identity: "siem-export",
      type: "API Client",
      workspace: "SOC",
      credential: "API key",
      lastActivity: "2026-06-24 08:40",
      status: "Active",
    },
    {
      id: "2",
      identity: "connector-aws",
      type: "Workload Identity",
      workspace: "Production",
      credential: "Certificate (STS)",
      lastActivity: "2026-06-24 05:01",
      status: "Idle",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const term = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const pick = () =>
    rows.map((r) => ({ id: r.id, label: r.identity, sub: r.type }));
  const cols = aCols([
    ["identity", "Identity"],
    ["type", "Type"],
    ["workspace", "Workspace"],
    ["credential", "Credential"],
    ["lastActivity", "Last Activity"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Service Sessions — machine-to-machine access"
        desc="Visibility into machine-to-machine authenticated access by service identities, API clients and workloads."
        searchPlaceholder="Search service sessions"
        commands={[
          {
            key: "term",
            label: "Terminate Session",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Terminate service session"
                  subtitle="Choose a session to terminate."
                  items={pick()}
                  actionLabel="Terminate"
                  danger
                  onApply={(id) => {
                    term(id);
                    setFlow(null);
                    setToast("Session terminated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "revoke",
            label: "Revoke Tokens",
            icon: <KeyRound size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke tokens"
                  subtitle="Choose a service to revoke its tokens."
                  items={pick()}
                  actionLabel="Revoke tokens"
                  danger
                  onApply={() => {
                    setFlow(null);
                    setToast("Tokens revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "rot",
            label: "Rotate Credentials",
            icon: <RotateCcw size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Rotate credentials"
                  subtitle="Choose a service to rotate its credentials."
                  items={pick()}
                  actionLabel="Rotate"
                  onApply={() => {
                    setFlow(null);
                    setToast("Credentials rotated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "service-sessions"),
          },
        ]}
        filterDefs={[
          { key: "type", label: "Identity Type" },
          { key: "workspace", label: "Workspace" },
          { key: "credential", label: "Credential Type" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Rotate Credentials",
                  onClick: () =>
                    setToast(`Credentials rotated for ${r.identity}`),
                },
                {
                  label: "Revoke Tokens",
                  onClick: () => setToast("Tokens revoked"),
                },
                {
                  label: "Terminate Session",
                  danger: true,
                  onClick: () => term(r.id),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.identity)}
            title={r.identity}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.type} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Credentials rotated")}>
                    Rotate Credentials
                  </HeaderButton>
                  <HeaderButton onClick={() => setToast("Tokens revoked")}>
                    Revoke Tokens
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      term(r.id);
                      close();
                    }}
                  >
                    Terminate
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Identity", v: r.identity },
                      { k: "Type", v: r.type },
                      { k: "Workspace", v: r.workspace },
                      { k: "Credential", v: r.credential },
                      { k: "Last activity", v: r.lastActivity },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Authentication",
                subs: [
                  {
                    label: "Authentication",
                    content: kvb([
                      {
                        k: "OIDC token",
                        v: r.credential.includes("OIDC") ? "Active" : "—",
                      },
                      {
                        k: "Certificate",
                        v: r.credential.includes("Cert") ? "Valid · 312d" : "—",
                      },
                      {
                        k: "API key",
                        v: r.credential.includes("API")
                          ? "ak_live_••••8f2c"
                          : "—",
                      },
                      { k: "Secret", v: "vault-managed" },
                      { k: "Expiration", v: "2026-09-01" },
                    ]),
                  },
                ],
              },
              {
                label: "API Activity",
                subs: [
                  {
                    label: "API Activity",
                    content: kvb([
                      { k: "API calls (24h)", v: "12,840" },
                      { k: "Requests", v: "12,840" },
                      { k: "Failures", v: "9" },
                      { k: "Rate", v: "8.9 req/s" },
                      { k: "Last access", v: r.lastActivity },
                    ]),
                  },
                ],
              },
              {
                label: "Access",
                subs: [
                  {
                    label: "Access",
                    content: tlb([
                      {
                        primary: "Resources accessed",
                        secondary: r.workspace,
                        right: "",
                      },
                      {
                        primary: "Scopes",
                        secondary: "deploy:prod, scan:all",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Session established",
                        secondary: r.credential,
                        right: r.lastActivity,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 4. FAILED SIGN-INS ──────────────────────────────────────────────────────
function FailedSignins() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      identity: "marc@sentinel-org.io",
      reason: "Invalid Password",
      ip: "84.12.•.•",
      location: "Paris, FR",
      time: "2026-06-24 06:28",
      status: "Open",
    },
    {
      id: "1",
      identity: "unknown@external.io",
      reason: "Account Disabled",
      ip: "203.0.•.•",
      location: "Frankfurt, DE",
      time: "2026-06-24 04:11",
      status: "Blocked",
    },
    {
      id: "2",
      identity: "rami@inferencedefense.com",
      reason: "MFA Failure",
      ip: "196.203.•.•",
      location: "Tunis, TN",
      time: "2026-06-23 22:05",
      status: "Resolved",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["identity", "Identity"],
    [
      "reason",
      "Failure Reason",
      (r) => (
        <AStatus
          s={
            r.reason.includes("Disabled") || r.reason.includes("Block")
              ? "danger"
              : "Failed"
          }
        />
      ),
    ],
    ["ip", "IP Address"],
    ["location", "Location"],
    ["time", "Time"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Failed Sign-ins — investigation"
        desc="Centralized investigation of failed authentication attempts across the organization."
        searchPlaceholder="Search failed sign-ins"
        commands={[
          {
            key: "inv",
            label: "Open Investigation",
            icon: <ShieldCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <InvestigationFlow
                  onClose={() => setFlow(null)}
                  onDone={(t) => {
                    setFlow(null);
                    setToast(`Investigation “${t}” opened`);
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "failed-signins"),
          },
        ]}
        filterDefs={[
          { key: "reason", label: "Failure Reason" },
          { key: "location", label: "Location" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) => [
          { label: "View Details", onClick: open },
          {
            label: "Open Investigation",
            onClick: () =>
              setFlow(
                <InvestigationFlow
                  prefill={`Failed sign-in — ${r.identity}`}
                  onClose={() => setFlow(null)}
                  onDone={(t) => {
                    setFlow(null);
                    setToast(`Investigation “${t}” opened`);
                  }}
                />,
              ),
          },
        ]}
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.identity)}
            title={r.identity}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.reason} · {r.location}
              </span>
            }
            actions={
              canEdit ? (
                <HeaderButton
                  variant="primary"
                  onClick={() =>
                    setFlow(
                      <InvestigationFlow
                        prefill={`Failed sign-in — ${r.identity}`}
                        onClose={() => setFlow(null)}
                        onDone={(t) => {
                          setFlow(null);
                          setToast(`Investigation “${t}” opened`);
                        }}
                      />,
                    )
                  }
                >
                  Open Investigation
                </HeaderButton>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Identity", v: r.identity },
                      { k: "Failure reason", v: r.reason },
                      { k: "IP address", v: r.ip },
                      { k: "Location", v: r.location },
                      { k: "Time", v: r.time },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Failure Analysis",
                subs: [
                  {
                    label: "Failure Analysis",
                    content: kvb([
                      {
                        k: "Invalid password",
                        v: r.reason === "Invalid Password" ? "Yes" : "No",
                      },
                      {
                        k: "MFA failure",
                        v: r.reason === "MFA Failure" ? "Yes" : "No",
                      },
                      {
                        k: "Account disabled",
                        v: r.reason === "Account Disabled" ? "Yes" : "No",
                      },
                      {
                        k: "Blocked device",
                        v: r.status === "Blocked" ? "Yes" : "No",
                      },
                      { k: "Policy violation", v: "No" },
                    ]),
                  },
                ],
              },
              {
                label: "Related Events",
                subs: [
                  {
                    label: "Related Events",
                    content: tlb([
                      {
                        primary: "Failed attempt",
                        secondary: `${r.reason} · ${r.ip}`,
                        right: r.time,
                      },
                      {
                        primary: "Prior failure",
                        secondary: "same IP",
                        right: "2026-06-24 06:20",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Sign-in failed",
                        secondary: r.reason,
                        right: r.time,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 5. RISKY SESSIONS ───────────────────────────────────────────────────────
function RiskySessions() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      identity: "marc@sentinel-org.io",
      riskType: "Impossible Travel",
      score: "82",
      detection: "2026-06-24 06:31",
      status: "Open",
    },
    {
      id: "1",
      identity: "guest@offsec-partners.io",
      riskType: "Anonymous IP",
      score: "74",
      detection: "2026-06-24 03:18",
      status: "Investigating",
    },
    {
      id: "2",
      identity: "svc-legacy",
      riskType: "Credential Theft",
      score: "91",
      detection: "2026-06-23 23:55",
      status: "Open",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const term = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const pick = () =>
    rows.map((r) => ({ id: r.id, label: r.identity, sub: r.riskType }));
  const cols = aCols([
    ["identity", "Identity"],
    ["riskType", "Risk Type"],
    [
      "score",
      "Score",
      (r) => (
        <StatusIndicator tone={Number(r.score) >= 80 ? "danger" : "warn"}>
          {r.score}
        </StatusIndicator>
      ),
    ],
    ["detection", "Detection"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Risky Sessions — SOC & incident response"
        desc="SOC and incident-response focused session investigations and response."
        searchPlaceholder="Search risky sessions"
        kpi={
          <InfoBanner icon={<ShieldAlert size={15} />}>
            Session-risk signals here (impossible travel, anonymous IP,
            credential theft) feed{" "}
            <strong>Identity Alerts → Identity Threats</strong>, the unified
            detection queue — investigate and respond from either lens against
            the same finding.
          </InfoBanner>
        }
        commands={[
          {
            key: "term",
            label: "Terminate Session",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Terminate risky session"
                  subtitle="Choose a session to terminate."
                  items={pick()}
                  actionLabel="Terminate"
                  danger
                  onApply={(id) => {
                    term(id);
                    setFlow(null);
                    setToast("Session terminated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "inv",
            label: "Open Investigation",
            icon: <ShieldCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <InvestigationFlow
                  onClose={() => setFlow(null)}
                  onDone={(t) => {
                    setFlow(null);
                    setToast(`Investigation “${t}” opened`);
                  }}
                />,
              ),
          },
          {
            key: "ana",
            label: "Assign Analyst",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Assign analyst"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Assigned to ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "risky-sessions"),
          },
        ]}
        filterDefs={[
          { key: "score", label: "Risk Level" },
          { key: "riskType", label: "Risk Type" },
          { key: "status", label: "Status" },
          { key: "identity", label: "Identity" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Terminate Session",
                  danger: true,
                  onClick: () => term(r.id),
                },
                {
                  label: "Open Investigation",
                  onClick: () =>
                    setFlow(
                      <InvestigationFlow
                        prefill={`Risky session — ${r.identity}`}
                        onClose={() => setFlow(null)}
                        onDone={(t) => {
                          setFlow(null);
                          setToast(`Investigation “${t}” opened`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Assign Analyst",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title="Assign analyst"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    ),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.identity)}
            title={r.identity}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.riskType} · score {r.score}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => {
                      term(r.id);
                      close();
                    }}
                  >
                    Terminate Session
                  </HeaderButton>
                  <HeaderButton onClick={() => setToast("Password reset")}>
                    Reset Password
                  </HeaderButton>
                  <HeaderButton onClick={() => setToast("MFA required")}>
                    Require MFA
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <InvestigationFlow
                          prefill={`Incident — ${r.identity}`}
                          onClose={() => setFlow(null)}
                          onDone={(t) => {
                            setFlow(null);
                            setToast(`Incident “${t}” opened`);
                          }}
                        />,
                      )
                    }
                  >
                    Open Incident
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Identity", v: r.identity },
                      { k: "Risk type", v: r.riskType },
                      {
                        k: "Score",
                        v: (
                          <StatusIndicator
                            tone={Number(r.score) >= 80 ? "danger" : "warn"}
                          >
                            {r.score}
                          </StatusIndicator>
                        ),
                      },
                      { k: "Detected", v: r.detection },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Detection",
                subs: [
                  {
                    label: "Detection",
                    content: kvb([
                      {
                        k: "Impossible travel",
                        v:
                          r.riskType === "Impossible Travel" ? "Detected" : "—",
                      },
                      {
                        k: "Anonymous IP",
                        v: r.riskType === "Anonymous IP" ? "Detected" : "—",
                      },
                      {
                        k: "Credential theft",
                        v: r.riskType === "Credential Theft" ? "Detected" : "—",
                      },
                      { k: "Impossible device", v: "—" },
                      {
                        k: "Unusual location",
                        v: r.riskType === "Impossible Travel" ? "Yes" : "—",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Evidence",
                subs: [
                  {
                    label: "Evidence",
                    content: tlb([
                      {
                        primary: "Sign-in — Tunis, TN",
                        secondary: "07:42",
                        right: "",
                      },
                      {
                        primary: "Sign-in — Frankfurt, DE",
                        secondary: "07:55 (impossible)",
                        right: "",
                      },
                      {
                        primary: "Device fingerprint mismatch",
                        secondary: "new device",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Response",
                subs: [
                  {
                    label: "Response",
                    content: (
                      <>
                        {tlb([
                          {
                            primary: "Recommended",
                            secondary:
                              "Terminate + reset password + require MFA",
                            right: "",
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => {
                                term(r.id);
                                close();
                              }}
                            >
                              Terminate Session
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Password reset")}
                            >
                              Reset Password
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("MFA required")}
                            >
                              Require MFA
                            </HeaderButton>
                            <HeaderButton
                              onClick={() =>
                                setFlow(
                                  <AssignFlow
                                    title="Assign owner"
                                    onClose={() => setFlow(null)}
                                    onDone={(s) => {
                                      setFlow(null);
                                      setToast(`Assigned to ${s}`);
                                    }}
                                  />,
                                )
                              }
                            >
                              Assign Owner
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Risk detected",
                        secondary: r.riskType,
                        right: r.detection,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 6. SESSION POLICIES ─────────────────────────────────────────────────────
function SessionPolicies() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      policy: "Standard session",
      scope: "Organization",
      assignments: "289",
      status: "Active",
      modified: "2026-05-10",
      maxDur: "8 hours",
      idle: "30 min",
      reauth: "12 hours",
      privTimeout: "1 hour",
      concurrent: "3",
      tokenLife: "1 hour",
      refreshLife: "8 hours",
    },
    {
      id: "1",
      policy: "Privileged session",
      scope: "Role: Admins",
      assignments: "7",
      status: "Active",
      modified: "2026-04-02",
      maxDur: "4 hours",
      idle: "10 min",
      reauth: "1 hour",
      privTimeout: "30 min",
      concurrent: "1",
      tokenLife: "30 min",
      refreshLife: "2 hours",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const pick = () =>
    rows.map((r) => ({ id: r.id, label: r.policy, sub: r.scope }));
  const cols = aCols([
    ["policy", "Policy"],
    ["scope", "Scope"],
    ["assignments", "Assignments"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
    ["modified", "Last Modified"],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Session Policies — lifecycle governance"
        desc="Define governance rules for session lifecycle: duration, idle timeout, re-authentication, concurrency and token lifetimes."
        searchPlaceholder="Search policies"
        commands={[
          {
            key: "new",
            label: "Create Policy",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PolicyWizardFlow
                  kind="Session"
                  onClose={() => setFlow(null)}
                  onCreate={(n, s) => {
                    setRows((rs) => [
                      {
                        id: `s${Date.now()}`,
                        policy: n,
                        scope: s,
                        assignments: "0",
                        status: "Active",
                        modified: new Date().toISOString().slice(0, 10),
                        maxDur: "8 hours",
                        idle: "30 min",
                        reauth: "12 hours",
                        privTimeout: "1 hour",
                        concurrent: "3",
                        tokenLife: "1 hour",
                        refreshLife: "8 hours",
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast(`Policy “${n}” created`);
                  }}
                />,
              ),
          },
          {
            key: "clone",
            label: "Clone Policy",
            icon: <Columns3 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Clone policy"
                  subtitle="Choose a policy to clone."
                  items={pick()}
                  actionLabel="Clone"
                  onApply={(id) => {
                    const src = rows.find((x) => x.id === id);
                    if (src)
                      setRows((rs) => [
                        {
                          ...src,
                          id: `s${Date.now()}`,
                          policy: `${src.policy} (copy)`,
                        },
                        ...rs,
                      ]);
                    setFlow(null);
                    setToast("Policy cloned");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "assign",
            label: "Assign Policy",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Assign session policy"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Assigned to ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "del",
            label: "Delete Policy",
            icon: <Trash2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Delete policy"
                  subtitle="Choose a policy to delete."
                  items={pick()}
                  actionLabel="Delete"
                  danger
                  onApply={(id) => {
                    setRows((rs) => rs.filter((x) => x.id !== id));
                    setFlow(null);
                    setToast("Policy deleted");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "session-policies"),
          },
        ]}
        filterDefs={[
          { key: "scope", label: "Scope" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Edit",
                  onClick: () => setToast(`Editing ${r.policy}`),
                },
                {
                  label: "Clone",
                  onClick: () => {
                    setRows((rs) => [
                      {
                        ...r,
                        id: `s${Date.now()}`,
                        policy: `${r.policy} (copy)`,
                      },
                      ...rs,
                    ]);
                    setToast("Cloned");
                  },
                },
                {
                  label: "Assign",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title={`Assign ${r.policy}`}
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.policy)}
            title={r.policy}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                Session policy · {r.scope}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => setToast("Editing")}
                  >
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setRows((rs) => [
                        {
                          ...r,
                          id: `s${Date.now()}`,
                          policy: `${r.policy} (copy)`,
                        },
                        ...rs,
                      ]);
                      close();
                    }}
                  >
                    Clone
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <AssignFlow
                          title={`Assign ${r.policy}`}
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            setFlow(null);
                            setToast(`Assigned to ${s}`);
                          }}
                        />,
                      )
                    }
                  >
                    Assign
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Policy name", v: r.policy },
                      { k: "Scope", v: r.scope },
                      { k: "Assignments", v: r.assignments },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      { k: "Last modified", v: r.modified },
                    ]),
                  },
                ],
              },
              {
                label: "Rules",
                subs: [
                  {
                    label: "Rules",
                    content: kvb([
                      { k: "Maximum session duration", v: r.maxDur },
                      { k: "Idle timeout", v: r.idle },
                      { k: "Re-authentication interval", v: r.reauth },
                      { k: "Privileged session timeout", v: r.privTimeout },
                      { k: "Concurrent session limit", v: r.concurrent },
                      {
                        k: "Location restrictions",
                        v: "Approved regions only",
                      },
                      { k: "Device restrictions", v: "Managed devices" },
                      { k: "Token lifetime", v: r.tokenLife },
                      { k: "Refresh token lifetime", v: r.refreshLife },
                    ]),
                  },
                ],
              },
              {
                label: "Assignments",
                subs: [
                  {
                    label: "Assignments",
                    content: tlb([
                      {
                        primary: "Users",
                        secondary: `${r.assignments} covered`,
                        right: "Direct",
                      },
                      {
                        primary: "Roles",
                        secondary: r.scope.startsWith("Role") ? r.scope : "—",
                        right: r.scope.startsWith("Role") ? "Direct" : "—",
                      },
                      {
                        primary: "Workspaces",
                        secondary: "All",
                        right: "Scoped",
                      },
                      {
                        primary: "Service Identities",
                        secondary: "Included",
                        right: "Scoped",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Compliance",
                subs: [
                  {
                    label: "Compliance",
                    content: kvb([
                      { k: "Covered", v: r.assignments },
                      { k: "Compliant", v: r.assignments },
                      {
                        k: "Violations",
                        v: <StatusIndicator tone="ok">0</StatusIndicator>,
                      },
                      { k: "Exceptions", v: "0" },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Policy modified",
                        secondary: "idle timeout 60 → 30 min",
                        right: r.modified,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ════════════ §7.10 Access Reviews — certification campaigns ════════════

// ════════════ shared ════════════
// Canonical status indicator — a tone-coloured icon + label, used everywhere a
// status is shown (users, service identities, providers, credentials, MFA, …).
//   ok → ✓ check (green) · warn → △ triangle (amber) · danger → ⊘ (red)
//   info → ⓘ (blue) · muted → ⊖ (grey)
type StatusTone = "ok" | "warn" | "danger" | "info" | "muted";
const STATUS_TONE: Record<
  StatusTone,
  { c: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  ok: { c: T.success, Icon: CheckCircle2 },
  warn: { c: T.warning, Icon: AlertTriangle },
  danger: { c: T.danger, Icon: XCircle },
  info: { c: T.accent, Icon: Info },
  muted: { c: T.textMuted, Icon: MinusCircle },
};
function StatusIndicator({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  const { c, Icon } = STATUS_TONE[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: c,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={14} /> {children}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: StatusTone =
    status === "active"
      ? "ok"
      : status === "invited"
        ? "info"
        : status === "suspended"
          ? "danger"
          : "muted";
  return <StatusIndicator tone={tone}>{status}</StatusIndicator>;
}

// MFA posture — meaningful status (not a bare ✓/✗). Colours: green=good, blue=policy,
// amber=pending, grey=none, red=risk/blocked.
const MFA_STATUSES = [
  "Enabled",
  "Enforced",
  "Pending",
  "Disabled",
  "At Risk",
  "Locked",
];
function MfaBadge({ status }: { status: string }) {
  const tone: StatusTone =
    status === "Enabled"
      ? "ok"
      : status === "Enforced"
        ? "info"
        : status === "Pending"
          ? "warn"
          : status === "Disabled"
            ? "muted"
            : "danger"; // At Risk / Locked
  return <StatusIndicator tone={tone}>{status}</StatusIndicator>;
}

const ovl: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "var(--cg-overlay)",
  zIndex: 1100,
  display: "flex",
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
  width = 520,
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
      style={{ ...ovl, justifyContent: "flex-end" }}
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

// ════════════════════════════════════════════════════════════════════════════
// §7.2 Users area — Microsoft 365 parity: Active users / Guest users /
// Deleted users / Contacts, plus Manage user templates, Add multiple users and
// Add a contact flows. Active users is LIVE (/collections/members); the guest,
// deleted, contact and template surfaces run on representative `Sample` state and
// are fully interactive so the workflows are real to operate.
// ════════════════════════════════════════════════════════════════════════════

const USERS_SUBNAV = [
  { id: "active", label: "Active users", Icon: Users },
  { id: "contacts", label: "Contacts", Icon: Mail },
  { id: "guests", label: "Guest users", Icon: UserPlus },
  { id: "deleted", label: "Deleted users", Icon: Trash2 },
] as const;
type UsersView = (typeof USERS_SUBNAV)[number]["id"] | "templates";

interface DeletedUser {
  id: string;
  email: string;
  role: string;
  deletedOn: string;
  deletedBy: string;
}
interface GuestUser {
  id: string;
  name: string;
  email: string;
  invitedBy: string;
  status: string;
  invitedOn: string;
  source: string;
}
interface ContactRow {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
}
interface UserTemplate {
  id: string;
  name: string;
  description: string;
  published: boolean;
  createdBy: string;
  createdOn: string;
  // Saved configuration a new user is provisioned from.
  domain?: string;
  role?: string;
  autoPassword?: boolean;
  requireChange?: boolean;
  jobTitle?: string;
  department?: string;
}

const SEED_DELETED: DeletedUser[] = [
  {
    id: "d1",
    email: "contractor.aziz@inferencedefense.com",
    role: "Viewer",
    deletedOn: "2026-06-09",
    deletedBy: "rami@inferencedefense.com",
  },
  {
    id: "d2",
    email: "intern.lena@inferencedefense.com",
    role: "Workspace Administrator",
    deletedOn: "2026-05-28",
    deletedBy: "security-ops@inferencedefense.com",
  },
];
const SEED_GUESTS: GuestUser[] = [
  {
    id: "g1",
    name: "Mei Tan (Audit Partner)",
    email: "mei.tan@deloitte.com",
    invitedBy: "compliance@inferencedefense.com",
    status: "accepted",
    invitedOn: "2026-05-30",
    source: "deloitte.com",
  },
  {
    id: "g2",
    name: "Pen-test (Red Team)",
    email: "lead@offsec-partners.io",
    invitedBy: "security-ops@inferencedefense.com",
    status: "invited",
    invitedOn: "2026-06-18",
    source: "offsec-partners.io",
  },
];
const SEED_CONTACTS: ContactRow[] = [
  {
    id: "c1",
    name: "AWS TAM — Daniel Cho",
    email: "dcho@amazon.com",
    company: "Amazon Web Services",
    title: "Technical Account Manager",
  },
];
const SEED_TEMPLATES: UserTemplate[] = [
  {
    id: "t1",
    name: "FTE — Security Analyst",
    description: "Full-time analyst, Auditor role, EU residency, MFA required.",
    published: true,
    createdBy: "rami@inferencedefense.com",
    createdOn: "2026-04-12",
    domain: "inferencedefense.com",
    role: "Auditor",
    autoPassword: true,
    requireChange: true,
    jobTitle: "Security Analyst",
    department: "Security Operations",
  },
];

function UsersArea() {
  const [view, setView] = React.useState<UsersView>("active");
  const [deleted, setDeleted] = React.useState<DeletedUser[]>(SEED_DELETED);
  const [guests, setGuests] = React.useState<GuestUser[]>(SEED_GUESTS);
  const [contacts, setContacts] = React.useState<ContactRow[]>(SEED_CONTACTS);
  const [templates, setTemplates] =
    React.useState<UserTemplate[]>(SEED_TEMPLATES);

  const softDelete = (u: { id: string; email: string; role: string }) =>
    setDeleted((d) => [
      {
        id: u.id,
        email: u.email,
        role: u.role,
        deletedOn: new Date().toISOString().slice(0, 10),
        deletedBy: "you",
      },
      ...d.filter((x) => x.id !== u.id),
    ]);

  return (
    <div>
      <UsersSubNav active={view} onChange={setView} />
      {view === "active" && (
        <UsersTab
          templates={templates}
          onOpenTemplates={() => setView("templates")}
          onSoftDelete={softDelete}
        />
      )}
      {view === "guests" && (
        <GuestUsersView
          guests={guests}
          onInvite={(g) => setGuests((s) => [g, ...s])}
          onUpdate={(g) =>
            setGuests((s) => s.map((x) => (x.id === g.id ? g : x)))
          }
          onRevoke={(id) => setGuests((s) => s.filter((x) => x.id !== id))}
        />
      )}
      {view === "deleted" && (
        <DeletedUsersView
          deleted={deleted}
          onRestore={(id) => setDeleted((s) => s.filter((x) => x.id !== id))}
          onPurge={(id) => setDeleted((s) => s.filter((x) => x.id !== id))}
        />
      )}
      {view === "contacts" && (
        <ContactsView
          contacts={contacts}
          onAdd={(c) => setContacts((s) => [c, ...s])}
          onUpdate={(c) =>
            setContacts((s) => s.map((x) => (x.id === c.id ? c : x)))
          }
          onDelete={(id) => setContacts((s) => s.filter((x) => x.id !== id))}
        />
      )}
      {view === "templates" && (
        <ManageTemplatesView
          templates={templates}
          onBack={() => setView("active")}
          onAdd={(t) => setTemplates((s) => [t, ...s])}
          onUpdate={(t) =>
            setTemplates((s) => s.map((x) => (x.id === t.id ? t : x)))
          }
          onDelete={(id) => setTemplates((s) => s.filter((x) => x.id !== id))}
        />
      )}
    </div>
  );
}

function UsersSubNav({
  active,
  onChange,
}: {
  active: UsersView;
  onChange: (v: UsersView) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 14,
        flexWrap: "wrap",
      }}
    >
      {USERS_SUBNAV.map((s) => {
        const on =
          active === s.id || (active === "templates" && s.id === "active");
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 32,
              padding: "0 12px",
              borderRadius: 4,
              border: `1px solid ${on ? T.accent : "var(--cg-border-card)"}`,
              background: on ? "var(--cg-accent-bg)" : "transparent",
              color: on ? T.textPrimary : T.textNav,
              fontSize: 13,
              fontWeight: on ? 600 : 400,
              cursor: "pointer",
            }}
          >
            <s.Icon size={14} color={on ? T.accent : T.textMuted} /> {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Guest users ────────────────────────────────────────────────────────────
function GuestUsersView({
  guests,
  onInvite,
  onUpdate,
  onRevoke,
}: {
  guests: GuestUser[];
  onInvite: (g: GuestUser) => void;
  onUpdate: (g: GuestUser) => void;
  onRevoke: (id: string) => void;
}) {
  const session = useCloudGuardSession();
  const canEdit = session.can("admin");
  const [search, setSearch] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const [sel, setSel] = React.useState<GuestUser | null>(null);
  const rows = guests.filter(
    (g) =>
      !search ||
      g.email.toLowerCase().includes(search.toLowerCase()) ||
      g.name.toLowerCase().includes(search.toLowerCase()),
  );
  const cols: Column<GuestUser>[] = [
    {
      key: "name",
      header: "Display name",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortValue: (r) => r.email,
      render: (r) => r.email,
    },
    { key: "source", header: "Source tenant", render: (r) => r.source },
    { key: "invitedBy", header: "Invited by", render: (r) => r.invitedBy },
    {
      key: "invitedOn",
      header: "Invited",
      sortValue: (r) => r.invitedOn,
      render: (r) => r.invitedOn,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusPill status={r.status === "accepted" ? "active" : "invited"} />
      ),
    },
  ];
  return (
    <Card
      title="Guest users — external collaborators"
      desc="People from outside your organization (auditors, partners, red-team) invited into specific workspaces. Guests inherit no enterprise role until explicitly assigned and are subject to the mandatory security floor."
    >
      <SampleBanner what="guest directory (binds to B2B / SCIM guest provisioning when the IdP connector lands)" />
      <CommandBar
        items={[
          {
            key: "invite",
            label: "Invite a guest",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () => setInviting(true),
          },
          {
            key: "refresh",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {},
          },
        ]}
      />
      <SearchRow
        value={search}
        onChange={setSearch}
        count={rows.length}
        placeholder="Search guest users list"
      />
      <DirectoryTable
        columns={cols}
        rows={rows}
        pageSize={15}
        onRowClick={(r) => setSel(r)}
        rowActions={
          canEdit
            ? (r) => (
                <RowMenu
                  items={[
                    { label: "View details", onClick: () => setSel(r) },
                    { label: "Resend invitation", onClick: () => {} },
                    {
                      label: "Revoke access",
                      danger: true,
                      onClick: () => onRevoke(r.id),
                    },
                  ]}
                />
              )
            : undefined
        }
        empty={
          <EmptyState
            icon={<UserPlus size={20} />}
            title="No guest users"
            hint="Invite an external collaborator to a workspace."
            cta={canEdit ? "Invite a guest" : undefined}
            onCta={canEdit ? () => setInviting(true) : undefined}
          />
        }
      />
      {inviting && (
        <GuestDrawer
          canEdit={canEdit}
          onClose={() => setInviting(false)}
          onInvite={(g) => {
            onInvite(g);
            setInviting(false);
          }}
          onUpdate={(g) => {
            onUpdate(g);
            setInviting(false);
          }}
          onRevoke={() => setInviting(false)}
        />
      )}
      {sel && (
        <UserDetailsDrawer
          key={sel.id}
          kind="guest"
          user={{
            id: sel.id,
            email: sel.email,
            name: sel.name,
            role: "Guest (Viewer)",
            status: sel.status === "accepted" ? "active" : "invited",
            idp: `External · ${sel.source}`,
            bu: "External",
            lastLogin: sel.invitedOn,
            mfa: sel.status === "accepted",
            mfaStatus: sel.status === "accepted" ? "Enabled" : "Pending",
          }}
          canEdit={canEdit}
          onClose={() => setSel(null)}
          onSave={(body) => {
            onUpdate({
              ...sel,
              name: String(body.name ?? sel.name),
              email: String(body.email ?? sel.email),
            });
            setSel(null);
          }}
          onReset={() => setSel(null)}
          onStatus={() => {}}
          onDeprovision={() => {
            onRevoke(sel.id);
            setSel(null);
          }}
        />
      )}
    </Card>
  );
}

const GUEST_STEPS = ["Basics", "Roles & access", "Review & finish"];
function GuestDrawer({
  initial,
  canEdit = true,
  onClose,
  onInvite,
  onUpdate,
  onRevoke,
}: {
  initial?: GuestUser | null;
  canEdit?: boolean;
  onClose: () => void;
  onInvite: (g: GuestUser) => void;
  onUpdate: (g: GuestUser) => void;
  onRevoke: (id: string) => void;
}) {
  const isEdit = !!initial;
  const [step, setStep] = React.useState(isEdit ? GUEST_STEPS.length - 1 : 0);
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [role, setRole] = React.useState("Viewer");
  const [message, setMessage] = React.useState("");
  const err = !email.includes("@");
  const last = step === GUEST_STEPS.length - 1;
  const submit = () => {
    if (err) {
      setStep(0);
      return;
    }
    const next: GuestUser = {
      id: initial?.id ?? `g${Date.now()}`,
      name: name.trim() || email.split("@")[0],
      email,
      invitedBy: initial?.invitedBy ?? "you",
      status: initial?.status ?? "invited",
      invitedOn: initial?.invitedOn ?? new Date().toISOString().slice(0, 10),
      source: email.split("@")[1] ?? "—",
    };
    if (isEdit) onUpdate(next);
    else onInvite(next);
  };
  return (
    <WizardShell
      title={isEdit ? "Edit guest" : "Invite a guest"}
      steps={GUEST_STEPS}
      step={step}
      setStep={setStep}
      stepError={(i) => (i === 0 ? err : false)}
      showErrors={last}
      canFinish={!err && canEdit}
      finishLabel={isEdit ? "Save" : "Send invitation"}
      onFinish={submit}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Set up the basics</H>
          <P>
            {isEdit
              ? "Update this external collaborator’s directory details."
              : "Send a B2B invitation to an external email. Guests inherit no enterprise role until assigned and are subject to the mandatory security floor."}
          </P>
          <Req label="Email address" err={err}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={errInp(err)}
              placeholder="name@partner.com"
            />
          </Req>
          <Field label="Display name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inp}
            />
          </Field>
        </>
      )}
      {step === 1 && (
        <>
          <H>Roles & access</H>
          <P>Choose the workspace role the guest receives when they accept.</P>
          <Field label="Assign workspace role on accept">
            <Sel
              value={role}
              onChange={setRole}
              opts={["Viewer", "Auditor", "Workspace Administrator"]}
            />
          </Field>
          {!isEdit && (
            <Field label="Personal message (optional)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                style={{
                  ...inp,
                  height: "auto",
                  padding: 11,
                  resize: "vertical",
                }}
              />
            </Field>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <H>Review and finish</H>
          <P>Review the guest before you {isEdit ? "save" : "send"}.</P>
          <ReviewSec
            title="Basics"
            onEdit={() => setStep(0)}
            errors={err ? ["Please provide a valid email."] : []}
          >
            <KV k="Email" v={email || "—"} />
            <KV k="Display name" v={name || email.split("@")[0] || "—"} />
            <KV k="Source tenant" v={email.split("@")[1] ?? "—"} />
          </ReviewSec>
          <ReviewSec title="Roles & access" onEdit={() => setStep(1)}>
            <KV k="Workspace role on accept" v={role} />
          </ReviewSec>
          {isEdit && initial && (
            <>
              <ReviewSec title="Invitation" onEdit={() => setStep(0)}>
                <KV k="Status" v={initial.status} />
                <KV k="Invited by" v={initial.invitedBy} />
                <KV k="Invited on" v={initial.invitedOn} />
              </ReviewSec>
              <div style={{ marginTop: 6 }}>
                <ConfirmButton
                  variant="danger"
                  label="Revoke access"
                  title="Revoke guest access"
                  body={`Revoke all access for ${initial.email}? Their sessions are terminated immediately.`}
                  confirmLabel="Revoke"
                  onConfirm={() => onRevoke(initial.id)}
                />
              </div>
            </>
          )}
        </>
      )}
    </WizardShell>
  );
}

// ── Deleted users ──────────────────────────────────────────────────────────
function DeletedUsersView({
  deleted,
  onRestore,
  onPurge,
}: {
  deleted: DeletedUser[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}) {
  const session = useCloudGuardSession();
  const canEdit = session.can("admin");
  const [search, setSearch] = React.useState("");
  const [sel, setSel] = React.useState<DeletedUser | null>(null);
  const RETENTION_DAYS = 30;
  const daysLeft = (on: string) => {
    const gone = Math.floor((Date.now() - new Date(on).getTime()) / 86400000);
    return Math.max(0, RETENTION_DAYS - gone);
  };
  const rows = deleted.filter(
    (d) => !search || d.email.toLowerCase().includes(search.toLowerCase()),
  );
  const cols: Column<DeletedUser>[] = [
    {
      key: "email",
      header: "User",
      sortValue: (r) => r.email,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.email}</span>,
    },
    { key: "role", header: "Last role", render: (r) => r.role },
    {
      key: "deletedOn",
      header: "Deleted on",
      sortValue: (r) => r.deletedOn,
      render: (r) => r.deletedOn,
    },
    { key: "deletedBy", header: "Deleted by", render: (r) => r.deletedBy },
    {
      key: "left",
      header: "Recoverable for",
      sortValue: (r) => daysLeft(r.deletedOn),
      render: (r) => {
        const n = daysLeft(r.deletedOn);
        return (
          <span style={{ color: n <= 7 ? T.danger : T.textNav }}>
            {n} day{n === 1 ? "" : "s"} left
          </span>
        );
      },
    },
  ];
  return (
    <Card
      title="Deleted users — recoverable for 30 days"
      desc="Deprovisioned identities are soft-deleted and held for a 30-day recovery window before permanent erasure. Restore re-provisions the user with their prior role; permanent deletion triggers cryptographic erasure of any per-user keys."
    >
      <CommandBar
        items={[
          {
            key: "refresh",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {},
          },
        ]}
      />
      <SearchRow
        value={search}
        onChange={setSearch}
        count={rows.length}
        placeholder="Search deleted users list"
      />
      <DirectoryTable
        columns={cols}
        rows={rows}
        pageSize={15}
        onRowClick={(r) => setSel(r)}
        rowActions={
          canEdit
            ? (r) => (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <button
                    type="button"
                    title="Restore user"
                    onClick={() => onRestore(r.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: T.accent,
                      cursor: "pointer",
                      padding: "4px 6px",
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                  <RowMenu
                    items={[
                      { label: "View details", onClick: () => setSel(r) },
                      { label: "Restore user", onClick: () => onRestore(r.id) },
                      {
                        label: "Permanently delete",
                        danger: true,
                        onClick: () => onPurge(r.id),
                      },
                    ]}
                  />
                </span>
              )
            : undefined
        }
        empty={
          <EmptyState
            icon={<Trash2 size={20} />}
            title="No deleted users"
            hint="Deprovisioned users appear here for 30 days."
          />
        }
      />
      {sel && (
        <DeletedUserDrawer
          sel={sel}
          canEdit={canEdit}
          daysLeft={daysLeft(sel.deletedOn)}
          onClose={() => setSel(null)}
          onRestore={() => {
            onRestore(sel.id);
            setSel(null);
          }}
          onPurge={() => {
            onPurge(sel.id);
            setSel(null);
          }}
        />
      )}
    </Card>
  );
}

const DELETED_STEPS = ["Account", "Recovery & review"];
function DeletedUserDrawer({
  sel,
  canEdit,
  daysLeft,
  onClose,
  onRestore,
  onPurge,
}: {
  sel: DeletedUser;
  canEdit: boolean;
  daysLeft: number;
  onClose: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const [step, setStep] = React.useState(0);
  return (
    <WizardShell
      title="Deleted user"
      steps={DELETED_STEPS}
      step={step}
      setStep={setStep}
      canFinish={canEdit}
      finishLabel="Restore user"
      onFinish={onRestore}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Account</H>
          <P>
            This identity is soft-deleted and held for a 30-day recovery window
            before permanent erasure.
          </P>
          <KVGrid
            cols={1}
            items={[
              { k: "User", v: sel.email },
              { k: "Last role", v: sel.role },
              { k: "Deleted on", v: sel.deletedOn },
              { k: "Deleted by", v: sel.deletedBy },
            ]}
          />
        </>
      )}
      {step === 1 && (
        <>
          <H>Recovery & review</H>
          <P>
            Restore re-provisions the user with their prior role. Permanent
            deletion is irreversible and triggers cryptographic erasure of any
            per-user keys.
          </P>
          <KVGrid
            cols={1}
            items={[
              {
                k: "Recoverable for",
                v: (
                  <span style={{ color: daysLeft <= 7 ? T.danger : T.textNav }}>
                    {daysLeft} more day(s)
                  </span>
                ),
              },
              { k: "Prior role on restore", v: sel.role },
            ]}
          />
          {canEdit && (
            <div style={{ marginTop: 14 }}>
              <ConfirmButton
                variant="danger"
                label="Permanently delete"
                title="Permanently delete user"
                body={`Permanently erase ${sel.email}? This is irreversible and triggers cryptographic erasure of any per-user keys.`}
                confirmWord="DELETE"
                confirmLabel="Delete forever"
                onConfirm={onPurge}
              />
            </div>
          )}
        </>
      )}
    </WizardShell>
  );
}

// ── Contacts ───────────────────────────────────────────────────────────────
function ContactsView({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
}: {
  contacts: ContactRow[];
  onAdd: (c: ContactRow) => void;
  onUpdate: (c: ContactRow) => void;
  onDelete: (id: string) => void;
}) {
  const session = useCloudGuardSession();
  const canEdit = session.can("admin");
  const [search, setSearch] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<ContactRow | null>(null);
  const rows = contacts.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );
  const cols: Column<ContactRow>[] = [
    {
      key: "name",
      header: "Contact name",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortValue: (r) => r.email,
      render: (r) => r.email,
    },
    { key: "company", header: "Company", render: (r) => r.company },
    { key: "title", header: "Job title", render: (r) => r.title || "—" },
  ];
  return (
    <Card
      title="Contacts — external directory entries"
      desc="People outside your organization that should be discoverable in the org directory (vendor TAMs, regulators, partner contacts). Contacts have no sign-in and no access — they are address-book entries only."
    >
      <SampleBanner what="external contacts (binds to the directory / address-book service)" />
      <CommandBar
        items={[
          {
            key: "add",
            label: "Add a contact",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () => setAdding(true),
          },
          {
            key: "multi",
            label: "Add multiple contacts",
            icon: <UsersRound size={15} />,
            disabled: !canEdit,
            onClick: () => setAdding(true),
          },
          {
            key: "export",
            label: "Export contacts",
            icon: <Download size={15} />,
            onClick: () => {},
          },
          {
            key: "refresh",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {},
          },
        ]}
      />
      <SearchRow
        value={search}
        onChange={setSearch}
        count={rows.length}
        placeholder="Search contacts list"
      />
      <DirectoryTable
        columns={cols}
        rows={rows}
        pageSize={15}
        onRowClick={(r) => setEditing(r)}
        rowActions={
          canEdit
            ? (r) => (
                <RowMenu
                  items={[
                    { label: "Edit contact", onClick: () => setEditing(r) },
                    {
                      label: "Delete contact",
                      danger: true,
                      onClick: () => onDelete(r.id),
                    },
                  ]}
                />
              )
            : undefined
        }
        empty={
          <EmptyState
            icon={<Mail size={20} />}
            title="This page is empty"
            hint="Add your first item to see it in this list."
            cta={canEdit ? "Add a contact" : undefined}
            onCta={canEdit ? () => setAdding(true) : undefined}
          />
        }
      />
      {(adding || editing) && (
        <ContactDetailsDrawer
          initial={editing}
          canEdit={canEdit}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onAdd={(c) => {
            onAdd(c);
            setAdding(false);
          }}
          onUpdate={(c) => {
            onUpdate(c);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

// ── Manage user templates ──────────────────────────────────────────────────
function ManageTemplatesView({
  templates,
  onBack,
  onAdd,
  onUpdate,
  onDelete,
}: {
  templates: UserTemplate[];
  onBack: () => void;
  onAdd: (t: UserTemplate) => void;
  onUpdate: (t: UserTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const session = useCloudGuardSession();
  const canEdit = session.can("admin");
  const [search, setSearch] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<UserTemplate | null>(null);
  const rows = templates.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const cols: Column<UserTemplate>[] = [
    {
      key: "name",
      header: "Template name",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (r) => r.description || "—",
    },
    {
      key: "published",
      header: "Publish status",
      render: (r) => (
        <span style={{ color: r.published ? T.success : T.textMuted }}>
          {r.published ? "Published" : "Private"}
        </span>
      ),
    },
    { key: "createdBy", header: "Created by", render: (r) => r.createdBy },
    {
      key: "createdOn",
      header: "Created date",
      sortValue: (r) => r.createdOn,
      render: (r) => r.createdOn,
    },
  ];
  return (
    <Card>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "transparent",
          border: "none",
          color: T.textMuted,
          fontSize: 12.5,
          cursor: "pointer",
          padding: 0,
          marginBottom: 10,
        }}
      >
        <ChevronLeft size={14} /> Active users
      </button>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: T.textPrimary,
          marginBottom: 6,
        }}
      >
        Manage user templates
      </div>
      <div
        style={{
          fontSize: 13,
          color: T.textMuted,
          marginBottom: 16,
          lineHeight: 1.5,
          maxWidth: 720,
        }}
      >
        User templates let you add new users from a saved configuration — role,
        location, residency and security settings. Create one here, or save a
        user’s settings as a template when adding them from{" "}
        <span style={{ color: T.accent }}>Active users</span>.
      </div>
      <SampleBanner what="template store (binds to the provisioning service)" />
      <CommandBar
        items={[
          {
            key: "add",
            label: "Add template",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () => setAdding(true),
          },
          {
            key: "refresh",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {},
          },
        ]}
        farItems={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: T.textMuted,
              fontSize: 13,
            }}
          >
            <Filter size={14} /> Filter
          </span>
        }
      />
      <SearchRow
        value={search}
        onChange={setSearch}
        count={rows.length}
        placeholder="Search templates"
      />
      <DirectoryTable
        columns={cols}
        rows={rows}
        pageSize={15}
        onRowClick={(r) => setEditing(r)}
        rowActions={
          canEdit
            ? (r) => (
                <RowMenu
                  items={[
                    { label: "View / edit", onClick: () => setEditing(r) },
                    { label: "Use template", onClick: () => {} },
                    {
                      label: "Duplicate",
                      onClick: () =>
                        onAdd({
                          ...r,
                          id: `t${Date.now()}`,
                          name: `${r.name} (copy)`,
                        }),
                    },
                    {
                      label: "Delete",
                      danger: true,
                      onClick: () => onDelete(r.id),
                    },
                  ]}
                />
              )
            : undefined
        }
        empty={
          <EmptyState
            icon={<Plus size={20} />}
            title="We didn't find anything to show here"
            hint="Add your first item to see it in this list."
            cta={canEdit ? "Add template" : undefined}
            onCta={canEdit ? () => setAdding(true) : undefined}
          />
        }
      />
      {(adding || editing) && (
        <AddTemplateWizard
          initial={editing}
          canEdit={canEdit}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onAdd={(t) => {
            onAdd(t);
            setAdding(false);
          }}
          onUpdate={(t) => {
            onUpdate(t);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

// ── Shared bits for the new views ───────────────────────────────────────────
// Shared enterprise list view — one canonical layout for every list (Users,
// Service Identities, Identity Providers, …): Card + Sample banner + toolbar
// (CommandBar) + FilterSet + search row + DirectoryTable. State lives in the
// caller; this composes the kit pieces in the standard order so every list is
// consistent. Render any detail/create drawers as siblings next to it.
function ListView<R extends { id: string }>({
  title,
  desc,
  sampleWhat,
  commands,
  commandFarItems,
  presets,
  pills,
  filterRightSlot,
  search,
  onSearch,
  searchPlaceholder,
  count,
  columns,
  rows,
  pageSize = 12,
  onRowClick,
  selectable,
  bulkActions,
  rowActions,
  empty,
  loading,
}: {
  title: string;
  desc?: string;
  sampleWhat?: string;
  commands?: CommandItem[];
  commandFarItems?: React.ReactNode;
  presets?: FilterPreset[];
  pills?: FilterPillDef[];
  filterRightSlot?: React.ReactNode;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  count: number;
  columns: Column<R>[];
  rows: R[];
  pageSize?: number;
  onRowClick?: (r: R) => void;
  selectable?: boolean;
  bulkActions?: (ids: string[], clear: () => void) => React.ReactNode;
  rowActions?: (r: R) => React.ReactNode;
  empty?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card title={title} desc={desc}>
      {sampleWhat && <SampleBanner what={sampleWhat} />}
      {commands && <CommandBar items={commands} farItems={commandFarItems} />}
      {pills && (
        <FilterSet
          presets={presets}
          pills={pills}
          rightSlot={filterRightSlot}
        />
      )}
      <SearchRow
        value={search}
        onChange={onSearch}
        count={count}
        placeholder={searchPlaceholder}
      />
      {loading ? (
        <LiveCardSkeleton lines={4} />
      ) : (
        <DirectoryTable
          columns={columns}
          rows={rows}
          pageSize={pageSize}
          onRowClick={onRowClick}
          selectable={selectable}
          bulkActions={bulkActions}
          rowActions={rowActions}
          empty={empty}
        />
      )}
    </Card>
  );
}

function SearchRow({
  value,
  onChange,
  count,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  count: number;
  placeholder: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <span style={{ position: "relative", flex: "0 1 360px" }}>
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            height: 34,
            width: "100%",
            padding: "0 10px 0 28px",
            background: "var(--cg-input-bg)",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            color: T.textPrimary,
            fontSize: 13,
            outline: "none",
          }}
        />
      </span>
      <span style={{ fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>
        {count} results
      </span>
    </div>
  );
}

// ── Shared stepped-wizard shell (right-side drawer) ─────────────────────────
function WizardShell({
  title,
  steps,
  step,
  setStep,
  stepError,
  showErrors,
  canFinish,
  finishLabel = "Finish",
  onFinish,
  onClose,
  width = 860,
  children,
}: {
  title: string;
  steps: string[];
  step: number;
  setStep: (i: number) => void;
  stepError?: (i: number) => boolean;
  showErrors?: boolean;
  canFinish: boolean;
  finishLabel?: string;
  onFinish: () => void;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  const last = step === steps.length - 1;
  // High-water mark: once a step has been reached it stays "done" (✓) even when you
  // click back to an earlier step — otherwise jumping back visually un-checks later steps.
  const maxRef = React.useRef(step);
  maxRef.current = Math.max(maxRef.current, step);
  const reachedMax = maxRef.current;
  return (
    <div
      onClick={onClose}
      className="cg-overlay-anim"
      style={{ ...ovl, justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cg-drawer-anim"
        style={{
          width,
          maxWidth: "98vw",
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
            padding: "18px 24px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
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
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div
            style={{
              width: 220,
              flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              padding: "24px 20px",
            }}
          >
            {steps.map((s, i) => {
              const isErr = !!(showErrors && stepError?.(i));
              const reached = i <= reachedMax; // visited (incl. current)
              const done = reached && i !== step; // show ✓
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: i < steps.length - 1 ? 4 : 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
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
                        fontSize: 11,
                        color: "#fff",
                        background: isErr
                          ? T.danger
                          : reached
                            ? T.accent
                            : "transparent",
                        border:
                          !reached && !isErr
                            ? `1.5px solid ${T.borderStrong}`
                            : "none",
                      }}
                    >
                      {isErr ? "✕" : done ? "✓" : ""}
                    </span>
                    {i < steps.length - 1 && (
                      <span
                        style={{
                          width: 1,
                          flex: 1,
                          minHeight: 22,
                          background: T.border,
                          margin: "2px 0",
                        }}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: i === step ? T.textPrimary : T.textNav,
                      fontSize: 13,
                      fontWeight: i === step ? 600 : 400,
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                      height: 18,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {s}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {children}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <HeaderButton
            disabled={step === 0}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            Back
          </HeaderButton>
          <div style={{ display: "flex", gap: 10 }}>
            {last ? (
              <HeaderButton
                variant="primary"
                disabled={!canFinish}
                onClick={onFinish}
              >
                {finishLabel}
              </HeaderButton>
            ) : (
              <HeaderButton variant="primary" onClick={() => setStep(step + 1)}>
                Next
              </HeaderButton>
            )}
            <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add multiple users ──────────────────────────────────────────────────────
interface MultiRow {
  firstName: string;
  lastName: string;
  username: string;
  domain: string;
}
function AddMultipleUsersWizard({
  domains,
  onClose,
  onAdd,
}: {
  domains: string[];
  onClose: () => void;
  onAdd: (list: Record<string, unknown>[]) => void;
}) {
  const dom = domains.length ? domains : ["inferencedefense.com"];
  const blank = (): MultiRow => ({
    firstName: "",
    lastName: "",
    username: "",
    domain: dom[0],
  });
  const [step, setStep] = React.useState(0);
  const [rows, setRows] = React.useState<MultiRow[]>([
    blank(),
    blank(),
    blank(),
    blank(),
    blank(),
  ]);
  const [csv, setCsv] = React.useState(false);
  const [csvUsers, setCsvUsers] = React.useState<MultiRow[]>([]);
  const [csvName, setCsvName] = React.useState("");
  const [csvError, setCsvError] = React.useState("");
  const [role, setRole] = React.useState("Viewer");
  const setRow = (i: number, p: Partial<MultiRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const manual = rows.filter((r) => r.username.trim());
  const list = csv ? csvUsers : manual;
  const steps = ["Basics", "Licenses", "Finish"];
  const onFile = (file?: File) => {
    if (!file) return;
    setCsvName(file.name);
    setCsvError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseUsersCsv(String(reader.result ?? ""), dom[0]);
        if (parsed.length === 0)
          setCsvError(
            "No user rows found. Check the file has a User Name column.",
          );
        setCsvUsers(parsed);
      } catch {
        setCsvError("Couldn’t read that file. Make sure it’s a valid CSV.");
        setCsvUsers([]);
      }
    };
    reader.readAsText(file);
  };
  const finish = () =>
    onAdd(
      list.map((r) => ({
        email: `${r.username.trim()}@${r.domain}`,
        name: `${r.firstName} ${r.lastName}`.trim() || r.username.trim(),
        role,
        status: "invited",
        mfa: false,
        bu: "—",
        idp: "Local",
      })),
    );
  return (
    <WizardShell
      title="Add multiple users"
      steps={steps}
      step={step}
      setStep={setStep}
      canFinish={list.length > 0}
      finishLabel={`Add ${list.length} user${list.length === 1 ? "" : "s"}`}
      onFinish={finish}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Add list of users</H>
          <P>
            Enter up to 249 users. All users are given temporary passwords and
            inherit the role you choose on the next step.
          </P>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "0 0 16px",
              fontSize: 13,
              color: T.textPrimary,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={csv}
              onChange={(e) => setCsv(e.target.checked)}
            />
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Upload size={14} /> I’d like to upload a CSV with user
              information
            </span>
          </label>

          {!csv ? (
            <>
              <div style={{ display: "flex", gap: 18, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setRows((rs) => [...rs, blank()])}
                  style={linkBtn}
                >
                  <Plus size={14} /> Add row
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRows((rs) => (rs.length > 1 ? rs.slice(0, -1) : rs))
                  }
                  style={linkBtn}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>−</span> Remove
                  row
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1.3fr 24px 1.3fr",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                {["First name", "Last name", "Username", "", "Domain"].map(
                  (h) => (
                    <span
                      key={h || "at"}
                      style={{
                        fontSize: 12.5,
                        color: T.textMuted,
                        fontWeight: 500,
                      }}
                    >
                      {h}
                    </span>
                  ),
                )}
              </div>
              {rows.map((r, i) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1.3fr 24px 1.3fr",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <input
                    value={r.firstName}
                    onChange={(e) => setRow(i, { firstName: e.target.value })}
                    style={inp}
                    placeholder="First name"
                  />
                  <input
                    value={r.lastName}
                    onChange={(e) => setRow(i, { lastName: e.target.value })}
                    style={inp}
                    placeholder="Last name"
                  />
                  <input
                    value={r.username}
                    onChange={(e) => setRow(i, { username: e.target.value })}
                    style={inp}
                    placeholder="Username"
                  />
                  <span style={{ textAlign: "center", color: T.textMuted }}>
                    @
                  </span>
                  <select
                    value={r.domain}
                    onChange={(e) => setRow(i, { domain: e.target.value })}
                    style={{ ...inp, cursor: "pointer" }}
                  >
                    {dom.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              ))}
            </>
          ) : (
            <CsvImportPanel
              fileName={csvName}
              parsedCount={csvUsers.length}
              error={csvError}
              onFile={onFile}
              onDownloadBlank={() => downloadUsersCsv(false, dom[0])}
              onDownloadExample={() => downloadUsersCsv(true, dom[0])}
            />
          )}
        </>
      )}
      {step === 1 && (
        <>
          <H>Assign a role</H>
          <P>
            Every user in this batch will be created with the role below. You
            can re-role individuals afterward from Active users.
          </P>
          <Req label="Enterprise role for all users">
            <Sel value={role} onChange={setRole} opts={ROLE_OPTS} />
          </Req>
        </>
      )}
      {step === 2 && (
        <>
          <H>Review and finish</H>
          <P>
            {list.length} user(s) will be created with the “{role}” role and a
            temporary password.
          </P>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {list.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12.5, color: T.textMuted }}>
                {csv
                  ? "Upload a CSV to see the users to be created."
                  : "No rows have a username yet — go back and add at least one."}
              </div>
            ) : (
              list.map((r, i) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    fontSize: 12.5,
                    color: T.textPrimary,
                    borderBottom:
                      i < list.length - 1 ? `1px solid ${T.border}` : "none",
                  }}
                >
                  <span>
                    {`${r.firstName} ${r.lastName}`.trim() || r.username}
                  </span>
                  <span
                    style={{ color: T.textMuted }}
                  >{`${r.username}@${r.domain}`}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </WizardShell>
  );
}

// ── Add user template ───────────────────────────────────────────────────────
function AddTemplateWizard({
  initial,
  canEdit = true,
  onClose,
  onAdd,
  onUpdate,
}: {
  initial?: UserTemplate | null;
  canEdit?: boolean;
  onClose: () => void;
  onAdd: (t: UserTemplate) => void;
  onUpdate?: (t: UserTemplate) => void;
}) {
  const isEdit = !!initial;
  const steps = [
    "Description",
    "Basics",
    "Licenses",
    "Optional settings",
    "Finish",
  ];
  // Editing opens straight on the Review step so the data is visible and Save is in reach.
  const [step, setStep] = React.useState(isEdit ? steps.length - 1 : 0);
  const [f, setF] = React.useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    published: initial?.published ?? true,
    domain: initial?.domain ?? "inferencedefense.com",
    autoPassword: initial?.autoPassword ?? true,
    requireChange: initial?.requireChange ?? true,
    role: initial?.role ?? "Viewer",
    jobTitle: initial?.jobTitle ?? "",
    department: initial?.department ?? "",
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const err = { name: !f.name.trim() };
  const stepError = (i: number) => (i === 0 ? err.name : false);
  const last = step === steps.length - 1;
  const finish = () => {
    if (err.name) {
      setStep(0);
      return;
    }
    const next: UserTemplate = {
      id: initial?.id ?? `t${Date.now()}`,
      name: f.name.trim(),
      description: f.description,
      published: f.published,
      createdBy: initial?.createdBy ?? "you",
      createdOn: initial?.createdOn ?? new Date().toISOString().slice(0, 10),
      domain: f.domain,
      role: f.role,
      autoPassword: f.autoPassword,
      requireChange: f.requireChange,
      jobTitle: f.jobTitle,
      department: f.department,
    };
    if (isEdit) onUpdate?.(next);
    else onAdd(next);
  };
  return (
    <WizardShell
      title={isEdit ? "Edit user template" : "Add user template"}
      steps={steps}
      step={step}
      setStep={setStep}
      stepError={stepError}
      showErrors={last}
      canFinish={!err.name && canEdit}
      finishLabel={isEdit ? "Save" : "Create template"}
      onFinish={finish}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Set up your template</H>
          <P>
            User templates let you add new users with a saved configuration. To
            get started, fill out some basic information about the template
            you’re creating.
          </P>
          <Req label="Name your template" err={err.name}>
            <input
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              style={errInp(err.name)}
              placeholder="Ex: FTE Senior Engineer, New York"
            />
          </Req>
          <Field label="Add a description (recommended)">
            <textarea
              value={f.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={4}
              style={{
                ...inp,
                height: "auto",
                padding: 11,
                resize: "vertical",
              }}
              placeholder="Ex: Template for full-time senior engineers in New York office"
            />
          </Field>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.textPrimary,
              margin: "16px 0 6px",
            }}
          >
            Publish this template
          </div>
          <Chk
            label="Make this template available to other admins who manage users."
            on={f.published}
            onChange={(v) => set({ published: v })}
          />
          <div style={{ fontSize: 11.5, color: T.textMuted, paddingLeft: 26 }}>
            If you want to un-publish a template, delete it. You can’t change a
            template to private after it is published.
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <H>Set up the basics</H>
          <P>
            Choose a domain and the password settings for users created from
            this template. You’ll fill out specific info (name, username) for
            each new user.
          </P>
          <Req label="Select the domain">
            <Sel
              value={f.domain}
              onChange={(v) => set({ domain: v })}
              opts={["inferencedefense.com", "sentinel-org.io"]}
            />
          </Req>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.textPrimary,
              margin: "8px 0 6px",
            }}
          >
            Password settings
          </div>
          <label
            style={{
              display: "flex",
              gap: 9,
              alignItems: "center",
              padding: "5px 0",
              fontSize: 13,
              color: T.textPrimary,
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              checked={f.autoPassword}
              onChange={() => set({ autoPassword: true })}
            />{" "}
            Auto-generated password
          </label>
          <label
            style={{
              display: "flex",
              gap: 9,
              alignItems: "center",
              padding: "5px 0",
              fontSize: 13,
              color: T.textPrimary,
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              checked={!f.autoPassword}
              onChange={() => set({ autoPassword: false })}
            />{" "}
            Let me create a password
          </label>
          <Chk
            label="Require the user to change their password when they first sign in"
            on={f.requireChange}
            onChange={(v) => set({ requireChange: v })}
          />
        </>
      )}
      {step === 2 && (
        <>
          <H>Licenses & access</H>
          <P>
            Users created from this template inherit the enterprise role below
            and the mandatory security floor.
          </P>
          <Req label="Enterprise role">
            <Sel
              value={f.role}
              onChange={(v) => set({ role: v })}
              opts={ROLE_OPTS}
            />
          </Req>
        </>
      )}
      {step === 3 && (
        <>
          <H>Optional settings</H>
          <P>
            Default profile information for users created from this template —
            you can override per user.
          </P>
          <Field label="Job title">
            <input
              value={f.jobTitle}
              onChange={(e) => set({ jobTitle: e.target.value })}
              style={inp}
            />
          </Field>
          <Field label="Department / business unit">
            <input
              value={f.department}
              onChange={(e) => set({ department: e.target.value })}
              style={inp}
            />
          </Field>
        </>
      )}
      {step === 4 && (
        <>
          <H>Review and finish</H>
          <P>Review the configuration before creating this template.</P>
          <ReviewSec
            title="Description"
            onEdit={() => setStep(0)}
            errors={err.name ? ["Please name your template."] : []}
          >
            <KV k="Name" v={f.name || "—"} />
            <KV k="Description" v={f.description || "—"} />
            <KV
              k="Publish"
              v={f.published ? "Published to other admins" : "Private"}
            />
          </ReviewSec>
          <ReviewSec title="Basics" onEdit={() => setStep(1)}>
            <KV k="Domain" v={f.domain} />
            <KV k="Password" v={f.autoPassword ? "Auto-generated" : "Custom"} />
            <KV
              k="Change on first sign-in"
              v={f.requireChange ? "Required" : "No"}
            />
          </ReviewSec>
          <ReviewSec title="Licenses & access" onEdit={() => setStep(2)}>
            <KV k="Role" v={f.role} />
          </ReviewSec>
          <ReviewSec title="Optional settings" onEdit={() => setStep(3)}>
            <KV k="Job title" v={f.jobTitle || "—"} />
            <KV k="Department" v={f.department || "—"} />
          </ReviewSec>
        </>
      )}
    </WizardShell>
  );
}

const linkBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  color: T.accent,
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
};

// ── CSV import (Add multiple users) ─────────────────────────────────────────
const CSV_HEADERS = [
  "First Name",
  "Last Name",
  "Display Name",
  "User Name",
  "Domain",
];

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseUsersCsv(text: string, defaultDomain: string): MultiRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const find = (...names: string[]) =>
    header.findIndex((h) => names.some((n) => h === n));
  const iFirst = find("first name", "firstname", "first");
  const iLast = find("last name", "lastname", "last");
  const iUser = find("user name", "username", "user", "alias");
  const iDomain = find("domain");
  const iEmail = find("email", "email address", "user principal name", "upn");
  const out: MultiRow[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const c = splitCsvLine(lines[r]);
    let username = iUser >= 0 ? (c[iUser] ?? "") : "";
    let domain = iDomain >= 0 ? (c[iDomain] ?? "") : "";
    if (!username && iEmail >= 0 && c[iEmail]?.includes("@")) {
      const [u, d] = c[iEmail].split("@");
      username = u;
      domain = d;
    }
    if (username.trim()) {
      out.push({
        firstName: iFirst >= 0 ? (c[iFirst] ?? "") : "",
        lastName: iLast >= 0 ? (c[iLast] ?? "") : "",
        username: username.trim(),
        domain: (domain || defaultDomain).trim(),
      });
    }
  }
  return out;
}

function downloadUsersCsv(withExample: boolean, domain: string) {
  const rows = [CSV_HEADERS.join(",")];
  if (withExample) {
    rows.push(["Ada", "Lovelace", "Ada Lovelace", "ada", domain].join(","));
    rows.push(["Alan", "Turing", "Alan Turing", "alan", domain].join(","));
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = withExample ? "users-example.csv" : "users-blank.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const CSV_ERRORS = [
  "You can upload up to 249 users per CSV file.",
  "Each user must have a unique username email address.",
  "Email addresses can’t use accent marks, like á or ñ.",
  "Email addresses can’t begin or end with a period (.).",
  "The part of the email address before the @ symbol can have 64 characters or less.",
  "Username email addresses may only use letters, numbers, and the following special characters: '._-!#^~",
  "Save as a CSV (comma delimited) file with the required columns.",
];

function CsvImportPanel({
  fileName,
  parsedCount,
  error,
  onFile,
  onDownloadBlank,
  onDownloadExample,
}: {
  fileName: string;
  parsedCount: number;
  error: string;
  onFile: (f?: File) => void;
  onDownloadBlank: () => void;
  onDownloadExample: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 6,
          background: "var(--cg-bg-badge)",
          border: `1px solid ${T.border}`,
          marginBottom: 18,
        }}
      >
        <Info
          size={16}
          color={T.textMuted}
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <div>
          <div style={{ fontSize: 12.5, color: T.textNav, marginBottom: 8 }}>
            Download one of the files below. Open the file in Excel or a similar
            app, add user info, save, and upload.
          </div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: T.textPrimary,
              marginBottom: 6,
            }}
          >
            Avoid common errors
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {CSV_ERRORS.map((e) => (
              <li
                key={e}
                style={{
                  fontSize: 12,
                  color: T.textMuted,
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={onDownloadBlank}
        style={{ ...linkBtn, fontSize: 13.5, marginBottom: 14 }}
      >
        <Download size={14} /> Download a blank CSV file with the required
        headers
      </button>
      <br />
      <button
        type="button"
        onClick={onDownloadExample}
        style={{ ...linkBtn, fontSize: 13.5, marginBottom: 22 }}
      >
        <Download size={14} /> Download a CSV file that includes example user
        info
      </button>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: T.textPrimary,
          margin: "8px 0 8px",
        }}
      >
        Upload CSV file with your user information{" "}
        <span style={{ color: T.danger }}>*</span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={fileName}
          readOnly
          placeholder=""
          style={{ ...inp, flex: 1, cursor: "default" }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <HeaderButton
          variant="primary"
          onClick={() => fileRef.current?.click()}
        >
          Browse
        </HeaderButton>
      </div>
      {error ? (
        <div style={{ fontSize: 12, color: T.danger, marginTop: 8 }}>
          {error}
        </div>
      ) : parsedCount > 0 ? (
        <div style={{ fontSize: 12, color: T.success, marginTop: 8 }}>
          {parsedCount} user(s) read from {fileName}.
        </div>
      ) : null}
    </div>
  );
}

// ── Reset password drawer ───────────────────────────────────────────────────
function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: "" };
  let cats = 0;
  if (/[a-z]/.test(pw)) cats += 1;
  if (/[A-Z]/.test(pw)) cats += 1;
  if (/[0-9]/.test(pw)) cats += 1;
  if (/[^A-Za-z0-9]/.test(pw)) cats += 1;
  const longEnough = pw.length >= 8;
  if (!longEnough || cats < 3) return { score: 1, label: "Weak" };
  if (cats === 3 || pw.length < 12) return { score: 2, label: "Medium" };
  return { score: 3, label: "Strong" };
}

function ResetPasswordDrawer({
  email,
  onClose,
  onReset,
}: {
  email: string;
  onClose: () => void;
  onReset: () => void;
}) {
  const [auto, setAuto] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [requireChange, setRequireChange] = React.useState(true);
  const st = passwordStrength(pw);
  const strong = auto || st.score >= 2;
  const tooWeak = !auto && pw.length > 0 && st.score < 2;
  const stColor =
    st.score >= 3 ? T.success : st.score === 2 ? T.warning : T.danger;
  return (
    <Drawer
      title="Reset password"
      subtitle={email}
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" disabled={!strong} onClick={onReset}>
            Reset password
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Chk
        label="Automatically create a password"
        on={auto}
        onChange={setAuto}
      />
      {auto ? (
        <div
          style={{
            fontSize: 12.5,
            color: T.textMuted,
            margin: "10px 0 16px",
            lineHeight: 1.5,
          }}
        >
          A strong password is generated automatically. You can copy it to share
          with the user after you reset.
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 12.5,
              color: T.textMuted,
              margin: "10px 0 16px",
              lineHeight: 1.5,
            }}
          >
            Passwords must be between 8 and 256 characters and use a combination
            of at least three of the following: uppercase letters, lowercase
            letters, numbers, and symbols.
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: T.textPrimary,
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Password <span style={{ color: T.danger }}>*</span>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{
                ...inp,
                paddingRight: 92,
                border: `1px solid ${tooWeak ? T.danger : T.border}`,
              }}
            />
            {pw.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  right: 38,
                  top: 9,
                  fontSize: 12.5,
                  color: stColor,
                }}
              >
                {st.label}
              </span>
            )}
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((s) => !s)}
              style={{
                position: "absolute",
                right: 8,
                top: 7,
                background: "transparent",
                border: "none",
                color: T.textMuted,
                cursor: "pointer",
                padding: 2,
              }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {tooWeak && (
            <div style={{ fontSize: 12.5, color: T.danger, marginTop: 6 }}>
              This password isn’t strong enough.
            </div>
          )}
        </>
      )}
      {/* Always visible — checking "auto" must not collapse this option. */}
      <div style={{ marginTop: 14 }}>
        <Chk
          label="Require this user to change their password when they first sign in"
          on={requireChange}
          onChange={setRequireChange}
        />
      </div>
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// User Details drawer — M365 "user pane" structure. Principal sections live in the
// left rail (Profile / Roles / Groups / Credentials & MFA / Activity); each one's
// sub-tabs are sub-views with editable data. Profile is LIVE-editable (PATCH);
// the role/group/credential/activity sub-views run on representative `Sample`
// state and are fully interactive so the workflows are real to operate.
// ════════════════════════════════════════════════════════════════════════════
const UD_SECTIONS = [
  {
    id: "profile",
    label: "Profile",
    subs: [
      "Basic Information",
      "Employment",
      "Identity",
      "Lifecycle",
      "Organization",
    ],
  },
  {
    id: "roles",
    label: "Roles",
    subs: ["Direct Roles", "Inherited Roles", "Eligible Roles", "Permissions"],
  },
  {
    id: "groups",
    label: "Groups",
    subs: ["Memberships", "Inherited Access", "Group History"],
  },
  {
    id: "credentials",
    label: "Credentials & MFA",
    subs: [
      "Password",
      "MFA",
      "Authentication Methods",
      "Recovery Methods",
      "Security Status",
    ],
  },
  {
    id: "activity",
    label: "Activity",
    subs: [
      "Sessions",
      "Sign-ins",
      "Access Changes",
      "Administrative Actions",
      "Audit Timeline",
    ],
  },
] as const;

function udForm(user: UserRow) {
  const [u, d] = user.email.split("@");
  const parts = user.name.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") ?? "",
    displayName: user.name,
    username: u ?? "",
    domain: d ?? "",
    jobTitle: "Security Analyst",
    department: user.bu,
    manager: "",
    employeeId: "",
    employeeType: "Full-time",
    hireDate: "2025-01-06",
    company: "Inference Defense",
    costCenter: "CC-1042",
    office: "Tunis HQ",
    country: "Tunisia",
  };
}

// Shared entity-details drawer shell — one canonical chrome for Users, Service
// Identities and Identity Providers so the experience is identical: avatar header
// with optional meta + quick actions, left-rail principal sections, a sub-tab
// strip, scrollable content, and a footer.
function DetailDrawer({
  initials,
  title,
  meta,
  actions,
  sections,
  sectionIndex,
  onSection,
  subs,
  subIndex,
  onSub,
  footer,
  width = 940,
  onClose,
  children,
}: {
  initials: string;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  sections: readonly string[];
  sectionIndex: number;
  onSection: (i: number) => void;
  subs: readonly string[];
  subIndex: number;
  onSub: (i: number) => void;
  footer: React.ReactNode;
  width?: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      className="cg-overlay-anim"
      style={{ ...ovl, zIndex: 1200, justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cg-drawer-anim"
        style={{
          width,
          maxWidth: "98vw",
          height: "100%",
          background: T.cardBg,
          borderLeft: `1px solid ${T.borderStrong}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 24px 18px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: T.accent,
              color: "#fff",
              fontSize: 20,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: T.textPrimary,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            {meta && <div style={{ marginTop: 6 }}>{meta}</div>}
          </div>
          {actions && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {actions}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: T.textMuted,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Left rail — principal sections */}
          <div
            style={{
              width: 224,
              flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              padding: "16px 12px",
              overflowY: "auto",
            }}
          >
            {sections.map((label, i) => {
              const on = i === sectionIndex;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSection(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    marginBottom: 2,
                    borderRadius: 6,
                    border: "none",
                    background: on ? "var(--cg-accent-bg)" : "transparent",
                    color: on ? T.textPrimary : T.textNav,
                    fontSize: 13,
                    fontWeight: on ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: on ? T.accent : "transparent",
                      border: on ? "none" : `1.5px solid ${T.borderStrong}`,
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div
              className="custom-scrollbar"
              style={{
                display: "flex",
                gap: 2,
                padding: "0 24px",
                borderBottom: `1px solid ${T.border}`,
                overflowX: "auto",
                flexShrink: 0,
              }}
            >
              {subs.map((label, i) => {
                const on = i === subIndex;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSub(i)}
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
            <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
              {children}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 24px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

function UserDetailsDrawer({
  user,
  canEdit,
  kind = "user",
  onClose,
  onSave,
  onReset,
  onStatus,
  onDeprovision,
}: {
  user: UserRow;
  canEdit: boolean;
  kind?: "user" | "guest";
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  onReset: () => void;
  onStatus: (s: string) => void;
  onDeprovision: () => void;
}) {
  const [section, setSection] = React.useState<string>("profile");
  const [sub, setSub] = React.useState(0);
  const sec = UD_SECTIONS.find((s) => s.id === section) ?? UD_SECTIONS[0];
  const init = React.useMemo(() => udForm(user), [user.id]);
  const [f, setF] = React.useState(init);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const dirty = JSON.stringify(f) !== JSON.stringify(init);
  const initials =
    user.name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  const save = () =>
    onSave({
      name: f.displayName.trim(),
      email: `${f.username.trim()}@${f.domain}`,
      bu: f.department,
      jobTitle: f.jobTitle,
      manager: f.manager,
      employeeId: f.employeeId,
      employeeType: f.employeeType,
      hireDate: f.hireDate,
      company: f.company,
      costCenter: f.costCenter,
      office: f.office,
      country: f.country,
    });

  const sectionIndex = UD_SECTIONS.findIndex((s) => s.id === section);
  return (
    <DetailDrawer
      initials={initials}
      title={user.name}
      meta={
        <button
          type="button"
          onClick={onReset}
          disabled={!canEdit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: T.accent,
            fontSize: 13,
            cursor: canEdit ? "pointer" : "not-allowed",
            padding: 0,
          }}
        >
          <KeyRound size={14} /> Reset password
        </button>
      }
      sections={UD_SECTIONS.map((s) => s.label)}
      sectionIndex={sectionIndex}
      onSection={(i) => {
        setSection(UD_SECTIONS[i].id);
        setSub(0);
      }}
      subs={sec.subs}
      subIndex={sub}
      onSub={setSub}
      onClose={onClose}
      footer={
        section === "profile" ? (
          <>
            <HeaderButton
              variant="primary"
              disabled={!dirty || !canEdit}
              onClick={save}
            >
              Save changes
            </HeaderButton>
            <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          </>
        ) : (
          <HeaderButton onClick={onClose}>Close</HeaderButton>
        )
      }
    >
      <UDContent
        section={section}
        sub={sub}
        user={user}
        f={f}
        set={set}
        canEdit={canEdit}
        kind={kind}
        onReset={onReset}
        onStatus={onStatus}
        onDeprovision={onDeprovision}
      />
    </DetailDrawer>
  );
}

function UDHead({
  children,
  sample,
  action,
}: {
  children: React.ReactNode;
  sample?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 15,
          fontWeight: 700,
          color: T.textPrimary,
        }}
      >
        {children}
        {sample && <SampleTag />}
      </div>
      {action}
    </div>
  );
}

function UDRows({
  items,
}: {
  items: {
    primary: React.ReactNode;
    secondary?: React.ReactNode;
    right?: React.ReactNode;
  }[];
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {items.length === 0 ? (
        <div style={{ padding: 16, fontSize: 12.5, color: T.textMuted }}>
          Nothing to show.
        </div>
      ) : (
        items.map((it, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="cg-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 14px",
              borderBottom:
                i < items.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.textPrimary }}>
                {it.primary}
              </div>
              {it.secondary && (
                <div
                  style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}
                >
                  {it.secondary}
                </div>
              )}
            </div>
            {it.right && (
              <div style={{ flexShrink: 0, fontSize: 12.5, color: T.textNav }}>
                {it.right}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function UDContent({
  section,
  sub,
  user,
  f,
  set,
  canEdit,
  kind = "user",
  onReset,
  onStatus,
  onDeprovision,
}: {
  section: string;
  sub: number;
  user: UserRow;
  f: ReturnType<typeof udForm>;
  set: (p: Partial<ReturnType<typeof udForm>>) => void;
  canEdit: boolean;
  kind?: "user" | "guest";
  onReset: () => void;
  onStatus: (s: string) => void;
  onDeprovision: () => void;
}) {
  const isGuest = kind === "guest";
  // ── Profile ──
  if (section === "profile") {
    if (sub === 0)
      return (
        <>
          <UDHead>Basic Information</UDHead>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <Field label="First name">
              <input
                value={f.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
                style={inp}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Last name">
              <input
                value={f.lastName}
                onChange={(e) => set({ lastName: e.target.value })}
                style={inp}
                disabled={!canEdit}
              />
            </Field>
          </div>
          <Req label="Display name">
            <input
              value={f.displayName}
              onChange={(e) => set({ displayName: e.target.value })}
              style={inp}
              disabled={!canEdit}
            />
          </Req>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 28px 1fr",
              gap: 0,
              alignItems: "center",
              padding: "8px 0",
            }}
          >
            <Field label="Username">
              <input
                value={f.username}
                onChange={(e) => set({ username: e.target.value })}
                style={inp}
                disabled={!canEdit}
              />
            </Field>
            <span
              style={{ textAlign: "center", color: T.textMuted, marginTop: 18 }}
            >
              @
            </span>
            <Field label="Domain">
              <input value={f.domain} style={{ ...inp }} disabled readOnly />
            </Field>
          </div>
        </>
      );
    if (sub === 1)
      return (
        <>
          <UDHead>Employment Information</UDHead>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <Field label="Job title">
              <input
                value={f.jobTitle}
                onChange={(e) => set({ jobTitle: e.target.value })}
                style={inp}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Department">
              <input
                value={f.department}
                onChange={(e) => set({ department: e.target.value })}
                style={inp}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Manager">
              <input
                value={f.manager}
                onChange={(e) => set({ manager: e.target.value })}
                style={inp}
                disabled={!canEdit}
                placeholder="None provided"
              />
            </Field>
            <Field label="Employee ID">
              <input
                value={f.employeeId}
                onChange={(e) => set({ employeeId: e.target.value })}
                style={inp}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Employee type">
              <Sel
                value={f.employeeType}
                onChange={(v) => set({ employeeType: v })}
                opts={["Full-time", "Part-time", "Contractor", "Intern"]}
              />
            </Field>
            <Field label="Hire date">
              <input
                type="date"
                value={f.hireDate}
                onChange={(e) => set({ hireDate: e.target.value })}
                style={inp}
                disabled={!canEdit}
              />
            </Field>
          </div>
        </>
      );
    if (sub === 2)
      return (
        <>
          <UDHead sample>Identity Information</UDHead>
          <KVGrid
            cols={2}
            items={[
              { k: "Identity provider", v: user.idp },
              { k: "User principal name", v: user.email },
              {
                k: "Object ID",
                v: "8f2c1a9e-3b6d-47f1-a0c2-9d4e7b1f0a52",
                sample: true,
              },
              { k: "Immutable ID", v: "aZ9k…Q1==", sample: true },
              {
                k: "Source",
                v: user.idp === "Local" ? "Cloud-only" : "Directory-synced",
                sample: true,
              },
              {
                k: "Sign-in allowed",
                v: user.status !== "suspended" ? "Yes" : "Blocked",
              },
            ]}
          />
        </>
      );
    if (sub === 3)
      return (
        <>
          <UDHead>Lifecycle</UDHead>
          <KVGrid
            cols={2}
            items={[
              { k: "Status", v: <StatusPill status={user.status} /> },
              { k: "Created on", v: "2025-01-06", sample: true },
              { k: "Last sign-in", v: user.lastLogin },
              { k: "MFA", v: <MfaBadge status={user.mfaStatus} /> },
            ]}
          />
          {canEdit && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                flexWrap: "wrap",
              }}
            >
              {user.status === "suspended" ? (
                <HeaderButton onClick={() => onStatus("active")}>
                  Reactivate user
                </HeaderButton>
              ) : (
                <HeaderButton onClick={() => onStatus("suspended")}>
                  Suspend user
                </HeaderButton>
              )}
              <ConfirmButton
                variant="danger"
                label={isGuest ? "Revoke access" : "Deprovision"}
                title={isGuest ? "Revoke guest access" : "Deprovision user"}
                body={
                  isGuest
                    ? `Revoke all access for ${user.email}? Their sessions are terminated immediately.`
                    : `Deprovision ${user.email}? This soft-deletes the user (30-day recovery) and revokes all access.`
                }
                confirmWord={isGuest ? "REVOKE" : "DEPROVISION"}
                confirmLabel={isGuest ? "Revoke" : "Deprovision"}
                onConfirm={onDeprovision}
              />
            </div>
          )}
        </>
      );
    return (
      <>
        <UDHead>Organization</UDHead>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field label="Company">
            <input
              value={f.company}
              onChange={(e) => set({ company: e.target.value })}
              style={inp}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Business unit">
            <input
              value={f.department}
              onChange={(e) => set({ department: e.target.value })}
              style={inp}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Cost center">
            <input
              value={f.costCenter}
              onChange={(e) => set({ costCenter: e.target.value })}
              style={inp}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Office location">
            <input
              value={f.office}
              onChange={(e) => set({ office: e.target.value })}
              style={inp}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Country / data residency">
            <Sel
              value={f.country}
              onChange={(v) => set({ country: v })}
              opts={[
                "Tunisia",
                "Ireland",
                "Germany",
                "United States",
                "United Kingdom",
              ]}
            />
          </Field>
        </div>
      </>
    );
  }

  // ── Roles ──
  if (section === "roles") {
    if (sub === 0)
      return (
        <>
          <UDHead
            action={
              canEdit ? <HeaderButton>Assign role</HeaderButton> : undefined
            }
          >
            Direct Roles
          </UDHead>
          <UDRows
            items={[
              {
                primary: user.role,
                secondary: "Assigned directly · permanent",
                right: canEdit ? (
                  <HeaderButton variant="secondary">Remove</HeaderButton>
                ) : (
                  "Active"
                ),
              },
            ]}
          />
        </>
      );
    if (sub === 1)
      return (
        <>
          <UDHead sample>Inherited Roles</UDHead>
          <UDRows
            items={[
              {
                primary: "Auditor",
                secondary: "via group “Security Operations”",
                right: "Inherited",
              },
              {
                primary: "Viewer",
                secondary: "via group “All Company”",
                right: "Inherited",
              },
            ]}
          />
        </>
      );
    if (sub === 2)
      return (
        <>
          <UDHead sample>Eligible Roles (PIM)</UDHead>
          <UDRows
            items={[
              {
                primary: "Enterprise Security Administrator",
                secondary: "Just-in-time · requires approval · max 8h",
                right: canEdit ? (
                  <HeaderButton>Activate</HeaderButton>
                ) : (
                  "Eligible"
                ),
              },
              {
                primary: "Compliance Administrator",
                secondary: "Just-in-time · MFA required · max 4h",
                right: canEdit ? (
                  <HeaderButton>Activate</HeaderButton>
                ) : (
                  "Eligible"
                ),
              },
            ]}
          />
        </>
      );
    return (
      <>
        <UDHead sample>Effective Permissions</UDHead>
        <UDRows
          items={[
            { primary: "scans:read", secondary: "from Auditor" },
            { primary: "findings:read", secondary: "from Auditor" },
            { primary: "evidence:export", secondary: "from Auditor" },
            { primary: "workspace:view", secondary: "from Viewer" },
          ]}
        />
      </>
    );
  }

  // ── Groups ──
  if (section === "groups") {
    if (sub === 0)
      return (
        <>
          <UDHead
            sample
            action={
              canEdit ? <HeaderButton>Add to group</HeaderButton> : undefined
            }
          >
            Memberships
          </UDHead>
          <UDRows
            items={[
              {
                primary: "All Company",
                secondary: "Dynamic · 248 members",
                right: canEdit ? (
                  <HeaderButton variant="secondary">Remove</HeaderButton>
                ) : (
                  "Member"
                ),
              },
              {
                primary: "Devence Lab",
                secondary: "Assigned · 19 members",
                right: canEdit ? (
                  <HeaderButton variant="secondary">Remove</HeaderButton>
                ) : (
                  "Member"
                ),
              },
              {
                primary: "Inference Defense",
                secondary: "Security · 7 members",
                right: canEdit ? (
                  <HeaderButton variant="secondary">Remove</HeaderButton>
                ) : (
                  "Owner"
                ),
              },
            ]}
          />
        </>
      );
    if (sub === 1)
      return (
        <>
          <UDHead sample>Inherited Access</UDHead>
          <UDRows
            items={[
              {
                primary: "Security Operations",
                secondary: "via nested group “Inference Defense”",
                right: "Nested",
              },
            ]}
          />
        </>
      );
    return (
      <>
        <UDHead sample>Group History</UDHead>
        <UDRows
          items={[
            {
              primary: "Added to “Inference Defense”",
              secondary: "by rami@inferencedefense.com",
              right: "2026-05-30",
            },
            {
              primary: "Added to “All Company”",
              secondary: "automatic (dynamic rule)",
              right: "2025-01-06",
            },
          ]}
        />
      </>
    );
  }

  // ── Credentials & MFA ──
  if (section === "credentials") {
    if (sub === 0)
      return (
        <>
          <UDHead>Password</UDHead>
          <KVGrid
            cols={2}
            items={[
              { k: "Last changed", v: "2026-04-18", sample: true },
              { k: "Force change on next sign-in", v: "No" },
              { k: "Policy", v: "8–256 chars · 3 of 4 categories" },
            ]}
          />
          {canEdit && (
            <div style={{ marginTop: 16 }}>
              <HeaderButton variant="primary" onClick={onReset}>
                <span
                  style={{
                    display: "inline-flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <KeyRound size={13} /> Reset password
                </span>
              </HeaderButton>
            </div>
          )}
        </>
      );
    if (sub === 1)
      return (
        <>
          <UDHead>Multi-factor Authentication</UDHead>
          <KVGrid
            cols={2}
            items={[
              { k: "MFA", v: <MfaBadge status={user.mfaStatus} /> },
              {
                k: "Default method",
                v: user.mfa ? "Microsoft Authenticator" : "—",
                sample: true,
              },
              {
                k: "Enforced by",
                v: "Conditional access policy",
                sample: true,
              },
            ]}
          />
          {canEdit && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <HeaderButton>
                {user.mfa ? "Require re-registration" : "Enforce MFA"}
              </HeaderButton>
              <HeaderButton variant="secondary">Reset MFA</HeaderButton>
            </div>
          )}
        </>
      );
    if (sub === 2)
      return (
        <>
          <UDHead sample>Authentication Methods</UDHead>
          <UDRows
            items={[
              {
                primary: "Microsoft Authenticator",
                secondary: "Push · registered 2026-04-18",
                right: "Primary",
              },
              {
                primary: "FIDO2 security key",
                secondary: "YubiKey 5C · registered 2026-05-02",
                right: "Active",
              },
              {
                primary: "SMS",
                secondary: "+216 •• ••• 412",
                right: "Fallback",
              },
            ]}
          />
        </>
      );
    if (sub === 3)
      return (
        <>
          <UDHead sample>Recovery Methods</UDHead>
          <UDRows
            items={[
              {
                primary: "Recovery email",
                secondary: "iheb.jaouadi@devencelab.com",
                right: "Verified",
              },
              {
                primary: "Recovery phone",
                secondary: "+216 •• ••• 412",
                right: "Verified",
              },
            ]}
          />
        </>
      );
    return (
      <>
        <UDHead sample>Security Status</UDHead>
        <KVGrid
          cols={2}
          items={[
            {
              k: "Sign-in risk",
              v: <span style={{ color: T.success }}>Low</span>,
            },
            {
              k: "User risk",
              v: <span style={{ color: T.success }}>None</span>,
            },
            { k: "Compromised", v: "No" },
            { k: "Last risk evaluation", v: user.lastLogin },
          ]}
        />
      </>
    );
  }

  // ── Activity ──
  if (sub === 0)
    return (
      <>
        <UDHead
          sample
          action={
            canEdit ? (
              <HeaderButton variant="secondary">
                Sign out all sessions
              </HeaderButton>
            ) : undefined
          }
        >
          Sessions
        </UDHead>
        <UDRows
          items={[
            {
              primary: "Chrome · Windows 11",
              secondary: "Tunis, TN · 196.203.•.•",
              right: canEdit ? (
                <HeaderButton variant="secondary">Terminate</HeaderButton>
              ) : (
                "Active"
              ),
            },
            {
              primary: "Edge · Windows 11",
              secondary: "Tunis, TN · 196.203.•.•",
              right: canEdit ? (
                <HeaderButton variant="secondary">Terminate</HeaderButton>
              ) : (
                "2h ago"
              ),
            },
          ]}
        />
      </>
    );
  if (sub === 1)
    return (
      <>
        <UDHead sample>Sign-ins</UDHead>
        <UDRows
          items={[
            {
              primary: "Successful sign-in",
              secondary: "Microsoft Authenticator · Tunis, TN",
              right: user.lastLogin,
            },
            {
              primary: "Successful sign-in",
              secondary: "FIDO2 · Tunis, TN",
              right: "2026-06-21",
            },
            {
              primary: "Blocked sign-in",
              secondary: "Impossible travel · Frankfurt, DE",
              right: "2026-06-15",
            },
          ]}
        />
      </>
    );
  if (sub === 2)
    return (
      <>
        <UDHead sample>Access Changes</UDHead>
        <UDRows
          items={[
            {
              primary: `Role set to ${user.role}`,
              secondary: "by rami@inferencedefense.com",
              right: "2026-05-30",
            },
            {
              primary: "Added to “Inference Defense”",
              secondary: "by security-ops@inferencedefense.com",
              right: "2026-05-30",
            },
          ]}
        />
      </>
    );
  if (sub === 3)
    return (
      <>
        <UDHead sample>Administrative Actions</UDHead>
        <UDRows
          items={[
            {
              primary: "MFA reset",
              secondary: "by helpdesk@inferencedefense.com",
              right: "2026-04-18",
            },
            {
              primary: "Password reset",
              secondary: "self-service",
              right: "2026-04-18",
            },
          ]}
        />
      </>
    );
  return (
    <>
      <UDHead sample>Audit Timeline</UDHead>
      <UDRows
        items={[
          {
            primary: "Signed in",
            secondary: "Microsoft Authenticator",
            right: user.lastLogin,
          },
          {
            primary: "Role changed",
            secondary: `→ ${user.role}`,
            right: "2026-05-30",
          },
          {
            primary: "Joined “Inference Defense”",
            secondary: "",
            right: "2026-05-30",
          },
          {
            primary: "Account created",
            secondary: "by rami@inferencedefense.com",
            right: "2025-01-06",
          },
        ]}
      />
    </>
  );
}

// ── Contact details drawer — an external person tagged as a contact. NO left
//    rail: a horizontal sub-tab strip (Details / Address / Organization / Mail
//    tip) over editable sub-views. ────────────────────────────────────────────
const CONTACT_SUBS = ["Details", "Address", "Organization", "Mail tip"];
function ContactDetailsDrawer({
  initial,
  canEdit = true,
  onClose,
  onAdd,
  onUpdate,
}: {
  initial?: ContactRow | null;
  canEdit?: boolean;
  onClose: () => void;
  onAdd: (c: ContactRow) => void;
  onUpdate?: (c: ContactRow) => void;
}) {
  const isEdit = !!initial;
  const [sub, setSub] = React.useState(0);
  const [f, setF] = React.useState({
    firstName: "",
    lastName: "",
    displayName: initial?.name ?? "",
    email: initial?.email ?? "",
    company: initial && initial.company !== "—" ? initial.company : "",
    title: initial?.title ?? "",
    website: "",
    relationship: "Vendor",
    tags: "",
    discoverable: true,
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "Select a location",
    phone: "",
    mailTip: "",
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const err = { name: !f.displayName.trim(), email: !f.email.includes("@") };
  const bad = err.name || err.email;
  const initials =
    (f.displayName || f.email)
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C";
  const submit = () => {
    if (bad) {
      setSub(0);
      return;
    }
    const next: ContactRow = {
      id: initial?.id ?? `c${Date.now()}`,
      name: f.displayName.trim(),
      email: f.email.trim(),
      company: f.company || "—",
      title: f.title,
    };
    if (isEdit) onUpdate?.(next);
    else onAdd(next);
  };
  return (
    <div
      onClick={onClose}
      className="cg-overlay-anim"
      style={{ ...ovl, zIndex: 1200, justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cg-drawer-anim"
        style={{
          width: 620,
          maxWidth: "98vw",
          height: "100%",
          background: T.cardBg,
          borderLeft: `1px solid ${T.borderStrong}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--cg-border-strong)",
              color: "#fff",
              fontSize: 17,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}
            >
              {isEdit ? f.displayName || "Edit contact" : "Add a contact"}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              External contact · no sign-in, no access
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
              alignSelf: "flex-start",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-tab strip (no left rail) */}
        <div
          className="custom-scrollbar"
          style={{
            display: "flex",
            gap: 2,
            padding: "0 24px",
            borderBottom: `1px solid ${T.border}`,
            overflowX: "auto",
            flexShrink: 0,
          }}
        >
          {CONTACT_SUBS.map((label, i) => {
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

        {/* Sub-view content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
          {sub === 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="First name">
                  <input
                    value={f.firstName}
                    onChange={(e) => set({ firstName: e.target.value })}
                    style={inp}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={f.lastName}
                    onChange={(e) => set({ lastName: e.target.value })}
                    style={inp}
                    disabled={!canEdit}
                  />
                </Field>
              </div>
              <Req label="Display name" err={err.name}>
                <input
                  value={f.displayName}
                  onChange={(e) => set({ displayName: e.target.value })}
                  style={errInp(err.name)}
                  disabled={!canEdit}
                />
              </Req>
              <Req label="Email" err={err.email}>
                <input
                  value={f.email}
                  onChange={(e) => set({ email: e.target.value })}
                  style={errInp(err.email)}
                  placeholder="name@company.com"
                  disabled={!canEdit}
                />
              </Req>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="Company">
                  <input
                    value={f.company}
                    onChange={(e) => set({ company: e.target.value })}
                    style={inp}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Job title">
                  <input
                    value={f.title}
                    onChange={(e) => set({ title: e.target.value })}
                    style={inp}
                    disabled={!canEdit}
                  />
                </Field>
              </div>
              <Field label="Web site">
                <input
                  value={f.website}
                  onChange={(e) => set({ website: e.target.value })}
                  style={inp}
                  placeholder="https://"
                  disabled={!canEdit}
                />
              </Field>
            </>
          )}
          {sub === 1 && (
            <>
              <Field label="Street address">
                <input
                  value={f.street}
                  onChange={(e) => set({ street: e.target.value })}
                  style={inp}
                  disabled={!canEdit}
                />
              </Field>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="City">
                  <input
                    value={f.city}
                    onChange={(e) => set({ city: e.target.value })}
                    style={inp}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="State or province">
                  <input
                    value={f.state}
                    onChange={(e) => set({ state: e.target.value })}
                    style={inp}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="ZIP or postal code">
                  <input
                    value={f.zip}
                    onChange={(e) => set({ zip: e.target.value })}
                    style={inp}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Country or region">
                  <Sel
                    value={f.country}
                    onChange={(v) => set({ country: v })}
                    opts={[
                      "Select a location",
                      "United States",
                      "Ireland",
                      "Germany",
                      "Tunisia",
                      "United Kingdom",
                    ]}
                  />
                </Field>
              </div>
              <Field label="Phone number">
                <input
                  value={f.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  style={inp}
                  disabled={!canEdit}
                />
              </Field>
            </>
          )}
          {sub === 2 && (
            <>
              <Field label="Company">
                <input
                  value={f.company}
                  onChange={(e) => set({ company: e.target.value })}
                  style={inp}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Relationship">
                <Sel
                  value={f.relationship}
                  onChange={(v) => set({ relationship: v })}
                  opts={[
                    "Vendor",
                    "Partner",
                    "Regulator",
                    "Customer",
                    "Auditor",
                    "Other",
                  ]}
                />
              </Field>
              <Field label="Tags (comma-separated)">
                <input
                  value={f.tags}
                  onChange={(e) => set({ tags: e.target.value })}
                  style={inp}
                  placeholder="e.g. aws, billing, escalation"
                  disabled={!canEdit}
                />
              </Field>
              <Chk
                label="Discoverable in the organization directory"
                on={f.discoverable}
                onChange={(v) => set({ discoverable: v })}
              />
            </>
          )}
          {sub === 3 && (
            <Field label="Mail tip — shown to senders before they email this contact">
              <textarea
                value={f.mailTip}
                onChange={(e) => set({ mailTip: e.target.value })}
                rows={5}
                style={{
                  ...inp,
                  height: "auto",
                  padding: 11,
                  resize: "vertical",
                }}
                disabled={!canEdit}
              />
            </Field>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 24px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <HeaderButton
            variant="primary"
            disabled={bad || !canEdit}
            onClick={submit}
          >
            {isEdit ? "Save" : "Add"}
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// §7 Identity & Access — grouped navigation (Identity / Access) + per-leaf
// sub-tab areas. Existing live/rich tabs are mapped into their natural sub-view;
// the remaining sub-views run on representative `Sample` state and are fully
// interactive so the workflows are real to operate.
// ════════════════════════════════════════════════════════════════════════════
// Meaningful icon per sub-tab label (so the pill sub-nav reads like the Users one).
const SUBTAB_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  // Authentication & Credentials
  Authentication: ShieldCheck,
  "Local Sign-in & Break-glass": KeyRound,
  MFA: ShieldCheck,
  Methods: Fingerprint,
  "Password Policy": Lock,
  "MFA Management": ShieldCheck,
  "Authentication Methods": KeyRound,
  "Password Policies": Lock,
  Passkeys: Fingerprint,
  "Security Keys": Usb,
  "Temporary Access Pass": Clock,
  "Credential Policies": ScrollText,
  "Security Insights": Activity,
  // Groups
  "Security Groups": Shield,
  "Collaboration Groups": Users,
  "Dynamic Groups": Filter,
  "Nested Groups": Boxes,
  // Roles
  "System Roles": Shield,
  "Custom Roles": Wrench,
  "Permission Catalog": Tag,
  // Assignments
  "User Assignments": Users,
  "Group Assignments": UsersRound,
  "Scoped Assignments": Target,
  "Delegated Assignments": Share2,
  // Privileged Access
  "Eligible Access": Clock,
  "Active Access": CheckCircle2,
  "Activation Requests": Inbox,
  Approvals: Check,
  "Emergency Access": AlertTriangle,
  "Access History": History,
  // Reviews & Certifications
  "User Access Reviews": Users,
  "Role Reviews": Shield,
  "Group Reviews": UsersRound,
  "Certification Campaigns": BadgeCheck,
  "Segregation of Duties": Scale,
  // Sessions
  "Active Sessions": Monitor,
  "Privileged Sessions": ShieldCheck,
  "Service Sessions": Server,
  "Failed Sign-ins": AlertTriangle,
  "Risky Sessions": ShieldAlert,
  "Session Policies": ScrollText,
  // Identity Alerts
  "Active Alerts": Bell,
  "Threats & Risks": ShieldAlert,
  "Governance Violations": Scale,
  Configuration: SlidersHorizontal,
  History,
  "Identity Threats": ShieldAlert,
  "Privilege Risks": KeyRound,
  "Authentication Risks": Fingerprint,
  "Access Governance Violations": Scale,
  "Approval Workflow Violations": GitBranch,
  "Alert Rules": SlidersHorizontal,
  "External Integrations": Plug,
  "Alert History": History,
};
function SubTabStrip({
  subs,
  active,
  onChange,
}: {
  subs: string[];
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      {subs.map((label, i) => {
        const on = i === active;
        const Icon = SUBTAB_ICONS[label];
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(i)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 9px",
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
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Groups ──────────────────────────────────────────────────────────────────
const GROUPS_SUBS = [
  "Security Groups",
  "Collaboration Groups",
  "Dynamic Groups",
  "Nested Groups",
];
function GroupsArea() {
  const [sub, setSub] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={GROUPS_SUBS} active={sub} onChange={setSub} />
      {sub === 0 && <SecurityGroupsCollection collab={false} />}
      {sub === 1 && <SecurityGroupsCollection collab />}
      {sub === 2 && <DynamicGroupsCollection />}
      {sub === 3 && <NestedGroupsCollection />}
    </div>
  );
}

// ── group flows ─────────────────────────────────────────────────────────────
const GRP_STEPS = ["Basics", "Roles & access", "Resource scope", "Review"];
function CreateGroupFlow({
  collab,
  onClose,
  onCreate,
}: {
  collab: boolean;
  onClose: () => void;
  onCreate: (row: ARow) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState({
    name: "",
    desc: "",
    owner: "",
    workspace: "Production",
    role: "Viewer",
    resource: "None",
    bu: "Payments",
    manager: "",
    dept: "Engineering",
    costCenter: "CC-1042",
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const err = !f.name.trim();
  const last = step === GRP_STEPS.length - 1;
  return (
    <WizardShell
      title={collab ? "Create collaboration group" : "Create security group"}
      steps={GRP_STEPS}
      step={step}
      setStep={setStep}
      stepError={(i) => (i === 0 ? err : false)}
      showErrors={last}
      canFinish={!err}
      finishLabel="Create group"
      onFinish={() => {
        if (err) {
          setStep(0);
          return;
        }
        onCreate({
          id: `g${Date.now()}`,
          name: f.name.trim(),
          source: "Local",
          type: collab ? "Collaboration" : "Security",
          members: "0",
          roles: f.role,
          workspace: f.workspace,
          owner: f.owner || "you",
          status: "Active",
          bu: f.bu,
          manager: f.manager,
          dept: f.dept,
          costCentre: f.costCenter,
        });
      }}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Set up the group</H>
          <P>Name the group and choose its owner and workspace scope.</P>
          <Req label="Name" err={err}>
            <input
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              style={errInp(err)}
              placeholder="e.g. Security Engineers"
            />
          </Req>
          <Field label="Description">
            <textarea
              value={f.desc}
              onChange={(e) => set({ desc: e.target.value })}
              rows={3}
              style={{
                ...inp,
                height: "auto",
                padding: 11,
                resize: "vertical",
              }}
            />
          </Field>
          <Field label="Owner">
            <input
              value={f.owner}
              onChange={(e) => set({ owner: e.target.value })}
              style={inp}
              placeholder="owner@company.com"
            />
          </Field>
          <Field label="Workspace scope">
            <Sel
              value={f.workspace}
              onChange={(v) => set({ workspace: v })}
              opts={["Organization", "Production", "SOC", "Lab"]}
            />
          </Field>
          {collab && (
            <>
              <Field label="Business unit">
                <input
                  value={f.bu}
                  onChange={(e) => set({ bu: e.target.value })}
                  style={inp}
                />
              </Field>
              <Field label="Manager">
                <input
                  value={f.manager}
                  onChange={(e) => set({ manager: e.target.value })}
                  style={inp}
                />
              </Field>
              <Field label="Cost center">
                <input
                  value={f.costCenter}
                  onChange={(e) => set({ costCenter: e.target.value })}
                  style={inp}
                />
              </Field>
            </>
          )}
        </>
      )}
      {step === 1 && (
        <>
          <H>Roles & access</H>
          <P>Roles this group grants to its members.</P>
          <Req label="Assign role">
            <Sel
              value={f.role}
              onChange={(v) => set({ role: v })}
              opts={ROLE_OPTS}
            />
          </Req>
        </>
      )}
      {step === 2 && (
        <>
          <H>Resource scope</H>
          <P>Infrastructure this group can access.</P>
          <Field label="Grant resource access">
            <Sel
              value={f.resource}
              onChange={(v) => set({ resource: v })}
              opts={[
                "None",
                "AWS Production (Read)",
                "Azure Subscription (Admin)",
                "GCP Project (Read)",
              ]}
            />
          </Field>
        </>
      )}
      {step === 3 && (
        <>
          <H>Review and create</H>
          <P>Review the group before creating it.</P>
          <ReviewSec
            title="Basics"
            onEdit={() => setStep(0)}
            errors={err ? ["Please name the group."] : []}
          >
            <KV k="Name" v={f.name || "—"} />
            <KV k="Owner" v={f.owner || "you"} />
            <KV k="Workspace" v={f.workspace} />
          </ReviewSec>
          <ReviewSec title="Access" onEdit={() => setStep(1)}>
            <KV k="Role" v={f.role} />
            <KV k="Resource" v={f.resource} />
          </ReviewSec>
        </>
      )}
    </WizardShell>
  );
}
function ImportIdpFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (prov: string, n: number) => void;
}) {
  const [prov, setProv] = React.useState("Microsoft Entra ID");
  const [preview, setPreview] = React.useState<number | null>(null);
  return (
    <Drawer
      title="Import groups from identity provider"
      subtitle="Preview, then import directory groups. Re-sync keeps membership current."
      width={540}
      onClose={onClose}
      footer={
        preview !== null ? (
          <>
            <HeaderButton
              variant="primary"
              onClick={() => onDone(prov, preview)}
            >
              Import {preview} groups
            </HeaderButton>
            <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          </>
        ) : (
          <>
            <HeaderButton
              variant="primary"
              onClick={() => setPreview(Math.floor(Math.random() * 24) + 8)}
            >
              Preview
            </HeaderButton>
            <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          </>
        )
      }
    >
      <Field label="Provider">
        <Sel
          value={prov}
          onChange={setProv}
          opts={[
            "Microsoft Entra ID",
            "Okta",
            "Google Workspace",
            "Ping Identity",
            "OneLogin",
          ]}
        />
      </Field>
      {preview !== null && (
        <KVGrid
          cols={1}
          items={[
            { k: "Groups found", v: String(preview) },
            { k: "New", v: String(preview - 3) },
            { k: "Already linked", v: "3" },
            { k: "Sync", v: "Every 6 hours" },
          ]}
        />
      )}
    </Drawer>
  );
}
function AddMembersFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (n: number) => void;
}) {
  const [emails, setEmails] = React.useState("");
  const n = emails
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean).length;
  return (
    <Drawer
      title="Add members"
      subtitle="Add users to this group by email (comma or newline separated)."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={!n}
            onClick={() => onDone(n)}
          >
            Add {n} member{n === 1 ? "" : "s"}
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Emails">
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={5}
          style={{ ...inp, height: "auto", padding: 11, resize: "vertical" }}
          placeholder="alice@company.com, bob@company.com"
        />
      </Field>
    </Drawer>
  );
}
function GrantAccessFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (s: string) => void;
}) {
  const [res, setRes] = React.useState("");
  const [perm, setPerm] = React.useState("Read");
  const err = !res.trim();
  return (
    <Drawer
      title="Grant resource access"
      subtitle="Grant this group access to a resource at a permission level."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() => onDone(`${perm} on ${res.trim()}`)}
          >
            Grant access
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Resource" err={err}>
        <input
          value={res}
          onChange={(e) => setRes(e.target.value)}
          style={errInp(err)}
          placeholder="e.g. AWS Production"
        />
      </Req>
      <Field label="Permission">
        <Sel
          value={perm}
          onChange={setPerm}
          opts={["Read", "Write", "Admin"]}
        />
      </Field>
    </Drawer>
  );
}
function LaunchReviewFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [reviewer, setReviewer] = React.useState("Group owner");
  const [due, setDue] = React.useState("");
  const [scope, setScope] = React.useState("Members + roles");
  return (
    <Drawer
      title="Launch access review"
      subtitle="Start a certification review of this group's access."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" onClick={onDone}>
            Start review
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Reviewer">
        <Sel
          value={reviewer}
          onChange={setReviewer}
          opts={["Group owner", "Security Operations", "Compliance", "CISO"]}
        />
      </Field>
      <Field label="Scope">
        <Sel
          value={scope}
          onChange={setScope}
          opts={["Members", "Roles", "Members + roles", "Resource access"]}
        />
      </Field>
      <Field label="Due date">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          style={inp}
        />
      </Field>
    </Drawer>
  );
}

// ── shared group drawer (Security / Collaboration) ──────────────────────────
function SecGroupDrawer({
  r,
  collab,
  canEdit,
  setFlow,
  setToast,
  close,
}: {
  r: ARow;
  collab: boolean;
  canEdit: boolean;
  setFlow: (n: React.ReactNode) => void;
  setToast: (s: string) => void;
  close: () => void;
}) {
  const tdone = (m: string) => {
    setFlow(null);
    setToast(m);
  };
  return (
    <AuthEntityDrawer
      initials={initials2(r.name)}
      title={r.name}
      meta={
        <span
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12.5,
            color: T.textMuted,
          }}
        >
          {r.type} · {r.source} · <AStatus s={r.status} /> · {r.members} members
          · {r.owner}
        </span>
      }
      actions={
        canEdit ? (
          <>
            <HeaderButton onClick={() => setToast("Editing group")}>
              Edit
            </HeaderButton>
            <HeaderButton
              onClick={() =>
                setFlow(
                  <AssignFlow
                    title={`Assign role to ${r.name}`}
                    onClose={() => setFlow(null)}
                    onDone={(s) => tdone(`Role assigned to ${s}`)}
                  />,
                )
              }
            >
              Assign Role
            </HeaderButton>
            <HeaderButton
              onClick={() =>
                setFlow(
                  <AddMembersFlow
                    onClose={() => setFlow(null)}
                    onDone={(n) => tdone(`${n} member(s) added`)}
                  />,
                )
              }
            >
              Add Member
            </HeaderButton>
            <HeaderButton
              onClick={() =>
                setFlow(
                  <LaunchReviewFlow
                    onClose={() => setFlow(null)}
                    onDone={() => tdone("Review launched")}
                  />,
                )
              }
            >
              Launch Review
            </HeaderButton>
          </>
        ) : undefined
      }
      sections={[
        {
          label: "Overview",
          subs: [
            {
              label: "General",
              content: kvb([
                { k: "Name", v: r.name },
                {
                  k: "Description",
                  v: collab
                    ? "Business collaboration group"
                    : "Authorization group",
                },
                { k: "Type", v: r.type },
                { k: "Status", v: <AStatus s={r.status} /> },
                { k: "Owner", v: r.owner },
                { k: "Created", v: "2025-01-06" },
                { k: "Modified", v: "2026-05-30" },
                { k: "Source", v: r.source },
              ]),
            },
            {
              label: "Scope",
              content: kvb([
                { k: "Organization", v: "Inference Defense" },
                { k: "Workspace", v: r.workspace },
                { k: "Inherited scope", v: "Org defaults" },
                ...(collab
                  ? [
                      { k: "Business unit", v: r.bu },
                      { k: "Manager", v: r.manager || "—" },
                      { k: "Department", v: r.dept },
                      { k: "Cost center", v: r.costCentre },
                    ]
                  : []),
              ]),
            },
            {
              label: "Statistics",
              content: kvb([
                { k: "Members", v: r.members },
                { k: "Roles", v: "1" },
                { k: "Resources", v: "2" },
                { k: "Approvals", v: collab ? "0" : "1" },
                { k: "Reviews", v: "1" },
              ]),
            },
          ],
        },
        {
          label: "Members",
          subs: [
            {
              label: "Members",
              content: (
                <>
                  {tlb([
                    {
                      primary: "rami@inferencedefense.com",
                      secondary: "Engineering · Admin · last 2026-06-24",
                      right: <AStatus s="Active" />,
                    },
                    {
                      primary: "marc@sentinel-org.io",
                      secondary:
                        "Security · Security Engineer · last 2026-06-23",
                      right: <AStatus s="Active" />,
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <AddMembersFlow
                              onClose={() => setFlow(null)}
                              onDone={(n) => tdone(`${n} member(s) added`)}
                            />,
                          )
                        }
                      >
                        Add Member
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Member removed")}>
                        Remove Member
                      </HeaderButton>
                      <HeaderButton
                        onClick={() => setToast("Members exported")}
                      >
                        Export Members
                      </HeaderButton>
                    </ActRow>
                  )}
                </>
              ),
            },
          ],
        },
        {
          label: "Roles",
          subs: [
            {
              label: "Roles",
              content: (
                <>
                  {tlb([
                    {
                      primary: r.roles,
                      secondary: `Scope: ${r.workspace} · assigned by rami@inferencedefense.com`,
                      right: "2026-03-04",
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <AssignFlow
                              title={`Assign role to ${r.name}`}
                              onClose={() => setFlow(null)}
                              onDone={(s) => tdone(`Role assigned to ${s}`)}
                            />,
                          )
                        }
                      >
                        Assign Role
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Role removed")}>
                        Remove Role
                      </HeaderButton>
                      <HeaderButton
                        onClick={() => setToast("Assignments cloned")}
                      >
                        Clone Assignments
                      </HeaderButton>
                    </ActRow>
                  )}
                  <SecHead2>Effective permissions</SecHead2>
                  {tlb([
                    {
                      primary: "scans:read",
                      secondary: `Group → ${r.roles} → permission`,
                      right: "",
                    },
                    {
                      primary: "findings:read",
                      secondary: `via ${r.roles}`,
                      right: "",
                    },
                  ])}
                </>
              ),
            },
          ],
        },
        {
          label: "Resource Access",
          subs: [
            {
              label: "Resource Access",
              content: (
                <>
                  {tlb([
                    {
                      primary: "AWS Production",
                      secondary: "Cloud Account · Payments · Read",
                      right: "Direct",
                    },
                    {
                      primary: "Azure Subscription",
                      secondary: "Subscription · Platform · Admin",
                      right: "Inherited",
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <GrantAccessFlow
                              onClose={() => setFlow(null)}
                              onDone={(s) => tdone(`Granted ${s}`)}
                            />,
                          )
                        }
                      >
                        Grant Access
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Access revoked")}>
                        Revoke Access
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Exported")}>
                        Export
                      </HeaderButton>
                    </ActRow>
                  )}
                  <SecHead2>Access path</SecHead2>
                  {tlb([
                    {
                      primary: `${r.name} → ${r.roles} → scans:read → AWS Production`,
                      secondary: "authorization path",
                      right: "",
                    },
                  ])}
                </>
              ),
            },
          ],
        },
        {
          label: "Approval Workflows",
          subs: [
            {
              label: "Approval Workflows",
              content: (
                <>
                  {tlb([
                    {
                      primary: "Security change approval",
                      secondary: "Stage 2 of 3 · approvers: ciso, platform",
                      right: <AStatus s="Active" />,
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() => setToast("Workflow attached")}
                      >
                        Attach Workflow
                      </HeaderButton>
                      <HeaderButton
                        onClick={() => setToast("Workflow detached")}
                      >
                        Detach Workflow
                      </HeaderButton>
                      <HeaderButton
                        onClick={() => setToast("Workflow preview")}
                      >
                        Preview Workflow
                      </HeaderButton>
                    </ActRow>
                  )}
                  <SecHead2>Workflow</SecHead2>
                  {tlb([
                    {
                      primary: "Request → Stage 1 → Stage 2 → Final Approval",
                      secondary: "approval chain",
                      right: "",
                    },
                  ])}
                </>
              ),
            },
          ],
        },
        {
          label: "Activity",
          subs: [
            {
              label: "Activity",
              content: tlb([
                {
                  primary: "Member added",
                  secondary: "marc@sentinel-org.io",
                  right: "2026-05-30",
                },
                {
                  primary: "Role assigned",
                  secondary: r.roles,
                  right: "2026-03-04",
                },
                {
                  primary: "Access granted",
                  secondary: "AWS Production",
                  right: "2026-02-11",
                },
              ]),
            },
          ],
        },
        {
          label: "Access Reviews",
          subs: [
            {
              label: "Access Reviews",
              content: (
                <>
                  {tlb([
                    {
                      primary: "Q2 group certification",
                      secondary: "reviewer: rami@inferencedefense.com",
                      right: <AStatus s="Pending" />,
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <LaunchReviewFlow
                              onClose={() => setFlow(null)}
                              onDone={() => tdone("Review started")}
                            />,
                          )
                        }
                      >
                        Start Review
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Exported")}>
                        Export
                      </HeaderButton>
                    </ActRow>
                  )}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        onClick={() => setToast("Access certified")}
                      >
                        Approve
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Access revoked")}>
                        Revoke Access
                      </HeaderButton>
                      <HeaderButton
                        onClick={() => setToast("Justification requested")}
                      >
                        Request Justification
                      </HeaderButton>
                    </ActRow>
                  )}
                </>
              ),
            },
          ],
        },
        {
          label: "Audit History",
          subs: [
            {
              label: "Audit",
              content: tlb([
                {
                  primary: "Group created",
                  secondary: "by rami@inferencedefense.com",
                  right: "2025-01-06",
                },
                {
                  primary: "Role assigned",
                  secondary: r.roles,
                  right: "2026-03-04",
                },
                {
                  primary: "Member added",
                  secondary: "marc@sentinel-org.io",
                  right: "2026-05-30",
                },
              ]),
            },
          ],
        },
      ]}
      onClose={close}
    />
  );
}
function SecHead2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: T.textMuted,
        margin: "18px 0 8px",
      }}
    >
      {children}
    </div>
  );
}

// ── Security / Collaboration Groups collection ──────────────────────────────
function SecurityGroupsCollection({ collab }: { collab: boolean }) {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = collab
    ? [
        {
          id: "0",
          name: "Payments Team",
          source: "Local",
          type: "Collaboration",
          members: "24",
          roles: "Viewer",
          workspace: "Production",
          owner: "lead-payments@inferencedefense.com",
          status: "Active",
          bu: "Payments",
          manager: "rami@inferencedefense.com",
          dept: "Engineering",
          costCentre: "CC-1042",
        },
        {
          id: "1",
          name: "SOC Team",
          source: "Entra ID",
          type: "Collaboration",
          members: "7",
          roles: "Auditor",
          workspace: "SOC",
          owner: "soc-lead@inferencedefense.com",
          status: "Active",
          bu: "Security",
          manager: "ciso@inferencedefense.com",
          dept: "Security",
          costCentre: "CC-2001",
        },
      ]
    : [
        {
          id: "0",
          name: "Security Engineers",
          source: "Entra ID",
          type: "Security",
          members: "42",
          roles: "Security Engineer",
          workspace: "Production",
          owner: "platform@inferencedefense.com",
          status: "Active",
        },
        {
          id: "1",
          name: "Cloud Operators",
          source: "Local",
          type: "Security",
          members: "11",
          roles: "Workspace Administrator",
          workspace: "Production",
          owner: "rami@inferencedefense.com",
          status: "Active",
        },
        {
          id: "2",
          name: "Auditors",
          source: "Okta",
          type: "Security",
          members: "5",
          roles: "Auditor",
          workspace: "SOC",
          owner: "compliance@inferencedefense.com",
          status: "Disabled",
        },
      ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const defs: [string, string, ((r: ARow) => React.ReactNode)?][] = [
    ["name", "Group"],
    ["source", "Source"],
    ["type", "Type"],
    ["members", "Members"],
    ["roles", "Roles"],
    ["workspace", "Workspace"],
    ["owner", "Owner"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ];
  if (collab)
    defs.splice(7, 0, ["bu", "Business Unit"], ["dept", "Department"]);
  const cols = aCols(defs);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title={collab ? "Collaboration Groups" : "Security Groups"}
        desc={
          collab
            ? "Membership groups for business collaboration (Business Unit, Manager, Department, Cost Center)."
            : "Manage authorization groups used to grant roles, resource access and approval authority."
        }
        searchPlaceholder="Search groups"
        commands={[
          {
            key: "new",
            label: "Create Group",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateGroupFlow
                  collab={collab}
                  onClose={() => setFlow(null)}
                  onCreate={(row) => {
                    setRows((rs) => [row, ...rs]);
                    setFlow(null);
                    setToast("Group created");
                  }}
                />,
              ),
          },
          {
            key: "imp",
            label: "Import From IdP",
            icon: <Plug size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ImportIdpFlow
                  onClose={() => setFlow(null)}
                  onDone={(p, n) => {
                    setFlow(null);
                    setToast(`${n} groups imported from ${p}`);
                  }}
                />,
              ),
          },
          {
            key: "addm",
            label: "Add Members",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AddMembersFlow
                  onClose={() => setFlow(null)}
                  onDone={(n) => {
                    setFlow(null);
                    setToast(`${n} member(s) added`);
                  }}
                />,
              ),
          },
          {
            key: "role",
            label: "Assign Roles",
            icon: <Shield size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Assign role to group"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Role assigned to ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "grant",
            label: "Grant Resource Access",
            icon: <Boxes size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <GrantAccessFlow
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Granted ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "rev",
            label: "Launch Review",
            icon: <BadgeCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <LaunchReviewFlow
                  onClose={() => setFlow(null)}
                  onDone={() => {
                    setFlow(null);
                    setToast("Review launched");
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () =>
              authCsv(
                rows,
                collab ? "collaboration-groups" : "security-groups",
              ),
          },
        ]}
        filterDefs={[
          { key: "source", label: "Source" },
          { key: "workspace", label: "Workspace" },
          { key: "owner", label: "Owner" },
          { key: "roles", label: "Role" },
          { key: "status", label: "Status" },
          { key: "type", label: "Group Type" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      setFlow(
                        <AssignFlow
                          title="Assign role to groups"
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            setFlow(null);
                            setToast(`Role assigned to ${s}`);
                          }}
                        />,
                      );
                      clear();
                    }}
                  >
                    Assign Roles
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setToast("Roles removed");
                      clear();
                    }}
                  >
                    Remove Roles
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setFlow(
                        <AddMembersFlow
                          onClose={() => setFlow(null)}
                          onDone={(n) => {
                            setFlow(null);
                            setToast(`${n} member(s) added`);
                          }}
                        />,
                      );
                      clear();
                    }}
                  >
                    Add Members
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setToast("Members removed");
                      clear();
                    }}
                  >
                    Remove Members
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setFlow(
                        <LaunchReviewFlow
                          onClose={() => setFlow(null)}
                          onDone={() => {
                            setFlow(null);
                            setToast("Review launched");
                          }}
                        />,
                      );
                      clear();
                    }}
                  >
                    Launch Review
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setRows((rs) =>
                        rs.map((r) =>
                          ids.includes(r.id) ? { ...r, status: "Disabled" } : r,
                        ),
                      );
                      clear();
                    }}
                  >
                    Disable
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "Edit", onClick: () => setToast(`Editing ${r.name}`) },
                {
                  label: "Assign Roles",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title={`Assign role to ${r.name}`}
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Role assigned to ${s}`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Add Members",
                  onClick: () =>
                    setFlow(
                      <AddMembersFlow
                        onClose={() => setFlow(null)}
                        onDone={(n) => {
                          setFlow(null);
                          setToast(`${n} member(s) added`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Launch Review",
                  onClick: () =>
                    setFlow(
                      <LaunchReviewFlow
                        onClose={() => setFlow(null)}
                        onDone={() => {
                          setFlow(null);
                          setToast("Review launched");
                        }}
                      />,
                    ),
                },
                {
                  label: "Export",
                  onClick: () => authCsv([r], `group-${r.name}`),
                },
                {
                  label: "Disable",
                  onClick: () =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id ? { ...x, status: "Disabled" } : x,
                      ),
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <SecGroupDrawer
            r={r}
            collab={collab}
            canEdit={canEdit}
            setFlow={setFlow}
            setToast={setToast}
            close={close}
          />
        )}
      />
    </>
  );
}

// ── Dynamic Groups collection ───────────────────────────────────────────────
function DynamicGroupsCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      name: "All Company",
      rule: "user.accountEnabled = true",
      members: "248",
      roles: "Viewer",
      workspace: "Organization",
      status: "Up to date",
    },
    {
      id: "1",
      name: "EU Residents",
      rule: "user.country in (TN, IE, DE)",
      members: "173",
      roles: "Viewer",
      workspace: "Organization",
      status: "Up to date",
    },
    {
      id: "2",
      name: "Privileged Operators",
      rule: "user.role startsWith 'Enterprise'",
      members: "7",
      roles: "Auditor",
      workspace: "Production",
      status: "Evaluating",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["name", "Group"],
    ["rule", "Membership Rule"],
    ["members", "Members"],
    ["roles", "Roles"],
    ["workspace", "Workspace"],
    [
      "status",
      "Processing",
      (r) => (
        <AStatus s={r.status === "Up to date" ? "Active" : "Monitoring"} />
      ),
    ],
  ]);
  const tdone = (m: string) => {
    setFlow(null);
    setToast(m);
  };
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Dynamic Groups — rule-based membership"
        desc="Membership is computed from attribute rules — no manual members. Members are added/removed automatically as attributes change."
        searchPlaceholder="Search dynamic groups"
        commands={[
          {
            key: "new",
            label: "Create Dynamic Group",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateGroupFlow
                  collab={false}
                  onClose={() => setFlow(null)}
                  onCreate={(row) => {
                    setRows((rs) => [
                      {
                        ...row,
                        rule: "user.attribute = value",
                        status: "Evaluating",
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast("Dynamic group created");
                  }}
                />,
              ),
          },
          {
            key: "rev",
            label: "Launch Review",
            icon: <BadgeCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <LaunchReviewFlow
                  onClose={() => setFlow(null)}
                  onDone={() => tdone("Review launched")}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "dynamic-groups"),
          },
        ]}
        filterDefs={[
          { key: "workspace", label: "Workspace" },
          { key: "roles", label: "Role" },
          { key: "status", label: "Processing" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "Edit Rules", onClick: open },
                {
                  label: "Preview Members",
                  onClick: () => setToast(`${r.members} members match`),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.name)}
            title={r.name}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                Dynamic · {r.members} members ·{" "}
                <AStatus
                  s={r.status === "Up to date" ? "Active" : "Monitoring"}
                />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => setToast("Rules validated")}
                  >
                    Validate
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => setToast(`${r.members} members match`)}
                  >
                    Preview
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Name", v: r.name },
                      { k: "Type", v: "Dynamic" },
                      { k: "Members", v: r.members },
                      { k: "Workspace", v: r.workspace },
                      {
                        k: "Processing",
                        v: (
                          <AStatus
                            s={
                              r.status === "Up to date"
                                ? "Active"
                                : "Monitoring"
                            }
                          />
                        ),
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Rules",
                subs: [
                  {
                    label: "Rules",
                    content: (
                      <>
                        {tlb([
                          {
                            primary:
                              r.rule
                                .split(/[=]| in | startsWith /)[0]
                                ?.trim() ?? "attribute",
                            secondary:
                              r.rule.match(/(in|startsWith|=|contains)/)?.[0] ??
                              "equals",
                            right: r.rule.replace(/^[^=]*[=]?\s*/, ""),
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => setToast("Rules validated")}
                            >
                              Validate
                            </HeaderButton>
                            <HeaderButton
                              onClick={() =>
                                setToast(`${r.members} members match`)
                              }
                            >
                              Preview
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Rules saved")}
                            >
                              Save
                            </HeaderButton>
                          </ActRow>
                        )}
                        <SecHead2>Operators</SecHead2>
                        {tlb([
                          {
                            primary:
                              "Equals · Contains · Starts With · Ends With · In",
                            secondary: "supported operators",
                            right: "",
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Preview Members",
                subs: [
                  {
                    label: "Preview Members",
                    content: tlb([
                      {
                        primary: "rami@inferencedefense.com",
                        secondary: "matches rule",
                        right: "",
                      },
                      {
                        primary: "marc@sentinel-org.io",
                        secondary: "matches rule",
                        right: "",
                      },
                      {
                        primary: `+ ${Math.max(0, Number(r.members) - 2)} more`,
                        secondary: "read-only generated list",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Roles",
                subs: [
                  {
                    label: "Roles",
                    content: tlb([
                      {
                        primary: r.roles,
                        secondary: `Scope: ${r.workspace}`,
                        right: "Direct",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Resource Access",
                subs: [
                  {
                    label: "Resource Access",
                    content: tlb([
                      {
                        primary: "AWS Production",
                        secondary: "Read",
                        right: "Inherited",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Membership recomputed",
                        secondary: `${r.members} members`,
                        right: "06:00",
                      },
                      {
                        primary: "Rule updated",
                        secondary: r.rule,
                        right: "2026-05-12",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Dynamic group created",
                        secondary: "by rami",
                        right: "2025-02-11",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── Nested Groups collection ────────────────────────────────────────────────
function NestedGroupsCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      name: "Platform Team",
      children: "Security Engineers, Cloud Operators, SRE",
      effective: "64",
      depth: "1",
      roles: "Workspace Administrator",
      workspace: "Production",
      status: "Active",
    },
    {
      id: "1",
      name: "Inference Defense",
      children: "Security Operations",
      effective: "12",
      depth: "1",
      roles: "Auditor",
      workspace: "SOC",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["name", "Parent Group"],
    ["children", "Child Groups"],
    ["effective", "Effective Members"],
    ["depth", "Depth"],
    ["roles", "Roles"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Nested Groups — hierarchical authorization"
        desc="Parent → child group relationships and the effective (transitive) access they produce after inheritance."
        searchPlaceholder="Search nested groups"
        commands={[
          {
            key: "new",
            label: "Create Nesting",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Nest a group"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Nested ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "nested-groups"),
          },
        ]}
        filterDefs={[
          { key: "workspace", label: "Workspace" },
          { key: "depth", label: "Depth" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "View Hierarchy", onClick: open },
                {
                  label: "Remove Nesting",
                  danger: true,
                  onClick: () => setToast("Nesting removed"),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.name)}
            title={r.name}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                Nested · {r.effective} effective members · depth {r.depth}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() =>
                      setFlow(
                        <AssignFlow
                          title={`Nest a group under ${r.name}`}
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            setFlow(null);
                            setToast(`Nested ${s}`);
                          }}
                        />,
                      )
                    }
                  >
                    Add Child
                  </HeaderButton>
                  <HeaderButton onClick={() => setToast("Nesting removed")}>
                    Remove Nesting
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Name", v: r.name },
                      { k: "Child groups", v: r.children },
                      { k: "Effective members", v: r.effective },
                      { k: "Depth", v: r.depth },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Hierarchy",
                subs: [
                  {
                    label: "Hierarchy",
                    content: tlb([
                      {
                        primary: r.name,
                        secondary: "parent",
                        right: `depth 0`,
                      },
                      ...r.children.split(",").map((c) => ({
                        primary: `└─ ${c.trim()}`,
                        secondary: "child group",
                        right: `depth ${r.depth}`,
                      })),
                    ]),
                  },
                ],
              },
              {
                label: "Inherited Roles",
                subs: [
                  {
                    label: "Inherited Roles",
                    content: tlb([
                      {
                        primary: r.roles,
                        secondary: `from ${r.name}`,
                        right: "Inherited",
                      },
                      {
                        primary: "Auditor",
                        secondary: "from child Security Operations",
                        right: "Inherited",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Inherited Resources",
                subs: [
                  {
                    label: "Inherited Resources",
                    content: tlb([
                      {
                        primary: "AWS Production",
                        secondary: "via child Cloud Operators",
                        right: "Inherited",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Effective Access",
                subs: [
                  {
                    label: "Effective Access",
                    content: tlb([
                      {
                        primary: `${r.name} → child → role → permission → resource`,
                        secondary: "final access after inheritance",
                        right: "",
                      },
                      {
                        primary: "scans:run on AWS Production",
                        secondary:
                          "via Cloud Operators → Workspace Administrator",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Child group nested",
                        secondary: r.children.split(",")[0],
                        right: "2026-05-30",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Nesting created",
                        secondary: "by rami",
                        right: "2026-05-30",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── Roles ───────────────────────────────────────────────────────────────────
const ROLES_SUBS = ["System Roles", "Custom Roles", "Permission Catalog"];
function RolesArea() {
  const [sub, setSub] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={ROLES_SUBS} active={sub} onChange={setSub} />
      {sub === 0 && <RolesCollection custom={false} />}
      {sub === 1 && <RolesCollection custom />}
      {sub === 2 && <PermissionCatalog />}
    </div>
  );
}

// ── catalog constants ───────────────────────────────────────────────────────
const PERM_CATALOG: {
  perm: string;
  category: string;
  scope: string;
  risk: string;
}[] = [
  {
    perm: "users.read",
    category: "Identity",
    scope: "Organization",
    risk: "Low",
  },
  {
    perm: "users.write",
    category: "Identity",
    scope: "Workspace",
    risk: "Medium",
  },
  {
    perm: "role.assign",
    category: "Authorization",
    scope: "Workspace",
    risk: "High",
  },
  {
    perm: "workspace.manage",
    category: "Workspace",
    scope: "Workspace",
    risk: "High",
  },
  {
    perm: "findings.read",
    category: "Resource",
    scope: "All Workspaces",
    risk: "Low",
  },
  {
    perm: "remediation.execute",
    category: "Agent",
    scope: "AWS Production",
    risk: "Critical",
  },
  {
    perm: "billing.read",
    category: "Billing",
    scope: "Organization",
    risk: "Low",
  },
  {
    perm: "audit.read",
    category: "Compliance",
    scope: "Organization",
    risk: "Medium",
  },
  {
    perm: "keys.rotate",
    category: "Administration",
    scope: "Organization",
    risk: "Critical",
  },
];
const AGENT_CAPS = [
  "Observe",
  "Investigate",
  "Recommend",
  "Approve",
  "Execute",
  "Administer",
];
const RESOURCE_OPTS = [
  "AWS Production (Read)",
  "AWS Production (Admin)",
  "Azure Platform (Admin)",
  "GCP Project (Read)",
  "Kubernetes Cluster (Read)",
  "Vault (Read)",
  "Database (Read)",
];
const SYS_ROLE_NAMES = [
  "Platform Administrator",
  "Security Administrator",
  "Workspace Administrator",
  "Security Engineer",
  "Operator",
  "Auditor",
  "Approver",
  "Read Only",
];

// ── role flows ──────────────────────────────────────────────────────────────
const ROLE_STEPS = [
  "Basics",
  "Permissions",
  "Agent permissions",
  "Resource scope",
  "Approval",
  "Review",
];
function CreateRoleWizard({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (row: ARow) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState({
    name: "",
    desc: "",
    owner: "",
    perms: ["users.read", "findings.read"] as string[],
    caps: ["Observe", "Investigate"] as string[],
    resource: "AWS Production (Read)",
    approval: true,
    review: "Quarterly",
    cert: true,
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const togg = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  const err = !f.name.trim();
  const last = step === ROLE_STEPS.length - 1;
  return (
    <WizardShell
      title="Create custom role"
      steps={ROLE_STEPS}
      step={step}
      setStep={setStep}
      stepError={(i) => (i === 0 ? err : false)}
      showErrors={last}
      canFinish={!err}
      finishLabel="Create & publish"
      onFinish={() => {
        if (err) {
          setStep(0);
          return;
        }
        onCreate({
          id: `r${Date.now()}`,
          name: f.name.trim(),
          type: "Custom",
          tier: "T2",
          perms: String(f.perms.length),
          assigned: "0",
          created: new Date().toISOString().slice(0, 10),
          status: "Active",
          owner: f.owner || "you",
          approval: f.approval ? "Yes" : "No",
          privileged:
            f.caps.includes("Execute") || f.caps.includes("Administer")
              ? "Yes"
              : "No",
          review: f.review,
          cert: f.cert ? "Yes" : "No",
          version: "v1",
        });
      }}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Define the role</H>
          <P>Name the role and assign an owner.</P>
          <Req label="Name" err={err}>
            <input
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              style={errInp(err)}
              placeholder="e.g. Findings Triage"
            />
          </Req>
          <Field label="Description">
            <textarea
              value={f.desc}
              onChange={(e) => set({ desc: e.target.value })}
              rows={3}
              style={{
                ...inp,
                height: "auto",
                padding: 11,
                resize: "vertical",
              }}
            />
          </Field>
          <Field label="Owner">
            <input
              value={f.owner}
              onChange={(e) => set({ owner: e.target.value })}
              style={inp}
              placeholder="owner@company.com"
            />
          </Field>
        </>
      )}
      {step === 1 && (
        <>
          <H>Platform permissions</H>
          <P>
            Select the platform actions this role allows. {f.perms.length}{" "}
            selected.
          </P>
          {PERM_CATALOG.map((p) => (
            <Chk
              key={p.perm}
              label={`${p.perm} — ${p.category} · ${p.risk}`}
              on={f.perms.includes(p.perm)}
              onChange={() => set({ perms: togg(f.perms, p.perm) })}
            />
          ))}
        </>
      )}
      {step === 2 && (
        <>
          <H>Agent permissions</H>
          <P>
            What agents may do on behalf of this role. {f.caps.length}{" "}
            capabilities.
          </P>
          {AGENT_CAPS.map((c) => (
            <Chk
              key={c}
              label={c}
              on={f.caps.includes(c)}
              onChange={() => set({ caps: togg(f.caps, c) })}
            />
          ))}
        </>
      )}
      {step === 3 && (
        <>
          <H>Resource scope</H>
          <P>Cloud infrastructure this role can access.</P>
          <Field label="Grant resource access">
            <Sel
              value={f.resource}
              onChange={(v) => set({ resource: v })}
              opts={RESOURCE_OPTS}
            />
          </Field>
        </>
      )}
      {step === 4 && (
        <>
          <H>Approval requirements</H>
          <P>Governance controls for this role.</P>
          <Chk
            label="Requires approval to assign"
            on={f.approval}
            onChange={(v) => set({ approval: v })}
          />
          <Field label="Review frequency">
            <Sel
              value={f.review}
              onChange={(v) => set({ review: v })}
              opts={["Monthly", "Quarterly", "Semi-annual", "Annual"]}
            />
          </Field>
          <Chk
            label="Certification required"
            on={f.cert}
            onChange={(v) => set({ cert: v })}
          />
        </>
      )}
      {step === 5 && (
        <>
          <H>Review and publish</H>
          <P>Review the role before publishing.</P>
          <ReviewSec
            title="Basics"
            onEdit={() => setStep(0)}
            errors={err ? ["Please name the role."] : []}
          >
            <KV k="Name" v={f.name || "—"} />
            <KV k="Owner" v={f.owner || "you"} />
          </ReviewSec>
          <ReviewSec title="Access" onEdit={() => setStep(1)}>
            <KV k="Permissions" v={String(f.perms.length)} />
            <KV k="Agent capabilities" v={f.caps.join(", ") || "—"} />
            <KV k="Resource" v={f.resource} />
          </ReviewSec>
          <ReviewSec title="Governance" onEdit={() => setStep(4)}>
            <KV k="Requires approval" v={f.approval ? "Yes" : "No"} />
            <KV k="Review" v={f.review} />
            <KV k="Certification" v={f.cert ? "Yes" : "No"} />
          </ReviewSec>
        </>
      )}
    </WizardShell>
  );
}
function CompareRolesFlow({
  roles,
  onClose,
}: {
  roles: ARow[];
  onClose: () => void;
}) {
  const [sel, setSel] = React.useState<string[]>(
    roles.slice(0, 2).map((r) => r.id),
  );
  const togg = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const picked = roles.filter((r) => sel.includes(r.id));
  const dims: [string, (r: ARow) => string][] = [
    ["Tier", (r) => r.tier],
    ["Permissions", (r) => r.perms],
    ["Assigned", (r) => r.assigned],
    ["Privileged", (r) => r.privileged],
    ["Requires approval", (r) => r.approval],
    [
      "Agent permissions",
      (r) =>
        r.privileged === "Yes" ? "Execute, Administer" : "Observe, Investigate",
    ],
    [
      "Approval rights",
      (r) =>
        r.name.includes("Approver") || r.approval === "Yes" ? "Yes" : "No",
    ],
    ["Status", (r) => r.status],
  ];
  return (
    <Drawer
      title="Compare roles"
      subtitle="Select roles to compare across capabilities, permissions, resources and approval rights."
      width={760}
      onClose={onClose}
      footer={
        <HeaderButton variant="primary" onClick={onClose}>
          Done
        </HeaderButton>
      }
    >
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}
      >
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => togg(r.id)}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              border: `1px solid ${sel.includes(r.id) ? T.accent : T.border}`,
              background: sel.includes(r.id)
                ? "var(--cg-accent-bg)"
                : "transparent",
              color: sel.includes(r.id) ? T.accent : T.textMuted,
            }}
          >
            {r.name}
          </button>
        ))}
      </div>
      {picked.length < 2 ? (
        <EmptyState
          icon={<Scale size={20} />}
          title="Select at least two roles"
          hint="Pick two or more roles above to see a side-by-side comparison."
        />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr>
                <th style={cmpTh}>Dimension</th>
                {picked.map((r) => (
                  <th key={r.id} style={cmpTh}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dims.map(([label, f]) => (
                <tr key={label}>
                  <td style={{ ...cmpTd, color: T.textMuted, fontWeight: 500 }}>
                    {label}
                  </td>
                  {picked.map((r) => (
                    <td key={r.id} style={cmpTd}>
                      {f(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Drawer>
  );
}
const cmpTh: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: `1px solid ${T.borderStrong}`,
  color: T.textPrimary,
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const cmpTd: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: `1px solid ${T.border}`,
  color: T.textPrimary,
  whiteSpace: "nowrap",
};
function AddPermissionFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (p: string) => void;
}) {
  const [perm, setPerm] = React.useState(PERM_CATALOG[0].perm);
  const [scope, setScope] = React.useState("Organization");
  return (
    <Drawer
      title="Add permission"
      subtitle="Grant a platform permission to this role."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" onClick={() => onDone(perm)}>
            Add permission
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Permission">
        <Sel
          value={perm}
          onChange={setPerm}
          opts={PERM_CATALOG.map((p) => p.perm)}
        />
      </Field>
      <Field label="Scope">
        <Sel
          value={scope}
          onChange={setScope}
          opts={["Organization", "Workspace", "All Workspaces"]}
        />
      </Field>
    </Drawer>
  );
}
function CreateSodRuleFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (n: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("Blocked");
  const [enf, setEnf] = React.useState("Hard");
  const err = !name.trim();
  return (
    <Drawer
      title="Create separation-of-duties rule"
      subtitle="Prevent a dangerous combination of capabilities."
      width={540}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() => onDone(name.trim())}
          >
            Create rule
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Rule" err={err}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={errInp(err)}
          placeholder="e.g. Approve + Execute Remediation"
        />
      </Req>
      <Field label="Type">
        <Sel
          value={type}
          onChange={setType}
          opts={["Blocked", "Warning", "Audit-only"]}
        />
      </Field>
      <Field label="Enforcement">
        <Sel value={enf} onChange={setEnf} opts={["Hard", "Soft"]} />
      </Field>
    </Drawer>
  );
}

// ── shared role drawer ──────────────────────────────────────────────────────
function RoleDrawer({
  r,
  custom,
  canEdit,
  allRoles,
  setFlow,
  setToast,
  close,
}: {
  r: ARow;
  custom: boolean;
  canEdit: boolean;
  allRoles: ARow[];
  setFlow: (n: React.ReactNode) => void;
  setToast: (s: string) => void;
  close: () => void;
}) {
  const t = (m: string) => {
    setFlow(null);
    setToast(m);
  };
  return (
    <AuthEntityDrawer
      initials={initials2(r.name)}
      title={r.name}
      meta={
        <span
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12.5,
            color: T.textMuted,
          }}
        >
          {r.type} · {r.tier} · <AStatus s={r.status} /> · {r.assigned} assigned
          {custom ? ` · ${r.version}` : ""}
        </span>
      }
      actions={
        canEdit ? (
          <>
            <HeaderButton
              onClick={() =>
                setToast(
                  custom ? "Editing role" : "System role — clone to edit",
                )
              }
            >
              Edit
            </HeaderButton>
            <HeaderButton onClick={() => setToast(`Cloned ${r.name}`)}>
              Clone
            </HeaderButton>
            <HeaderButton
              onClick={() =>
                setFlow(
                  <CompareRolesFlow
                    roles={allRoles}
                    onClose={() => setFlow(null)}
                  />,
                )
              }
            >
              Compare
            </HeaderButton>
            <HeaderButton onClick={() => authCsv([r], `role-${r.name}`)}>
              Export
            </HeaderButton>
            {custom && (
              <>
                <HeaderButton onClick={() => setToast("New version drafted")}>
                  Version
                </HeaderButton>
                <HeaderButton onClick={() => setToast("Published")}>
                  Publish
                </HeaderButton>
                <HeaderButton onClick={() => setToast("Rolled back")}>
                  Rollback
                </HeaderButton>
              </>
            )}
          </>
        ) : undefined
      }
      sections={[
        {
          label: "Overview",
          subs: [
            {
              label: "General",
              content: kvb([
                { k: "Name", v: r.name },
                {
                  k: "Description",
                  v: custom
                    ? "Customer-defined role"
                    : "Vendor-managed system role",
                },
                { k: "Type", v: r.type },
                { k: "Tier", v: r.tier },
                { k: "Status", v: <AStatus s={r.status} /> },
                { k: "Owner", v: r.owner },
                { k: "Created", v: r.created },
                { k: "Modified", v: "2026-05-30" },
              ]),
            },
            {
              label: "Assignment Statistics",
              content: kvb([
                { k: "Users", v: r.assigned },
                { k: "Groups", v: "3" },
                { k: "Service Identities", v: "2" },
                { k: "Workspaces", v: "4" },
                { k: "Resources", v: "6" },
              ]),
            },
            {
              label: "Governance",
              content: kvb([
                {
                  k: "Requires approval",
                  v: (
                    <AStatus
                      s={r.approval === "Yes" ? "Enabled" : "Disabled"}
                    />
                  ),
                },
                {
                  k: "Privileged",
                  v: (
                    <AStatus
                      s={r.privileged === "Yes" ? "danger" : "Disabled"}
                    />
                  ),
                },
                { k: "Review frequency", v: r.review },
                { k: "Certification required", v: r.cert },
              ]),
            },
          ],
        },
        {
          label: "Permissions",
          subs: [
            {
              label: "Permissions",
              content: (
                <>
                  {tlb([
                    {
                      primary: "users.read",
                      secondary: "Identity · Organization",
                      right: <AStatus s="Low" />,
                    },
                    {
                      primary: "role.assign",
                      secondary: "Authorization · Workspace",
                      right: <AStatus s="High" />,
                    },
                    {
                      primary: "findings.read",
                      secondary: "Resource · All Workspaces",
                      right: <AStatus s="Low" />,
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <AddPermissionFlow
                              onClose={() => setFlow(null)}
                              onDone={(p) => t(`Permission ${p} added`)}
                            />,
                          )
                        }
                      >
                        Add Permission
                      </HeaderButton>
                      <HeaderButton
                        onClick={() => setToast("Permission removed")}
                      >
                        Remove Permission
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Imported")}>
                        Import
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Exported")}>
                        Export
                      </HeaderButton>
                    </ActRow>
                  )}
                  <SecHead2>Effective permission</SecHead2>
                  {tlb([
                    {
                      primary: `${r.name} → role.assign → Workspace`,
                      secondary: "role → permission → scope",
                      right: "",
                    },
                  ])}
                </>
              ),
            },
          ],
        },
        {
          label: "Agent Permissions",
          subs: [
            {
              label: "Agent Permissions",
              content: (
                <>
                  <InfoBanner icon={<Scale size={15} />}>
                    Agent capability <strong>enforcement</strong> lives in{" "}
                    <strong>Runtime Governance</strong>, the security control
                    plane. This role only declares the{" "}
                    <strong>bounded scope</strong> of agent capabilities its
                    holders may delegate or trigger — the policy decision and
                    execution are enforced there. Single source of truth.
                  </InfoBanner>
                  <SecHead2>
                    Delegated capability scope (granted by this role)
                  </SecHead2>
                  {tlb([
                    {
                      primary: "Cloud Remediation Agent",
                      secondary:
                        "Execute Remediation · AWS Production · approval required",
                      right: <AStatus s="Critical" />,
                    },
                    {
                      primary: "Investigation Agent",
                      secondary: "Read Findings · All Workspaces",
                      right: <AStatus s="Low" />,
                    },
                  ])}
                  <SecHead2>Agent access path</SecHead2>
                  {tlb([
                    {
                      primary:
                        "User → Role → (delegated scope) → Runtime Governance → Cloud Resource",
                      secondary:
                        "scope defined here · enforced in Runtime Governance",
                      right: "",
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setToast(
                            "Opening Runtime Governance → Agent Authorization",
                          )
                        }
                      >
                        Manage in Runtime Governance
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Scope exported")}>
                        Export Scope
                      </HeaderButton>
                    </ActRow>
                  )}
                </>
              ),
            },
          ],
        },
        {
          label: "Resource Access",
          subs: [
            {
              label: "Resource Access",
              content: (
                <>
                  {tlb([
                    {
                      primary: "AWS Production",
                      secondary: "Cloud Account · Payments · Read",
                      right: "Direct",
                    },
                    {
                      primary: "Azure Platform",
                      secondary: "Subscription · Platform · Admin",
                      right: "Inherited",
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <GrantAccessFlow
                              onClose={() => setFlow(null)}
                              onDone={(s) => t(`Granted ${s}`)}
                            />,
                          )
                        }
                      >
                        Grant Access
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Access revoked")}>
                        Revoke Access
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Exported")}>
                        Export
                      </HeaderButton>
                    </ActRow>
                  )}
                  <SecHead2>Effective access</SecHead2>
                  {tlb([
                    {
                      primary: `${r.name} → findings.read → AWS Production`,
                      secondary: "role → permission → resource",
                      right: "",
                    },
                  ])}
                </>
              ),
            },
          ],
        },
        {
          label: "Assignments",
          subs: [
            {
              label: "Users",
              content: (
                <>
                  {tlb([
                    {
                      primary: "rami@inferencedefense.com",
                      secondary: "Engineering · Production · by ciso",
                      right: "2026-03-04",
                    },
                    {
                      primary: "marc@sentinel-org.io",
                      secondary: "Security · SOC · by rami",
                      right: "2026-04-10",
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <AssignFlow
                              title={`Assign ${r.name} to user`}
                              onClose={() => setFlow(null)}
                              onDone={(s) => t(`Assigned to ${s}`)}
                            />,
                          )
                        }
                      >
                        Assign
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Removed")}>
                        Remove
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Exported")}>
                        Export
                      </HeaderButton>
                    </ActRow>
                  )}
                  <SecHead2>Assignment path</SecHead2>
                  {tlb([
                    {
                      primary: `${r.name} → assignment → rami@inferencedefense.com`,
                      secondary: "role → assignment → identity",
                      right: "",
                    },
                  ])}
                </>
              ),
            },
            {
              label: "Groups",
              content: (
                <>
                  {tlb([
                    {
                      primary: "Security Engineers",
                      secondary: "Production · 42 members · by platform",
                      right: "2026-02-01",
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <AssignFlow
                              title={`Assign ${r.name} to group`}
                              onClose={() => setFlow(null)}
                              onDone={(s) => t(`Assigned to ${s}`)}
                            />,
                          )
                        }
                      >
                        Assign
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Removed")}>
                        Remove
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Exported")}>
                        Export
                      </HeaderButton>
                    </ActRow>
                  )}
                </>
              ),
            },
            {
              label: "Service Identities",
              content: (
                <>
                  {tlb([
                    {
                      primary: "ci-deploy",
                      secondary: "Service Account · Production · by rami",
                      right: "2026-01-20",
                    },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setFlow(
                            <AssignFlow
                              title={`Assign ${r.name} to service identity`}
                              onClose={() => setFlow(null)}
                              onDone={(s) => t(`Assigned to ${s}`)}
                            />,
                          )
                        }
                      >
                        Assign
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Removed")}>
                        Remove
                      </HeaderButton>
                      <HeaderButton onClick={() => setToast("Exported")}>
                        Export
                      </HeaderButton>
                    </ActRow>
                  )}
                </>
              ),
            },
          ],
        },
        {
          label: "Separation of Duties",
          subs: [
            {
              label: "Separation of Duties",
              content: (
                <>
                  <InfoBanner icon={<Scale size={15} />}>
                    Separation-of-duties rules are defined and enforced once in{" "}
                    <strong>
                      Reviews &amp; Certifications → Segregation of Duties
                    </strong>
                    . This panel shows the rules that apply to this role and any
                    conflicts they produce — manage the rules there to keep a
                    single source of truth.
                  </InfoBanner>
                  <SecHead2>Applicable rules</SecHead2>
                  {tlb([
                    {
                      primary: "Approve + Execute Remediation",
                      secondary: "SOD-001 · Blocked · Hard enforcement",
                      right: <AStatus s="Blocked" />,
                    },
                    {
                      primary: "Role Management + Audit",
                      secondary: "SOD-007 · Blocked · Hard enforcement",
                      right: <AStatus s="Blocked" />,
                    },
                  ])}
                  <SecHead2>Conflict analysis</SecHead2>
                  {kvb([
                    {
                      k: "Current violations",
                      v: <StatusIndicator tone="ok">0</StatusIndicator>,
                    },
                    {
                      k: "Potential violations",
                      v: <StatusIndicator tone="warn">2</StatusIndicator>,
                    },
                    { k: "Affected users", v: "0" },
                    { k: "Affected groups", v: "0" },
                  ])}
                  {canEdit && (
                    <ActRow>
                      <HeaderButton
                        variant="primary"
                        onClick={() =>
                          setToast(
                            "Opening Reviews & Certifications → Segregation of Duties",
                          )
                        }
                      >
                        Manage Rules in Reviews → SoD
                      </HeaderButton>
                    </ActRow>
                  )}
                </>
              ),
            },
          ],
        },
        {
          label: "Activity",
          subs: [
            {
              label: "Activity",
              content: tlb([
                {
                  primary: "Permission added",
                  secondary: "role.assign",
                  right: "2026-05-30",
                },
                {
                  primary: "Assignment created",
                  secondary: "marc@sentinel-org.io",
                  right: "2026-04-10",
                },
                {
                  primary: "Resource granted",
                  secondary: "AWS Production",
                  right: "2026-02-11",
                },
                {
                  primary: "Role created",
                  secondary: `by ${r.owner}`,
                  right: r.created,
                },
              ]),
            },
          ],
        },
        {
          label: "Audit History",
          subs: [
            {
              label: "Audit",
              content: tlb([
                {
                  primary: "Role created",
                  secondary: `by ${r.owner}`,
                  right: r.created,
                },
                {
                  primary: "Permission added",
                  secondary: "role.assign",
                  right: "2026-05-30",
                },
                {
                  primary: "Agent permission granted",
                  secondary: "Execute → Cloud Remediation Agent",
                  right: "2026-05-31",
                },
                {
                  primary: "Assignment added",
                  secondary: "marc@sentinel-org.io",
                  right: "2026-04-10",
                },
              ]),
            },
          ],
        },
      ]}
      onClose={close}
    />
  );
}

// ── System / Custom Roles collection ────────────────────────────────────────
function RolesCollection({ custom }: { custom: boolean }) {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = custom
    ? [
        {
          id: "0",
          name: "Findings Triage",
          type: "Custom",
          tier: "T2",
          perms: "12",
          assigned: "9",
          created: "2026-06-12",
          status: "Active",
          owner: "soc-lead@inferencedefense.com",
          approval: "No",
          privileged: "No",
          review: "Quarterly",
          cert: "No",
          version: "v3",
        },
        {
          id: "1",
          name: "Evidence Exporter",
          type: "Custom",
          tier: "T1",
          perms: "4",
          assigned: "4",
          created: "2026-05-29",
          status: "Active",
          owner: "compliance@inferencedefense.com",
          approval: "No",
          privileged: "No",
          review: "Annual",
          cert: "Yes",
          version: "v1",
        },
        {
          id: "2",
          name: "Break-glass Operator",
          type: "Custom",
          tier: "T4",
          perms: "61",
          assigned: "2",
          created: "2026-03-02",
          status: "Disabled",
          owner: "ciso@inferencedefense.com",
          approval: "Yes",
          privileged: "Yes",
          review: "Monthly",
          cert: "Yes",
          version: "v2",
        },
      ]
    : SYS_ROLE_NAMES.map((n, i) => ({
        id: String(i),
        name: n,
        type: "System",
        tier: ["T4", "T4", "T3", "T2", "T2", "T1", "T2", "T1"][i],
        perms: ["210", "188", "142", "148", "96", "44", "38", "22"][i],
        assigned: ["3", "5", "11", "42", "27", "5", "7", "120"][i],
        created: "2026-01-10",
        status: "Active",
        owner: "CloudGuard",
        approval: i < 3 ? "Yes" : "No",
        privileged: i < 5 ? "Yes" : "No",
        review: i < 3 ? "Monthly" : "Quarterly",
        cert: i < 3 ? "Yes" : "No",
        version: "v1",
      }));
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const clone = (r: ARow) =>
    setRows((rs) => [
      {
        ...r,
        id: `r${Date.now()}`,
        name: `${r.name} (copy)`,
        type: "Custom",
        owner: "you",
        version: "v1",
      },
      ...rs,
    ]);
  const cols = aCols([
    ["name", "Role"],
    ["type", "Type"],
    ["tier", "Tier"],
    ["perms", "Permissions"],
    ["assigned", "Assigned"],
    ["created", "Created"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title={
          custom ? "Custom Roles" : "Enterprise Roles — Least Privilege Matrix"
        }
        desc={
          custom
            ? "Customer-defined roles composed from the permission catalog. Versioned, publishable and rollback-capable."
            : "Authoritative role → capability mapping enforced by the authorization engine. Vendor-managed system roles cannot be deleted, but may be cloned."
        }
        searchPlaceholder="Search roles"
        commands={[
          ...(custom
            ? [
                {
                  key: "new",
                  label: "Create Custom Role",
                  icon: <Plus size={15} />,
                  disabled: !canEdit,
                  onClick: () =>
                    setFlow(
                      <CreateRoleWizard
                        onClose={() => setFlow(null)}
                        onCreate={(row) => {
                          setRows((rs) => [row, ...rs]);
                          setFlow(null);
                          setToast("Role created & published");
                        }}
                      />,
                    ),
                },
              ]
            : []),
          {
            key: "clone",
            label: "Clone Role",
            icon: <Columns3 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Clone role"
                  subtitle="Choose a role to clone into an editable custom role."
                  items={rows.map((r) => ({
                    id: r.id,
                    label: r.name,
                    sub: `${r.type} · ${r.tier}`,
                  }))}
                  actionLabel="Clone"
                  onApply={(id) => {
                    const s = rows.find((x) => x.id === id);
                    if (s) clone(s);
                    setFlow(null);
                    setToast("Role cloned");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "cmp",
            label: "Compare Roles",
            icon: <Scale size={15} />,
            onClick: () =>
              setFlow(
                <CompareRolesFlow roles={rows} onClose={() => setFlow(null)} />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () =>
              authCsv(rows, custom ? "custom-roles" : "system-roles"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "type", label: "Role Type" },
          { key: "status", label: "Status" },
          { key: "tier", label: "Tier" },
          { key: "owner", label: "Owner" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      authCsv(
                        rows.filter((r) => ids.includes(r.id)),
                        "roles",
                      );
                      clear();
                    }}
                  >
                    Export
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setFlow(
                        <CompareRolesFlow
                          roles={rows.filter((r) => ids.includes(r.id))}
                          onClose={() => setFlow(null)}
                        />,
                      );
                      clear();
                    }}
                  >
                    Compare
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setRows((rs) =>
                        rs.map((r) =>
                          ids.includes(r.id) ? { ...r, status: "Disabled" } : r,
                        ),
                      );
                      clear();
                    }}
                  >
                    Disable
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => {
                        const s = rows.find((x) => x.id === id);
                        if (s) clone(s);
                      });
                      clear();
                    }}
                  >
                    Clone
                  </HeaderButton>
                  {custom && (
                    <ConfirmButton
                      variant="danger"
                      label={`Delete (${ids.length})`}
                      title="Delete roles"
                      body="Delete the selected custom roles? Assignments will be removed."
                      confirmLabel="Delete"
                      onConfirm={() => {
                        setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
                        clear();
                      }}
                    />
                  )}
                </>
              )
            : undefined
        }
        rowMenu={(r, open) => {
          const base = [
            { label: "View", onClick: open },
            { label: "Clone", onClick: () => clone(r) },
            {
              label: "Compare",
              onClick: () =>
                setFlow(
                  <CompareRolesFlow
                    roles={rows}
                    onClose={() => setFlow(null)}
                  />,
                ),
            },
            { label: "Export", onClick: () => authCsv([r], `role-${r.name}`) },
          ];
          if (!canEdit) return [{ label: "View", onClick: open }];
          base.push({
            label: r.status === "Disabled" ? "Enable" : "Disable",
            onClick: () =>
              setRows((rs) =>
                rs.map((x) =>
                  x.id === r.id
                    ? {
                        ...x,
                        status: x.status === "Disabled" ? "Active" : "Disabled",
                      }
                    : x,
                ),
              ),
          });
          if (r.type === "Custom")
            base.push({
              label: "Delete",
              danger: true,
              onClick: () => setRows((rs) => rs.filter((x) => x.id !== r.id)),
            } as { label: string; onClick: () => void; danger?: boolean });
          return base;
        }}
        drawer={(r, close) => (
          <RoleDrawer
            r={r}
            custom={r.type === "Custom"}
            canEdit={canEdit}
            allRoles={rows}
            setFlow={setFlow}
            setToast={setToast}
            close={close}
          />
        )}
      />
    </>
  );
}

// ── Permission Catalog ──────────────────────────────────────────────────────
function PermissionCatalog() {
  const SEED: ARow[] = PERM_CATALOG.map((p, i) => ({
    id: String(i),
    perm: p.perm,
    category: p.category,
    scope: p.scope,
    risk: p.risk,
    desc: `Allows ${p.perm.replace(".", " ")} within ${p.scope}.`,
    rolesUsing: ["6", "4", "3", "2", "8", "2", "5", "4", "2"][i] ?? "1",
  }));
  const [rows] = React.useState<ARow[]>(SEED);
  const cols = aCols([
    ["perm", "Permission"],
    ["category", "Category"],
    ["desc", "Description"],
    ["risk", "Risk", (r) => <AStatus s={r.risk} />],
    ["rolesUsing", "Roles Using"],
  ]);
  return (
    <AuthCollection
      title="Permission Catalog"
      desc="Master catalog of every permission available in the platform — the building blocks for custom roles."
      searchPlaceholder="Search permissions"
      commands={[
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "permission-catalog"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {},
        },
      ]}
      filterDefs={[
        { key: "category", label: "Category" },
        { key: "risk", label: "Risk" },
        { key: "scope", label: "Scope" },
      ]}
      columns={cols}
      rows={rows}
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.perm)}
          title={r.perm}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.category} · {r.scope} · <AStatus s={r.risk} />
            </span>
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Permission", v: r.perm },
                    { k: "Category", v: r.category },
                    { k: "Description", v: r.desc },
                    { k: "Scope", v: r.scope },
                    { k: "Risk", v: <AStatus s={r.risk} /> },
                    { k: "Roles using", v: r.rolesUsing },
                  ]),
                },
              ],
            },
            {
              label: "Roles Using Permission",
              subs: [
                {
                  label: "Roles Using Permission",
                  content: tlb([
                    {
                      primary: "Security Engineer",
                      secondary: "System · T2",
                      right: "Direct",
                    },
                    {
                      primary: "Findings Triage",
                      secondary: "Custom · T2",
                      right: "Direct",
                    },
                    {
                      primary: `+ ${Math.max(0, Number(r.rolesUsing) - 2)} more`,
                      secondary: "",
                      right: "",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Agent Capabilities",
              subs: [
                {
                  label: "Agent Capabilities",
                  content: tlb([
                    {
                      primary:
                        r.category === "Agent"
                          ? "Execute Remediation"
                          : "Read Findings",
                      secondary:
                        r.category === "Agent"
                          ? "Cloud Remediation Agent"
                          : "Investigation Agent",
                      right: <AStatus s={r.risk} />,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Resources Impacted",
              subs: [
                {
                  label: "Resources Impacted",
                  content: tlb([
                    {
                      primary: "AWS Production",
                      secondary: "Cloud Account",
                      right: r.scope,
                    },
                    {
                      primary: "Azure Platform",
                      secondary: "Subscription",
                      right: r.scope,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Permission published to catalog",
                      secondary: "platform release 2.4",
                      right: "2026-01-10",
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── Assignments ─────────────────────────────────────────────────────────────
const ASSIGN_SUBS = [
  "User Assignments",
  "Group Assignments",
  "Scoped Assignments",
  "Delegated Assignments",
];
function AssignmentsArea() {
  const [sub, setSub] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={ASSIGN_SUBS} active={sub} onChange={setSub} />
      {sub === 0 && <UserAssignments />}
      {sub === 1 && <GroupAssignments />}
      {sub === 2 && <ScopedAssignments />}
      {sub === 3 && <DelegatedAssignments />}
      <ResolverPanel />
    </div>
  );
}

// ── assignment wizard ───────────────────────────────────────────────────────
const ASG_STEPS = [
  "Principal",
  "Role",
  "Scope",
  "Assignment type",
  "Approval",
  "Review",
  "Assign",
];
type AsgData = {
  ptype: string;
  principal: string;
  role: string;
  scope: string;
  atype: string;
  expires: string;
  approvers: string;
  justification: string;
  ticket: string;
  risk: string;
};
function AssignmentWizard({
  fixedPtype,
  onClose,
  onCreate,
}: {
  fixedPtype?: string;
  onClose: () => void;
  onCreate: (d: AsgData) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<AsgData>({
    ptype: fixedPtype ?? "User",
    principal: "",
    role: "Viewer",
    scope: "Organization",
    atype: "Direct",
    expires: "",
    approvers: "ciso@inferencedefense.com",
    justification: "",
    ticket: "",
    risk: "Low",
  });
  const set = (p: Partial<AsgData>) => setF({ ...f, ...p });
  const e0 = !f.principal.trim();
  const needApproval =
    f.atype === "Privileged" || f.role.includes("Administrator");
  const e4 = needApproval && !f.justification.trim();
  const last = step === ASG_STEPS.length - 1;
  return (
    <WizardShell
      title="Assign role"
      steps={ASG_STEPS}
      step={step}
      setStep={setStep}
      stepError={(i) => (i === 0 ? e0 : i === 4 ? e4 : false)}
      showErrors={last}
      canFinish={!e0 && !e4}
      finishLabel="Assign role"
      onFinish={() => {
        if (e0) {
          setStep(0);
          return;
        }
        if (e4) {
          setStep(4);
          return;
        }
        onCreate(f);
      }}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Select principal</H>
          <P>Choose who receives the role.</P>
          <Field label="Principal type">
            <Sel
              value={f.ptype}
              onChange={(v) => set({ ptype: v })}
              opts={["User", "Group", "Service Identity"]}
            />
          </Field>
          <Req label={f.ptype} err={e0}>
            <input
              value={f.principal}
              onChange={(e) => set({ principal: e.target.value })}
              style={errInp(e0)}
              placeholder={
                f.ptype === "User"
                  ? "user@company.com"
                  : f.ptype === "Group"
                    ? "Security Engineers"
                    : "ci-deploy"
              }
            />
          </Req>
        </>
      )}
      {step === 1 && (
        <>
          <H>Select role</H>
          <P>Search the role catalog and pick the role to grant.</P>
          <Field label="Role">
            <Sel
              value={f.role}
              onChange={(v) => set({ role: v })}
              opts={ROLE_OPTS}
            />
          </Field>
          <div style={{ fontSize: 12, color: T.textMuted }}>
            {f.role.includes("Administrator")
              ? "High-privilege role — approval required."
              : "Standard role."}
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <H>Select scope</H>
          <P>Where the role applies.</P>
          <Field label="Scope">
            <Sel
              value={f.scope}
              onChange={(v) => set({ scope: v })}
              opts={[
                "Organization",
                "Workspace: Payments",
                "Workspace: SOC",
                "AWS Production Account",
                "Resource Group: platform",
                "Azure Subscription",
                "Kubernetes Cluster",
              ]}
            />
          </Field>
        </>
      )}
      {step === 3 && (
        <>
          <H>Assignment type</H>
          <P>How the role is granted.</P>
          <Field label="Type">
            <Sel
              value={f.atype}
              onChange={(v) =>
                set({
                  atype: v,
                  risk:
                    v === "Privileged"
                      ? "High"
                      : v === "Temporary"
                        ? "Medium"
                        : "Low",
                })
              }
              opts={["Direct", "Temporary", "Delegated", "Privileged"]}
            />
          </Field>
          {(f.atype === "Temporary" || f.atype === "Privileged") && (
            <Field label="Expiration">
              <input
                type="date"
                value={f.expires}
                onChange={(e) => set({ expires: e.target.value })}
                style={inp}
              />
            </Field>
          )}
        </>
      )}
      {step === 4 && (
        <>
          <H>Approval</H>
          <P>
            {needApproval
              ? "This assignment requires approval."
              : "Optional approval metadata."}
          </P>
          {needApproval && (
            <Field label="Approvers">
              <Sel
                value={f.approvers}
                onChange={(v) => set({ approvers: v })}
                opts={[
                  "ciso@inferencedefense.com",
                  "platform@inferencedefense.com",
                  "compliance@inferencedefense.com",
                ]}
              />
            </Field>
          )}
          <Req label="Business justification" err={e4}>
            <textarea
              value={f.justification}
              onChange={(e) => set({ justification: e.target.value })}
              rows={3}
              style={{
                ...errInp(e4),
                height: "auto",
                padding: 11,
                resize: "vertical",
              }}
              placeholder="Why is this access needed?"
            />
          </Req>
          <Field label="Ticket reference">
            <input
              value={f.ticket}
              onChange={(e) => set({ ticket: e.target.value })}
              style={inp}
              placeholder="e.g. JIRA-1042"
            />
          </Field>
        </>
      )}
      {step === 5 && (
        <>
          <H>Review</H>
          <P>Confirm the assignment before creating it.</P>
          <ReviewSec
            title="Principal & role"
            onEdit={() => setStep(0)}
            errors={e0 ? ["Please name the principal."] : []}
          >
            <KV k="Principal" v={f.principal || "—"} />
            <KV k="Type" v={f.ptype} />
            <KV k="Role" v={f.role} />
          </ReviewSec>
          <ReviewSec title="Scope & type" onEdit={() => setStep(2)}>
            <KV k="Scope" v={f.scope} />
            <KV k="Assignment" v={f.atype} />
            <KV k="Expires" v={f.expires || "Never"} />
          </ReviewSec>
          <ReviewSec
            title="Governance"
            onEdit={() => setStep(4)}
            errors={e4 ? ["Justification is required."] : []}
          >
            <KV k="Approval" v={needApproval ? "Required" : "Not required"} />
            <KV k="Justification" v={f.justification || "—"} />
            <KV k="Ticket" v={f.ticket || "—"} />
            <KV k="Risk" v={f.risk} />
          </ReviewSec>
        </>
      )}
      {step === 6 && (
        <>
          <H>Assign</H>
          <P>
            Creating this assignment grants the role immediately and logs an
            audit event.
          </P>
          {kvb([
            { k: "Principal", v: f.principal || "—" },
            { k: "Role", v: f.role },
            { k: "Scope", v: f.scope },
            { k: "Permissions", v: "via role" },
            {
              k: "Agent permissions",
              v: f.role.includes("Administrator")
                ? "Execute, Administer"
                : "Observe",
            },
            { k: "Resources", v: f.scope },
            {
              k: "Approvals",
              v: needApproval ? `Pending — ${f.approvers}` : "None",
            },
          ])}
        </>
      )}
    </WizardShell>
  );
}
function ExtendFlow({
  current,
  onClose,
  onDone,
}: {
  current: string;
  onClose: () => void;
  onDone: (d: string) => void;
}) {
  const [date, setDate] = React.useState("");
  return (
    <Drawer
      title="Extend assignment"
      subtitle={`Current expiration: ${current}. Choose a new expiration date.`}
      width={480}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={!date}
            onClick={() => onDone(date)}
          >
            Extend
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="New expiration">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={inp}
        />
      </Field>
    </Drawer>
  );
}
function ModifyScopeFlow({
  current,
  onClose,
  onDone,
}: {
  current: string;
  onClose: () => void;
  onDone: (s: string) => void;
}) {
  const [scope, setScope] = React.useState(current);
  return (
    <Drawer
      title="Modify scope"
      subtitle="Narrow or widen where this assignment applies."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" onClick={() => onDone(scope)}>
            Save scope
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Scope">
        <Sel
          value={scope}
          onChange={setScope}
          opts={[
            "Organization",
            "Workspace: Payments",
            "Workspace: SOC",
            "AWS Production Account",
            "Azure Subscription",
            "Kubernetes Cluster",
            "Vault: platform",
          ]}
        />
      </Field>
    </Drawer>
  );
}
function DelegationFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    delegate: "",
    canAssign: "Workspace Viewer",
    scope: "Payments Workspace",
    expires: "",
  });
  const err = !f.delegate.trim();
  return (
    <Drawer
      title="Create delegation"
      subtitle="Allow a user to grant specific roles within a scope (distributed administration)."
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `d${Date.now()}`,
                delegate: f.delegate.trim(),
                canAssign: f.canAssign,
                scope: f.scope,
                expires: f.expires || "Never",
                status: "Active",
              })
            }
          >
            Create delegation
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Delegated to" err={err}>
        <input
          value={f.delegate}
          onChange={(e) => setF({ ...f, delegate: e.target.value })}
          style={errInp(err)}
          placeholder="payments-admin@company.com"
        />
      </Req>
      <Field label="Can assign role">
        <Sel
          value={f.canAssign}
          onChange={(v) => setF({ ...f, canAssign: v })}
          opts={ROLE_OPTS}
        />
      </Field>
      <Field label="Scope">
        <Sel
          value={f.scope}
          onChange={(v) => setF({ ...f, scope: v })}
          opts={[
            "Payments Workspace",
            "SOC Workspace",
            "Lab Workspace",
            "Department: Engineering",
          ]}
        />
      </Field>
      <Field label="Expiration">
        <input
          type="date"
          value={f.expires}
          onChange={(e) => setF({ ...f, expires: e.target.value })}
          style={inp}
        />
      </Field>
    </Drawer>
  );
}

// ── effective permission resolver ───────────────────────────────────────────
function ResolverPanel() {
  const [ptype, setPtype] = React.useState("User");
  const [who, setWho] = React.useState("");
  const [out, setOut] = React.useState<string | null>(null);
  const resolve = () => setOut(who.trim() || "rami@inferencedefense.com");
  return (
    <div
      style={{
        marginTop: 18,
        background: T.cardBg,
        border: `1px solid var(--cg-border-card)`,
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: T.textPrimary,
          marginBottom: 4,
        }}
      >
        Effective Permission Resolver
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 14 }}>
        Answer “what can this identity actually do?” — resolves all roles,
        permissions, agent capabilities, resources, restrictions and approvals
        across direct, group, inherited and temporary grants.
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: out ? 16 : 0,
        }}
      >
        <div style={{ minWidth: 160 }}>
          <Field label="Principal type">
            <Sel
              value={ptype}
              onChange={setPtype}
              opts={["User", "Group", "Service Identity"]}
            />
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Field label={ptype}>
            <input
              value={who}
              onChange={(e) => setWho(e.target.value)}
              style={inp}
              placeholder={
                ptype === "User"
                  ? "user@company.com"
                  : ptype === "Group"
                    ? "Security Engineers"
                    : "ci-deploy"
              }
            />
          </Field>
        </div>
        <HeaderButton variant="primary" onClick={resolve}>
          Resolve
        </HeaderButton>
      </div>
      {out && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 14,
          }}
        >
          <ResolverCol
            title="Resolved roles"
            items={[
              "Security Engineer (System · T2)",
              "Findings Triage (Custom · T2)",
              "Auditor — inherited via Security Operations",
            ]}
          />
          <ResolverCol
            title="Resolved permissions"
            items={[
              "users.read",
              "users.update",
              "roles.assign",
              "findings.read",
              "remediation.execute",
            ]}
          />
          <ResolverCol
            title="Resolved agent permissions"
            items={[
              "Investigate Findings",
              "Generate Remediation",
              "Execute Remediation — approval required",
            ]}
          />
          <ResolverCol
            title="Resolved resource access"
            items={["AWS Production", "Azure Payments", "GCP Analytics"]}
          />
          <ResolverCol
            title="Resolved restrictions"
            items={[
              "keys.rotate — Denied (SoD)",
              "billing.write — Not allowed",
            ]}
            tone="danger"
          />
          <ResolverCol
            title="Resolved approval requirements"
            items={[
              "Privileged activation → CISO",
              "Execute Remediation → Platform",
            ]}
          />
        </div>
      )}
    </div>
  );
}
function ResolverCol({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "danger";
}) {
  return (
    <div>
      <SecHead2>{title}</SecHead2>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((it) => (
          <div key={it} style={{ fontSize: 12.5 }}>
            <StatusIndicator tone={tone === "danger" ? "danger" : "ok"}>
              {it}
            </StatusIndicator>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── shared drawer fragments ─────────────────────────────────────────────────
function accessResolutionSub() {
  return {
    label: "Access Resolution",
    content: (
      <>
        <SecHead2>Platform permissions</SecHead2>
        {tlb([
          { primary: "users.read", secondary: "Identity", right: "" },
          { primary: "users.update", secondary: "Identity", right: "" },
          { primary: "roles.assign", secondary: "Authorization", right: "" },
        ])}
        <SecHead2>Agent permissions</SecHead2>
        {tlb([
          {
            primary: "Investigate Findings",
            secondary: "Investigation Agent",
            right: <AStatus s="Low" />,
          },
          {
            primary: "Generate Remediation",
            secondary: "Remediation Agent",
            right: <AStatus s="Medium" />,
          },
          {
            primary: "Execute Remediation",
            secondary: "Remediation Agent · approval required",
            right: <AStatus s="Critical" />,
          },
        ])}
        <SecHead2>Resource access</SecHead2>
        {tlb([
          {
            primary: "AWS Production",
            secondary: "Cloud Account",
            right: "Read",
          },
          {
            primary: "Azure Payments",
            secondary: "Subscription",
            right: "Admin",
          },
          { primary: "GCP Analytics", secondary: "Project", right: "Read" },
        ])}
        <SecHead2>Inherited access</SecHead2>
        {tlb([
          {
            primary: "Auditor",
            secondary: "from group Security Operations",
            right: "Group",
          },
          {
            primary: "findings.read",
            secondary: "from nested group",
            right: "Nested",
          },
          {
            primary: "Break-glass Operator",
            secondary: "temporary grant",
            right: "Temporary",
          },
        ])}
        <SecHead2>Denied permissions</SecHead2>
        {tlb([
          {
            primary: "keys.rotate",
            secondary: "explicit restriction (SoD)",
            right: <AStatus s="Blocked" />,
          },
        ])}
        <SecHead2>Effective access graph</SecHead2>
        {tlb([
          {
            primary: "User → Assignment → Role → Permission → Resource",
            secondary: "resolution path",
            right: "",
          },
        ])}
      </>
    ),
  };
}
function approvalHistorySub() {
  return {
    label: "Approval History",
    content: tlb([
      {
        primary: "ciso@inferencedefense.com",
        secondary: "Approved · break-glass justified",
        right: "2026-03-04",
      },
      {
        primary: "platform@inferencedefense.com",
        secondary: "Escalated · awaiting CISO",
        right: "2026-03-03",
      },
    ]),
  };
}

// ── 1. USER ASSIGNMENTS ─────────────────────────────────────────────────────
function UserAssignments() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      principal: "jdoe@company.com",
      ptype: "User",
      role: "Enterprise Security Administrator",
      scope: "Organization",
      atype: "Direct",
      expires: "Never",
      status: "Active",
      assignedBy: "ciso@inferencedefense.com",
      assignedDate: "2026-01-10",
      justification: "Platform ownership",
      ticket: "JIRA-204",
      approval: "Yes",
      approvalStatus: "Approved",
      risk: "High",
    },
    {
      id: "1",
      principal: "contractor@ext.com",
      ptype: "User",
      role: "Viewer",
      scope: "acme-dev",
      atype: "Temporary",
      expires: "2026-07-15",
      status: "Active",
      assignedBy: "rami@inferencedefense.com",
      assignedDate: "2026-06-01",
      justification: "Audit engagement",
      ticket: "JIRA-512",
      approval: "No",
      approvalStatus: "—",
      risk: "Low",
    },
    {
      id: "2",
      principal: "marc@sentinel-org.io",
      ptype: "User",
      role: "Security Engineer",
      scope: "Workspace: SOC",
      atype: "Direct",
      expires: "Never",
      status: "Active",
      assignedBy: "platform@inferencedefense.com",
      assignedDate: "2026-04-10",
      justification: "SOC operations",
      ticket: "JIRA-330",
      approval: "No",
      approvalStatus: "—",
      risk: "Medium",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const revoke = (ids: string[]) =>
    setRows((rs) =>
      rs.map((r) => (ids.includes(r.id) ? { ...r, status: "Revoked" } : r)),
    );
  const extend = (id: string, d: string) =>
    setRows((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, expires: d, atype: "Temporary" } : r,
      ),
    );
  const cols = aCols([
    ["principal", "Principal"],
    ["ptype", "Type"],
    ["role", "Role"],
    ["scope", "Scope"],
    ["atype", "Assignment"],
    ["expires", "Expires"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Assignments"
        desc="Direct, group-based, inherited and temporary role grants — the operational center of authorization."
        searchPlaceholder="Search principal"
        commands={[
          {
            key: "new",
            label: "Assign Role",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignmentWizard
                  fixedPtype="User"
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [
                      {
                        id: `a${Date.now()}`,
                        principal: d.principal,
                        ptype: d.ptype,
                        role: d.role,
                        scope: d.scope,
                        atype: d.atype,
                        expires: d.expires || "Never",
                        status: "Active",
                        assignedBy: "you",
                        assignedDate: new Date().toISOString().slice(0, 10),
                        justification: d.justification,
                        ticket: d.ticket,
                        approval: d.atype === "Privileged" ? "Yes" : "No",
                        approvalStatus:
                          d.atype === "Privileged" ? "Pending" : "—",
                        risk: d.risk,
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast("Assignment created");
                  }}
                />,
              ),
          },
          {
            key: "rev",
            label: "Revoke Assignment",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke assignment"
                  subtitle="Choose an assignment to revoke."
                  items={rows
                    .filter((r) => r.status === "Active")
                    .map((r) => ({
                      id: r.id,
                      label: r.principal,
                      sub: `${r.role} · ${r.scope}`,
                    }))}
                  actionLabel="Revoke"
                  danger
                  onApply={(id) => {
                    revoke([id]);
                    setFlow(null);
                    setToast("Assignment revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "ext",
            label: "Extend Assignment",
            icon: <CalendarClock size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Extend assignment"
                  subtitle="Choose a temporary assignment to extend."
                  items={rows
                    .filter((r) => r.expires !== "Never")
                    .map((r) => ({
                      id: r.id,
                      label: r.principal,
                      sub: `expires ${r.expires}`,
                    }))}
                  actionLabel="Choose"
                  onApply={(id) => {
                    setFlow(
                      <ExtendFlow
                        current={rows.find((r) => r.id === id)?.expires ?? "—"}
                        onClose={() => setFlow(null)}
                        onDone={(d) => {
                          extend(id, d);
                          setFlow(null);
                          setToast("Assignment extended");
                        }}
                      />,
                    );
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "user-assignments"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "atype", label: "Assignment Type" },
          { key: "role", label: "Role" },
          { key: "scope", label: "Scope" },
          { key: "status", label: "Status" },
          { key: "expires", label: "Expiration" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <ConfirmButton
                    variant="danger"
                    label={`Revoke (${ids.length})`}
                    title="Revoke assignments"
                    body={`Revoke ${ids.length} assignment(s)? Access is removed immediately.`}
                    confirmLabel="Revoke"
                    onConfirm={() => {
                      revoke(ids);
                      clear();
                    }}
                  />
                  <HeaderButton
                    onClick={() => {
                      setToast("Assignments extended +90d");
                      clear();
                    }}
                  >
                    Extend
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      authCsv(
                        rows.filter((r) => ids.includes(r.id)),
                        "assignments",
                      );
                      clear();
                    }}
                  >
                    Export
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setToast("Access review launched");
                      clear();
                    }}
                  >
                    Review
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                {
                  label: "Edit",
                  onClick: () => setToast(`Editing ${r.principal}`),
                },
                {
                  label: "Extend",
                  onClick: () =>
                    setFlow(
                      <ExtendFlow
                        current={r.expires}
                        onClose={() => setFlow(null)}
                        onDone={(d) => {
                          extend(r.id, d);
                          setFlow(null);
                          setToast("Extended");
                        }}
                      />,
                    ),
                },
                {
                  label: "Revoke",
                  danger: true,
                  onClick: () => revoke([r.id]),
                },
                { label: "Audit History", onClick: open },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.principal)}
            title={r.principal}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.role} · {r.atype} · <AStatus s={r.status} /> · expires{" "}
                {r.expires}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Editing")}>
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <ExtendFlow
                          current={r.expires}
                          onClose={() => setFlow(null)}
                          onDone={(d) => {
                            extend(r.id, d);
                            setFlow(null);
                            setToast("Extended");
                          }}
                        />,
                      )
                    }
                  >
                    Extend
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      revoke([r.id]);
                      close();
                    }}
                  >
                    Revoke
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => authCsv([r], `assignment-${r.principal}`)}
                  >
                    Export
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Assignment Information",
                    content: kvb([
                      { k: "Assignment ID", v: `asg_${r.id}c4a91` },
                      { k: "Principal", v: r.principal },
                      { k: "Role", v: r.role },
                      { k: "Assignment type", v: r.atype },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      { k: "Assigned by", v: r.assignedBy },
                      { k: "Assigned date", v: r.assignedDate },
                      { k: "Expiration", v: r.expires },
                    ]),
                  },
                  {
                    label: "Assignment Metadata",
                    content: kvb([
                      { k: "Business justification", v: r.justification },
                      { k: "Ticket reference", v: r.ticket },
                      { k: "Approval required", v: r.approval },
                      {
                        k: "Approval status",
                        v:
                          r.approvalStatus === "—" ? (
                            "—"
                          ) : (
                            <AStatus s={r.approvalStatus} />
                          ),
                      },
                      { k: "Risk level", v: <AStatus s={r.risk} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Role Details",
                subs: [
                  {
                    label: "Role Details",
                    content: (
                      <>
                        {kvb([
                          { k: "Role name", v: r.role },
                          {
                            k: "Role type",
                            v: r.role.includes("Enterprise")
                              ? "System"
                              : "Custom",
                          },
                          { k: "Tier", v: r.risk === "High" ? "T4" : "T2" },
                          { k: "Permission count", v: "148" },
                          { k: "Agent permission count", v: "6" },
                          { k: "Resource access count", v: "6" },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => setToast("Opening role")}
                            >
                              Open Role
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Comparing role")}
                            >
                              Compare Role
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Viewing permissions")}
                            >
                              View Permissions
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Scope",
                subs: [
                  {
                    label: "Scope",
                    content: (
                      <>
                        {kvb([
                          { k: "Organization", v: "Inference Defense" },
                          {
                            k: "Workspace",
                            v: r.scope.startsWith("Workspace")
                              ? r.scope.replace("Workspace: ", "")
                              : "—",
                          },
                          {
                            k: "Environment",
                            v: r.scope.includes("Production")
                              ? "Production"
                              : "—",
                          },
                          {
                            k: "Cloud account",
                            v: r.scope.includes("AWS") ? "AWS Production" : "—",
                          },
                          { k: "Resource group", v: "—" },
                        ])}
                        <SecHead2>Effective scope</SecHead2>
                        {tlb([
                          {
                            primary: `${r.role} → assignment → ${r.scope} → cloud resources`,
                            secondary: "scope resolution",
                            right: "",
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              { label: "Access Resolution", subs: [accessResolutionSub()] },
              { label: "Approval History", subs: [approvalHistorySub()] },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Assigned",
                        secondary: `${r.role} · ${r.scope}`,
                        right: r.assignedDate,
                      },
                      {
                        primary: "Approval granted",
                        secondary: r.assignedBy,
                        right: r.assignedDate,
                      },
                      ...(r.expires !== "Never"
                        ? [
                            {
                              primary: "Extended",
                              secondary: `to ${r.expires}`,
                              right: "2026-06-01",
                            },
                          ]
                        : []),
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Assignment created",
                        secondary: `by ${r.assignedBy}`,
                        right: r.assignedDate,
                      },
                      {
                        primary: "Approval granted",
                        secondary: "ciso@inferencedefense.com",
                        right: r.assignedDate,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 2. GROUP ASSIGNMENTS ────────────────────────────────────────────────────
function GroupAssignments() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      group: "Security Engineers",
      role: "Workspace Administrator",
      members: "12",
      scope: "acme-prod",
      atype: "Group",
      status: "Active",
    },
    {
      id: "1",
      group: "Security Operations",
      role: "Auditor",
      members: "5",
      scope: "Organization",
      atype: "Group",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const revoke = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const cols = aCols([
    ["group", "Group"],
    ["role", "Role"],
    ["members", "Members"],
    ["scope", "Scope"],
    ["atype", "Assignment Type"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Group Assignments"
        desc="Roles granted to groups — every member inherits the role for as long as they remain in the group."
        searchPlaceholder="Search groups"
        commands={[
          {
            key: "new",
            label: "Assign Role To Group",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignmentWizard
                  fixedPtype="Group"
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [
                      {
                        id: `g${Date.now()}`,
                        group: d.principal,
                        role: d.role,
                        members: "0",
                        scope: d.scope,
                        atype: "Group",
                        status: "Active",
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast("Role assigned to group");
                  }}
                />,
              ),
          },
          {
            key: "rev",
            label: "Revoke",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke group assignment"
                  subtitle="Choose a group assignment to revoke."
                  items={rows.map((r) => ({
                    id: r.id,
                    label: r.group,
                    sub: `${r.role} · ${r.scope}`,
                  }))}
                  actionLabel="Revoke"
                  danger
                  onApply={(id) => {
                    revoke(id);
                    setFlow(null);
                    setToast("Revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "group-assignments"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "role", label: "Role" },
          { key: "scope", label: "Scope" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "Revoke", danger: true, onClick: () => revoke(r.id) },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.group)}
            title={r.group}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.role} · {r.members} members · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Editing")}>
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      revoke(r.id);
                      close();
                    }}
                  >
                    Revoke
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => authCsv([r], `group-assignment-${r.group}`)}
                  >
                    Export
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Group", v: r.group },
                      { k: "Role", v: r.role },
                      { k: "Members", v: r.members },
                      { k: "Scope", v: r.scope },
                      { k: "Assignment type", v: r.atype },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Members",
                subs: [
                  {
                    label: "Members",
                    content: tlb([
                      {
                        primary: "rami@inferencedefense.com",
                        secondary: `Engineering · inherits ${r.role}`,
                        right: <AStatus s="Active" />,
                      },
                      {
                        primary: "marc@sentinel-org.io",
                        secondary: `Security · inherits ${r.role}`,
                        right: <AStatus s="Active" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Effective Access",
                subs: [
                  {
                    label: "Effective Access",
                    content: tlb([
                      {
                        primary: `${r.group} → ${r.role} → ${r.members} users → permissions`,
                        secondary: "group access resolution",
                        right: "",
                      },
                      {
                        primary: "users.read, findings.read, role.assign",
                        secondary: `via ${r.role}`,
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Scope",
                subs: [
                  {
                    label: "Scope",
                    content: kvb([
                      { k: "Organization", v: "Inference Defense" },
                      { k: "Workspace", v: r.scope },
                      {
                        k: "Cloud account",
                        v: r.scope.includes("prod") ? "AWS Production" : "—",
                      },
                    ]),
                  },
                ],
              },
              { label: "Approval History", subs: [approvalHistorySub()] },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Role assigned to group",
                        secondary: r.role,
                        right: "2026-02-01",
                      },
                      {
                        primary: "Member added",
                        secondary: "marc@sentinel-org.io",
                        right: "2026-05-30",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Group assignment created",
                        secondary: r.role,
                        right: "2026-02-01",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 3. SCOPED ASSIGNMENTS ───────────────────────────────────────────────────
function ScopedAssignments() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      principal: "mei.tan@deloitte.com",
      role: "Auditor",
      scopeType: "Workspace",
      scope: "SOC",
      expires: "2026-07-30",
      status: "Active",
    },
    {
      id: "1",
      principal: "Security Operations",
      role: "Findings Triage",
      scopeType: "Cloud Account",
      scope: "AWS Production",
      expires: "Never",
      status: "Active",
    },
    {
      id: "2",
      principal: "ci-deploy",
      role: "Operator",
      scopeType: "Cluster",
      scope: "prod-eks",
      expires: "2026-09-01",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const revoke = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const setScope = (id: string, s: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, scope: s } : r)));
  const cols = aCols([
    ["principal", "Principal"],
    ["role", "Role"],
    ["scopeType", "Scope Type"],
    ["scope", "Scope"],
    ["expires", "Expires"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Scoped Assignments"
        desc="Assignments limited to a specific cloud account, subscription, workspace or cluster — enterprise-critical least privilege."
        searchPlaceholder="Search scoped assignments"
        commands={[
          {
            key: "new",
            label: "Create Scoped Assignment",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignmentWizard
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [
                      {
                        id: `s${Date.now()}`,
                        principal: d.principal,
                        role: d.role,
                        scopeType: d.scope.includes("AWS")
                          ? "Cloud Account"
                          : d.scope.includes("Cluster")
                            ? "Cluster"
                            : "Workspace",
                        scope: d.scope,
                        expires: d.expires || "Never",
                        status: "Active",
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast("Scoped assignment created");
                  }}
                />,
              ),
          },
          {
            key: "mod",
            label: "Modify Scope",
            icon: <Target size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Modify scope"
                  subtitle="Choose an assignment to re-scope."
                  items={rows.map((r) => ({
                    id: r.id,
                    label: r.principal,
                    sub: `${r.role} · ${r.scope}`,
                  }))}
                  actionLabel="Choose"
                  onApply={(id) =>
                    setFlow(
                      <ModifyScopeFlow
                        current={rows.find((r) => r.id === id)?.scope ?? ""}
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setScope(id, s);
                          setFlow(null);
                          setToast("Scope updated");
                        }}
                      />,
                    )
                  }
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "rev",
            label: "Revoke",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke scoped assignment"
                  subtitle="Choose an assignment to revoke."
                  items={rows.map((r) => ({
                    id: r.id,
                    label: r.principal,
                    sub: `${r.role} · ${r.scope}`,
                  }))}
                  actionLabel="Revoke"
                  danger
                  onApply={(id) => {
                    revoke(id);
                    setFlow(null);
                    setToast("Revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "scoped-assignments"),
          },
        ]}
        filterDefs={[
          { key: "role", label: "Role" },
          { key: "scopeType", label: "Scope Type" },
          { key: "status", label: "Status" },
          { key: "expires", label: "Expiration" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                {
                  label: "Modify Scope",
                  onClick: () =>
                    setFlow(
                      <ModifyScopeFlow
                        current={r.scope}
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setScope(r.id, s);
                          setFlow(null);
                          setToast("Scope updated");
                        }}
                      />,
                    ),
                },
                { label: "Revoke", danger: true, onClick: () => revoke(r.id) },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.principal)}
            title={r.principal}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.role} · {r.scopeType}: {r.scope} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <ModifyScopeFlow
                          current={r.scope}
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            setScope(r.id, s);
                            setFlow(null);
                            setToast("Scope updated");
                          }}
                        />,
                      )
                    }
                  >
                    Modify Scope
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      revoke(r.id);
                      close();
                    }}
                  >
                    Revoke
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => authCsv([r], `scoped-${r.principal}`)}
                  >
                    Export
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Principal", v: r.principal },
                      { k: "Role", v: r.role },
                      { k: "Scope type", v: r.scopeType },
                      { k: "Scope", v: r.scope },
                      { k: "Expires", v: r.expires },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Resource Scope",
                subs: [
                  {
                    label: "Resource Scope",
                    content: kvb([
                      { k: "Organization", v: "Inference Defense" },
                      {
                        k: "Workspace",
                        v: r.scopeType === "Workspace" ? r.scope : "—",
                      },
                      {
                        k: "Cloud account",
                        v: r.scopeType === "Cloud Account" ? r.scope : "—",
                      },
                      { k: "Subscription", v: "—" },
                      { k: "Project", v: "—" },
                      {
                        k: "Cluster",
                        v: r.scopeType === "Cluster" ? r.scope : "—",
                      },
                      { k: "Vault", v: "—" },
                    ]),
                  },
                ],
              },
              {
                label: "Effective Access",
                subs: [
                  {
                    label: "Effective Access",
                    content: (
                      <>
                        {tlb([
                          {
                            primary: `${r.principal} → ${r.role} → ${r.scope} → resources`,
                            secondary: "scope visualization",
                            right: "",
                          },
                        ])}
                        <SecHead2>Resolved permissions in scope</SecHead2>
                        {tlb([
                          {
                            primary: "findings.read",
                            secondary: `within ${r.scope}`,
                            right: "",
                          },
                          {
                            primary: "scans.run",
                            secondary: `within ${r.scope}`,
                            right: "",
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              { label: "Approval History", subs: [approvalHistorySub()] },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Scoped assignment created",
                        secondary: `${r.scope}`,
                        right: "2026-05-01",
                      },
                      {
                        primary: "Scope changed",
                        secondary: r.scope,
                        right: "2026-06-10",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Scoped assignment created",
                        secondary: `${r.role} @ ${r.scope}`,
                        right: "2026-05-01",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 4. DELEGATED ASSIGNMENTS ────────────────────────────────────────────────
function DelegatedAssignments() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      delegate: "Payments Admin",
      canAssign: "Workspace Viewer",
      scope: "Payments Workspace",
      expires: "Never",
      status: "Active",
    },
    {
      id: "1",
      delegate: "lab-admin@inferencedefense.com",
      canAssign: "Operator",
      scope: "Lab Workspace",
      expires: "2026-12-31",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const revoke = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const cols = aCols([
    ["delegate", "Delegated To"],
    ["canAssign", "Can Assign"],
    ["scope", "Scope"],
    ["expires", "Expires"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Delegated Assignments"
        desc="Distributed administration — specific users may grant defined roles within a bounded scope on the admin's behalf."
        searchPlaceholder="Search delegations"
        commands={[
          {
            key: "new",
            label: "Create Delegation",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <DelegationFlow
                  onClose={() => setFlow(null)}
                  onCreate={(row) => {
                    setRows((rs) => [row, ...rs]);
                    setFlow(null);
                    setToast("Delegation created");
                  }}
                />,
              ),
          },
          {
            key: "rev",
            label: "Revoke Delegation",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke delegation"
                  subtitle="Choose a delegation to revoke."
                  items={rows.map((r) => ({
                    id: r.id,
                    label: r.delegate,
                    sub: `${r.canAssign} · ${r.scope}`,
                  }))}
                  actionLabel="Revoke"
                  danger
                  onApply={(id) => {
                    revoke(id);
                    setFlow(null);
                    setToast("Delegation revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "delegated-assignments"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "canAssign", label: "Can Assign" },
          { key: "scope", label: "Scope" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                {
                  label: "Revoke Delegation",
                  danger: true,
                  onClick: () => revoke(r.id),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.delegate)}
            title={r.delegate}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                Can assign {r.canAssign} · {r.scope} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Editing")}>
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      revoke(r.id);
                      close();
                    }}
                  >
                    Revoke Delegation
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => authCsv([r], `delegation-${r.delegate}`)}
                  >
                    Export
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Delegated to", v: r.delegate },
                      { k: "Can assign", v: r.canAssign },
                      { k: "Scope", v: r.scope },
                      { k: "Expires", v: r.expires },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Allowed Roles",
                subs: [
                  {
                    label: "Allowed Roles",
                    content: tlb([
                      {
                        primary: r.canAssign,
                        secondary: "System · least-privilege",
                        right: <AStatus s="Low" />,
                      },
                      {
                        primary: "Read Only",
                        secondary: "System",
                        right: <AStatus s="Low" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Scope",
                subs: [
                  {
                    label: "Scope",
                    content: kvb([
                      { k: "Workspace", v: r.scope },
                      { k: "Cloud account", v: "—" },
                      {
                        k: "Boundary",
                        v: "Cannot escalate beyond delegated roles",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Delegation Activity",
                subs: [
                  {
                    label: "Delegation Activity",
                    content: kvb([
                      { k: "Assignments created", v: "14" },
                      { k: "Assignments revoked", v: "3" },
                      { k: "Assignments modified", v: "5" },
                      { k: "Approvals requested", v: "2" },
                    ]),
                  },
                ],
              },
              { label: "Approval History", subs: [approvalHistorySub()] },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Delegation created",
                        secondary: `${r.canAssign} @ ${r.scope}`,
                        right: "2026-03-01",
                      },
                      {
                        primary: "Assignment created by delegate",
                        secondary: "viewer → contractor@ext.com",
                        right: "2026-05-12",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── Privileged Access ───────────────────────────────────────────────────────
const PRIV_SUBS = [
  "Eligible Access",
  "Active Access",
  "Activation Requests",
  "Approvals",
  "Emergency Access",
  "Access History",
];
function PrivilegedArea() {
  const [sub, setSub] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={PRIV_SUBS} active={sub} onChange={setSub} />
      {sub === 0 && <EligibleAccess />}
      {sub === 1 && <ActiveAccess />}
      {sub === 2 && <ActivationRequests />}
      {sub === 3 && <PrivApprovals />}
      {sub === 4 && <EmergencyAccess />}
      {sub === 5 && <AccessHistory />}
    </div>
  );
}

// ── privilege activation wizard ─────────────────────────────────────────────
const PAW_STEPS = [
  "Role",
  "Scope",
  "Duration",
  "Justification",
  "Approval",
  "Review",
  "Activate",
];
const PRIV_ROLES = [
  "Enterprise Security Administrator",
  "Organization Owner",
  "Workspace Administrator",
  "Security Administrator",
];
type PawData = {
  role: string;
  scope: string;
  duration: string;
  reason: string;
  ticket: string;
  change: string;
  incident: string;
  approvers: string;
  emergency: boolean;
};
function PrivilegeActivationWizard({
  mode,
  prefillRole,
  onClose,
  onCreate,
}: {
  mode: "activate" | "request";
  prefillRole?: string;
  onClose: () => void;
  onCreate: (d: PawData) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<PawData>({
    role: prefillRole ?? PRIV_ROLES[0],
    scope: "Organization",
    duration: "4h",
    reason: "",
    ticket: "",
    change: "",
    incident: "",
    approvers: "ciso@inferencedefense.com",
    emergency: false,
  });
  const set = (p: Partial<PawData>) => setF({ ...f, ...p });
  const e3 = !f.reason.trim();
  const last = step === PAW_STEPS.length - 1;
  return (
    <WizardShell
      title={
        mode === "activate"
          ? "Activate privileged role"
          : "Request privileged access"
      }
      steps={PAW_STEPS}
      step={step}
      setStep={setStep}
      stepError={(i) => (i === 3 ? e3 : false)}
      showErrors={last}
      canFinish={!e3}
      finishLabel={mode === "activate" ? "Activate" : "Submit request"}
      onFinish={() => {
        if (e3) {
          setStep(3);
          return;
        }
        onCreate(f);
      }}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Select role</H>
          <P>
            Choose the privileged role to elevate into. There is no standing
            privilege — this access expires automatically.
          </P>
          <Field label="Role">
            <Sel
              value={f.role}
              onChange={(v) => set({ role: v })}
              opts={PRIV_ROLES}
            />
          </Field>
          <div style={{ fontSize: 12, color: T.danger }}>
            ⚠{" "}
            {f.role.includes("Owner") || f.role.includes("Enterprise")
              ? "Critical"
              : "High"}{" "}
            risk · 2 approvers · MFA required
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <H>Select scope</H>
          <P>Where the elevated role applies.</P>
          <Field label="Scope">
            <Sel
              value={f.scope}
              onChange={(v) => set({ scope: v })}
              opts={[
                "Organization",
                "Workspace: Payments",
                "Workspace: SOC",
                "AWS Production Account",
                "Azure Subscription",
              ]}
            />
          </Field>
        </>
      )}
      {step === 2 && (
        <>
          <H>Duration</H>
          <P>Time-bound elevation. Maximum allowed by policy: 4h.</P>
          <Field label="Duration">
            <Sel
              value={f.duration}
              onChange={(v) => set({ duration: v })}
              opts={["30m", "1h", "2h", "4h"]}
            />
          </Field>
        </>
      )}
      {step === 3 && (
        <>
          <H>Justification</H>
          <P>Required for audit. Explain why this privilege is needed.</P>
          <Req label="Business reason" err={e3}>
            <textarea
              value={f.reason}
              onChange={(e) => set({ reason: e.target.value })}
              rows={3}
              style={{
                ...errInp(e3),
                height: "auto",
                padding: 11,
                resize: "vertical",
              }}
              placeholder="Why is this privileged access needed now?"
            />
          </Req>
          <Field label="Ticket">
            <input
              value={f.ticket}
              onChange={(e) => set({ ticket: e.target.value })}
              style={inp}
              placeholder="JIRA-1042"
            />
          </Field>
          <Field label="Change request">
            <input
              value={f.change}
              onChange={(e) => set({ change: e.target.value })}
              style={inp}
              placeholder="CHG-2200"
            />
          </Field>
          <Field label="Incident reference">
            <input
              value={f.incident}
              onChange={(e) => set({ incident: e.target.value })}
              style={inp}
              placeholder="INC-77 (optional)"
            />
          </Field>
        </>
      )}
      {step === 4 && (
        <>
          <H>Approval</H>
          <P>
            This elevation routes through an approval chain and requires MFA.
          </P>
          <Field label="Approvers">
            <Sel
              value={f.approvers}
              onChange={(v) => set({ approvers: v })}
              opts={[
                "ciso@inferencedefense.com",
                "platform@inferencedefense.com",
                "org-owner@inferencedefense.com",
              ]}
            />
          </Field>
          {kvb([
            { k: "Approval chain", v: `${f.approvers} → Org Owner` },
            { k: "MFA requirement", v: <AStatus s="Required" /> },
          ])}
        </>
      )}
      {step === 5 && (
        <>
          <H>Review</H>
          <P>
            Confirm before{" "}
            {mode === "activate" ? "activation" : "submitting the request"}.
          </P>
          <ReviewSec title="Role & scope" onEdit={() => setStep(0)}>
            <KV k="Role" v={f.role} />
            <KV k="Scope" v={f.scope} />
            <KV k="Duration" v={f.duration} />
          </ReviewSec>
          <ReviewSec
            title="Justification"
            onEdit={() => setStep(3)}
            errors={e3 ? ["Business reason is required."] : []}
          >
            <KV k="Business reason" v={f.reason || "—"} />
            <KV k="Ticket" v={f.ticket || "—"} />
          </ReviewSec>
          {kvb([
            { k: "Permissions", v: "via role (148)" },
            { k: "Agent permissions", v: "Execute Remediation (critical)" },
            { k: "Resources", v: f.scope },
            {
              k: "Risk",
              v: (
                <AStatus
                  s={
                    f.role.includes("Owner") || f.role.includes("Enterprise")
                      ? "Critical"
                      : "High"
                  }
                />
              ),
            },
          ])}
        </>
      )}
      {step === 6 && (
        <>
          <H>{mode === "activate" ? "Activate" : "Submit"}</H>
          <P>
            {mode === "activate"
              ? "Activation creates a request, runs the approval workflow, enforces MFA, then starts a recorded time-bound session."
              : "Submitting creates an activation request and routes it to approvers."}{" "}
            An audit event is logged.
          </P>
          {kvb([
            { k: "Request", v: "will be created" },
            { k: "Approval workflow", v: `${f.approvers} → Org Owner` },
            { k: "MFA", v: "enforced at activation" },
            { k: "Audit event", v: "recorded" },
          ])}
        </>
      )}
    </WizardShell>
  );
}
function RejectFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  const err = !reason.trim();
  return (
    <Drawer
      title="Reject request"
      subtitle="Provide a reason — it is recorded in the approval chain and audit log."
      width={500}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="danger"
            disabled={err}
            onClick={() => onDone(reason.trim())}
          >
            Reject
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Reason" err={err}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          style={{
            ...errInp(err),
            height: "auto",
            padding: 11,
            resize: "vertical",
          }}
          placeholder="Why is this request rejected?"
        />
      </Req>
    </Drawer>
  );
}
function EmergencyFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    user: "",
    role: PRIV_ROLES[0],
    incident: "",
    reason: "",
    approver: "ciso@inferencedefense.com",
    duration: "1h",
    exec: false,
  });
  const err =
    !f.user.trim() || !f.incident.trim() || !f.reason.trim() || !f.exec;
  return (
    <Drawer
      title="Initiate emergency (break-glass) access"
      subtitle="Highest-risk capability — fully audited and continuously monitored. All fields are mandatory."
      width={580}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="danger"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `e${Date.now()}`,
                user: f.user.trim(),
                role: f.role,
                reason: f.reason.trim(),
                activated: new Date().toTimeString().slice(0, 5),
                duration: f.duration,
                status: "Active",
                incident: f.incident.trim(),
                approver: f.approver,
                exec: "Yes",
              })
            }
          >
            Initiate
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="User" err={!f.user.trim()}>
        <input
          value={f.user}
          onChange={(e) => setF({ ...f, user: e.target.value })}
          style={errInp(!f.user.trim())}
          placeholder="user@company.com"
        />
      </Req>
      <Field label="Role">
        <Sel
          value={f.role}
          onChange={(v) => setF({ ...f, role: v })}
          opts={PRIV_ROLES}
        />
      </Field>
      <Req label="Incident ID" err={!f.incident.trim()}>
        <input
          value={f.incident}
          onChange={(e) => setF({ ...f, incident: e.target.value })}
          style={errInp(!f.incident.trim())}
          placeholder="INC-2026-0077"
        />
      </Req>
      <Req label="Reason" err={!f.reason.trim()}>
        <textarea
          value={f.reason}
          onChange={(e) => setF({ ...f, reason: e.target.value })}
          rows={3}
          style={{
            ...errInp(!f.reason.trim()),
            height: "auto",
            padding: 11,
            resize: "vertical",
          }}
          placeholder="Nature of the emergency"
        />
      </Req>
      <Field label="Approver">
        <Sel
          value={f.approver}
          onChange={(v) => setF({ ...f, approver: v })}
          opts={["ciso@inferencedefense.com", "org-owner@inferencedefense.com"]}
        />
      </Field>
      <Field label="Duration">
        <Sel
          value={f.duration}
          onChange={(v) => setF({ ...f, duration: v })}
          opts={["30m", "1h", "2h"]}
        />
      </Field>
      <Chk
        label="Executive approval obtained (mandatory)"
        on={f.exec}
        onChange={(v) => setF({ ...f, exec: v })}
      />
    </Drawer>
  );
}

// ── 1. ELIGIBLE ACCESS ──────────────────────────────────────────────────────
function EligibleAccess() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      role: "Enterprise Security Administrator",
      scope: "Organization",
      risk: "Critical",
      approval: "2 Approvers",
      mfa: "Required",
      maxDur: "4 Hours",
      status: "Eligible",
    },
    {
      id: "1",
      role: "Workspace Administrator",
      scope: "Workspace: Payments",
      risk: "High",
      approval: "1 Approver",
      mfa: "Required",
      maxDur: "8 Hours",
      status: "Eligible",
    },
    {
      id: "2",
      role: "Security Administrator",
      scope: "Organization",
      risk: "High",
      approval: "1 Approver",
      mfa: "Required",
      maxDur: "4 Hours",
      status: "Eligible",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["role", "Role"],
    ["scope", "Scope"],
    ["risk", "Risk", (r) => <AStatus s={r.risk} />],
    ["approval", "Approval"],
    ["mfa", "MFA"],
    ["maxDur", "Maximum Duration"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  const activate = (r: ARow, mode: "activate" | "request") =>
    setFlow(
      <PrivilegeActivationWizard
        mode={mode}
        prefillRole={r.role}
        onClose={() => setFlow(null)}
        onCreate={() => {
          setFlow(null);
          setToast(
            mode === "activate"
              ? "Activation submitted (pending approval + MFA)"
              : "Access requested",
          );
        }}
      />,
    );
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Eligible Privileged Roles"
        desc="Roles available for just-in-time elevation. No standing privilege — eligible only, not active, not assigned."
        searchPlaceholder="Search eligible roles"
        commands={[
          {
            key: "act",
            label: "Activate Role",
            icon: <Zap size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PrivilegeActivationWizard
                  mode="activate"
                  onClose={() => setFlow(null)}
                  onCreate={() => {
                    setFlow(null);
                    setToast("Activation submitted (pending approval + MFA)");
                  }}
                />,
              ),
          },
          {
            key: "req",
            label: "Request Access",
            icon: <Inbox size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PrivilegeActivationWizard
                  mode="request"
                  onClose={() => setFlow(null)}
                  onCreate={() => {
                    setFlow(null);
                    setToast("Access requested");
                  }}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "eligible-access"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "role", label: "Role" },
          { key: "risk", label: "Risk Level" },
          { key: "approval", label: "Approval Required" },
          { key: "mfa", label: "MFA Required" },
          { key: "scope", label: "Workspace" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "Activate", onClick: () => activate(r, "activate") },
                { label: "Request", onClick: () => activate(r, "request") },
                { label: "View Policy", onClick: open },
                { label: "View History", onClick: open },
              ]
            : [{ label: "View Policy", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.role)}
            title={r.role}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.scope} · <AStatus s={r.risk} /> · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => activate(r, "activate")}
                  >
                    Activate
                  </HeaderButton>
                  <HeaderButton onClick={() => activate(r, "request")}>
                    Request
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Role", v: r.role },
                      { k: "Risk level", v: <AStatus s={r.risk} /> },
                      { k: "Scope", v: r.scope },
                      { k: "Maximum duration", v: r.maxDur },
                      { k: "Approval required", v: r.approval },
                      { k: "MFA required", v: <AStatus s={r.mfa} /> },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Activation Policy",
                subs: [
                  {
                    label: "Activation Policy",
                    content: kvb([
                      { k: "Maximum duration", v: r.maxDur },
                      { k: "Allowed hours", v: "Business hours (08:00–20:00)" },
                      { k: "Approval chain", v: "Security Admin → Org Owner" },
                      {
                        k: "MFA requirement",
                        v: <AStatus s="Phishing-resistant" />,
                      },
                      { k: "Ticket requirement", v: "Required" },
                      { k: "Business justification", v: "Required" },
                    ]),
                  },
                ],
              },
              {
                label: "Scope",
                subs: [
                  {
                    label: "Scope",
                    content: kvb([
                      { k: "Organization", v: "Inference Defense" },
                      {
                        k: "Workspace",
                        v: r.scope.startsWith("Workspace")
                          ? r.scope.replace("Workspace: ", "")
                          : "All",
                      },
                      {
                        k: "Cloud account",
                        v: r.scope.includes("AWS")
                          ? "AWS Production"
                          : "Per scope",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Permissions",
                subs: [
                  {
                    label: "Permissions",
                    content: (
                      <>
                        <SecHead2>Platform permissions</SecHead2>
                        {tlb([
                          {
                            primary: "role.assign",
                            secondary: "Authorization",
                            right: <AStatus s="High" />,
                          },
                          {
                            primary: "workspace.manage",
                            secondary: "Workspace",
                            right: <AStatus s="High" />,
                          },
                        ])}
                        <SecHead2>Resource permissions</SecHead2>
                        {tlb([
                          {
                            primary: "AWS Production",
                            secondary: "Admin",
                            right: "",
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Agent Permissions",
                subs: [
                  {
                    label: "Agent Permissions",
                    content: tlb([
                      {
                        primary: "Execute Remediation",
                        secondary: "Cloud Remediation Agent · AWS Production",
                        right: <AStatus s="Critical" />,
                      },
                      {
                        primary: "Investigate Findings",
                        secondary: "Investigation Agent",
                        right: <AStatus s="Low" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Approval Requirements",
                subs: [
                  {
                    label: "Approval Requirements",
                    content: kvb([
                      { k: "Approvers", v: r.approval },
                      { k: "Approval chain", v: "Security Admin → Org Owner" },
                      { k: "MFA", v: <AStatus s="Required" /> },
                      { k: "Ticket", v: "Required" },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Eligibility granted",
                        secondary: "via role assignment",
                        right: "2026-01-10",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 2. ACTIVE ACCESS ────────────────────────────────────────────────────────
function ActiveAccess() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "rami@inferencedefense.com",
      role: "Enterprise Security Administrator",
      activated: "14:05",
      expires: "18:05",
      duration: "4h",
      status: "Active",
    },
    {
      id: "1",
      user: "security-ops@inferencedefense.com",
      role: "Workspace Administrator",
      activated: "09:30",
      expires: "11:30",
      duration: "2h",
      status: "Expiring",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const term = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const pick = () =>
    rows.map((r) => ({
      id: r.id,
      label: r.user,
      sub: `${r.role} · expires ${r.expires}`,
    }));
  const cols = aCols([
    ["user", "User"],
    ["role", "Role"],
    ["activated", "Activated"],
    ["expires", "Expires"],
    ["duration", "Duration"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Active Elevations"
        desc="Time-bound privileged access currently active. Each session is MFA-verified, recorded and auto-expiring."
        searchPlaceholder="Search active access"
        commands={[
          {
            key: "ext",
            label: "Extend Session",
            icon: <CalendarClock size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Extend session"
                  subtitle="Choose an active elevation to extend."
                  items={pick()}
                  actionLabel="Choose"
                  onApply={(id) =>
                    setFlow(
                      <ExtendFlow
                        current={rows.find((r) => r.id === id)?.expires ?? "—"}
                        onClose={() => setFlow(null)}
                        onDone={() => {
                          setFlow(null);
                          setToast("Session extended (re-approval logged)");
                        }}
                      />,
                    )
                  }
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "term",
            label: "Terminate Session",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Terminate session"
                  subtitle="Choose an active elevation to terminate."
                  items={pick()}
                  actionLabel="Terminate"
                  danger
                  onApply={(id) => {
                    term(id);
                    setFlow(null);
                    setToast("Session terminated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "active-access"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "role", label: "Role" },
          { key: "user", label: "User" },
          { key: "status", label: "Status" },
          { key: "expires", label: "Expiration" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <ConfirmButton
                    variant="danger"
                    label={`Terminate (${ids.length})`}
                    title="Terminate elevations"
                    body={`Terminate ${ids.length} active elevation(s)?`}
                    confirmLabel="Terminate"
                    onConfirm={() => {
                      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
                      clear();
                    }}
                  />
                  <HeaderButton
                    onClick={() => {
                      setToast("Sessions extended");
                      clear();
                    }}
                  >
                    Extend
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Session", onClick: open },
                {
                  label: "Extend",
                  onClick: () =>
                    setFlow(
                      <ExtendFlow
                        current={r.expires}
                        onClose={() => setFlow(null)}
                        onDone={() => {
                          setFlow(null);
                          setToast("Extended");
                        }}
                      />,
                    ),
                },
                { label: "Terminate", danger: true, onClick: () => term(r.id) },
                { label: "Audit History", onClick: open },
              ]
            : [{ label: "View Session", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.user}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.role} · {r.duration} · <AStatus s={r.status} /> · expires{" "}
                {r.expires}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <ExtendFlow
                          current={r.expires}
                          onClose={() => setFlow(null)}
                          onDone={() => {
                            setFlow(null);
                            setToast("Extended");
                          }}
                        />,
                      )
                    }
                  >
                    Extend
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      term(r.id);
                      close();
                    }}
                  >
                    Terminate
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "User", v: r.user },
                      { k: "Role", v: r.role },
                      { k: "Activated", v: r.activated },
                      { k: "Expires", v: r.expires },
                      { k: "Duration", v: r.duration },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Session",
                subs: [
                  {
                    label: "Session",
                    content: kvb([
                      { k: "Activation time", v: `2026-06-27 ${r.activated}` },
                      { k: "Expiration time", v: `2026-06-27 ${r.expires}` },
                      {
                        k: "Approval reference",
                        v: "apr_9f21c · ciso@inferencedefense.com",
                      },
                      { k: "Session recording", v: <AStatus s="Enabled" /> },
                      {
                        k: "MFA verification",
                        v: <AStatus s="Phishing-resistant" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Permissions",
                subs: [
                  {
                    label: "Permissions",
                    content: (
                      <>
                        <SecHead2>Platform</SecHead2>
                        {tlb([
                          {
                            primary: "role.assign",
                            secondary: "Authorization",
                            right: <AStatus s="High" />,
                          },
                        ])}
                        <SecHead2>Agent</SecHead2>
                        {tlb([
                          {
                            primary: "Execute Remediation",
                            secondary: "Cloud Remediation Agent",
                            right: <AStatus s="Critical" />,
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Resources",
                subs: [
                  {
                    label: "Resources",
                    content: tlb([
                      {
                        primary: "AWS Production",
                        secondary: "Cloud Account",
                        right: "Admin",
                      },
                      {
                        primary: "Azure Payments",
                        secondary: "Subscription",
                        right: "Admin",
                      },
                      {
                        primary: "prod-eks",
                        secondary: "Cluster",
                        right: "Read",
                      },
                      {
                        primary: "platform-vault",
                        secondary: "Vault",
                        right: "Read",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Activated",
                        secondary: r.role,
                        right: r.activated,
                      },
                      {
                        primary: "Approval granted",
                        secondary: "ciso@inferencedefense.com",
                        right: r.activated,
                      },
                      {
                        primary: "MFA completed",
                        secondary: "passkey",
                        right: r.activated,
                      },
                      {
                        primary: "Session started",
                        secondary: "recorded",
                        right: r.activated,
                      },
                      {
                        primary: "Resource accessed",
                        secondary: "AWS Production",
                        right: "14:18",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Privilege activated",
                        secondary: r.role,
                        right: r.activated,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 3. ACTIVATION REQUESTS ──────────────────────────────────────────────────
function ActivationRequests() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      reqId: "REQ-4821",
      requester: "marc@sentinel-org.io",
      role: "Security Administrator",
      submitted: "2026-06-27 08:40",
      status: "Pending",
      approvers: "ciso, platform",
    },
    {
      id: "1",
      reqId: "REQ-4820",
      requester: "rami@inferencedefense.com",
      role: "Enterprise Security Administrator",
      submitted: "2026-06-27 07:30",
      status: "Approved",
      approvers: "ciso",
    },
    {
      id: "2",
      reqId: "REQ-4815",
      requester: "contractor@ext.com",
      role: "Workspace Administrator",
      submitted: "2026-06-26 22:10",
      status: "Rejected",
      approvers: "platform",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const withdraw = (id: string) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: "Withdrawn" } : r)),
    );
  const cols = aCols([
    ["reqId", "Request ID"],
    ["requester", "Requester"],
    ["role", "Role"],
    ["submitted", "Submitted"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
    ["approvers", "Approvers"],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Activation Requests"
        desc="Privileged activation requests awaiting approval, with full status and approver visibility."
        searchPlaceholder="Search requests"
        commands={[
          {
            key: "new",
            label: "Create Request",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PrivilegeActivationWizard
                  mode="request"
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [
                      {
                        id: `q${Date.now()}`,
                        reqId: `REQ-${4822 + rs.length}`,
                        requester: "you",
                        role: d.role,
                        submitted: new Date()
                          .toISOString()
                          .slice(0, 16)
                          .replace("T", " "),
                        status: "Pending",
                        approvers: d.approvers.split("@")[0],
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast("Request created");
                  }}
                />,
              ),
          },
          {
            key: "wd",
            label: "Withdraw Request",
            icon: <Undo2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Withdraw request"
                  subtitle="Choose a pending request to withdraw."
                  items={rows
                    .filter((r) => r.status === "Pending")
                    .map((r) => ({
                      id: r.id,
                      label: r.reqId,
                      sub: `${r.requester} · ${r.role}`,
                    }))}
                  actionLabel="Withdraw"
                  danger
                  onApply={(id) => {
                    withdraw(id);
                    setFlow(null);
                    setToast("Request withdrawn");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "activation-requests"),
          },
        ]}
        filterDefs={[
          { key: "role", label: "Role" },
          { key: "status", label: "Status" },
          { key: "requester", label: "Requester" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                ...(r.status === "Pending"
                  ? [
                      {
                        label: "Withdraw",
                        danger: true,
                        onClick: () => withdraw(r.id),
                      },
                    ]
                  : []),
                { label: "View Approval Chain", onClick: open },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.requester)}
            title={`${r.reqId} — ${r.requester}`}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.role} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit && r.status === "Pending" ? (
                <HeaderButton
                  onClick={() => {
                    withdraw(r.id);
                    close();
                  }}
                >
                  Withdraw
                </HeaderButton>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Request ID", v: r.reqId },
                      { k: "Requester", v: r.requester },
                      { k: "Role", v: r.role },
                      { k: "Submitted", v: r.submitted },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      { k: "Approvers", v: r.approvers },
                    ]),
                  },
                ],
              },
              {
                label: "Justification",
                subs: [
                  {
                    label: "Justification",
                    content: kvb([
                      {
                        k: "Business reason",
                        v: "Production incident remediation",
                      },
                      { k: "Ticket", v: "JIRA-4821" },
                      { k: "Requested duration", v: "4h" },
                      {
                        k: "Emergency flag",
                        v: (
                          <AStatus
                            s={r.role.includes("Enterprise") ? "Yes" : "No"}
                          />
                        ),
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Approvals",
                subs: [
                  {
                    label: "Approvals",
                    content: tlb([
                      {
                        primary: "ciso@inferencedefense.com",
                        secondary:
                          r.status === "Approved"
                            ? "Approved"
                            : r.status === "Rejected"
                              ? "Rejected · insufficient justification"
                              : "Pending",
                        right: r.submitted,
                      },
                      {
                        primary: "platform@inferencedefense.com",
                        secondary: r.status === "Pending" ? "Awaiting" : "—",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Scope",
                subs: [
                  {
                    label: "Scope",
                    content: kvb([
                      { k: "Organization", v: "Inference Defense" },
                      {
                        k: "Workspace",
                        v: r.role.includes("Workspace") ? "Payments" : "All",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Timeline",
                subs: [
                  {
                    label: "Timeline",
                    content: tlb([
                      {
                        primary: "Submitted",
                        secondary: r.requester,
                        right: r.submitted,
                      },
                      {
                        primary: r.status,
                        secondary: "approval chain",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Activation requested",
                        secondary: r.reqId,
                        right: r.submitted,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 4. APPROVALS ────────────────────────────────────────────────────────────
function PrivApprovals() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      reqId: "REQ-4821",
      requester: "marc@sentinel-org.io",
      role: "Security Administrator",
      risk: "High",
      submitted: "2026-06-27 08:40",
      status: "Pending",
    },
    {
      id: "1",
      reqId: "REQ-4823",
      requester: "ops@inferencedefense.com",
      role: "Workspace Administrator",
      risk: "High",
      submitted: "2026-06-27 08:55",
      status: "Pending",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const decide = (id: string, s: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: s } : r)));
  const cols = aCols([
    ["reqId", "Request"],
    ["requester", "Requester"],
    ["role", "Role"],
    ["risk", "Risk", (r) => <AStatus s={r.risk} />],
    ["submitted", "Submitted"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Approvals — privileged access work queue"
        desc="Review, approve, reject or delegate privileged activation requests. Used by security admins, organization owners and approvers."
        searchPlaceholder="Search approvals"
        commands={[
          {
            key: "ap",
            label: "Approve",
            icon: <CheckCircle2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Approve request"
                  subtitle="Choose a pending request to approve."
                  items={rows
                    .filter((r) => r.status === "Pending")
                    .map((r) => ({
                      id: r.id,
                      label: r.reqId,
                      sub: `${r.requester} · ${r.role}`,
                    }))}
                  actionLabel="Approve"
                  onApply={(id) => {
                    decide(id, "Approved");
                    setFlow(null);
                    setToast("Request approved");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "rj",
            label: "Reject",
            icon: <XCircle size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Reject request"
                  subtitle="Choose a pending request to reject."
                  items={rows
                    .filter((r) => r.status === "Pending")
                    .map((r) => ({
                      id: r.id,
                      label: r.reqId,
                      sub: `${r.requester} · ${r.role}`,
                    }))}
                  actionLabel="Choose"
                  danger
                  onApply={(id) =>
                    setFlow(
                      <RejectFlow
                        onClose={() => setFlow(null)}
                        onDone={() => {
                          decide(id, "Rejected");
                          setFlow(null);
                          setToast("Request rejected");
                        }}
                      />,
                    )
                  }
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "dg",
            label: "Delegate",
            icon: <Share2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Delegate approval"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Delegated to ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "approvals"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "status", label: "Status" },
          { key: "role", label: "Role" },
          { key: "risk", label: "Risk" },
          { key: "requester", label: "Approver" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => decide(id, "Approved"));
                      setToast("Approved");
                      clear();
                    }}
                  >
                    Approve
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => decide(id, "Rejected"));
                      setToast("Rejected");
                      clear();
                    }}
                  >
                    Reject
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "Approve", onClick: () => decide(r.id, "Approved") },
                {
                  label: "Reject",
                  danger: true,
                  onClick: () =>
                    setFlow(
                      <RejectFlow
                        onClose={() => setFlow(null)}
                        onDone={() => {
                          decide(r.id, "Rejected");
                          setFlow(null);
                          setToast("Rejected");
                        }}
                      />,
                    ),
                },
                {
                  label: "Delegate",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title="Delegate approval"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Delegated to ${s}`);
                        }}
                      />,
                    ),
                },
                { label: "View Request", onClick: open },
              ]
            : [{ label: "View Request", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.requester)}
            title={`${r.reqId} — review`}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.requester} · {r.role} · <AStatus s={r.risk} />
              </span>
            }
            actions={
              canEdit && r.status === "Pending" ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => {
                      decide(r.id, "Approved");
                      close();
                    }}
                  >
                    Approve
                  </HeaderButton>
                  <HeaderButton
                    variant="danger"
                    onClick={() =>
                      setFlow(
                        <RejectFlow
                          onClose={() => setFlow(null)}
                          onDone={() => {
                            decide(r.id, "Rejected");
                            setFlow(null);
                            setToast("Rejected");
                          }}
                        />,
                      )
                    }
                  >
                    Reject
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <AssignFlow
                          title="Delegate approval"
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            setFlow(null);
                            setToast(`Delegated to ${s}`);
                          }}
                        />,
                      )
                    }
                  >
                    Delegate
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Request Summary",
                subs: [
                  {
                    label: "Request Summary",
                    content: kvb([
                      { k: "Request", v: r.reqId },
                      { k: "Requester", v: r.requester },
                      { k: "Role", v: r.role },
                      { k: "Submitted", v: r.submitted },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Risk Assessment",
                subs: [
                  {
                    label: "Risk Assessment",
                    content: kvb([
                      { k: "Risk level", v: <AStatus s={r.risk} /> },
                      {
                        k: "Sensitive resources",
                        v: "AWS Production, platform-vault",
                      },
                      { k: "Production access", v: <AStatus s="Yes" /> },
                      {
                        k: "Agent execution rights",
                        v: <AStatus s="Execute Remediation (critical)" />,
                      },
                      {
                        k: "Potential impact",
                        v: "Can trigger remediation against production cloud",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Permissions",
                subs: [
                  {
                    label: "Permissions",
                    content: tlb([
                      {
                        primary: "role.assign",
                        secondary: "Authorization",
                        right: <AStatus s="High" />,
                      },
                      {
                        primary: "Execute Remediation",
                        secondary: "Agent · AWS Production",
                        right: <AStatus s="Critical" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Resource Impact",
                subs: [
                  {
                    label: "Resource Impact",
                    content: tlb([
                      {
                        primary: "AWS Production",
                        secondary: "Admin",
                        right: <AStatus s="Critical" />,
                      },
                      {
                        primary: "platform-vault",
                        secondary: "Read",
                        right: <AStatus s="High" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Approval Chain",
                subs: [
                  {
                    label: "Approval Chain",
                    content: tlb([
                      {
                        primary: "ciso@inferencedefense.com",
                        secondary: "Stage 1",
                        right: r.status === "Pending" ? "Pending" : r.status,
                      },
                      {
                        primary: "org-owner@inferencedefense.com",
                        secondary: "Stage 2",
                        right: "Awaiting",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Request submitted",
                        secondary: r.reqId,
                        right: r.submitted,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 5. EMERGENCY ACCESS ─────────────────────────────────────────────────────
function EmergencyAccess() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "ciso@inferencedefense.com",
      role: "Organization Owner",
      reason: "Production outage — payments",
      activated: "03:12",
      duration: "1h",
      status: "Active",
      incident: "INC-2026-0077",
      approver: "org-owner@inferencedefense.com",
      exec: "Yes",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const term = (id: string) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: "Terminated" } : r)),
    );
  const cols = aCols([
    ["user", "User"],
    ["role", "Role"],
    ["reason", "Reason"],
    ["activated", "Activated"],
    ["duration", "Duration"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Emergency Access — break-glass"
        desc="Highest-risk capability. Heavily governed: Incident ID, executive approval, recorded session and continuous monitoring are mandatory."
        searchPlaceholder="Search emergency access"
        kpi={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "11px 14px",
              borderRadius: 8,
              background: "var(--cg-danger-bg)",
              border: `1px solid var(--cg-danger-border)`,
              color: T.danger,
              fontSize: 12.5,
              marginBottom: 16,
            }}
          >
            <ShieldAlert size={16} /> Emergency access is fully audited and
            continuously monitored.
          </div>
        }
        commands={[
          {
            key: "init",
            label: "Initiate Emergency Access",
            icon: <ShieldAlert size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <EmergencyFlow
                  onClose={() => setFlow(null)}
                  onCreate={(row) => {
                    setRows((rs) => [row, ...rs]);
                    setFlow(null);
                    setToast("Emergency access initiated — SIEM alerted");
                  }}
                />,
              ),
          },
          {
            key: "dis",
            label: "Disable Emergency Access",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Disable emergency access"
                  subtitle="Choose an active break-glass session to terminate."
                  items={rows
                    .filter((r) => r.status === "Active")
                    .map((r) => ({ id: r.id, label: r.user, sub: r.incident }))}
                  actionLabel="Terminate"
                  danger
                  onApply={(id) => {
                    term(id);
                    setFlow(null);
                    setToast("Emergency access terminated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "emergency-access"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "role", label: "Role" },
          { key: "status", label: "Status" },
          { key: "user", label: "User" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "Terminate", danger: true, onClick: () => term(r.id) },
                { label: "Audit", onClick: open },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.user}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.role} · {r.incident} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit && r.status === "Active" ? (
                <HeaderButton
                  variant="danger"
                  onClick={() => {
                    term(r.id);
                    close();
                  }}
                >
                  Terminate
                </HeaderButton>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "User", v: r.user },
                      { k: "Role", v: r.role },
                      { k: "Reason", v: r.reason },
                      { k: "Activated", v: r.activated },
                      { k: "Duration", v: r.duration },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Justification",
                subs: [
                  {
                    label: "Justification (mandatory)",
                    content: kvb([
                      { k: "Incident ID", v: r.incident },
                      { k: "Reason", v: r.reason },
                      { k: "Approver", v: r.approver },
                      { k: "Duration", v: r.duration },
                      {
                        k: "Executive approval",
                        v: <AStatus s={r.exec === "Yes" ? "Yes" : "danger"} />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Session Activity",
                subs: [
                  {
                    label: "Session Activity",
                    content: tlb([
                      {
                        primary: "Break-glass session opened",
                        secondary: "recorded · SIEM alerted",
                        right: r.activated,
                      },
                      {
                        primary: "Resource accessed",
                        secondary: "AWS Production",
                        right: "03:15",
                      },
                      {
                        primary: "Remediation executed",
                        secondary: "payments rollback",
                        right: "03:22",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Resources Accessed",
                subs: [
                  {
                    label: "Resources Accessed",
                    content: tlb([
                      {
                        primary: "AWS Production",
                        secondary: "Cloud Account · Admin",
                        right: "",
                      },
                      {
                        primary: "platform-vault",
                        secondary: "Vault · Read",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Timeline",
                subs: [
                  {
                    label: "Timeline",
                    content: tlb([
                      {
                        primary: "Emergency access activated",
                        secondary: r.approver,
                        right: r.activated,
                      },
                      ...(r.status === "Terminated"
                        ? [
                            {
                              primary: "Emergency access terminated",
                              secondary: "manual",
                              right: "04:00",
                            },
                          ]
                        : []),
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Emergency access activated",
                        secondary: r.incident,
                        right: r.activated,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 6. ACCESS HISTORY ───────────────────────────────────────────────────────
function AccessHistory() {
  const SEED: ARow[] = [
    {
      id: "0",
      timestamp: "2026-06-27 14:05",
      user: "rami@inferencedefense.com",
      role: "Enterprise Security Administrator",
      action: "Privilege Activated",
      duration: "4h",
      result: "Success",
    },
    {
      id: "1",
      timestamp: "2026-06-27 08:40",
      user: "marc@sentinel-org.io",
      role: "Security Administrator",
      action: "Activation Requested",
      duration: "—",
      result: "Pending",
    },
    {
      id: "2",
      timestamp: "2026-06-26 22:10",
      user: "contractor@ext.com",
      role: "Workspace Administrator",
      action: "Activation Rejected",
      duration: "—",
      result: "Rejected",
    },
    {
      id: "3",
      timestamp: "2026-06-26 03:12",
      user: "ciso@inferencedefense.com",
      role: "Organization Owner",
      action: "Emergency Access Activated",
      duration: "1h",
      result: "Success",
    },
  ];
  const [rows] = React.useState<ARow[]>(SEED);
  const cols = aCols([
    ["timestamp", "Timestamp"],
    ["user", "User"],
    ["role", "Role"],
    ["action", "Action"],
    ["duration", "Duration"],
    ["result", "Result", (r) => <AStatus s={r.result} />],
  ]);
  return (
    <AuthCollection
      title="Access History"
      desc="Complete, read-only, immutable historical record of all privileged access activity."
      searchPlaceholder="Search history"
      commands={[
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "access-history"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {},
        },
      ]}
      filterDefs={[
        { key: "role", label: "Role" },
        { key: "user", label: "User" },
        { key: "action", label: "Action" },
        { key: "result", label: "Result" },
      ]}
      columns={cols}
      rows={rows}
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.user)}
          title={`${r.action} — ${r.user}`}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.role} · <AStatus s={r.result} /> · {r.timestamp}
            </span>
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Timestamp", v: r.timestamp },
                    { k: "User", v: r.user },
                    { k: "Role", v: r.role },
                    { k: "Action", v: r.action },
                    { k: "Duration", v: r.duration },
                    { k: "Result", v: <AStatus s={r.result} /> },
                  ]),
                },
              ],
            },
            {
              label: "Permissions",
              subs: [
                {
                  label: "Permissions",
                  content: tlb([
                    {
                      primary: "role.assign",
                      secondary: "Authorization",
                      right: <AStatus s="High" />,
                    },
                    {
                      primary: "Execute Remediation",
                      secondary: "Agent",
                      right: <AStatus s="Critical" />,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Resources",
              subs: [
                {
                  label: "Resources",
                  content: tlb([
                    {
                      primary: "AWS Production",
                      secondary: "Cloud Account",
                      right: "Admin",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Activity Timeline",
              subs: [
                {
                  label: "Activity Timeline",
                  content: tlb([
                    {
                      primary: r.action,
                      secondary: r.role,
                      right: r.timestamp,
                    },
                    {
                      primary: "MFA completed",
                      secondary: "passkey",
                      right: r.timestamp,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Audit Evidence",
              subs: [
                {
                  label: "Audit Evidence",
                  content: kvb([
                    { k: "Event hash", v: `0x${r.id}9f21c4a91e` },
                    { k: "Recorded by", v: "tamper-evident ledger" },
                    { k: "Session recording", v: <AStatus s="Available" /> },
                    { k: "Approval reference", v: "apr_9f21c" },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}
// ════════════════════════════════════════════════════════════════════════════
// §7.7 Service Identities — non-human identities, on the shared Users hierarchy
// (AuthCollection + shared DetailDrawer via AuthEntityDrawer + StatusIndicator).
// ════════════════════════════════════════════════════════════════════════════
const SVC_TYPES = [
  "Service Account",
  "API Client",
  "OAuth App",
  "Workload Identity",
  "Bot",
  "Integration Account",
];
function CreateServiceFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    name: "",
    type: SVC_TYPES[0],
    owner: "",
    workspace: "Production",
    roles: "Viewer",
    env: "Production",
    description: "",
  });
  const err = !f.name.trim();
  return (
    <Drawer
      title="Create service identity"
      subtitle="Provision a non-human identity (service account, API client, workload identity)."
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `s${Date.now()}`,
                name: f.name.trim(),
                type: f.type,
                owner: f.owner || "you",
                team: "Platform",
                bu: "Engineering",
                workspace: f.workspace,
                roles: f.roles,
                creds: "1",
                credStatus: "Healthy",
                lastActivity: "—",
                status: "Active",
                created: new Date().toISOString().slice(0, 10),
                createdBy: "you",
                expiration: "2027-01-01",
                description: f.description,
                env: f.env,
                tags: "",
              })
            }
          >
            Create
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Name" err={err}>
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          style={errInp(err)}
          placeholder="e.g. ci-deploy"
        />
      </Req>
      <Field label="Type">
        <Sel
          value={f.type}
          onChange={(v) => setF({ ...f, type: v })}
          opts={SVC_TYPES}
        />
      </Field>
      <Field label="Owner">
        <input
          value={f.owner}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
          style={inp}
          placeholder="owner@company.com"
        />
      </Field>
      <Field label="Workspace">
        <Sel
          value={f.workspace}
          onChange={(v) => setF({ ...f, workspace: v })}
          opts={["Production", "SOC", "Lab"]}
        />
      </Field>
      <Field label="Role">
        <Sel
          value={f.roles}
          onChange={(v) => setF({ ...f, roles: v })}
          opts={["Viewer", "Deployer", "Scanner", "Auditor", "Operator"]}
        />
      </Field>
      <Field label="Environment">
        <Sel
          value={f.env}
          onChange={(v) => setF({ ...f, env: v })}
          opts={["Production", "Staging", "Development"]}
        />
      </Field>
      <Field label="Description">
        <textarea
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          rows={3}
          style={{ ...inp, height: "auto", padding: 11, resize: "vertical" }}
        />
      </Field>
    </Drawer>
  );
}
function ServiceTab() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "s1",
      name: "ci-deploy",
      type: "Service Account",
      owner: "rami@inferencedefense.com",
      team: "Platform",
      bu: "Engineering",
      workspace: "Production",
      roles: "Deployer",
      creds: "2",
      credStatus: "Healthy",
      lastActivity: "2026-06-24 06:12",
      status: "Active",
      created: "2025-03-04",
      createdBy: "rami@inferencedefense.com",
      expiration: "2026-09-01",
      description: "CI/CD pipeline deploy identity for production releases.",
      env: "Production",
      tags: "ci, deploy",
    },
    {
      id: "s2",
      name: "siem-export",
      type: "API Client",
      owner: "security-ops@inferencedefense.com",
      team: "Security Operations",
      bu: "Security",
      workspace: "SOC",
      roles: "Auditor",
      creds: "1",
      credStatus: "Expiring",
      lastActivity: "2026-06-23 22:40",
      status: "Active",
      created: "2025-06-11",
      createdBy: "security-ops@inferencedefense.com",
      expiration: "2026-07-09",
      description: "Reads the audit ledger and ships events to the SIEM.",
      env: "Production",
      tags: "audit, siem",
    },
    {
      id: "s3",
      name: "connector-aws",
      type: "Workload Identity",
      owner: "platform@inferencedefense.com",
      team: "Platform",
      bu: "Engineering",
      workspace: "Production",
      roles: "Scanner",
      creds: "1",
      credStatus: "Healthy",
      lastActivity: "2026-06-24 05:01",
      status: "Active",
      created: "2025-01-20",
      createdBy: "rami@inferencedefense.com",
      expiration: "2027-01-20",
      description: "Federated STS workload identity for AWS account scanning.",
      env: "Production",
      tags: "aws, scan",
    },
    {
      id: "s4",
      name: "legacy-bot",
      type: "Bot",
      owner: "lab-admin@inferencedefense.com",
      team: "Devence Lab",
      bu: "R&D",
      workspace: "Lab",
      roles: "Viewer",
      creds: "1",
      credStatus: "Expired",
      lastActivity: "2026-03-30 11:20",
      status: "Disabled",
      created: "2024-11-02",
      createdBy: "lab-admin@inferencedefense.com",
      expiration: "2026-03-30",
      description: "Deprecated chat bot — disabled pending decommission.",
      env: "Staging",
      tags: "legacy",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const setStatus = (id: string, s: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: s } : r)));
  const rotate = (id: string) =>
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? { ...r, credStatus: "Healthy", creds: String(Number(r.creds) + 1) }
          : r,
      ),
    );
  const pick = () =>
    rows.map((r) => ({
      id: r.id,
      label: r.name,
      sub: `${r.type} · ${r.workspace}`,
    }));
  const cols = aCols([
    ["name", "Name"],
    ["type", "Type"],
    ["owner", "Owner"],
    ["workspace", "Workspace"],
    ["roles", "Roles"],
    [
      "creds",
      "Credentials",
      (r) => (
        <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
          {r.creds} · <AStatus s={r.credStatus} />
        </span>
      ),
    ],
    ["lastActivity", "Last Activity"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Service Identities"
        desc="Non-human identities — service accounts, API clients, OAuth apps, workload and federated identities. Owned, scoped and credential-governed."
        searchPlaceholder="Search service identities"
        commands={[
          {
            key: "new",
            label: "Create Service Identity",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateServiceFlow
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [d, ...rs]);
                    setFlow(null);
                    setToast("Service identity created");
                  }}
                />,
              ),
          },
          {
            key: "rot",
            label: "Rotate Credentials",
            icon: <RotateCcw size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Rotate credentials"
                  subtitle="Choose a service identity to rotate its credentials."
                  items={pick()}
                  actionLabel="Rotate"
                  onApply={(id) => {
                    rotate(id);
                    setFlow(null);
                    setToast("Credentials rotated");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "dis",
            label: "Disable",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Disable service identity"
                  subtitle="Choose a service identity to disable."
                  items={pick()}
                  actionLabel="Disable"
                  danger
                  onApply={(id) => {
                    setStatus(id, "Disabled");
                    setFlow(null);
                    setToast("Disabled");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "service-identities"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "type", label: "Type" },
          { key: "workspace", label: "Workspace" },
          { key: "owner", label: "Owner" },
          { key: "status", label: "Status" },
          { key: "credStatus", label: "Credential" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => rotate(id));
                      setToast("Credentials rotated");
                      clear();
                    }}
                  >
                    Rotate Credentials
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => setStatus(id, "Disabled"));
                      clear();
                    }}
                  >
                    Disable
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      authCsv(
                        rows.filter((r) => ids.includes(r.id)),
                        "service-identities",
                      );
                      clear();
                    }}
                  >
                    Export
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "Edit", onClick: () => setToast(`Editing ${r.name}`) },
                {
                  label: "Rotate Credentials",
                  onClick: () => {
                    rotate(r.id);
                    setToast("Credentials rotated");
                  },
                },
                {
                  label: r.status === "Disabled" ? "Enable" : "Disable",
                  onClick: () =>
                    setStatus(
                      r.id,
                      r.status === "Disabled" ? "Active" : "Disabled",
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.name)}
            title={r.name}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.type} · {r.workspace} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Editing")}>
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      rotate(r.id);
                      setToast("Credentials rotated");
                    }}
                  >
                    Rotate Credentials
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setStatus(
                        r.id,
                        r.status === "Disabled" ? "Active" : "Disabled",
                      );
                      close();
                    }}
                  >
                    {r.status === "Disabled" ? "Enable" : "Disable"}
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => authCsv([r], `service-${r.name}`)}
                  >
                    Export
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Profile",
                subs: [
                  {
                    label: "General",
                    content: kvb([
                      { k: "Name", v: r.name },
                      { k: "Type", v: r.type },
                      { k: "Description", v: r.description },
                      { k: "Environment", v: r.env },
                      { k: "Tags", v: r.tags || "—" },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                  {
                    label: "Ownership",
                    content: kvb([
                      { k: "Owner", v: r.owner },
                      { k: "Team", v: r.team },
                      { k: "Business unit", v: r.bu },
                      { k: "Created by", v: r.createdBy },
                      { k: "Created", v: r.created },
                    ]),
                  },
                ],
              },
              {
                label: "Access",
                subs: [
                  {
                    label: "Access",
                    content: (
                      <>
                        {kvb([
                          { k: "Workspace", v: r.workspace },
                          { k: "Roles", v: r.roles },
                        ])}
                        <SecHead2>Resource access</SecHead2>
                        {tlb([
                          {
                            primary: "AWS Production",
                            secondary:
                              r.roles === "Scanner" ? "Read (STS)" : "—",
                            right: r.workspace,
                          },
                          {
                            primary: "Audit ledger",
                            secondary: r.roles === "Auditor" ? "Read" : "—",
                            right: r.workspace,
                          },
                        ])}
                        <SecHead2>Effective access</SecHead2>
                        {tlb([
                          {
                            primary: `${r.name} → ${r.roles} → permission → resource`,
                            secondary: "authorization path",
                            right: "",
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Credentials",
                subs: [
                  {
                    label: "Credentials",
                    content: (
                      <>
                        {kvb([
                          { k: "Active credentials", v: r.creds },
                          {
                            k: "Credential health",
                            v: <AStatus s={r.credStatus} />,
                          },
                          { k: "Expiration", v: r.expiration },
                          {
                            k: "Type",
                            v:
                              r.type === "Workload Identity"
                                ? "Federated (STS certificate)"
                                : r.type === "API Client"
                                  ? "API key"
                                  : "OIDC token",
                          },
                        ])}
                        {tlb([
                          {
                            primary:
                              r.type === "API Client"
                                ? "ak_live_••••8f2c"
                                : "oidc-token",
                            secondary: `health: ${r.credStatus}`,
                            right: r.expiration,
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => {
                                rotate(r.id);
                                setToast("Credentials rotated");
                              }}
                            >
                              Rotate
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Credential revoked")}
                            >
                              Revoke
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Authenticated",
                        secondary: r.type,
                        right: r.lastActivity,
                      },
                      {
                        primary: "Credential rotated",
                        secondary: "scheduled",
                        right: "2026-05-01",
                      },
                      {
                        primary: "Created",
                        secondary: `by ${r.createdBy}`,
                        right: r.created,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Service identity created",
                        secondary: `by ${r.createdBy}`,
                        right: r.created,
                      },
                      {
                        primary: "Role assigned",
                        secondary: r.roles,
                        right: r.created,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// §7.8 Identity Providers — federated IdPs (SAML / OIDC / LDAP / SCIM) on the
// shared Users hierarchy (AuthCollection + AuthEntityDrawer + StatusIndicator).
// ════════════════════════════════════════════════════════════════════════════
const PROV_TYPES = ["OIDC", "SAML", "LDAP", "SCIM"];
function AddProviderFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    name: "",
    type: "OIDC",
    protocol: "OpenID Connect",
    endpoint: "",
    tenant: "",
    owner: "",
  });
  const err = !f.name.trim();
  return (
    <Drawer
      title="Add identity provider"
      subtitle="Connect a federated identity provider for SSO and provisioning."
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `p${Date.now()}`,
                name: f.name.trim(),
                type: f.type,
                protocol: f.protocol,
                usersSynced: "0",
                groupsSynced: "0",
                status: "Warning",
                syncStatus: "Idle",
                lastSync: "—",
                health: "Degraded",
                owner: f.owner || "you",
                endpoint: f.endpoint,
                tenant: f.tenant,
              })
            }
          >
            Add provider
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Name" err={err}>
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          style={errInp(err)}
          placeholder="e.g. Microsoft Entra ID"
        />
      </Req>
      <Field label="Type">
        <Sel
          value={f.type}
          onChange={(v) =>
            setF({
              ...f,
              type: v,
              protocol:
                v === "OIDC"
                  ? "OpenID Connect"
                  : v === "SAML"
                    ? "SAML 2.0"
                    : v === "LDAP"
                      ? "LDAPS"
                      : "SCIM 2.0",
            })
          }
          opts={PROV_TYPES}
        />
      </Field>
      <Field label="Endpoint">
        <input
          value={f.endpoint}
          onChange={(e) => setF({ ...f, endpoint: e.target.value })}
          style={inp}
          placeholder="https://login.…"
        />
      </Field>
      <Field label="Tenant / Domain">
        <input
          value={f.tenant}
          onChange={(e) => setF({ ...f, tenant: e.target.value })}
          style={inp}
          placeholder="company.onmicrosoft.com"
        />
      </Field>
      <Field label="Owner">
        <input
          value={f.owner}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
          style={inp}
          placeholder="owner@company.com"
        />
      </Field>
    </Drawer>
  );
}
function AuthModeControl({
  mode,
  setMode,
  canEdit,
}: {
  mode: "Federated" | "Native";
  setMode: (m: "Federated" | "Native") => void;
  canEdit: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        padding: "12px 14px",
        borderRadius: 10,
        background: "var(--cg-accent-bg)",
        border: "1px solid var(--cg-accent)",
        marginBottom: 16,
      }}
    >
      <Network size={18} color={T.accent} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
          Tenant authentication mode
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
          {mode === "Federated"
            ? "Users authenticate through your connected identity provider. CloudGuard does not store primary credentials."
            : "Users authenticate with CloudGuard-native sign-in. Keep native accounts minimal and audited — federation is recommended for production."}
        </div>
      </div>
      <div style={{ display: "inline-flex", gap: 5, flexShrink: 0 }}>
        {(["Federated", "Native"] as const).map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              disabled={!canEdit}
              onClick={() => setMode(m)}
              style={{
                height: 30,
                padding: "0 13px",
                borderRadius: 7,
                border: `1px solid ${on ? "var(--cg-accent)" : "var(--cg-border-card)"}`,
                background: on ? T.accent : "transparent",
                color: on ? "#fff" : T.textNav,
                fontSize: 12.5,
                fontWeight: on ? 600 : 400,
                cursor: canEdit ? "pointer" : "not-allowed",
              }}
            >
              {m === "Federated" ? "Federated (SSO)" : "Native sign-in"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function ProvidersTab() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "p1",
      name: "Microsoft Entra ID",
      type: "OIDC",
      protocol: "OpenID Connect",
      usersSynced: "214",
      groupsSynced: "18",
      status: "Connected",
      syncStatus: "Idle",
      lastSync: "2026-06-24 06:00",
      health: "Healthy",
      owner: "rami@inferencedefense.com",
      endpoint: "https://login.microsoftonline.com/…",
      tenant: "inferencedefense.onmicrosoft.com",
    },
    {
      id: "p2",
      name: "Okta (Partners)",
      type: "SAML",
      protocol: "SAML 2.0",
      usersSynced: "37",
      groupsSynced: "4",
      status: "Warning",
      syncStatus: "Idle",
      lastSync: "2026-06-23 18:30",
      health: "Degraded",
      owner: "security-ops@inferencedefense.com",
      endpoint: "https://partners.okta.com/app/…",
      tenant: "partners.okta.com",
    },
    {
      id: "p3",
      name: "Corporate AD (LDAP)",
      type: "LDAP",
      protocol: "LDAPS",
      usersSynced: "0",
      groupsSynced: "0",
      status: "Error",
      syncStatus: "Failed",
      lastSync: "2026-06-20 02:10",
      health: "Down",
      owner: "platform@inferencedefense.com",
      endpoint: "ldaps://dc01.corp.local:636",
      tenant: "corp.local",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const sync = (id: string) =>
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              syncStatus: "Idle",
              lastSync: new Date().toISOString().slice(0, 16).replace("T", " "),
              status: "Connected",
              health: "Healthy",
            }
          : r,
      ),
    );
  const pick = () =>
    rows.map((r) => ({
      id: r.id,
      label: r.name,
      sub: `${r.type} · ${r.tenant}`,
    }));
  const [mode, setMode] = React.useState<"Federated" | "Native">("Federated");
  const cols = aCols([
    ["name", "Provider"],
    ["type", "Type"],
    ["protocol", "Protocol"],
    ["usersSynced", "Users Synced"],
    ["groupsSynced", "Groups Synced"],
    ["syncStatus", "Sync", (r) => <AStatus s={r.syncStatus} />],
    ["health", "Health", (r) => <AStatus s={r.health} />],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Identity Providers"
        desc="Federation-first: connect your identity provider for SSO and provisioning (SAML, OIDC, LDAP, SCIM). Native sign-in is available per tenant for break-glass."
        searchPlaceholder="Search providers"
        kpi={
          <AuthModeControl mode={mode} setMode={setMode} canEdit={canEdit} />
        }
        commands={[
          {
            key: "new",
            label: "Add Provider",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AddProviderFlow
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [d, ...rs]);
                    setFlow(null);
                    setToast("Provider added");
                  }}
                />,
              ),
          },
          {
            key: "sync",
            label: "Sync Now",
            icon: <RotateCw size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Sync provider"
                  subtitle="Choose a provider to synchronize now."
                  items={pick()}
                  actionLabel="Sync"
                  onApply={(id) => {
                    sync(id);
                    setFlow(null);
                    setToast("Sync started");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "test",
            label: "Test Connection",
            icon: <Plug size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Test connection"
                  subtitle="Choose a provider to test connectivity."
                  items={pick()}
                  actionLabel="Test"
                  onApply={() => {
                    setFlow(null);
                    setToast("Connection test passed");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "identity-providers"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "health", label: "Health" },
          { key: "syncStatus", label: "Sync" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => sync(id));
                      setToast("Sync started");
                      clear();
                    }}
                  >
                    Sync Now
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      authCsv(
                        rows.filter((r) => ids.includes(r.id)),
                        "identity-providers",
                      );
                      clear();
                    }}
                  >
                    Export
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "Edit", onClick: () => setToast(`Editing ${r.name}`) },
                {
                  label: "Sync Now",
                  onClick: () => {
                    sync(r.id);
                    setToast("Sync started");
                  },
                },
                {
                  label: "Test Connection",
                  onClick: () => setToast("Connection test passed"),
                },
                {
                  label: "Disable",
                  danger: true,
                  onClick: () =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? { ...x, status: "Error", health: "Down" }
                          : x,
                      ),
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.name)}
            title={r.name}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.protocol} · <AStatus s={r.status} /> ·{" "}
                <AStatus s={r.health} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Editing")}>
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    variant="primary"
                    onClick={() => {
                      sync(r.id);
                      setToast("Sync started");
                    }}
                  >
                    Sync Now
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => setToast("Connection test passed")}
                  >
                    Test Connection
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "General",
                    content: kvb([
                      { k: "Provider", v: r.name },
                      { k: "Type", v: r.type },
                      { k: "Protocol", v: r.protocol },
                      { k: "Owner", v: r.owner },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                  {
                    label: "Connection",
                    content: kvb([
                      { k: "Endpoint", v: r.endpoint },
                      { k: "Tenant / domain", v: r.tenant },
                      { k: "Last sync", v: r.lastSync },
                    ]),
                  },
                  {
                    label: "Statistics",
                    content: kvb([
                      { k: "Users synced", v: r.usersSynced },
                      { k: "Groups synced", v: r.groupsSynced },
                      {
                        k: "Provisioning",
                        v:
                          r.type === "SCIM" || r.type === "OIDC"
                            ? "Enabled"
                            : "Manual",
                      },
                    ]),
                  },
                  {
                    label: "Health",
                    content: kvb([
                      { k: "Health", v: <AStatus s={r.health} /> },
                      { k: "Sync status", v: <AStatus s={r.syncStatus} /> },
                      {
                        k: "Certificate",
                        v: r.health === "Down" ? "Unreachable" : "Valid · 312d",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Authentication",
                subs: [
                  {
                    label: "Protocol",
                    content: kvb([
                      { k: "Protocol", v: r.protocol },
                      {
                        k: "Binding",
                        v:
                          r.type === "SAML"
                            ? "HTTP-POST"
                            : r.type === "OIDC"
                              ? "Authorization Code + PKCE"
                              : "—",
                      },
                      {
                        k: "Signing",
                        v: r.type === "SAML" ? "RSA-SHA256" : "RS256",
                      },
                    ]),
                  },
                  {
                    label: "Login Configuration",
                    content: kvb([
                      { k: "Sign-in URL", v: r.endpoint },
                      { k: "MFA", v: <AStatus s="Required" /> },
                      {
                        k: "Just-in-time provisioning",
                        v: r.type === "OIDC" ? "Enabled" : "Disabled",
                      },
                    ]),
                  },
                  {
                    label: "Certificates",
                    content: tlb([
                      {
                        primary: "Signing certificate",
                        secondary:
                          r.health === "Down"
                            ? "expired / unreachable"
                            : "valid",
                        right:
                          r.health === "Down" ? (
                            <AStatus s="Expired" />
                          ) : (
                            <AStatus s="Valid" />
                          ),
                      },
                      {
                        primary: "Encryption certificate",
                        secondary: r.type === "SAML" ? "valid" : "—",
                        right: r.type === "SAML" ? <AStatus s="Valid" /> : "",
                      },
                    ]),
                  },
                  {
                    label: "Endpoints",
                    content: kvb([
                      { k: "Issuer / entity ID", v: r.tenant },
                      {
                        k: "Token endpoint",
                        v: r.type === "OIDC" ? `${r.endpoint}/token` : "—",
                      },
                      { k: "Metadata", v: `${r.endpoint}/metadata` },
                    ]),
                  },
                ],
              },
              {
                label: "Provisioning",
                subs: [
                  {
                    label: "User Sync",
                    content: kvb([
                      { k: "Users synced", v: r.usersSynced },
                      {
                        k: "Mode",
                        v: r.type === "SCIM" ? "SCIM push" : "Scheduled pull",
                      },
                      { k: "Last sync", v: r.lastSync },
                    ]),
                  },
                  {
                    label: "Group Sync",
                    content: kvb([
                      { k: "Groups synced", v: r.groupsSynced },
                      { k: "Group filter", v: "Security* , Eng*" },
                    ]),
                  },
                  {
                    label: "SCIM",
                    content: kvb([
                      {
                        k: "SCIM endpoint",
                        v:
                          r.type === "SCIM" || r.type === "OIDC"
                            ? `${r.endpoint}/scim/v2`
                            : "—",
                      },
                      {
                        k: "Bearer token",
                        v:
                          r.type === "SCIM" || r.type === "OIDC"
                            ? "•••• configured"
                            : "—",
                      },
                    ]),
                  },
                  {
                    label: "Lifecycle Rules",
                    content: tlb([
                      {
                        primary: "Joiner",
                        secondary: "auto-create + assign base role",
                        right: "",
                      },
                      {
                        primary: "Mover",
                        secondary: "re-evaluate group membership",
                        right: "",
                      },
                      {
                        primary: "Leaver",
                        secondary: "deprovision on directory removal",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Attribute Mapping",
                subs: [
                  {
                    label: "User Attributes",
                    content: tlb([
                      {
                        primary: "email → userPrincipalName",
                        secondary: "identifier",
                        right: "",
                      },
                      {
                        primary: "displayName → name",
                        secondary: "profile",
                        right: "",
                      },
                      {
                        primary: "department → dept",
                        secondary: "profile",
                        right: "",
                      },
                    ]),
                  },
                  {
                    label: "Group Attributes",
                    content: tlb([
                      {
                        primary: "groups → memberOf",
                        secondary: "authorization",
                        right: "",
                      },
                    ]),
                  },
                  {
                    label: "Custom Attributes",
                    content: tlb([
                      {
                        primary: "employeeId → external_id",
                        secondary: "custom",
                        right: "",
                      },
                      {
                        primary: "costCenter → cost_center",
                        secondary: "custom",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Synchronization",
                subs: [
                  {
                    label: "Current Status",
                    content: kvb([
                      { k: "Sync status", v: <AStatus s={r.syncStatus} /> },
                      { k: "Last sync", v: r.lastSync },
                      { k: "Next sync", v: "every 6 hours" },
                    ]),
                  },
                  {
                    label: "Sync History",
                    content: tlb([
                      {
                        primary: "Full sync",
                        secondary: `${r.usersSynced} users · ${r.groupsSynced} groups`,
                        right: r.lastSync,
                      },
                      {
                        primary: "Delta sync",
                        secondary: "12 changes",
                        right: "2026-06-24 00:00",
                      },
                    ]),
                  },
                  {
                    label: "Errors",
                    content:
                      r.health === "Down"
                        ? tlb([
                            {
                              primary: "Connection refused",
                              secondary: "ldaps://dc01.corp.local:636",
                              right: <AStatus s="Error" />,
                            },
                          ])
                        : tlb([
                            {
                              primary: "No recent errors",
                              secondary: "",
                              right: <AStatus s="Healthy" />,
                            },
                          ]),
                  },
                  {
                    label: "Manual Operations",
                    content: (
                      <div>
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => {
                                sync(r.id);
                                setToast("Sync started");
                              }}
                            >
                              Sync Now
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Connection test passed")}
                            >
                              Test Connection
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Metadata reloaded")}
                            >
                              Reload Metadata
                            </HeaderButton>
                          </ActRow>
                        )}
                      </div>
                    ),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Timeline",
                    content: tlb([
                      {
                        primary: "Provider connected",
                        secondary: `by ${r.owner}`,
                        right: "2025-01-06",
                      },
                      {
                        primary: "Sync completed",
                        secondary: `${r.usersSynced} users`,
                        right: r.lastSync,
                      },
                      ...(r.health === "Down"
                        ? [
                            {
                              primary: "Sync failed",
                              secondary: "connection refused",
                              right: r.lastSync,
                            },
                          ]
                        : []),
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// Federation-first IA: CloudGuard delegates authentication to the tenant's
// identity provider and is NOT a credential authority. "Authentication" surfaces
// enrollment status + admin actions over the connected IdP; local credential
// lifecycle is demoted to an explicit break-glass path. Auth-posture detection
// lives in Identity Alerts → Authentication Risks (no duplicate here).
const AUTH_SUBS = ["Authentication", "Local Sign-in & Break-glass"];
const AUTH_METHOD_SUBS = ["MFA", "Methods", "Passkeys", "Security Keys"];
const AUTH_LOCAL_SUBS = [
  "Password Policy",
  "Credential Policies",
  "Temporary Access Pass",
];
function InfoBanner({
  icon,
  children,
  tone = "info",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "info" | "warn";
}) {
  const c = tone === "warn" ? T.warning : T.accent;
  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        padding: "11px 14px",
        borderRadius: 8,
        background:
          tone === "warn" ? "rgba(245,158,11,0.10)" : "var(--cg-accent-bg)",
        border: `1px solid ${tone === "warn" ? "rgba(245,158,11,0.35)" : "var(--cg-accent)"}`,
        color: T.textPrimary,
        fontSize: 12.5,
        lineHeight: 1.5,
        marginBottom: 14,
      }}
    >
      <span style={{ color: c, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}
function AuthArea() {
  const [sub, setSub] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={AUTH_SUBS} active={sub} onChange={setSub} />
      {sub === 0 && <AuthenticationGroup />}
      {sub === 1 && <LocalSignInGroup />}
    </div>
  );
}
function AuthenticationGroup() {
  const [s, setS] = React.useState(0);
  return (
    <div>
      <InfoBanner icon={<Plug size={15} />}>
        Authentication is delegated to your connected{" "}
        <strong>identity provider</strong>. These surfaces show enrollment
        status and admin actions (force re-enroll, reset methods) — CloudGuard
        does not store or issue primary credentials. Connect and configure
        providers in <strong>Identity Providers</strong>.
      </InfoBanner>
      <SubTabStrip subs={AUTH_METHOD_SUBS} active={s} onChange={setS} />
      {s === 0 && <MfaCollection />}
      {s === 1 && <MethodsCollection />}
      {s === 2 && <PasskeyCollection />}
      {s === 3 && <SecurityKeyCollection />}
    </div>
  );
}
function LocalSignInGroup() {
  const [s, setS] = React.useState(0);
  return (
    <div>
      <InfoBanner icon={<KeyRound size={15} />} tone="warn">
        Local sign-in applies only to{" "}
        <strong>native / break-glass accounts</strong>. When a tenant federates
        to an external IdP these policies are owned and enforced by that
        provider — keep local accounts to a minimal, audited break-glass set.
      </InfoBanner>
      <SubTabStrip subs={AUTH_LOCAL_SUBS} active={s} onChange={setS} />
      {s === 0 && <PasswordPolicyCollection />}
      {s === 1 && <CredentialPolicyCollection />}
      {s === 2 && <TapCollection />}
    </div>
  );
}

const REVIEW_SUBS = [
  "User Access Reviews",
  "Role Reviews",
  "Group Reviews",
  "Certification Campaigns",
  "Segregation of Duties",
];
function ReviewsArea() {
  const [sub, setSub] = React.useState(0);
  return (
    <div>
      <ReviewMetricsBar />
      <SubTabStrip subs={REVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === 0 && <UserAccessReviews />}
      {sub === 1 && <RoleReviews />}
      {sub === 2 && <GroupReviews />}
      {sub === 3 && <CertificationCampaigns />}
      {sub === 4 && <SegregationOfDuties />}
    </div>
  );
}

// ── global metrics ──────────────────────────────────────────────────────────
function ReviewMetricsBar() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <MetricTile label="Open reviews" value="18" />
      <MetricTile label="Overdue reviews" value="3" tone="danger" />
      <MetricTile label="Certification coverage" value="91%" />
      <MetricTile label="Privileged access reviewed" value="100%" />
      <MetricTile label="SoD violations" value="2" tone="warn" />
      <MetricTile label="Active exceptions" value="4" tone="warn" />
      <MetricTile label="Campaign completion" value="78%" />
      <MetricTile label="Audit readiness score" value="A−" />
    </div>
  );
}

// ── review flows ────────────────────────────────────────────────────────────
function StartReviewFlow({
  kind,
  onClose,
  onCreate,
}: {
  kind: "User" | "Role" | "Group";
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    target: "",
    reviewer: "compliance@inferencedefense.com",
    scope: "Organization",
    due: "",
  });
  const err = !f.target.trim();
  return (
    <Drawer
      title={`Start ${kind.toLowerCase()} access review`}
      subtitle="Create a recertification review and assign a reviewer."
      width={540}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({ id: `rv${Date.now()}`, ...userReviewRow(kind, f) })
            }
          >
            Start review
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label={kind} err={err}>
        <input
          value={f.target}
          onChange={(e) => setF({ ...f, target: e.target.value })}
          style={errInp(err)}
          placeholder={
            kind === "User"
              ? "user@company.com"
              : kind === "Role"
                ? "Security Engineer"
                : "Security Engineers"
          }
        />
      </Req>
      <Field label="Reviewer">
        <Sel
          value={f.reviewer}
          onChange={(v) => setF({ ...f, reviewer: v })}
          opts={[
            "compliance@inferencedefense.com",
            "ciso@inferencedefense.com",
            "security-manager@inferencedefense.com",
          ]}
        />
      </Field>
      <Field label="Access scope">
        <Sel
          value={f.scope}
          onChange={(v) => setF({ ...f, scope: v })}
          opts={["Organization", "Workspace: Payments", "Workspace: SOC"]}
        />
      </Field>
      <Field label="Due date">
        <input
          type="date"
          value={f.due}
          onChange={(e) => setF({ ...f, due: e.target.value })}
          style={inp}
        />
      </Field>
    </Drawer>
  );
}
function userReviewRow(
  kind: string,
  f: { target: string; reviewer: string; scope: string; due: string },
): Record<string, string> {
  const base = {
    reviewer: f.reviewer,
    due: f.due || "2026-09-30",
    status: "Pending",
    bucket: "Active",
    findings: "0 findings",
  };
  if (kind === "User") return { ...base, user: f.target, scope: f.scope };
  if (kind === "Role")
    return { ...base, role: f.target, users: "0", scope: f.scope };
  return { ...base, group: f.target, members: "0", scope: f.scope };
}
function ScheduleReviewFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (s: string) => void;
}) {
  const [f, setF] = React.useState({
    reviewer: "compliance@inferencedefense.com",
    cadence: "Quarterly",
    start: "",
  });
  return (
    <Drawer
      title="Schedule recurring review"
      subtitle="Set a recertification cadence and reviewer."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" onClick={() => onDone(f.cadence)}>
            Schedule
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Reviewer">
        <Sel
          value={f.reviewer}
          onChange={(v) => setF({ ...f, reviewer: v })}
          opts={[
            "compliance@inferencedefense.com",
            "ciso@inferencedefense.com",
          ]}
        />
      </Field>
      <Field label="Cadence">
        <Sel
          value={f.cadence}
          onChange={(v) => setF({ ...f, cadence: v })}
          opts={["Monthly", "Quarterly", "Semi-annual", "Annual"]}
        />
      </Field>
      <Field label="Start date">
        <input
          type="date"
          value={f.start}
          onChange={(e) => setF({ ...f, start: e.target.value })}
          style={inp}
        />
      </Field>
    </Drawer>
  );
}
function AddCommentFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [c, setC] = React.useState("");
  return (
    <Drawer
      title="Add comment"
      subtitle="Comments are recorded as review evidence."
      width={500}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" disabled={!c.trim()} onClick={onDone}>
            Add comment
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Comment">
        <textarea
          value={c}
          onChange={(e) => setC(e.target.value)}
          rows={4}
          style={{ ...inp, height: "auto", padding: 11, resize: "vertical" }}
        />
      </Field>
    </Drawer>
  );
}
const CAMP_STEPS = ["Basics", "Scope", "Reviewers", "Schedule"];
function CreateCampaignFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState({
    name: "",
    scope: "Organization",
    reviewer: "compliance@inferencedefense.com",
    cadence: "Quarterly",
    start: "",
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const err = !f.name.trim();
  const last = step === CAMP_STEPS.length - 1;
  return (
    <WizardShell
      title="Create certification campaign"
      steps={CAMP_STEPS}
      step={step}
      setStep={setStep}
      stepError={(i) => (i === 0 ? err : false)}
      showErrors={last}
      canFinish={!err}
      finishLabel="Create campaign"
      onFinish={() => {
        if (err) {
          setStep(0);
          return;
        }
        onCreate({
          id: `c${Date.now()}`,
          campaign: f.name.trim(),
          scope: f.scope,
          reviewer: f.reviewer,
          progress: "0%",
          status: "Draft",
          bucket: "Draft",
        });
      }}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Campaign basics</H>
          <P>Name the enterprise-wide review campaign.</P>
          <Req label="Name" err={err}>
            <input
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              style={errInp(err)}
              placeholder="e.g. Q3 Quarterly Access Review"
            />
          </Req>
        </>
      )}
      {step === 1 && (
        <>
          <H>Scope</H>
          <P>What this campaign certifies.</P>
          <Field label="Target">
            <Sel
              value={f.scope}
              onChange={(v) => set({ scope: v })}
              opts={[
                "Organization",
                "Users",
                "Roles",
                "Groups",
                "Privileged Access",
                "Workspaces",
              ]}
            />
          </Field>
        </>
      )}
      {step === 2 && (
        <>
          <H>Reviewers</H>
          <P>Who performs the certification.</P>
          <Field label="Lead reviewer">
            <Sel
              value={f.reviewer}
              onChange={(v) => set({ reviewer: v })}
              opts={[
                "compliance@inferencedefense.com",
                "ciso@inferencedefense.com",
                "security-manager@inferencedefense.com",
              ]}
            />
          </Field>
        </>
      )}
      {step === 3 && (
        <>
          <H>Schedule</H>
          <P>Cadence and start.</P>
          <Field label="Cadence">
            <Sel
              value={f.cadence}
              onChange={(v) => set({ cadence: v })}
              opts={["One-time", "Monthly", "Quarterly", "Annual"]}
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={f.start}
              onChange={(e) => set({ start: e.target.value })}
              style={inp}
            />
          </Field>
          <ReviewSec
            title="Review"
            onEdit={() => setStep(0)}
            errors={err ? ["Please name the campaign."] : []}
          >
            <KV k="Name" v={f.name || "—"} />
            <KV k="Scope" v={f.scope} />
            <KV k="Reviewer" v={f.reviewer} />
          </ReviewSec>
        </>
      )}
    </WizardShell>
  );
}
function ImportPolicyFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (n: number) => void;
}) {
  const [src, setSrc] = React.useState("SoD template library");
  const [preview, setPreview] = React.useState<number | null>(null);
  return (
    <Drawer
      title="Import SoD policy"
      subtitle="Import segregation-of-duties rules from a template or file."
      width={520}
      onClose={onClose}
      footer={
        preview !== null ? (
          <>
            <HeaderButton variant="primary" onClick={() => onDone(preview)}>
              Import {preview} rules
            </HeaderButton>
            <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          </>
        ) : (
          <>
            <HeaderButton
              variant="primary"
              onClick={() => setPreview(Math.floor(Math.random() * 8) + 4)}
            >
              Preview
            </HeaderButton>
            <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          </>
        )
      }
    >
      <Field label="Source">
        <Sel
          value={src}
          onChange={setSrc}
          opts={[
            "SoD template library",
            "CSV file",
            "SCIM policy feed",
            "PCI-DSS baseline",
          ]}
        />
      </Field>
      {preview !== null && (
        <KVGrid
          cols={1}
          items={[
            { k: "Rules found", v: String(preview) },
            { k: "New", v: String(preview - 1) },
            { k: "Conflicts with existing", v: "1" },
          ]}
        />
      )}
    </Drawer>
  );
}
function CreateExceptionFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    exception: "",
    user: "",
    approver: "ciso@inferencedefense.com",
    expires: "",
    justification: "",
  });
  const err = !f.exception.trim() || !f.justification.trim();
  return (
    <Drawer
      title="Create SoD exception"
      subtitle="Time-boxed, justified exception to a segregation-of-duties policy."
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `x${Date.now()}`,
                exception: f.exception.trim(),
                user: f.user || "—",
                approvedBy: f.approver,
                expires: f.expires || "2026-12-31",
                status: "Active",
                bucket: "Active Exceptions",
                justification: f.justification.trim(),
              })
            }
          >
            Create exception
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Policy" err={!f.exception.trim()}>
        <input
          value={f.exception}
          onChange={(e) => setF({ ...f, exception: e.target.value })}
          style={errInp(!f.exception.trim())}
          placeholder="Approve + Execute Remediation"
        />
      </Req>
      <Field label="User">
        <input
          value={f.user}
          onChange={(e) => setF({ ...f, user: e.target.value })}
          style={inp}
          placeholder="user@company.com"
        />
      </Field>
      <Req label="Business justification" err={!f.justification.trim()}>
        <textarea
          value={f.justification}
          onChange={(e) => setF({ ...f, justification: e.target.value })}
          rows={3}
          style={{
            ...errInp(!f.justification.trim()),
            height: "auto",
            padding: 11,
            resize: "vertical",
          }}
        />
      </Req>
      <Field label="Approver">
        <Sel
          value={f.approver}
          onChange={(v) => setF({ ...f, approver: v })}
          opts={["ciso@inferencedefense.com", "org-owner@inferencedefense.com"]}
        />
      </Field>
      <Field label="Expires">
        <input
          type="date"
          value={f.expires}
          onChange={(e) => setF({ ...f, expires: e.target.value })}
          style={inp}
        />
      </Field>
    </Drawer>
  );
}
function RemediateFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (a: string) => void;
}) {
  const [a, setA] = React.useState("Remove Assignment");
  return (
    <Drawer
      title="Remediate violation"
      subtitle="Choose how to resolve the toxic combination."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" onClick={() => onDone(a)}>
            Apply remediation
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Remediation action">
        <Sel
          value={a}
          onChange={setA}
          opts={[
            "Remove Assignment",
            "Remove Group Membership",
            "Revoke Role",
            "Reduce Scope",
            "Expire Temporary Access",
          ]}
        />
      </Field>
    </Drawer>
  );
}

// ── secondary status strip + bucket filter ──────────────────────────────────
function useBucketed(rows: ARow[], buckets: string[]) {
  const [bi, setBi] = React.useState(0);
  const filtered = rows.filter((r) => r.bucket === buckets[bi]);
  return { bi, setBi, filtered };
}

// ── 1. USER ACCESS REVIEWS ──────────────────────────────────────────────────
const REVIEW_BUCKETS = ["Active", "Scheduled", "Completed", "Overdue"];
function UserAccessReviews() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "john@company.com",
      reviewer: "security-manager@inferencedefense.com",
      scope: "Organization",
      due: "2026-06-30",
      findings: "2 findings",
      status: "Pending",
      bucket: "Active",
    },
    {
      id: "1",
      user: "mei.tan@deloitte.com (guest)",
      reviewer: "compliance@inferencedefense.com",
      scope: "Workspace: SOC",
      due: "2026-06-28",
      findings: "1 finding",
      status: "In progress",
      bucket: "Active",
    },
    {
      id: "2",
      user: "contractor@ext.com",
      reviewer: "compliance@inferencedefense.com",
      scope: "acme-dev",
      due: "2026-08-15",
      findings: "0 findings",
      status: "Scheduled",
      bucket: "Scheduled",
    },
    {
      id: "3",
      user: "marc@sentinel-org.io",
      reviewer: "ciso@inferencedefense.com",
      scope: "Workspace: SOC",
      due: "2026-05-30",
      findings: "0 findings",
      status: "Completed",
      bucket: "Completed",
    },
    {
      id: "4",
      user: "old-admin@company.com",
      reviewer: "security-manager@inferencedefense.com",
      scope: "Organization",
      due: "2026-06-10",
      findings: "3 findings",
      status: "Overdue",
      bucket: "Overdue",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const { bi, setBi, filtered } = useBucketed(rows, REVIEW_BUCKETS);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const decide = (id: string, s: string, b: string) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: s, bucket: b } : r)),
    );
  const cols = aCols([
    ["user", "User"],
    ["reviewer", "Reviewer"],
    ["scope", "Access Scope"],
    ["due", "Due Date"],
    ["findings", "Findings"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <SubTabStrip subs={REVIEW_BUCKETS} active={bi} onChange={setBi} />
      <AuthCollection
        title="User Access Reviews"
        desc="Per-user recertification — reviewers must confirm or revoke each user's standing access."
        searchPlaceholder="Search reviews"
        commands={[
          {
            key: "start",
            label: "Start Review",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <StartReviewFlow
                  kind="User"
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [d, ...rs]);
                    setFlow(null);
                    setToast("Review started");
                  }}
                />,
              ),
          },
          {
            key: "sch",
            label: "Schedule Review",
            icon: <CalendarClock size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ScheduleReviewFlow
                  onClose={() => setFlow(null)}
                  onDone={(c) => {
                    setFlow(null);
                    setToast(`Scheduled ${c}`);
                  }}
                />,
              ),
          },
          {
            key: "ba",
            label: "Bulk Approve",
            icon: <CheckCircle2 size={15} />,
            disabled: !canEdit,
            onClick: () => {
              setRows((rs) =>
                rs.map((r) =>
                  r.bucket === "Active"
                    ? { ...r, status: "Completed", bucket: "Completed" }
                    : r,
                ),
              );
              setToast("Active reviews approved");
            },
          },
          {
            key: "br",
            label: "Bulk Revoke",
            icon: <XCircle size={15} />,
            disabled: !canEdit,
            onClick: () => {
              setToast("Access revoked for flagged users");
            },
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(filtered, "user-access-reviews"),
          },
        ]}
        filterDefs={[
          { key: "status", label: "Review Status" },
          { key: "reviewer", label: "Reviewer" },
          { key: "scope", label: "Workspace" },
          { key: "due", label: "Due Date" },
        ]}
        columns={cols}
        rows={filtered}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => decide(id, "Completed", "Completed"));
                      setToast("Approved");
                      clear();
                    }}
                  >
                    Bulk Approve
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setToast("Access revoked");
                      clear();
                    }}
                  >
                    Bulk Revoke
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      authCsv(
                        rows.filter((r) => ids.includes(r.id)),
                        "reviews",
                      );
                      clear();
                    }}
                  >
                    Export
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "Open Review", onClick: open },
                {
                  label: "Approve Access",
                  onClick: () => decide(r.id, "Completed", "Completed"),
                },
                {
                  label: "Revoke Access",
                  danger: true,
                  onClick: () => {
                    decide(r.id, "Completed", "Completed");
                    setToast("Access revoked");
                  },
                },
                {
                  label: "Reassign Reviewer",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title="Reassign reviewer"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setRows((rs) =>
                            rs.map((x) =>
                              x.id === r.id ? { ...x, reviewer: s } : x,
                            ),
                          );
                          setFlow(null);
                          setToast(`Reassigned to ${s}`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Extend Due Date",
                  onClick: () =>
                    setFlow(
                      <ExtendFlow
                        current={r.due}
                        onClose={() => setFlow(null)}
                        onDone={(d) => {
                          setRows((rs) =>
                            rs.map((x) =>
                              x.id === r.id ? { ...x, due: d } : x,
                            ),
                          );
                          setFlow(null);
                          setToast("Due date extended");
                        }}
                      />,
                    ),
                },
                {
                  label: "Add Comment",
                  onClick: () =>
                    setFlow(
                      <AddCommentFlow
                        onClose={() => setFlow(null)}
                        onDone={() => {
                          setFlow(null);
                          setToast("Comment added");
                        }}
                      />,
                    ),
                },
                {
                  label: "Export Evidence",
                  onClick: () => authCsv([r], `evidence-${r.user}`),
                },
              ]
            : [{ label: "Open Review", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.user}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                Reviewer {r.reviewer} · <AStatus s={r.status} /> · due {r.due}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => {
                      decide(r.id, "Completed", "Completed");
                      close();
                    }}
                  >
                    Approve
                  </HeaderButton>
                  <HeaderButton
                    variant="danger"
                    onClick={() => {
                      decide(r.id, "Completed", "Completed");
                      close();
                      setToast("Access revoked");
                    }}
                  >
                    Revoke
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <AddCommentFlow
                          onClose={() => setFlow(null)}
                          onDone={() => {
                            setFlow(null);
                            setToast("Comment added");
                          }}
                        />,
                      )
                    }
                  >
                    Add Comment
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Review ID", v: `rev_${r.id}c4a` },
                      { k: "Review type", v: "User access recertification" },
                      { k: "Reviewer", v: r.reviewer },
                      { k: "Owner", v: "compliance@inferencedefense.com" },
                      { k: "Started", v: "2026-06-01" },
                      { k: "Due date", v: r.due },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      {
                        k: "Risk score",
                        v: (
                          <StatusIndicator
                            tone={r.findings.startsWith("0") ? "ok" : "warn"}
                          >
                            {r.findings.startsWith("0") ? "Low" : "Elevated"}
                          </StatusIndicator>
                        ),
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Access Inventory",
                subs: [
                  {
                    label: "Access Inventory",
                    content: tlb([
                      {
                        primary: "Security Engineer",
                        secondary: "Role · Production",
                        right: <AStatus s="Medium" />,
                      },
                      {
                        primary: "Security Engineers",
                        secondary: "Group · acme-prod",
                        right: <AStatus s="Low" />,
                      },
                      {
                        primary: "Enterprise Security Administrator",
                        secondary: "Privileged · eligible",
                        right: <AStatus s="Critical" />,
                      },
                      {
                        primary: "Execute Remediation",
                        secondary: "Agent permission",
                        right: <AStatus s="Critical" />,
                      },
                      {
                        primary: "AWS Production",
                        secondary: "Resource · Admin",
                        right: <AStatus s="High" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Findings",
                subs: [
                  {
                    label: "Findings",
                    content: tlb([
                      {
                        primary: "Privileged access",
                        secondary:
                          "eligible for Enterprise Security Administrator",
                        right: <AStatus s="High" />,
                      },
                      {
                        primary: "Unused role",
                        secondary: "Auditor not used in 90 days",
                        right: <AStatus s="Medium" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Decisions",
                subs: [
                  {
                    label: "Decisions",
                    content: (
                      <>
                        {tlb([
                          {
                            primary: "Pending reviewer decision",
                            secondary:
                              "Approve / Revoke / Reduce / Escalate / Exception",
                            right: "",
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => {
                                decide(r.id, "Completed", "Completed");
                                close();
                              }}
                            >
                              Approve
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Access reduced")}
                            >
                              Reduce Access
                            </HeaderButton>
                            <HeaderButton onClick={() => setToast("Escalated")}>
                              Escalate
                            </HeaderButton>
                            <HeaderButton
                              onClick={() =>
                                setFlow(
                                  <CreateExceptionFlow
                                    onClose={() => setFlow(null)}
                                    onCreate={() => {
                                      setFlow(null);
                                      setToast("Exception approved");
                                    }}
                                  />,
                                )
                              }
                            >
                              Exception
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Evidence",
                subs: [
                  {
                    label: "Evidence",
                    content: tlb([
                      {
                        primary: "Manager confirmation",
                        secondary: "attached",
                        right: "2026-06-02",
                      },
                      {
                        primary: "Business justification",
                        secondary: "SOC operations",
                        right: "",
                      },
                      {
                        primary: "Review document",
                        secondary: "Q2-user-review.pdf",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Review created",
                        secondary: "by compliance",
                        right: "2026-06-01",
                      },
                      {
                        primary: "Reviewer assigned",
                        secondary: r.reviewer,
                        right: "2026-06-01",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 2. ROLE REVIEWS ─────────────────────────────────────────────────────────
function RoleReviews() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      role: "Enterprise Security Administrator",
      users: "3",
      reviewer: "ciso@inferencedefense.com",
      due: "2026-06-30",
      status: "Pending",
      bucket: "Active",
    },
    {
      id: "1",
      role: "Security Engineer",
      users: "42",
      reviewer: "security-manager@inferencedefense.com",
      due: "2026-07-15",
      status: "In progress",
      bucket: "Active",
    },
    {
      id: "2",
      role: "Auditor",
      users: "5",
      reviewer: "compliance@inferencedefense.com",
      due: "2026-09-01",
      status: "Scheduled",
      bucket: "Scheduled",
    },
    {
      id: "3",
      role: "Operator",
      users: "27",
      reviewer: "security-manager@inferencedefense.com",
      due: "2026-05-20",
      status: "Completed",
      bucket: "Completed",
    },
    {
      id: "4",
      role: "Workspace Administrator",
      users: "11",
      reviewer: "ciso@inferencedefense.com",
      due: "2026-06-05",
      status: "Overdue",
      bucket: "Overdue",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const { bi, setBi, filtered } = useBucketed(rows, REVIEW_BUCKETS);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["role", "Role"],
    ["users", "Assigned Users"],
    ["reviewer", "Reviewer"],
    ["due", "Due"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <SubTabStrip subs={REVIEW_BUCKETS} active={bi} onChange={setBi} />
      <AuthCollection
        title="Role Reviews"
        desc="Verify roles remain valid and assigned correctly — capabilities, assignments and risk re-examined each cycle."
        searchPlaceholder="Search role reviews"
        commands={[
          {
            key: "start",
            label: "Start Role Review",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <StartReviewFlow
                  kind="Role"
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [d, ...rs]);
                    setFlow(null);
                    setToast("Role review started");
                  }}
                />,
              ),
          },
          {
            key: "sch",
            label: "Schedule Campaign",
            icon: <CalendarClock size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ScheduleReviewFlow
                  onClose={() => setFlow(null)}
                  onDone={(c) => {
                    setFlow(null);
                    setToast(`Scheduled ${c}`);
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(filtered, "role-reviews"),
          },
        ]}
        filterDefs={[
          { key: "status", label: "Status" },
          { key: "reviewer", label: "Reviewer" },
          { key: "role", label: "Role" },
        ]}
        columns={cols}
        rows={filtered}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "Open Review", onClick: open },
                {
                  label: "Approve",
                  onClick: () => {
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? { ...x, status: "Completed", bucket: "Completed" }
                          : x,
                      ),
                    );
                    setToast("Approved");
                  },
                },
                {
                  label: "Reassign Reviewer",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title="Reassign reviewer"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Reassigned to ${s}`);
                        }}
                      />,
                    ),
                },
              ]
            : [{ label: "Open Review", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.role)}
            title={r.role}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.users} users · reviewer {r.reviewer} ·{" "}
                <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <HeaderButton
                  variant="primary"
                  onClick={() => {
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? { ...x, status: "Completed", bucket: "Completed" }
                          : x,
                      ),
                    );
                    close();
                  }}
                >
                  Approve
                </HeaderButton>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Role", v: r.role },
                      { k: "Assigned users", v: r.users },
                      { k: "Reviewer", v: r.reviewer },
                      { k: "Due", v: r.due },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Permissions",
                subs: [
                  {
                    label: "Permissions",
                    content: (
                      <>
                        <SecHead2>Role capabilities</SecHead2>
                        {tlb([
                          {
                            primary: "role.assign",
                            secondary: "Authorization",
                            right: <AStatus s="High" />,
                          },
                        ])}
                        <SecHead2>Agent permissions</SecHead2>
                        {tlb([
                          {
                            primary: "Execute Remediation",
                            secondary: "critical",
                            right: <AStatus s="Critical" />,
                          },
                        ])}
                        <SecHead2>Inherited permissions</SecHead2>
                        {tlb([
                          {
                            primary: "findings.read",
                            secondary: "via group",
                            right: "",
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Assignments",
                subs: [
                  {
                    label: "Assignments",
                    content: tlb([
                      {
                        primary: "rami@inferencedefense.com",
                        secondary: "Direct",
                        right: "2026-03-04",
                      },
                      {
                        primary: "Security Engineers",
                        secondary: "Group",
                        right: "2026-02-01",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Risk Analysis",
                subs: [
                  {
                    label: "Risk Analysis",
                    content: tlb([
                      {
                        primary: "Excessive permissions",
                        secondary: "12 unused of 148",
                        right: <AStatus s="Medium" />,
                      },
                      {
                        primary: "Toxic combination",
                        secondary: "Approve + Execute",
                        right: <AStatus s="High" />,
                      },
                      {
                        primary: "Privilege escalation path",
                        secondary: "role.assign → self-grant",
                        right: <AStatus s="High" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Decisions",
                subs: [
                  {
                    label: "Decisions",
                    content: (
                      <div>
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => {
                                setRows((rs) =>
                                  rs.map((x) =>
                                    x.id === r.id
                                      ? {
                                          ...x,
                                          status: "Completed",
                                          bucket: "Completed",
                                        }
                                      : x,
                                  ),
                                );
                                close();
                              }}
                            >
                              Approve
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Permissions reduced")}
                            >
                              Reduce Permissions
                            </HeaderButton>
                            <HeaderButton onClick={() => setToast("Escalated")}>
                              Escalate
                            </HeaderButton>
                          </ActRow>
                        )}
                      </div>
                    ),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Role review created",
                        secondary: r.reviewer,
                        right: "2026-06-01",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 3. GROUP REVIEWS ────────────────────────────────────────────────────────
function GroupReviews() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      group: "Security Engineers",
      members: "42",
      reviewer: "security-manager@inferencedefense.com",
      due: "2026-06-30",
      status: "Pending",
      bucket: "Active",
    },
    {
      id: "1",
      group: "Security Operations",
      members: "5",
      reviewer: "ciso@inferencedefense.com",
      due: "2026-07-10",
      status: "In progress",
      bucket: "Active",
    },
    {
      id: "2",
      group: "Auditors",
      members: "5",
      reviewer: "compliance@inferencedefense.com",
      due: "2026-09-01",
      status: "Scheduled",
      bucket: "Scheduled",
    },
    {
      id: "3",
      group: "Payments Team",
      members: "24",
      reviewer: "security-manager@inferencedefense.com",
      due: "2026-05-15",
      status: "Completed",
      bucket: "Completed",
    },
    {
      id: "4",
      group: "Cloud Operators",
      members: "11",
      reviewer: "ciso@inferencedefense.com",
      due: "2026-06-01",
      status: "Overdue",
      bucket: "Overdue",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const { bi, setBi, filtered } = useBucketed(rows, REVIEW_BUCKETS);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["group", "Group"],
    ["members", "Members"],
    ["reviewer", "Reviewer"],
    ["due", "Due"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <SubTabStrip subs={REVIEW_BUCKETS} active={bi} onChange={setBi} />
      <AuthCollection
        title="Group Reviews"
        desc="Recertify group membership — confirm each member still needs the access the group grants."
        searchPlaceholder="Search group reviews"
        commands={[
          {
            key: "start",
            label: "Start Group Review",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <StartReviewFlow
                  kind="Group"
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [d, ...rs]);
                    setFlow(null);
                    setToast("Group review started");
                  }}
                />,
              ),
          },
          {
            key: "sch",
            label: "Schedule Review",
            icon: <CalendarClock size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ScheduleReviewFlow
                  onClose={() => setFlow(null)}
                  onDone={(c) => {
                    setFlow(null);
                    setToast(`Scheduled ${c}`);
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(filtered, "group-reviews"),
          },
        ]}
        filterDefs={[
          { key: "status", label: "Status" },
          { key: "reviewer", label: "Reviewer" },
          { key: "group", label: "Group" },
        ]}
        columns={cols}
        rows={filtered}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "Open Review", onClick: open },
                {
                  label: "Approve",
                  onClick: () => {
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? { ...x, status: "Completed", bucket: "Completed" }
                          : x,
                      ),
                    );
                    setToast("Approved");
                  },
                },
                {
                  label: "Reassign Reviewer",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title="Reassign reviewer"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Reassigned to ${s}`);
                        }}
                      />,
                    ),
                },
              ]
            : [{ label: "Open Review", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.group)}
            title={r.group}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.members} members · reviewer {r.reviewer} ·{" "}
                <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <HeaderButton
                  variant="primary"
                  onClick={() => {
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? { ...x, status: "Completed", bucket: "Completed" }
                          : x,
                      ),
                    );
                    close();
                  }}
                >
                  Approve
                </HeaderButton>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Group", v: r.group },
                      { k: "Members", v: r.members },
                      { k: "Reviewer", v: r.reviewer },
                      { k: "Due", v: r.due },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Membership",
                subs: [
                  {
                    label: "Membership",
                    content: tlb([
                      {
                        primary: "rami@inferencedefense.com",
                        secondary: "joined 2025-01 · last active 2026-06-24",
                        right: <AStatus s="Low" />,
                      },
                      {
                        primary: "old-user@company.com",
                        secondary: "joined 2024-08 · last active 2026-02-01",
                        right: <AStatus s="High" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Access Impact",
                subs: [
                  {
                    label: "Access Impact",
                    content: (
                      <>
                        <SecHead2>Roles</SecHead2>
                        {tlb([
                          {
                            primary: "Workspace Administrator",
                            secondary: "acme-prod",
                            right: "",
                          },
                        ])}
                        <SecHead2>Cloud permissions</SecHead2>
                        {tlb([
                          {
                            primary: "AWS Production",
                            secondary: "Admin",
                            right: "",
                          },
                        ])}
                        <SecHead2>Inherited groups</SecHead2>
                        {tlb([
                          {
                            primary: "Platform Team",
                            secondary: "parent",
                            right: "",
                          },
                        ])}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Findings",
                subs: [
                  {
                    label: "Findings",
                    content: tlb([
                      {
                        primary: "Dormant member",
                        secondary: "old-user inactive 120 days",
                        right: <AStatus s="Medium" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Decisions",
                subs: [
                  {
                    label: "Decisions",
                    content: (
                      <div>
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() => {
                                setRows((rs) =>
                                  rs.map((x) =>
                                    x.id === r.id
                                      ? {
                                          ...x,
                                          status: "Completed",
                                          bucket: "Completed",
                                        }
                                      : x,
                                  ),
                                );
                                close();
                              }}
                            >
                              Approve
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Member removed")}
                            >
                              Remove Member
                            </HeaderButton>
                          </ActRow>
                        )}
                      </div>
                    ),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Group review created",
                        secondary: r.reviewer,
                        right: "2026-06-01",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 4. CERTIFICATION CAMPAIGNS ──────────────────────────────────────────────
const CAMP_BUCKETS = ["Active", "Draft", "Completed", "Archived"];
function CertificationCampaigns() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      campaign: "Q2 Quarterly Access Review",
      scope: "Organization",
      reviewer: "compliance@inferencedefense.com",
      progress: "78%",
      status: "Active",
      bucket: "Active",
    },
    {
      id: "1",
      campaign: "Privileged Access Certification",
      scope: "Privileged Access",
      reviewer: "ciso@inferencedefense.com",
      progress: "100%",
      status: "Active",
      bucket: "Active",
    },
    {
      id: "2",
      campaign: "PCI Certification",
      scope: "Payments",
      reviewer: "compliance@inferencedefense.com",
      progress: "0%",
      status: "Draft",
      bucket: "Draft",
    },
    {
      id: "3",
      campaign: "SOC2 Access Review",
      scope: "Organization",
      reviewer: "compliance@inferencedefense.com",
      progress: "100%",
      status: "Completed",
      bucket: "Completed",
    },
    {
      id: "4",
      campaign: "2025 Cloud Admin Certification",
      scope: "Roles",
      reviewer: "ciso@inferencedefense.com",
      progress: "100%",
      status: "Archived",
      bucket: "Archived",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const { bi, setBi, filtered } = useBucketed(rows, CAMP_BUCKETS);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const setStatus = (id: string, s: string, b: string) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: s, bucket: b } : r)),
    );
  const cols = aCols([
    ["campaign", "Campaign"],
    ["scope", "Scope"],
    ["reviewer", "Reviewer"],
    ["progress", "Progress"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <SubTabStrip subs={CAMP_BUCKETS} active={bi} onChange={setBi} />
      <AuthCollection
        title="Certification Campaigns"
        desc="Enterprise-wide review campaigns — quarterly access reviews, privileged certification, PCI / SOC2 and cloud admin certifications."
        searchPlaceholder="Search campaigns"
        commands={[
          {
            key: "new",
            label: "Create Campaign",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateCampaignFlow
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [d, ...rs]);
                    setFlow(null);
                    setToast("Campaign created");
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(filtered, "certification-campaigns"),
          },
        ]}
        filterDefs={[
          { key: "scope", label: "Scope" },
          { key: "reviewer", label: "Reviewer" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={filtered}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "Open Campaign", onClick: open },
                ...(r.status === "Active"
                  ? [
                      {
                        label: "Pause",
                        onClick: () => {
                          setStatus(r.id, "Paused", "Draft");
                          setToast("Paused");
                        },
                      },
                    ]
                  : [
                      {
                        label: "Resume",
                        onClick: () => {
                          setStatus(r.id, "Active", "Active");
                          setToast("Resumed");
                        },
                      },
                    ]),
                {
                  label: "Close Campaign",
                  onClick: () => {
                    setStatus(r.id, "Completed", "Completed");
                    setToast("Campaign closed");
                  },
                },
                {
                  label: "Export Results",
                  onClick: () => authCsv([r], `campaign-${r.campaign}`),
                },
              ]
            : [{ label: "Open Campaign", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.campaign)}
            title={r.campaign}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.scope} · {r.progress} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  {r.status === "Active" ? (
                    <HeaderButton
                      onClick={() => {
                        setStatus(r.id, "Paused", "Draft");
                        close();
                      }}
                    >
                      Pause
                    </HeaderButton>
                  ) : (
                    <HeaderButton
                      onClick={() => {
                        setStatus(r.id, "Active", "Active");
                        close();
                      }}
                    >
                      Resume
                    </HeaderButton>
                  )}
                  <HeaderButton
                    onClick={() => {
                      setStatus(r.id, "Completed", "Completed");
                      close();
                    }}
                  >
                    Close Campaign
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => authCsv([r], `campaign-${r.campaign}`)}
                  >
                    Export Results
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Campaign", v: r.campaign },
                      { k: "Scope", v: r.scope },
                      { k: "Reviewer", v: r.reviewer },
                      { k: "Progress", v: r.progress },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Scope",
                subs: [
                  {
                    label: "Scope",
                    content: tlb([
                      {
                        primary: "Users",
                        secondary: "289 in scope",
                        right: r.scope === "Organization" ? "Included" : "—",
                      },
                      {
                        primary: "Roles",
                        secondary: "12 system + custom",
                        right: "Included",
                      },
                      {
                        primary: "Groups",
                        secondary: "All",
                        right: "Included",
                      },
                      {
                        primary: "Privileged Access",
                        secondary: "8 eligible roles",
                        right: r.scope.includes("Privileged")
                          ? "Focus"
                          : "Included",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Reviewers",
                subs: [
                  {
                    label: "Reviewers",
                    content: tlb([
                      {
                        primary: r.reviewer,
                        secondary: "Lead reviewer",
                        right: <AStatus s="Active" />,
                      },
                      {
                        primary: "security-manager@inferencedefense.com",
                        secondary: "Delegate",
                        right: <AStatus s="Active" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Progress",
                subs: [
                  {
                    label: "Progress",
                    content: kvb([
                      { k: "Total reviews", v: "289" },
                      {
                        k: "Completed",
                        v: r.progress === "100%" ? "289" : "225",
                      },
                      { k: "Pending", v: r.progress === "100%" ? "0" : "61" },
                      { k: "Overdue", v: "3" },
                      {
                        k: "Violations found",
                        v: <StatusIndicator tone="warn">2</StatusIndicator>,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Findings",
                subs: [
                  {
                    label: "Findings",
                    content: tlb([
                      {
                        primary: "SoD violation",
                        secondary: "Approve + Execute (1 user)",
                        right: <AStatus s="High" />,
                      },
                      {
                        primary: "Dormant accounts",
                        secondary: "4 flagged",
                        right: <AStatus s="Medium" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Decisions",
                subs: [
                  {
                    label: "Decisions",
                    content: tlb([
                      {
                        primary: "Approved",
                        secondary: "281 access items",
                        right: "",
                      },
                      {
                        primary: "Revoked",
                        secondary: "6 access items",
                        right: "",
                      },
                      {
                        primary: "Exceptions",
                        secondary: "2 approved",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Evidence",
                subs: [
                  {
                    label: "Evidence",
                    content: tlb([
                      {
                        primary: "Campaign report",
                        secondary: `${r.campaign}.pdf`,
                        right: "",
                      },
                      {
                        primary: "Reviewer attestations",
                        secondary: "signed",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Campaign created",
                        secondary: r.reviewer,
                        right: "2026-04-01",
                      },
                      {
                        primary: "Campaign launched",
                        secondary: "289 reviews generated",
                        right: "2026-04-02",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 5. SEGREGATION OF DUTIES ────────────────────────────────────────────────
const SOD_VIEWS = [
  "Policy Violations",
  "Active Exceptions",
  "Policy Rules",
  "Historical Violations",
];
function SegregationOfDuties() {
  const [v, setV] = React.useState(0);
  return (
    <>
      <SubTabStrip subs={SOD_VIEWS} active={v} onChange={setV} />
      {v === 0 && <SodViolations />}
      {v === 1 && <SodExceptions />}
      {v === 2 && <SodRules />}
      {v === 3 && <SodHistory />}
    </>
  );
}
function SodViolations() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      violation: "Approve + Execute Remediation",
      user: "rami@inferencedefense.com",
      severity: "Critical",
      policy: "SOD-001",
      status: "Open",
    },
    {
      id: "1",
      violation: "Create User + Assign Admin Role",
      user: "ops@inferencedefense.com",
      severity: "High",
      policy: "SOD-004",
      status: "Open",
    },
    {
      id: "2",
      violation: "Manage IAM + Audit IAM",
      user: "compliance@inferencedefense.com",
      severity: "Medium",
      policy: "SOD-007",
      status: "Investigating",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const close = (id: string) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: "Closed" } : r)),
    );
  const cols = aCols([
    ["violation", "Violation"],
    ["user", "User"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["policy", "Policy"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Policy Violations — toxic permission combinations"
        desc="Detected segregation-of-duties conflicts. Each shows the access path that produces the violation and possible remediations."
        searchPlaceholder="Search violations"
        commands={[
          {
            key: "rule",
            label: "Create Rule",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateSodRuleFlow
                  onClose={() => setFlow(null)}
                  onDone={(n) => {
                    setFlow(null);
                    setToast(`Rule “${n}” created`);
                  }}
                />,
              ),
          },
          {
            key: "imp",
            label: "Import Policy",
            icon: <Plug size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ImportPolicyFlow
                  onClose={() => setFlow(null)}
                  onDone={(n) => {
                    setFlow(null);
                    setToast(`${n} rules imported`);
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "sod-violations"),
          },
        ]}
        filterDefs={[
          { key: "severity", label: "Severity" },
          { key: "policy", label: "Policy" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "Open Violation", onClick: open },
                {
                  label: "Create Exception",
                  onClick: () =>
                    setFlow(
                      <CreateExceptionFlow
                        onClose={() => setFlow(null)}
                        onCreate={() => {
                          setFlow(null);
                          setToast("Exception created");
                        }}
                      />,
                    ),
                },
                {
                  label: "Remediate",
                  onClick: () =>
                    setFlow(
                      <RemediateFlow
                        onClose={() => setFlow(null)}
                        onDone={(a) => {
                          close(r.id);
                          setFlow(null);
                          setToast(`Remediated: ${a}`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Assign Reviewer",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title="Assign reviewer"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    ),
                },
                { label: "Close", danger: true, onClick: () => close(r.id) },
              ]
            : [{ label: "Open Violation", onClick: open }]
        }
        drawer={(r, dclose) => (
          <AuthEntityDrawer
            initials={initials2(r.violation)}
            title={r.violation}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.user} · <AStatus s={r.severity} /> · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() =>
                      setFlow(
                        <RemediateFlow
                          onClose={() => setFlow(null)}
                          onDone={(a) => {
                            close(r.id);
                            dclose();
                            setToast(`Remediated: ${a}`);
                          }}
                        />,
                      )
                    }
                  >
                    Remediate
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <CreateExceptionFlow
                          onClose={() => setFlow(null)}
                          onCreate={() => {
                            setFlow(null);
                            setToast("Exception created");
                          }}
                        />,
                      )
                    }
                  >
                    Create Exception
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      close(r.id);
                      dclose();
                    }}
                  >
                    Close
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Violation", v: r.violation },
                      { k: "User", v: r.user },
                      { k: "Severity", v: <AStatus s={r.severity} /> },
                      { k: "Policy", v: r.policy },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Policy",
                subs: [
                  {
                    label: "Policy",
                    content: kvb([
                      { k: "Policy ID", v: r.policy },
                      { k: "Type", v: "Blocked" },
                      { k: "Enforcement", v: "Hard" },
                      { k: "Conflicting duties", v: r.violation },
                    ]),
                  },
                ],
              },
              {
                label: "Access Path",
                subs: [
                  {
                    label: "Access Path",
                    content: tlb([
                      { primary: r.user, secondary: "User", right: "" },
                      {
                        primary: "└─ Security Engineers",
                        secondary: "Group",
                        right: "",
                      },
                      {
                        primary: "   └─ Enterprise Security Administrator",
                        secondary: "Role",
                        right: "",
                      },
                      {
                        primary: "      └─ Approve + Execute Remediation",
                        secondary: "Permission (toxic)",
                        right: <AStatus s="Critical" />,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Risk Analysis",
                subs: [
                  {
                    label: "Risk Analysis",
                    content: kvb([
                      {
                        k: "Impact",
                        v: "Can approve and self-execute production remediation",
                      },
                      { k: "Production access", v: <AStatus s="Yes" /> },
                      {
                        k: "Agent execution",
                        v: <AStatus s="Execute Remediation" />,
                      },
                      { k: "Likelihood", v: <AStatus s={r.severity} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Remediation",
                subs: [
                  {
                    label: "Remediation",
                    content: (
                      <>
                        {tlb([
                          {
                            primary: "Remove Assignment",
                            secondary: "drop Approve from this user",
                            right: "Recommended",
                          },
                          {
                            primary: "Remove Group Membership",
                            secondary: "leave Security Engineers",
                            right: "",
                          },
                          {
                            primary: "Reduce Scope",
                            secondary: "limit to non-prod",
                            right: "",
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() =>
                                setFlow(
                                  <RemediateFlow
                                    onClose={() => setFlow(null)}
                                    onDone={(a) => {
                                      close(r.id);
                                      dclose();
                                      setToast(`Remediated: ${a}`);
                                    }}
                                  />,
                                )
                              }
                            >
                              Remediate
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Exception Workflow",
                subs: [
                  {
                    label: "Exception Workflow",
                    content: (
                      <>
                        {tlb([
                          {
                            primary: "No active exception",
                            secondary: "create one if access is justified",
                            right: "",
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              onClick={() =>
                                setFlow(
                                  <CreateExceptionFlow
                                    onClose={() => setFlow(null)}
                                    onCreate={() => {
                                      setFlow(null);
                                      setToast("Exception created");
                                    }}
                                  />,
                                )
                              }
                            >
                              Create Exception
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Violation detected",
                        secondary: r.policy,
                        right: "2026-06-20",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={dclose}
          />
        )}
      />
    </>
  );
}
function SodExceptions() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      exception: "Approve + Execute Remediation",
      user: "ciso@inferencedefense.com",
      approvedBy: "org-owner@inferencedefense.com",
      expires: "2026-09-30",
      status: "Active",
      justification: "Break-glass operator — incident response",
    },
    {
      id: "1",
      exception: "Manage IAM + Audit IAM",
      user: "compliance@inferencedefense.com",
      approvedBy: "ciso@inferencedefense.com",
      expires: "2026-12-31",
      status: "Active",
      justification: "Small team — compensating monitoring in place",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["exception", "Exception"],
    ["user", "User"],
    ["approvedBy", "Approved By"],
    ["expires", "Expires"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Active Exceptions"
        desc="Approved, time-boxed exceptions to SoD policy — each with business justification and an expiry."
        searchPlaceholder="Search exceptions"
        commands={[
          {
            key: "new",
            label: "Create Exception",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateExceptionFlow
                  onClose={() => setFlow(null)}
                  onCreate={(d) => {
                    setRows((rs) => [d, ...rs]);
                    setFlow(null);
                    setToast("Exception created");
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "sod-exceptions"),
          },
        ]}
        filterDefs={[
          { key: "status", label: "Status" },
          { key: "approvedBy", label: "Approved By" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                {
                  label: "Revoke Exception",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, dclose) => (
          <AuthEntityDrawer
            initials={initials2(r.exception)}
            title={r.exception}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.user} · expires {r.expires} · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <HeaderButton
                  variant="danger"
                  onClick={() => {
                    setRows((rs) => rs.filter((x) => x.id !== r.id));
                    dclose();
                  }}
                >
                  Revoke Exception
                </HeaderButton>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Exception", v: r.exception },
                      { k: "User", v: r.user },
                      { k: "Approved by", v: r.approvedBy },
                      { k: "Expires", v: r.expires },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Business Justification",
                subs: [
                  {
                    label: "Business Justification",
                    content: kvb([
                      { k: "Justification", v: r.justification },
                      {
                        k: "Compensating controls",
                        v: "Continuous monitoring + alerting",
                      },
                      { k: "Ticket", v: "GRC-220" },
                    ]),
                  },
                ],
              },
              {
                label: "Approvals",
                subs: [
                  {
                    label: "Approvals",
                    content: tlb([
                      {
                        primary: r.approvedBy,
                        secondary: "Approved",
                        right: "2026-05-01",
                      },
                      {
                        primary: "org-owner@inferencedefense.com",
                        secondary: "Co-signed",
                        right: "2026-05-01",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Expiration",
                subs: [
                  {
                    label: "Expiration",
                    content: kvb([
                      { k: "Expires", v: r.expires },
                      { k: "Auto-revoke", v: <AStatus s="Enabled" /> },
                      { k: "Renewal", v: "Requires re-justification" },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Exception approved",
                        secondary: r.approvedBy,
                        right: "2026-05-01",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={dclose}
          />
        )}
      />
    </>
  );
}
function SodRules() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      rule: "Approve + Execute Remediation",
      type: "Blocked",
      severity: "Critical",
      status: "Active",
    },
    {
      id: "1",
      rule: "Create User + Assign Admin Role",
      type: "Blocked",
      severity: "High",
      status: "Active",
    },
    {
      id: "2",
      rule: "Manage IAM + Audit IAM",
      type: "Warning",
      severity: "Medium",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["rule", "Rule"],
    ["type", "Type"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Policy Rules"
        desc="The segregation-of-duties rule set the engine enforces across all assignments."
        searchPlaceholder="Search rules"
        commands={[
          {
            key: "new",
            label: "Create Rule",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateSodRuleFlow
                  onClose={() => setFlow(null)}
                  onDone={(n) => {
                    setRows((rs) => [
                      {
                        id: `r${Date.now()}`,
                        rule: n,
                        type: "Blocked",
                        severity: "High",
                        status: "Active",
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast("Rule created");
                  }}
                />,
              ),
          },
          {
            key: "imp",
            label: "Import Policy",
            icon: <Plug size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ImportPolicyFlow
                  onClose={() => setFlow(null)}
                  onDone={(n) => {
                    setFlow(null);
                    setToast(`${n} rules imported`);
                  }}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "sod-rules"),
          },
        ]}
        filterDefs={[
          { key: "type", label: "Type" },
          { key: "severity", label: "Severity" },
          { key: "status", label: "Status" },
        ]}
        columns={cols}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View", onClick: open },
                { label: "Edit", onClick: () => setToast("Editing rule") },
                {
                  label: r.status === "Active" ? "Disable" : "Enable",
                  onClick: () =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? {
                              ...x,
                              status:
                                x.status === "Active" ? "Disabled" : "Active",
                            }
                          : x,
                      ),
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View", onClick: open }]
        }
        drawer={(r, dclose) => (
          <AuthEntityDrawer
            initials={initials2(r.rule)}
            title={r.rule}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.type} · <AStatus s={r.severity} /> · <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Editing")}>
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setRows((rs) =>
                        rs.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                status:
                                  x.status === "Active" ? "Disabled" : "Active",
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    {r.status === "Active" ? "Disable" : "Enable"}
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Rule", v: r.rule },
                      { k: "Type", v: r.type },
                      { k: "Severity", v: <AStatus s={r.severity} /> },
                      {
                        k: "Enforcement",
                        v: r.type === "Blocked" ? "Hard" : "Soft",
                      },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Conflict Analysis",
                subs: [
                  {
                    label: "Conflict Analysis",
                    content: kvb([
                      {
                        k: "Current violations",
                        v: <StatusIndicator tone="warn">1</StatusIndicator>,
                      },
                      { k: "Active exceptions", v: "1" },
                      { k: "Affected users", v: "1" },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Rule created",
                        secondary: "policy baseline",
                        right: "2026-01-10",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={dclose}
          />
        )}
      />
    </>
  );
}
function SodHistory() {
  const SEED: ARow[] = [
    {
      id: "0",
      violation: "Approve + Execute Remediation",
      user: "former-admin@company.com",
      severity: "Critical",
      resolved: "2026-04-12",
      result: "Remediated",
    },
    {
      id: "1",
      violation: "Create User + Assign Admin Role",
      user: "ops@inferencedefense.com",
      severity: "High",
      resolved: "2026-03-01",
      result: "Exception",
    },
  ];
  const [rows] = React.useState<ARow[]>(SEED);
  const cols = aCols([
    ["violation", "Violation"],
    ["user", "User"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["resolved", "Resolved"],
    ["result", "Result", (r) => <AStatus s={r.result} />],
  ]);
  return (
    <AuthCollection
      title="Historical Violations"
      desc="Read-only record of resolved SoD violations — how each toxic combination was remediated or excepted."
      searchPlaceholder="Search history"
      commands={[
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "sod-history"),
        },
      ]}
      filterDefs={[
        { key: "severity", label: "Severity" },
        { key: "result", label: "Result" },
      ]}
      columns={cols}
      rows={rows}
      drawer={(r, dclose) => (
        <AuthEntityDrawer
          initials={initials2(r.violation)}
          title={r.violation}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.user} · <AStatus s={r.result} /> · {r.resolved}
            </span>
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Violation", v: r.violation },
                    { k: "User", v: r.user },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Resolved", v: r.resolved },
                    { k: "Result", v: <AStatus s={r.result} /> },
                  ]),
                },
              ],
            },
            {
              label: "Resolution",
              subs: [
                {
                  label: "Resolution",
                  content: tlb([
                    {
                      primary:
                        r.result === "Remediated"
                          ? "Assignment removed"
                          : "Exception approved",
                      secondary:
                        r.result === "Remediated"
                          ? "Approve permission dropped"
                          : "co-signed by org owner",
                      right: r.resolved,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Audit Evidence",
              subs: [
                {
                  label: "Audit Evidence",
                  content: kvb([
                    { k: "Event hash", v: `0x${r.id}b71e9` },
                    { k: "Recorded by", v: "tamper-evident ledger" },
                    { k: "Reviewer", v: "compliance@inferencedefense.com" },
                  ]),
                },
              ],
            },
          ]}
          onClose={dclose}
        />
      )}
    />
  );
}

// ── shared building blocks ──────────────────────────────────────────────────
type ARow = Record<string, string> & { id: string };
function aStatusTone(s: string): StatusTone {
  const x = s.toLowerCase();
  if (
    /(active|enabled|valid|verified|healthy|compliant|registered|enforced|resolved|low|managed|published|connected|synced|operational|phishing-resistant)/.test(
      x,
    )
  )
    return "ok";
  if (
    /(pending|expiring|warning|degraded|review|partial|medium|monitoring)/.test(
      x,
    )
  )
    return "warn";
  if (
    /(disabled|expired|revoked|error|down|blocked|non-compliant|at risk|locked|failed|weak|high|critical|open)/.test(
      x,
    )
  )
    return "danger";
  return "muted";
}
function AStatus({ s }: { s: string }) {
  return <StatusIndicator tone={aStatusTone(s)}>{s}</StatusIndicator>;
}
function aCols(
  defs: [string, string, ((r: ARow) => React.ReactNode)?][],
): Column<ARow>[] {
  return defs.map(([key, header, render], idx) => ({
    key,
    header,
    sortValue: (r) => r[key] ?? "",
    render:
      render ??
      (idx === 0
        ? (r) => <span style={{ color: T.textPrimary }}>{r[key]}</span>
        : (r) => r[key] ?? "—"),
  }));
}
const kvb = (items: { k: string; v: React.ReactNode }[]) => (
  <KVGrid cols={1} items={items} />
);
const tlb = (
  items: {
    primary: React.ReactNode;
    secondary?: React.ReactNode;
    right?: React.ReactNode;
  }[],
) => <UDRows items={items} />;
function ActRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
      {children}
    </div>
  );
}
function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: StatusTone;
}) {
  const c =
    tone === "ok"
      ? T.success
      : tone === "warn"
        ? T.warning
        : tone === "danger"
          ? T.danger
          : T.textPrimary;
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "14px 16px",
        background: "var(--cg-bg-badge)",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// Config-driven entity drawer on the shared DetailDrawer shell.
function AuthEntityDrawer({
  initials,
  title,
  meta,
  actions,
  sections,
  onClose,
}: {
  initials: string;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  sections: {
    label: string;
    subs: { label: string; content: React.ReactNode }[];
  }[];
  onClose: () => void;
}) {
  const [sec, setSec] = React.useState(0);
  const [sub, setSub] = React.useState(0);
  const { subs } = sections[sec];
  return (
    <DetailDrawer
      initials={initials}
      title={title}
      meta={meta}
      actions={actions}
      sections={sections.map((s) => s.label)}
      sectionIndex={sec}
      onSection={(i) => {
        setSec(i);
        setSub(0);
      }}
      subs={subs.map((s) => s.label)}
      subIndex={sub}
      onSub={setSub}
      width={880}
      onClose={onClose}
      footer={<HeaderButton onClick={onClose}>Close</HeaderButton>}
    >
      {subs[sub].content}
    </DetailDrawer>
  );
}

// Standard collection layout (Users pattern): header + action bar + filters +
// search + table + bulk + row actions + drawer.
function AuthCollection({
  title,
  desc,
  kpi,
  commands,
  filterDefs,
  columns,
  rows,
  bulk,
  rowMenu,
  drawer,
  searchPlaceholder,
}: {
  title: string;
  desc: string;
  kpi?: React.ReactNode;
  commands?: CommandItem[];
  filterDefs: { key: string; label: string }[];
  columns: Column<ARow>[];
  rows: ARow[];
  bulk?: (ids: string[], clear: () => void) => React.ReactNode;
  rowMenu?: (
    r: ARow,
    open: () => void,
  ) => { label: string; danger?: boolean; onClick: () => void }[];
  drawer: (r: ARow, close: () => void) => React.ReactNode;
  searchPlaceholder: string;
}) {
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [sel, setSel] = React.useState<ARow | null>(null);
  const facet = (key: string) => [
    { value: "", label: "All" },
    ...Array.from(new Set(rows.map((r) => r[key]).filter(Boolean)))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];
  const filtered = rows.filter(
    (r) =>
      (!search ||
        Object.values(r).some((v) =>
          String(v).toLowerCase().includes(search.toLowerCase()),
        )) &&
      filterDefs.every(
        (fd) => !filters[fd.key] || r[fd.key] === filters[fd.key],
      ),
  );
  return (
    <>
      {kpi}
      <ListView<ARow>
        title={title}
        desc={desc}
        commands={commands}
        presets={[
          {
            label: "All",
            onApply: () => {
              setSearch("");
              setFilters({});
            },
          },
        ]}
        pills={filterDefs.map((fd) => ({
          key: fd.key,
          label: fd.label,
          value: filters[fd.key] ?? "",
          onChange: (v: string) => setFilters((f) => ({ ...f, [fd.key]: v })),
          options: facet(fd.key),
        }))}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={searchPlaceholder}
        count={filtered.length}
        columns={columns}
        rows={filtered}
        pageSize={12}
        onRowClick={(r) => setSel(r)}
        selectable={!!bulk}
        bulkActions={bulk}
        rowActions={
          rowMenu
            ? (r) => <RowMenu items={rowMenu(r, () => setSel(r))} />
            : undefined
        }
        empty={
          <EmptyState
            icon={<Plus size={20} />}
            title="Nothing to show yet"
            hint="No items to show."
          />
        }
      />
      {sel && drawer(sel, () => setSel(null))}
    </>
  );
}

const initials2 = (s: string) =>
  (s.match(/[A-Za-z0-9]/g) ?? ["A"]).slice(0, 2).join("").toUpperCase();

// ── reusable flow utilities ─────────────────────────────────────────────────
function authCsv(rows: ARow[], name: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter((k) => k !== "id");
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [keys.join(",")]
    .concat(rows.map((r) => keys.map((k) => esc(r[k])).join(",")))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  React.useEffect(() => {
    const t = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 22,
        right: 22,
        zIndex: 1400,
        background: "var(--cg-workspace-dropdown-bg)",
        border: `1px solid ${T.accent}`,
        borderRadius: 8,
        padding: "11px 16px",
        fontSize: 13,
        color: T.textPrimary,
        boxShadow: "var(--cg-shadow-dropdown)",
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <Check size={15} color={T.success} /> {msg}
    </div>
  );
}
// Pick one item from a list, then apply an action (Enable / Disable / Configure …).
function PickFlow({
  title,
  subtitle,
  items,
  actionLabel,
  danger,
  onApply,
  onClose,
}: {
  title: string;
  subtitle: string;
  items: { id: string; label: string; sub?: string }[];
  actionLabel: string;
  danger?: boolean;
  onApply: (id: string) => void;
  onClose: () => void;
}) {
  const [pick, setPick] = React.useState(items[0]?.id ?? "");
  return (
    <Drawer
      title={title}
      subtitle={subtitle}
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant={danger ? "danger" : "primary"}
            disabled={!pick}
            onClick={() => onApply(pick)}
          >
            {actionLabel}
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <div
        style={{
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {items.map((it, i) => (
          <label
            key={it.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 14px",
              cursor: "pointer",
              borderBottom:
                i < items.length - 1 ? `1px solid ${T.border}` : "none",
              background: pick === it.id ? "var(--cg-bg-hover)" : "transparent",
            }}
          >
            <input
              type="radio"
              checked={pick === it.id}
              onChange={() => setPick(it.id)}
            />
            <span>
              <span style={{ fontSize: 13, color: T.textPrimary }}>
                {it.label}
              </span>
              {it.sub && (
                <span
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    color: T.textMuted,
                  }}
                >
                  {it.sub}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </Drawer>
  );
}
// Assign a policy/object to a target.
function AssignFlow({
  title,
  onClose,
  onDone,
}: {
  title: string;
  onClose: () => void;
  onDone: (summary: string) => void;
}) {
  const [type, setType] = React.useState("Users");
  const [target, setTarget] = React.useState("");
  const err = !target.trim();
  return (
    <Drawer
      title={title}
      subtitle="Choose what this applies to. Scoped assignments win over broader ones."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() => onDone(`${type}: ${target.trim()}`)}
          >
            Assign
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Assign to">
        <Sel
          value={type}
          onChange={setType}
          opts={[
            "Users",
            "Groups",
            "Roles",
            "Workspaces",
            "Service Identities",
          ]}
        />
      </Field>
      <Req label={`${type} (name or email)`} err={err}>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={errInp(err)}
          placeholder={
            type === "Users" ? "name@company.com" : `e.g. ${type} name`
          }
        />
      </Req>
    </Drawer>
  );
}
// Recovery codes — generated client-side, copy/download, confirm-saved.
function RecoveryCodesFlow({
  who,
  onClose,
}: {
  who: string;
  onClose: () => void;
}) {
  const gen = () =>
    Array.from(
      { length: 10 },
      () =>
        `${Math.random().toString(36).slice(2, 6)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
    );
  const [codes, setCodes] = React.useState<string[]>(gen);
  const [saved, setSaved] = React.useState(false);
  return (
    <Drawer
      title="Recovery codes"
      subtitle={who}
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" disabled={!saved} onClick={onClose}>
            Done
          </HeaderButton>
          <HeaderButton onClick={() => setCodes(gen())}>
            Regenerate
          </HeaderButton>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 14 }}>
        Each code can be used once if MFA devices are unavailable. Store them
        securely — they are shown only now.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontFamily: "monospace",
          fontSize: 14,
          color: T.textPrimary,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: 14,
        }}
      >
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <HeaderButton
          onClick={() => {
            navigator.clipboard?.writeText(codes.join("\n"));
          }}
        >
          Copy
        </HeaderButton>
        <HeaderButton
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([codes.join("\n")], { type: "text/plain" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "recovery-codes.txt";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download
        </HeaderButton>
      </div>
      <div style={{ marginTop: 14 }}>
        <Chk
          label="I have saved these recovery codes"
          on={saved}
          onChange={setSaved}
        />
      </div>
    </Drawer>
  );
}
// A simple scoped action (Require Enrollment / Require Registration / Force Re-auth).
function ScopeActionFlow({
  title,
  subtitle,
  submitLabel,
  onClose,
  onDone,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [scope, setScope] = React.useState("Users without MFA");
  const [deadline, setDeadline] = React.useState("");
  const [grace, setGrace] = React.useState("7 days");
  const [notify, setNotify] = React.useState(true);
  return (
    <Drawer
      title={title}
      subtitle={subtitle}
      width={540}
      onClose={onClose}
      footer={
        <>
          <HeaderButton variant="primary" onClick={onDone}>
            {submitLabel}
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Scope">
        <Sel
          value={scope}
          onChange={setScope}
          opts={[
            "All employees",
            "Users without MFA",
            "Privileged users",
            "Guests",
            "By department",
            "By workspace",
          ]}
        />
      </Field>
      <Field label="Deadline">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={inp}
        />
      </Field>
      <Field label="Grace period">
        <Sel
          value={grace}
          onChange={setGrace}
          opts={["None", "24 hours", "7 days", "14 days", "30 days"]}
        />
      </Field>
      <Chk
        label="Notify affected users by email"
        on={notify}
        onChange={setNotify}
      />
    </Drawer>
  );
}
// Launch a campaign.
function CampaignFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [audience, setAudience] = React.useState("Users without MFA");
  const [methods, setMethods] = React.useState<string[]>(["Passkey"]);
  const [deadline, setDeadline] = React.useState("");
  const [remind, setRemind] = React.useState(true);
  const err = !name.trim();
  const toggle = (m: string) =>
    setMethods((ms) =>
      ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m],
    );
  return (
    <Drawer
      title="Launch MFA campaign"
      subtitle="Nudge or require users to enroll stronger MFA by a deadline."
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() => onDone(name.trim())}
          >
            Launch campaign
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Campaign name" err={err}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={errInp(err)}
          placeholder="e.g. Passkey rollout — Q3"
        />
      </Req>
      <Field label="Audience">
        <Sel
          value={audience}
          onChange={setAudience}
          opts={[
            "All employees",
            "Users without MFA",
            "Guests",
            "Privileged users",
            "By department",
          ]}
        />
      </Field>
      <Field label="Required methods">
        {["Authenticator", "Passkey", "Security Key"].map((m) => (
          <Chk
            key={m}
            label={m}
            on={methods.includes(m)}
            onChange={() => toggle(m)}
          />
        ))}
      </Field>
      <Field label="Deadline">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={inp}
        />
      </Field>
      <Chk
        label="Send reminder emails until enrolled"
        on={remind}
        onChange={setRemind}
      />
    </Drawer>
  );
}
// Stepped policy wizard (MFA / Password / Credential / Session).
const POL_STEPS = ["Basics", "Rules", "Assignments", "Review"];
function PolicyWizardFlow({
  kind,
  onClose,
  onCreate,
}: {
  kind: "MFA" | "Password" | "Credential" | "Session";
  onClose: () => void;
  onCreate: (name: string, scope: string) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState({
    name: "",
    scope: "Organization",
    assignTo: "Users",
    target: "All",
    // password
    minLen: "14",
    complexity: "3 of 4 categories",
    history: "24",
    expiration: "Never",
    lockout: "5 / 15m",
    // mfa
    requireAdmins: true,
    riskBased: true,
    methods: "Phishing-resistant",
    // credential / session
    rotation: "90 days",
    tokenLife: "8 hours",
    idle: "30 min",
    concurrent: "3",
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const err = !f.name.trim();
  const last = step === POL_STEPS.length - 1;
  return (
    <WizardShell
      title={`Create ${kind} policy`}
      steps={POL_STEPS}
      step={step}
      setStep={setStep}
      stepError={(i) => (i === 0 ? err : false)}
      showErrors={last}
      canFinish={!err}
      finishLabel="Create policy"
      onFinish={() => {
        if (err) {
          setStep(0);
          return;
        }
        onCreate(f.name.trim(), f.scope);
      }}
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <H>Set up the policy</H>
          <P>Name the policy and choose the scope it governs.</P>
          <Req label="Policy name" err={err}>
            <input
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              style={errInp(err)}
              placeholder={`e.g. ${kind} floor`}
            />
          </Req>
          <Req label="Scope">
            <Sel
              value={f.scope}
              onChange={(v) => set({ scope: v })}
              opts={[
                "Organization",
                "Workspace",
                "Role: Admins",
                "Service Identities",
              ]}
            />
          </Req>
        </>
      )}
      {step === 1 && (
        <>
          <H>Rules</H>
          <P>These rules are enforced for everyone in scope.</P>
          {kind === "Password" && (
            <>
              <Field label="Minimum length">
                <Sel
                  value={f.minLen}
                  onChange={(v) => set({ minLen: v })}
                  opts={["8", "12", "14", "16", "20"]}
                />
              </Field>
              <Field label="Complexity">
                <Sel
                  value={f.complexity}
                  onChange={(v) => set({ complexity: v })}
                  opts={["3 of 4 categories", "4 of 4 categories"]}
                />
              </Field>
              <Field label="Password history">
                <Sel
                  value={f.history}
                  onChange={(v) => set({ history: v })}
                  opts={["10", "24"]}
                />
              </Field>
              <Field label="Expiration">
                <Sel
                  value={f.expiration}
                  onChange={(v) => set({ expiration: v })}
                  opts={["Never", "90 days", "180 days"]}
                />
              </Field>
              <Field label="Lockout threshold">
                <Sel
                  value={f.lockout}
                  onChange={(v) => set({ lockout: v })}
                  opts={["3 / 30m", "5 / 15m", "10 / 5m"]}
                />
              </Field>
            </>
          )}
          {kind === "MFA" && (
            <>
              <Field label="Allowed methods">
                <Sel
                  value={f.methods}
                  onChange={(v) => set({ methods: v })}
                  opts={["Phishing-resistant", "Strong + OTP", "Any"]}
                />
              </Field>
              <Chk
                label="Require MFA for administrators"
                on={f.requireAdmins}
                onChange={(v) => set({ requireAdmins: v })}
              />
              <Chk
                label="Enable risk-based step-up MFA"
                on={f.riskBased}
                onChange={(v) => set({ riskBased: v })}
              />
            </>
          )}
          {(kind === "Credential" || kind === "Session") && (
            <>
              <Field label="Credential / token rotation">
                <Sel
                  value={f.rotation}
                  onChange={(v) => set({ rotation: v })}
                  opts={["30 days", "90 days", "180 days"]}
                />
              </Field>
              <Field label="Token lifetime">
                <Sel
                  value={f.tokenLife}
                  onChange={(v) => set({ tokenLife: v })}
                  opts={["1 hour", "8 hours", "24 hours"]}
                />
              </Field>
              <Field label="Idle timeout">
                <Sel
                  value={f.idle}
                  onChange={(v) => set({ idle: v })}
                  opts={["15 min", "30 min", "60 min"]}
                />
              </Field>
              <Field label="Concurrent sessions">
                <Sel
                  value={f.concurrent}
                  onChange={(v) => set({ concurrent: v })}
                  opts={["1", "3", "5", "Unlimited"]}
                />
              </Field>
            </>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <H>Assignments</H>
          <P>
            Who this policy applies to. The most-restrictive policy always wins.
          </P>
          <Field label="Assign to">
            <Sel
              value={f.assignTo}
              onChange={(v) => set({ assignTo: v })}
              opts={[
                "Users",
                "Groups",
                "Roles",
                "Workspaces",
                "Service Identities",
              ]}
            />
          </Field>
          <Field label="Target">
            <input
              value={f.target}
              onChange={(e) => set({ target: e.target.value })}
              style={inp}
              placeholder="All, or a specific name"
            />
          </Field>
        </>
      )}
      {step === 3 && (
        <>
          <H>Review and create</H>
          <P>Review the policy before creating it.</P>
          <ReviewSec
            title="Basics"
            onEdit={() => setStep(0)}
            errors={err ? ["Please name the policy."] : []}
          >
            <KV k="Name" v={f.name || "—"} />
            <KV k="Scope" v={f.scope} />
          </ReviewSec>
          <ReviewSec title="Assignments" onEdit={() => setStep(2)}>
            <KV k="Assign to" v={`${f.assignTo}: ${f.target}`} />
          </ReviewSec>
        </>
      )}
    </WizardShell>
  );
}
// Add an authentication method.
function AddMethodFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (row: ARow) => void;
}) {
  const [type, setType] = React.useState("Passkey (FIDO2)");
  const ratings: Record<string, string> = {
    "Passkey (FIDO2)": "Phishing-resistant",
    "Authenticator app": "Strong",
    "FIDO2 security key": "Phishing-resistant",
    Certificate: "Strong",
    "Email OTP": "Weak",
    "SMS OTP": "Weak",
  };
  const [platforms, setPlatforms] = React.useState<string[]>([
    "iOS",
    "Android",
  ]);
  const [def, setDef] = React.useState(false);
  const toggle = (p: string) =>
    setPlatforms((ps) =>
      ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p],
    );
  return (
    <Drawer
      title="Add authentication method"
      subtitle="Enable a new mechanism for the organization."
      width={540}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            onClick={() =>
              onCreate({
                id: `m${Date.now()}`,
                method: type,
                enrolled: "0",
                usage: "0%",
                status: def ? "Enabled" : "Restricted",
                rating: ratings[type] ?? "Strong",
                modified: new Date().toISOString().slice(0, 10),
              })
            }
          >
            Add method
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Method type">
        <Sel value={type} onChange={setType} opts={Object.keys(ratings)} />
      </Field>
      <KVGrid
        cols={1}
        items={[
          {
            k: "Security rating",
            v: <AStatus s={ratings[type] ?? "Strong"} />,
          },
        ]}
      />
      <Field label="Supported platforms">
        {["iOS", "Android", "Windows", "macOS", "Web"].map((p) => (
          <Chk
            key={p}
            label={p}
            on={platforms.includes(p)}
            onChange={() => toggle(p)}
          />
        ))}
      </Field>
      <Chk label="Set as a default method" on={def} onChange={setDef} />
    </Drawer>
  );
}
// Generate a Temporary Access Pass.
function GenerateTapFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (row: ARow) => void;
}) {
  const [user, setUser] = React.useState("");
  const [duration, setDuration] = React.useState("8 hours");
  const [oneTime, setOneTime] = React.useState(true);
  const err = !user.includes("@");
  return (
    <Drawer
      title="Generate Temporary Access Pass"
      subtitle="A time-boxed passcode for onboarding or recovery without a password."
      width={540}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() => {
              const now = new Date();
              const hrs = parseInt(duration, 10) || 8;
              const exp = new Date(now.getTime() + hrs * 3600000);
              onCreate({
                id: `t${Date.now()}`,
                user: user.trim(),
                created: now.toISOString().slice(0, 16).replace("T", " "),
                expires: exp.toISOString().slice(0, 16).replace("T", " "),
                usage: oneTime ? "0 / 1" : "0 / ∞",
                status: "Active",
              });
            }}
          >
            Generate
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="User email" err={err}>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={errInp(err)}
          placeholder="name@company.com"
        />
      </Req>
      <Field label="Duration">
        <Sel
          value={duration}
          onChange={setDuration}
          opts={["1 hours", "8 hours", "24 hours", "72 hours"]}
        />
      </Field>
      <Chk label="One-time use" on={oneTime} onChange={setOneTime} />
    </Drawer>
  );
}
// Register a security key.
function RegisterKeyFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (row: ARow) => void;
}) {
  const [user, setUser] = React.useState("");
  const [vendor, setVendor] = React.useState("Yubico");
  const [model, setModel] = React.useState("");
  const err = !user.includes("@") || !model.trim();
  return (
    <Drawer
      title="Register security key"
      subtitle="Enroll a FIDO2 hardware authenticator for a user."
      width={540}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `k${Date.now()}`,
                user: user.trim(),
                vendor,
                model: model.trim(),
                registered: new Date().toISOString().slice(0, 10),
                lastUsed: "—",
                status: "Active",
              })
            }
          >
            Register key
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="User email" err={!user.includes("@")}>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={errInp(!user.includes("@"))}
          placeholder="name@company.com"
        />
      </Req>
      <Field label="Vendor">
        <Sel
          value={vendor}
          onChange={setVendor}
          opts={["Yubico", "Feitian", "Google", "SoloKeys"]}
        />
      </Field>
      <Req label="Model" err={!model.trim()}>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={errInp(!model.trim())}
          placeholder="e.g. YubiKey 5C NFC"
        />
      </Req>
    </Drawer>
  );
}
// Open an investigation / incident.
function InvestigationFlow({
  prefill,
  onClose,
  onDone,
}: {
  prefill?: string;
  onClose: () => void;
  onDone: (title: string) => void;
}) {
  const [title, setTitle] = React.useState(prefill ?? "");
  const [severity, setSeverity] = React.useState("High");
  const [assignee, setAssignee] = React.useState("Security Operations");
  const [notes, setNotes] = React.useState("");
  const err = !title.trim();
  return (
    <Drawer
      title="Open investigation"
      subtitle="Create a tracked investigation and assign an analyst."
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() => onDone(title.trim())}
          >
            Open investigation
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Title" err={err}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={errInp(err)}
        />
      </Req>
      <Field label="Severity">
        <Sel
          value={severity}
          onChange={setSeverity}
          opts={["Low", "Medium", "High", "Critical"]}
        />
      </Field>
      <Field label="Assign to">
        <Sel
          value={assignee}
          onChange={setAssignee}
          opts={["Security Operations", "SOC Tier 1", "SOC Tier 2", "CISO"]}
        />
      </Field>
      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          style={{ ...inp, height: "auto", padding: 11, resize: "vertical" }}
        />
      </Field>
    </Drawer>
  );
}

// ── 1. MFA MANAGEMENT ───────────────────────────────────────────────────────
function MfaCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "rami@inferencedefense.com",
      dept: "Engineering",
      role: "Admin",
      workspace: "Production",
      mfa: "Enabled",
      primary: "Authenticator",
      backup: "2",
      enrolled: "2025-03-04",
      lastMfa: "2026-06-24",
      risk: "Low",
    },
    {
      id: "1",
      user: "marc@sentinel-org.io",
      dept: "Security",
      role: "Security Engineer",
      workspace: "SOC",
      mfa: "Disabled",
      primary: "—",
      backup: "0",
      enrolled: "—",
      lastMfa: "—",
      risk: "High",
    },
    {
      id: "2",
      user: "iheb.jaouadi@inferencedefense.com",
      dept: "Security",
      role: "Auditor",
      workspace: "SOC",
      mfa: "Enabled",
      primary: "Passkey",
      backup: "1",
      enrolled: "2026-04-18",
      lastMfa: "2026-06-23",
      risk: "Low",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const done = (m: string) => {
    setFlow(null);
    setToast(m);
  };
  const columns = aCols([
    ["user", "User"],
    ["dept", "Department"],
    ["role", "Role"],
    ["workspace", "Workspace"],
    [
      "mfa",
      "MFA Status",
      (r) => <MfaBadge status={r.mfa === "Enabled" ? "Enabled" : "Disabled"} />,
    ],
    ["primary", "Primary Method"],
    ["backup", "Backup Methods"],
    ["enrolled", "Enrollment Date"],
    ["lastMfa", "Last MFA"],
    ["risk", "Risk Status", (r) => <AStatus s={r.risk} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="MFA Management — enrollment / compliance / recovery"
        desc="Manage enrollment, enforcement, recovery and lifecycle of multi-factor authentication."
        searchPlaceholder="Search users"
        commands={[
          {
            key: "req",
            label: "Require Enrollment",
            icon: <ShieldCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ScopeActionFlow
                  title="Require MFA enrollment"
                  subtitle="Require selected users to enroll MFA by a deadline."
                  submitLabel="Require enrollment"
                  onClose={() => setFlow(null)}
                  onDone={() => done("Enrollment required")}
                />,
              ),
          },
          {
            key: "camp",
            label: "Launch Campaign",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CampaignFlow
                  onClose={() => setFlow(null)}
                  onDone={(n) => done(`Campaign “${n}” launched`)}
                />,
              ),
          },
          {
            key: "pol",
            label: "Create MFA Policy",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PolicyWizardFlow
                  kind="MFA"
                  onClose={() => setFlow(null)}
                  onCreate={(n) => done(`MFA policy “${n}” created`)}
                />,
              ),
          },
          {
            key: "codes",
            label: "Generate Recovery Codes",
            icon: <KeyRound size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <RecoveryCodesFlow
                  who="Selected users"
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export Report",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "mfa-report"),
          },
        ]}
        filterDefs={[
          { key: "mfa", label: "Status" },
          { key: "primary", label: "Method" },
          { key: "dept", label: "Department" },
          { key: "role", label: "Role" },
          { key: "workspace", label: "Workspace" },
          { key: "risk", label: "Risk" },
          { key: "enrolled", label: "Enrollment Date" },
        ]}
        columns={columns}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      done("Enrollment required");
                      clear();
                    }}
                  >
                    Require Enrollment ({ids.length})
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setToast("MFA reset");
                      clear();
                    }}
                  >
                    Reset MFA
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setToast("Re-enrollment forced");
                      clear();
                    }}
                  >
                    Force Re-enrollment
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <RecoveryCodesFlow
                          who={`${ids.length} user(s)`}
                          onClose={() => setFlow(null)}
                        />,
                      )
                    }
                  >
                    Generate Recovery Codes
                  </HeaderButton>
                  <ConfirmButton
                    variant="danger"
                    label="Disable MFA"
                    title="Disable MFA"
                    body={`Disable MFA for ${ids.length} user(s)?`}
                    confirmLabel="Disable"
                    onConfirm={() => {
                      setRows((rs) =>
                        rs.map((r) =>
                          ids.includes(r.id)
                            ? {
                                ...r,
                                mfa: "Disabled",
                                primary: "—",
                                backup: "0",
                              }
                            : r,
                        ),
                      );
                      clear();
                    }}
                  />
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Reset MFA",
                  onClick: () => setToast(`MFA reset for ${r.user}`),
                },
                {
                  label: "Force Re-enrollment",
                  onClick: () => setToast(`Re-enrollment forced for ${r.user}`),
                },
                {
                  label: "Generate Recovery Codes",
                  onClick: () =>
                    setFlow(
                      <RecoveryCodesFlow
                        who={r.user}
                        onClose={() => setFlow(null)}
                      />,
                    ),
                },
                {
                  label: "Disable MFA",
                  danger: true,
                  onClick: () =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? { ...x, mfa: "Disabled", primary: "—", backup: "0" }
                          : x,
                      ),
                    ),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.user}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                MFA Enrollment · {r.mfa}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    onClick={() => setToast(`MFA reset for ${r.user}`)}
                  >
                    Reset MFA
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setRows((rs) =>
                        rs.map((x) =>
                          x.id === r.id ? { ...x, mfa: "Disabled" } : x,
                        ),
                      );
                      close();
                    }}
                  >
                    Disable MFA
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => setToast("Re-enrollment forced")}
                  >
                    Force Re-enrollment
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Identity",
                    content: kvb([
                      { k: "User", v: r.user },
                      { k: "Email", v: r.user },
                      { k: "Department", v: r.dept },
                      { k: "Role", v: r.role },
                      { k: "Workspace", v: r.workspace },
                    ]),
                  },
                  {
                    label: "Enrollment",
                    content: kvb([
                      {
                        k: "Enrollment status",
                        v: (
                          <MfaBadge
                            status={
                              r.mfa === "Enabled" ? "Enabled" : "Disabled"
                            }
                          />
                        ),
                      },
                      { k: "Enrollment date", v: r.enrolled },
                      { k: "Last MFA", v: r.lastMfa },
                      { k: "Primary method", v: r.primary },
                    ]),
                  },
                  {
                    label: "Risk",
                    content: kvb([
                      { k: "Risk level", v: <AStatus s={r.risk} /> },
                      {
                        k: "Risk indicators",
                        v:
                          r.risk === "High"
                            ? "No MFA · failed sign-ins"
                            : "None",
                      },
                      {
                        k: "Failed challenges",
                        v: r.risk === "High" ? "4" : "0",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Methods",
                subs: [
                  {
                    label: "Methods",
                    content: (
                      <>
                        {tlb([
                          {
                            primary: "Microsoft Authenticator",
                            secondary: "iPhone 15 · registered 2026-04-18",
                            right: "Primary",
                          },
                          {
                            primary: "Passkey (FIDO2)",
                            secondary: "Windows Hello",
                            right: "Active",
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              onClick={() => setToast("Method removed")}
                            >
                              Remove Method
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Primary set")}
                            >
                              Set Primary
                            </HeaderButton>
                            <HeaderButton
                              onClick={() =>
                                setToast("Re-registration required")
                              }
                            >
                              Require Re-registration
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Recovery",
                subs: [
                  {
                    label: "Recovery",
                    content: (
                      <>
                        {kvb([
                          { k: "Recovery codes generated", v: "10" },
                          { k: "Codes remaining", v: "8" },
                          { k: "Last recovery usage", v: "2026-04-18" },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() =>
                                setFlow(
                                  <RecoveryCodesFlow
                                    who={r.user}
                                    onClose={() => setFlow(null)}
                                  />,
                                )
                              }
                            >
                              Generate New Codes
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Codes expired")}
                            >
                              Expire Existing Codes
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Challenge success",
                        secondary: "Authenticator",
                        right: r.lastMfa,
                      },
                      {
                        primary: "Method added",
                        secondary: "Passkey",
                        right: "2026-05-02",
                      },
                      {
                        primary: "Recovery used",
                        secondary: "1 code",
                        right: "2026-04-18",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Admin reset MFA",
                        secondary: "by helpdesk",
                        right: "2026-04-18",
                      },
                      {
                        primary: "Policy assigned",
                        secondary: "Phishing-resistant MFA",
                        right: "2026-03-04",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 2. AUTHENTICATION METHODS ───────────────────────────────────────────────
function MethodsCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      method: "Passkey (FIDO2)",
      enrolled: "61",
      usage: "21%",
      status: "Enabled",
      rating: "Phishing-resistant",
      modified: "2026-05-02",
    },
    {
      id: "1",
      method: "Authenticator app",
      enrolled: "214",
      usage: "74%",
      status: "Enabled",
      rating: "Strong",
      modified: "2026-04-18",
    },
    {
      id: "2",
      method: "Email OTP",
      enrolled: "48",
      usage: "9%",
      status: "Restricted",
      rating: "Weak",
      modified: "2026-03-01",
    },
    {
      id: "3",
      method: "SMS OTP",
      enrolled: "38",
      usage: "13%",
      status: "Restricted",
      rating: "Weak",
      modified: "2026-02-10",
    },
    {
      id: "4",
      method: "Certificate",
      enrolled: "7",
      usage: "2%",
      status: "Enabled",
      rating: "Strong",
      modified: "2026-01-22",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const setStatus = (id: string, status: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  const pickItems = () =>
    rows.map((r) => ({ id: r.id, label: r.method, sub: r.status }));
  const columns = aCols([
    ["method", "Method"],
    ["enrolled", "Users Enrolled"],
    ["usage", "Usage %"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
    ["rating", "Security Rating", (r) => <AStatus s={r.rating} />],
    ["modified", "Last Modified"],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Authentication Methods — governance / enablement / adoption"
        desc="Manage supported authentication mechanisms across the organization."
        searchPlaceholder="Search methods"
        commands={[
          {
            key: "add",
            label: "Add Method",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AddMethodFlow
                  onClose={() => setFlow(null)}
                  onCreate={(row) => {
                    setRows((rs) => [row, ...rs]);
                    setFlow(null);
                    setToast("Method added");
                  }}
                />,
              ),
          },
          {
            key: "en",
            label: "Enable Method",
            icon: <ShieldCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Enable method"
                  subtitle="Choose a method to enable."
                  items={pickItems()}
                  actionLabel="Enable"
                  onApply={(id) => {
                    setStatus(id, "Enabled");
                    setFlow(null);
                    setToast("Method enabled");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "dis",
            label: "Disable Method",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Disable method"
                  subtitle="Choose a method to disable."
                  items={pickItems()}
                  actionLabel="Disable"
                  danger
                  onApply={(id) => {
                    setStatus(id, "Disabled");
                    setFlow(null);
                    setToast("Method disabled");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "cfg",
            label: "Configure Method",
            icon: <KeyRound size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Configure method"
                  subtitle="Choose a method to configure."
                  items={pickItems()}
                  actionLabel="Open configuration"
                  onApply={() => {
                    setFlow(null);
                    setToast("Configuration opened");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "auth-methods"),
          },
        ]}
        filterDefs={[
          { key: "status", label: "Status" },
          { key: "rating", label: "Security Rating" },
          { key: "usage", label: "Usage" },
        ]}
        columns={columns}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                { label: "Enable", onClick: () => setStatus(r.id, "Enabled") },
                {
                  label: "Disable",
                  danger: true,
                  onClick: () => setStatus(r.id, "Disabled"),
                },
                {
                  label: "Configure",
                  onClick: () =>
                    setToast(`Configuration opened for ${r.method}`),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.method)}
            title={r.method}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                Authentication method · {r.status}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => {
                      setStatus(r.id, "Enabled");
                      close();
                    }}
                  >
                    Enable
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setStatus(r.id, "Disabled");
                      close();
                    }}
                  >
                    Disable
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => setToast("Configuration opened")}
                  >
                    Configure
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Method name", v: r.method },
                      { k: "Type", v: r.rating },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      { k: "Security rating", v: <AStatus s={r.rating} /> },
                      { k: "Users enrolled", v: r.enrolled },
                    ]),
                  },
                ],
              },
              {
                label: "Configuration",
                subs: [
                  {
                    label: "Configuration",
                    content: kvb([
                      {
                        k: "Allowed",
                        v: r.status !== "Disabled" ? "Yes" : "No",
                      },
                      {
                        k: "Restricted",
                        v: r.status === "Restricted" ? "Yes" : "No",
                      },
                      {
                        k: "Default method",
                        v: r.method === "Authenticator app" ? "Yes" : "No",
                      },
                      { k: "Policy dependencies", v: "Conditional access" },
                      {
                        k: "Supported platforms",
                        v: "iOS · Android · Windows · macOS",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Adoption",
                subs: [
                  {
                    label: "Adoption",
                    content: kvb([
                      { k: "Enrollment trend", v: "↑ +12% (30d)" },
                      { k: "Usage trend", v: `${r.usage} of sign-ins` },
                      { k: "Success rate", v: "99.1%" },
                      { k: "Failure rate", v: "0.9%" },
                    ]),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Configuration changed",
                        secondary: "number-match enforced",
                        right: r.modified,
                      },
                      {
                        primary: "Policy assignment",
                        secondary: "Privileged roles",
                        right: "2026-04-01",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Method enabled",
                        secondary: "by rami",
                        right: "2026-01-22",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 3. PASSWORD POLICIES ────────────────────────────────────────────────────
function PasswordPolicyCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      policy: "Enterprise floor",
      scope: "Organization",
      users: "289",
      compliance: "93% compliant",
      status: "Active",
      modified: "2026-05-10",
      minLen: "14",
      complexity: "3 of 4 categories",
      history: "24",
      lockout: "5 / 15m",
      expiration: "Never",
      violations: "20",
    },
    {
      id: "1",
      policy: "Privileged roles",
      scope: "Role: Admins",
      users: "7",
      compliance: "100% compliant",
      status: "Active",
      modified: "2026-04-02",
      minLen: "16",
      complexity: "4 of 4 categories",
      history: "24",
      lockout: "3 / 30m",
      expiration: "90 days",
      violations: "0",
    },
    {
      id: "2",
      policy: "Service accounts",
      scope: "Service Identities",
      users: "24",
      compliance: "Compliant",
      status: "Active",
      modified: "2026-03-18",
      minLen: "32",
      complexity: "Random (vault)",
      history: "n/a",
      lockout: "n/a",
      expiration: "30 days",
      violations: "0",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const newPolicy = (name: string, scope: string): ARow => ({
    id: `p${Date.now()}`,
    policy: name,
    scope,
    users: "0",
    compliance: "Pending",
    status: "Active",
    modified: new Date().toISOString().slice(0, 10),
    minLen: "14",
    complexity: "3 of 4 categories",
    history: "24",
    lockout: "5 / 15m",
    expiration: "Never",
    violations: "0",
  });
  const pickItems = () =>
    rows.map((r) => ({ id: r.id, label: r.policy, sub: r.scope }));
  const columns = aCols([
    ["policy", "Policy"],
    ["scope", "Scope"],
    ["users", "Users Covered"],
    ["compliance", "Compliance", (r) => <AStatus s={r.compliance} />],
    ["status", "Status", (r) => <AStatus s={r.status} />],
    ["modified", "Last Modified"],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Password Policies — requirements / scope / compliance"
        desc="Password requirement policies and the scope each one applies to. The most-restrictive enterprise floor always wins."
        searchPlaceholder="Search policies"
        commands={[
          {
            key: "new",
            label: "Create Policy",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PolicyWizardFlow
                  kind="Password"
                  onClose={() => setFlow(null)}
                  onCreate={(n, s) => {
                    setRows((rs) => [newPolicy(n, s), ...rs]);
                    setFlow(null);
                    setToast(`Policy “${n}” created`);
                  }}
                />,
              ),
          },
          {
            key: "clone",
            label: "Clone Policy",
            icon: <Columns3 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Clone policy"
                  subtitle="Choose a policy to clone."
                  items={pickItems()}
                  actionLabel="Clone"
                  onApply={(id) => {
                    const src = rows.find((x) => x.id === id);
                    if (src)
                      setRows((rs) => [
                        {
                          ...src,
                          id: `p${Date.now()}`,
                          policy: `${src.policy} (copy)`,
                        },
                        ...rs,
                      ]);
                    setFlow(null);
                    setToast("Policy cloned");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "assign",
            label: "Assign Policy",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Assign password policy"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Assigned to ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "del",
            label: "Delete Policy",
            icon: <Trash2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Delete policy"
                  subtitle="Choose a policy to delete."
                  items={pickItems()}
                  actionLabel="Delete"
                  danger
                  onApply={(id) => {
                    setRows((rs) => rs.filter((x) => x.id !== id));
                    setFlow(null);
                    setToast("Policy deleted");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "password-policies"),
          },
        ]}
        filterDefs={[
          { key: "scope", label: "Scope" },
          { key: "status", label: "Status" },
          { key: "compliance", label: "Compliance" },
        ]}
        columns={columns}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Edit",
                  onClick: () => setToast(`Editing ${r.policy}`),
                },
                {
                  label: "Clone",
                  onClick: () => {
                    setRows((rs) => [
                      {
                        ...r,
                        id: `p${Date.now()}`,
                        policy: `${r.policy} (copy)`,
                      },
                      ...rs,
                    ]);
                    setToast("Cloned");
                  },
                },
                {
                  label: "Assign",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title={`Assign ${r.policy}`}
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.policy)}
            title={r.policy}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                Password policy · {r.scope}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => setToast("Editing")}
                  >
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setRows((rs) => [
                        {
                          ...r,
                          id: `p${Date.now()}`,
                          policy: `${r.policy} (copy)`,
                        },
                        ...rs,
                      ]);
                      close();
                    }}
                  >
                    Clone
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <AssignFlow
                          title={`Assign ${r.policy}`}
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            setFlow(null);
                            setToast(`Assigned to ${s}`);
                          }}
                        />,
                      )
                    }
                  >
                    Assign
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Policy name", v: r.policy },
                      { k: "Scope", v: r.scope },
                      { k: "Users covered", v: r.users },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      { k: "Last modified", v: r.modified },
                    ]),
                  },
                ],
              },
              {
                label: "Rules",
                subs: [
                  {
                    label: "Rules",
                    content: kvb([
                      { k: "Minimum length", v: r.minLen },
                      { k: "Maximum length", v: "256" },
                      { k: "Complexity rules", v: r.complexity },
                      { k: "Password history", v: r.history },
                      { k: "Reuse prevention", v: "Enabled" },
                      { k: "Expiration", v: r.expiration },
                      { k: "Lockout threshold", v: r.lockout },
                    ]),
                  },
                ],
              },
              {
                label: "Assignments",
                subs: [
                  {
                    label: "Assignments",
                    content: tlb([
                      {
                        primary: "Users",
                        secondary: `${r.users} covered`,
                        right: "Direct",
                      },
                      {
                        primary: "Groups",
                        secondary: "Security Operations",
                        right: "Inherited",
                      },
                      {
                        primary: "Workspaces",
                        secondary: "All",
                        right: "Scoped",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Compliance",
                subs: [
                  {
                    label: "Compliance",
                    content: kvb([
                      { k: "Covered users", v: r.users },
                      {
                        k: "Compliant users",
                        v: String(Number(r.users) - Number(r.violations)),
                      },
                      {
                        k: "Violations",
                        v: (
                          <StatusIndicator
                            tone={r.violations === "0" ? "ok" : "warn"}
                          >
                            {r.violations}
                          </StatusIndicator>
                        ),
                      },
                      { k: "Exceptions", v: "0" },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Policy modified",
                        secondary: "min length 12 → 14",
                        right: r.modified,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 4. PASSKEYS ─────────────────────────────────────────────────────────────
function PasskeyCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "iheb.jaouadi@inferencedefense.com",
      device: "iPhone 15",
      platform: "iOS · iCloud Keychain",
      browser: "Safari",
      registered: "2026-04-18",
      lastUsed: "2026-06-23",
      status: "Active",
    },
    {
      id: "1",
      user: "rami@inferencedefense.com",
      device: "Windows Hello",
      platform: "Windows · TPM",
      browser: "Edge",
      registered: "2026-03-02",
      lastUsed: "2026-06-24",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const pickItems = () =>
    rows.map((r) => ({ id: r.id, label: r.user, sub: r.device }));
  const columns = aCols([
    ["user", "User"],
    ["device", "Device"],
    ["platform", "Platform"],
    ["registered", "Registered"],
    ["lastUsed", "Last Used"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Passkeys — passwordless adoption"
        desc="Passwordless, phishing-resistant credentials (FIDO2 / WebAuthn) and their adoption."
        searchPlaceholder="Search passkeys"
        kpi={
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <MetricTile label="Users registered" value="61" />
            <MetricTile label="Passkeys registered" value="73" />
            <MetricTile label="Adoption rate" value="24%" tone="warn" />
          </div>
        }
        commands={[
          {
            key: "req",
            label: "Require Registration",
            icon: <ShieldCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <ScopeActionFlow
                  title="Require passkey registration"
                  subtitle="Require selected users to register a passkey by a deadline."
                  submitLabel="Require registration"
                  onClose={() => setFlow(null)}
                  onDone={() => {
                    setFlow(null);
                    setToast("Registration required");
                  }}
                />,
              ),
          },
          {
            key: "rev",
            label: "Revoke Passkey",
            icon: <Trash2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke passkey"
                  subtitle="Choose a passkey to revoke."
                  items={pickItems()}
                  actionLabel="Revoke"
                  danger
                  onApply={(id) => {
                    setRows((rs) => rs.filter((x) => x.id !== id));
                    setFlow(null);
                    setToast("Passkey revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "passkeys"),
          },
        ]}
        filterDefs={[
          { key: "platform", label: "Platform" },
          { key: "status", label: "Status" },
        ]}
        columns={columns}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Require Re-registration",
                  onClick: () =>
                    setToast(`Re-registration required for ${r.user}`),
                },
                {
                  label: "Revoke",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.user}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                Passkey · {r.device}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    onClick={() => setToast("Re-registration required")}
                  >
                    Require Re-registration
                  </HeaderButton>
                  <ConfirmButton
                    variant="danger"
                    label="Revoke"
                    title="Revoke passkey"
                    body={`Revoke this passkey for ${r.user}?`}
                    confirmLabel="Revoke"
                    onConfirm={() => {
                      setRows((rs) => rs.filter((x) => x.id !== r.id));
                      close();
                    }}
                  />
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "User", v: r.user },
                      { k: "Device", v: r.device },
                      { k: "Platform", v: r.platform },
                      { k: "Registered", v: r.registered },
                      { k: "Last used", v: r.lastUsed },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Device",
                subs: [
                  {
                    label: "Device",
                    content: kvb([
                      { k: "Device name", v: r.device },
                      { k: "Platform", v: r.platform },
                      { k: "Browser", v: r.browser },
                      { k: "Registration date", v: r.registered },
                      { k: "Last used", v: r.lastUsed },
                    ]),
                  },
                ],
              },
              {
                label: "Activity",
                subs: [
                  {
                    label: "Activity",
                    content: tlb([
                      {
                        primary: "Sign-in with passkey",
                        secondary: r.platform,
                        right: r.lastUsed,
                      },
                      {
                        primary: "Passkey registered",
                        secondary: r.device,
                        right: r.registered,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Passkey registered",
                        secondary: "self-service",
                        right: r.registered,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 5. SECURITY KEYS ────────────────────────────────────────────────────────
function SecurityKeyCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "rami@inferencedefense.com",
      vendor: "Yubico",
      model: "YubiKey 5C NFC",
      registered: "2026-05-02",
      lastUsed: "2026-06-24",
      status: "Active",
    },
    {
      id: "1",
      user: "security-ops@inferencedefense.com",
      vendor: "Yubico",
      model: "YubiKey 5 Nano",
      registered: "2026-05-10",
      lastUsed: "2026-06-22",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const pickItems = () =>
    rows.map((r) => ({ id: r.id, label: r.model, sub: r.user }));
  const columns = aCols([
    ["user", "User"],
    ["vendor", "Vendor"],
    ["model", "Model"],
    ["registered", "Registered"],
    ["lastUsed", "Last Used"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Security Keys — FIDO2 hardware devices"
        desc="FIDO2 hardware authentication devices with attestation — the strongest credential for privileged operators."
        searchPlaceholder="Search security keys"
        commands={[
          {
            key: "reg",
            label: "Register Key",
            icon: <KeyRound size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <RegisterKeyFlow
                  onClose={() => setFlow(null)}
                  onCreate={(row) => {
                    setRows((rs) => [row, ...rs]);
                    setFlow(null);
                    setToast("Key registered");
                  }}
                />,
              ),
          },
          {
            key: "dis",
            label: "Disable Key",
            icon: <X size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Disable security key"
                  subtitle="Choose a key to disable."
                  items={pickItems()}
                  actionLabel="Disable"
                  danger
                  onApply={(id) => {
                    setRows((rs) =>
                      rs.map((r) =>
                        r.id === id ? { ...r, status: "Disabled" } : r,
                      ),
                    );
                    setFlow(null);
                    setToast("Key disabled");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "security-keys"),
          },
        ]}
        filterDefs={[
          { key: "vendor", label: "Vendor" },
          { key: "status", label: "Status" },
        ]}
        columns={columns}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Disable",
                  onClick: () =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id ? { ...x, status: "Disabled" } : x,
                      ),
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.model}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                Security key · {r.user}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    onClick={() => {
                      setRows((rs) =>
                        rs.map((x) =>
                          x.id === r.id ? { ...x, status: "Disabled" } : x,
                        ),
                      );
                      close();
                    }}
                  >
                    Disable
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => setToast("Replacement registration sent")}
                  >
                    Replace
                  </HeaderButton>
                  <ConfirmButton
                    variant="danger"
                    label="Delete"
                    title="Delete key"
                    body={`Delete ${r.model} for ${r.user}?`}
                    confirmLabel="Delete"
                    onConfirm={() => {
                      setRows((rs) => rs.filter((x) => x.id !== r.id));
                      close();
                    }}
                  />
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "User", v: r.user },
                      { k: "Vendor", v: r.vendor },
                      { k: "Model", v: r.model },
                      { k: "Registered", v: r.registered },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Device",
                subs: [
                  {
                    label: "Device",
                    content: kvb([
                      { k: "Vendor", v: r.vendor },
                      { k: "Model", v: r.model },
                      { k: "Attestation", v: "Verified (FIDO MDS)" },
                      { k: "Firmware", v: "5.4.3" },
                      { k: "Registered", v: r.registered },
                    ]),
                  },
                ],
              },
              {
                label: "Usage",
                subs: [
                  {
                    label: "Usage",
                    content: tlb([
                      {
                        primary: "Authenticated",
                        secondary: "mTLS",
                        right: r.lastUsed,
                      },
                      {
                        primary: "Registered",
                        secondary: "self-service",
                        right: r.registered,
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Key registered",
                        secondary: "by rami",
                        right: r.registered,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 6. TEMPORARY ACCESS PASS ────────────────────────────────────────────────
function TapCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "new.hire@inferencedefense.com",
      created: "2026-06-24 08:00",
      expires: "2026-06-25 08:00",
      usage: "0 / 1",
      status: "Active",
    },
    {
      id: "1",
      user: "contractor.aziz@inferencedefense.com",
      created: "2026-06-20 09:00",
      expires: "2026-06-21 09:00",
      usage: "1 / 1",
      status: "Expired",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const activeItems = () =>
    rows
      .filter((r) => r.status === "Active")
      .map((r) => ({ id: r.id, label: r.user, sub: `expires ${r.expires}` }));
  const columns = aCols([
    ["user", "User"],
    ["created", "Created"],
    ["expires", "Expires"],
    ["usage", "Usage"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Temporary Access Pass — onboarding / recovery"
        desc="Time-boxed passcodes for onboarding and credential recovery without a password."
        searchPlaceholder="Search passes"
        commands={[
          {
            key: "gen",
            label: "Generate TAP",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <GenerateTapFlow
                  onClose={() => setFlow(null)}
                  onCreate={(row) => {
                    setRows((rs) => [row, ...rs]);
                    setFlow(null);
                    setToast("TAP generated");
                  }}
                />,
              ),
          },
          {
            key: "ext",
            label: "Extend TAP",
            icon: <Clock size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Extend TAP"
                  subtitle="Choose an active pass to extend by 24h."
                  items={activeItems()}
                  actionLabel="Extend"
                  onApply={() => {
                    setFlow(null);
                    setToast("TAP extended 24h");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "rev",
            label: "Revoke TAP",
            icon: <Trash2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Revoke TAP"
                  subtitle="Choose an active pass to revoke."
                  items={activeItems()}
                  actionLabel="Revoke"
                  danger
                  onApply={(id) => {
                    setRows((rs) =>
                      rs.map((r) =>
                        r.id === id ? { ...r, status: "Revoked" } : r,
                      ),
                    );
                    setFlow(null);
                    setToast("TAP revoked");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "temporary-access-pass"),
          },
        ]}
        filterDefs={[{ key: "status", label: "Status" }]}
        columns={columns}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Extend",
                  onClick: () => setToast(`Extended TAP for ${r.user}`),
                },
                {
                  label: "Regenerate",
                  onClick: () => setToast("TAP regenerated"),
                },
                {
                  label: "Revoke",
                  danger: true,
                  onClick: () =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.id === r.id ? { ...x, status: "Revoked" } : x,
                      ),
                    ),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.user)}
            title={r.user}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                Temporary access pass · {r.status}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton onClick={() => setToast("Extended 24h")}>
                    Extend
                  </HeaderButton>
                  <HeaderButton onClick={() => setToast("Regenerated")}>
                    Regenerate
                  </HeaderButton>
                  <ConfirmButton
                    variant="danger"
                    label="Revoke"
                    title="Revoke pass"
                    body={`Revoke the access pass for ${r.user}?`}
                    confirmLabel="Revoke"
                    onConfirm={() => {
                      setRows((rs) =>
                        rs.map((x) =>
                          x.id === r.id ? { ...x, status: "Revoked" } : x,
                        ),
                      );
                      close();
                    }}
                  />
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "User", v: r.user },
                      { k: "Created", v: r.created },
                      { k: "Expires", v: r.expires },
                      { k: "Usage", v: r.usage },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Usage",
                subs: [
                  {
                    label: "Usage",
                    content: kvb([
                      { k: "Issued", v: r.created },
                      { k: "Used", v: r.usage.startsWith("1") ? "Yes" : "No" },
                      {
                        k: "Remaining uses",
                        v: r.usage.startsWith("0") ? "1" : "0",
                      },
                      {
                        k: "Consumed by",
                        v: r.usage.startsWith("1") ? r.user : "—",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Expiration",
                subs: [
                  {
                    label: "Expiration",
                    content: kvb([
                      { k: "Expires", v: r.expires },
                      { k: "One-time use", v: "Yes" },
                      { k: "Auto-expire", v: "On first use or deadline" },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "TAP generated",
                        secondary: "by helpdesk",
                        right: r.created,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 7. CREDENTIAL POLICIES ──────────────────────────────────────────────────
function CredentialPolicyCollection() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      policy: "API key rotation",
      type: "API Key",
      scope: "Service Identities",
      assignments: "24",
      status: "Active",
    },
    {
      id: "1",
      policy: "Secret governance",
      type: "Secret",
      scope: "Applications",
      assignments: "12",
      status: "Active",
    },
    {
      id: "2",
      policy: "Certificate lifecycle",
      type: "Certificate",
      scope: "Organization",
      assignments: "7",
      status: "Active",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const pickItems = () =>
    rows.map((r) => ({ id: r.id, label: r.policy, sub: r.type }));
  const columns = aCols([
    ["policy", "Policy"],
    ["type", "Type"],
    ["scope", "Scope"],
    ["assignments", "Assignments"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title="Credential Policies — rotation / expiration / requirements"
        desc="Govern authentication credentials globally — rotation, expiration and the requirements for API keys, secrets and certificates."
        searchPlaceholder="Search policies"
        commands={[
          {
            key: "new",
            label: "Create Policy",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PolicyWizardFlow
                  kind="Credential"
                  onClose={() => setFlow(null)}
                  onCreate={(n, s) => {
                    setRows((rs) => [
                      {
                        id: `c${Date.now()}`,
                        policy: n,
                        type: "API Key",
                        scope: s,
                        assignments: "0",
                        status: "Active",
                      },
                      ...rs,
                    ]);
                    setFlow(null);
                    setToast(`Policy “${n}” created`);
                  }}
                />,
              ),
          },
          {
            key: "clone",
            label: "Clone Policy",
            icon: <Columns3 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Clone policy"
                  subtitle="Choose a policy to clone."
                  items={pickItems()}
                  actionLabel="Clone"
                  onApply={(id) => {
                    const src = rows.find((x) => x.id === id);
                    if (src)
                      setRows((rs) => [
                        {
                          ...src,
                          id: `c${Date.now()}`,
                          policy: `${src.policy} (copy)`,
                        },
                        ...rs,
                      ]);
                    setFlow(null);
                    setToast("Policy cloned");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "assign",
            label: "Assign Policy",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <AssignFlow
                  title="Assign credential policy"
                  onClose={() => setFlow(null)}
                  onDone={(s) => {
                    setFlow(null);
                    setToast(`Assigned to ${s}`);
                  }}
                />,
              ),
          },
          {
            key: "del",
            label: "Delete Policy",
            icon: <Trash2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Delete policy"
                  subtitle="Choose a policy to delete."
                  items={pickItems()}
                  actionLabel="Delete"
                  danger
                  onApply={(id) => {
                    setRows((rs) => rs.filter((x) => x.id !== id));
                    setFlow(null);
                    setToast("Policy deleted");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "credential-policies"),
          },
        ]}
        filterDefs={[
          { key: "type", label: "Type" },
          { key: "scope", label: "Scope" },
          { key: "status", label: "Status" },
        ]}
        columns={columns}
        rows={rows}
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Details", onClick: open },
                {
                  label: "Edit",
                  onClick: () => setToast(`Editing ${r.policy}`),
                },
                {
                  label: "Clone",
                  onClick: () => {
                    setRows((rs) => [
                      {
                        ...r,
                        id: `c${Date.now()}`,
                        policy: `${r.policy} (copy)`,
                      },
                      ...rs,
                    ]);
                    setToast("Cloned");
                  },
                },
                {
                  label: "Assign",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title={`Assign ${r.policy}`}
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id)),
                },
              ]
            : [{ label: "View Details", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={initials2(r.policy)}
            title={r.policy}
            meta={
              <span style={{ fontSize: 12.5, color: T.textMuted }}>
                Credential policy · {r.type}
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() => setToast("Editing")}
                  >
                    Edit
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      setRows((rs) => [
                        {
                          ...r,
                          id: `c${Date.now()}`,
                          policy: `${r.policy} (copy)`,
                        },
                        ...rs,
                      ]);
                      close();
                    }}
                  >
                    Clone
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <AssignFlow
                          title={`Assign ${r.policy}`}
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            setFlow(null);
                            setToast(`Assigned to ${s}`);
                          }}
                        />,
                      )
                    }
                  >
                    Assign
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Policy name", v: r.policy },
                      { k: "Type", v: r.type },
                      { k: "Scope", v: r.scope },
                      { k: "Assignments", v: r.assignments },
                      { k: "Status", v: <AStatus s={r.status} /> },
                    ]),
                  },
                ],
              },
              {
                label: "Rules",
                subs: [
                  {
                    label: "Rules",
                    content: kvb([
                      { k: "Credential rotation", v: "Every 90 days (auto)" },
                      { k: "Expiration", v: "Max 1 year" },
                      {
                        k: "Certificate requirements",
                        v: "RSA-2048+ · internal CA",
                      },
                      { k: "API key requirements", v: "Scoped + IP-bound" },
                      {
                        k: "Secret requirements",
                        v: "≥ 32 chars · vault-stored",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Assignments",
                subs: [
                  {
                    label: "Assignments",
                    content: tlb([
                      {
                        primary: r.scope,
                        secondary: `${r.assignments} principals`,
                        right: "Direct",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Compliance",
                subs: [
                  {
                    label: "Compliance",
                    content: kvb([
                      { k: "Covered", v: r.assignments },
                      { k: "Compliant", v: r.assignments },
                      {
                        k: "Violations",
                        v: <StatusIndicator tone="ok">0</StatusIndicator>,
                      },
                      { k: "Exceptions", v: "0" },
                    ]),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Policy created",
                        secondary: "by rami",
                        right: "2026-03-01",
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── 8. SECURITY INSIGHTS ────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// §7.11 Identity Alerts — identity-security monitoring & governance center.
// Monitors identity compromise, auth anomalies, privilege abuse and governance
// violations (NOT agent runtime — that is Runtime Governance). Same Users
// hierarchy: 9 sub-views, each an AuthCollection + shared DetailDrawer.
// ════════════════════════════════════════════════════════════════════════════
// 5 top-level views render as the page Tabs strip (set in NAV_GROUPS "Alerts");
// grouped views use a secondary pill SubTabStrip below — matching Identity/Access.
const ALERT_RISK_SUBS = [
  "Identity Threats",
  "Privilege Risks",
  "Authentication Risks",
];
const ALERT_GOV_SUBS = [
  "Access Governance Violations",
  "Approval Workflow Violations",
];
const ALERT_CONFIG_SUBS = ["Alert Rules", "External Integrations"];
function ThreatsRisksGroup() {
  const [s, setS] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={ALERT_RISK_SUBS} active={s} onChange={setS} />
      {s === 0 && <IdentityThreats />}
      {s === 1 && <PrivilegeRisks />}
      {s === 2 && <AuthenticationRisks />}
    </div>
  );
}
function GovernanceGroup() {
  const [s, setS] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={ALERT_GOV_SUBS} active={s} onChange={setS} />
      {s === 0 && <GovernanceViolations />}
      {s === 1 && <ApprovalViolations />}
    </div>
  );
}
function AlertConfigGroup() {
  const [s, setS] = React.useState(0);
  return (
    <div>
      <SubTabStrip subs={ALERT_CONFIG_SUBS} active={s} onChange={setS} />
      {s === 0 && <AlertRules />}
      {s === 1 && <ExternalIntegrations />}
    </div>
  );
}

// ── alert flows ─────────────────────────────────────────────────────────────
function SuppressFlow({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (s: string) => void;
}) {
  const [dur, setDur] = React.useState("24 hours");
  const [reason, setReason] = React.useState("");
  const err = !reason.trim();
  return (
    <Drawer
      title="Suppress alert"
      subtitle="Temporarily silence this alert. Suppression is recorded in the audit log."
      width={520}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() => onDone(dur)}
          >
            Suppress
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Duration">
        <Sel
          value={dur}
          onChange={setDur}
          opts={["1 hour", "8 hours", "24 hours", "7 days", "Until resolved"]}
        />
      </Field>
      <Req label="Reason" err={err}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          style={{
            ...errInp(err),
            height: "auto",
            padding: 11,
            resize: "vertical",
          }}
          placeholder="Why is this alert being suppressed?"
        />
      </Req>
    </Drawer>
  );
}
const ALERT_CATEGORIES = [
  "Identity Threat",
  "Privilege Risk",
  "Authentication Risk",
  "Governance Violation",
  "Approval Violation",
];
function CreateAlertRuleFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    name: "",
    category: ALERT_CATEGORIES[0],
    severity: "High",
    condition: "",
    threshold: "1",
  });
  const err = !f.name.trim();
  return (
    <Drawer
      title="Create alert rule"
      subtitle="Define when an identity alert is generated."
      width={560}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `ar${Date.now()}`,
                rule: f.name.trim(),
                category: f.category,
                severity: f.severity,
                status: "Active",
                lastTriggered: "—",
                condition: f.condition || "—",
                threshold: f.threshold,
              })
            }
          >
            Create rule
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Req label="Rule name" err={err}>
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          style={errInp(err)}
          placeholder="e.g. Impossible travel — privileged user"
        />
      </Req>
      <Field label="Category">
        <Sel
          value={f.category}
          onChange={(v) => setF({ ...f, category: v })}
          opts={ALERT_CATEGORIES}
        />
      </Field>
      <Field label="Severity">
        <Sel
          value={f.severity}
          onChange={(v) => setF({ ...f, severity: v })}
          opts={["Critical", "High", "Medium", "Low"]}
        />
      </Field>
      <Field label="Condition">
        <input
          value={f.condition}
          onChange={(e) => setF({ ...f, condition: e.target.value })}
          style={inp}
          placeholder="e.g. geo_distance > 500km within 1h"
        />
      </Field>
      <Field label="Threshold">
        <input
          value={f.threshold}
          onChange={(e) => setF({ ...f, threshold: e.target.value })}
          style={inp}
        />
      </Field>
    </Drawer>
  );
}
const INTEGRATION_TARGETS = [
  "Microsoft Sentinel",
  "Splunk",
  "QRadar",
  "Elastic",
  "Chronicle",
  "ServiceNow",
  "Jira",
  "Slack",
  "Teams",
  "Webhook",
];
function AddIntegrationFlow({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: ARow) => void;
}) {
  const [f, setF] = React.useState({
    target: INTEGRATION_TARGETS[0],
    endpoint: "",
    minSeverity: "High",
  });
  const err = !f.endpoint.trim();
  return (
    <Drawer
      title="Add external integration"
      subtitle="Forward identity alerts to an enterprise SIEM / ITSM / chat target."
      width={540}
      onClose={onClose}
      footer={
        <>
          <HeaderButton
            variant="primary"
            disabled={err}
            onClick={() =>
              onCreate({
                id: `int${Date.now()}`,
                integration: f.target,
                target: f.target,
                status: "Connected",
                lastDelivery: "—",
                minSeverity: f.minSeverity,
                endpoint: f.endpoint.trim(),
              })
            }
          >
            Add integration
          </HeaderButton>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
        </>
      }
    >
      <Field label="Target">
        <Sel
          value={f.target}
          onChange={(v) => setF({ ...f, target: v })}
          opts={INTEGRATION_TARGETS}
        />
      </Field>
      <Req label="Endpoint / Webhook URL" err={err}>
        <input
          value={f.endpoint}
          onChange={(e) => setF({ ...f, endpoint: e.target.value })}
          style={errInp(err)}
          placeholder="https://…"
        />
      </Req>
      <Field label="Minimum severity">
        <Sel
          value={f.minSeverity}
          onChange={(v) => setF({ ...f, minSeverity: v })}
          opts={["Critical", "High", "Medium", "Low"]}
        />
      </Field>
    </Drawer>
  );
}

// ── 1. ACTIVE ALERTS ────────────────────────────────────────────────────────
function ActiveAlerts() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      alertId: "IA-5012",
      title: "Impossible travel — privileged user",
      category: "Identity Threat",
      severity: "Critical",
      principal: "rami@inferencedefense.com",
      workspace: "Production",
      created: "2026-06-27 06:31",
      status: "Open",
      owner: "—",
    },
    {
      id: "1",
      alertId: "IA-5011",
      title: "Standing privileged access detected",
      category: "Privilege Risk",
      severity: "High",
      principal: "ops@inferencedefense.com",
      workspace: "Production",
      created: "2026-06-27 05:10",
      status: "Investigating",
      owner: "ciso@inferencedefense.com",
    },
    {
      id: "2",
      alertId: "IA-5009",
      title: "Privileged user without MFA",
      category: "Authentication Risk",
      severity: "High",
      principal: "legacy-admin@company.com",
      workspace: "Organization",
      created: "2026-06-26 22:40",
      status: "Open",
      owner: "—",
    },
    {
      id: "3",
      alertId: "IA-5004",
      title: "Role assigned without approval",
      category: "Governance Violation",
      severity: "Medium",
      principal: "contractor@ext.com",
      workspace: "acme-dev",
      created: "2026-06-26 14:02",
      status: "Open",
      owner: "compliance@inferencedefense.com",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const pick = () =>
    rows.map((r) => ({ id: r.id, label: r.alertId, sub: r.title }));
  const cols = aCols([
    ["alertId", "Alert ID"],
    ["title", "Title"],
    ["category", "Category"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["principal", "Principal"],
    ["workspace", "Workspace"],
    ["created", "Created"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
    ["owner", "Owner"],
  ]);
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <MetricTile
          label="Open alerts"
          value={String(rows.filter((r) => r.status !== "Closed").length)}
        />
        <MetricTile
          label="Critical alerts"
          value={String(rows.filter((r) => r.severity === "Critical").length)}
          tone="danger"
        />
        <MetricTile label="Privilege risks" value="1" tone="warn" />
        <MetricTile label="Authentication risks" value="1" tone="warn" />
        <MetricTile label="Governance violations" value="1" tone="warn" />
        <MetricTile label="Approval violations" value="0" />
        <MetricTile label="Mean time to respond" value="14m" />
        <MetricTile label="Mean time to resolve" value="3h 20m" />
      </div>
      <AuthCollection
        title="Identity Alerts"
        desc="Monitor identity security, privilege abuse, authentication anomalies and governance violations across the organization."
        searchPlaceholder="Search alerts"
        commands={[
          {
            key: "rule",
            label: "Create Rule",
            icon: <Plus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <CreateAlertRuleFlow
                  onClose={() => setFlow(null)}
                  onCreate={() => {
                    setFlow(null);
                    setToast("Alert rule created");
                  }}
                />,
              ),
          },
          {
            key: "own",
            label: "Assign Owner",
            icon: <UserPlus size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Assign owner"
                  subtitle="Choose an alert, then an owner."
                  items={pick()}
                  actionLabel="Choose"
                  onApply={(id) =>
                    setFlow(
                      <AssignFlow
                        title="Assign owner"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          set(id, { owner: s });
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    )
                  }
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "inv",
            label: "Open Investigation",
            icon: <ShieldCheck size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <InvestigationFlow
                  onClose={() => setFlow(null)}
                  onDone={(t) => {
                    setFlow(null);
                    setToast(`Investigation “${t}” opened`);
                  }}
                />,
              ),
          },
          {
            key: "sup",
            label: "Suppress",
            icon: <BellOff size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Suppress alert"
                  subtitle="Choose an alert to suppress."
                  items={pick()}
                  actionLabel="Choose"
                  onApply={(id) =>
                    setFlow(
                      <SuppressFlow
                        onClose={() => setFlow(null)}
                        onDone={(d) => {
                          set(id, { status: "Suppressed" });
                          setFlow(null);
                          setToast(`Suppressed for ${d}`);
                        }}
                      />,
                    )
                  }
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "close",
            label: "Close Alert",
            icon: <CheckCircle2 size={15} />,
            disabled: !canEdit,
            onClick: () =>
              setFlow(
                <PickFlow
                  title="Close alert"
                  subtitle="Choose an alert to close."
                  items={pick()}
                  actionLabel="Close"
                  onApply={(id) => {
                    set(id, { status: "Closed" });
                    setFlow(null);
                    setToast("Alert closed");
                  }}
                  onClose={() => setFlow(null)}
                />,
              ),
          },
          {
            key: "exp",
            label: "Export",
            icon: <Download size={15} />,
            onClick: () => authCsv(rows, "active-alerts"),
          },
          {
            key: "ref",
            label: "Refresh",
            icon: <RotateCw size={15} />,
            onClick: () => {
              setRows(SEED);
              setToast("Refreshed");
            },
          },
        ]}
        filterDefs={[
          { key: "severity", label: "Severity" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status" },
          { key: "workspace", label: "Workspace" },
          { key: "owner", label: "Owner" },
          { key: "principal", label: "Principal" },
        ]}
        columns={cols}
        rows={rows}
        bulk={
          canEdit
            ? (ids, clear) => (
                <>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => set(id, { status: "Closed" }));
                      setToast("Closed");
                      clear();
                    }}
                  >
                    Close
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      ids.forEach((id) => set(id, { status: "Suppressed" }));
                      setToast("Suppressed");
                      clear();
                    }}
                  >
                    Suppress
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      authCsv(
                        rows.filter((r) => ids.includes(r.id)),
                        "alerts",
                      );
                      clear();
                    }}
                  >
                    Export
                  </HeaderButton>
                </>
              )
            : undefined
        }
        rowMenu={(r, open) =>
          canEdit
            ? [
                { label: "View Alert", onClick: open },
                {
                  label: "Assign Owner",
                  onClick: () =>
                    setFlow(
                      <AssignFlow
                        title="Assign owner"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          set(r.id, { owner: s });
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Open Investigation",
                  onClick: () =>
                    setFlow(
                      <InvestigationFlow
                        prefill={`Alert ${r.alertId} — ${r.title}`}
                        onClose={() => setFlow(null)}
                        onDone={(t) => {
                          set(r.id, { status: "Investigating" });
                          setFlow(null);
                          setToast(`Investigation “${t}” opened`);
                        }}
                      />,
                    ),
                },
                {
                  label: "Suppress",
                  onClick: () =>
                    setFlow(
                      <SuppressFlow
                        onClose={() => setFlow(null)}
                        onDone={() => {
                          set(r.id, { status: "Suppressed" });
                          setFlow(null);
                          setToast("Suppressed");
                        }}
                      />,
                    ),
                },
                {
                  label: "Close Alert",
                  onClick: () => set(r.id, { status: "Closed" }),
                },
                {
                  label: "Escalate",
                  onClick: () => {
                    set(r.id, { severity: "Critical" });
                    setToast("Escalated");
                  },
                },
                {
                  label: "Export Evidence",
                  onClick: () => authCsv([r], `alert-${r.alertId}`),
                },
              ]
            : [{ label: "View Alert", onClick: open }]
        }
        drawer={(r, close) => (
          <AuthEntityDrawer
            initials={r.alertId.slice(-2)}
            title={r.title}
            meta={
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                {r.alertId} · {r.category} · <AStatus s={r.severity} /> ·{" "}
                <AStatus s={r.status} />
              </span>
            }
            actions={
              canEdit ? (
                <>
                  <HeaderButton
                    variant="primary"
                    onClick={() =>
                      setFlow(
                        <InvestigationFlow
                          prefill={`Alert ${r.alertId}`}
                          onClose={() => setFlow(null)}
                          onDone={(t) => {
                            set(r.id, { status: "Investigating" });
                            setFlow(null);
                            setToast(`Investigation “${t}” opened`);
                          }}
                        />,
                      )
                    }
                  >
                    Investigate
                  </HeaderButton>
                  <HeaderButton
                    onClick={() =>
                      setFlow(
                        <AssignFlow
                          title="Assign owner"
                          onClose={() => setFlow(null)}
                          onDone={(s) => {
                            set(r.id, { owner: s });
                            setFlow(null);
                            setToast(`Assigned to ${s}`);
                          }}
                        />,
                      )
                    }
                  >
                    Assign Owner
                  </HeaderButton>
                  <HeaderButton
                    onClick={() => {
                      set(r.id, { status: "Closed" });
                      close();
                    }}
                  >
                    Close
                  </HeaderButton>
                </>
              ) : undefined
            }
            sections={[
              {
                label: "Overview",
                subs: [
                  {
                    label: "Overview",
                    content: kvb([
                      { k: "Alert ID", v: r.alertId },
                      { k: "Title", v: r.title },
                      { k: "Category", v: r.category },
                      { k: "Severity", v: <AStatus s={r.severity} /> },
                      { k: "Status", v: <AStatus s={r.status} /> },
                      { k: "Workspace", v: r.workspace },
                      { k: "Created", v: r.created },
                      { k: "Owner", v: r.owner },
                      { k: "Source", v: "Identity Alert Engine" },
                    ]),
                  },
                ],
              },
              {
                label: "Timeline",
                subs: [
                  {
                    label: "Timeline",
                    content: tlb([
                      {
                        primary: "Detected",
                        secondary: r.category,
                        right: r.created,
                      },
                      {
                        primary: "Assigned",
                        secondary: r.owner === "—" ? "unassigned" : r.owner,
                        right: r.owner === "—" ? "" : r.created,
                      },
                      {
                        primary: "Escalated",
                        secondary:
                          r.severity === "Critical" ? "auto (critical)" : "—",
                        right: "",
                      },
                      {
                        primary: "Investigated",
                        secondary:
                          r.status === "Investigating" ? "in progress" : "—",
                        right: "",
                      },
                      {
                        primary: "Resolved",
                        secondary: r.status === "Closed" ? "closed" : "—",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Impact Analysis",
                subs: [
                  {
                    label: "Impact Analysis",
                    content: kvb([
                      { k: "Affected users", v: "1" },
                      { k: "Affected groups", v: "2" },
                      { k: "Affected roles", v: "1" },
                      {
                        k: "Affected resources",
                        v: "AWS Production, platform-vault",
                      },
                      {
                        k: "Risk score",
                        v: (
                          <StatusIndicator
                            tone={r.severity === "Critical" ? "danger" : "warn"}
                          >
                            {r.severity === "Critical" ? "92" : "68"}
                          </StatusIndicator>
                        ),
                      },
                      {
                        k: "Business impact",
                        v: "Potential production access compromise",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Related Identities",
                subs: [
                  {
                    label: "Related Identities",
                    content: tlb([
                      {
                        primary: r.principal,
                        secondary: "User · primary subject",
                        right: "",
                      },
                      {
                        primary: "Security Engineers",
                        secondary: "Group",
                        right: "",
                      },
                      {
                        primary: "Enterprise Security Administrator",
                        secondary: "Role",
                        right: "",
                      },
                      {
                        primary: "ci-deploy",
                        secondary: "Service Identity",
                        right: "",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Related Resources",
                subs: [
                  {
                    label: "Related Resources",
                    content: tlb([
                      {
                        primary: "AWS Production",
                        secondary: "Cloud Account",
                        right: "Admin",
                      },
                      {
                        primary: "Azure Payments",
                        secondary: "Subscription",
                        right: "Admin",
                      },
                      {
                        primary: "prod-eks",
                        secondary: "Cluster",
                        right: "Read",
                      },
                    ]),
                  },
                ],
              },
              {
                label: "Investigation",
                subs: [
                  {
                    label: "Investigation",
                    content: (
                      <>
                        {kvb([
                          {
                            k: "Notes",
                            v:
                              r.status === "Investigating"
                                ? "Geo-velocity anomaly under review"
                                : "—",
                          },
                          {
                            k: "Evidence",
                            v: "sign-in logs, device fingerprint",
                          },
                          {
                            k: "Findings",
                            v:
                              r.severity === "Critical"
                                ? "Confirmed anomalous location"
                                : "Pending",
                          },
                          {
                            k: "Recommendations",
                            v: "Terminate sessions + require MFA re-enrollment",
                          },
                        ])}
                        {canEdit && (
                          <ActRow>
                            <HeaderButton
                              variant="primary"
                              onClick={() =>
                                setFlow(
                                  <InvestigationFlow
                                    prefill={`Alert ${r.alertId}`}
                                    onClose={() => setFlow(null)}
                                    onDone={(t) => {
                                      setFlow(null);
                                      setToast(`Investigation “${t}” opened`);
                                    }}
                                  />,
                                )
                              }
                            >
                              Open Investigation
                            </HeaderButton>
                            <HeaderButton
                              onClick={() => setToast("Sessions terminated")}
                            >
                              Terminate Sessions
                            </HeaderButton>
                          </ActRow>
                        )}
                      </>
                    ),
                  },
                ],
              },
              {
                label: "Audit History",
                subs: [
                  {
                    label: "Audit",
                    content: tlb([
                      {
                        primary: "Alert created",
                        secondary: r.category,
                        right: r.created,
                      },
                      {
                        primary: "Owner changed",
                        secondary: r.owner,
                        right: r.owner === "—" ? "" : r.created,
                      },
                    ]),
                  },
                ],
              },
            ]}
            onClose={close}
          />
        )}
      />
    </>
  );
}

// ── helper: generic risk/threat/violation collection ────────────────────────
function AlertSubCollection({
  title,
  desc,
  search,
  cols,
  seed,
  commands,
  rowMenu,
  drawer,
  filterDefs,
  bulk,
  flow,
  toast,
  setToast,
  banner,
}: {
  title: string;
  desc: string;
  search: string;
  cols: Column<ARow>[];
  seed: ARow[];
  commands: CommandItem[];
  rowMenu: (
    r: ARow,
    open: () => void,
  ) => { label: string; danger?: boolean; onClick: () => void }[];
  drawer: (r: ARow, close: () => void) => React.ReactNode;
  filterDefs: { key: string; label: string }[];
  bulk?: (ids: string[], clear: () => void) => React.ReactNode;
  flow: React.ReactNode;
  toast: string | null;
  setToast: (s: string | null) => void;
  banner?: React.ReactNode;
}) {
  return (
    <>
      {flow}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <AuthCollection
        title={title}
        desc={desc}
        searchPlaceholder={search}
        commands={commands}
        filterDefs={filterDefs}
        columns={cols}
        rows={seed}
        bulk={bulk}
        rowMenu={rowMenu}
        drawer={drawer}
        kpi={banner}
      />
    </>
  );
}
function CategoryLensBanner({ note }: { note?: string }) {
  return (
    <InfoBanner icon={<Bell size={15} />}>
      This is a category lens of the unified{" "}
      <strong>identity alert queue</strong>. Ownership, suppression, escalation
      and closure are managed in <strong>Active Alerts</strong>; this view
      focuses triage and response for this category.{note ? ` ${note}` : ""}
    </InfoBanner>
  );
}

// ── 2. IDENTITY THREATS ─────────────────────────────────────────────────────
function IdentityThreats() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      threat: "Impossible Travel",
      user: "rami@inferencedefense.com",
      workspace: "Production",
      score: "92",
      severity: "Critical",
      status: "Open",
    },
    {
      id: "1",
      threat: "Account Takeover",
      user: "marc@sentinel-org.io",
      workspace: "SOC",
      score: "88",
      severity: "Critical",
      status: "Investigating",
    },
    {
      id: "2",
      threat: "Password Spray",
      user: "multiple",
      workspace: "Organization",
      score: "71",
      severity: "High",
      status: "Open",
    },
    {
      id: "3",
      threat: "Dormant Account Reactivation",
      user: "old-admin@company.com",
      workspace: "Organization",
      score: "64",
      severity: "Medium",
      status: "Open",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const cols = aCols([
    ["threat", "Threat"],
    ["user", "User"],
    ["workspace", "Workspace"],
    [
      "score",
      "Risk Score",
      (r) => (
        <StatusIndicator tone={Number(r.score) >= 80 ? "danger" : "warn"}>
          {r.score}
        </StatusIndicator>
      ),
    ],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <AlertSubCollection
      title="Identity Threats"
      desc="Detect compromised or suspicious identities — impossible travel, account takeover, credential stuffing, password spray and more."
      search="Search threats"
      banner={
        <CategoryLensBanner note="Session-risk detections (impossible travel, anonymous IP) also surface from Sessions → Risky Sessions into this view." />
      }
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "threat", label: "Threat" },
        { key: "severity", label: "Severity" },
        { key: "workspace", label: "Workspace" },
        { key: "status", label: "Status" },
      ]}
      commands={[
        {
          key: "inv",
          label: "Open Investigation",
          icon: <ShieldCheck size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <InvestigationFlow
                onClose={() => setFlow(null)}
                onDone={(t) => {
                  setFlow(null);
                  setToast(`Investigation “${t}” opened`);
                }}
              />,
            ),
        },
        {
          key: "exp",
          label: "Export Evidence",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "identity-threats"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {
            setRows(SEED);
            setToast("Refreshed");
          },
        },
      ]}
      bulk={
        canEdit
          ? (ids, clear) => (
              <>
                <HeaderButton
                  onClick={() => {
                    setToast("Users disabled");
                    clear();
                  }}
                >
                  Disable User
                </HeaderButton>
                <HeaderButton
                  onClick={() => {
                    setToast("Sessions terminated");
                    clear();
                  }}
                >
                  Terminate Sessions
                </HeaderButton>
              </>
            )
          : undefined
      }
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View", onClick: open },
              {
                label: "Disable User",
                danger: true,
                onClick: () => {
                  set(r.id, { status: "Contained" });
                  setToast(`${r.user} disabled`);
                },
              },
              {
                label: "Terminate Sessions",
                onClick: () => setToast("Sessions terminated"),
              },
              {
                label: "Force Password Reset",
                onClick: () => setToast("Password reset forced"),
              },
              {
                label: "Require MFA Enrollment",
                onClick: () => setToast("MFA enrollment required"),
              },
              {
                label: "Open Investigation",
                onClick: () =>
                  setFlow(
                    <InvestigationFlow
                      prefill={`Threat — ${r.threat} — ${r.user}`}
                      onClose={() => setFlow(null)}
                      onDone={(t) => {
                        set(r.id, { status: "Investigating" });
                        setFlow(null);
                        setToast(`Investigation “${t}” opened`);
                      }}
                    />,
                  ),
              },
              {
                label: "Export Evidence",
                onClick: () => authCsv([r], `threat-${r.id}`),
              },
            ]
          : [{ label: "View", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.user)}
          title={`${r.threat} — ${r.user}`}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              score {r.score} · <AStatus s={r.severity} /> ·{" "}
              <AStatus s={r.status} />
            </span>
          }
          actions={
            canEdit ? (
              <>
                <HeaderButton
                  variant="danger"
                  onClick={() => {
                    set(r.id, { status: "Contained" });
                    close();
                  }}
                >
                  Disable User
                </HeaderButton>
                <HeaderButton onClick={() => setToast("Sessions terminated")}>
                  Terminate Sessions
                </HeaderButton>
                <HeaderButton onClick={() => setToast("MFA required")}>
                  Require MFA
                </HeaderButton>
              </>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Threat", v: r.threat },
                    { k: "User", v: r.user },
                    { k: "Workspace", v: r.workspace },
                    {
                      k: "Risk score",
                      v: (
                        <StatusIndicator
                          tone={Number(r.score) >= 80 ? "danger" : "warn"}
                        >
                          {r.score}
                        </StatusIndicator>
                      ),
                    },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Status", v: <AStatus s={r.status} /> },
                  ]),
                },
              ],
            },
            {
              label: "Authentication Evidence",
              subs: [
                {
                  label: "Authentication Evidence",
                  content: tlb([
                    {
                      primary: "Sign-in — Tunis, TN",
                      secondary: "passkey · 07:42",
                      right: "",
                    },
                    {
                      primary: "Sign-in — Frankfurt, DE",
                      secondary: "password · 07:55 (impossible)",
                      right: <AStatus s="High" />,
                    },
                    {
                      primary: "Device fingerprint mismatch",
                      secondary: "new device",
                      right: <AStatus s="High" />,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Sessions",
              subs: [
                {
                  label: "Sessions",
                  content: tlb([
                    {
                      primary: "Active session — Frankfurt",
                      secondary: "Admin Console",
                      right: <AStatus s="High" />,
                    },
                    {
                      primary: "Token issued",
                      secondary: "OIDC + refresh",
                      right: "",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Risk Analysis",
              subs: [
                {
                  label: "Risk Analysis",
                  content: kvb([
                    { k: "Geo-velocity", v: "1,480 km in 13 min" },
                    {
                      k: "Anonymous IP",
                      v: r.threat === "Account Takeover" ? "Yes (Tor)" : "No",
                    },
                    {
                      k: "Credential leak match",
                      v: r.threat === "Credential Stuffing" ? "Yes" : "No",
                    },
                    { k: "Confidence", v: <AStatus s={r.severity} /> },
                  ]),
                },
              ],
            },
            {
              label: "Response Actions",
              subs: [
                {
                  label: "Response Actions",
                  content: (
                    <div>
                      {canEdit && (
                        <ActRow>
                          <HeaderButton
                            variant="danger"
                            onClick={() => {
                              set(r.id, { status: "Contained" });
                              close();
                            }}
                          >
                            Disable User
                          </HeaderButton>
                          <HeaderButton
                            onClick={() => setToast("Sessions terminated")}
                          >
                            Terminate Sessions
                          </HeaderButton>
                          <HeaderButton
                            onClick={() => setToast("Password reset")}
                          >
                            Force Password Reset
                          </HeaderButton>
                          <HeaderButton
                            onClick={() => setToast("MFA required")}
                          >
                            Require MFA
                          </HeaderButton>
                        </ActRow>
                      )}
                    </div>
                  ),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Threat detected",
                      secondary: r.threat,
                      right: "06:31",
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── 3. PRIVILEGE RISKS ──────────────────────────────────────────────────────
function PrivilegeRisks() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      risk: "Standing Privileged Access",
      principal: "ops@inferencedefense.com",
      role: "Workspace Administrator",
      severity: "High",
      workspace: "Production",
      status: "Open",
    },
    {
      id: "1",
      risk: "Excessive Permissions",
      principal: "marc@sentinel-org.io",
      role: "Security Engineer",
      severity: "Medium",
      workspace: "SOC",
      status: "Open",
    },
    {
      id: "2",
      risk: "Separation of Duties Violation",
      principal: "rami@inferencedefense.com",
      role: "Enterprise Security Administrator",
      severity: "Critical",
      workspace: "Production",
      status: "Investigating",
    },
    {
      id: "3",
      risk: "Orphaned Assignment",
      principal: "former-admin@company.com",
      role: "Auditor",
      severity: "Medium",
      workspace: "Organization",
      status: "Open",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const cols = aCols([
    ["risk", "Risk"],
    ["principal", "Principal"],
    ["role", "Role"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["workspace", "Workspace"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <AlertSubCollection
      title="Privilege Risks"
      desc="Detect excessive or dangerous authorization — privilege escalation, standing access, orphaned roles, SoD violations and role explosion."
      search="Search privilege risks"
      banner={
        <CategoryLensBanner note="Standing-access and SoD findings here are the same store recertified in Reviews → Privilege/Role reviews." />
      }
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "risk", label: "Risk" },
        { key: "severity", label: "Severity" },
        { key: "workspace", label: "Workspace" },
        { key: "status", label: "Status" },
      ]}
      commands={[
        {
          key: "cert",
          label: "Create Certification",
          icon: <BadgeCheck size={15} />,
          disabled: !canEdit,
          onClick: () => setToast("Certification campaign created"),
        },
        {
          key: "inv",
          label: "Open Investigation",
          icon: <ShieldCheck size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <InvestigationFlow
                onClose={() => setFlow(null)}
                onDone={(t) => {
                  setFlow(null);
                  setToast(`Investigation “${t}” opened`);
                }}
              />,
            ),
        },
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "privilege-risks"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {
            setRows(SEED);
            setToast("Refreshed");
          },
        },
      ]}
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View", onClick: open },
              { label: "Review Access", onClick: open },
              {
                label: "Revoke Access",
                danger: true,
                onClick: () => {
                  set(r.id, { status: "Remediated" });
                  setToast("Access revoked");
                },
              },
              {
                label: "Create Certification",
                onClick: () => setToast("Certification created"),
              },
              {
                label: "Open Investigation",
                onClick: () =>
                  setFlow(
                    <InvestigationFlow
                      prefill={`Privilege risk — ${r.risk}`}
                      onClose={() => setFlow(null)}
                      onDone={(t) => {
                        setFlow(null);
                        setToast(`Investigation “${t}” opened`);
                      }}
                    />,
                  ),
              },
            ]
          : [{ label: "View", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.principal)}
          title={`${r.risk}`}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.principal} · {r.role} · <AStatus s={r.severity} />
            </span>
          }
          actions={
            canEdit ? (
              <>
                <HeaderButton
                  variant="danger"
                  onClick={() => {
                    set(r.id, { status: "Remediated" });
                    close();
                  }}
                >
                  Revoke Access
                </HeaderButton>
                <HeaderButton onClick={() => setToast("Certification created")}>
                  Create Certification
                </HeaderButton>
              </>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Risk", v: r.risk },
                    { k: "Principal", v: r.principal },
                    { k: "Role", v: r.role },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Workspace", v: r.workspace },
                    { k: "Status", v: <AStatus s={r.status} /> },
                  ]),
                },
              ],
            },
            {
              label: "Permissions",
              subs: [
                {
                  label: "Permissions",
                  content: tlb([
                    {
                      primary: "role.assign",
                      secondary: "Authorization",
                      right: <AStatus s="High" />,
                    },
                    {
                      primary: "remediation.execute",
                      secondary: "Agent · AWS Production",
                      right: <AStatus s="Critical" />,
                    },
                    {
                      primary: "workspace.manage",
                      secondary: "Workspace",
                      right: <AStatus s="High" />,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Access Path",
              subs: [
                {
                  label: "Access Path",
                  content: tlb([
                    { primary: r.principal, secondary: "User", right: "" },
                    {
                      primary: "└─ Security Engineers",
                      secondary: "Group",
                      right: "",
                    },
                    {
                      primary: `   └─ ${r.role}`,
                      secondary: "Role",
                      right: "",
                    },
                    {
                      primary: "      └─ assignment",
                      secondary: "Direct",
                      right: "",
                    },
                    {
                      primary: "         └─ permission",
                      secondary: "role.assign",
                      right: <AStatus s="High" />,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Risk Analysis",
              subs: [
                {
                  label: "Risk Analysis",
                  content: kvb([
                    {
                      k: "Standing access",
                      v: r.risk.includes("Standing") ? "Yes — no JIT" : "No",
                    },
                    {
                      k: "Unused in 90 days",
                      v: r.risk.includes("Excessive") ? "Yes (12 perms)" : "No",
                    },
                    {
                      k: "SoD conflict",
                      v: r.risk.includes("Separation")
                        ? "Approve + Execute"
                        : "None",
                    },
                    { k: "Escalation path", v: "role.assign → self-grant" },
                  ]),
                },
              ],
            },
            {
              label: "Recommendations",
              subs: [
                {
                  label: "Recommendations",
                  content: (
                    <>
                      {tlb([
                        {
                          primary: "Convert to JIT eligible",
                          secondary: "remove standing privilege",
                          right: "Recommended",
                        },
                        {
                          primary: "Reduce permissions",
                          secondary: "drop unused 12",
                          right: "",
                        },
                        {
                          primary: "Launch certification",
                          secondary: "recertify role",
                          right: "",
                        },
                      ])}
                      {canEdit && (
                        <ActRow>
                          <HeaderButton
                            variant="primary"
                            onClick={() => {
                              set(r.id, { status: "Remediated" });
                              close();
                            }}
                          >
                            Revoke Access
                          </HeaderButton>
                          <HeaderButton
                            onClick={() => setToast("Certification created")}
                          >
                            Create Certification
                          </HeaderButton>
                        </ActRow>
                      )}
                    </>
                  ),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Risk detected",
                      secondary: r.risk,
                      right: "2026-06-26",
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── 4. AUTHENTICATION RISKS ─────────────────────────────────────────────────
function AuthenticationRisks() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      user: "legacy-admin@company.com",
      risk: "Privileged User Without MFA",
      severity: "High",
      lastAuth: "2026-06-26 22:40",
      workspace: "Organization",
      status: "Open",
    },
    {
      id: "1",
      user: "svc-legacy",
      risk: "Legacy Authentication",
      severity: "High",
      lastAuth: "2026-06-25 10:11",
      workspace: "Lab",
      status: "Open",
    },
    {
      id: "2",
      user: "marc@sentinel-org.io",
      risk: "Repeated MFA Failure",
      severity: "Medium",
      lastAuth: "2026-06-27 06:20",
      workspace: "SOC",
      status: "Investigating",
    },
    {
      id: "3",
      user: "contractor@ext.com",
      risk: "Passkey Missing",
      severity: "Low",
      lastAuth: "2026-06-24 09:00",
      workspace: "acme-dev",
      status: "Open",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const cols = aCols([
    ["user", "User"],
    ["risk", "Risk"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["lastAuth", "Last Authentication"],
    ["workspace", "Workspace"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <AlertSubCollection
      title="Authentication Risks"
      desc="Authentication security posture — MFA disabled, privileged users without MFA, weak/legacy methods, missing passkeys and repeated MFA failure."
      search="Search authentication risks"
      banner={<CategoryLensBanner />}
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "risk", label: "Risk" },
        { key: "severity", label: "Severity" },
        { key: "workspace", label: "Workspace" },
        { key: "status", label: "Status" },
      ]}
      commands={[
        {
          key: "mfa",
          label: "Require MFA",
          icon: <ShieldCheck size={15} />,
          disabled: !canEdit,
          onClick: () => setToast("MFA required for selected users"),
        },
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "authentication-risks"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {
            setRows(SEED);
            setToast("Refreshed");
          },
        },
      ]}
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View", onClick: open },
              {
                label: "Require MFA",
                onClick: () => {
                  set(r.id, { status: "Remediated" });
                  setToast("MFA required");
                },
              },
              {
                label: "Force Re-enrollment",
                onClick: () => setToast("Re-enrollment forced"),
              },
              {
                label: "Reset Authentication Methods",
                onClick: () => setToast("Methods reset"),
              },
              {
                label: "Disable Authentication Method",
                danger: true,
                onClick: () => setToast("Legacy method disabled"),
              },
            ]
          : [{ label: "View", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.user)}
          title={r.user}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.risk} · <AStatus s={r.severity} />
            </span>
          }
          actions={
            canEdit ? (
              <>
                <HeaderButton
                  variant="primary"
                  onClick={() => {
                    set(r.id, { status: "Remediated" });
                    close();
                  }}
                >
                  Require MFA
                </HeaderButton>
                <HeaderButton onClick={() => setToast("Re-enrollment forced")}>
                  Force Re-enrollment
                </HeaderButton>
              </>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "User", v: r.user },
                    { k: "Risk", v: r.risk },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Last authentication", v: r.lastAuth },
                    { k: "Workspace", v: r.workspace },
                    { k: "Status", v: <AStatus s={r.status} /> },
                  ]),
                },
              ],
            },
            {
              label: "Authentication History",
              subs: [
                {
                  label: "Authentication History",
                  content: tlb([
                    {
                      primary: "Password sign-in",
                      secondary: "no MFA challenge",
                      right: r.lastAuth,
                    },
                    {
                      primary: "Legacy protocol",
                      secondary: r.risk.includes("Legacy")
                        ? "IMAP basic auth"
                        : "—",
                      right: "",
                    },
                  ]),
                },
              ],
            },
            {
              label: "MFA Status",
              subs: [
                {
                  label: "MFA Status",
                  content: kvb([
                    {
                      k: "MFA enrolled",
                      v: (
                        <AStatus
                          s={r.risk.includes("MFA") ? "Disabled" : "Enabled"}
                        />
                      ),
                    },
                    {
                      k: "Passkey",
                      v: (
                        <AStatus
                          s={
                            r.risk.includes("Passkey") ? "Disabled" : "Enabled"
                          }
                        />
                      ),
                    },
                    { k: "Methods", v: "Password only" },
                    { k: "Phishing-resistant", v: <AStatus s="Disabled" /> },
                  ]),
                },
              ],
            },
            {
              label: "Credential Analysis",
              subs: [
                {
                  label: "Credential Analysis",
                  content: kvb([
                    { k: "Password age", v: "412 days" },
                    {
                      k: "Policy compliance",
                      v: <AStatus s="Non-compliant" />,
                    },
                    {
                      k: "Inactive credential",
                      v: r.risk.includes("Inactive") ? "Yes" : "No",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Risk Analysis",
              subs: [
                {
                  label: "Risk Analysis",
                  content: kvb([
                    {
                      k: "Privileged",
                      v: r.risk.includes("Privileged") ? "Yes" : "No",
                    },
                    { k: "Exposure", v: "Phishing / credential theft" },
                    { k: "Confidence", v: <AStatus s={r.severity} /> },
                  ]),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Risk detected",
                      secondary: r.risk,
                      right: r.lastAuth,
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── 5. ACCESS GOVERNANCE VIOLATIONS ─────────────────────────────────────────
function GovernanceViolations() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      violation: "Role Assignment Without Approval",
      principal: "contractor@ext.com",
      policy: "GOV-012",
      severity: "High",
      workspace: "acme-dev",
      status: "Open",
    },
    {
      id: "1",
      violation: "Expired Access Still Active",
      principal: "mei.tan@deloitte.com",
      policy: "GOV-004",
      severity: "Medium",
      workspace: "SOC",
      status: "Open",
    },
    {
      id: "2",
      violation: "Direct Permission Assignment",
      principal: "ops@inferencedefense.com",
      policy: "GOV-001",
      severity: "Medium",
      workspace: "Production",
      status: "Investigating",
    },
    {
      id: "3",
      violation: "Missing Certification",
      principal: "Security Engineers",
      policy: "GOV-020",
      severity: "Low",
      workspace: "Production",
      status: "Open",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const cols = aCols([
    ["violation", "Violation"],
    ["principal", "Principal"],
    ["policy", "Policy"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["workspace", "Workspace"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <AlertSubCollection
      title="Access Governance Violations"
      desc="Violations across authorization controls — out-of-policy assignments, direct grants, excessive scope, missing approvals or certifications and policy conflicts."
      search="Search governance violations"
      banner={<CategoryLensBanner />}
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "violation", label: "Violation" },
        { key: "policy", label: "Policy" },
        { key: "severity", label: "Severity" },
        { key: "status", label: "Status" },
      ]}
      commands={[
        {
          key: "own",
          label: "Assign Owner",
          icon: <UserPlus size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <AssignFlow
                title="Assign owner"
                onClose={() => setFlow(null)}
                onDone={(s) => {
                  setFlow(null);
                  setToast(`Assigned to ${s}`);
                }}
              />,
            ),
        },
        {
          key: "inv",
          label: "Open Investigation",
          icon: <ShieldCheck size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <InvestigationFlow
                onClose={() => setFlow(null)}
                onDone={(t) => {
                  setFlow(null);
                  setToast(`Investigation “${t}” opened`);
                }}
              />,
            ),
        },
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "governance-violations"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {
            setRows(SEED);
            setToast("Refreshed");
          },
        },
      ]}
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View", onClick: open },
              {
                label: "Remediate",
                onClick: () => {
                  set(r.id, { status: "Remediated" });
                  setToast("Remediated");
                },
              },
              { label: "Review Policy", onClick: open },
              {
                label: "Assign Owner",
                onClick: () =>
                  setFlow(
                    <AssignFlow
                      title="Assign owner"
                      onClose={() => setFlow(null)}
                      onDone={(s) => {
                        setFlow(null);
                        setToast(`Assigned to ${s}`);
                      }}
                    />,
                  ),
              },
              {
                label: "Open Investigation",
                onClick: () =>
                  setFlow(
                    <InvestigationFlow
                      prefill={`Violation — ${r.violation}`}
                      onClose={() => setFlow(null)}
                      onDone={(t) => {
                        setFlow(null);
                        setToast(`Investigation “${t}” opened`);
                      }}
                    />,
                  ),
              },
            ]
          : [{ label: "View", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.principal)}
          title={r.violation}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.principal} · {r.policy} · <AStatus s={r.severity} />
            </span>
          }
          actions={
            canEdit ? (
              <>
                <HeaderButton
                  variant="primary"
                  onClick={() => {
                    set(r.id, { status: "Remediated" });
                    close();
                  }}
                >
                  Remediate
                </HeaderButton>
                <HeaderButton
                  onClick={() =>
                    setFlow(
                      <AssignFlow
                        title="Assign owner"
                        onClose={() => setFlow(null)}
                        onDone={(s) => {
                          setFlow(null);
                          setToast(`Assigned to ${s}`);
                        }}
                      />,
                    )
                  }
                >
                  Assign Owner
                </HeaderButton>
              </>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Violation", v: r.violation },
                    { k: "Principal", v: r.principal },
                    { k: "Policy", v: r.policy },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Workspace", v: r.workspace },
                    { k: "Status", v: <AStatus s={r.status} /> },
                  ]),
                },
              ],
            },
            {
              label: "Violated Policy",
              subs: [
                {
                  label: "Violated Policy",
                  content: kvb([
                    { k: "Policy", v: r.policy },
                    { k: "Rule", v: r.violation },
                    { k: "Control", v: "Access governance" },
                    { k: "Enforcement", v: "Detective" },
                  ]),
                },
              ],
            },
            {
              label: "Access Path",
              subs: [
                {
                  label: "Access Path",
                  content: tlb([
                    { primary: r.principal, secondary: "Principal", right: "" },
                    {
                      primary: "└─ assignment (no approval)",
                      secondary: "Direct",
                      right: <AStatus s="High" />,
                    },
                    {
                      primary: "   └─ role / permission",
                      secondary: "out of policy",
                      right: "",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Impact Analysis",
              subs: [
                {
                  label: "Impact Analysis",
                  content: kvb([
                    { k: "Affected resources", v: "AWS Production" },
                    {
                      k: "Risk score",
                      v: <StatusIndicator tone="warn">66</StatusIndicator>,
                    },
                    { k: "Exposure", v: "Unapproved standing access" },
                  ]),
                },
              ],
            },
            {
              label: "Remediation",
              subs: [
                {
                  label: "Remediation",
                  content: (
                    <>
                      {tlb([
                        {
                          primary: "Remove assignment",
                          secondary: "revert out-of-policy grant",
                          right: "Recommended",
                        },
                        {
                          primary: "Route for approval",
                          secondary: "open approval request",
                          right: "",
                        },
                      ])}
                      {canEdit && (
                        <ActRow>
                          <HeaderButton
                            variant="primary"
                            onClick={() => {
                              set(r.id, { status: "Remediated" });
                              close();
                            }}
                          >
                            Remediate
                          </HeaderButton>
                        </ActRow>
                      )}
                    </>
                  ),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Violation detected",
                      secondary: r.policy,
                      right: "2026-06-26",
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── 6. APPROVAL WORKFLOW VIOLATIONS ─────────────────────────────────────────
function ApprovalViolations() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      violation: "Self Approval",
      requester: "ops@inferencedefense.com",
      approver: "ops@inferencedefense.com",
      severity: "High",
      workspace: "Production",
      status: "Open",
    },
    {
      id: "1",
      violation: "Emergency Access Without Approval",
      requester: "ciso@inferencedefense.com",
      approver: "—",
      severity: "Critical",
      workspace: "Production",
      status: "Investigating",
    },
    {
      id: "2",
      violation: "Approval SLA Breach",
      requester: "marc@sentinel-org.io",
      approver: "compliance@inferencedefense.com",
      severity: "Medium",
      workspace: "SOC",
      status: "Open",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const cols = aCols([
    ["violation", "Violation"],
    ["requester", "Requester"],
    ["approver", "Approver"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["workspace", "Workspace"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <AlertSubCollection
      title="Approval Workflow Violations"
      desc="Failures and bypasses in approval governance — self-approval, emergency access without approval, missing approvers, SLA breaches and delegation abuse."
      search="Search approval violations"
      banner={
        <CategoryLensBanner note="The approval work queue itself lives in Access → Privileged Access → Approvals; this view flags governance failures in it." />
      }
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "violation", label: "Violation" },
        { key: "severity", label: "Severity" },
        { key: "workspace", label: "Workspace" },
        { key: "status", label: "Status" },
      ]}
      commands={[
        {
          key: "esc",
          label: "Escalate",
          icon: <ArrowUp size={15} />,
          disabled: !canEdit,
          onClick: () => setToast("Escalated to org owner"),
        },
        {
          key: "inv",
          label: "Open Investigation",
          icon: <ShieldCheck size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <InvestigationFlow
                onClose={() => setFlow(null)}
                onDone={(t) => {
                  setFlow(null);
                  setToast(`Investigation “${t}” opened`);
                }}
              />,
            ),
        },
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "approval-violations"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {
            setRows(SEED);
            setToast("Refreshed");
          },
        },
      ]}
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View", onClick: open },
              { label: "Review Workflow", onClick: open },
              {
                label: "Escalate",
                onClick: () => {
                  set(r.id, { severity: "Critical" });
                  setToast("Escalated");
                },
              },
              {
                label: "Open Investigation",
                onClick: () =>
                  setFlow(
                    <InvestigationFlow
                      prefill={`Approval violation — ${r.violation}`}
                      onClose={() => setFlow(null)}
                      onDone={(t) => {
                        setFlow(null);
                        setToast(`Investigation “${t}” opened`);
                      }}
                    />,
                  ),
              },
              {
                label: "Remediate",
                onClick: () => {
                  set(r.id, { status: "Remediated" });
                  setToast("Remediated");
                },
              },
            ]
          : [{ label: "View", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.requester)}
          title={r.violation}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.requester} → {r.approver} · <AStatus s={r.severity} />
            </span>
          }
          actions={
            canEdit ? (
              <>
                <HeaderButton
                  variant="primary"
                  onClick={() => {
                    set(r.id, { severity: "Critical" });
                    setToast("Escalated");
                  }}
                >
                  Escalate
                </HeaderButton>
                <HeaderButton
                  onClick={() => {
                    set(r.id, { status: "Remediated" });
                    close();
                  }}
                >
                  Remediate
                </HeaderButton>
              </>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Violation", v: r.violation },
                    { k: "Requester", v: r.requester },
                    { k: "Approver", v: r.approver },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Workspace", v: r.workspace },
                    { k: "Status", v: <AStatus s={r.status} /> },
                  ]),
                },
              ],
            },
            {
              label: "Workflow",
              subs: [
                {
                  label: "Workflow",
                  content: tlb([
                    {
                      primary: "Request submitted",
                      secondary: r.requester,
                      right: "08:40",
                    },
                    {
                      primary:
                        r.violation === "Self Approval"
                          ? "Approved by requester"
                          : "Approval missing",
                      secondary: r.approver,
                      right: <AStatus s="High" />,
                    },
                    {
                      primary: "Access granted",
                      secondary: "without valid chain",
                      right: "",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Violation Details",
              subs: [
                {
                  label: "Violation Details",
                  content: kvb([
                    { k: "Type", v: r.violation },
                    {
                      k: "Approval chain",
                      v: r.violation.includes("Incomplete")
                        ? "Stage 2 skipped"
                        : "Bypassed",
                    },
                    {
                      k: "SLA",
                      v: r.violation.includes("SLA") ? "Breached (>24h)" : "—",
                    },
                    {
                      k: "Self-approval",
                      v: r.violation === "Self Approval" ? "Yes" : "No",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Impact Analysis",
              subs: [
                {
                  label: "Impact Analysis",
                  content: kvb([
                    { k: "Granted access", v: "Privileged role" },
                    {
                      k: "Risk score",
                      v: (
                        <StatusIndicator
                          tone={r.severity === "Critical" ? "danger" : "warn"}
                        >
                          {r.severity === "Critical" ? "90" : "62"}
                        </StatusIndicator>
                      ),
                    },
                    { k: "Exposure", v: "Ungoverned privileged grant" },
                  ]),
                },
              ],
            },
            {
              label: "Remediation",
              subs: [
                {
                  label: "Remediation",
                  content: (
                    <>
                      {tlb([
                        {
                          primary: "Revoke ungoverned grant",
                          secondary: "",
                          right: "Recommended",
                        },
                        {
                          primary: "Re-run approval chain",
                          secondary: "",
                          right: "",
                        },
                      ])}
                      {canEdit && (
                        <ActRow>
                          <HeaderButton
                            variant="primary"
                            onClick={() => {
                              set(r.id, { status: "Remediated" });
                              close();
                            }}
                          >
                            Remediate
                          </HeaderButton>
                        </ActRow>
                      )}
                    </>
                  ),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Violation detected",
                      secondary: r.violation,
                      right: "08:41",
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── 7. ALERT RULES ──────────────────────────────────────────────────────────
function AlertRules() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      rule: "Impossible travel — privileged",
      category: "Identity Threat",
      severity: "Critical",
      status: "Active",
      lastTriggered: "2026-06-27 06:31",
      condition: "geo_distance > 500km within 1h",
      threshold: "1",
    },
    {
      id: "1",
      rule: "Privileged user without MFA",
      category: "Authentication Risk",
      severity: "High",
      status: "Active",
      lastTriggered: "2026-06-26 22:40",
      condition: "privileged AND mfa = false",
      threshold: "1",
    },
    {
      id: "2",
      rule: "Role assigned without approval",
      category: "Governance Violation",
      severity: "High",
      status: "Active",
      lastTriggered: "2026-06-26 14:02",
      condition: "assignment.approval = none",
      threshold: "1",
    },
    {
      id: "3",
      rule: "Password spray detection",
      category: "Identity Threat",
      severity: "High",
      status: "Disabled",
      lastTriggered: "2026-06-20 03:11",
      condition: "failed_logins > 50 across users / 10m",
      threshold: "50",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const cols = aCols([
    ["rule", "Rule"],
    ["category", "Category"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["status", "Status", (r) => <AStatus s={r.status} />],
    ["lastTriggered", "Last Triggered"],
  ]);
  return (
    <AlertSubCollection
      title="Alert Rules"
      desc="Configure identity alert generation — conditions, thresholds, notifications and suppression logic."
      search="Search rules"
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "category", label: "Category" },
        { key: "severity", label: "Severity" },
        { key: "status", label: "Status" },
      ]}
      commands={[
        {
          key: "new",
          label: "Create Rule",
          icon: <Plus size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <CreateAlertRuleFlow
                onClose={() => setFlow(null)}
                onCreate={(d) => {
                  setRows((rs) => [d, ...rs]);
                  setFlow(null);
                  setToast("Rule created");
                }}
              />,
            ),
        },
        {
          key: "imp",
          label: "Import Rules",
          icon: <Plug size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <ImportPolicyFlow
                onClose={() => setFlow(null)}
                onDone={(n) => {
                  setFlow(null);
                  setToast(`${n} rules imported`);
                }}
              />,
            ),
        },
        {
          key: "exp",
          label: "Export Rules",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "alert-rules"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {
            setRows(SEED);
            setToast("Refreshed");
          },
        },
      ]}
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View", onClick: open },
              { label: "Edit", onClick: () => setToast("Editing rule") },
              {
                label: r.status === "Active" ? "Disable" : "Enable",
                onClick: () =>
                  set(r.id, {
                    status: r.status === "Active" ? "Disabled" : "Active",
                  }),
              },
              {
                label: "Delete",
                danger: true,
                onClick: () => setRows((rs) => rs.filter((x) => x.id !== r.id)),
              },
            ]
          : [{ label: "View", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.rule)}
          title={r.rule}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.category} · <AStatus s={r.severity} /> ·{" "}
              <AStatus s={r.status} />
            </span>
          }
          actions={
            canEdit ? (
              <>
                <HeaderButton onClick={() => setToast("Editing")}>
                  Edit
                </HeaderButton>
                <HeaderButton
                  onClick={() =>
                    set(r.id, {
                      status: r.status === "Active" ? "Disabled" : "Active",
                    })
                  }
                >
                  {r.status === "Active" ? "Disable" : "Enable"}
                </HeaderButton>
              </>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Rule", v: r.rule },
                    { k: "Category", v: r.category },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Status", v: <AStatus s={r.status} /> },
                    { k: "Last triggered", v: r.lastTriggered },
                  ]),
                },
              ],
            },
            {
              label: "Conditions",
              subs: [
                {
                  label: "Conditions",
                  content: kvb([
                    { k: "Condition", v: r.condition },
                    {
                      k: "Signal source",
                      v: "Sign-in logs + authorization graph",
                    },
                    { k: "Scope", v: "Organization" },
                  ]),
                },
              ],
            },
            {
              label: "Thresholds",
              subs: [
                {
                  label: "Thresholds",
                  content: kvb([
                    { k: "Threshold", v: r.threshold },
                    { k: "Window", v: "1 hour" },
                    { k: "Cooldown", v: "15 min" },
                  ]),
                },
              ],
            },
            {
              label: "Notifications",
              subs: [
                {
                  label: "Notifications",
                  content: tlb([
                    {
                      primary: "Security Operations",
                      secondary: "in-app + email",
                      right: <AStatus s="Enabled" />,
                    },
                    {
                      primary: "Microsoft Sentinel",
                      secondary: "SIEM forward",
                      right: <AStatus s="Enabled" />,
                    },
                    {
                      primary: "Slack #sec-alerts",
                      secondary: "critical only",
                      right: <AStatus s="Enabled" />,
                    },
                  ]),
                },
              ],
            },
            {
              label: "Suppression Logic",
              subs: [
                {
                  label: "Suppression Logic",
                  content: kvb([
                    { k: "Dedup window", v: "1 hour" },
                    { k: "Known-good allowlist", v: "VPN egress ranges" },
                    { k: "Maintenance windows", v: "respected" },
                  ]),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Rule created",
                      secondary: "policy baseline",
                      right: "2026-01-10",
                    },
                    {
                      primary: "Last triggered",
                      secondary: r.rule,
                      right: r.lastTriggered,
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── 8. EXTERNAL INTEGRATIONS ────────────────────────────────────────────────
function ExternalIntegrations() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      integration: "Microsoft Sentinel",
      target: "Microsoft Sentinel",
      status: "Connected",
      lastDelivery: "2026-06-27 06:32",
      minSeverity: "High",
      endpoint: "https://…sentinel",
    },
    {
      id: "1",
      integration: "Splunk (SOC)",
      target: "Splunk",
      status: "Connected",
      lastDelivery: "2026-06-27 06:31",
      minSeverity: "Medium",
      endpoint: "https://splunk.soc:8088",
    },
    {
      id: "2",
      integration: "ServiceNow",
      target: "ServiceNow",
      status: "Connected",
      lastDelivery: "2026-06-26 14:05",
      minSeverity: "High",
      endpoint: "https://…/api/now",
    },
    {
      id: "3",
      integration: "Slack #sec-alerts",
      target: "Slack",
      status: "Error",
      lastDelivery: "2026-06-25 09:00",
      minSeverity: "Critical",
      endpoint: "https://hooks.slack.com/…",
    },
  ];
  const [rows, setRows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (id: string, p: Partial<ARow>) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? ({ ...r, ...p } as ARow) : r)),
    );
  const cols = aCols([
    ["integration", "Integration"],
    ["target", "Target"],
    ["minSeverity", "Min Severity"],
    ["lastDelivery", "Last Delivery"],
    ["status", "Status", (r) => <AStatus s={r.status} />],
  ]);
  return (
    <AlertSubCollection
      title="External Integrations"
      desc="Forward identity alerts to enterprise systems — Sentinel, Splunk, QRadar, Elastic, Chronicle, ServiceNow, Jira, Slack, Teams or a webhook."
      search="Search integrations"
      banner={
        <InfoBanner icon={<Cable size={15} />}>
          Connections to enterprise systems are defined once in{" "}
          <strong>Shared Connections</strong>. This view configures{" "}
          <strong>alert routing</strong> over those connections (severity
          thresholds, mapping, delivery) — it does not create a second
          connection registry.
        </InfoBanner>
      }
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "target", label: "Target" },
        { key: "status", label: "Status" },
        { key: "minSeverity", label: "Min Severity" },
      ]}
      commands={[
        {
          key: "new",
          label: "Add Integration",
          icon: <Plus size={15} />,
          disabled: !canEdit,
          onClick: () =>
            setFlow(
              <AddIntegrationFlow
                onClose={() => setFlow(null)}
                onCreate={(d) => {
                  setRows((rs) => [d, ...rs]);
                  setFlow(null);
                  setToast("Integration added");
                }}
              />,
            ),
        },
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "external-integrations"),
        },
        {
          key: "ref",
          label: "Refresh",
          icon: <RotateCw size={15} />,
          onClick: () => {
            setRows(SEED);
            setToast("Refreshed");
          },
        },
      ]}
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View", onClick: open },
              {
                label: "Test Delivery",
                onClick: () => {
                  set(r.id, { status: "Connected", lastDelivery: "just now" });
                  setToast("Test event delivered");
                },
              },
              { label: "Edit Routing", onClick: open },
              {
                label: "Disable",
                danger: true,
                onClick: () => set(r.id, { status: "Error" }),
              },
              {
                label: "Delete",
                danger: true,
                onClick: () => setRows((rs) => rs.filter((x) => x.id !== r.id)),
              },
            ]
          : [{ label: "View", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={initials2(r.integration)}
          title={r.integration}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.target} · <AStatus s={r.status} />
            </span>
          }
          actions={
            canEdit ? (
              <>
                <HeaderButton
                  variant="primary"
                  onClick={() => {
                    set(r.id, {
                      status: "Connected",
                      lastDelivery: "just now",
                    });
                    setToast("Test event delivered");
                  }}
                >
                  Test Delivery
                </HeaderButton>
                <HeaderButton onClick={() => setToast("Routing saved")}>
                  Edit Routing
                </HeaderButton>
              </>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Integration", v: r.integration },
                    { k: "Target", v: r.target },
                    { k: "Endpoint", v: r.endpoint },
                    { k: "Status", v: <AStatus s={r.status} /> },
                    { k: "Last delivery", v: r.lastDelivery },
                  ]),
                },
              ],
            },
            {
              label: "Routing Rules",
              subs: [
                {
                  label: "Routing Rules",
                  content: kvb([
                    { k: "Minimum severity", v: r.minSeverity },
                    { k: "Categories", v: "All identity categories" },
                    { k: "Workspaces", v: "All" },
                    { k: "Rate limit", v: "100 / min" },
                  ]),
                },
              ],
            },
            {
              label: "Alert Mapping",
              subs: [
                {
                  label: "Alert Mapping",
                  content: tlb([
                    {
                      primary: "alert.id → external_id",
                      secondary: "key",
                      right: "",
                    },
                    {
                      primary: "severity → severity",
                      secondary: "Critical=1…Low=4",
                      right: "",
                    },
                    {
                      primary: "principal → entity.user",
                      secondary: "",
                      right: "",
                    },
                    {
                      primary: "category → event.category",
                      secondary: "",
                      right: "",
                    },
                  ]),
                },
              ],
            },
            {
              label: "Delivery History",
              subs: [
                {
                  label: "Delivery History",
                  content: tlb([
                    {
                      primary: "IA-5012 delivered",
                      secondary: "200 OK",
                      right: r.lastDelivery,
                    },
                    ...(r.status === "Error"
                      ? [
                          {
                            primary: "Delivery failed",
                            secondary: "401 unauthorized",
                            right: r.lastDelivery,
                          },
                        ]
                      : [
                          {
                            primary: "IA-5011 delivered",
                            secondary: "200 OK",
                            right: r.lastDelivery,
                          },
                        ]),
                  ]),
                },
              ],
            },
            {
              label: "Audit History",
              subs: [
                {
                  label: "Audit",
                  content: tlb([
                    {
                      primary: "Integration connected",
                      secondary: r.target,
                      right: "2026-02-01",
                    },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ── 9. ALERT HISTORY ────────────────────────────────────────────────────────
function AlertHistory() {
  const canEdit = useCloudGuardSession().can("admin");
  const SEED: ARow[] = [
    {
      id: "0",
      alert: "IA-4980 — Impossible travel",
      category: "Identity Threat",
      severity: "Critical",
      closedBy: "ciso@inferencedefense.com",
      closedDate: "2026-06-20 09:12",
      resolution: "2h 41m",
      result: "Remediated",
    },
    {
      id: "1",
      alert: "IA-4975 — Privileged without MFA",
      category: "Authentication Risk",
      severity: "High",
      closedBy: "security-ops@inferencedefense.com",
      closedDate: "2026-06-18 16:30",
      resolution: "5h 02m",
      result: "Remediated",
    },
    {
      id: "2",
      alert: "IA-4970 — Role without approval",
      category: "Governance Violation",
      severity: "Medium",
      closedBy: "compliance@inferencedefense.com",
      closedDate: "2026-06-15 11:00",
      resolution: "1d 03h",
      result: "Exception",
    },
  ];
  const [rows] = React.useState<ARow[]>(SEED);
  const [flow, setFlow] = React.useState<React.ReactNode>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const cols = aCols([
    ["alert", "Alert"],
    ["category", "Category"],
    ["severity", "Severity", (r) => <AStatus s={r.severity} />],
    ["closedBy", "Closed By"],
    ["closedDate", "Closed Date"],
    ["resolution", "Resolution Time"],
    ["result", "Result", (r) => <AStatus s={r.result} />],
  ]);
  return (
    <AlertSubCollection
      title="Alert History"
      desc="Long-term archive and forensic review of resolved identity alerts."
      search="Search history"
      banner={
        <InfoBanner icon={<ScrollText size={15} />}>
          Alert History is a scoped lens of the immutable{" "}
          <strong>Audit &amp; Evidence</strong> ledger, filtered to identity
          alerts. The full forensic record and exports live there.
        </InfoBanner>
      }
      cols={cols}
      seed={rows}
      flow={flow}
      toast={toast}
      setToast={setToast}
      filterDefs={[
        { key: "category", label: "Category" },
        { key: "severity", label: "Severity" },
        { key: "result", label: "Result" },
        { key: "closedBy", label: "Owner" },
      ]}
      commands={[
        {
          key: "exp",
          label: "Export",
          icon: <Download size={15} />,
          onClick: () => authCsv(rows, "alert-history"),
        },
      ]}
      rowMenu={(r, open) =>
        canEdit
          ? [
              { label: "View Alert", onClick: open },
              {
                label: "View Investigation",
                onClick: () =>
                  setFlow(
                    <InvestigationFlow
                      prefill={r.alert}
                      onClose={() => setFlow(null)}
                      onDone={(t) => {
                        setFlow(null);
                        setToast(`Opened “${t}”`);
                      }}
                    />,
                  ),
              },
              { label: "Reopen", onClick: () => setToast("Alert reopened") },
              { label: "Export", onClick: () => authCsv([r], `alert-${r.id}`) },
            ]
          : [{ label: "View Alert", onClick: open }]
      }
      drawer={(r, close) => (
        <AuthEntityDrawer
          initials={r.alert.slice(3, 5)}
          title={r.alert}
          meta={
            <span
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              {r.category} · <AStatus s={r.result} /> · {r.closedDate}
            </span>
          }
          actions={
            canEdit ? (
              <HeaderButton
                variant="primary"
                onClick={() => {
                  setToast("Alert reopened");
                  close();
                }}
              >
                Reopen
              </HeaderButton>
            ) : undefined
          }
          sections={[
            {
              label: "Overview",
              subs: [
                {
                  label: "Overview",
                  content: kvb([
                    { k: "Alert", v: r.alert },
                    { k: "Category", v: r.category },
                    { k: "Severity", v: <AStatus s={r.severity} /> },
                    { k: "Closed by", v: r.closedBy },
                    { k: "Closed date", v: r.closedDate },
                    { k: "Resolution time", v: r.resolution },
                    { k: "Result", v: <AStatus s={r.result} /> },
                  ]),
                },
              ],
            },
            {
              label: "Investigation",
              subs: [
                {
                  label: "Investigation",
                  content: kvb([
                    { k: "Findings", v: "Confirmed and remediated" },
                    { k: "Evidence", v: "sign-in logs, approval chain" },
                    { k: "Recommendation", v: "Applied" },
                  ]),
                },
              ],
            },
            {
              label: "Audit Evidence",
              subs: [
                {
                  label: "Audit Evidence",
                  content: kvb([
                    { k: "Event hash", v: `0x${r.id}b71e9c4a` },
                    { k: "Recorded by", v: "tamper-evident ledger" },
                    { k: "Owner", v: r.closedBy },
                  ]),
                },
              ],
            },
          ]}
          onClose={close}
        />
      )}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// §7.12 Identity Graph — Explorer. Cytoscape + fcose, styled after the
// Cambridge Intelligence KeyLines "Cloud Security" sample (no KeyLines dep):
// white glyphs on solid service-colour nodes, orthogonal links, frosted combos
// with full-width dark-grey banners, and an S3 misconfiguration finding.
// ════════════════════════════════════════════════════════════════════════════
let fcoseRegistered = false;
function ensureFcose() {
  if (!fcoseRegistered) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cytoscape as any).use(fcose);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cytoscape as any).use(undoRedo);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cytoscape as any).use(expandCollapse);
    } catch {
      /* expand-collapse is best-effort */
    }
    fcoseRegistered = true;
  }
}
type GKind = "internet" | "elb" | "alb" | "lambda" | "ec2" | "s3" | "db";
const GKIND_LABEL: Record<GKind, string> = {
  internet: "Internet",
  elb: "Gateway Load Balancer",
  alb: "Application Load Balancer",
  lambda: "AWS Lambda",
  ec2: "EC2 Instance",
  s3: "S3 Bucket",
  db: "Customer Data (copy)",
};
// short labels for the compact filter bar (keeps the chrome from crowding)
const GKIND_SHORT: Record<GKind, string> = {
  internet: "Internet",
  elb: "Gateway LB",
  alb: "App LB",
  lambda: "Lambda",
  ec2: "EC2",
  s3: "S3",
  db: "Data",
};
const DARK_GREY = "#232f3e";
const svgUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
// Real AWS service icons (thesvg brand library).
const GICON_URI: Record<GKind, string> = {
  internet: svgUri(igwIcon.svg),
  elb: svgUri(elbIcon.svg),
  alb: svgUri(albIcon.svg),
  lambda: svgUri(lambdaIcon.svg),
  ec2: svgUri(ec2Icon.svg),
  s3: svgUri(s3Icon.svg),
  db: svgUri(dbIcon.svg),
};
const BAR_URI = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4" preserveAspectRatio="none"><rect width="4" height="4" fill="${DARK_GREY}"/></svg>`,
);
const CLOUD_ORANGE = svgUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF9900"><path d="M6.5 19A4.5 4.5 0 0 1 5.6 10.1 6 6 0 0 1 17.5 9 4.2 4.2 0 0 1 17 17.4 4 4 0 0 1 16.5 19H6.5z"/></svg>',
);

type ANode = {
  id: string;
  kind: GKind;
  label: string;
  parent: string;
  x: number;
  y: number;
  finding?: boolean;
};
const A_NODES: ANode[] = [
  {
    id: "internet",
    kind: "internet",
    label: "Internet",
    parent: "",
    x: 70,
    y: 400,
  },
  {
    id: "elb1",
    kind: "elb",
    label: "gateway-elb-1",
    parent: "vpc",
    x: 330,
    y: 320,
  },
  {
    id: "elb2",
    kind: "elb",
    label: "gateway-elb-2",
    parent: "vpc",
    x: 330,
    y: 440,
  },
  {
    id: "alb1",
    kind: "alb",
    label: "desktop-app-alb-1",
    parent: "vpc",
    x: 330,
    y: 690,
  },
  {
    id: "lambda_a",
    kind: "lambda",
    label: "lambda-2b154e",
    parent: "sub_a",
    x: 560,
    y: 250,
  },
  {
    id: "ec2_a",
    kind: "ec2",
    label: "ec2-13cc45d",
    parent: "sub_a",
    x: 760,
    y: 250,
  },
  {
    id: "s3_1a",
    kind: "s3",
    label: "s3-bucket-1a",
    parent: "sub_a",
    x: 970,
    y: 180,
    finding: true,
  },
  {
    id: "s3_2a",
    kind: "s3",
    label: "s3-bucket-2a",
    parent: "sub_a",
    x: 970,
    y: 280,
    finding: true,
  },
  {
    id: "db_a",
    kind: "db",
    label: "customer data-copy-1a",
    parent: "sub_a",
    x: 970,
    y: 380,
  },
  {
    id: "lambda_f",
    kind: "lambda",
    label: "lambda-2b354e",
    parent: "sub_f",
    x: 560,
    y: 720,
  },
  {
    id: "ec2_f",
    kind: "ec2",
    label: "ec2-13cd45d",
    parent: "sub_f",
    x: 760,
    y: 720,
  },
  {
    id: "s3_1f",
    kind: "s3",
    label: "s3-bucket-1f",
    parent: "sub_f",
    x: 970,
    y: 650,
  },
  {
    id: "s3_2f",
    kind: "s3",
    label: "s3-bucket-2f",
    parent: "sub_f",
    x: 970,
    y: 750,
  },
  {
    id: "db_f",
    kind: "db",
    label: "customer data-copy-1f",
    parent: "sub_f",
    x: 970,
    y: 850,
  },
];
const A_PARENTS: { id: string; label: string; parent: string }[] = [
  { id: "aws", label: "aws", parent: "" },
  { id: "region", label: "us-west", parent: "aws" },
  { id: "vpc", label: "demo-vpc", parent: "region" },
  { id: "sub_a", label: "demo-private-us-west-1a", parent: "vpc" },
  { id: "sub_f", label: "demo-private-us-west-1f", parent: "vpc" },
];
// total leaf resources nested under each container (for the collapsed count badge)
const CONTAINER_COUNT: Record<string, number> = (() => {
  const byId: Record<string, string> = Object.fromEntries(
    A_PARENTS.map((p) => [p.id, p.parent]),
  );
  const out: Record<string, number> = {};
  A_NODES.forEach((n) => {
    let cur: string | undefined = n.parent;
    while (cur) {
      out[cur] = (out[cur] || 0) + 1;
      cur = byId[cur] || "";
    }
  });
  return out;
})();
type AEdge = {
  source: string;
  target: string;
  kind: "curved" | "angled" | "finding";
};
const A_EDGES: AEdge[] = [
  { source: "internet", target: "elb1", kind: "curved" },
  { source: "internet", target: "elb2", kind: "curved" },
  { source: "elb1", target: "lambda_a", kind: "curved" },
  { source: "elb2", target: "lambda_a", kind: "curved" },
  { source: "elb2", target: "lambda_f", kind: "curved" },
  { source: "alb1", target: "lambda_f", kind: "curved" },
  { source: "lambda_a", target: "ec2_a", kind: "angled" },
  { source: "ec2_a", target: "s3_1a", kind: "angled" },
  { source: "ec2_a", target: "s3_2a", kind: "angled" },
  { source: "ec2_a", target: "db_a", kind: "angled" },
  { source: "lambda_f", target: "ec2_f", kind: "angled" },
  { source: "ec2_f", target: "s3_1f", kind: "angled" },
  { source: "ec2_f", target: "s3_2f", kind: "angled" },
  { source: "ec2_f", target: "db_f", kind: "angled" },
  { source: "finding_box", target: "s3_2a", kind: "finding" },
];
const A_ELEMENTS = [
  ...A_PARENTS.map((p) => ({
    data: {
      id: p.id,
      label: p.label,
      parent: p.parent || undefined,
      container: 1,
      tmx: Math.round(p.label.length * 8.4 + 18),
    },
  })),
  {
    data: { id: "find_hl", parent: "sub_a" },
    position: { x: 970, y: 230 },
  },
  ...A_NODES.map((n) => ({
    data: {
      id: n.id,
      kind: n.kind,
      label: n.label,
      parent: n.parent || undefined,
      icon: GICON_URI[n.kind],
      finding: n.finding ? 1 : undefined,
      size: n.kind === "internet" ? 58 : 64,
    },
    position: { x: n.x, y: n.y },
  })),
  {
    data: {
      id: "finding_box",
      callout: 1,
      label:
        "⚠  Misconfigured S3 Buckets\nS3 buckets have a policy which allows unauthorised access",
    },
    position: { x: 1360, y: 140 },
  },
  ...A_EDGES.map((e, i) => ({
    data: { id: `e${i}`, source: e.source, target: e.target, ekind: e.kind },
  })),
];
/* eslint-disable @typescript-eslint/no-explicit-any */
const A_STYLE: any[] = [
  {
    selector: "node[kind]",
    style: {
      shape: "round-rectangle",
      width: "data(size)",
      height: "data(size)",
      "background-opacity": 0,
      "border-width": 0,
      "overlay-color": "#aab2bd",
      "overlay-opacity": 0,
      "overlay-padding": 5,
      "overlay-shape": "round-rectangle",
      "background-image": "data(icon)",
      "background-fit": "contain",
      "background-clip": "none",
      label: "data(label)",
      "text-wrap": "wrap",
      "text-max-width": 180,
      "font-size": 15,
      "font-weight": 600,
      color: "#ffffff",
      "text-background-color": DARK_GREY,
      "text-background-opacity": 1,
      "text-background-shape": "round-rectangle",
      "text-background-padding": 6,
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 9,
      "line-height": 1.3,
    },
  },
  { selector: "node.hovered", style: { "overlay-opacity": 0.14 } },
  { selector: "node.picked", style: { "overlay-opacity": 0.2 } },
  {
    selector: "#find_hl",
    style: {
      shape: "round-rectangle",
      "corner-radius": "10px",
      width: 96,
      height: 168,
      "background-opacity": 0,
      "border-color": "#fcae1e",
      "border-width": 2.5,
      "overlay-opacity": 0,
      label: "",
      events: "no",
    },
  },
  {
    selector: "node[?callout]",
    style: {
      shape: "round-rectangle",
      "corner-radius": "6px",
      width: 300,
      height: 110,
      "background-color": "#162d42",
      "background-opacity": 1,
      "border-color": "#fcae1e",
      "border-width": 2,
      "overlay-opacity": 0,
      label: "data(label)",
      "text-wrap": "wrap",
      "text-max-width": 250,
      "text-valign": "center",
      "text-halign": "center",
      "font-size": 14,
      "font-weight": 600,
      color: "#ffffff",
      padding: 12,
    },
  },
  {
    selector: "node[?container]",
    style: {
      shape: "round-rectangle",
      "corner-radius": "6px",
      // light-grey nested body on the white canvas (stacking adds depth)
      "background-color": "#0b2540",
      "background-opacity": 0.05,
      // dashed light-grey border
      "border-color": "rgba(15,40,70,0.28)",
      "border-width": 1.4,
      "border-style": "dashed",
      "overlay-opacity": 0,
      // [0] full-width dark-grey banner, [1] orange cloud glyph
      "background-image": [BAR_URI, CLOUD_ORANGE],
      "background-image-opacity": [1, 1],
      "background-width": ["100%", "18px"],
      "background-height": ["46px", "18px"],
      "background-position-x": ["50%", "15px"],
      "background-position-y": ["0%", "11px"],
      "background-fit": ["none", "none"],
      "background-clip": ["node", "node"],
      label: "data(label)",
      "text-valign": "top",
      "text-halign": "left",
      "font-size": 15,
      "font-weight": 700,
      color: "#ffffff",
      "text-margin-x": "data(tmx)",
      "text-margin-y": 21,
      padding: 62,
    },
  },
  {
    // collapsed container — single cloud glyph centred + label-pill below
    selector: "node[?collapsedChildren]",
    style: {
      width: 96,
      height: 96,
      "background-color": "#1c2a3a",
      "background-opacity": 1,
      "border-color": "#3c5572",
      "border-width": 1.4,
      "border-style": "solid",
      "background-image": CLOUD_ORANGE,
      "background-width": "58%",
      "background-height": "58%",
      "background-position-x": "50%",
      "background-position-y": "50%",
      "background-fit": "none",
      label: "data(label)",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-x": 0,
      "text-margin-y": 9,
      "font-size": 14,
      color: "#ffffff",
      "text-background-color": DARK_GREY,
      "text-background-opacity": 1,
      "text-background-shape": "round-rectangle",
      "text-background-padding": 6,
    },
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#9aa5b1",
      "target-arrow-color": "#9aa5b1",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1,
      "overlay-opacity": 0,
    },
  },
  {
    selector: 'edge[ekind="angled"]',
    style: {
      "curve-style": "round-taxi",
      "taxi-direction": "horizontal",
      "taxi-turn": 28,
      "taxi-turn-min-distance": 6,
      radius: 14,
    },
  },
  {
    selector: 'edge[ekind="curved"]',
    style: {
      "curve-style": "unbundled-bezier",
      "line-style": "dashed",
      "target-arrow-shape": "none",
      width: 1.6,
    },
  },
  {
    selector: 'edge[ekind="finding"]',
    style: {
      "curve-style": "bezier",
      "line-color": "#fcae1e",
      "line-style": "dashed",
      "target-arrow-shape": "none",
      width: 1.8,
    },
  },
  // emphasis (filter / finding / issue selection) — mirrors the Security Graph
  { selector: "node.xshadow", style: { opacity: 0.12 } },
  { selector: "edge.xshadow", style: { opacity: 0.06 } },
  // active data-flow edge — strengthened + animated marching-ants flow
  {
    selector: "edge.xflow",
    style: {
      width: 3.4,
      opacity: 1,
      "line-color": "#2d86d4",
      "target-arrow-color": "#2d86d4",
      "line-style": "dashed",
      "line-dash-pattern": [10, 6],
    },
  },
  {
    selector: "node.xbox",
    style: {
      "border-width": 3,
      "border-color": "#2d86d4",
      "border-style": "dashed",
      "border-opacity": 1,
    },
  },
  {
    selector: "node.xmark",
    style: {
      "border-width": 3,
      "border-color": "#f5b301",
      "border-opacity": 1,
    },
  },
];
const A_LAYOUT: any = { name: "preset", padding: 6, fit: true };
/* eslint-enable @typescript-eslint/no-explicit-any */

// In-canvas right panel — explains the resource's place in the graph hierarchy,
// its relationships and findings, and offers element-hiding. Fades in on click.
const GRAPH_KINDS: GKind[] = [
  "internet",
  "elb",
  "alb",
  "lambda",
  "ec2",
  "s3",
  "db",
];
// ── Explorer Findings + Issues (representative, on the AWS architecture) ───────
const X_NODE = Object.fromEntries(A_NODES.map((n) => [n.id, n]));
type XSeverity = Severity;
type XFinding = {
  id: string;
  nodeId: string;
  category: string;
  severity: XSeverity;
  resourceType: string;
  region: string;
  vpc: string;
  framework: string;
  controlId: string;
  owner: string;
  status: string;
  ageDays: number;
};
type XIssue = {
  id: string;
  title: string;
  path: string[];
  attackType: string;
  risk: XSeverity;
  entryPoint: string;
  target: string;
  hopCount: number;
  crossesVpc: boolean;
  involvesPublic: boolean;
  exploitability: string;
  findingIds: string[];
  minSeverity: XSeverity;
  status: string;
};
const X_RTYPE: Record<GKind, string> = {
  internet: "Internet gateway",
  elb: "Gateway Load Balancer",
  alb: "Application Load Balancer",
  lambda: "Lambda / Function",
  ec2: "EC2 / VM",
  s3: "S3 / Blob",
  db: "RDS / Database",
};
const X_FINDINGS: XFinding[] = (
  [
    ["s3_1a", "Public bucket", "Critical", "Open"],
    ["s3_2a", "Public bucket", "Critical", "Open"],
    ["ec2_a", "Vulnerability (CVE)", "High", "In remediation"],
    ["lambda_a", "Over-permissioned role", "Medium", "Open"],
    ["db_a", "Unencrypted storage", "High", "Open"],
    ["s3_1f", "Misconfiguration", "Medium", "Open"],
    ["ec2_f", "Missing MFA", "Low", "Resolved"],
    ["db_f", "Unencrypted storage", "High", "Open"],
    ["elb1", "Misconfiguration", "Low", "Open"],
    ["alb1", "Exposed secret", "Medium", "Open"],
  ] as [string, string, XSeverity, string][]
).map(([nodeId, category, severity, status], i) => {
  const n = X_NODE[nodeId];
  const region = nodeId.includes("_f") ? "us-west-1f" : "us-west-1a";
  return {
    id: `XF-${1000 + i}`,
    nodeId,
    category,
    severity,
    resourceType: n ? X_RTYPE[n.kind] : "—",
    region: `us-west-2 / ${region}`,
    vpc: `demo-vpc / demo-private-${region}`,
    framework: ["CIS AWS 1.5", "SOC 2", "NIST 800-53"][i % 3],
    controlId: ["2.1.1", "CC6.1", "SC-13", "AC-6", "IA-2"][i % 5],
    owner: ["platform", "data-eng", "security"][i % 3],
    status,
    ageDays: 4 + i * 11,
  };
});
const X_FINDING_BY_NODE: Record<string, XFinding> = {};
X_FINDINGS.forEach((f) => {
  if (!X_FINDING_BY_NODE[f.nodeId]) X_FINDING_BY_NODE[f.nodeId] = f;
});
const X_ISSUES: XIssue[] = (
  [
    ["internet", "elb1", "lambda_a", "ec2_a", "s3_1a"],
    ["internet", "elb2", "lambda_f", "ec2_f", "s3_1f"],
    ["internet", "elb2", "lambda_a", "ec2_a", "db_a"],
    ["internet", "elb1", "lambda_a", "ec2_a", "s3_2a"],
    ["alb1", "lambda_f", "ec2_f", "db_f"],
    ["internet", "elb2", "lambda_f", "ec2_f", "s3_2f"],
  ] as string[][]
).map((path, i) => {
  const target = X_NODE[path[path.length - 1]];
  const findingIds = X_FINDINGS.filter((f) => path.includes(f.nodeId)).map(
    (f) => f.id,
  );
  const sevs = findingIds
    .map((fid) => X_FINDINGS.find((f) => f.id === fid)!.severity)
    .sort((a, b) => SEV_ORDER.indexOf(a) - SEV_ORDER.indexOf(b));
  const risk = sevs[0] || "Medium";
  return {
    id: `XI-${200 + i}`,
    title: `Internet → ${target?.label ?? path[path.length - 1]}`,
    path,
    attackType: [
      "Internet exposure → sensitive data",
      "Data exfiltration path",
      "Lateral movement path",
    ][i % 3],
    risk,
    entryPoint:
      path[0] === "internet" ? "Internet-facing" : "Vulnerable workload",
    target:
      target?.kind === "s3" || target?.kind === "db"
        ? "Sensitive data store"
        : "Production workload",
    hopCount: path.length - 1,
    crossesVpc: i % 2 === 0,
    involvesPublic: path.some(
      (p) => X_FINDING_BY_NODE[p]?.category === "Public bucket",
    ),
    exploitability: i % 2 === 0 ? "Known CVE on path" : "No known exploit",
    findingIds,
    minSeverity: sevs[sevs.length - 1] || risk,
    status: (["Active", "Active", "Partially remediated"] as string[])[i % 3],
  };
});
function xIssuesForNode(id: string): XIssue[] {
  return X_ISSUES.filter((i) => i.path.includes(id));
}
// ── catalog filter (findings + issues) — parity with the Security Graph ───────
function xAgeBucket(d: number): string {
  if (d <= 7) return "≤ 7 days";
  if (d <= 30) return "8–30 days";
  return "> 30 days";
}
function xEnv(nodeId: string): string {
  const envs = ["prod", "stage", "dev"];
  let h = 0;
  for (let i = 0; i < nodeId.length; i += 1)
    h = (h * 31 + nodeId.charCodeAt(i)) % 997;
  return envs[h % 3];
}
const X_FINDING_FILTER_GROUPS = [
  { key: "severity", label: "Severity", options: SEV_ORDER as string[] },
  {
    key: "status",
    label: "Status",
    options: ["Open", "In remediation", "Resolved", "Suppressed"],
  },
  {
    key: "category",
    label: "Category",
    options: Array.from(new Set(X_FINDINGS.map((f) => f.category))),
  },
  { key: "env", label: "Environment", options: ["prod", "stage", "dev"] },
  { key: "cloud", label: "Cloud provider", options: ["AWS"] },
  { key: "age", label: "Age", options: ["≤ 7 days", "8–30 days", "> 30 days"] },
];
const X_ISSUE_FILTER_GROUPS = [
  {
    key: "risk",
    label: "Path risk",
    options: ["Critical", "High", "Medium", "Low"],
  },
  {
    key: "status",
    label: "Status",
    options: [
      "Active",
      "Partially remediated",
      "Blocked (path broken)",
      "Suppressed",
    ],
  },
  {
    key: "attack",
    label: "Attack type",
    options: Array.from(new Set(X_ISSUES.map((i) => i.attackType))),
  },
  {
    key: "exploit",
    label: "Exploitability",
    options: ["Known CVE on path", "No known exploit"],
  },
];
function xSelByGroup(sel: Set<string>): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  sel.forEach((k) => {
    const i = k.indexOf(":");
    (out[k.slice(0, i)] ||= new Set()).add(k.slice(i + 1));
  });
  return out;
}
function xMatchFinding(f: XFinding, sel: Set<string>): boolean {
  if (!sel.size) return true;
  const g = xSelByGroup(sel);
  if (g.severity && !g.severity.has(f.severity)) return false;
  if (g.status && !g.status.has(f.status)) return false;
  if (g.category && !g.category.has(f.category)) return false;
  if (g.env && !g.env.has(xEnv(f.nodeId))) return false;
  if (g.cloud && !g.cloud.has("AWS")) return false;
  if (g.age && !g.age.has(xAgeBucket(f.ageDays))) return false;
  return true;
}
function xMatchIssue(i: XIssue, sel: Set<string>): boolean {
  if (!sel.size) return true;
  const g = xSelByGroup(sel);
  if (g.risk && !g.risk.has(i.risk)) return false;
  if (g.status && !g.status.has(i.status)) return false;
  if (g.attack && !g.attack.has(i.attackType)) return false;
  if (g.exploit && !g.exploit.has(i.exploitability)) return false;
  return true;
}
// the data flow IN and OUT of a node: transitive downstream (out) + upstream
// (in) along the directed architecture edges.
function xChain(id: string): string[] {
  const out: Record<string, string[]> = {};
  const inn: Record<string, string[]> = {};
  A_EDGES.forEach((e) => {
    (out[e.source] ||= []).push(e.target);
    (inn[e.target] ||= []).push(e.source);
  });
  const seen = new Set<string>([id]);
  const walk = (adj: Record<string, string[]>) => {
    const stack = [...(adj[id] || [])];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (!seen.has(cur)) {
        seen.add(cur);
        (adj[cur] || []).forEach((x) => stack.push(x));
      }
    }
  };
  walk(out); // downstream (data flows out)
  walk(inn); // upstream (data flows in)
  return [...seen];
}
// downstream-only reach (for the "blast radius" count in the details drawer)
function xDownstream(id: string): string[] {
  const out: Record<string, string[]> = {};
  A_EDGES.forEach((e) => {
    (out[e.source] ||= []).push(e.target);
  });
  const seen = new Set<string>();
  const stack = [...(out[id] || [])];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (!seen.has(cur)) {
      seen.add(cur);
      (out[cur] || []).forEach((x) => stack.push(x));
    }
  }
  return [...seen];
}

// node-details drawer — mirrors the Security Graph's node detail exactly
function XNodeDrawer({
  node,
  marked,
  onClose,
  onDataflow,
  onMark,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any;
  marked: boolean;
  onClose: () => void;
  onDataflow: (id: string) => void;
  onMark: (id: string) => void;
}) {
  const [tab, setTab] = React.useState<
    "node" | "finding" | "policy" | "remediation" | "logs" | "notes"
  >("node");
  const noteApi = useNotes(node?.id ?? "—");
  const open = !!node;
  const f = node ? X_FINDING_BY_NODE[node.id] : undefined;
  const flow = node ? xChain(node.id).length - 1 : 0;
  const down = node ? xDownstream(node.id).length : 0;
  const kindLabel = node ? (GKIND_LABEL[node.kind as GKind] ?? "Resource") : "";
  const daysAgo = (d: number) => {
    const dt = new Date(2026, 6, 1);
    dt.setDate(dt.getDate() - d);
    return dt.toISOString().slice(0, 10);
  };
  const X_ACTIONS: Record<string, string[]> = {
    s3: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
    ec2: ["ec2:DescribeInstances", "ec2:StartInstances"],
    lambda: ["lambda:InvokeFunction"],
    db: ["dynamodb:GetItem", "dynamodb:PutItem"],
    elb: ["elasticloadbalancing:*"],
    alb: ["elasticloadbalancing:*"],
    internet: ["*"],
  };
  const policy = node
    ? JSON.stringify(
        {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal:
                f?.category === "Public bucket"
                  ? "*"
                  : { AWS: "arn:aws:iam::9021:role/app" },
              Action: X_ACTIONS[node.kind as string] ?? ["*"],
              Resource: `arn:aws:${node.kind}:us-west-2:9021:${node.label}`,
            },
          ],
        },
        null,
        2,
      )
    : "";

  return (
    <div
      style={{
        ...drawerShell,
        zIndex: 43, // above the catalog drawer so it shows on affected-node open
        opacity: open ? 1 : 0,
        transform: open ? "translateX(0)" : "translateX(18px)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity .25s ease, transform .25s ease",
      }}
    >
      <div style={drawerHead}>
        {node && (
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              background: "#2d86d4",
            }}
          />
        )}
        Node details
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: "var(--cg-text-muted)",
            cursor: "pointer",
            display: "inline-flex",
          }}
        >
          <X size={17} />
        </button>
      </div>
      {node && (
        <>
          <div style={drawerTabStrip}>
            {(
              [
                ["node", "Node detail"],
                ["finding", "Finding"],
                ["policy", "Policy"],
                ["remediation", "Remediation"],
                ["logs", "Logs"],
                ["notes", "Notes"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                style={drawerTab(tab === id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ overflowY: "auto", padding: "0 16px 20px", flex: 1 }}>
            {tab === "node" && (
              <>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--cg-text-primary)",
                    marginTop: 16,
                    wordBreak: "break-all",
                  }}
                >
                  {node.label ?? node.id}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--cg-text-muted)",
                    marginTop: 4,
                  }}
                >
                  {kindLabel} · blast radius{" "}
                  <b style={{ color: "var(--cg-text-primary)" }}>{down}</b>{" "}
                  downstream
                </div>
                <button
                  type="button"
                  onClick={() => onDataflow(node.id)}
                  style={{
                    ...graphToolBtn(false),
                    marginTop: 14,
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <GitBranch size={14} /> Expand data flow · {flow}
                  <ChevronRight size={13} />
                </button>
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${f ? "var(--cg-border)" : "var(--cg-border-subtle)"}`,
                    background: f ? "rgba(217,154,0,0.08)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {f ? (
                    <>
                      <SevChip sev={f.severity} />
                      <span
                        style={{
                          fontSize: 12.5,
                          color: "var(--cg-text-primary)",
                        }}
                      >
                        {f.category}
                      </span>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: 12.5,
                        color: "var(--cg-text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      No finding on this resource
                    </span>
                  )}
                </div>
                <GroupHead>Resource type</GroupHead>
                <SchemaField k="Type" v={kindLabel} />
                <GroupHead>Cloud & location</GroupHead>
                <SchemaField k="Cloud" v="AWS" />
                <SchemaField k="Account / Subscription" v="acct-prod-9021" />
                <SchemaField k="Region" v={f?.region ?? "us-west-2"} />
                <SchemaField
                  k="VPC / Subnet"
                  v={f?.vpc ?? "demo-vpc / demo-private"}
                />
                <GroupHead>Connectivity</GroupHead>
                <SchemaField k="Data flow (in + out)" v={flow} />
                <SchemaField k="Downstream (blast radius)" v={down} />
                <button
                  type="button"
                  onClick={() => onMark(node.id)}
                  style={{
                    ...graphToolBtn(false),
                    marginTop: 16,
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <Star
                    size={13}
                    color={marked ? "#f5b301" : undefined}
                    fill={marked ? "#f5b301" : "none"}
                  />
                  {marked ? "Edit mark" : "Mark node"}
                </button>
              </>
            )}

            {tab === "finding" && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: f
                      ? "var(--cg-text-primary)"
                      : "var(--cg-text-muted)",
                    fontStyle: f ? "normal" : "italic",
                    margin: "14px 0 4px",
                  }}
                >
                  {f
                    ? "Finding — this resource is misconfigured or exposed"
                    : "No finding on this resource"}
                </div>
                <GroupHead>What is it</GroupHead>
                <SchemaField k="Category" v={f?.category} />
                <SchemaField
                  k="Severity"
                  v={f ? <SevChip sev={f.severity} /> : undefined}
                />
                <GroupHead>Status</GroupHead>
                <SchemaField k="Status" v={f?.status} />
                <SchemaField
                  k="First seen"
                  v={f ? daysAgo(f.ageDays) : undefined}
                />
                <SchemaField k="Last seen" v={f ? daysAgo(1) : undefined} />
                <SchemaField k="Age (days open)" v={f?.ageDays} />
              </>
            )}

            {tab === "policy" && (
              <>
                <GroupHead>Compliance & context</GroupHead>
                <SchemaField k="Framework" v={f?.framework} />
                <SchemaField k="Control ID" v={f?.controlId} />
                <SchemaField k="Owner / team" v={f?.owner} />
                <SchemaField k="Suppressed / accepted" v={false} />
                <GroupHead>Attached policy</GroupHead>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 8,
                    background: "var(--cg-code-bg, #1a1a19)",
                    color: "#dfe6e9",
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    overflowX: "auto",
                    fontFamily:
                      "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
                  }}
                >
                  {policy}
                </pre>
              </>
            )}

            {tab === "remediation" && (
              <RemediationTimeline items={remediationFor(node.id, !!f)} />
            )}
            {tab === "logs" && (
              <LogList
                logs={logsFor([
                  {
                    id: node.id,
                    label: node.label ?? node.id,
                    hasFinding: !!f,
                  },
                ])}
              />
            )}
            {tab === "notes" && (
              <NotesPanel
                notes={noteApi.notes}
                onAdd={noteApi.add}
                placeholder={`Add a note — mentioning ${node.label ?? node.id}…`}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
function XIssueSchema({ iss }: { iss: XIssue }) {
  return (
    <div>
      <GroupHead>Attack path type</GroupHead>
      <SchemaField k="Type" v={iss.attackType} />
      <SchemaField k="Path risk score" v={<SevChip sev={iss.risk} />} />
      <GroupHead>Entry → target</GroupHead>
      <SchemaField k="Entry point" v={iss.entryPoint} />
      <SchemaField k="Target" v={iss.target} />
      <GroupHead>Path properties</GroupHead>
      <SchemaField k="Hop count" v={iss.hopCount} />
      <SchemaField k="Crosses VPC boundary" v={iss.crossesVpc} />
      <SchemaField k="Involves public resource" v={iss.involvesPublic} />
      <SchemaField k="Exploitability" v={iss.exploitability} />
      <SchemaField k="Chained findings" v={iss.findingIds.length} />
      <SchemaField
        k="Min severity on path"
        v={<SevChip sev={iss.minSeverity} />}
      />
      <GroupHead>Status</GroupHead>
      <SchemaField k="Status" v={iss.status} />
    </div>
  );
}
// issue "Policy" sub-view — governing controls + a guardrail to break the path
function XIssueNotes({ issueId, title }: { issueId: string; title: string }) {
  const api = useNotes(`issue:${issueId}`);
  return (
    <NotesPanel
      notes={api.notes}
      onAdd={api.add}
      placeholder={`Add a note — mentioning ${title}…`}
    />
  );
}
function XIssuePolicy({ iss }: { iss: XIssue }) {
  const findings = iss.findingIds
    .map((id) => X_FINDINGS.find((f) => f.id === id))
    .filter(Boolean) as XFinding[];
  const frameworks = Array.from(new Set(findings.map((f) => f.framework)));
  const controls = Array.from(new Set(findings.map((f) => f.controlId)));
  const target = X_NODE[iss.path[iss.path.length - 1]];
  const guardrail = JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "BreakAttackPath",
          Effect: "Deny",
          Principal: iss.involvesPublic ? "*" : { AWS: "arn:aws:iam::*:root" },
          Action: iss.involvesPublic ? ["s3:GetObject", "s3:PutObject"] : ["*"],
          Resource: `arn:aws:*:*:9021:${target?.label ?? "*"}`,
        },
      ],
    },
    null,
    2,
  );
  return (
    <div>
      <GroupHead>Governing controls</GroupHead>
      <SchemaField
        k="Frameworks"
        v={frameworks.length ? frameworks.join(", ") : undefined}
      />
      <SchemaField
        k="Control IDs"
        v={controls.length ? controls.join(", ") : undefined}
      />
      <SchemaField k="Findings on path" v={findings.length} />
      <SchemaField k="Min severity" v={<SevChip sev={iss.minSeverity} />} />
      <GroupHead>Suggested guardrail policy</GroupHead>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--cg-text-muted)",
          margin: "0 0 6px",
          lineHeight: 1.45,
        }}
      >
        A deny policy that breaks this attack path at the target.
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 8,
          background: "var(--cg-code-bg, #1a1a19)",
          color: "#dfe6e9",
          fontSize: 11.5,
          lineHeight: 1.5,
          overflowX: "auto",
          fontFamily:
            "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
        }}
      >
        {guardrail}
      </pre>
    </div>
  );
}

// findings / issues catalog drawer for the Explorer (Security-Graph styling)
function XCatalogDrawer({
  mode,
  onClose,
  onPick,
  onOpenNode,
}: {
  mode: "findings" | "issues";
  onClose: () => void;
  onPick: (
    n:
      | { kind: "finding"; id: string }
      | { kind: "issue"; id: string }
      | { kind: "node"; id: string; issueId?: string }
      | null,
  ) => void;
  onOpenNode: (nodeId: string) => void;
}) {
  // two-level navigation (list ↔ issue detail) — parity with the Security Graph
  const [openIssue, setOpenIssue] = React.useState<string | null>(null);
  const [issueSub, setIssueSub] = React.useState<
    "description" | "nodes" | "policy" | "remediation" | "logs" | "notes"
  >("description");
  const iss = openIssue
    ? (X_ISSUES.find((i) => i.id === openIssue) ?? null)
    : null;
  const [catFilter, setCatFilter] = React.useState<Set<string>>(new Set());
  const shownFindings = X_FINDINGS.filter((f) => xMatchFinding(f, catFilter));
  const shownIssues = X_ISSUES.filter((i) => xMatchIssue(i, catFilter));

  React.useEffect(() => {
    setOpenIssue(null);
    setCatFilter(new Set());
  }, [mode]);

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    textAlign: "left",
    padding: "11px 14px",
    border: "none",
    borderBottom: "1px solid var(--cg-border-subtle)",
    background: "transparent",
    color: "var(--cg-text-primary)",
    cursor: "pointer",
  };
  const title: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--cg-text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const sub: React.CSSProperties = {
    display: "block",
    fontSize: 11.5,
    color: "var(--cg-text-muted)",
  };
  const subTab = (
    id: "description" | "nodes" | "policy" | "remediation" | "logs" | "notes",
    label: string,
  ) => (
    <button
      key={id}
      type="button"
      onClick={() => setIssueSub(id)}
      style={drawerTab(issueSub === id)}
    >
      {label}
    </button>
  );
  const closeBtn = (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      style={{
        marginLeft: "auto",
        background: "transparent",
        border: "none",
        color: "var(--cg-text-muted)",
        cursor: "pointer",
        display: "inline-flex",
      }}
    >
      <X size={17} />
    </button>
  );

  // ── header: list = title; issue detail = back arrow + breadcrumb ──────────
  const header = iss ? (
    <div style={{ ...drawerHead, gap: 10 }}>
      <button
        type="button"
        aria-label="Back"
        onClick={() => {
          setOpenIssue(null);
          onPick(null);
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--cg-text-primary)",
          cursor: "pointer",
          display: "inline-flex",
        }}
      >
        <ArrowLeft size={17} />
      </button>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setOpenIssue(null);
            onPick(null);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--cg-text-muted)",
            cursor: "pointer",
            padding: 0,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          Issues
        </button>
        <span style={{ color: "var(--cg-text-muted)", flexShrink: 0 }}>›</span>
        <span
          style={{
            fontWeight: 600,
            color: "var(--cg-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {iss.title}
        </span>
      </nav>
      {closeBtn}
    </div>
  ) : (
    <div style={drawerHead}>
      {mode === "findings" ? (
        <AlertTriangle size={15} color="#d99a00" />
      ) : (
        <GitBranch size={15} color="#5b9bf0" />
      )}
      {mode === "findings"
        ? `Findings · ${X_FINDINGS.length}`
        : `Issues · ${X_ISSUES.length}`}
      {closeBtn}
    </div>
  );

  // ── body ──────────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (iss) {
    body = (
      <div style={{ overflowY: "auto", flex: 1 }}>
        <div style={drawerTabStrip}>
          {subTab("description", "Description")}
          {subTab("nodes", `Affected nodes · ${iss.path.length}`)}
          {subTab("policy", "Policy")}
          {subTab("remediation", "Remediation")}
          {subTab("logs", "Logs")}
          {subTab("notes", "Notes")}
        </div>
        <div style={{ padding: "6px 16px 20px" }}>
          {issueSub === "description" && (
            <>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--cg-text-primary)",
                  marginTop: 6,
                }}
              >
                {iss.title}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--cg-text-muted)",
                  margin: "6px 0 2px",
                }}
              >
                Connected path of resources — together they form a risk.
                Highlighted on the graph.
              </div>
              <XIssueSchema iss={iss} />
            </>
          )}
          {issueSub === "policy" && <XIssuePolicy iss={iss} />}
          {issueSub === "nodes" && (
            <>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--cg-text-muted)",
                  margin: "4px 0 8px",
                }}
              >
                Entry → target. Open a node to inspect it — it is boxed and
                labelled on the graph.
              </div>
              {iss.path.map((nid) => {
                const n = X_NODE[nid];
                const f = X_FINDING_BY_NODE[nid];
                return (
                  <button
                    key={nid}
                    type="button"
                    onClick={() => onOpenNode(nid)}
                    onMouseEnter={() =>
                      onPick({ kind: "node", id: nid, issueId: iss.id })
                    }
                    onMouseLeave={() => onPick({ kind: "issue", id: iss.id })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 0",
                      border: "none",
                      borderBottom: "1px solid var(--cg-border-subtle)",
                      background: "transparent",
                      color: "var(--cg-text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={title}>{n?.label ?? nid}</span>
                      {f && <span style={sub}>{f.category}</span>}
                    </span>
                    {f && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: SEV_COLOUR[f.severity],
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <ChevronRight size={14} color="var(--cg-text-muted)" />
                  </button>
                );
              })}
            </>
          )}
          {issueSub === "remediation" && (
            <RemediationTimeline items={remediationFor(iss.id, true)} />
          )}
          {issueSub === "logs" && (
            <LogList
              logs={logsFor(
                iss.path.map((nid) => ({
                  id: nid,
                  label: X_NODE[nid]?.label ?? nid,
                  hasFinding: !!X_FINDING_BY_NODE[nid],
                })),
              )}
            />
          )}
          {issueSub === "notes" && (
            <XIssueNotes issueId={iss.id} title={iss.title} />
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div
          style={{
            padding: "6px 14px 8px",
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            lineHeight: 1.5,
          }}
        >
          {mode === "findings"
            ? "Single resource — something is misconfigured or exposed."
            : "Connected path of resources — together they form a risk."}
        </div>
        <MultiFilter
          groups={
            mode === "findings"
              ? X_FINDING_FILTER_GROUPS
              : X_ISSUE_FILTER_GROUPS
          }
          selected={catFilter}
          onToggle={(k) =>
            setCatFilter((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onClear={() => setCatFilter(new Set())}
        />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {mode === "findings"
            ? shownFindings.map((f) => {
                const n = X_NODE[f.nodeId];
                return (
                  <button
                    key={f.id}
                    type="button"
                    style={rowStyle}
                    onMouseEnter={() => onPick({ kind: "finding", id: f.id })}
                    onMouseLeave={() => onPick(null)}
                    onClick={() => onOpenNode(f.nodeId)}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: SEV_COLOUR[f.severity],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={title}>{n?.label ?? f.nodeId}</span>
                      <span style={sub}>{f.category}</span>
                    </span>
                    <SevChip sev={f.severity} />
                    <ChevronRight size={14} color="var(--cg-text-muted)" />
                  </button>
                );
              })
            : shownIssues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  style={rowStyle}
                  onMouseEnter={() => onPick({ kind: "issue", id: issue.id })}
                  onMouseLeave={() => onPick(null)}
                  onClick={() => {
                    setIssueSub("description");
                    setOpenIssue(issue.id);
                    onPick({ kind: "issue", id: issue.id });
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: SEV_COLOUR[issue.risk],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={title}>{issue.title}</span>
                    <span style={sub}>
                      {issue.attackType} · {issue.hopCount} hops
                    </span>
                  </span>
                  <SevChip sev={issue.risk} />
                  <ChevronRight size={14} color="var(--cg-text-muted)" />
                </button>
              ))}
        </div>
      </>
    );
  }

  return (
    <div style={drawerShell}>
      {header}
      {body}
    </div>
  );
}

const G_MINZOOM = 0.2;
const G_MAXZOOM = 3;
const zoomToPct = (z: number) => {
  const r = Math.log(z / G_MINZOOM) / Math.log(G_MAXZOOM / G_MINZOOM);
  return Math.max(0, Math.min(100, r * 100));
};
const pctToZoom = (p: number) =>
  G_MINZOOM * (G_MAXZOOM / G_MINZOOM) ** (p / 100);

function GraphExplorer() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const flowRafRef = React.useRef(0);
  const [isFull, setIsFull] = React.useState(false);
  const [showMini, setShowMini] = React.useState(true);
  // Security-Graph-style chrome: mode toggle · filter · findings/issues · marks
  const [gview, setGview] = React.useState<"graph" | "findings" | "issues">(
    "graph",
  );
  const [gfilters, setGfilters] = React.useState<Set<GKind>>(new Set());
  const [gmarked, setGmarked] = React.useState<
    Record<string, { note: string; ts: number }>
  >({});
  // active catalog selection → { finding } single node, or { issue } path
  const [gnav, setGnav] = React.useState<
    | { kind: "finding"; id: string }
    | { kind: "issue"; id: string }
    | { kind: "node"; id: string; issueId?: string }
    | null
  >(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gHover, setGHover] = React.useState<any>(null);
  // locked view (dependency chain of a node) + category (hide) drawer
  const [gLocked, setGLocked] = React.useState<string | null>(null);
  const [gCatOpen, setGCatOpen] = React.useState(false);
  const [ctxMenu, setCtxMenu] = React.useState<{
    x: number;
    y: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cyRef = React.useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sel, setSel] = React.useState<any>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [toast, setToast] = React.useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ecApiRef = React.useRef<any>(null);
  const [cues, setCues] = React.useState<
    { id: string; x: number; y: number; collapsed: boolean; count: number }[]
  >([]);
  const [mini, setMini] = React.useState<{
    bb: { x: number; y: number; w: number; h: number };
    view: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [zoomPct, setZoomPct] = React.useState(50);
  const [magnifyOn, setMagnifyOn] = React.useState(false); // sticky toggle
  const [holdZoom, setHoldZoom] = React.useState(false); // hold-Z
  const magnify = magnifyOn || holdZoom;
  const lensHostRef = React.useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lensCyRef = React.useRef<any>(null);
  const [lens, setLens] = React.useState<{
    x: number;
    y: number;
    show: boolean;
  }>({ x: 0, y: 0, show: false });
  React.useEffect(() => {
    ensureFcose();
    if (!ref.current) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cy = (cytoscape as any)({
      container: ref.current,
      elements: A_ELEMENTS,
      style: A_STYLE,
      layout: A_LAYOUT,
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.45, // adequate mouse-wheel zoom
      panningEnabled: true,
      userPanningEnabled: true, // drag-pan anywhere on the canvas (incl. over nodes)
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
    });
    // interaction handlers FIRST (so nothing below can skip them)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.on("mouseover", "node[kind]", (e: any) => {
      e.target.addClass("hovered");
      setGHover(e.target.data());
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.on("mouseout", "node[kind]", (e: any) => {
      e.target.removeClass("hovered");
      setGHover(null);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.on("tap", "node[kind]", (e: any) => {
      cy.nodes().removeClass("picked");
      e.target.addClass("picked");
      setSel(e.target.data());
      // activate the node's dependency path on the graph (Security-Graph parity)
      setGnav({ kind: "node", id: e.target.id() });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.on("tap", (e: any) => {
      if (e.target === cy) {
        cy.nodes().removeClass("picked");
        setSel(null);
        setCtxMenu(null);
      }
    });
    // right-click → context menu (mirrors the Security-Graph interaction)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.on("cxttap", "node[kind]", (e: any) => {
      e.originalEvent?.preventDefault?.();
      const rp = e.renderedPosition || e.target.renderedPosition();
      setCtxMenu({ x: rp.x, y: rp.y, data: e.target.data() });
    });
    cyRef.current = cy;
    // collapse / expand mechanics (best-effort); we draw our own corner icons
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ecApiRef.current = (cy as any).expandCollapse({
        layoutBy: null,
        fisheye: false,
        animate: true,
        animationDuration: 250,
        undoable: false,
        cueEnabled: false,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("expand-collapse unavailable", err);
    }
    // keep the always-visible corner icons positioned on each container
    let raf = 0;
    const updateCues = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const list: {
          id: string;
          x: number;
          y: number;
          collapsed: boolean;
          count: number;
        }[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cy.nodes("[?container]").forEach((n: any) => {
          if (n.style("display") === "none") return;
          const bb = n.renderedBoundingBox();
          list.push({
            id: n.id(),
            x: bb.x2,
            y: bb.y1,
            collapsed: !!n.data("collapsedChildren"),
            count: CONTAINER_COUNT[n.id()] || 0,
          });
        });
        setCues(list);
        // minimap viewport + extent
        const ext = cy.extent();
        const bb = cy.elements().boundingBox();
        setMini({
          bb: { x: bb.x1, y: bb.y1, w: bb.w, h: bb.h },
          view: { x: ext.x1, y: ext.y1, w: ext.w, h: ext.h },
        });
        setZoomPct(zoomToPct(cy.zoom()));
      });
    };
    cy.on("pan zoom resize render", updateCues);
    updateCues();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      cy.destroy();
    };
  }, []);
  // hide/show element kinds
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.batch(() => {
      (
        ["internet", "elb", "alb", "lambda", "ec2", "s3", "db"] as const
      ).forEach((k) =>
        cy
          .nodes(`[kind="${k}"]`)
          .style("display", hidden.has(k) ? "none" : "element"),
      );
    });
    cy.fit(undefined, 6);
  }, [hidden]);
  // magnifier: spin up a dedicated cytoscape instance for crisp re-rendering
  React.useEffect(() => {
    if (!magnify) {
      if (lensCyRef.current) {
        lensCyRef.current.destroy();
        lensCyRef.current = null;
      }
      return undefined;
    }
    const host = lensHostRef.current;
    if (!host) return undefined;
    ensureFcose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lcy = (cytoscape as any)({
      container: host,
      elements: A_ELEMENTS,
      style: A_STYLE,
      layout: A_LAYOUT,
      minZoom: 0.05,
      maxZoom: 12,
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
    });
    lensCyRef.current = lcy;
    return () => {
      lcy.destroy();
      lensCyRef.current = null;
    };
  }, [magnify]);
  // UX-optimized acquire: hold Z to magnify, Esc to exit
  React.useEffect(() => {
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return (
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      );
    };
    const kd = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.key === "Escape") {
        setMagnifyOn(false);
        setHoldZoom(false);
      } else if ((e.key === "z" || e.key === "Z") && !e.repeat) {
        setHoldZoom(true);
      }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z") setHoldZoom(false);
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);
  const open = !!sel;
  // re-fit the graph into the split (left) area when a right panel opens/closes
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return undefined;
    const t = setTimeout(() => {
      cy.resize();
      cy.fit(undefined, 6);
    }, 290);
    return () => clearTimeout(t);
  }, [open, gview]);
  const fit = () =>
    cyRef.current?.animate({
      fit: { eles: cyRef.current.elements(), padding: 6 },
      duration: 300,
    });
  const toggleFull = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };
  React.useEffect(() => {
    const onFs = () => {
      const full = !!document.fullscreenElement;
      setIsFull(full);
      const cy = cyRef.current;
      window.setTimeout(() => {
        cy?.resize();
        cy?.animate(
          { fit: { eles: cy.elements(), padding: full ? 24 : 6 } },
          { duration: 420 },
        );
      }, 90);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const pan = (dx: number, dy: number) =>
    cyRef.current?.panBy({ x: dx, y: dy });
  const zoom = (f: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.stop();
    cy.animate(
      {
        zoom: {
          level: cy.zoom() * f,
          renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
        },
      },
      { duration: 150, easing: "ease-out" },
    );
  };
  // absolute zoom from the slider (0–100 → minZoom…maxZoom, centred)
  const zoomTo = (pct: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: pctToZoom(pct),
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };
  // magnifier lens — a second cytoscape instance re-renders (crisp vectors) the
  // cursor region at high zoom; we just sync its pan/zoom to the main view.
  const LENS = 150;
  const LENS_ZOOM = 2.4;
  const onMove = (e: React.MouseEvent) => {
    if (!magnify) return;
    const host = ref.current;
    const cy = cyRef.current;
    const lensCy = lensCyRef.current;
    if (!host || !cy) return;
    const r = host.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) {
      setLens((l) => (l.show ? { ...l, show: false } : l));
      return;
    }
    setLens({ x: e.clientX, y: e.clientY, show: true });
    if (!lensCy) return;
    // model point under the cursor in the MAIN view → centre it in the lens
    const mpan = cy.pan();
    const z = cy.zoom();
    const mx = (x - mpan.x) / z;
    const my = (y - mpan.y) / z;
    const lz = z * LENS_ZOOM;
    lensCy.zoom(lz);
    lensCy.pan({ x: LENS / 2 - mx * lz, y: LENS / 2 - my * lz });
  };
  const toggleKind = (k: GKind) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleGFilter = (k: GKind) =>
    setGfilters((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // ── emphasis: spotlight a filter / finding / issue path; shadow the rest ────
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return undefined;
    let active: Set<string> | null = null;
    let boxId: string | null = null;
    if (gLocked) {
      active = new Set(xChain(gLocked)); // locked dependency chain
    } else if (gnav?.kind === "issue") {
      active = new Set(X_ISSUES.find((i) => i.id === gnav.id)?.path ?? []);
    } else if (gnav?.kind === "finding") {
      const f = X_FINDINGS.find((x) => x.id === gnav.id);
      if (f) {
        active = new Set([f.nodeId]);
        boxId = f.nodeId;
      }
    } else if (gnav?.kind === "node") {
      if (gnav.issueId) {
        active = new Set(
          X_ISSUES.find((i) => i.id === gnav.issueId)?.path ?? [gnav.id],
        );
      } else {
        // a clicked node activates its whole dependency chain
        active = new Set(xChain(gnav.id));
      }
      boxId = gnav.id;
    } else if (gfilters.size) {
      active = new Set(
        A_NODES.filter((n) => gfilters.has(n.kind)).map((n) => n.id),
      );
    }
    // a path activation (not a plain type filter) gets the animated flow edges
    const isFlow =
      !!gLocked ||
      gnav?.kind === "node" ||
      gnav?.kind === "issue" ||
      gnav?.kind === "finding";
    cy.batch(() => {
      cy.elements().removeClass("xshadow xbox xflow");
      if (!active) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cy.nodes("[kind]").forEach((n: any) => {
        if (!active!.has(n.id())) n.addClass("xshadow");
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cy.edges().forEach((e: any) => {
        const inA =
          active!.has(e.data("source")) && active!.has(e.data("target"));
        if (!inA) e.addClass("xshadow");
        else if (isFlow) e.addClass("xflow");
      });
      if (boxId) cy.getElementById(boxId).addClass("xbox");
    });
    // marching-ants flow on the active edges
    cancelAnimationFrame(flowRafRef.current);
    if (active && isFlow) {
      let off = 0;
      const tick = () => {
        off -= 0.9;
        cy.edges(".xflow").style("line-dash-offset", off);
        flowRafRef.current = requestAnimationFrame(tick);
      };
      flowRafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(flowRafRef.current);
  }, [gnav, gfilters, gLocked]);

  // ── marked nodes → golden border ──────────────────────────────────────────
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cy.nodes("[kind]").forEach((n: any) => {
        if (gmarked[n.id()]) n.addClass("xmark");
        else n.removeClass("xmark");
      });
    });
  }, [gmarked]);

  // switching to graph mode clears the catalog selection
  React.useEffect(() => {
    if (gview === "graph" && !gLocked) setGnav(null);
  }, [gview, gLocked]);

  // Escape exits a locked view
  React.useEffect(() => {
    if (!gLocked) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGLocked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gLocked]);

  const gReset = () => {
    setGnav(null);
    setGfilters(new Set());
    setHidden(new Set());
    setSel(null);
    cyRef.current?.nodes().removeClass("picked");
    fit();
  };
  const saveGMark = (id: string, note: string) =>
    setGmarked((p) => ({ ...p, [id]: { note, ts: Date.now() } }));
  const closePanel = () => {
    cyRef.current?.nodes().removeClass("picked");
    setSel(null);
  };
  const toggleCollapse = (id: string, collapsed: boolean) => {
    const api = ecApiRef.current;
    const cy = cyRef.current;
    if (!cy) return;
    const node = cy.getElementById(id);
    if (api) {
      if (collapsed) api.expand(node);
      else api.collapse(node);
      // smooth re-fit after the compact/expand transition settles
      window.setTimeout(
        () =>
          cy.animate(
            { fit: { eles: cy.elements(), padding: 6 } },
            { duration: 380, easing: "ease-in-out-cubic" },
          ),
        280,
      );
    }
  };
  // chronological reconstruction following data-flow propagation
  const reconstruct = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const order = [
      ["aws"],
      ["region"],
      ["vpc"],
      ["sub_a", "sub_f"],
      ["internet"],
      ["elb1", "elb2", "alb1"],
      ["lambda_a", "lambda_f"],
      ["ec2_a", "ec2_f"],
      ["s3_1a", "s3_2a", "db_a", "s3_1f", "s3_2f", "db_f"],
      ["find_hl", "finding_box"],
    ];
    // reinitialize: expand any collapsed containers, unhide kinds, clear selection
    cy.stop();
    const api = ecApiRef.current;
    if (api) {
      try {
        api.expandAll();
      } catch {
        /* noop */
      }
    }
    setSel(null);
    setHidden(new Set());
    setToast("Replaying data-flow propagation…");
    // let expand / unhide settle, then run the clean reveal
    window.setTimeout(() => {
      cy.batch(() => cy.elements().style({ display: "element", opacity: 0 }));
      cy.fit(undefined, 6);
      let delay = 0;
      const revealed = new Set<string>();
      order.forEach((grp) => {
        window.setTimeout(() => {
          grp.forEach((id) => {
            revealed.add(id);
            cy.getElementById(id).animate(
              { style: { opacity: 1 } },
              { duration: 350 },
            );
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cy.edges().forEach((e: any) => {
            if (
              revealed.has(e.data("source")) &&
              revealed.has(e.data("target"))
            )
              e.animate({ style: { opacity: 1 } }, { duration: 350 });
          });
        }, delay);
        delay += 650;
      });
    }, 160);
  };
  const cueBtn = (active: boolean): React.CSSProperties => ({
    width: 19,
    height: 19,
    borderRadius: 4,
    border: "none",
    background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
    color: "#ffffff",
    opacity: active ? 1 : 0.4,
    cursor: active ? "pointer" : "default",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  });
  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <div
        ref={wrapRef}
        onMouseMove={onMove}
        onMouseLeave={() => setLens((l) => ({ ...l, show: false }))}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "relative",
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid var(--cg-border-card)",
          cursor: magnify ? "none" : "default",
          // section height parity with the Security Graph (fills the viewport)
          height: isFull ? "100vh" : "calc(100vh - 230px)",
          minHeight: 540,
          background: "#ffffff",
          // own stacking context so the graph chrome (toolbar/filter/menu, z<=46)
          // never fights the global top bar (search / notifications / profile)
          isolation: "isolate",
        }}
      >
        <GraphWatermark />
        <div
          ref={ref}
          style={{
            position: "relative",
            zIndex: 1, // above the background watermark, below the overlays
            height: "100%",
            width:
              gview !== "graph" || open ? `calc(100% - ${DRAWER_W}px)` : "100%",
            background: "transparent", // let the background watermark show through
            transition: "width .28s ease",
          }}
        />
        {/* top-left toolbar — Reset · Fit · Full screen (parity w/ Security Graph) */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 8,
            zIndex: 30,
          }}
        >
          <button type="button" onClick={gReset} style={graphToolBtn(false)}>
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={fit} style={graphToolBtn(false)}>
            <Maximize2 size={13} /> Fit
          </button>
          <button
            type="button"
            onClick={toggleFull}
            style={graphToolBtn(false)}
          >
            {isFull ? <Minimize size={13} /> : <Expand size={13} />}
            {isFull ? "Exit" : "Full screen"}
          </button>
        </div>

        {/* filter bar — spotlight by resource type (compact, short labels) */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 3,
            zIndex: 30,
            maxWidth: "42%",
            overflow: "hidden",
            background: CHROME.bg,
            border: "1px solid rgba(30,20,10,0.2)",
            borderRadius: 9,
            padding: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {GRAPH_KINDS.slice(0, 3).map((k) => {
            const on = gfilters.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleGFilter(k)}
                title={GKIND_LABEL[k]}
                style={{
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 6,
                  border: `1px solid ${on ? CHROME.accent : "transparent"}`,
                  background: on ? CHROME.accentBg : "transparent",
                  color: on ? CHROME.text : CHROME.muted,
                  fontSize: 11.5,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {GKIND_SHORT[k]}
              </button>
            );
          })}
          {/* more → category drawer with visibility (hide) selectors */}
          <button
            type="button"
            onClick={() => setGCatOpen(true)}
            style={{
              height: 24,
              padding: "0 8px",
              borderRadius: 6,
              border: "1px solid transparent",
              background: "transparent",
              color: CHROME.muted,
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <SlidersHorizontal size={12} /> More
          </button>
        </div>

        {/* category drawer — all resource types: spotlight filter + hide toggle */}
        {gCatOpen && (
          <>
            <div
              onClick={() => setGCatOpen(false)}
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, zIndex: 55 }}
            />
            <div
              style={{
                position: "absolute",
                top: 50,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 56,
                width: 300,
                background: CHROME.bg,
                border: "1px solid rgba(30,20,10,0.2)",
                borderRadius: 10,
                padding: 10,
                boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: CHROME.text,
                  padding: "2px 4px 8px",
                }}
              >
                Resource categories
              </div>
              {GRAPH_KINDS.map((k) => {
                const on = gfilters.has(k);
                const hiddenK = hidden.has(k);
                return (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 4px",
                      borderBottom: "1px solid rgba(30,20,10,0.07)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGFilter(k)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        height: 26,
                        padding: "0 8px",
                        borderRadius: 6,
                        border: `1px solid ${on ? CHROME.accent : "transparent"}`,
                        background: on ? CHROME.accentBg : "transparent",
                        color: on ? CHROME.text : CHROME.muted,
                        fontSize: 12.5,
                        fontWeight: on ? 600 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {GKIND_LABEL[k]}
                    </button>
                    <button
                      type="button"
                      title={hiddenK ? "Show" : "Hide"}
                      onClick={() => toggleKind(k)}
                      style={{
                        width: 30,
                        height: 26,
                        borderRadius: 6,
                        border: "1px solid rgba(30,20,10,0.2)",
                        background: "transparent",
                        color: hiddenK ? CHROME.muted : CHROME.text,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {hiddenK ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* mode toggle — Architecture · Findings · Issues */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            zIndex: 30,
            background: CHROME.bg,
            border: "1px solid rgba(30,20,10,0.2)",
            borderRadius: 8,
            padding: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {(
            [
              { id: "graph", label: "Architecture", n: 0 },
              { id: "findings", label: "Findings", n: X_FINDINGS.length },
              { id: "issues", label: "Issues", n: X_ISSUES.length },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setGview(m.id)}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: gview === m.id ? 700 : 500,
                background: gview === m.id ? CHROME.accentBg : "transparent",
                color: gview === m.id ? CHROME.accent : CHROME.muted,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {m.label}
              {m.n > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "0 5px",
                    borderRadius: 8,
                    background: gview === m.id ? CHROME.accent : CHROME.hover,
                    color: gview === m.id ? "#fff" : CHROME.muted,
                  }}
                >
                  {m.n}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* hover read-out — terminal-style, top-left under the toolbar */}
        {gHover && (
          <div
            style={{
              position: "absolute",
              top: 54,
              left: 12,
              zIndex: 30,
              minWidth: 220,
              maxWidth: 320,
              background: "rgb(23,23,22)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "10px 12px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              fontFamily:
                "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.65,
              pointerEvents: "none",
            }}
          >
            {(
              [
                ["resource", gHover.label ?? gHover.id],
                ["type", GKIND_LABEL[gHover.kind as GKind] ?? "—"],
                [
                  "finding",
                  X_FINDING_BY_NODE[gHover.id]
                    ? `${X_FINDING_BY_NODE[gHover.id].category} · ${X_FINDING_BY_NODE[gHover.id].severity}`
                    : "none",
                ],
                ["on paths", `${xIssuesForNode(gHover.id).length} issue(s)`],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div
                key={k}
                style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}
              >
                <span
                  style={{
                    color: "#7f8a84",
                    minWidth: 74,
                    display: "inline-block",
                  }}
                >
                  {k}
                </span>
                <span style={{ color: "#8a96a8" }}>:</span>
                <span
                  style={{
                    color: X_FINDING_BY_NODE[gHover.id] ? "#e8e8e2" : "#e8e8e2",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* locked-view banner — Escape to exit */}
        {gLocked && (
          <div
            style={{
              position: "absolute",
              top: 54,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 31,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px 7px 14px",
              borderRadius: 8,
              background: "rgb(23,23,22)",
              color: "#fff",
              fontSize: 12.5,
              boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
            }}
          >
            Locked · {X_NODE[gLocked]?.label ?? gLocked} · data flow
            <button
              type="button"
              onClick={() => setGLocked(null)}
              style={{
                height: 24,
                padding: "0 9px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "transparent",
                color: "#fff",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              Esc
            </button>
          </div>
        )}

        {/* right-click context menu */}
        {ctxMenu && (
          <>
            <div
              onClick={() => setCtxMenu(null)}
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, zIndex: 45 }}
            />
            <div
              style={{
                position: "absolute",
                left: ctxMenu.x + 6,
                top: ctxMenu.y + 6,
                zIndex: 46,
                width: 200,
                background: "rgb(23,23,22)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: 6,
                boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  padding: "6px 10px 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {ctxMenu.data.label ?? ctxMenu.data.id}
              </div>
              {/* finding / issue tags — clickable → open in the catalog */}
              {(X_FINDING_BY_NODE[ctxMenu.data.id] ||
                xIssuesForNode(ctxMenu.data.id).length > 0) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                    padding: "8px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {X_FINDING_BY_NODE[ctxMenu.data.id] && (
                    <button
                      type="button"
                      onClick={() => {
                        setGview("findings");
                        setGnav({
                          kind: "finding",
                          id: X_FINDING_BY_NODE[ctxMenu.data.id].id,
                        });
                        setCtxMenu(null);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        height: 22,
                        padding: "0 8px",
                        borderRadius: 11,
                        border: "1px solid #d99a0066",
                        background: "#d99a0022",
                        color: "#e5b23a",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <AlertTriangle size={10} /> Finding
                    </button>
                  )}
                  {xIssuesForNode(ctxMenu.data.id).map((iss) => (
                    <button
                      key={iss.id}
                      type="button"
                      onClick={() => {
                        setGview("issues");
                        setGnav({ kind: "issue", id: iss.id });
                        setCtxMenu(null);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        height: 22,
                        padding: "0 8px",
                        borderRadius: 11,
                        border: "1px solid rgba(91,155,240,0.5)",
                        background: "rgba(91,155,240,0.16)",
                        color: "#90bdf5",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <GitBranch size={10} /> {iss.id}
                    </button>
                  ))}
                </div>
              )}
              {[
                {
                  label: "View details",
                  icon: <Info size={14} />,
                  disabled: false,
                  on: () => {
                    const cy = cyRef.current;
                    if (cy) {
                      cy.nodes().removeClass("picked");
                      cy.getElementById(ctxMenu.data.id).addClass("picked");
                    }
                    setSel(ctxMenu.data);
                    setCtxMenu(null);
                  },
                },
                {
                  label: "Data flow",
                  icon: <GitBranch size={14} />,
                  disabled: false,
                  on: () => {
                    setGnav({ kind: "node", id: ctxMenu.data.id });
                    setCtxMenu(null);
                  },
                },
                {
                  label: "Lock the view",
                  icon: <Lock size={14} />,
                  disabled: false,
                  on: () => {
                    setGLocked(ctxMenu.data.id);
                    setCtxMenu(null);
                  },
                },
                {
                  label: "Ask agent",
                  icon: <Bot size={14} />,
                  disabled: true,
                  on: () => {},
                },
                {
                  label: "Run simulation",
                  icon: <Play size={14} />,
                  disabled: true,
                  on: () => {},
                },
                {
                  label: gmarked[ctxMenu.data.id] ? "Edit mark" : "Mark node",
                  icon: (
                    <Star
                      size={14}
                      color={gmarked[ctxMenu.data.id] ? "#f5b301" : undefined}
                      fill={gmarked[ctxMenu.data.id] ? "#f5b301" : "none"}
                    />
                  ),
                  disabled: false,
                  on: () => {
                    saveGMark(ctxMenu.data.id, "");
                    setCtxMenu(null);
                  },
                },
              ].map((it) => (
                <button
                  key={it.label}
                  type="button"
                  onClick={it.on}
                  disabled={it.disabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: "100%",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 6,
                    background: "transparent",
                    color: it.disabled ? "#6b7178" : "#dfe2e6",
                    fontSize: 12.5,
                    cursor: it.disabled ? "default" : "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(ev) => {
                    if (it.disabled) return;
                    const el = ev.currentTarget;
                    el.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(ev) => {
                    const el = ev.currentTarget;
                    el.style.background = "transparent";
                  }}
                >
                  {it.icon}
                  {it.label}
                </button>
              ))}
            </div>
          </>
        )}
        <SharedGraphNavigator
          onPan={pan}
          onZoomIn={() => zoom(1.3)}
          onZoomOut={() => zoom(1 / 1.3)}
          onFit={fit}
          zoomPct={zoomPct}
          onZoomPct={zoomTo}
          showMini={showMini}
          onToggleMini={() => setShowMini((m) => !m)}
          markedCount={Object.keys(gmarked).length}
          onOpenMarked={() => setGview("findings")}
          extra={
            <button
              type="button"
              aria-label="Replay data flow"
              onClick={reconstruct}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                border: "none",
                background: "rgb(23,23,22)",
                color: "#fff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={15} />
            </button>
          }
        />
        {/* minimap — shared frame viewer (clears the right drawer when open) */}
        {showMini && mini && mini.bb.w > 0 && (
          <GraphMinimap
            rightOffset={gview !== "graph" || open ? DRAWER_W + 12 : 12}
            frame={mini}
            dots={A_NODES.map((n) => ({
              x: n.x,
              y: n.y,
              a: n.finding ? "error" : "",
            }))}
            onJump={(gx, gy) => {
              const cy = cyRef.current;
              if (!cy) return;
              cy.animate(
                {
                  pan: {
                    x: cy.width() / 2 - gx * cy.zoom(),
                    y: cy.height() / 2 - gy * cy.zoom(),
                  },
                },
                { duration: 180 },
              );
            }}
          />
        )}
        {/* corner control: compact toggle when expanded, count badge (click=expand) when collapsed */}
        {cues.map((c) =>
          c.collapsed ? (
            <button
              key={c.id}
              type="button"
              title={`${c.count} resources — click to expand`}
              onClick={() => toggleCollapse(c.id, true)}
              style={{
                position: "absolute",
                left: c.x - 6,
                top: c.y - 14,
                minWidth: 30,
                height: 30,
                padding: "0 8px",
                borderRadius: 8,
                border: "2px solid #5a7a9b",
                background: "#1c2a3a",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                zIndex: 50,
              }}
            >
              {c.count}
            </button>
          ) : (
            <button
              key={c.id}
              type="button"
              title="Compact"
              onClick={() => toggleCollapse(c.id, false)}
              style={{
                ...cueBtn(true),
                position: "absolute",
                left: c.x - 21,
                top: c.y + 7,
                width: 15,
                height: 15,
                borderRadius: 3,
                zIndex: 50,
              }}
            >
              <Minimize2 size={9} />
            </button>
          ),
        )}
        <XNodeDrawer
          node={sel}
          marked={!!(sel && gmarked[sel.id])}
          onClose={closePanel}
          onDataflow={(id) => setGnav({ kind: "node", id })}
          onMark={(id) => saveGMark(id, "")}
        />
        {(gview === "findings" || gview === "issues") && (
          <XCatalogDrawer
            mode={gview}
            onClose={() => setGview("graph")}
            onPick={setGnav}
            onOpenNode={(nodeId) => {
              const n = X_NODE[nodeId];
              if (n) setSel(n);
              setGnav({ kind: "node", id: nodeId });
            }}
          />
        )}
      </div>
      {/* magnifier lens — a live cytoscape view, follows the cursor while active */}
      <div
        ref={lensHostRef}
        style={{
          position: "fixed",
          left: lens.x - 75,
          top: lens.y - 75,
          width: 150,
          height: 150,
          background: "#ffffff",
          borderRadius: "50%",
          border: "2px solid rgba(23,23,22,0.9)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
          overflow: "hidden",
          pointerEvents: "none",
          opacity: magnify && lens.show ? 1 : 0,
          transition: "opacity .12s ease",
          zIndex: 9999,
        }}
      />
      {/* magnifier active hint */}
      {magnify ? (
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            borderRadius: 8,
            background: "rgb(23,23,22)",
            color: "#fff",
            fontSize: 12,
            zIndex: 30,
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          }}
        >
          <Search size={13} />
          Magnifier on — move to inspect ·{" "}
          <kbd
            style={{
              background: "rgba(255,255,255,0.14)",
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            Esc
          </kbd>{" "}
          to exit
        </div>
      ) : null}
    </div>
  );
}

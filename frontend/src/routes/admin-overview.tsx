/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define -- CloudGuard Global Overview (§5) */
import { useNavigate } from "react-router";
import {
  Plus,
  UserPlus,
  FileWarning,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useOverview } from "#/hooks/query/use-cloudguard";
import {
  Page,
  PageHeader,
  PostureCard,
  PostureGrid,
  HeaderButton,
  RefreshControl,
  Card,
  T,
} from "#/components/admin/admin-kit";
import { useWorkspaces } from "#/components/admin/workspace-context";

const PENDING = "—";

interface Attn {
  label: string;
  detail: string;
  tone: "warn" | "danger";
  to: string;
  cta: string;
}

export default function AdminOverview() {
  const overview = useOverview();
  const { workspaces } = useWorkspaces();
  const navigate = useNavigate();
  const o = overview.data;

  const attn: Attn[] = [];
  if (o) {
    if (o.pending_approvals > 0)
      attn.push({
        label: `${o.pending_approvals} approval${o.pending_approvals === 1 ? "" : "s"} awaiting decision`,
        detail: "Agent actions are paused until a human decides.",
        tone: "warn",
        to: "/admin/runtime-governance",
        cta: "Review approvals",
      });
    if (o.violations > 0)
      attn.push({
        label: `${o.violations} security violation${o.violations === 1 ? "" : "s"}`,
        detail: "Policy-denied or blocked actions in the audit trail.",
        tone: "danger",
        to: "/admin/audit",
        cta: "Investigate",
      });
    if (o.audit && !o.audit.ok)
      attn.push({
        label: "Audit chain integrity broken",
        detail: "The tamper-evident hash chain failed verification.",
        tone: "danger",
        to: "/admin/audit",
        cta: "Open ledger",
      });
    if (o.tenancy && !o.tenancy.strict)
      attn.push({
        label: "Tenant isolation is not strict",
        detail: "Unattributed requests are not failing closed.",
        tone: "warn",
        to: "/admin/security",
        cta: "Review",
      });
  }

  return (
    <Page>
      <PageHeader
        title="Global Overview"
        subtitle="Organization-wide posture across all workspaces."
        actions={
          <>
            <RefreshControl
              onRefresh={() => overview.refetch()}
              isFetching={overview.isFetching}
              updatedAt={overview.dataUpdatedAt}
            />
            <HeaderButton
              icon={<UserPlus size={14} />}
              onClick={() => navigate("/admin/identity")}
            >
              Invite admin
            </HeaderButton>
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces")}
            >
              Create workspace
            </HeaderButton>
          </>
        }
      />

      {/* Needs attention — what a manager opens this page to find */}
      <Card
        title="Needs attention"
        desc="Prioritized items that require an administrator."
      >
        {attn.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 0",
              color: T.textNav,
              fontSize: 13,
            }}
          >
            <CheckCircle2 size={18} color={T.success} />
            All clear — no approvals, violations or integrity issues need you
            right now.
          </div>
        ) : (
          attn.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => navigate(a.to)}
              className="cg-row"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 4px",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FileWarning
                size={17}
                color={a.tone === "danger" ? T.danger : T.warning}
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: T.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  {a.label}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  {a.detail}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: T.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  flexShrink: 0,
                }}
              >
                {a.cta} <ChevronRight size={14} />
              </span>
            </button>
          ))
        )}
      </Card>

      <div style={{ marginTop: 10, marginBottom: 14 }}>
        <SectionLabel>Organization &amp; runtime</SectionLabel>
      </div>
      <PostureGrid>
        <PostureCard
          title="Workspaces"
          value={workspaces.length || PENDING}
          sub="accessible to you"
          tone="ok"
          to="/admin/workspaces"
          cta="Manage workspaces"
        />
        <PostureCard
          title="Active runs"
          value={o ? o.active_runs : PENDING}
          sub={o ? "live agent activity" : "loading…"}
          tone={(o?.active_runs ?? 0) > 0 ? "warn" : "muted"}
        />
        <PostureCard
          title="Pending approvals"
          value={o ? o.pending_approvals : PENDING}
          sub={o && o.pending_approvals > 0 ? "awaiting decision" : "none"}
          tone={o && o.pending_approvals > 0 ? "warn" : "ok"}
          to="/admin/runtime-governance"
          cta="Review"
        />
        <PostureCard
          title="Security violations"
          value={o ? o.violations : PENDING}
          sub="policy-denied / blocked"
          tone={o && o.violations > 0 ? "danger" : "ok"}
          to="/admin/audit"
          cta="Audit trail"
        />
      </PostureGrid>

      <div style={{ marginTop: 28, marginBottom: 14 }}>
        <SectionLabel>Integrity &amp; platform</SectionLabel>
      </div>
      <PostureGrid>
        <PostureCard
          title="Audit chain"
          value={o ? (o.audit.ok ? "Intact" : "Broken") : PENDING}
          sub={o ? `${o.audit.count} entries · tamper-evident` : "loading…"}
          tone={o ? (o.audit.ok ? "ok" : "danger") : "muted"}
          to="/admin/audit"
          cta="Open ledger"
        />
        <PostureCard
          title="Tenant isolation"
          value={
            o
              ? o.tenancy.strict
                ? "Strict"
                : o.tenancy.enabled
                  ? "On"
                  : "Off"
              : PENDING
          }
          sub="fail-closed boundary"
          tone={o && o.tenancy.strict ? "ok" : "warn"}
          to="/admin/security"
          cta="Security & data"
        />
        <PostureCard
          title="Compliance"
          value={PENDING}
          sub="enterprise rollup — pending backend"
          tone="muted"
          to="/admin/compliance"
          cta="Compliance center"
        />
        <PostureCard
          title="Capacity &amp; cost"
          value={PENDING}
          sub="enterprise rollup — pending backend"
          tone="muted"
          to="/admin/capacity"
          cta="Capacity & billing"
        />
      </PostureGrid>
    </Page>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: T.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </div>
  );
}

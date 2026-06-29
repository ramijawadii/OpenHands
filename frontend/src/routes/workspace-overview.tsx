/* eslint-disable i18next/no-literal-string, no-nested-ternary -- CloudGuard Workspace Overview (§20) */
import { useOverview } from "#/hooks/query/use-cloudguard";
import {
  Page,
  PageHeader,
  PostureCard,
  PostureGrid,
  ScopeBadge,
  T,
} from "#/components/admin/admin-kit";
import { useActiveWorkspace } from "#/components/admin/workspace-context";

const PENDING = "—";

/**
 * Workspace Overview — §20. Scoped to the active workspace. Live panels read the tenant-scoped
 * overview endpoint (the workspace == the resolved tenant, Batch 2 F1); panels needing per-workspace
 * stores not yet built render an honest `—`.
 */
export default function WorkspaceOverview() {
  const ws = useActiveWorkspace();
  const overview = useOverview();
  const o = overview.data;

  return (
    <Page>
      <PageHeader
        title={ws?.name ? `${ws.name} — Overview` : "Workspace Overview"}
        subtitle="Identity, runtime, security and capacity for this workspace."
        actions={<ScopeBadge scope="This workspace" />}
      />

      <PostureGrid>
        <PostureCard
          title="Workspace ID"
          value={
            <span style={{ fontSize: 14, wordBreak: "break-all" }}>
              {ws?.id ?? PENDING}
            </span>
          }
          sub="isolated tenant boundary"
          tone="ok"
        />
        <PostureCard
          title="Active runs"
          value={o ? o.active_runs : PENDING}
          sub={o ? "in this workspace" : "loading…"}
          tone={(o?.active_runs ?? 0) > 0 ? "warn" : "muted"}
          to={ws ? `/workspace/${ws.id}/agents` : undefined}
          cta={ws ? "Agents & workflows" : undefined}
        />
        <PostureCard
          title="Pending approvals"
          value={o ? o.pending_approvals : PENDING}
          sub={o && o.pending_approvals > 0 ? "awaiting decision" : "none"}
          tone={o && o.pending_approvals > 0 ? "warn" : "ok"}
          to={ws ? `/workspace/${ws.id}/governance` : undefined}
          cta={ws ? "Runtime governance" : undefined}
        />
        <PostureCard
          title="Security violations"
          value={o ? o.violations : PENDING}
          sub="policy-denied / blocked"
          tone={o && o.violations > 0 ? "danger" : "ok"}
        />
        <PostureCard
          title="Audit chain"
          value={o ? (o.audit.ok ? "Intact" : "Broken") : PENDING}
          sub={o ? `${o.audit.count} entries` : "loading…"}
          tone={o ? (o.audit.ok ? "ok" : "danger") : "muted"}
          to={ws ? `/workspace/${ws.id}/audit` : undefined}
          cta={ws ? "Audit trail" : undefined}
        />
        <PostureCard
          title="Compliance"
          value={PENDING}
          sub="per-workspace rollup — pending backend"
          tone="muted"
          to={ws ? `/workspace/${ws.id}/compliance` : undefined}
          cta={ws ? "Compliance" : undefined}
        />
      </PostureGrid>

      <div
        style={{
          marginTop: 24,
          fontSize: 11.5,
          color: T.textMuted,
          borderTop: `1px solid ${T.border}`,
          paddingTop: 14,
        }}
      >
        This workspace maps 1:1 to the resolved tenant; isolation, audit and
        crypto are served by the kept multi-tenant substrate
        (01_REMOVAL_AND_REBUILD).
      </div>
    </Page>
  );
}

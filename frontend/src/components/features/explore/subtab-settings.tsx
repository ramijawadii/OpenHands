/* eslint-disable i18next/no-literal-string -- CloudGuard sub-tab settings */
import React from "react";
import {
  Plug,
  CalendarClock,
  Database,
  UserCog,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import {
  useCurrentRole,
  roleMeets,
} from "#/components/features/settings/settings-kit";
import { SampleBanner } from "#/components/admin/admin-kit";

/**
 * Sub-tab Settings — configuration of the DATA BEHIND a sub-tab.
 *
 * Scope is deliberately the sub-tab (L2), not a capability (L3): a sub-tab is
 * the engine + its connectors, and everything here (which accounts are scanned,
 * how often, how long results are kept) is identical for every capability that
 * reads from it. That is why it sits at the sub-tab's own level in the URL
 * (`/explore/<domain>/<sub-tab>/settings`) rather than as an L4 view — position
 * matches scope.
 *
 * Capability-scoped tuning (which detections are on, thresholds, suppressions)
 * belongs to the `Policy` view instead, and is intentionally NOT duplicated
 * here.
 */

const CARD: React.CSSProperties = {
  border: "1px solid var(--cg-border-card)",
  borderRadius: 10,
  padding: "14px 16px",
  background: "var(--cg-bg-card)",
};

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <section style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Icon size={15} />
        <h2
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
          }}
        >
          {title}
        </h2>
      </div>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "var(--cg-text-muted)",
        }}
      >
        {desc}
      </p>
      {children}
    </section>
  );
}

export function SubTabSettings({
  domainLabel,
  subtabLabel,
}: {
  domainLabel: string;
  subtabLabel: string;
}) {
  const role = useCurrentRole();
  // Thresholds and connectors change what the WHOLE tenant sees, so editing is
  // an administrative act. Analysts get the same page read-only rather than a
  // hidden one — visibility of configuration is itself useful during triage.
  const canEdit = roleMeets(role, "Admin");

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ marginBottom: 14 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {subtabLabel} — Settings
        </h1>
        <div
          style={{
            marginTop: 3,
            fontSize: 12.5,
            color: "var(--cg-text-muted)",
          }}
        >
          Configuration for the data behind every {subtabLabel} capability in{" "}
          {domainLabel}. Detection tuning for a single capability lives in that
          capability&apos;s Policy view.
        </div>
      </div>

      {!canEdit && (
        <div
          role="status"
          style={{
            ...CARD,
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 12,
            padding: "10px 14px",
            fontSize: 12.5,
            color: "var(--cg-text-muted)",
          }}
        >
          <Lock size={14} />
          Read-only — these settings change results for the whole tenant, so
          only an administrator can edit them. You are signed in as {role}.
        </div>
      )}

      <SampleBanner what={`${subtabLabel} settings`} />

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          marginTop: 12,
        }}
      >
        <Section
          icon={Plug}
          title="Connected sources"
          desc="Cloud accounts, subscriptions and projects this sub-tab reads from. Removing a source removes its findings everywhere in the sub-tab."
        />
        <Section
          icon={CalendarClock}
          title="Collection schedule"
          desc="How often the engine re-scans, and the maintenance windows it must avoid. Applies to every capability in this sub-tab."
        />
        <Section
          icon={Database}
          title="Retention"
          desc="How long findings, evidence and history are kept before archival — bounded by the tenant's data-residency policy."
        />
        <Section
          icon={UserCog}
          title="Ownership & routing"
          desc="The owning team for this sub-tab, and where its alerts are delivered (ticketing, chat, SIEM)."
        />
        <Section
          icon={SlidersHorizontal}
          title="Scope & exclusions"
          desc="Accounts, regions, tags and resource types excluded from collection. Exclusions here hide data from all capabilities below."
        />
      </div>
    </div>
  );
}

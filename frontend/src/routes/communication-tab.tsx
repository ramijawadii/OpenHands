/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  Bell,
  ShieldCheck,
  Send,
  Mail,
  MessageSquare,
  Webhook,
  Ticket,
  Plus,
  Check,
} from "lucide-react";
import { cn } from "#/utils/utils";

/** Communication — how this conversation reaches humans and downstream systems:
 *  inbound approvals the agent is waiting on, and outbound channels/updates.
 *
 *  The channel catalog below is presentation-only scaffolding (clearly tagged
 *  "Sample") until the notification backend is wired to this surface — the same
 *  pattern the Data Connector view uses. Approvals are the real integration
 *  point and are called out as such rather than faked as live data.
 */

type View = "approvals" | "channels" | "activity";

const VIEWS: {
  id: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "channels", label: "Channels", icon: Send },
  { id: "activity", label: "Activity", icon: Bell },
];

type Channel = {
  name: string;
  kind: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
  tone: string;
};

const CHANNELS: Channel[] = [
  {
    name: "Email",
    kind: "digest + alerts",
    icon: Mail,
    connected: false,
    tone: "text-sky-400",
  },
  {
    name: "Slack",
    kind: "channel notifications",
    icon: MessageSquare,
    connected: false,
    tone: "text-violet-400",
  },
  {
    name: "Webhook",
    kind: "machine-to-machine",
    icon: Webhook,
    connected: false,
    tone: "text-emerald-400",
  },
  {
    name: "Ticketing",
    kind: "Jira / ServiceNow",
    icon: Ticket,
    connected: false,
    tone: "text-amber-400",
  },
];

function SampleBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-accent-purple-bg)] px-3 py-1.5 text-[11px] text-[var(--cg-text-nav)]">
      <span className="rounded bg-[var(--cg-bg-badge)] px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
        Sample
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function ApprovalsView() {
  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-3 py-3">
      <p className="mb-3 text-[11px] text-[var(--cg-text-muted)]">
        Actions the agent has paused on, waiting for a human decision. Approvals
        are signed and recorded in the audit chain.
      </p>
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] py-10 text-center">
        <ShieldCheck className="h-8 w-8 opacity-30" />
        <p className="text-[12px] text-[var(--cg-text-muted)]">
          No pending approvals.
        </p>
        <p className="max-w-xs text-[11px] text-[var(--cg-text-muted)]">
          When the agent proposes a gated action, it appears here and in the
          chat banner until you approve or reject it.
        </p>
      </div>
    </div>
  );
}

function ChannelsView() {
  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-3 py-3">
      <SampleBanner>
        Channel catalog — not yet wired to the notification backend.
      </SampleBanner>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {CHANNELS.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-1.5"
          >
            <c.icon className={cn("h-3.5 w-3.5 shrink-0", c.tone)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-[var(--cg-text-primary)]">
                {c.name}
              </p>
              <p className="truncate text-[10.5px] text-[var(--cg-text-muted)]">
                {c.kind}
              </p>
            </div>
            {c.connected ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                <Check className="h-3 w-3" />
                connected
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] px-2 py-0.5 text-[10.5px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]"
              >
                <Plus className="h-3 w-3" />
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityView() {
  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-3 py-3">
      <p className="mb-3 text-[11px] text-[var(--cg-text-muted)]">
        Outbound messages sent from this conversation — who was notified, when,
        and through which channel.
      </p>
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] py-10 text-center">
        <Bell className="h-8 w-8 opacity-30" />
        <p className="text-[12px] text-[var(--cg-text-muted)]">
          Nothing sent yet.
        </p>
      </div>
    </div>
  );
}

function CommunicationTab() {
  const [view, setView] = React.useState<View>("approvals");

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--cg-bg-page)]">
      <div className="flex items-center gap-1 border-b border-[var(--cg-border-subtle)] px-3 py-1.5">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-colors",
              view === id
                ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
                : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {view === "approvals" && <ApprovalsView />}
        {view === "channels" && <ChannelsView />}
        {view === "activity" && <ActivityView />}
      </div>
    </div>
  );
}

export default CommunicationTab;

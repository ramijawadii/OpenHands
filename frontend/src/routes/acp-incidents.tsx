/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, @typescript-eslint/no-unused-vars, react/jsx-key, unused-imports/no-unused-imports -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  Breadcrumb,
  FilterBar,
  FSelect,
  ExportBtn,
  SubTabs,
  Card,
  H2,
  Badge,
  Sev,
  Hash,
  Table,
  mono,
  primaryBtn,
} from "#/components/features/acp/acp-ui";
import { ConfirmButton } from "#/components/features/settings/settings-kit";
import { useIncidents, useCreateIncident } from "#/hooks/query/use-cloudguard";
import type { CGIncident } from "#/api/cloudguard-service";

const rel = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
const mapInc = (c: CGIncident): Inc => ({
  id: c.id,
  sev: c.severity,
  title: c.title,
  status: c.status,
  type: c.type,
  owner: c.owner || "Unassigned",
  runs: c.linked_runs,
  viol: c.linked_violations,
  created: rel(c.created_at),
  updated: rel(c.updated_at),
});

interface Inc {
  id: string;
  sev: string;
  title: string;
  status: string;
  type: string;
  owner: string;
  runs: string[];
  viol: number;
  created: string;
  updated: string;
}
const INCIDENTS: Inc[] = [
  {
    id: "INC-0042",
    sev: "Critical",
    title: "Unauthorized IAM privilege escalation attempt — prod-aws-east",
    status: "Open",
    type: "Unauthorized Action",
    owner: "alice@acme",
    runs: ["run-8f3a2c"],
    viol: 3,
    created: "2h ago",
    updated: "14m ago",
  },
  {
    id: "INC-0041",
    sev: "Medium",
    title: "Sandbox egress attempts to unknown host",
    status: "Investigating",
    type: "Policy Violation Cluster",
    owner: "rami@acme",
    runs: ["run-8f3a2c"],
    viol: 2,
    created: "2h ago",
    updated: "1h ago",
  },
  {
    id: "INC-0039",
    sev: "High",
    title: "Public S3 bucket created (cloud drift)",
    status: "Resolved",
    type: "External Compromise",
    owner: "sam@acme",
    runs: [],
    viol: 1,
    created: "yesterday",
    updated: "yesterday",
  },
];
const TIMELINE = [
  {
    t: "2025-01-14T02:14:24Z",
    type: "policy violation",
    e: "Blocked iam:PutRolePolicy on payments-deployer",
    a: "run-8f3a2c",
    tone: "ok",
  },
  {
    t: "2025-01-14T02:14:25Z",
    type: "system event",
    e: "Auto-incident opened (INC-0042) · severity Critical",
    a: "system",
    tone: "warn",
  },
  {
    t: "2025-01-14T02:15:01Z",
    type: "manual action",
    e: "Run paused; sandbox sess-3f9b1c session revoked",
    a: "alice@acme",
    tone: "ok",
  },
  {
    t: "2025-01-14T02:16:10Z",
    type: "manual action",
    e: "alice@acme acknowledged · began investigation",
    a: "alice@acme",
    tone: "info",
  },
];

export default function AcpIncidents() {
  const [sel, setSel] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("Timeline");
  const [q, setQ] = React.useState("");
  const incidentsQ = useIncidents();
  const createInc = useCreateIncident();
  const usingReal = !!incidentsQ.data && !incidentsQ.isError;
  const realList = incidentsQ.data ?? [];
  const source = usingReal ? realList.map(mapInc) : INCIDENTS;
  const realSel = usingReal ? realList.find((i) => i.id === sel) : undefined;
  const timeline = realSel
    ? realSel.timeline.map((e) => ({
        t: e.ts,
        type: e.type,
        e: e.event,
        a: e.actor,
        tone: "info",
      }))
    : TIMELINE;
  const inc = source.find((i) => i.id === sel);

  if (!inc) {
    const rows = source.filter(
      (i) => !q || `${i.id} ${i.title}`.toLowerCase().includes(q.toLowerCase()),
    );
    return (
      <div style={{ padding: "32px 40px", maxWidth: 1160 }}>
        <Breadcrumb
          items={[{ label: "Agent Control Plane" }, { label: "Incidents" }]}
        />
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: A.textPrimary,
            margin: "0 0 14px",
          }}
        >
          Incidents
        </h1>
        <FilterBar
          placeholder="Search by incident ID, title, run ID…"
          search={q}
          onSearch={setQ}
          right={
            <>
              <ExportBtn />
              <button
                type="button"
                style={primaryBtn}
                onClick={() =>
                  createInc.mutate({
                    title: "New incident (from console)",
                    severity: "Medium",
                    type: "Manual",
                    owner: "",
                  })
                }
              >
                + New Incident
              </button>
            </>
          }
        >
          <FSelect
            value=""
            onChange={() => {}}
            all="Open + Active"
            options={[
              "Open",
              "Contained",
              "Investigating",
              "Resolved",
              "Closed",
            ]}
          />
          <FSelect
            value=""
            onChange={() => {}}
            all="All Types"
            options={[
              "Unauthorized Action",
              "Policy Violation Cluster",
              "Anomaly",
              "Agent Misbehavior",
              "External Compromise",
            ]}
          />
        </FilterBar>
        <div
          className="cg-tablewrap"
          style={{ borderRadius: 8, border: `1px solid ${A.border}` }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "100px 2fr 90px 120px 160px 110px 110px 90px",
              padding: "8px 16px",
              borderBottom: `1px solid ${A.border}`,
            }}
          >
            {[
              "Incident",
              "Title",
              "Severity",
              "Status",
              "Type",
              "Owner",
              "Linked",
              "Updated",
            ].map((c) => (
              <span
                key={c}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: A.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {c}
              </span>
            ))}
          </div>
          {rows.map((i, idx) => (
            <div
              key={i.id}
              className="cg-row"
              onClick={() => {
                setSel(i.id);
                setTab("Timeline");
              }}
              title="Open incident"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "100px 2fr 90px 120px 160px 110px 110px 90px",
                padding: "11px 16px",
                borderBottom:
                  idx < rows.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Hash h={i.id} link />
              <span
                style={{
                  fontSize: 13,
                  color: A.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {i.title}
              </span>
              <Sev s={i.sev} />
              <Badge
                text={i.status}
                tone={
                  i.status === "Resolved"
                    ? "ok"
                    : i.status === "Open"
                      ? "danger"
                      : "warn"
                }
              />
              <span
                style={{
                  fontSize: 12,
                  color: A.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {i.type}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: i.owner === "Unassigned" ? A.danger : A.textSecondary,
                }}
              >
                {i.owner}
              </span>
              <span style={{ fontSize: 12, color: A.textMuted }}>
                {i.runs.length ? <Hash h={i.runs[0]} link /> : "—"} · {i.viol}{" "}
                viol
              </span>
              <span style={{ fontSize: 12, color: A.textMuted }}>
                {i.updated}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1160 }}>
      <Breadcrumb
        items={[
          { label: "Agent Control Plane" },
          { label: "Incidents", onClick: () => setSel(null) },
          { label: inc.id },
        ]}
        status={
          <Badge
            text={`${inc.status} · ${inc.sev.toLowerCase()}`}
            tone={inc.status === "Resolved" ? "ok" : "danger"}
          />
        }
      />
      <div
        style={{
          background: A.cardBg,
          border: `1px solid ${A.border}`,
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <Hash h={inc.id} />
          <Badge
            text={inc.status}
            tone={inc.status === "Resolved" ? "ok" : "danger"}
          />
          <Sev s={inc.sev} />
        </div>
        <div
          style={{
            fontSize: 14,
            color: A.textPrimary,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          {inc.title}
        </div>
        <div style={{ fontSize: 12.5, color: A.textMuted, marginBottom: 12 }}>
          Owner: {inc.owner} · Created {inc.created} · Updated {inc.updated}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            "Assign Owner",
            "Escalate",
            "Contain Agent",
            "Close Incident",
            "Create Postmortem",
          ].map((b) => (
            <button
              key={b}
              type="button"
              style={{
                height: 30,
                padding: "0 12px",
                borderRadius: 6,
                background: A.cardBg,
                border: `1px solid ${A.borderStrong}`,
                color: A.textSecondary,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {b}
            </button>
          ))}
          <ExportBtn label="Export IR Package" />
        </div>
      </div>
      <SubTabs
        tabs={["Timeline", "Containment", "Rollbacks", "Postmortem"]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Timeline" && (
        <>
          <FilterBar placeholder="Search events…" search={q} onSearch={setQ}>
            <FSelect
              value=""
              onChange={() => {}}
              all="All Events"
              options={[
                "Agent Events",
                "Policy Violations",
                "Cloud Changes",
                "Anomalies",
                "Manual Actions",
                "System Events",
              ]}
            />
          </FilterBar>
          <div
            style={{
              borderLeft: `2px solid ${A.border}`,
              marginLeft: 6,
              paddingLeft: 18,
            }}
          >
            {timeline.map((e, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 16 }}>
                <span
                  style={{
                    position: "absolute",
                    left: -25,
                    top: 3,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background:
                      e.tone === "warn"
                        ? A.warning
                        : e.tone === "info"
                          ? A.accent
                          : A.success,
                  }}
                />
                <div style={{ fontSize: 11, color: A.textMuted, ...mono }}>
                  {e.t} · {e.type}
                </div>
                <div
                  style={{ fontSize: 13, color: A.textSecondary, marginTop: 1 }}
                >
                  {e.e} <span style={{ color: A.textMuted }}>— {e.a}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            style={{
              marginTop: 8,
              height: 30,
              padding: "0 12px",
              borderRadius: 6,
              background: A.cardBg,
              border: `1px solid ${A.borderStrong}`,
              color: A.textSecondary,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            + Add note
          </button>
        </>
      )}
      {tab === "Containment" && (
        <Card style={{ maxWidth: 720 }}>
          <H2 sub="Currently contained: run paused · 1 sandbox revoked.">
            Containment actions
          </H2>
          {[
            ["Kill agent", "Run-scoped", true],
            ["Isolate sandbox", "sess-3f9b1c", true],
            ["Revoke credentials", "aws-audit-role", true],
            ["Freeze workspace", "prod-aws-east", false],
          ].map(([t, d, done], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--cg-border-subtle)",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, color: A.textSecondary }}>
                  {t as string}
                </div>
                <div style={{ fontSize: 12, color: A.textMuted }}>
                  {d as string}
                </div>
              </div>
              {done ? (
                <Badge text="Active" tone="ok" />
              ) : (
                <ConfirmButton
                  variant="ghost"
                  label={t as string}
                  title={`${t}?`}
                  body="Requires a reason; logged to the audit ledger linked to this incident."
                  confirmLabel="Confirm"
                  onConfirm={() => {}}
                />
              )}
            </div>
          ))}
        </Card>
      )}
      {tab === "Rollbacks" && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: A.textMuted }}>
            ℹ Rollbacks are irreversible and generate their own audit entries.
          </div>
          <Table
            grid="100px 110px 70px 1.4fr 1.4fr 90px 120px 110px"
            cols={[
              "Change",
              "Run",
              "Svc",
              "Resource",
              "Description",
              "Risk",
              "Rollback status",
              "",
            ]}
            rows={[
              [
                <Hash h="change-46990" link />,
                <Hash h="run-4e6f10" link />,
                "iam",
                <span style={mono}>payments-deployer</span>,
                "Removed ec2:*",
                <Sev s="Low" />,
                <Badge text="Eligible" tone="info" />,
                <ConfirmButton
                  variant="link"
                  label="Rollback"
                  title="Roll back this change?"
                  body="Restores the previous IAM policy from the staged diff."
                  confirmLabel="Rollback"
                  onConfirm={() => {}}
                />,
              ],
              [
                <Hash h="change-46985" link />,
                <Hash h="run-4e6f10" link />,
                "iam",
                <span style={mono}>AKIA…7E</span>,
                "Rotated access key",
                <Sev s="Medium" />,
                <Badge text="Not eligible" tone="muted" />,
                <span style={{ fontSize: 12, color: A.textMuted }}>—</span>,
              ],
            ]}
          />
        </>
      )}
      {tab === "Postmortem" && (
        <Card style={{ maxWidth: 800 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <H2>Postmortem</H2>
            <Badge text="Draft" tone="muted" />
          </div>
          <div
            style={{ fontSize: 13, color: A.textSecondary, lineHeight: 1.8 }}
          >
            <p style={{ margin: "0 0 10px" }}>
              <strong>Summary:</strong> Agent proposed widening{" "}
              <span style={mono}>payments-deployer</span> with{" "}
              <span style={mono}>s3:*</span> from stale context. The IAM-write
              gate blocked execution; no change applied.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Root cause:</strong> Context cache served a 6h-old IAM
              snapshot; the planner over-scoped.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Detection:</strong> Auto-incident on policy block · MTTD
              &lt; 1s.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Action items:</strong> shorten IAM context TTL; add
              least-privilege lint to planner; keep IAM-write gate mandatory.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[
              "Save draft",
              "Submit for review",
              "Export PDF",
              "Export Markdown",
            ].map((b) => (
              <button
                key={b}
                type="button"
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 6,
                  background: A.cardBg,
                  border: `1px solid ${A.borderStrong}`,
                  color: A.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

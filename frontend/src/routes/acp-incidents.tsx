/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, @typescript-eslint/no-unused-vars, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  PageHeader,
  SubTabs,
  Card,
  H2,
  Badge,
  Sev,
  Table,
  mono,
} from "#/components/features/acp/acp-ui";
import { ConfirmButton } from "#/components/features/settings/settings-kit";

const INCIDENTS = [
  {
    id: "INC-204",
    sev: "Critical",
    title: "Agent attempted IAM widening on prod-payments",
    status: "Contained",
    run: "run_8c2f",
    opened: "12m ago",
    owner: "Jana Doe",
  },
  {
    id: "INC-203",
    sev: "Medium",
    title: "Sandbox egress attempts to unknown host",
    status: "Investigating",
    run: "sbx_7f3c",
    opened: "2h ago",
    owner: "Rami Sentinel",
  },
  {
    id: "INC-201",
    sev: "High",
    title: "Public S3 bucket created (cloud drift)",
    status: "Resolved",
    run: "—",
    opened: "yesterday",
    owner: "Sam Okoye",
  },
];

const TIMELINE = [
  {
    t: "12:04:24",
    e: "Policy blocked iam:PutRolePolicy on payments-deployer",
    tone: "ok",
  },
  {
    t: "12:04:25",
    e: "Auto-incident opened (INC-204) · severity Critical",
    tone: "warn",
  },
  {
    t: "12:05:01",
    e: "Run run_8c2f paused; sandbox sbx_7f3c session revoked",
    tone: "ok",
  },
  {
    t: "12:06:10",
    e: "Jana Doe acknowledged · began investigation",
    tone: "info",
  },
  {
    t: "12:09:40",
    e: "Confirmed: over-broad plan from stale context; no change applied",
    tone: "ok",
  },
];

export default function AcpIncidents() {
  const [sel, setSel] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("Investigation timeline");
  const inc = INCIDENTS.find((i) => i.id === sel);

  if (!inc) {
    return (
      <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
        <PageHeader
          title="Incidents"
          sub="When the agent misbehaves or cloud drift is detected, an incident is opened with a defined response path — contain, roll back, learn."
        />
        <div
          className="cg-tablewrap"
          style={{ borderRadius: 8, border: `1px solid ${A.border}` }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "90px 90px 2.2fr 130px 100px 90px 1fr",
              padding: "8px 16px",
              borderBottom: `1px solid ${A.border}`,
            }}
          >
            {[
              "ID",
              "Severity",
              "Title",
              "Status",
              "Source",
              "Opened",
              "Owner",
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
          {INCIDENTS.map((i, idx) => (
            <div
              key={i.id}
              className="cg-row"
              onClick={() => {
                setSel(i.id);
                setTab("Investigation timeline");
              }}
              title="Open incident"
              style={{
                display: "grid",
                gridTemplateColumns: "90px 90px 2.2fr 130px 100px 90px 1fr",
                padding: "11px 16px",
                borderBottom:
                  idx < INCIDENTS.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ ...mono, fontSize: 12.5, color: A.accent }}>
                {i.id}
              </span>
              <Sev s={i.sev} />
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
              <Badge
                text={i.status}
                tone={
                  i.status === "Resolved"
                    ? "ok"
                    : i.status === "Contained"
                      ? "info"
                      : "warn"
                }
              />
              <span style={{ ...mono, fontSize: 12, color: A.textMuted }}>
                {i.run}
              </span>
              <span style={{ fontSize: 12, color: A.textMuted }}>
                {i.opened}
              </span>
              <span style={{ fontSize: 12.5, color: A.textSecondary }}>
                {i.owner}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
      <button
        type="button"
        onClick={() => setSel(null)}
        style={{
          background: "none",
          border: "none",
          color: A.textMuted,
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginBottom: 12,
        }}
      >
        ← All incidents
      </button>
      <PageHeader
        title={`${inc.id} · ${inc.title}`}
        sub={`Severity ${inc.sev} · ${inc.status} · owner ${inc.owner} · opened ${inc.opened}`}
        right={
          <Badge
            text={inc.status}
            tone={inc.status === "Resolved" ? "ok" : "info"}
          />
        }
      />
      <SubTabs
        tabs={[
          "Investigation timeline",
          "Containment",
          "Rollbacks",
          "Postmortem",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Investigation timeline" && (
        <div
          style={{
            borderLeft: `2px solid ${A.border}`,
            marginLeft: 6,
            paddingLeft: 18,
          }}
        >
          {TIMELINE.map((e, i) => (
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
                {e.t}
              </div>
              <div
                style={{ fontSize: 13, color: A.textSecondary, marginTop: 1 }}
              >
                {e.e}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "Containment" && (
        <Card style={{ maxWidth: 640 }}>
          <H2 sub="Actions taken — and available — to contain this incident.">
            Containment actions
          </H2>
          {[
            ["Run paused", "run_8c2f halted", true],
            ["Sandbox revoked", "sbx_7f3c credentials destroyed", true],
            ["Freeze workspace", "Production Cloud", false],
            ["Revoke service account", "ci-scanner", false],
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
                <Badge text="Done ✓" tone="ok" />
              ) : (
                <ConfirmButton
                  variant="ghost"
                  label={t as string}
                  title={`${t}?`}
                  body="This containment action is logged to the audit ledger."
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
            Agent changes are staged through the write-broker, so they can be
            reverted with a verified diff.
          </div>
          <Table
            grid="1.6fr 1.4fr 100px 110px"
            cols={["Change", "Resource", "Status", ""]}
            rows={[
              [
                "Removed ec2:* from payments-deployer",
                "IAM role",
                <Badge text="Applied" tone="info" />,
                <ConfirmButton
                  variant="link"
                  label="Roll back"
                  title="Roll back this change?"
                  body="Restores the previous IAM policy from the staged diff."
                  confirmLabel="Roll back"
                  onConfirm={() => {}}
                />,
              ],
              [
                "Rotated access key AKIA…7E",
                "Access key",
                <Badge text="Applied" tone="info" />,
                <span style={{ fontSize: 12, color: A.textMuted }}>
                  Not reversible
                </span>,
              ],
            ]}
          />
        </>
      )}
      {tab === "Postmortem" && (
        <Card style={{ maxWidth: 760 }}>
          <H2 sub="Linked to the run, violations and evidence above.">
            Postmortem (draft)
          </H2>
          <div
            style={{ fontSize: 13, color: A.textSecondary, lineHeight: 1.8 }}
          >
            <p style={{ margin: "0 0 10px" }}>
              <strong>Summary:</strong> The agent proposed widening{" "}
              <span style={mono}>payments-deployer</span> with{" "}
              <span style={mono}>s3:*</span> based on stale context. The
              IAM-write approval gate blocked execution; no change was applied.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Impact:</strong> None — defense-in-depth held (gate +
              Ask-first mode).
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Root cause:</strong> Context cache served a 6h-old IAM
              snapshot; plan over-scoped.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Action items:</strong> shorten context TTL for IAM; add
              least-privilege lint to the planner; keep IAM-write gate
              mandatory.
            </p>
          </div>
          <button
            type="button"
            style={{
              marginTop: 14,
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${A.borderStrong}`,
              color: A.textSecondary,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Export postmortem
          </button>
        </Card>
      )}
    </div>
  );
}

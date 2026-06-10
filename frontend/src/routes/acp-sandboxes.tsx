/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  PageHeader,
  SubTabs,
  Table,
  Badge,
  Decision,
  mono,
} from "#/components/features/acp/acp-ui";

const SESSIONS: React.ReactNode[][] = [
  [
    <span style={mono}>sbx_7f3c</span>,
    "Production Cloud",
    "T4 cell",
    "eu-west-1",
    "8 vCPU / 16 GB",
    <Badge text="Running" tone="info" />,
    "run_8c2f",
  ],
  [
    <span style={mono}>sbx_2d8e</span>,
    "Sentinel Security Workspace",
    "T4 cell",
    "eu-west-1",
    "4 vCPU / 8 GB",
    <Badge text="Running" tone="info" />,
    "run_2d8e",
  ],
  [
    <span style={mono}>sbx_9b1a</span>,
    "Sandbox / Dev",
    "T4 cell",
    "ap-southeast-1",
    "4 vCPU / 8 GB",
    <Badge text="Running" tone="info" />,
    "run_9b1a",
  ],
  [
    <span style={mono}>sbx_4e6f</span>,
    "Production Cloud",
    "T4 cell",
    "eu-west-1",
    "8 vCPU / 16 GB",
    <Badge text="Scrubbed" tone="muted" />,
    "run_4e6f",
  ],
];
const FSDIFF: React.ReactNode[][] = [
  [
    <Badge text="+" tone="ok" />,
    <span style={mono}>/workspace/report-iam.pdf</span>,
    "created",
    "1.2 MB",
  ],
  [
    <Badge text="~" tone="warn" />,
    <span style={mono}>/workspace/.cache/plan.json</span>,
    "modified",
    "8 KB",
  ],
  [
    <Badge text="+" tone="ok" />,
    <span style={mono}>/tmp/changeset.json</span>,
    "created",
    "3 KB",
  ],
  [
    <Badge text="−" tone="danger" />,
    <span style={mono}>/workspace/.scratch</span>,
    "deleted on exit",
    "—",
  ],
];
const EGRESS: React.ReactNode[][] = [
  [
    "sts.amazonaws.com:443",
    "AWS STS (assume role)",
    <Decision d="Allow" />,
    "allowlist: aws-apis",
    "12:04:05",
  ],
  [
    "iam.amazonaws.com:443",
    "AWS IAM",
    <Decision d="Allow" />,
    "allowlist: aws-apis",
    "12:04:21",
  ],
  [
    "169.254.169.254:80",
    "Instance metadata",
    <Decision d="Blocked" />,
    "rule: block-metadata (SSRF)",
    "12:04:22",
  ],
  [
    "pastebin.com:443",
    "Unknown host",
    <Decision d="Blocked" />,
    "default-deny (not in allowlist)",
    "12:04:23",
  ],
];
const CREDS: React.ReactNode[][] = [
  [
    <span style={mono}>AWS_ACCESS_KEY_ID</span>,
    "role: cloudguard-audit (read+remediate)",
    "by-reference",
    "TTL 1h",
    <Decision d="Allow" />,
  ],
  [
    <span style={mono}>KUBECONFIG</span>,
    "EKS prod-cluster (read-only)",
    "by-reference",
    "TTL 1h",
    <Decision d="Allow" />,
  ],
  [
    <span style={mono}>NEO4J_PASSWORD</span>,
    "per-tenant KG (scoped)",
    "injected",
    "session",
    <Decision d="Allow" />,
  ],
];
const ACTIVITY: React.ReactNode[][] = [
  [
    "12:04:24",
    <span style={mono}>sbx_7f3c</span>,
    "Blocked egress to pastebin.com",
    <Badge text="Contained" tone="ok" />,
  ],
  [
    "12:04:22",
    <span style={mono}>sbx_7f3c</span>,
    "Blocked instance-metadata access",
    <Badge text="Contained" tone="ok" />,
  ],
  [
    "11:58:20",
    <span style={mono}>sbx_7f3c</span>,
    "Provisioned 8 vCPU / 16 GB in eu-west-1",
    <Badge text="Info" tone="muted" />,
  ],
];

export default function AcpSandboxes() {
  const [tab, setTab] = React.useState("Sessions");
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
      <PageHeader
        title="Sandboxes"
        sub="Where the agent runs. Prove containment: what it touched on disk, where it tried to connect, and which credentials were exposed — and for how long."
      />
      <SubTabs
        tabs={[
          "Sessions",
          "Filesystem diff",
          "Network egress",
          "Credential mounts",
          "Resources",
          "Activity",
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Sessions" && (
        <Table
          grid="100px 1.6fr 90px 110px 130px 100px 90px"
          cols={[
            "Sandbox",
            "Workspace",
            "Isolation",
            "Region",
            "Size",
            "State",
            "Run",
          ]}
          rows={SESSIONS}
        />
      )}
      {tab === "Filesystem diff" && (
        <Table
          grid="50px 2.4fr 1fr 80px"
          cols={["", "Path", "Change", "Size"]}
          rows={FSDIFF}
        />
      )}
      {tab === "Network egress" && (
        <>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Badge text="Mode: Allowlist only" tone="ok" />
            <span style={{ fontSize: 12, color: A.textMuted }}>
              Default-deny — every connection is matched against the egress
              allowlist.
            </span>
          </div>
          <Table
            grid="1.6fr 1.4fr 90px 1.6fr 90px"
            cols={[
              "Destination",
              "Identified as",
              "Decision",
              "Matched rule",
              "Time",
            ]}
            rows={EGRESS}
          />
        </>
      )}
      {tab === "Credential mounts" && (
        <Table
          grid="1.4fr 1.8fr 110px 90px 90px"
          cols={["Credential", "Scope", "Exposure", "Lifetime", "Decision"]}
          rows={CREDS}
        />
      )}
      {tab === "Resources" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {[
            { l: "CPU", v: "5.2 / 8 vCPU", p: 65 },
            { l: "Memory", v: "9.1 / 16 GB", p: 57 },
            { l: "Disk", v: "2.4 / 20 GB", p: 12 },
            { l: "Egress (this run)", v: "180 KB", p: 4 },
          ].map((m) => (
            <div
              key={m.l}
              style={{
                background: A.cardBg,
                border: `1px solid ${A.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12.5, color: A.textSecondary }}>
                  {m.l}
                </span>
                <span style={{ fontSize: 12.5, color: A.textMuted }}>
                  {m.v}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: A.badgeBg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${m.p}%`,
                    background: m.p > 85 ? A.warning : A.accent,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "Activity" && (
        <Table
          grid="90px 110px 1fr 110px"
          cols={["Time", "Sandbox", "Event", "Outcome"]}
          rows={ACTIVITY}
        />
      )}
    </div>
  );
}

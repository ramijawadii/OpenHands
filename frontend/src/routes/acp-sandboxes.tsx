/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  Breadcrumb,
  FilterBar,
  FSelect,
  ExportBtn,
  SubTabs,
  Table,
  Badge,
  Decision,
  Hash,
  mono,
  Icon,
} from "#/components/features/acp/acp-ui";
import { ConfirmButton } from "#/components/features/settings/settings-kit";
import { useSandboxes } from "#/hooks/query/use-cloudguard";
import type { CGSandbox } from "#/api/cloudguard-service";

// Map a provisioned cell record → the sandbox row shape (cells are per-tenant isolation
// environments; per-run session telemetry is a deeper runtime integration, shown as —).
const mapCell = (c: CGSandbox): Sess => ({
  id: c.id,
  run: "—",
  ws: c.tenant,
  tier: "Isolated",
  region: c.network || "—",
  cpu: 0,
  ram: 0,
  egress: "default-deny",
  lifetime: c.updated_at ? new Date(c.updated_at).toLocaleString() : "—",
  status: c.status === "provisioned" ? "Active" : c.status || "—",
});

interface Sess {
  id: string;
  run: string;
  ws: string;
  tier: string;
  region: string;
  cpu: number;
  ram: number;
  egress: string;
  lifetime: string;
  status: string;
}
const SESSIONS: Sess[] = [
  {
    id: "sess-3f9b1c",
    run: "run-8f3a2c",
    ws: "prod-aws-east",
    tier: "Isolated",
    region: "eu-west-1",
    cpu: 65,
    ram: 57,
    egress: "14.2 KB out",
    lifetime: "1h ago · max 4h",
    status: "Active",
  },
  {
    id: "sess-2d8e44",
    run: "run-2d8e44",
    ws: "sentinel-sec",
    tier: "Standard",
    region: "eu-west-1",
    cpu: 28,
    ram: 41,
    egress: "3.1 KB out",
    lifetime: "2m ago · max 4h",
    status: "Active",
  },
  {
    id: "sess-9b1a07",
    run: "run-9b1a07",
    ws: "sandbox-dev",
    tier: "Standard",
    region: "ap-southeast-1",
    cpu: 12,
    ram: 22,
    egress: "0 B",
    lifetime: "8m ago · max 4h",
    status: "Active",
  },
  {
    id: "sess-4e6f10",
    run: "run-4e6f10",
    ws: "prod-aws-east",
    tier: "Isolated",
    region: "eu-west-1",
    cpu: 0,
    ram: 0,
    egress: "88 KB out",
    lifetime: "expired",
    status: "Terminated",
  },
];
const tierTone = (t: string) =>
  t === "Isolated" ? "ok" : t === "Standard" ? "warn" : "danger";

const ACTIVITY: React.ReactNode[][] = [
  [
    "02:14:24Z",
    <Badge text="Network" tone="muted" />,
    "Blocked egress to pastebin.com:443",
    "tool: execute_command",
    <Hash h="run-8f3a2c" link />,
  ],
  [
    "02:14:22Z",
    <Badge text="Network" tone="muted" />,
    "Blocked instance-metadata 169.254.169.254",
    "process: curl",
    <Hash h="run-8f3a2c" link />,
  ],
  [
    "02:14:05Z",
    <Badge text="Credential" tone="muted" />,
    "Mounted AWS IAM role (read+remediate)",
    "runtime",
    <Hash h="run-8f3a2c" link />,
  ],
  [
    "02:13:50Z",
    <Badge text="Process" tone="muted" />,
    "Provisioned 8 vCPU / 16 GB",
    "runtime",
    <Hash h="run-8f3a2c" link />,
  ],
];
const EGRESS: React.ReactNode[][] = [
  [
    "02:14:22Z",
    <span style={mono}>169.254.169.254</span>,
    "80",
    "tcp",
    "0 B",
    <Decision d="Blocked" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>DEFAULT_DENY</span>,
    <Badge text="⚠ METADATA" tone="danger" />,
  ],
  [
    "02:14:23Z",
    <span style={mono}>pastebin.com (104.20.x)</span>,
    "443",
    "tcp",
    "0 B",
    <Decision d="Blocked" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>DEFAULT_DENY</span>,
    "—",
  ],
  [
    "02:14:05Z",
    <span style={mono}>sts.amazonaws.com</span>,
    "443",
    "tcp",
    "8 KB",
    <Decision d="Allow" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>
      allowlist: aws-apis
    </span>,
    "—",
  ],
  [
    "02:14:21Z",
    <span style={mono}>iam.amazonaws.com</span>,
    "443",
    "tcp",
    "6 KB",
    <Decision d="Allow" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>
      allowlist: aws-apis
    </span>,
    "—",
  ],
];
type DiffLine = {
  k: "ctx" | "add" | "del";
  n1: string;
  n2: string;
  text: string;
};
interface FileDiff {
  path: string;
  change: "added" | "modified" | "deleted";
  size: string;
  add: number;
  del: number;
  hunk: string;
  lines: DiffLine[];
}
const FSDIFF: FileDiff[] = [
  {
    path: "/tmp/cloudguard/report-2025-01-14.json",
    change: "added",
    size: "4.2 KB",
    add: 5,
    del: 0,
    hunk: "@@ -0,0 +1,5 @@",
    lines: [
      { k: "add", n1: "", n2: "1", text: "{" },
      { k: "add", n1: "", n2: "2", text: '  "account": "4044…1029",' },
      { k: "add", n1: "", n2: "3", text: '  "findings": 4,' },
      { k: "add", n1: "", n2: "4", text: '  "critical": 1' },
      { k: "add", n1: "", n2: "5", text: "}" },
    ],
  },
  {
    path: "/tmp/cloudguard/policy-analysis.yaml",
    change: "modified",
    size: "1.8 KB",
    add: 2,
    del: 2,
    hunk: "@@ -3,6 +3,6 @@ rules:",
    lines: [
      { k: "ctx", n1: "3", n2: "3", text: "rules:" },
      { k: "ctx", n1: "4", n2: "4", text: "  - id: iam-least-privilege" },
      { k: "del", n1: "5", n2: "", text: "    severity: medium" },
      { k: "add", n1: "", n2: "5", text: "    severity: high" },
      { k: "del", n1: "6", n2: "", text: "    action: warn" },
      { k: "add", n1: "", n2: "6", text: "    action: block" },
      { k: "ctx", n1: "7", n2: "7", text: "  - id: egress-allowlist" },
    ],
  },
  {
    path: "/tmp/cloudguard/old-scan.json",
    change: "deleted",
    size: "—",
    add: 0,
    del: 3,
    hunk: "@@ -1,3 +0,0 @@",
    lines: [
      { k: "del", n1: "1", n2: "", text: "{" },
      { k: "del", n1: "2", n2: "", text: '  "stale": true' },
      { k: "del", n1: "3", n2: "", text: "}" },
    ],
  },
];
const CREDS: React.ReactNode[][] = [
  [
    <span style={mono}>aws-audit-role</span>,
    <Badge text="AWS IAM" tone="muted" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>
      cloudguard-audit (read+remediate)
    </span>,
    "1h",
    "02:14:05Z",
    <Badge text="Active" tone="ok" />,
    <ConfirmButton
      variant="link"
      label="Revoke now"
      title="Revoke this credential?"
      body="The mount is revoked immediately and logged."
      confirmLabel="Revoke"
      onConfirm={() => {}}
    />,
  ],
  [
    <span style={mono}>eks-readonly</span>,
    <Badge text="K8s SA" tone="muted" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>
      prod-cluster:view
    </span>,
    "1h",
    "02:14:05Z",
    <Badge text="Active" tone="ok" />,
    <ConfirmButton
      variant="link"
      label="Revoke now"
      title="Revoke?"
      body="Revoked immediately."
      confirmLabel="Revoke"
      onConfirm={() => {}}
    />,
  ],
];

function DiffDrawer({
  file,
  onClose,
}: {
  file: FileDiff;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const bg = (k: DiffLine["k"]) =>
    k === "add"
      ? "rgba(76,175,125,0.13)"
      : k === "del"
        ? "rgba(224,82,82,0.13)"
        : "transparent";
  const sign = (k: DiffLine["k"]) =>
    k === "add" ? "+" : k === "del" ? "−" : " ";
  const fg = (k: DiffLine["k"]) =>
    k === "add" ? A.success : k === "del" ? A.danger : A.textMuted;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Diff for ${file.path}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 92vw)",
          height: "100%",
          background: A.cardBg,
          borderLeft: `1px solid ${A.border}`,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderBottom: `1px solid ${A.border}`,
          }}
        >
          <Badge
            text={
              file.change === "added"
                ? "+"
                : file.change === "deleted"
                  ? "−"
                  : "~"
            }
            tone={
              file.change === "added"
                ? "ok"
                : file.change === "deleted"
                  ? "danger"
                  : "warn"
            }
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                ...mono,
                fontSize: 13,
                color: A.textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {file.path}
            </div>
            <div style={{ fontSize: 11.5, color: A.textMuted, marginTop: 2 }}>
              {file.change} ·{" "}
              <span style={{ color: A.success }}>+{file.add}</span>{" "}
              <span style={{ color: A.danger }}>−{file.del}</span> · {file.size}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close diff"
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 6,
              background: A.cardBg,
              border: `1px solid ${A.borderStrong}`,
              color: A.textSecondary,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div
            style={{
              border: `1px solid ${A.border}`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                ...mono,
                fontSize: 11.5,
                color: A.textMuted,
                padding: "6px 12px",
                background: A.inputBg,
                borderBottom: `1px solid ${A.border}`,
              }}
            >
              {file.hunk}
            </div>
            {file.lines.map((ln, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "38px 38px 18px 1fr",
                  background: bg(ln.k),
                  ...mono,
                  fontSize: 12.5,
                  lineHeight: 1.7,
                }}
              >
                <span
                  style={{
                    textAlign: "right",
                    paddingRight: 8,
                    color: A.textMuted,
                    opacity: 0.6,
                    userSelect: "none",
                  }}
                >
                  {ln.n1}
                </span>
                <span
                  style={{
                    textAlign: "right",
                    paddingRight: 8,
                    color: A.textMuted,
                    opacity: 0.6,
                    userSelect: "none",
                  }}
                >
                  {ln.n2}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    color: fg(ln.k),
                    userSelect: "none",
                  }}
                >
                  {sign(ln.k)}
                </span>
                <span
                  style={{
                    color: ln.k === "ctx" ? A.textSecondary : fg(ln.k),
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {ln.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcpSandboxes() {
  const [sel, setSel] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("Activity");
  const [q, setQ] = React.useState("");
  const [tier, setTier] = React.useState("");
  const [diffFile, setDiffFile] = React.useState<FileDiff | null>(null);
  const sbQ = useSandboxes();
  // Real provisioned cells when present; keep the illustrative sample until a cell exists
  // (the dev/OFF stack provisions no per-tenant cells).
  const source =
    sbQ.data && !sbQ.isError && sbQ.data.sandboxes.length > 0
      ? sbQ.data.sandboxes.map(mapCell)
      : SESSIONS;
  const s = source.find((x) => x.id === sel);

  if (!s) {
    const rows = source.filter(
      (x) =>
        (!q ||
          `${x.id} ${x.ws} ${x.run}`.toLowerCase().includes(q.toLowerCase())) &&
        (!tier || x.tier === tier),
    );
    return (
      <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
        <Breadcrumb
          items={[{ label: "Agent Control Plane" }, { label: "Sandboxes" }]}
        />
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: A.textPrimary,
            margin: "0 0 14px",
          }}
        >
          Sandboxes
        </h1>
        <FilterBar
          placeholder="Search by session ID, workspace, run ID…"
          search={q}
          onSearch={setQ}
          right={<ExportBtn />}
        >
          <FSelect
            value=""
            onChange={() => {}}
            all="All Status"
            options={["Active", "Terminated", "Evicted"]}
          />
          <FSelect
            value={tier}
            onChange={setTier}
            all="All Tiers"
            options={["Isolated", "Standard", "Elevated"]}
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
                "110px 110px 1.1fr 90px 110px 70px 70px 100px 1.3fr 90px 90px",
              padding: "8px 16px",
              borderBottom: `1px solid ${A.border}`,
            }}
          >
            {[
              "Session",
              "Run",
              "Workspace",
              "Tier",
              "Region",
              "CPU",
              "RAM",
              "Egress",
              "Lifetime",
              "Status",
              "",
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
          {rows.map((x, i) => (
            <div
              key={x.id}
              className="cg-row"
              onClick={() => {
                setSel(x.id);
                setTab("Activity");
              }}
              title="Open session detail"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "110px 110px 1.1fr 90px 110px 70px 70px 100px 1.3fr 90px 90px",
                padding: "11px 16px",
                borderBottom:
                  i < rows.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Hash h={x.id} link />
              <Hash h={x.run} link />
              <span
                style={{
                  fontSize: 12.5,
                  color: A.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {x.ws}
              </span>
              <Badge
                text={x.tier}
                tone={tierTone(x.tier) as "ok" | "warn" | "danger"}
              />
              <span style={{ fontSize: 12, color: A.textMuted }}>
                {x.region}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: x.cpu > 85 ? A.warning : A.textMuted,
                }}
              >
                {x.cpu}%
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: x.ram > 85 ? A.warning : A.textMuted,
                }}
              >
                {x.ram}%
              </span>
              <span style={{ fontSize: 12, color: A.textMuted }}>
                {x.egress}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: A.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {x.lifetime}
              </span>
              <Badge
                text={x.status}
                tone={x.status === "Active" ? "info" : "muted"}
              />
              <span style={{ justifySelf: "end" }}>
                {x.status === "Active" ? (
                  <ConfirmButton
                    variant="link"
                    label="Terminate"
                    title={`Terminate ${x.id}?`}
                    body="The sandbox is destroyed and its credentials revoked immediately."
                    confirmLabel="Terminate"
                    onConfirm={() => {}}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: A.textMuted }}>—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
      <Breadcrumb
        items={[
          { label: "Agent Control Plane" },
          { label: "Sandboxes", onClick: () => setSel(null) },
          { label: s.id },
        ]}
        status={
          <Badge
            text={s.status}
            tone={s.status === "Active" ? "info" : "muted"}
          />
        }
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Hash h={s.id} />
          <Badge
            text={s.tier}
            tone={tierTone(s.tier) as "ok" | "warn" | "danger"}
          />
          <span style={{ fontSize: 12.5, color: A.textMuted }}>
            Run <Hash h={s.run} link /> · {s.region}
          </span>
        </div>
        {s.status === "Active" && (
          <ConfirmButton
            variant="ghost"
            label="Terminate"
            title={`Terminate ${s.id}?`}
            body="Destroyed + credentials revoked immediately."
            confirmLabel="Terminate"
            onConfirm={() => {}}
          />
        )}
      </div>
      <SubTabs
        tabs={[
          "Activity",
          "Filesystem Diff",
          "Network Egress",
          "Credential Mounts",
          "Resource Limits",
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Activity" && (
        <Table
          grid="100px 110px 1.8fr 1.2fr 110px"
          cols={["Timestamp", "Type", "Description", "Actor", "Run step"]}
          rows={ACTIVITY}
        />
      )}
      {tab === "Filesystem Diff" && (
        <>
          <div style={{ marginBottom: 10, fontSize: 12, color: A.textMuted }}>
            Changes the agent made inside the sandbox. Select a file to view its
            diff.
          </div>
          <div
            className="cg-tablewrap"
            style={{ borderRadius: 8, border: `1px solid ${A.border}` }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 2.4fr 110px 90px 110px",
                padding: "8px 16px",
                borderBottom: `1px solid ${A.border}`,
              }}
            >
              {["", "Path", "Change", "Size", "± lines"].map((c) => (
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
            {FSDIFF.map((f, i) => (
              <div
                key={f.path}
                className="cg-row"
                onClick={() => setDiffFile(f)}
                title="View diff"
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 2.4fr 110px 90px 110px",
                  padding: "10px 16px",
                  borderBottom:
                    i < FSDIFF.length - 1
                      ? "1px solid var(--cg-border-subtle)"
                      : "none",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Badge
                  text={
                    f.change === "added"
                      ? "+"
                      : f.change === "deleted"
                        ? "−"
                        : "~"
                  }
                  tone={
                    f.change === "added"
                      ? "ok"
                      : f.change === "deleted"
                        ? "danger"
                        : "warn"
                  }
                />
                <span
                  style={{
                    ...mono,
                    fontSize: 12.5,
                    color: A.accent,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.path}
                </span>
                <span style={{ fontSize: 12, color: A.textMuted }}>
                  {f.change}
                </span>
                <span style={{ fontSize: 12, color: A.textMuted }}>
                  {f.size}
                </span>
                <span style={{ fontSize: 11.5, ...mono }}>
                  {f.add > 0 && (
                    <span style={{ color: A.success }}>+{f.add}</span>
                  )}
                  {f.add > 0 && f.del > 0 && " "}
                  {f.del > 0 && (
                    <span style={{ color: A.danger }}>−{f.del}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {diffFile && (
            <DiffDrawer file={diffFile} onClose={() => setDiffFile(null)} />
          )}
        </>
      )}
      {tab === "Network Egress" && (
        <>
          <div style={{ marginBottom: 10, fontSize: 12, color: A.textMuted }}>
            Default-deny · blocked first. Metadata-endpoint hits are always
            flagged.
          </div>
          <Table
            grid="100px 1.5fr 60px 70px 80px 90px 1.4fr 110px"
            cols={[
              "Time",
              "Destination",
              "Port",
              "Proto",
              "Bytes",
              "Decision",
              "Matched rule",
              "Flag",
            ]}
            rows={EGRESS}
          />
        </>
      )}
      {tab === "Credential Mounts" && (
        <Table
          grid="1.2fr 100px 1.8fr 70px 110px 90px 100px"
          cols={["Credential", "Type", "Scope", "TTL", "Mounted", "Status", ""]}
          rows={CREDS}
        />
      )}
      {tab === "Resource Limits" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {[
            { l: "CPU", v: "42% of 2 vCPU", p: 42 },
            { l: "RAM", v: "1.2 / 2 GB", p: 60 },
            { l: "Disk", v: "312 MB / 1 GB", p: 31 },
            { l: "Network egress", v: "14 KB / 10 MB", p: 1 },
            { l: "Session lifetime", v: "2h 14m / 4h", p: 44 },
            { l: "Processes", v: "8 / 50", p: 16 },
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
    </div>
  );
}

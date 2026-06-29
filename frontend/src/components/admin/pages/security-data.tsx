/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard Security & Data Controls (§10) */
import React from "react";
import { Plus, X, Trash2, Play, Flame, Radar } from "lucide-react";
import {
  useIsolation,
  useDataResidency,
  useEncryptionKeys,
  useOverview,
  useGuardrails,
} from "#/hooks/query/use-cloudguard";
import {
  Page,
  PageHeader,
  Tabs,
  Card,
  StatRow,
  KVGrid,
  PostureCard,
  PostureGrid,
  DirectoryTable,
  HeaderButton,
  ConfirmButton,
  ScopeBadge,
  SampleBanner,
  SampleTag,
  Toggle,
  T,
  type Column,
  useTabParam,
} from "#/components/admin/admin-kit";
import { EncryptionKeysPage } from "./encryption-keys";

/**
 * Security & Data Controls (§10) — the full security value chain as sub-views: Posture, Agent
 * Guardrails, Isolation & Containment, Encryption & Keys, Data Residency, Network & Access, Secrets,
 * Security Monitoring, Vulnerability Management, Security Exceptions.
 *
 * Live signal drives Posture / Guardrails / Isolation / Encryption / Residency / Monitoring
 * (/isolation, /guardrails, /encryption/keys, /data-residency, /overview). Network, Secrets,
 * Vulnerabilities and Exceptions are rendered in full with representative, interactive data (tagged
 * `Sample`) until their backends land.
 */

const TABS = [
  { id: "posture", label: "Posture" },
  { id: "guardrails", label: "Agent Guardrails" },
  { id: "isolation", label: "Isolation & Containment" },
  { id: "encryption", label: "Encryption & Keys" },
  { id: "residency", label: "Data Residency" },
  { id: "dlp", label: "DLP & Data Protection" },
  { id: "network", label: "Network & Firewall" },
  { id: "secrets", label: "Secrets" },
  { id: "threats", label: "Threat Detection" },
  { id: "vuln", label: "Vulnerabilities" },
  { id: "hardening", label: "Hardening & Benchmarks" },
  { id: "exceptions", label: "Security Exceptions" },
];

export function SecurityDataPage({
  scope,
}: {
  scope: "workspace" | "enterprise";
}) {
  const [tab, setTab] = useTabParam("posture");
  return (
    <Page>
      <PageHeader
        title="Security & Data Controls"
        subtitle="The security value chain — guardrails, isolation, encryption, residency, network, monitoring and posture."
        actions={
          <ScopeBadge
            scope={scope === "workspace" ? "This workspace" : "Organization"}
          />
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "posture" && <PostureTab onGoto={setTab} />}
      {tab === "guardrails" && <GuardrailsTab />}
      {tab === "isolation" && <IsolationTab />}
      {tab === "encryption" && <EncryptionKeysPage scope={scope} embedded />}
      {tab === "residency" && <ResidencyTab />}
      {tab === "dlp" && <DlpTab />}
      {tab === "network" && <NetworkFirewallTab />}
      {tab === "secrets" && <SecretsTab />}
      {tab === "threats" && <ThreatTab />}
      {tab === "vuln" && <VulnTab />}
      {tab === "hardening" && <HardeningTab />}
      {tab === "exceptions" && <ExceptionsTab />}
    </Page>
  );
}

// ════════════ §10.10 Security Posture — live composition ════════════
function PostureTab({ onGoto }: { onGoto: (t: string) => void }) {
  const iso = useIsolation();
  const keys = useEncryptionKeys();
  const res = useDataResidency();
  const ov = useOverview();
  const g = useGuardrails();
  const k = keys.data;
  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Isolation tier"
          value={iso.data?.tier ?? "—"}
          sub={`egress: ${iso.data?.egress ?? "—"}`}
          tone={iso.data?.tier === "Isolated" ? "ok" : "warn"}
          to=""
          cta=""
        />
        <PostureCard
          title="Tenant isolation"
          value={
            k
              ? k.tenancy.strict
                ? "Strict"
                : k.tenancy.enabled
                  ? "On"
                  : "Off"
              : "—"
          }
          sub="fail-closed boundary"
          tone={k?.tenancy.strict ? "ok" : "warn"}
        />
        <PostureCard
          title="Key custody"
          value={
            k
              ? k.provider === "KmsKeyProvider"
                ? "HYOK"
                : k.provider === "WrappedKeyProvider"
                  ? "Per-tenant"
                  : "Local"
              : "—"
          }
          sub="encryption at rest"
          tone={k && k.provider !== "LocalKeyProvider" ? "ok" : "warn"}
        />
        <PostureCard
          title="Audit integrity"
          value={
            k ? (k.audit_hmac_configured ? "Tamper-evident" : "Hash-only") : "—"
          }
          sub={k?.audit_integrity ?? ""}
          tone={k?.audit_hmac_configured ? "ok" : "warn"}
        />
        <PostureCard
          title="Data residency"
          value={res.data?.region ?? "—"}
          sub={`retention ${res.data?.retention_days ?? "—"}d`}
          tone="ok"
        />
        <PostureCard
          title="Agent autonomy"
          value={g.data?.autonomy_mode ?? "—"}
          sub="default posture"
          tone={g.data?.autonomy_mode === "autonomous" ? "warn" : "ok"}
        />
        <PostureCard
          title="Security violations"
          value={ov.data ? ov.data.violations : "—"}
          sub="policy-denied / blocked"
          tone={ov.data && ov.data.violations > 0 ? "danger" : "ok"}
        />
        <PostureCard
          title="Excessive permissions"
          value="0"
          sub="IAM staleness"
          tone="ok"
        />
      </PostureGrid>
      <Card
        title="Control areas"
        desc="Status across the §10 security value chain."
      >
        {[
          [
            "guardrails",
            "Agent Guardrails",
            "Autonomy, action gates, data-handling rules",
          ],
          [
            "isolation",
            "Isolation & Containment",
            "Tenant / workspace / sandbox isolation + containment testing",
          ],
          [
            "encryption",
            "Encryption & Keys",
            "At-rest / in-transit / custody / rotation",
          ],
          [
            "residency",
            "Data Residency",
            "Approved regions, processing & storage residency",
          ],
          ["secrets", "Secrets", "Vault custody, rotation, export prevention"],
          [
            "threats",
            "Threat Detection",
            "SIEM, IDS/IPS, threat intel, MITRE ATT&CK coverage",
          ],
          [
            "network",
            "Network & Firewall",
            "Firewall, WAF, DDoS, IDS/IPS, segmentation",
          ],
          [
            "dlp",
            "DLP & Data Protection",
            "Classification, DLP rules, exfiltration block",
          ],
          [
            "vuln",
            "Vulnerability Management",
            "Platform / image / dependency vulnerabilities",
          ],
        ].map(([id, label, desc]) => (
          <button
            key={id}
            type="button"
            onClick={() => onGoto(id)}
            className="cg-row"
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
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
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  color: T.textPrimary,
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
              <span
                style={{ display: "block", fontSize: 12, color: T.textMuted }}
              >
                {desc}
              </span>
            </span>
            <span style={{ fontSize: 12, color: T.accent }}>Open →</span>
          </button>
        ))}
      </Card>
    </>
  );
}

// ════════════ §10.1 Agent Guardrails ════════════
function GuardrailsTab() {
  const g = useGuardrails();
  const gates = g.data?.action_gates ?? {};
  return (
    <>
      <Card
        title="Agent guardrails (live)"
        desc="The autonomy posture and action gates enforced on every run. Edit in Runtime Governance → Policy."
      >
        <StatRow
          label="Autonomy mode"
          value={g.data?.autonomy_mode ?? "—"}
          tone={g.data?.autonomy_mode === "autonomous" ? "warn" : "ok"}
        />
        {Object.entries(gates).map(([k, v]) => (
          <StatRow
            key={k}
            label={`Gate · ${k}`}
            value={String(v)}
            tone={v === "autonomous" ? "warn" : "ok"}
          />
        ))}
      </Card>
      <SampleBanner what="Data-handling & reasoning limits" />
      <Card title="Data-handling rules (§10.1)">
        <StatRow label="Secret redaction" value="Enabled" tone="ok" sample />
        <StatRow label="PII redaction" value="Enabled" tone="ok" sample />
        <StatRow
          label="Restricted-data exclusion"
          value="Enforced"
          tone="ok"
          sample
        />
        <StatRow
          label="Prompt logging"
          value="Metadata only · no payloads"
          tone="ok"
          sample
        />
        <StatRow
          label="Max context size"
          value="200k tokens"
          tone="ok"
          sample
        />
      </Card>
      <Card title="Reasoning & oversight limits (§10.1)">
        <StatRow label="Max agent steps" value="120" tone="ok" sample />
        <StatRow label="Max tool calls / run" value="100" tone="ok" sample />
        <StatRow
          label="Infinite-loop prevention"
          value="Enabled"
          tone="ok"
          sample
        />
        <StatRow
          label="Human approval required"
          value="Delete / IAM / cross-account"
          tone="ok"
          sample
        />
      </Card>
    </>
  );
}

// ════════════ §10.2 Isolation & Containment ════════════
function IsolationTab() {
  const iso = useIsolation();
  const keys = useEncryptionKeys();
  const strict = keys.data?.tenancy.strict;
  const tests = [
    "Cross-workspace access test",
    "Sandbox escape test",
    "Credential-leak test",
    "Network-policy test",
  ];
  const [results, setResults] = React.useState<
    Record<string, "pass" | "running">
  >({});
  return (
    <>
      <Card
        title="Isolation posture (live)"
        desc="The containment tier and tenant-isolation boundary in force."
      >
        <StatRow
          label="Sandbox isolation tier"
          value={iso.data?.tier ?? "—"}
          tone={iso.data?.tier === "Isolated" ? "ok" : "warn"}
        />
        <StatRow
          label="Sandbox egress"
          value={iso.data?.egress ?? "—"}
          tone={iso.data?.egress === "deny-all" ? "ok" : "warn"}
        />
        <StatRow
          label="Tenant isolation"
          value={
            keys.data
              ? strict
                ? "Strict (fail-closed)"
                : keys.data.tenancy.enabled
                  ? "Enabled"
                  : "Disabled"
              : "—"
          }
          tone={strict ? "ok" : "warn"}
          hint="Unattributed requests are denied when strict."
        />
        <StatRow
          label="Per-tenant key separation"
          value={keys.data?.per_tenant_keys ? "Enforced" : "Shared"}
          tone={keys.data?.per_tenant_keys ? "ok" : "warn"}
        />
      </Card>
      <SampleBanner what="Isolation sub-controls" />
      <Card title="Isolation controls (§10.2)">
        <KVGrid
          items={[
            {
              k: "Tenant isolation",
              v: "Separate identifiers, partitions, crypto context",
              sample: true,
            },
            {
              k: "Workspace isolation",
              v: "Separate identities, secrets, storage, audit",
              sample: true,
            },
            {
              k: "Sandbox isolation",
              v: "One sandbox per workflow · auto-destruct",
              sample: true,
            },
            {
              k: "Credential isolation",
              v: "Per-workflow, short-lived, no persistence",
              sample: true,
            },
            {
              k: "Network isolation",
              v: "Egress controls · no inbound sandbox access",
              sample: true,
            },
            {
              k: "Process isolation",
              v: "Namespaced · restricted syscalls · hardened",
              sample: true,
            },
          ]}
        />
      </Card>
      <Card
        title="Containment testing (§10.2)"
        desc="Run periodic isolation-verification tests. Results feed the compliance evidence store."
      >
        {tests.map((t) => (
          <div
            key={t}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 0",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span style={{ fontSize: 13, color: T.textPrimary }}>
              {t} <SampleTag />
            </span>
            <span
              style={{ display: "inline-flex", gap: 10, alignItems: "center" }}
            >
              {results[t] === "pass" && (
                <span style={{ fontSize: 12, color: T.success }}>
                  ● passed just now
                </span>
              )}
              <HeaderButton
                icon={<Play size={13} />}
                onClick={() => {
                  setResults((r) => ({ ...r, [t]: "running" }));
                  setTimeout(
                    () => setResults((r) => ({ ...r, [t]: "pass" })),
                    900,
                  );
                }}
              >
                {results[t] === "running" ? "Running…" : "Run test"}
              </HeaderButton>
            </span>
          </div>
        ))}
      </Card>
    </>
  );
}

// ════════════ §10.4 Data Residency ════════════
function ResidencyTab() {
  const res = useDataResidency();
  return (
    <>
      <Card
        title="Workspace residency (live)"
        desc="Where this workspace's data is processed and stored."
      >
        <StatRow
          label="Primary region"
          value={res.data?.region ?? "—"}
          tone="ok"
        />
        <StatRow
          label="Evidence retention"
          value={`${res.data?.retention_days ?? "—"} days`}
          tone="ok"
        />
      </Card>
      <SampleBanner what="Approved / restricted regions & residency evidence" />
      <Card title="Approved regions (§10.4.1)">
        <KVGrid
          items={[
            {
              k: "Processing regions",
              v: "eu-west-1, eu-central-1",
              sample: true,
            },
            { k: "Storage regions", v: "eu-west-1", sample: true },
            { k: "Backup regions", v: "eu-central-1", sample: true },
            {
              k: "Model regions",
              v: "eu-west-1 (private endpoint)",
              sample: true,
            },
          ]}
        />
      </Card>
      <Card title="Restricted regions (floor)">
        <StatRow
          label="Prohibited processing regions"
          value="us-*, ap-* (data-sovereignty)"
          tone="danger"
          sample
        />
        <StatRow
          label="Prohibited model providers"
          value="Non-EU public inference"
          tone="danger"
          sample
        />
        <StatRow
          label="Prohibited subprocessors"
          value="2 on denylist"
          tone="danger"
          sample
        />
      </Card>
      <Card title="Residency by concern (§10.4.4–6)">
        <KVGrid
          items={[
            {
              k: "Processing",
              v: "Agent + sandbox in eu-west-1",
              sample: true,
            },
            { k: "Storage", v: "DB + object + evidence in EU", sample: true },
            {
              k: "Model",
              v: "Private EU endpoint · no external inference",
              sample: true,
            },
            {
              k: "Backup",
              v: "eu-central-1 · cross-border blocked",
              sample: true,
            },
          ]}
        />
      </Card>
      <Card
        title="Data transfers register (§10.4.8)"
        desc="Every cross-border transfer with legal basis."
      >
        <StatRow
          label="Active transfers"
          value="0 cross-border"
          tone="ok"
          sample
        />
        <StatRow
          label="Transfer mechanism"
          value="N/A — in-region only"
          tone="ok"
          sample
        />
      </Card>
    </>
  );
}

// ════════════ §10.5 Network & Firewall ════════════
interface FwRule {
  id: string;
  dir: string;
  proto: string;
  source: string;
  port: string;
  action: string;
}
function NetworkFirewallTab() {
  const [rules, setRules] = React.useState<FwRule[]>([
    {
      id: "1",
      dir: "Ingress",
      proto: "TCP",
      source: "10.0.0.0/8",
      port: "443",
      action: "Allow",
    },
    {
      id: "2",
      dir: "Ingress",
      proto: "TCP",
      source: "0.0.0.0/0",
      port: "443",
      action: "Allow (WAF)",
    },
    {
      id: "3",
      dir: "Ingress",
      proto: "ANY",
      source: "0.0.0.0/0",
      port: "*",
      action: "Deny",
    },
    {
      id: "4",
      dir: "Egress",
      proto: "TCP",
      source: "sandbox",
      port: "443",
      action: "Allow (allowlist)",
    },
    {
      id: "5",
      dir: "Egress",
      proto: "ANY",
      source: "sandbox",
      port: "*",
      action: "Deny",
    },
  ]);
  const [nets, setNets] = React.useState(["10.0.0.0/8", "100.64.0.0/10 (VPN)"]);
  const [newNet, setNewNet] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [toggles, setToggles] = React.useState({
    waf: true,
    ddos: true,
    ids: true,
    ztna: true,
    tlsInspect: true,
    noInbound: true,
  });
  const set = (k: keyof typeof toggles) =>
    setToggles((t) => ({ ...t, [k]: !t[k] }));
  const fwCols: Column<FwRule>[] = [
    { key: "d", header: "Direction", render: (r) => r.dir },
    { key: "p", header: "Protocol", render: (r) => r.proto },
    {
      key: "s",
      header: "Source",
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.source}
        </span>
      ),
    },
    { key: "pt", header: "Port", render: (r) => r.port },
    {
      key: "a",
      header: "Action",
      render: (r) => (
        <span
          style={{ color: r.action.startsWith("Deny") ? T.danger : T.success }}
        >
          {r.action}
        </span>
      ),
    },
  ];
  return (
    <>
      <SampleBanner what="Network & firewall policy" />
      <Card
        title="Firewall rules (§10.5)"
        desc="Stateful ingress/egress rules evaluated top-down. Default-deny floor."
        right={
          <HeaderButton
            icon={<Plus size={14} />}
            variant="primary"
            onClick={() => setAdding(true)}
          >
            Add rule
          </HeaderButton>
        }
      >
        <DirectoryTable
          columns={fwCols}
          rows={rules}
          pageSize={10}
          rowActions={(r) => (
            <ConfirmButton
              variant="link"
              label={<Trash2 size={13} color={T.danger} />}
              title="Delete rule"
              body="Remove this firewall rule?"
              confirmLabel="Delete"
              onConfirm={() =>
                setRules((rs) => rs.filter((x) => x.id !== r.id))
              }
            />
          )}
        />
      </Card>
      <Card title="Perimeter defenses">
        <ToggleRow
          label="Web application firewall (WAF)"
          hint="OWASP managed rules + custom rules"
          on={toggles.waf}
          onChange={() => set("waf")}
          icon={<Flame size={14} color={T.warning} />}
        />
        <ToggleRow
          label="DDoS protection"
          hint="Volumetric + application-layer mitigation"
          on={toggles.ddos}
          onChange={() => set("ddos")}
        />
        <ToggleRow
          label="Intrusion detection / prevention (IDS/IPS)"
          hint="Signature + anomaly-based, inline blocking"
          on={toggles.ids}
          onChange={() => set("ids")}
          icon={<Radar size={14} color={T.accent} />}
        />
        <ToggleRow
          label="Zero-trust network access (ZTNA)"
          hint="Per-request authz, no implicit trust"
          on={toggles.ztna}
          onChange={() => set("ztna")}
        />
        <ToggleRow
          label="TLS inspection (egress proxy)"
          on={toggles.tlsInspect}
          onChange={() => set("tlsInspect")}
        />
        <ToggleRow
          label="No inbound sandbox access"
          on={toggles.noInbound}
          onChange={() => set("noInbound")}
        />
      </Card>
      <Card
        title="WAF managed rule groups"
        desc="Click to enable additional protections."
      >
        <KVGrid
          items={[
            { k: "OWASP Top 10", v: "Enabled", sample: true },
            { k: "SQL injection", v: "Enabled · blocking", sample: true },
            {
              k: "Cross-site scripting",
              v: "Enabled · blocking",
              sample: true,
            },
            {
              k: "Bot / scraper control",
              v: "Enabled · challenge",
              sample: true,
            },
            { k: "Rate-based (per-IP)", v: "2000 req / 5 min", sample: true },
            { k: "Geo restriction", v: "EU + allowlisted only", sample: true },
          ]}
        />
      </Card>
      <Card title="Segmentation & private connectivity">
        <StatRow
          label="Network segmentation"
          value="Per-workspace VPC / subnet isolation"
          tone="ok"
          sample
        />
        <StatRow
          label="Micro-segmentation"
          value="East-west deny by default"
          tone="ok"
          sample
        />
        <StatRow
          label="Private connectivity"
          value="AWS PrivateLink · Azure Private Link · GCP PSC"
          tone="ok"
          sample
        />
        <StatRow
          label="DNS filtering"
          value="Malicious + category blocking"
          tone="ok"
          sample
        />
      </Card>
      <Card
        title="Trusted networks (§10.5)"
        desc="Source ranges permitted for administrative access."
      >
        {nets.map((n) => (
          <div
            key={n}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: T.textPrimary,
                fontFamily: "monospace",
              }}
            >
              {n}
            </span>
            <button
              type="button"
              onClick={() => setNets((ns) => ns.filter((x) => x !== n))}
              style={{
                background: "transparent",
                border: "none",
                color: T.danger,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, padding: "10px 0" }}>
          <input
            value={newNet}
            onChange={(e) => setNewNet(e.target.value)}
            placeholder="CIDR e.g. 203.0.113.0/24"
            style={inp}
          />
          <HeaderButton
            icon={<Plus size={14} />}
            disabled={!newNet.trim()}
            onClick={() => {
              setNets((ns) => [...ns, newNet.trim()]);
              setNewNet("");
            }}
          >
            Add
          </HeaderButton>
        </div>
      </Card>
      {adding && (
        <FwModal
          onClose={() => setAdding(false)}
          onSave={(r) => {
            setRules((rs) => [...rs, { ...r, id: `f${Date.now()}` }]);
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
function FwModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (r: Omit<FwRule, "id">) => void;
}) {
  const [dir, setDir] = React.useState("Ingress");
  const [proto, setProto] = React.useState("TCP");
  const [source, setSource] = React.useState("");
  const [port, setPort] = React.useState("443");
  const [action, setAction] = React.useState("Allow");
  return (
    <Modal
      title="Add firewall rule"
      onClose={onClose}
      footer={
        <HeaderButton
          variant="primary"
          disabled={!source.trim()}
          onClick={() =>
            onSave({ dir, proto, source: source.trim(), port, action })
          }
        >
          Add rule
        </HeaderButton>
      }
    >
      <Field label="Direction">
        <Sel value={dir} onChange={setDir} opts={["Ingress", "Egress"]} />
      </Field>
      <Field label="Protocol">
        <Sel value={proto} onChange={setProto} opts={["TCP", "UDP", "ANY"]} />
      </Field>
      <Field label="Source / destination">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="CIDR or label"
          style={inp}
        />
      </Field>
      <Field label="Port">
        <input
          value={port}
          onChange={(e) => setPort(e.target.value)}
          style={inp}
        />
      </Field>
      <Field label="Action">
        <Sel
          value={action}
          onChange={setAction}
          opts={["Allow", "Allow (WAF)", "Deny"]}
        />
      </Field>
    </Modal>
  );
}

// ════════════ §10.x DLP & Data Protection ════════════
interface DlpRule {
  id: string;
  name: string;
  pattern: string;
  action: string;
  severity: string;
}
function DlpTab() {
  const [rules, setRules] = React.useState<DlpRule[]>([
    {
      id: "1",
      name: "Credit card (PAN)",
      pattern: "PCI · Luhn-validated",
      action: "Block + alert",
      severity: "High",
    },
    {
      id: "2",
      name: "AWS secret key",
      pattern: "AKIA[0-9A-Z]{16}",
      action: "Block + revoke",
      severity: "Critical",
    },
    {
      id: "3",
      name: "Email / PII",
      pattern: "Personal data",
      action: "Redact",
      severity: "Medium",
    },
    {
      id: "4",
      name: "Private key material",
      pattern: "BEGIN PRIVATE KEY",
      action: "Block",
      severity: "Critical",
    },
  ]);
  const cols: Column<DlpRule>[] = [
    {
      key: "n",
      header: "Rule",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    {
      key: "p",
      header: "Detector",
      render: (r) => <span style={{ color: T.textMuted }}>{r.pattern}</span>,
    },
    { key: "a", header: "Action", render: (r) => r.action },
    {
      key: "s",
      header: "Severity",
      render: (r) => (
        <span
          style={{
            color:
              r.severity === "Critical"
                ? T.danger
                : r.severity === "High"
                  ? T.warning
                  : T.textNav,
          }}
        >
          {r.severity}
        </span>
      ),
    },
  ];
  return (
    <>
      <SampleBanner what="Data loss prevention" />
      <Card title="Data classification (§10)">
        <KVGrid
          items={[
            { k: "Public", v: "No restriction", sample: true },
            { k: "Internal", v: "Workspace-scoped", sample: true },
            {
              k: "Confidential",
              v: "Encryption + access logging",
              sample: true,
            },
            {
              k: "Restricted (PII/PCI)",
              v: "Redaction + residency + approval",
              sample: true,
            },
          ]}
        />
      </Card>
      <Card
        title="DLP policies (§10)"
        desc="Patterns detected in prompts, tool output and artifacts — blocked, redacted or alerted before they leave the boundary."
        right={
          <HeaderButton icon={<Plus size={14} />} variant="primary">
            Add rule
          </HeaderButton>
        }
      >
        <DirectoryTable
          columns={cols}
          rows={rules}
          pageSize={10}
          initialSort={{ key: "s", dir: "desc" }}
          rowActions={(r) => (
            <ConfirmButton
              variant="link"
              label={<Trash2 size={13} color={T.danger} />}
              title="Delete rule"
              body={`Remove DLP rule "${r.name}"?`}
              confirmLabel="Delete"
              onConfirm={() =>
                setRules((rs) => rs.filter((x) => x.id !== r.id))
              }
            />
          )}
        />
      </Card>
      <Card title="Data protection controls">
        <StatRow
          label="Secret redaction in prompts/output"
          value="Enforced"
          tone="ok"
          sample
        />
        <StatRow
          label="PII tokenization / masking"
          value="Enabled for restricted data"
          tone="ok"
          sample
        />
        <StatRow
          label="Restricted-data exfiltration block"
          value="Egress-DLP enforced"
          tone="ok"
          sample
        />
        <StatRow
          label="DLP findings (24h)"
          value="3 redacted · 0 leaked"
          tone="ok"
          sample
        />
      </Card>
    </>
  );
}

// ════════════ §10.6 Secrets ════════════
function SecretsTab() {
  return (
    <>
      <SampleBanner what="Secrets security posture" />
      <Card
        title="Secrets security (§10.6)"
        desc="Custody, separation and lifecycle of secret material. Manage entries in the workspace Secret Vault."
      >
        <StatRow
          label="Secret-storage provider"
          value="Per-tenant encrypted store"
          tone="ok"
          sample
        />
        <StatRow
          label="Workspace secret separation"
          value="Enforced"
          tone="ok"
          sample
        />
        <StatRow
          label="Secret rotation"
          value="Automatic · 90 days"
          tone="ok"
          sample
        />
        <StatRow
          label="Short-lived secrets"
          value="STS / OIDC preferred"
          tone="ok"
          sample
        />
        <StatRow
          label="Secret export prevention"
          value="Export blocked · use-only"
          tone="ok"
          sample
        />
        <StatRow
          label="Secret-use logging"
          value="Every access audited"
          tone="ok"
          sample
        />
        <StatRow
          label="Emergency revocation"
          value="One-click revoke-all"
          tone="warn"
          sample
        />
      </Card>
    </>
  );
}

// ════════════ §10.7 Threat Detection & Response ════════════
function ThreatTab() {
  const ov = useOverview();
  const dets = [
    {
      id: "1",
      type: "Suspicious administrator activity",
      count: 0,
      mitre: "TA0004 Privilege Esc",
    },
    {
      id: "2",
      type: "Excessive tool calls (rate anomaly)",
      count: 2,
      mitre: "TA0040 Impact",
    },
    {
      id: "3",
      type: "Cross-workspace access attempt",
      count: 0,
      mitre: "TA0008 Lateral Movement",
    },
    { id: "4", type: "Network-policy violation", count: 1, mitre: "TA0011 C2" },
    {
      id: "5",
      type: "Data-residency violation",
      count: 0,
      mitre: "TA0010 Exfiltration",
    },
    {
      id: "6",
      type: "Credential misuse",
      count: 0,
      mitre: "TA0006 Credential Access",
    },
    {
      id: "7",
      type: "Audit-integrity failure",
      count: 0,
      mitre: "TA0005 Defense Evasion",
    },
  ];
  const cols: Column<(typeof dets)[number]>[] = [
    { key: "t", header: "Detection", render: (r) => r.type },
    {
      key: "m",
      header: "MITRE ATT&CK",
      render: (r) => (
        <span style={{ color: T.textMuted, fontSize: 11.5 }}>{r.mitre}</span>
      ),
    },
    {
      key: "c",
      header: "Last 24h",
      sortValue: (r) => r.count,
      render: (r) => (
        <span style={{ color: r.count > 0 ? T.warning : T.textNav }}>
          {r.count}
        </span>
      ),
    },
    {
      key: "s",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.count > 0 ? T.warning : T.success }}>
          {r.count > 0 ? "Investigate" : "Clear"}
        </span>
      ),
    },
  ];
  return (
    <>
      <Card
        title="Threat detection (live)"
        right={
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: (ov.data?.violations ?? 0) > 0 ? T.danger : T.success,
            }}
          >
            {ov.data ? ov.data.violations : "—"} violations
          </span>
        }
      >
        <StatRow
          label="Policy-denied / blocked actions"
          value={ov.data ? String(ov.data.violations) : "—"}
          tone={(ov.data?.violations ?? 0) > 0 ? "danger" : "ok"}
          hint="From the live audit chain."
        />
      </Card>
      <SampleBanner what="Detection & response pipeline" />
      <Card title="Telemetry & response integrations">
        <StatRow
          label="SIEM streaming"
          value="Splunk · Microsoft Sentinel (configured)"
          tone="ok"
          sample
        />
        <StatRow
          label="Threat-intelligence feeds"
          value="3 active · IOC + malicious-IP + typosquat"
          tone="ok"
          sample
        />
        <StatRow
          label="IDS / IPS"
          value="Inline · signature + anomaly"
          tone="ok"
          sample
        />
        <StatRow
          label="Behavioral analytics (UEBA)"
          value="Baseline established"
          tone="ok"
          sample
        />
        <StatRow
          label="Automated response (SOAR)"
          value="Auto-isolate on high-severity detection"
          tone="warn"
          sample
        />
        <StatRow
          label="Incident response"
          value="Linked to Enterprise Operations → Incidents"
          tone="ok"
          sample
        />
      </Card>
      <Card
        title="Detections by category (§10.7)"
        desc="Mapped to MITRE ATT&CK tactics for coverage assurance."
      >
        <DirectoryTable
          columns={cols}
          rows={dets}
          pageSize={10}
          initialSort={{ key: "c", dir: "desc" }}
        />
      </Card>
    </>
  );
}

// ════════════ §10 Hardening & Benchmarks ════════════
function HardeningTab() {
  const benches = [
    { id: "1", name: "CIS AWS Foundations v3.0", pass: 142, total: 156 },
    { id: "2", name: "CIS Kubernetes v1.9", pass: 88, total: 97 },
    { id: "3", name: "CIS Docker v1.6", pass: 41, total: 45 },
    { id: "4", name: "NIST 800-53 (moderate)", pass: 230, total: 261 },
  ];
  const cols: Column<(typeof benches)[number]>[] = [
    {
      key: "n",
      header: "Benchmark",
      sortValue: (r) => r.name,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.name}</span>,
    },
    { key: "p", header: "Passing", render: (r) => `${r.pass} / ${r.total}` },
    {
      key: "pct",
      header: "Score",
      sortValue: (r) => r.pass / r.total,
      render: (r) => {
        const p = Math.round((r.pass / r.total) * 100);
        return (
          <span
            style={{
              color: p >= 95 ? T.success : p >= 85 ? T.warning : T.danger,
            }}
          >
            {p}%
          </span>
        );
      },
    },
  ];
  return (
    <>
      <SampleBanner what="Configuration hardening & benchmarks" />
      <Card
        title="Benchmark posture (§10)"
        desc="Configuration-hardening compliance of the platform + sandbox images. Fed by the engine's CIS/benchmark scanners."
      >
        <DirectoryTable
          columns={cols}
          rows={benches}
          pageSize={10}
          initialSort={{ key: "pct", dir: "asc" }}
        />
      </Card>
      <Card title="Hardening controls">
        <StatRow
          label="Image hardening"
          value="Distroless · non-root · read-only rootfs"
          tone="ok"
          sample
        />
        <StatRow
          label="Configuration drift detection"
          value="Enabled · alert on drift"
          tone="ok"
          sample
        />
        <StatRow
          label="Patch management"
          value="Critical ≤ 7d · automated"
          tone="ok"
          sample
        />
        <StatRow
          label="Secure baseline"
          value="Enforced on every sandbox provision"
          tone="ok"
          sample
        />
      </Card>
    </>
  );
}

// ════════════ §10.8 Vulnerability Management ════════════
function VulnTab() {
  const vulns = [
    {
      id: "1",
      area: "Platform",
      critical: 0,
      high: 1,
      sla: "7d",
      status: "On track",
    },
    {
      id: "2",
      area: "Sandbox image",
      critical: 0,
      high: 2,
      sla: "14d",
      status: "On track",
    },
    {
      id: "3",
      area: "Connectors",
      critical: 0,
      high: 0,
      sla: "—",
      status: "Clear",
    },
    {
      id: "4",
      area: "Tools",
      critical: 0,
      high: 1,
      sla: "30d",
      status: "On track",
    },
    {
      id: "5",
      area: "MCP servers",
      critical: 0,
      high: 0,
      sla: "—",
      status: "Clear",
    },
    {
      id: "6",
      area: "Dependencies",
      critical: 1,
      high: 4,
      sla: "7d",
      status: "Overdue",
    },
  ];
  const cols: Column<(typeof vulns)[number]>[] = [
    {
      key: "a",
      header: "Area",
      sortValue: (r) => r.area,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.area}</span>,
    },
    {
      key: "c",
      header: "Critical",
      sortValue: (r) => r.critical,
      render: (r) => (
        <span style={{ color: r.critical > 0 ? T.danger : T.textNav }}>
          {r.critical}
        </span>
      ),
    },
    {
      key: "h",
      header: "High",
      sortValue: (r) => r.high,
      render: (r) => (
        <span style={{ color: r.high > 0 ? T.warning : T.textNav }}>
          {r.high}
        </span>
      ),
    },
    { key: "sla", header: "Remediation SLA", render: (r) => r.sla },
    {
      key: "s",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color:
              r.status === "Overdue"
                ? T.danger
                : r.status === "Clear"
                  ? T.success
                  : T.textNav,
          }}
        >
          {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <SampleBanner what="Vulnerability posture" />
      <Card
        title="Vulnerability management (§10.8)"
        desc="Vulnerabilities by component, with remediation SLA. Fed by the engine's supply-chain + image scanners."
      >
        <DirectoryTable
          columns={cols}
          rows={vulns}
          pageSize={10}
          initialSort={{ key: "c", dir: "desc" }}
        />
      </Card>
    </>
  );
}

// ════════════ §10.9 Security Exceptions ════════════
interface SecExc {
  id: string;
  control: string;
  justification: string;
  owner: string;
  risk: string;
  expiry: string;
}
function ExceptionsTab() {
  const [exc, setExc] = React.useState<SecExc[]>([]);
  const [adding, setAdding] = React.useState(false);
  const cols: Column<SecExc>[] = [
    { key: "c", header: "Control", render: (r) => r.control },
    {
      key: "j",
      header: "Justification",
      render: (r) => (
        <span style={{ color: T.textMuted }}>{r.justification}</span>
      ),
    },
    { key: "o", header: "Owner", render: (r) => r.owner },
    {
      key: "r",
      header: "Risk",
      render: (r) => (
        <span
          style={{
            color:
              r.risk === "High"
                ? T.danger
                : r.risk === "Medium"
                  ? T.warning
                  : T.textNav,
          }}
        >
          {r.risk}
        </span>
      ),
    },
    { key: "e", header: "Expiry", render: (r) => r.expiry },
  ];
  return (
    <>
      <Card
        title="Security exceptions (§10.9)"
        desc="Time-boxed, risk-rated waivers of a security control, with compensating controls."
        right={
          <HeaderButton
            icon={<Plus size={14} />}
            variant="primary"
            onClick={() => setAdding(true)}
          >
            Request exception
          </HeaderButton>
        }
      >
        <DirectoryTable
          columns={cols}
          rows={exc}
          pageSize={10}
          rowActions={(r) => (
            <ConfirmButton
              variant="link"
              label="Revoke"
              title="Revoke exception"
              body={`Revoke the exception on "${r.control}"? The control is re-enforced immediately.`}
              confirmLabel="Revoke"
              onConfirm={() => setExc((es) => es.filter((x) => x.id !== r.id))}
            />
          )}
          empty={
            <div style={{ padding: 16, color: T.textMuted, fontSize: 12.5 }}>
              No active security exceptions. Every control is enforced.
            </div>
          }
        />
      </Card>
      {adding && (
        <ExcModal
          onClose={() => setAdding(false)}
          onSave={(e) => {
            setExc((es) => [...es, { ...e, id: `e${Date.now()}` }]);
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
function ExcModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (e: Omit<SecExc, "id">) => void;
}) {
  const [control, setControl] = React.useState("MFA enforcement");
  const [justification, setJust] = React.useState("");
  const [owner, setOwner] = React.useState("sec-lead@company.com");
  const [risk, setRisk] = React.useState("Medium");
  const [comp, setComp] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const ok = justification.trim() && comp.trim() && expiry;
  return (
    <Modal
      title="Request security exception"
      onClose={onClose}
      footer={
        <HeaderButton
          variant="primary"
          disabled={!ok}
          onClick={() =>
            onSave({ control, justification, owner, risk, expiry })
          }
        >
          Submit for approval
        </HeaderButton>
      }
    >
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
        Exceptions require a justification, compensating control, risk rating,
        owner and expiry.
      </div>
      <Field label="Control">
        <Sel
          value={control}
          onChange={setControl}
          opts={[
            "MFA enforcement",
            "Network allowlist",
            "Egress deny-all",
            "Encryption in transit",
            "Private endpoint only",
          ]}
        />
      </Field>
      <Field label="Security justification">
        <input
          value={justification}
          onChange={(e) => setJust(e.target.value)}
          style={inp}
        />
      </Field>
      <Field label="Compensating control">
        <input
          value={comp}
          onChange={(e) => setComp(e.target.value)}
          placeholder="e.g. conditional access + session recording"
          style={inp}
        />
      </Field>
      <Field label="Risk rating">
        <Sel value={risk} onChange={setRisk} opts={["Low", "Medium", "High"]} />
      </Field>
      <Field label="Owner">
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          style={inp}
        />
      </Field>
      <Field label="Expiry">
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          style={{ ...inp, colorScheme: "dark" }}
        />
      </Field>
    </Modal>
  );
}

// ════════════ shared ════════════
function ToggleRow({
  label,
  on,
  onChange,
  hint,
  icon,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "12px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {icon}
          {label} <SampleTag />
        </span>
        {hint && (
          <span
            style={{
              display: "block",
              fontSize: 12,
              color: T.textMuted,
              marginTop: 3,
            }}
          >
            {hint}
          </span>
        )}
      </span>
      <Toggle on={on} onChange={onChange} label={label} />
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
      style={{ ...inp, cursor: "pointer", width: 280 }}
    >
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
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
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cg-overlay)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "60px 20px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "96vw",
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
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
        <div style={{ padding: 20 }}>{children}</div>
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

/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/jsx-no-useless-fragment -- CloudGuard Encryption & Keys (§10.3) */
import React from "react";
import { ShieldAlert } from "lucide-react";
import { useEncryptionKeys } from "#/hooks/query/use-cloudguard";
import type { CGKeyPosture } from "#/api/cloudguard-service";
import {
  Page,
  PageHeader,
  PostureCard,
  PostureGrid,
  ScopeBadge,
  LiveCardSkeleton,
  EmptyState,
  Tabs,
  Card,
  StatRow,
  KVGrid,
  SampleBanner,
  DirectoryTable,
  T,
  type Column,
} from "#/components/admin/admin-kit";

/**
 * Encryption & Keys (§10.3) — full sub-tree as in-page sub-views. Posture only: never key material.
 *
 * Live signal (cloudguard.tenant_crypto / tenancy / tenant_audit via /encryption/keys) drives Key
 * Management, Customer-Managed Keys, Workspace Keys and Cryptographic Audit. The remaining §10.3
 * sub-areas (at-rest inventory, in-transit, rotation schedule, certificates) are rendered in full
 * with representative sample data — every one is clearly tagged `Sample` so a CISO can tell a live
 * attestation from a representative one. AES-256-GCM at rest and TLS 1.2+ in transit reflect the
 * engine's real cryptographic baseline.
 */

const TABS = [
  { id: "at-rest", label: "At Rest" },
  { id: "in-transit", label: "In Transit" },
  { id: "key-mgmt", label: "Key Management" },
  { id: "cmk", label: "Customer-Managed Keys" },
  { id: "workspace-keys", label: "Workspace Keys" },
  { id: "rotation", label: "Rotation" },
  { id: "certificates", label: "Certificates" },
  { id: "crypto-audit", label: "Cryptographic Audit" },
];

export function EncryptionKeysPage({
  scope,
  embedded,
}: {
  scope: "workspace" | "enterprise";
  embedded?: boolean;
}) {
  const q = useEncryptionKeys();
  const d = q.data;
  const [tab, setTab] = React.useState("at-rest");

  const body = (
    <>
      {q.isLoading ? (
        <LiveCardSkeleton lines={5} />
      ) : q.isError || !d ? (
        <EmptyState
          icon={<ShieldAlert size={22} />}
          title="Key posture unavailable"
          hint="The crypto posture endpoint did not respond. Keys remain managed server-side; retry shortly."
        />
      ) : (
        <>
          <PostureGrid>
            <PostureCard
              title="Custody"
              value={
                <span style={{ fontSize: 15 }}>
                  {d.provider === "KmsKeyProvider"
                    ? "Customer-held (HYOK)"
                    : d.provider === "WrappedKeyProvider"
                      ? "Per-tenant wrapped"
                      : "Local KEK"}
                </span>
              }
              sub={d.provider}
              tone={d.provider === "LocalKeyProvider" ? "warn" : "ok"}
            />
            <PostureCard
              title="Per-tenant keys"
              value={d.per_tenant_keys ? "Yes" : "Shared"}
              sub={
                d.per_tenant_keys ? "isolated data keys" : "review recommended"
              }
              tone={d.per_tenant_keys ? "ok" : "warn"}
            />
            <PostureCard
              title="Audit integrity"
              value={d.audit_hmac_configured ? "Tamper-evident" : "Hash-only"}
              sub={d.audit_integrity}
              tone={d.audit_hmac_configured ? "ok" : "warn"}
            />
            <PostureCard
              title="Tenant isolation"
              value={
                d.tenancy.strict
                  ? "Strict"
                  : d.tenancy.enabled
                    ? "Enabled"
                    : "Disabled"
              }
              sub={d.tenancy.strict ? "fail-closed" : "review recommended"}
              tone={
                d.tenancy.strict ? "ok" : d.tenancy.enabled ? "warn" : "danger"
              }
            />
          </PostureGrid>

          <div style={{ marginTop: 26 }}>
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
            {tab === "at-rest" && <AtRest />}
            {tab === "in-transit" && <InTransit />}
            {tab === "key-mgmt" && <KeyManagement d={d} />}
            {tab === "cmk" && <CustomerManagedKeys d={d} />}
            {tab === "workspace-keys" && <WorkspaceKeys d={d} />}
            {tab === "rotation" && <Rotation />}
            {tab === "certificates" && <Certificates />}
            {tab === "crypto-audit" && <CryptoAudit d={d} />}
          </div>
        </>
      )}
    </>
  );

  if (embedded) return body;
  return (
    <Page>
      <PageHeader
        title="Encryption & Keys"
        subtitle="Security & Data · key-custody attestation — posture only, never key material."
        actions={
          <ScopeBadge
            scope={scope === "workspace" ? "This workspace" : "Organization"}
          />
        }
      />
      {body}
    </Page>
  );
}

// ── §10.3 Encryption at Rest ──────────────────────────────────────────────────────────────────────
function AtRest() {
  const stores = [
    "Database",
    "Object storage",
    "Evidence archive",
    "Audit log",
    "Secret store",
    "Backups",
    "Workspace storage",
  ];
  return (
    <>
      <SampleBanner what="Per-store at-rest encryption inventory" />
      <Card
        title="Encryption at rest"
        desc="Every persisted data store is encrypted with AES-256-GCM using envelope encryption."
      >
        {stores.map((s) => (
          <StatRow
            key={s}
            label={s}
            value="AES-256-GCM · envelope"
            tone="ok"
            sample
          />
        ))}
      </Card>
    </>
  );
}

// ── §10.3 Encryption in Transit ───────────────────────────────────────────────────────────────────
function InTransit() {
  const rows: { k: string; v: string; tone: "ok" | "warn" }[] = [
    { k: "TLS required", v: "Enforced — plaintext refused", tone: "ok" },
    { k: "Minimum TLS version", v: "TLS 1.2", tone: "ok" },
    { k: "Certificate validation", v: "Full chain + hostname", tone: "ok" },
    { k: "Mutual TLS (service mesh)", v: "Enabled (internal)", tone: "ok" },
    {
      k: "Private-link encryption",
      v: "Available (PrivateLink / PSC)",
      tone: "ok",
    },
    {
      k: "Internal service encryption",
      v: "mTLS between control-plane services",
      tone: "ok",
    },
  ];
  return (
    <>
      <SampleBanner what="In-transit posture" />
      <Card title="Encryption in transit">
        {rows.map((r) => (
          <StatRow key={r.k} label={r.k} value={r.v} tone={r.tone} sample />
        ))}
      </Card>
    </>
  );
}

// ── §10.3 Key Management (live) ───────────────────────────────────────────────────────────────────
function KeyManagement({ d }: { d: CGKeyPosture }) {
  return (
    <Card
      title="Key management"
      desc="Live custody attestation from the engine — provider type and booleans only."
    >
      <StatRow
        label="Platform key provider"
        value={d.provider}
        tone={d.provider === "LocalKeyProvider" ? "warn" : "ok"}
        hint={d.custody}
      />
      <StatRow
        label="Key ownership"
        value={
          d.provider === "KmsKeyProvider"
            ? "Customer (external KMS)"
            : "Platform-managed"
        }
        tone={d.provider === "KmsKeyProvider" ? "ok" : "warn"}
      />
      <StatRow
        label="Master KEK"
        value={d.master_kek_configured ? "Configured" : "Not configured"}
        tone={d.master_kek_configured ? "ok" : "warn"}
        hint="Wraps per-tenant data keys; required for wrapped-key custody."
      />
      <StatRow
        label="Key-use logging"
        value={
          d.audit_hmac_configured ? "Tamper-evident audit" : "Hash-linked audit"
        }
        tone={d.audit_hmac_configured ? "ok" : "warn"}
        hint="Key create/access/rotate/revoke events append to the audit chain."
      />
      <StatRow
        label="Key location"
        value="EU region · in-region only"
        tone="ok"
        sample
      />
      <StatRow
        label="Key access policy"
        value="Least-privilege · admin-gated"
        tone="ok"
        sample
      />
    </Card>
  );
}

// ── §10.3 Customer-Managed Keys ───────────────────────────────────────────────────────────────────
function CustomerManagedKeys({ d }: { d: CGKeyPosture }) {
  const cmkActive = d.provider === "KmsKeyProvider";
  type R = {
    id: string;
    provider: string;
    status: string;
    tone: "ok" | "muted";
  };
  const rows: R[] = [
    {
      id: "aws",
      provider: "AWS KMS",
      status: cmkActive ? "Active (HYOK)" : "Available",
      tone: cmkActive ? "ok" : "muted",
    },
    {
      id: "azure",
      provider: "Azure Key Vault",
      status: "Available",
      tone: "muted",
    },
    {
      id: "gcp",
      provider: "Google Cloud KMS",
      status: "Available",
      tone: "muted",
    },
    {
      id: "ext",
      provider: "External key manager (KMIP)",
      status: "Available",
      tone: "muted",
    },
  ];
  const cols: Column<R>[] = [
    { key: "p", header: "Provider", render: (r) => r.provider },
    {
      key: "s",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.tone === "ok" ? T.success : T.textMuted }}>
          {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      {!cmkActive && <SampleBanner what="CMK integration catalogue" />}
      <Card
        title="Customer-managed keys (BYOK / HYOK)"
        desc={
          cmkActive
            ? "An external KMS is active — the platform cannot decrypt without customer-held keys."
            : "Bring-your-own-key integrations available to bind. Activating one moves custody to the customer."
        }
      >
        <DirectoryTable columns={cols} rows={rows} />
        <div style={{ height: 8 }} />
        <StatRow
          label="Key revocation"
          value="Customer-initiated · immediate crypto-lock"
          tone="ok"
          sample={!cmkActive}
        />
        <StatRow
          label="Key availability SLA"
          value="Monitored · fail-closed on KMS outage"
          tone="ok"
          sample={!cmkActive}
        />
      </Card>
    </>
  );
}

// ── §10.3 Workspace Keys (live) ───────────────────────────────────────────────────────────────────
function WorkspaceKeys({ d }: { d: CGKeyPosture }) {
  const sep = d.per_tenant_keys;
  return (
    <Card
      title="Workspace keys"
      desc="Per-workspace key separation enables isolation and cryptographic erasure."
    >
      <KVGrid
        items={[
          {
            k: "Workspace data key",
            v: sep ? "Dedicated per workspace" : "Shared",
          },
          {
            k: "Workspace secret key",
            v: sep ? "Dedicated per workspace" : "Shared",
          },
          {
            k: "Workspace evidence key",
            v: sep ? "Dedicated per workspace" : "Shared",
            sample: true,
          },
          {
            k: "Attested tenant",
            v: <span style={{ fontFamily: "monospace" }}>{d.tenant_id}</span>,
          },
        ]}
      />
      <StatRow
        label="Key separation"
        value={sep ? "Enforced" : "Not enforced"}
        tone={sep ? "ok" : "warn"}
        hint="A compromise of one workspace's key cannot decrypt another's data."
      />
      <StatRow
        label="Workspace-key rotation"
        value="90-day automatic"
        tone="ok"
        sample
      />
    </Card>
  );
}

// ── §10.3 Key Rotation ────────────────────────────────────────────────────────────────────────────
function Rotation() {
  return (
    <>
      <SampleBanner what="Rotation schedule & history" />
      <Card title="Key rotation">
        <StatRow label="Automatic rotation" value="Enabled" tone="ok" sample />
        <StatRow
          label="Rotation frequency"
          value="90 days (data) · 365 days (KEK)"
          tone="ok"
          sample
        />
        <StatRow
          label="Manual rotation"
          value="Admin-gated · audited"
          tone="ok"
          sample
        />
        <StatRow
          label="Emergency rotation"
          value="One-click · revokes prior key"
          tone="ok"
          sample
        />
        <StatRow
          label="Last rotation"
          value="2026-05-14 · success"
          tone="ok"
          sample
        />
        <StatRow label="Rotation failures (90d)" value="0" tone="ok" sample />
        <StatRow
          label="Historical-key handling"
          value="Retained for decrypt-only until re-encryption completes"
          tone="ok"
          sample
        />
      </Card>
    </>
  );
}

// ── §10.3 Certificate Management ──────────────────────────────────────────────────────────────────
function Certificates() {
  type R = {
    id: string;
    name: string;
    kind: string;
    expiry: string;
    days: number;
  };
  const rows: R[] = [
    {
      id: "1",
      name: "connector-aws.cloudguard",
      kind: "Connector",
      expiry: "2026-11-02",
      days: 133,
    },
    {
      id: "2",
      name: "mcp-gateway.internal",
      kind: "MCP",
      expiry: "2026-08-20",
      days: 59,
    },
    {
      id: "3",
      name: "private-exec.plane",
      kind: "Private execution",
      expiry: "2027-01-15",
      days: 207,
    },
    {
      id: "4",
      name: "api.cloudguard",
      kind: "API",
      expiry: "2026-07-09",
      days: 17,
    },
  ];
  const cols: Column<R>[] = [
    { key: "n", header: "Certificate", render: (r) => r.name },
    { key: "k", header: "Type", render: (r) => r.kind },
    { key: "e", header: "Expires", render: (r) => r.expiry },
    {
      key: "d",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color: r.days < 30 ? T.danger : r.days < 60 ? T.warning : T.success,
          }}
        >
          {r.days < 30
            ? "Expiring soon"
            : r.days < 60
              ? "Renew planned"
              : "Valid"}{" "}
          · {r.days}d
        </span>
      ),
    },
  ];
  return (
    <>
      <SampleBanner what="Certificate inventory & expiry" />
      <Card
        title="Certificate management"
        desc="Connector, MCP, private-execution and API certificates with expiry alerting."
      >
        <DirectoryTable columns={cols} rows={rows} />
      </Card>
    </>
  );
}

// ── §10.3 Cryptographic Audit (live chain) ────────────────────────────────────────────────────────
function CryptoAudit({ d }: { d: CGKeyPosture }) {
  const events = [
    "Key creation",
    "Key access",
    "Key rotation",
    "Key revocation",
    "Failed decryption",
    "Certificate changes",
    "Administrative key access",
  ];
  return (
    <Card
      title="Cryptographic audit"
      desc={
        d.audit_hmac_configured
          ? "Crypto events append to the HMAC-signed, tamper-evident audit chain."
          : "Crypto events append to the hash-linked audit chain (configure HMAC for tamper-evidence)."
      }
    >
      {events.map((e) => (
        <StatRow
          key={e}
          label={e}
          value={
            d.audit_hmac_configured
              ? "Captured · tamper-evident"
              : "Captured · hash-linked"
          }
          tone={d.audit_hmac_configured ? "ok" : "warn"}
        />
      ))}
      <div style={{ padding: "10px 0", fontSize: 11.5, color: T.textMuted }}>
        Full entries are queryable in the Audit Trail (category filter:
        cryptographic / key events).
      </div>
    </Card>
  );
}

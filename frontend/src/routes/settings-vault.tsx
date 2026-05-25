import React from "react";
import { Eye, EyeOff, Copy, RotateCcw, Trash2, Plus, Search, ShieldCheck, Key, Lock, Globe, Database, ChevronDown } from "lucide-react";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  danger: "var(--cg-danger)",
  cardBg: "var(--cg-bg-card)",
  navBg: "var(--cg-bg-primary-sidebar)",
  purple: "var(--cg-accent-purple)",
} as const;

type SecretType = "api_key" | "credential" | "certificate" | "token" | "connection_string";
type SecretEnv = "production" | "staging" | "development" | "global";

interface Secret {
  id: string;
  name: string;
  type: SecretType;
  env: SecretEnv;
  value: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  rotationDays?: number;
  usedBy: string[];
  tags: string[];
  version: number;
}

const TYPE_META: Record<SecretType, { label: string; color: string; bg: string }> = {
  api_key:           { label: "API Key",           color: S.accent,   bg: "rgba(45,134,212,0.12)" },
  credential:        { label: "Credential",         color: S.purple,   bg: "rgba(155,135,245,0.12)" },
  certificate:       { label: "Certificate",        color: S.success,  bg: "rgba(76,175,125,0.12)" },
  token:             { label: "Token",              color: S.warning,  bg: "rgba(224,154,45,0.12)" },
  connection_string: { label: "Connection String",  color: S.textMuted, bg: "rgba(150,143,133,0.12)" },
};

const ENV_META: Record<SecretEnv, { label: string; color: string }> = {
  production:  { label: "prod",  color: S.danger },
  staging:     { label: "stage", color: S.warning },
  development: { label: "dev",   color: S.success },
  global:      { label: "global", color: S.textMuted },
};

const SAMPLE_SECRETS: Secret[] = [
  {
    id: "s1", name: "AWS_ACCESS_KEY_ID", type: "api_key", env: "production",
    value: "AKIAIOSFODNN7EXAMPLE••••••••", description: "CloudGuard audit role access key for AWS Production",
    createdAt: "2026-03-01", updatedAt: "2026-05-12", expiresAt: "2026-09-01",
    rotationDays: 90, usedBy: ["CloudGuard Scanner", "CLI"], tags: ["aws", "iam"], version: 3,
  },
  {
    id: "s2", name: "GCP_SERVICE_ACCOUNT_JSON", type: "credential", env: "production",
    value: '{"type":"service_account","project_id":"x-planet-495913-r3"••••}',
    description: "GCP service account JSON for Vertex AI and SCC APIs",
    createdAt: "2026-02-14", updatedAt: "2026-05-17", rotationDays: 180,
    usedBy: ["CloudGuard Agent", "KG Sync"], tags: ["gcp", "vertex-ai"], version: 2,
  },
  {
    id: "s3", name: "NEO4J_PASSWORD", type: "credential", env: "production",
    value: "cg-neo4j-••••••••••••••••",
    description: "Neo4j knowledge graph admin password",
    createdAt: "2026-01-20", updatedAt: "2026-04-30",
    usedBy: ["cloudguard-kg-mcp"], tags: ["neo4j", "database"], version: 1,
  },
  {
    id: "s4", name: "AZURE_CLIENT_SECRET", type: "api_key", env: "staging",
    value: "cg-sp-••••••••••••••••••••••",
    description: "Azure service principal secret for EU staging subscription",
    createdAt: "2026-04-01", updatedAt: "2026-05-01", expiresAt: "2026-08-01",
    rotationDays: 90, usedBy: ["Azure EU Connector"], tags: ["azure", "sp"], version: 2,
  },
  {
    id: "s5", name: "SLACK_WEBHOOK_ALERTS", type: "token", env: "global",
    value: "https://hooks.slack.com/services/T00000000/B000••••••/••••••••••",
    description: "Slack webhook for critical finding alerts",
    createdAt: "2026-03-15", updatedAt: "2026-03-15",
    usedBy: ["Alert Engine"], tags: ["slack", "notifications"], version: 1,
  },
  {
    id: "s6", name: "PG_CONNECTION_STRING", type: "connection_string", env: "development",
    value: "postgresql://cloudguard:••••@localhost:5432/cloudguard_dev",
    description: "Local dev Postgres connection string",
    createdAt: "2026-01-10", updatedAt: "2026-01-10",
    usedBy: ["dev-only"], tags: ["postgres", "dev"], version: 1,
  },
  {
    id: "s7", name: "TLS_CERT_CLOUDGUARD_IO", type: "certificate", env: "production",
    value: "-----BEGIN CERTIFICATE----- MIIDXTCCAkWgAwIBAgIJA••••",
    description: "TLS certificate for cloudguard.io — auto-renewed via Let's Encrypt",
    createdAt: "2026-05-01", updatedAt: "2026-05-01", expiresAt: "2026-08-01",
    usedBy: ["Nginx / Ingress"], tags: ["tls", "cert"], version: 4,
  },
];

const AUDIT_LOG = [
  { ts: "2026-05-25 14:32", actor: "Rami Sentinel", action: "Accessed", secret: "GCP_SERVICE_ACCOUNT_JSON" },
  { ts: "2026-05-24 09:15", actor: "CloudGuard Scanner", action: "Read", secret: "AWS_ACCESS_KEY_ID" },
  { ts: "2026-05-23 18:04", actor: "Rami Sentinel", action: "Rotated", secret: "AWS_ACCESS_KEY_ID" },
  { ts: "2026-05-22 11:20", actor: "Jana Doe", action: "Created", secret: "SLACK_WEBHOOK_ALERTS" },
  { ts: "2026-05-20 16:45", actor: "Rami Sentinel", action: "Deleted", secret: "OLD_AWS_KEY" },
];

function TypeBadge({ type }: { type: SecretType }) {
  const m = TYPE_META[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", width: "fit-content", height: 18, padding: "0 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, color: m.color, background: m.bg, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

function EnvDot({ env }: { env: SecretEnv }) {
  const m = ENV_META[env];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content", fontSize: 11, color: m.color, fontFamily: "monospace" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, display: "inline-block", flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function MaskedValue({ value }: { value: string }) {
  const [show, setShow] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: S.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
        {show ? value : value.replace(/[^•]/g, (c, i) => i < 8 ? c : "•")}
      </span>
      <button type="button" onClick={() => setShow(v => !v)} style={{ background: "none", border: "none", color: S.textMuted, cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}>
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button type="button" onClick={handleCopy} style={{ background: "none", border: "none", color: copied ? S.success : S.textMuted, cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}>
        <Copy size={12} />
      </button>
    </div>
  );
}

function ExpiryIndicator({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  const color = days < 14 ? S.danger : days < 30 ? S.warning : S.textMuted;
  return (
    <span style={{ fontSize: 10, color, fontFamily: "monospace" }}>
      {days < 0 ? "EXPIRED" : `exp ${days}d`}
    </span>
  );
}

interface AddSecretModalProps { onClose: () => void; onSave: (s: Partial<Secret>) => void; }
function AddSecretModal({ onClose, onSave }: AddSecretModalProps) {
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [type, setType] = React.useState<SecretType>("api_key");
  const [env, setEnv] = React.useState<SecretEnv>("production");
  const [desc, setDesc] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [showVal, setShowVal] = React.useState(false);
  const [rotation, setRotation] = React.useState("");

  const sel = (v: string): React.CSSProperties => ({
    width: "100%", height: 34, padding: "0 10px", background: S.inputBg, border: `1px solid ${S.border}`,
    borderRadius: 6, color: S.textPrimary, fontSize: 13, outline: "none", appearance: "none" as const,
    fontFamily: "inherit",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--cg-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "var(--cg-bg-page)", border: `1px solid ${S.borderStrong}`, borderRadius: 10, width: 480, padding: 28, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: S.textPrimary }}>Add Secret</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: S.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {[
          { label: "Secret name", node: <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AWS_ACCESS_KEY_ID" style={{ ...sel(""), width: "100%", boxSizing: "border-box" as const }} /> },
          { label: "Type", node: <select value={type} onChange={e => setType(e.target.value as SecretType)} style={{ ...sel(""), background: S.inputBg }}>{(Object.entries(TYPE_META) as [SecretType, typeof TYPE_META[SecretType]][]).map(([k, v]) => <option key={k} value={k} style={{ background: "var(--cg-bg-card)" }}>{v.label}</option>)}</select> },
          { label: "Environment", node: <select value={env} onChange={e => setEnv(e.target.value as SecretEnv)} style={{ ...sel(""), background: S.inputBg }}>{(Object.entries(ENV_META) as [SecretEnv, typeof ENV_META[SecretEnv]][]).map(([k, v]) => <option key={k} value={k} style={{ background: "var(--cg-bg-card)" }}>{v.label}</option>)}</select> },
          { label: "Description", node: <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is this secret used for?" style={{ ...sel(""), width: "100%", boxSizing: "border-box" as const }} /> },
          { label: "Tags (comma-separated)", node: <input value={tags} onChange={e => setTags(e.target.value)} placeholder="aws, iam, production" style={{ ...sel(""), width: "100%", boxSizing: "border-box" as const }} /> },
          { label: "Rotation interval (days)", node: <input type="number" value={rotation} onChange={e => setRotation(e.target.value)} placeholder="90" style={{ ...sel(""), width: "100%", boxSizing: "border-box" as const }} /> },
        ].map(({ label, node }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: S.textMuted, marginBottom: 6 }}>{label}</label>
            {node}
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: S.textMuted, marginBottom: 6 }}>Secret value</label>
          <div style={{ position: "relative" }}>
            <input type={showVal ? "text" : "password"} value={value} onChange={e => setValue(e.target.value)}
              placeholder="Paste secret value…"
              style={{ ...sel(""), width: "100%", boxSizing: "border-box", paddingRight: 34, fontFamily: "monospace" }} />
            <button type="button" onClick={() => setShowVal(v => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: S.textMuted, cursor: "pointer", display: "flex", alignItems: "center" }}>
              {showVal ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ height: 34, padding: "0 16px", borderRadius: 6, background: "transparent", border: `1px solid ${S.borderStrong}`, color: S.textSecondary, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button type="button" onClick={() => { onSave({ name, value, type, env, description: desc, tags: tags.split(",").map(t => t.trim()).filter(Boolean), rotationDays: rotation ? parseInt(rotation) : undefined }); onClose(); }}
            disabled={!name || !value}
            style={{ height: 34, padding: "0 16px", borderRadius: 6, background: (!name || !value) ? "rgba(45,134,212,0.4)" : S.accent, color: "#fff", fontSize: 13, fontWeight: 500, border: "none", cursor: (!name || !value) ? "not-allowed" : "pointer" }}>
            Add Secret
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_ICONS: Record<SecretType, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  api_key: Key, credential: Lock, certificate: ShieldCheck, token: Globe, connection_string: Database,
};

export default function VaultSettings() {
  const [secrets, setSecrets] = React.useState<Secret[]>(SAMPLE_SECRETS);
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<SecretType | "all">("all");
  const [filterEnv, setFilterEnv] = React.useState<SecretEnv | "all">("all");
  const [showAdd, setShowAdd] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [showAudit, setShowAudit] = React.useState(false);

  const filtered = secrets.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.includes(search.toLowerCase()));
    const matchType = filterType === "all" || s.type === filterType;
    const matchEnv = filterEnv === "all" || s.env === filterEnv;
    return matchSearch && matchType && matchEnv;
  });

  const handleAdd = (partial: Partial<Secret>) => {
    const now = new Date().toISOString().slice(0, 10);
    setSecrets(prev => [...prev, {
      id: `s${Date.now()}`, name: partial.name!, type: partial.type!, env: partial.env!,
      value: partial.value!, description: partial.description ?? "", createdAt: now, updatedAt: now,
      usedBy: [], tags: partial.tags ?? [], version: 1, rotationDays: partial.rotationDays,
    }]);
  };

  const handleDelete = (id: string) => setSecrets(prev => prev.filter(s => s.id !== id));

  const handleRotate = (id: string) => {
    setSecrets(prev => prev.map(s => s.id === id ? { ...s, updatedAt: new Date().toISOString().slice(0, 10), version: s.version + 1 } : s));
  };

  const expiringCount = secrets.filter(s => {
    if (!s.expiresAt) return false;
    return Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 86400000) < 30;
  }).length;

  const selStyle: React.CSSProperties = {
    height: 32, padding: "0 10px", background: S.inputBg, border: `1px solid ${S.border}`,
    borderRadius: 6, color: S.textSecondary, fontSize: 12, outline: "none",
    appearance: "none", fontFamily: "inherit", cursor: "pointer",
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 880 }}>
      {showAdd && <AddSecretModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 400, color: S.textPrimary, marginBottom: 4, marginTop: 0 }}>Secret Vault</h1>
          <p style={{ fontSize: 13, color: S.textMuted, marginTop: 0, marginBottom: 0 }}>
            Enterprise-grade secret management — API keys, credentials, certificates, tokens.
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 6, background: S.accent, color: "#fff", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", flexShrink: 0 }}>
          <Plus size={14} /> Add Secret
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total secrets", value: secrets.length, color: S.textPrimary },
          { label: "Production", value: secrets.filter(s => s.env === "production").length, color: S.danger },
          { label: "Expiring <30d", value: expiringCount, color: expiringCount > 0 ? S.warning : S.textMuted },
          { label: "Avg version", value: (secrets.reduce((a, s) => a + s.version, 0) / secrets.length).toFixed(1), color: S.textMuted },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: S.cardBg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: S.textMuted, pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search secrets…"
            style={{ width: "100%", height: 32, padding: "0 10px 0 30px", background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as SecretType | "all")} style={selStyle}>
          <option value="all">All types</option>
          {(Object.entries(TYPE_META) as [SecretType, typeof TYPE_META[SecretType]][]).map(([k, v]) => <option key={k} value={k} style={{ background: "var(--cg-bg-card)" }}>{v.label}</option>)}
        </select>
        <select value={filterEnv} onChange={e => setFilterEnv(e.target.value as SecretEnv | "all")} style={selStyle}>
          <option value="all">All envs</option>
          {(Object.entries(ENV_META) as [SecretEnv, typeof ENV_META[SecretEnv]][]).map(([k, v]) => <option key={k} value={k} style={{ background: "var(--cg-bg-card)" }}>{v.label}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: S.textMuted }}>{filtered.length} secret{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Secrets table */}
      <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}`, marginBottom: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "28px 2fr 1fr 80px 72px 80px 96px", padding: "8px 16px", borderBottom: `1px solid ${S.border}`, background: S.navBg }}>
          {["", "Name", "Type", "Env", "Version", "Updated", ""].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 0, overflow: "hidden" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: S.textMuted, fontSize: 13 }}>No secrets match your filters.</div>
        )}

        {filtered.map((s, i) => {
          const TypeIcon = TYPE_ICONS[s.type];
          const isOpen = expanded === s.id;
          return (
            <React.Fragment key={s.id}>
              <div style={{ display: "grid", gridTemplateColumns: "28px 2fr 1fr 80px 72px 80px 96px", padding: "10px 16px", borderBottom: `1px solid var(--cg-border-subtle)`, alignItems: "center", cursor: "pointer", background: isOpen ? "rgba(255,255,255,0.025)" : "transparent" }}
                onClick={() => setExpanded(isOpen ? null : s.id)}>
                <TypeIcon size={13} color={TYPE_META[s.type].color} strokeWidth={1.8} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: S.textPrimary, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    <ExpiryIndicator expiresAt={s.expiresAt} />
                  </div>
                  {s.description && <span style={{ fontSize: 11, color: S.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{s.description}</span>}
                </div>
                <div style={{ minWidth: 0 }}><TypeBadge type={s.type} /></div>
                <div style={{ minWidth: 0 }}><EnvDot env={s.env} /></div>
                <span style={{ fontSize: 11, color: S.textMuted, fontFamily: "monospace" }}>v{s.version}</span>
                <span style={{ fontSize: 11, color: S.textMuted }}>{s.updatedAt}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                  {s.rotationDays && (
                    <button type="button" title={`Rotate (every ${s.rotationDays}d)`} onClick={() => handleRotate(s.id)}
                      style={{ background: "none", border: "none", color: S.textMuted, cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}>
                      <RotateCcw size={13} />
                    </button>
                  )}
                  <button type="button" title="Delete" onClick={() => handleDelete(s.id)}
                    style={{ background: "none", border: "none", color: S.textMuted, cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}>
                    <Trash2 size={13} />
                  </button>
                  <ChevronDown size={12} color={S.textMuted} style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease", flexShrink: 0 }} />
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: "14px 16px 16px 56px", background: "rgba(255,255,255,0.018)", borderBottom: `1px solid var(--cg-border-subtle)` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 4 }}>Secret value</div>
                      <MaskedValue value={s.value} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 4 }}>Used by</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {s.usedBy.map(u => (
                          <span key={u} style={{ fontSize: 10, color: S.textSecondary, background: "var(--cg-border-subtle)", padding: "1px 6px", borderRadius: 4 }}>{u}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 4 }}>Tags</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {s.tags.map(t => (
                          <span key={t} style={{ fontSize: 10, color: S.accent, background: "rgba(45,134,212,0.08)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    {s.rotationDays && (
                      <div>
                        <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 4 }}>Auto-rotation</div>
                        <span style={{ fontSize: 12, color: S.textSecondary }}>Every {s.rotationDays} days</span>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 4 }}>Created</div>
                      <span style={{ fontSize: 12, color: S.textSecondary, fontFamily: "monospace" }}>{s.createdAt}</span>
                    </div>
                    {s.expiresAt && (
                      <div>
                        <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 4 }}>Expires</div>
                        <span style={{ fontSize: 12, fontFamily: "monospace" }}><ExpiryIndicator expiresAt={s.expiresAt} /></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Audit log */}
      <div>
        <button type="button" onClick={() => setShowAudit(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: S.textSecondary, fontSize: 14, fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: 16 }}>
          <ChevronDown size={14} style={{ transform: showAudit ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }} />
          Access Audit Log
        </button>
        {showAudit && (
          <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 100px 1fr", padding: "8px 16px", borderBottom: `1px solid ${S.border}`, background: S.navBg }}>
              {["Time", "Actor", "Action", "Secret"].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>
            {AUDIT_LOG.map((entry, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 100px 1fr", padding: "9px 16px", borderBottom: i < AUDIT_LOG.length - 1 ? `1px solid var(--cg-border-subtle)` : "none", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: S.textMuted, fontFamily: "monospace" }}>{entry.ts}</span>
                <span style={{ fontSize: 12, color: S.textSecondary, minWidth: 0 }}>{entry.actor}</span>
                <span style={{ fontSize: 11, color: entry.action === "Deleted" ? S.danger : entry.action === "Rotated" ? S.warning : S.success }}>{entry.action}</span>
                <span style={{ fontSize: 11, color: S.textMuted, fontFamily: "monospace", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.secret}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

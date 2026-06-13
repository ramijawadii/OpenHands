import { openHands } from "#/api/open-hands-axios";

// CloudGuard management API (tenant + RBAC aware). Tenant is derived server-side from the
// verified token — the client never sends a tenant id. See
// docs/architecture/frontend-backend-wiring/05_FRONTEND_INTEGRATION_PLAN.md.

export interface CGMe {
  tenant_id: string;
  role: string;
  subject: string;
  capabilities: string[];
  max_tier: number;
}

export interface CGAuditEntry {
  seq: number;
  ts: string;
  actor: string;
  category: string;
  action: string;
  resource: string;
  decision: string;
  entry_hash: string;
  prev_hash: string;
  link?: string | null;
}

export interface CGLedger {
  entries: CGAuditEntry[];
  total: number;
  tenant_id: string;
}

export interface CGChain {
  ok: boolean;
  count: number;
  broken_at: number;
  reason: string;
}

export interface CGApproval {
  id: string;
  command: string;
  status: string;
  created_at: string;
  context?: Record<string, unknown>;
}

export interface CGRole {
  role: string;
  capabilities: string[];
  max_tier: number;
  is_default: boolean;
}

export interface CGGuardrails {
  autonomy_mode: string;
  action_gates: Record<string, string>;
}

export interface CGIsolation {
  tier: string;
  egress: string;
}

export interface CGLimits {
  tokens_per_run: number;
  tools_per_run: number;
  monthly_spend_cap_usd: number;
}

export interface CGResidency {
  region: string;
  retention_days: number;
}

export interface CGKill {
  scope: string;
  actor: string;
  reason: string;
  activated_at: string;
}

export interface CGErasurePending {
  id: string;
  tenant: string;
  requested_by: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface CGIncidentEvent {
  ts: string;
  type: string;
  event: string;
  actor: string;
}

export interface CGIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  type: string;
  owner: string;
  linked_runs: string[];
  linked_violations: number;
  created_at: string;
  updated_at: string;
  timeline: CGIncidentEvent[];
}

export interface CGOverride {
  id: string;
  scope: string;
  type: string;
  original: string;
  overridden: string;
  created_by: string;
  expires: string;
  status: string;
  created_at: string;
}

export interface CGSandbox {
  id: string;
  tenant: string;
  status: string;
  network: string;
  volume: string;
  kg_service: string;
  updated_at: string;
}

export interface CGRun {
  id: string;
  mode: string;
  status: string;
  started: string;
  activity: number;
  last_decision: string;
}

export interface CGKeyPosture {
  provider: string;
  custody: string;
  per_tenant_keys: boolean;
  master_kek_configured: boolean;
  audit_hmac_configured: boolean;
  audit_integrity: string;
  tenancy: { enabled: boolean; strict: boolean };
  tenant_id: string;
}

export interface CGCollectionItem {
  id: string;
  created_at: string;
  [k: string]: unknown;
}

export interface CGHealthSub {
  sub: string;
  a: string;
  b: string;
  st: string;
}

export interface CGRunEvent {
  seq: number;
  ts: string;
  type: string;
  action: string;
  resource: string;
  decision: string;
  actor: string;
}

export interface CGRunDetail {
  id: string;
  mode: string;
  status: string;
  started: string;
  plan_status: string;
  timeline: CGRunEvent[];
  activity: number;
}

export interface CGUsage {
  runs: number;
  actions: number;
  violations: number;
  by_category: Record<string, number>;
  by_actor: { actor: string; count: number }[];
  period: string;
  tenant_id: string;
}

export interface CGOverview {
  pending_approvals: number;
  violations: number;
  audit: { ok: boolean; count: number };
  tenancy: { enabled: boolean; strict: boolean };
  tenant_id: string;
}

export interface CGViolation {
  seq: number;
  ts: string;
  actor: string;
  rule: string;
  resource: string;
  decision: string;
  severity: string;
  workspace: string;
}

export interface CGHealthSubsystem {
  subsystem: string;
  status: "ok" | "degraded" | "fail" | "skip";
  score: number;
  summary: string;
  metrics: Record<string, number>;
  detail: { name: string; status: string; value: string }[];
  last_change_ts: string;
  // legacy compat (ACP card)
  sub: string;
  a: string;
  b: string;
  st: string;
}

export interface CGHealthSnapshot {
  overall: "ok" | "degraded" | "fail" | "skip";
  subsystems: CGHealthSubsystem[];
  tenant_id: string;
  ts: string;
}

export interface CGHealthFilters {
  conversation?: string;
  workspace?: string;
  user?: string;
  environment?: string;
  connector?: string;
}

export interface CGStoredSnapshot {
  ts: string;
  overall: string;
  subsystems: {
    subsystem: string;
    status: string;
    score: number;
    summary: string;
    metrics: Record<string, number>;
  }[];
}

export interface CGLlmModel {
  id: string;
  label: string;
  provider: string;
  versions: string[];
  context_window: number;
  max_output: number;
  capabilities: string[];
  price: {
    input_per_1m: number;
    output_per_1m: number;
    cached_input_per_1m: number;
  };
  status: string;
  vendor_default: boolean;
}
export interface CGLlmRegistry {
  models: CGLlmModel[];
  vendor_default: CGLlmModel | null;
  scheduled_upgrade: Record<string, unknown> | null;
}

const BASE = "/api/cloudguard";

export const CloudGuardService = {
  me: () => openHands.get<CGMe>(`${BASE}/me`).then((r) => r.data),
  auditLedger: (params?: {
    category?: string;
    actor?: string;
    limit?: number;
  }) =>
    openHands
      .get<CGLedger>(`${BASE}/audit/ledger`, { params })
      .then((r) => r.data),
  auditVerify: () =>
    openHands.get<CGChain>(`${BASE}/audit/verify`).then((r) => r.data),
  approvals: (status = "pending") =>
    openHands
      .get<{ approvals: CGApproval[] }>(`${BASE}/approvals`, {
        params: { status },
      })
      .then((r) => r.data.approvals),
  decideApproval: (id: string, approved: boolean, reason = "") =>
    openHands
      .post(`${BASE}/approvals/${id}/decision`, { approved, reason })
      .then((r) => r.data),
  orgRoles: () =>
    openHands
      .get<{ roles: CGRole[]; tier4_grantable: boolean }>(`${BASE}/org/roles`)
      .then((r) => r.data),
  violations: () =>
    openHands
      .get<{
        violations: CGViolation[];
        total: number;
      }>(`${BASE}/monitoring/violations`)
      .then((r) => r.data),
  overview: () =>
    openHands.get<CGOverview>(`${BASE}/overview`).then((r) => r.data),
  encryptionKeys: () =>
    openHands.get<CGKeyPosture>(`${BASE}/encryption/keys`).then((r) => r.data),
  runs: () =>
    openHands
      .get<{ runs: CGRun[]; total: number }>(`${BASE}/runs`)
      .then((r) => r.data),
  sandboxes: () =>
    openHands
      .get<{ sandboxes: CGSandbox[]; total: number }>(`${BASE}/sandboxes`)
      .then((r) => r.data),
  guardrails: () =>
    openHands.get<CGGuardrails>(`${BASE}/guardrails`).then((r) => r.data),
  isolation: () =>
    openHands.get<CGIsolation>(`${BASE}/isolation`).then((r) => r.data),
  limits: () =>
    openHands.get<CGLimits>(`${BASE}/workspace/limits`).then((r) => r.data),
  dataResidency: () =>
    openHands.get<CGResidency>(`${BASE}/data-residency`).then((r) => r.data),
  killSwitchStatus: () =>
    openHands
      .get<{
        active: CGKill[];
        any_active: boolean;
      }>(`${BASE}/enforcement/kill-switch`)
      .then((r) => r.data),
  killSwitchActivate: (scope: string, reason: string) =>
    openHands
      .post(`${BASE}/enforcement/kill-switch/activate`, { scope, reason })
      .then((r) => r.data),
  killSwitchResume: (scope: string, reason: string) =>
    openHands
      .post(`${BASE}/enforcement/kill-switch/resume`, { scope, reason })
      .then((r) => r.data),
  erasurePending: () =>
    openHands
      .get<{
        pending: CGErasurePending[];
      }>(`${BASE}/data-residency/erasure/pending`)
      .then((r) => r.data.pending),
  erasureRequest: (reason: string) =>
    openHands
      .post(`${BASE}/data-residency/erasure/request`, { reason })
      .then((r) => r.data),
  erasureApprove: (id: string, reason: string, confirm: string) =>
    openHands
      .post(`${BASE}/data-residency/erasure/${id}/approve`, { reason, confirm })
      .then((r) => r.data),
  erasureCancel: (id: string) =>
    openHands
      .delete(`${BASE}/data-residency/erasure/${id}`)
      .then((r) => r.data),
  overrides: () =>
    openHands
      .get<{ overrides: CGOverride[] }>(`${BASE}/enforcement/overrides`)
      .then((r) => r.data.overrides),
  createOverride: (body: {
    scope: string;
    type: string;
    original: string;
    overridden: string;
  }) =>
    openHands.post(`${BASE}/enforcement/overrides`, body).then((r) => r.data),
  revokeOverride: (id: string) =>
    openHands.delete(`${BASE}/enforcement/overrides/${id}`).then((r) => r.data),
  incidents: () =>
    openHands
      .get<{ incidents: CGIncident[] }>(`${BASE}/incidents`)
      .then((r) => r.data.incidents),
  incident: (id: string) =>
    openHands.get<CGIncident>(`${BASE}/incidents/${id}`).then((r) => r.data),
  createIncident: (body: {
    title: string;
    severity: string;
    type: string;
    owner: string;
  }) => openHands.post(`${BASE}/incidents`, body).then((r) => r.data),
  incidentStatus: (id: string, status: string) =>
    openHands
      .post(`${BASE}/incidents/${id}/status`, { status })
      .then((r) => r.data),
  usage: () => openHands.get<CGUsage>(`${BASE}/usage`).then((r) => r.data),
  monitoringHealth: () =>
    openHands
      .get<{ subsystems: CGHealthSub[] }>(`${BASE}/monitoring/health`)
      .then((r) => r.data.subsystems),
  runDetail: (id: string) =>
    openHands.get<CGRunDetail>(`${BASE}/runs/${id}`).then((r) => r.data),
  settingsDoc: (tab: string) =>
    openHands
      .get<{
        tab: string;
        doc: Record<string, unknown>;
      }>(`${BASE}/settings/${tab}`)
      .then((r) => r.data.doc),
  saveSettingsDoc: (tab: string, doc: Record<string, unknown>) =>
    openHands.put(`${BASE}/settings/${tab}`, doc).then((r) => r.data),
  collection: (seg: string) =>
    openHands
      .get<{ items: CGCollectionItem[] }>(`${BASE}/collections/${seg}`)
      .then((r) => r.data.items),
  collectionAdd: (seg: string, body: Record<string, unknown>) =>
    openHands.post(`${BASE}/collections/${seg}`, body).then((r) => r.data),
  collectionUpdate: (seg: string, id: string, body: Record<string, unknown>) =>
    openHands
      .patch(`${BASE}/collections/${seg}/${id}`, body)
      .then((r) => r.data),
  collectionRemove: (seg: string, id: string) =>
    openHands.delete(`${BASE}/collections/${seg}/${id}`).then((r) => r.data),
  health: (filters?: CGHealthFilters) =>
    openHands
      .get<CGHealthSnapshot>(`${BASE}/monitoring/health`, { params: filters })
      .then((r) => r.data),
  healthSeries: (subsystem: string, metric = "score", window = 120) =>
    openHands
      .get<{
        points: { ts: string; value: number }[];
      }>(`${BASE}/monitoring/health/series`, {
        params: { subsystem, metric, window },
      })
      .then((r) => r.data.points),
  healthSnapshots: (windowSec = 3600) =>
    openHands
      .get<{
        snapshots: CGStoredSnapshot[];
      }>(`${BASE}/monitoring/health/snapshots`, {
        params: { window_sec: windowSec },
      })
      .then((r) => r.data.snapshots),
  healthSnapshotAt: (at: string) =>
    openHands
      .get<CGStoredSnapshot>(`${BASE}/monitoring/health/snapshot`, {
        params: { at },
      })
      .then((r) => r.data),
  healthHistory: (limit = 200) =>
    openHands
      .get<{ events: CGAuditEntry[] }>(`${BASE}/monitoring/health/history`, {
        params: { limit },
      })
      .then((r) => r.data.events),
  healthProbe: () =>
    openHands.post(`${BASE}/monitoring/health/probe`).then((r) => r.data),
  healthAlertAck: (ruleId: string) =>
    openHands
      .post(`${BASE}/monitoring/health/alerts/${ruleId}/ack`)
      .then((r) => r.data),
  healthAlertTest: (rule: Record<string, unknown>) =>
    openHands
      .post(`${BASE}/monitoring/health/alerts/test`, rule)
      .then((r) => r.data),
  // ── Models & Inference ──
  llmConfig: () =>
    openHands
      .get<Record<string, unknown>>(`${BASE}/llm/config`)
      .then((r) => r.data),
  llmSaveConfig: (patch: Record<string, unknown>) =>
    openHands.put(`${BASE}/llm/config`, patch).then((r) => r.data),
  llmRegistry: () =>
    openHands.get<CGLlmRegistry>(`${BASE}/llm/registry`).then((r) => r.data),
  llmMigrate: (toModel: string, toVersion: string) =>
    openHands
      .post(`${BASE}/llm/models/migrate`, {
        to_model: toModel,
        to_version: toVersion,
      })
      .then((r) => r.data),
  llmRollback: () =>
    openHands.post(`${BASE}/llm/models/rollback`).then((r) => r.data),
  llmOverview: () =>
    openHands
      .get<Record<string, unknown>>(`${BASE}/llm/overview`)
      .then((r) => r.data),
  llmAnalytics: (section: string, params?: Record<string, string | number>) =>
    openHands
      .get<Record<string, unknown>>(`${BASE}/llm/${section}`, { params })
      .then((r) => r.data),
  llmLogs: (params?: Record<string, string | number>) =>
    openHands
      .get<{
        rows: Record<string, unknown>[];
        total: number;
      }>(`${BASE}/llm/logs`, { params })
      .then((r) => r.data),
  llmSeed: (n = 600) =>
    openHands
      .post(`${BASE}/llm/seed`, null, { params: { n } })
      .then((r) => r.data),
};

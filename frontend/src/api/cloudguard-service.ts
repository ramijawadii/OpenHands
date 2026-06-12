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
};

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
};

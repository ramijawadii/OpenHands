import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudGuardService } from "#/api/cloudguard-service";

// Debounced autosave of a settings doc — for tabs with many fields and no explicit Save button.
// Only fires after `ready` (the form has hydrated from the backend), so it never overwrites the
// stored doc with defaults on first render.
export const useAutosaveDoc = (
  tab: string,
  doc: Record<string, unknown>,
  ready: boolean,
) => {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const save = useSaveSettingsDoc(tab);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const json = JSON.stringify(doc);
  useEffect(() => {
    if (!ready) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(JSON.parse(json)), 600);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, ready]);
};

// `/me` bootstrap — cached app-wide by react-query so every <Capable> / session read shares it.
export const useCloudGuardSession = () => {
  const query = useQuery({
    queryKey: ["cloudguard", "me"],
    queryFn: CloudGuardService.me,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const capabilities = query.data?.capabilities ?? [];
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    capabilities,
    role: query.data?.role,
    tenantId: query.data?.tenant_id,
    can: (cap: string) => capabilities.includes(cap),
  };
};

export const useAuditLedger = (params?: {
  category?: string;
  actor?: string;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["cloudguard", "audit", "ledger", params],
    queryFn: () => CloudGuardService.auditLedger(params),
    retry: false,
  });

export const useAuditVerify = () =>
  useQuery({
    queryKey: ["cloudguard", "audit", "verify"],
    queryFn: CloudGuardService.auditVerify,
    retry: false,
  });

export const useGuardrails = () =>
  useQuery({
    queryKey: ["cloudguard", "guardrails"],
    queryFn: CloudGuardService.guardrails,
    retry: false,
    staleTime: 30 * 1000,
  });

export const useIsolation = () =>
  useQuery({
    queryKey: ["cloudguard", "isolation"],
    queryFn: CloudGuardService.isolation,
    retry: false,
    staleTime: 30 * 1000,
  });

export const useLimits = () =>
  useQuery({
    queryKey: ["cloudguard", "limits"],
    queryFn: CloudGuardService.limits,
    retry: false,
    staleTime: 30 * 1000,
  });

export const useKillSwitch = () =>
  useQuery({
    queryKey: ["cloudguard", "kill-switch"],
    queryFn: CloudGuardService.killSwitchStatus,
    retry: false,
  });

export const useKillActivate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, reason }: { scope: string; reason: string }) =>
      CloudGuardService.killSwitchActivate(scope, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "kill-switch"] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

export const useKillResume = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, reason }: { scope: string; reason: string }) =>
      CloudGuardService.killSwitchResume(scope, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "kill-switch"] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

export const useErasurePending = () =>
  useQuery({
    queryKey: ["cloudguard", "erasure", "pending"],
    queryFn: CloudGuardService.erasurePending,
    retry: false,
  });

export const useErasureRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => CloudGuardService.erasureRequest(reason),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cloudguard", "erasure"] }),
  });
};

export const useErasureApprove = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      confirm,
    }: {
      id: string;
      reason: string;
      confirm: string;
    }) => CloudGuardService.erasureApprove(id, reason, confirm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "erasure"] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

export const useErasureCancel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CloudGuardService.erasureCancel(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cloudguard", "erasure"] }),
  });
};

export const useCollection = (seg: string) =>
  useQuery({
    queryKey: ["cloudguard", "collection", seg],
    queryFn: () => CloudGuardService.collection(seg),
    retry: false,
  });

export const useAddCollectionItem = (seg: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      CloudGuardService.collectionAdd(seg, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cloudguard", "collection", seg] }),
  });
};

export const useUpdateCollectionItem = (seg: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      CloudGuardService.collectionUpdate(seg, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "collection", seg] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

export const useRemoveCollectionItem = (seg: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CloudGuardService.collectionRemove(seg, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "collection", seg] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

// Full-fidelity per-tab settings persistence. usePersistedForm hydrates a form's state from the
// backend doc and gives a save() that PUTs the whole state (every field round-trips).
export const useSettingsDoc = (tab: string) =>
  useQuery({
    queryKey: ["cloudguard", "settings", tab],
    queryFn: () => CloudGuardService.settingsDoc(tab),
    retry: false,
  });

export const useSaveSettingsDoc = (tab: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: Record<string, unknown>) =>
      CloudGuardService.saveSettingsDoc(tab, doc),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "settings", tab] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

export const useUsage = () =>
  useQuery({
    queryKey: ["cloudguard", "usage"],
    queryFn: CloudGuardService.usage,
    retry: false,
  });

export const useIncidents = () =>
  useQuery({
    queryKey: ["cloudguard", "incidents"],
    queryFn: CloudGuardService.incidents,
    retry: false,
  });

export const useCreateIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: CloudGuardService.createIncident,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "incidents"] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

export const useOverrides = () =>
  useQuery({
    queryKey: ["cloudguard", "overrides"],
    queryFn: CloudGuardService.overrides,
    retry: false,
  });

export const useCreateOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: CloudGuardService.createOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "overrides"] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

export const useRevokeOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CloudGuardService.revokeOverride(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cloudguard", "overrides"] }),
  });
};

export const useDataResidency = () =>
  useQuery({
    queryKey: ["cloudguard", "data-residency"],
    queryFn: CloudGuardService.dataResidency,
    retry: false,
    staleTime: 30 * 1000,
  });

export const useSandboxes = () =>
  useQuery({
    queryKey: ["cloudguard", "sandboxes"],
    queryFn: CloudGuardService.sandboxes,
    retry: false,
  });

export const useRuns = () =>
  useQuery({
    queryKey: ["cloudguard", "runs"],
    queryFn: CloudGuardService.runs,
    retry: false,
  });

export const useEncryptionKeys = () =>
  useQuery({
    queryKey: ["cloudguard", "encryption", "keys"],
    queryFn: CloudGuardService.encryptionKeys,
    retry: false,
    staleTime: 60 * 1000,
  });

export const useOverview = () =>
  useQuery({
    queryKey: ["cloudguard", "overview"],
    queryFn: CloudGuardService.overview,
    retry: false,
  });

export const useMonitoringHealth = () =>
  useQuery({
    queryKey: ["cloudguard", "monitoring", "health"],
    queryFn: CloudGuardService.monitoringHealth,
    retry: false,
  });

export const useRunDetail = (id: string | null) =>
  useQuery({
    queryKey: ["cloudguard", "run", id],
    queryFn: () => CloudGuardService.runDetail(id as string),
    enabled: !!id,
    retry: false,
  });

export const useViolations = () =>
  useQuery({
    queryKey: ["cloudguard", "monitoring", "violations"],
    queryFn: CloudGuardService.violations,
    retry: false,
  });

export const useOrgRoles = () =>
  useQuery({
    queryKey: ["cloudguard", "org", "roles"],
    queryFn: CloudGuardService.orgRoles,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

export const useApprovals = (status = "pending") =>
  useQuery({
    queryKey: ["cloudguard", "approvals", status],
    queryFn: () => CloudGuardService.approvals(status),
    retry: false,
  });

export const useDecideApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      approved,
      reason,
    }: {
      id: string;
      approved: boolean;
      reason?: string;
    }) => CloudGuardService.decideApproval(id, approved, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloudguard", "approvals"] });
      qc.invalidateQueries({ queryKey: ["cloudguard", "audit"] });
    },
  });
};

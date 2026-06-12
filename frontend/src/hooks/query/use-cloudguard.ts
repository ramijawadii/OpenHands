import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudGuardService } from "#/api/cloudguard-service";

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

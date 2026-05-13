import { useMutation, useQueryClient } from "@tanstack/react-query";
import OrgProfilesService, {
  SaveOrgLlmProfileRequest,
} from "#/api/organization-service/org-profiles-service.api";
import { ORG_LLM_PROFILES_QUERY_KEY } from "#/hooks/query/use-org-llm-profiles";
import { SETTINGS_QUERY_KEYS } from "#/hooks/query/query-keys";

export function useSaveOrgLlmProfile(orgId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      request,
    }: {
      name: string;
      request?: SaveOrgLlmProfileRequest;
    }) => {
      if (!orgId) throw new Error("Organization ID is required");
      await OrgProfilesService.saveProfile(orgId, name, request ?? {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ORG_LLM_PROFILES_QUERY_KEY, orgId],
      });
    },
  });
}

export function useDeleteOrgLlmProfile(orgId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!orgId) throw new Error("Organization ID is required");
      await OrgProfilesService.deleteProfile(orgId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ORG_LLM_PROFILES_QUERY_KEY, orgId],
      });
    },
  });
}

export function useActivateOrgLlmProfile(orgId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!orgId) throw new Error("Organization ID is required");
      await OrgProfilesService.activateProfile(orgId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ORG_LLM_PROFILES_QUERY_KEY, orgId],
      });
      // Also invalidate settings since the active LLM config changed
      queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEYS.byScope("org", orgId),
      });
    },
  });
}

export function useRenameOrgLlmProfile(orgId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      newName,
    }: {
      name: string;
      newName: string;
    }) => {
      if (!orgId) throw new Error("Organization ID is required");
      await OrgProfilesService.renameProfile(orgId, name, newName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ORG_LLM_PROFILES_QUERY_KEY, orgId],
      });
    },
  });
}

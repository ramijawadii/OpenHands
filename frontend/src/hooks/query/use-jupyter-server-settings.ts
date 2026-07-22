import { useQuery } from "@tanstack/react-query";
import { openHands } from "#/api/open-hands-axios";

/** serverSettings for the Jupyter proxy (step 3 of the jupyter-react track).
 *  Points at the control-plane proxy, never the raw sandbox — `token` is empty
 *  because the browser authenticates to the proxy via the app session. */
export interface JupyterServerSettings {
  available: boolean;
  baseUrl: string;
  wsUrl: string;
  token: string;
}

/** Fetches proxied Jupyter serverSettings for a conversation. `available` is
 *  false until the runtime image is rebuilt with the jupyter server + proxy
 *  live; callers fall back to the store-based notebook view in that case. */
export const useJupyterServerSettings = (conversationId?: string) =>
  useQuery({
    queryKey: ["jupyter", "settings", conversationId],
    enabled: !!conversationId,
    // gateway/token can change when a sandbox restarts; don't cache too long
    staleTime: 20_000,
    retry: 1,
    queryFn: async (): Promise<JupyterServerSettings> => {
      try {
        const { data } = await openHands.get<JupyterServerSettings>(
          `/api/conversations/${conversationId}/jupyter/settings`,
        );
        return data;
      } catch {
        // proxy not mounted yet / runtime down — degrade, never throw
        return { available: false, baseUrl: "", wsUrl: "", token: "" };
      }
    },
  });

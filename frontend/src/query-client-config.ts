import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { AxiosError } from "axios";
import { I18nKey } from "./i18n/declaration";
import { retrieveAxiosErrorMessage } from "./utils/retrieve-axios-error-message";
import { displayErrorToast } from "./utils/custom-toast-handlers";

const handle401Error = (error: AxiosError, queryClient: QueryClient) => {
  if (error?.response?.status === 401 || error?.status === 401) {
    queryClient.invalidateQueries({ queryKey: ["user", "authenticated"] });
  }
};

const shownErrors = new Set<string>();

/** 4xx means the request was wrong, not unlucky: retrying cannot change the
 *  outcome and only multiplies load on an already-failing path. Retry transport
 *  faults and 5xx/429 only. */
function isRetryableError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  if (status === undefined) return true; // network / timeout / abort
  if (status === 408 || status === 429) return true; // ask-again-later
  return status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Bounded retries with capped exponential backoff + jitter. Uncapped
      // backoff strands the UI for minutes; no jitter makes every client in a
      // tab-restore retry in lockstep and re-spike a recovering backend.
      retry: (failureCount, error) =>
        failureCount < 3 && isRetryableError(error),
      retryDelay: (attempt) =>
        Math.min(8_000, 2 ** attempt * 500) + Math.random() * 250,
      // A refetch on every window focus multiplies request volume by how often
      // the operator alt-tabs, for data that is already polled where it matters.
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
    mutations: {
      // Mutations are NOT idempotent by default — a blind retry can double an
      // action. Only retry when the request never reached the server.
      retry: (failureCount, error) =>
        failureCount < 1 &&
        (error as AxiosError)?.response?.status === undefined,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      const isAuthQuery =
        query.queryKey[0] === "user" && query.queryKey[1] === "authenticated";
      if (!isAuthQuery) {
        handle401Error(error, queryClient);
      }

      if (!query.meta?.disableToast) {
        const errorMessage = retrieveAxiosErrorMessage(error);

        if (!shownErrors.has(errorMessage || "")) {
          displayErrorToast(errorMessage || i18next.t(I18nKey.ERROR$GENERIC));
          shownErrors.add(errorMessage);

          setTimeout(() => {
            shownErrors.delete(errorMessage);
          }, 3000);
        }
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _, __, mutation) => {
      handle401Error(error, queryClient);

      if (!mutation?.meta?.disableToast) {
        const message = retrieveAxiosErrorMessage(error);
        displayErrorToast(message || i18next.t(I18nKey.ERROR$GENERIC));
      }
    },
  }),
});

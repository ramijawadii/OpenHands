import axios, { AxiosError, AxiosResponse } from "axios";
import {
  CircuitOpenError,
  isOpen,
  recordFailure,
  recordSuccess,
} from "#/components/features/reliability/circuit-breaker";

/**
 * A request with no timeout never settles, and a promise that never settles is
 * the worst failure mode in the stack: React Query only retries on ERROR, so a
 * hung backend produces a query that is neither loading-with-progress nor
 * failed. Every consumer waits forever and no recovery path can fire.
 *
 * 45s is deliberately generous — some CloudGuard calls do real work — but it is
 * finite, which is the only property that matters here. Long-running work
 * belongs behind a job id, not a held connection.
 */
export const REQUEST_TIMEOUT_MS = 45_000;

export const openHands = axios.create({
  baseURL: `${window.location.protocol}//${import.meta.env.VITE_BACKEND_BASE_URL || window?.location.host}`,
  timeout: REQUEST_TIMEOUT_MS,
});

// Helper function to check if a response contains an email verification error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const checkForEmailVerificationError = (data: any): boolean => {
  const EMAIL_NOT_VERIFIED = "EmailNotVerifiedError";

  if (typeof data === "string") {
    return data.includes(EMAIL_NOT_VERIFIED);
  }

  if (typeof data === "object" && data !== null) {
    if ("message" in data) {
      const { message } = data;
      if (typeof message === "string") {
        return message.includes(EMAIL_NOT_VERIFIED);
      }
      if (Array.isArray(message)) {
        return message.some(
          (msg) => typeof msg === "string" && msg.includes(EMAIL_NOT_VERIFIED),
        );
      }
    }

    // Search any values in object in case message key is different
    return Object.values(data).some(
      (value) =>
        (typeof value === "string" && value.includes(EMAIL_NOT_VERIFIED)) ||
        (Array.isArray(value) &&
          value.some(
            (v) => typeof v === "string" && v.includes(EMAIL_NOT_VERIFIED),
          )),
    );
  }

  return false;
};

/**
 * Circuit-breaker key for a request: METHOD + path with volatile segments
 * collapsed. Ids and uuids must NOT create a distinct circuit each, or the
 * breaker never accumulates enough failures on the route to trip.
 */
function circuitKey(config: { method?: string; url?: string }): string {
  const path = (config.url ?? "")
    .split("?")[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id")
    .replace(/\/\d+/g, "/:n");
  return `${(config.method ?? "get").toUpperCase()} ${path}`;
}

// Reject before hitting the network while a route's circuit is open. Retry
// policy bounds one query; this bounds the aggregate across every mount.
openHands.interceptors.request.use((config) => {
  const key = circuitKey(config);
  if (isOpen(key)) throw new CircuitOpenError(key);
  return config;
});

// Set up the global interceptor
openHands.interceptors.response.use(
  (response: AxiosResponse) => {
    recordSuccess(circuitKey(response.config));
    return response;
  },
  (error: AxiosError) => {
    // A rejected-by-breaker call is not new evidence about the endpoint; count
    // only real attempts, or the breaker would keep itself open forever.
    if (!(error instanceof CircuitOpenError) && error.config) {
      // 4xx means the CALLER is wrong; that says nothing about endpoint health
      // and must not trip the breaker for everyone else.
      const status = error.response?.status;
      const serverSideFault =
        status === undefined ||
        status === 408 ||
        status === 429 ||
        status >= 500;
      if (serverSideFault) recordFailure(circuitKey(error.config));
      else recordSuccess(circuitKey(error.config));
    }

    // Check if it's a 403 error with the email verification message
    if (
      error.response?.status === 403 &&
      checkForEmailVerificationError(error.response?.data)
    ) {
      if (window.location.pathname !== "/settings/user") {
        window.location.reload();
      }
    }

    // Continue with the error for other error handlers
    return Promise.reject(error);
  },
);

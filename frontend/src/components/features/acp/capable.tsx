import React from "react";
import { useCloudGuardSession } from "#/hooks/query/use-cloudguard";

// RBAC-driven hide-not-disable (ACP §1.4). The edge still enforces; this only avoids showing
// controls the role lacks. While the session loads we render nothing (no flicker of dead UI).
export function Capable({
  cap,
  children,
  fallback = null,
}: {
  cap: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  const { can, isLoading, isError } = useCloudGuardSession();
  // Fail-open in the UI only when the session endpoint is unavailable (e.g. backend not yet
  // deployed) so the mock UI still renders; the backend remains authoritative.
  if (isLoading) return null;
  if (isError) return children;
  return can(cap) ? children : fallback;
}

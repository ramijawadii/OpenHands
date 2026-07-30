/* eslint-disable i18next/no-literal-string */
import React from "react";
import { SurfaceErrorBoundary } from "#/components/features/reliability/surface-error-boundary";

/**
 * TabErrorBoundary — per-tab blast-radius containment (FAIL_SAFE_ISOLATION_SPEC
 * §4 Gap 1). Now a thin adapter over {@link SurfaceErrorBoundary} so tab
 * crashes get the same automatic single retry and, more importantly, are
 * COUNTED: previously a tab crash only reached `console.error`, so there was no
 * way to answer "how often does Canvas fail in production?".
 */
export function TabErrorBoundary({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <SurfaceErrorBoundary surface="tab" name={`The ${name} tab`}>
      {children}
    </SurfaceErrorBoundary>
  );
}

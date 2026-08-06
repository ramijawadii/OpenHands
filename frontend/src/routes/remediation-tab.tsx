/* eslint-disable i18next/no-literal-string */
import React from "react";
import { SurfaceErrorBoundary } from "#/components/features/reliability/surface-error-boundary";
import { RemediationActionsList } from "#/components/features/remediation/RemediationActionsList";
import { RemediationActionView } from "#/components/features/remediation/RemediationActionView";
import {
  buildActions,
  type RemediationAction,
} from "#/components/features/remediation/remediation-data";

/**
 * Remediation Workflow — the two halves of the specified structure.
 *
 *   Remediation Actions  → the list (search, filters, saved views, bulk, table)
 *   Remediation Action   → one record, in the event drawer's own shell
 *
 * List and record are one surface with two states rather than two routes: the
 * drawer has no address bar, so a route change here would have no visible
 * affordance and no Back. The record's own "Actions" button is the way out,
 * exactly as the event report returns to Reports.
 */
function RemediationTab() {
  const actions = React.useMemo(() => buildActions(48), []);
  const [openId, setOpenId] = React.useState<string | null>(null);

  // Resolved by id, not held as an object: keeping the selected row itself
  // would pin a stale copy if the underlying list were ever regenerated.
  const open: RemediationAction | null = React.useMemo(
    () => actions.find((a) => a.id === openId) ?? null,
    [actions, openId],
  );

  return (
    <SurfaceErrorBoundary
      surface="explore"
      name="Remediation workflow"
      resetKeys={[openId]}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        {open ? (
          <RemediationActionView action={open} onBack={() => setOpenId(null)} />
        ) : (
          <RemediationActionsList
            actions={actions}
            onOpen={(a) => setOpenId(a.id)}
          />
        )}
      </div>
    </SurfaceErrorBoundary>
  );
}

export default RemediationTab;

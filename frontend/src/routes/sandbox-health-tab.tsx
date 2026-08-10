/* eslint-disable i18next/no-literal-string */
import { SurfaceErrorBoundary } from "#/components/features/reliability/surface-error-boundary";
import { ArtifactSettingsView } from "#/components/features/artifact-settings/ArtifactSettingsView";

/**
 * The drawer's Settings tab.
 *
 * Five views — AI · Runtime · Context · Sharing · Maintenance — in the same
 * `SideRailPanel` shell the Remediation record and the event report use.
 *
 * Scope note worth keeping: Platform Settings own what is permitted and
 * Workspace Settings the team default. This tab is **operational** — it decides
 * how THIS artifact runs within both, and every control shows where its value
 * came from and what its ceiling is. See docs/settings/artifact-drawer/.
 *
 * The file keeps its historical name because the drawer's tab key is `sandbox`
 * and the persisted selection in localStorage resolves through it; renaming the
 * route without a migration would drop returning users onto an empty panel.
 */
function SandboxHealthTab() {
  return (
    <SurfaceErrorBoundary surface="explore" name="Artifact settings">
      <div className="flex h-full w-full flex-col overflow-hidden">
        <ArtifactSettingsView />
      </div>
    </SurfaceErrorBoundary>
  );
}

export default SandboxHealthTab;

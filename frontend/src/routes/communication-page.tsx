/* eslint-disable i18next/no-literal-string */
import CommunicationTab from "#/routes/communication-tab";

/** Communication — moved out of the per-conversation drawer to a top-level
 *  sidebar destination (replacing "Issues"). Reuses the same Approvals /
 *  Channels / Activity surface, now as a full page.
 */
export default function CommunicationPage() {
  return (
    <div className="h-full w-full bg-[var(--cg-bg-page)]">
      <CommunicationTab />
    </div>
  );
}

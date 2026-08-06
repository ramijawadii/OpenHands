/* eslint-disable i18next/no-literal-string -- operator diagnostics page */
import { Page, PageHeader } from "#/components/admin/admin-kit";
import { ReliabilityPanel } from "#/components/features/reliability/reliability-panel";

/**
 * Settings → Operations → UI Reliability.
 *
 * The read side of the reliability plane. Deliberately a real page rather than a
 * console command: during an incident the person who needs "is the UI healthy?"
 * is often not the person who knows to type `__cgSlo()`.
 */
export default function SettingsReliability() {
  return (
    <Page>
      <PageHeader
        title="UI reliability"
        subtitle="Error budgets, open circuits and recent failures for this browser session. Counters are per-session; the durable per-tenant history is written by the client-events sink."
      />
      <ReliabilityPanel />
    </Page>
  );
}

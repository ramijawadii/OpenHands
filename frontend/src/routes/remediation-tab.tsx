/* eslint-disable i18next/no-literal-string */
import { Workflow } from "lucide-react";

/** Remediation Workflow — the gated path a mutating action travels:
 *  propose → blast radius → shadow simulate → approve → apply → verify.
 *  Placeholder; the detailed view is built later. */
function RemediationTab() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--cg-accent-purple-bg)] text-[var(--cg-accent-purple)]">
        <Workflow className="h-5 w-5" />
      </div>
      <div className="text-[14px] font-medium text-[var(--cg-text-primary)]">
        Remediation Workflow
      </div>
      <p className="max-w-xs text-[12px] leading-relaxed text-[var(--cg-text-muted)]">
        The gated path every mutating action travels — propose, blast radius,
        shadow simulation, approval, apply, verify. Not built yet.
      </p>
    </div>
  );
}

export default RemediationTab;

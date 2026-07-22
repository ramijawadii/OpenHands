/* eslint-disable i18next/no-literal-string */
import { Activity } from "lucide-react";

/** Sandbox Health — OS, CPU/memory/disk/bandwidth and running processes for the
 *  isolated execution sandbox. Placeholder.
 *
 *  Deliberately empty: the metrics must come from inside the sandbox (a /metrics
 *  endpoint on action_execution_server, reading cgroup limits), NOT from the
 *  control plane's psutil, which measures the app container instead. Showing the
 *  latter would be confidently wrong data. Also gated on edge auth — OS and
 *  process listings are recon-grade and must be tenant-scoped. */
function SandboxHealthTab() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--cg-accent-purple-bg)] text-[var(--cg-accent-purple)]">
        <Activity className="h-5 w-5" />
      </div>
      <div className="text-[14px] font-medium text-[var(--cg-text-primary)]">
        Sandbox Health
      </div>
      <p className="max-w-xs text-[12px] leading-relaxed text-[var(--cg-text-muted)]">
        OS, CPU, memory, disk, bandwidth and running processes for the isolated
        sandbox. Awaiting the in-sandbox metrics endpoint. Not built yet.
      </p>
    </div>
  );
}

export default SandboxHealthTab;

/* eslint-disable i18next/no-literal-string -- CloudGuard pinned emergency control */
import React from "react";
import { Siren, Play } from "lucide-react";
import {
  useKillSwitch,
  useKillActivate,
  useKillResume,
  useCloudGuardSession,
} from "#/hooks/query/use-cloudguard";
import { ConfirmButton, T } from "./admin-kit";

/**
 * Always-visible emergency stop, pinned in the console header (§9.9 org / §39.8 workspace). A CISO
 * must be able to halt agent activity in one click from anywhere — not by navigating into a policy
 * sub-tab. Wired to the live /enforcement/kill-switch endpoint; shows STOPPED + Resume when active.
 */
export function EmergencyButton({
  scope,
}: {
  scope: "enterprise" | "workspace";
}) {
  const ks = useKillSwitch();
  const activate = useKillActivate();
  const resume = useKillResume();
  const session = useCloudGuardSession();
  const canEdit = session.can("admin");
  const target = scope === "enterprise" ? "org" : "workspace";
  const active = (ks.data?.active ?? []).some((a) => a.scope === target);

  if (active) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 30,
          padding: "0 10px",
          borderRadius: 6,
          background: "var(--cg-danger-bg)",
          border: `1px solid var(--cg-danger-border)`,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11.5,
            fontWeight: 600,
            color: T.danger,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: T.danger,
            }}
          />
          STOPPED
        </span>
        <ConfirmButton
          variant="link"
          label={
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Play size={12} /> Resume
            </span>
          }
          title={`Resume ${target} operations`}
          body="This lifts the emergency stop and allows workflows and write actions to resume. The action is audited."
          confirmLabel="Resume"
          disabled={!canEdit}
          disabledReason="Requires Admin capability"
          onConfirm={() =>
            resume.mutate({
              scope: target,
              reason: "Resumed from console header",
            })
          }
        />
      </span>
    );
  }

  return (
    <ConfirmButton
      variant="ghost"
      style={{ height: 30, padding: "0 11px", fontSize: 12.5 }}
      label={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Siren size={13} /> Emergency stop
        </span>
      }
      title={`Emergency stop — ${target}`}
      body={`This immediately halts ${
        scope === "enterprise" ? "the entire organization" : "this workspace"
      }: workflows stop, sandboxes terminate, writes are disabled. Evidence is preserved. Type the confirmation word to proceed.`}
      confirmWord="STOP"
      confirmLabel="Activate emergency stop"
      disabled={!canEdit}
      disabledReason="Requires Admin capability"
      onConfirm={() =>
        activate.mutate({
          scope: target,
          reason: "Activated from console header",
        })
      }
    />
  );
}

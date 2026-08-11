import React from "react";
import { useParams } from "react-router";
import { openHands } from "#/api/open-hands-axios";

/**
 * The composer's mode pill, wired to the real execution mode.
 *
 * It was pure local state: picking "Autonomous" changed a label and nothing
 * else, while the agent kept running under whatever mode the backend had. The
 * backend has owned this since the mode-gate work — `GET/POST
 * /api/cloudguard/mode`, values `autonomous | ask | plan` — the composer simply
 * never talked to it. A control that silently does nothing is worse than no
 * control, because the user believes they have set a safety posture.
 *
 * "Edit auto" is deliberately mapped onto `ask`: the backend has three modes,
 * and the honest mapping for a label that promises unattended edits but
 * attended everything-else is the one that still asks.
 */

/** Composer label → backend mode. */
const LABEL_TO_MODE: Record<string, string> = {
  Manual: "ask",
  "Edit auto": "ask",
  Plan: "plan",
  Autonomous: "autonomous",
};

/** Backend mode → composer label. `ask` resolves to Manual, its stricter face. */
const MODE_TO_LABEL: Record<string, string> = {
  ask: "Manual",
  plan: "Plan",
  autonomous: "Autonomous",
};

export function useExecutionMode(initialLabel: string) {
  const { conversationId } = useParams();
  const [label, setLabel] = React.useState(initialLabel);

  // Adopt whatever the backend already has, so the pill shows the real posture
  // rather than a default that happens to disagree with it.
  React.useEffect(() => {
    let alive = true;
    openHands
      .get("/api/cloudguard/mode", { params: { conversation_id: conversationId } })
      .then(({ data }) => {
        const next = MODE_TO_LABEL[data?.mode];
        if (alive && next) setLabel(next);
      })
      .catch(() => {
        /* endpoint absent — the pill stays local, as before */
      });
    return () => {
      alive = false;
    };
  }, [conversationId]);

  const change = React.useCallback(
    (nextLabel: string) => {
      // Optimistic: the pill answers the click, the POST confirms it.
      setLabel(nextLabel);
      const mode = LABEL_TO_MODE[nextLabel];
      if (!mode) return;
      openHands
        .post("/api/cloudguard/mode", {
          conversation_id: conversationId ?? "",
          mode,
        })
        .catch(() => {
          /* leave the optimistic label; the next GET reconciles it */
        });
    },
    [conversationId],
  );

  return { label, change };
}

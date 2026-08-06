import React from "react";
import { openHands } from "#/api/open-hands-axios";

/**
 * Layer 2 live co-pilot (client side). When an editor is open, the agent can send
 * live commands (highlight cells, add a comment, scroll) that execute in THIS
 * editor and the analyst watches them happen.
 *
 * Robustness (mirrors the backend SRE model — every path degrades cleanly):
 *  - registers only AFTER onDocumentReady (ready-gate — no lost early commands)
 *  - the poll doubles as the heartbeat; stop polling on unmount → the backend TTL
 *    expires the session → the agent silently routes headless (Layer 1)
 *  - each command is executed in a try/catch and ACKed with ok/error, so a bad
 *    macro or a closed tab never hangs the agent (it times out → falls back)
 *  - `agentWorking` drives a calm "Agent is working…" chip so live changes never
 *    startle the user
 */
type Connector = {
  callCommand: (fn: () => void, cb?: (r: unknown) => void) => void;
  executeMethod: (
    name: string,
    args: unknown[],
    cb?: (r: unknown) => void,
  ) => void;
  disconnect?: () => void;
};

interface LiveCommand {
  id: string;
  op: string;
  args: Record<string, unknown>;
}

const POLL_MS = 1000;

// Build a self-contained Office-JS function for callCommand (which serializes the
// function source — so values must be interpolated in, not closed over).
function highlightFn(range: string, rgb: number[]): () => void {
  const [r, g, b] = rgb.length === 3 ? rgb : [248, 81, 73];
  const body =
    `var s=Api.GetActiveSheet();var rng=s.GetRange(${JSON.stringify(range)});` +
    `rng.SetFillColor(Api.CreateColorFromRGB(${Math.round(r)},${Math.round(g)},${Math.round(b)}));`;
  // callCommand serializes the function source, so values must be baked in (not
  // closed over) — Function() is the only way to build a self-contained macro.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  return new Function(body) as () => void;
}

function runCommand(
  connector: Connector,
  cmd: LiveCommand,
): Promise<{
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
}> {
  return new Promise((resolve) => {
    const done = (v: {
      ok: boolean;
      result?: Record<string, unknown>;
      error?: string;
    }) => resolve(v);
    // Hard safety timeout so a callback that never fires can't wedge the queue.
    const guard = window.setTimeout(
      () => done({ ok: false, error: "editor callback timeout" }),
      2500,
    );
    const finish = (v: {
      ok: boolean;
      result?: Record<string, unknown>;
      error?: string;
    }) => {
      window.clearTimeout(guard);
      done(v);
    };
    try {
      const a = cmd.args || {};
      if (cmd.op === "highlight") {
        connector.callCommand(
          highlightFn(String(a.range ?? "A1"), (a.rgb as number[]) ?? []),
          () => finish({ ok: true, result: { range: String(a.range ?? "") } }),
        );
      } else if (cmd.op === "comment") {
        connector.executeMethod(
          "AddComment",
          [{ Text: String(a.text ?? ""), UserName: "Inference Defense" }],
          (r) => finish({ ok: true, result: { id: r as string } }),
        );
      } else if (cmd.op === "scroll") {
        connector.executeMethod("SetSelection", [String(a.cell ?? "A1")], () =>
          finish({ ok: true }),
        );
      } else {
        finish({ ok: false, error: `unknown op: ${cmd.op}` });
      }
    } catch (e) {
      finish({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
}

export function useOnlyOfficeLive(
  editorId: string,
  conversationId?: string,
  filePath?: string,
  tab: string = "",
) {
  const connectorRef = React.useRef<Connector | null>(null);
  const [agentWorking, setAgentWorking] = React.useState(false);
  const enabled = Boolean(conversationId && filePath);

  // Acquire the connector on MOUNT by polling for the editor instance — we do NOT
  // depend on the onDocumentReady event firing (it doesn't, reliably, in this
  // embed). Once the instance + createConnector exist, register + start polling.
  //
  // NOTE: `createConnector` is an ONLYOFFICE *Developer Edition* feature. The
  // community Document Server exposes the editor instance but NOT createConnector,
  // so on that build this loop finds the instance, never gets a connector, and
  // silently gives up after the window — the agent then operates headless (it
  // writes files, which the user reopens). If a Developer-Edition DS is swapped
  // in, this same code lights up live editing with no changes.
  React.useEffect(() => {
    if (!enabled) return undefined;
    const w = window as unknown as {
      DocEditor?: {
        instances?: Record<string, { createConnector?: () => Connector }>;
      };
    };
    let cancelled = false;
    let attempts = 0;
    let pollTimer: number | undefined;

    const startPollLoop = () => {
      const poll = async () => {
        if (cancelled || !connectorRef.current) return;
        try {
          const { data } = await openHands.get("/api/onlyoffice/live/poll", {
            params: { conversation_id: conversationId, path: filePath },
          });
          const cmds = (data?.commands as LiveCommand[]) ?? [];
          if (cmds.length === 0) return;
          setAgentWorking(true);
          for (const cmd of cmds) {
            // eslint-disable-next-line no-await-in-loop
            const res = await runCommand(connectorRef.current, cmd);
            // eslint-disable-next-line no-await-in-loop
            await openHands
              .post("/api/onlyoffice/live/ack", { id: cmd.id, ...res })
              .catch(() => {});
          }
          setAgentWorking(false);
        } catch {
          /* transient — next tick retries; backend TTL handles a real outage */
        }
      };
      pollTimer = window.setInterval(poll, POLL_MS);
    };

    const tryConnect = () => {
      if (cancelled) return;
      const inst = w.DocEditor?.instances?.[editorId];
      if (inst && typeof inst.createConnector === "function") {
        try {
          connectorRef.current = inst.createConnector();
          openHands
            .post("/api/onlyoffice/live/register", {
              conversationId,
              filePath,
              editorId,
              tab,
            })
            .catch(() => {});
          startPollLoop();
          return;
        } catch {
          /* connector unavailable on this DS build — fall through to headless */
        }
      }
      attempts += 1;
      // Community DS never exposes createConnector; give up quietly after the
      // window and let the agent operate headless.
      if (attempts < 30) window.setTimeout(tryConnect, 500);
    };
    tryConnect();

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      openHands
        .post("/api/onlyoffice/live/deregister", { conversationId, filePath })
        .catch(() => {});
      try {
        connectorRef.current?.disconnect?.();
      } catch {
        /* editor already gone */
      }
      connectorRef.current = null;
    };
  }, [enabled, editorId, conversationId, filePath, tab]);

  return { onDocumentReady: () => {}, agentWorking };
}

/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useWsClient } from "#/context/ws-client-provider";
import { useAgentStore } from "#/stores/agent-store";
import { AgentState } from "#/types/agent-state";
import { generateAgentStateChangeEvent } from "#/services/agent-state-service";
import { createChatMessage } from "#/services/chat-service";
import { isOpenHandsAction } from "#/types/core/guards";
import { OpenHandsParsedEvent } from "#/types/core";
import { useEventMessageStore } from "#/stores/event-message-store";

/**
 * Ask-before action confirmation, rendered in a GRAY banner attached to the chatbox
 * (NOT inline in the chat). Driven by the native AWAITING_USER_CONFIRMATION state: the
 * agent's _apply_ask_mode marks consequential actions HIGH so the controller pauses;
 * this banner shows the EXACT action (command / code, or a red/green diff for edits)
 * with View more, and Approve / Reject / Other. Approve→USER_CONFIRMED, Reject→
 * USER_REJECTED; Other rejects and sends the user's alternative instruction.
 */

interface Described {
  title: string;
  command?: string; // shell or python — shown verbatim under "view more"
  oldStr?: string; // edit: removed (red)
  newStr?: string; // edit: added (green)
  createText?: string; // new file content (green)
}

function describeAction(action: {
  action: string;
  args: Record<string, unknown>;
}): Described {
  const a = action.args || {};
  const s = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v == null) return "";
    return String(v);
  };
  if (action.action === "run") {
    return { title: "Run a shell command", command: s(a.command) };
  }
  if (action.action === "run_ipython") {
    return { title: "Run a Python cell", command: s(a.code) };
  }
  if (action.action === "edit" || action.action === "write") {
    const path = s(a.path) || "a file";
    if (a.old_str !== undefined || a.new_str !== undefined) {
      return {
        title: `Edit ${path}`,
        oldStr: s(a.old_str),
        newStr: s(a.new_str),
      };
    }
    return { title: `Write ${path}`, createText: s(a.file_text ?? a.content) };
  }
  return { title: action.action, command: JSON.stringify(a, null, 2) };
}

function DiffBlock({
  oldStr,
  newStr,
  createText,
  command,
}: Omit<Described, "title">) {
  if (oldStr !== undefined || newStr !== undefined) {
    return (
      <pre className="border-border max-h-64 overflow-auto rounded-md border bg-transparent p-2 text-[11px] leading-snug whitespace-pre-wrap">
        {(oldStr || "").split("\n").map((l, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`o${i}`}
            className="bg-red-900/30 text-red-200"
          >{`- ${l}`}</div>
        ))}
        {(newStr || "").split("\n").map((l, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`n${i}`}
            className="bg-green-900/30 text-green-200"
          >{`+ ${l}`}</div>
        ))}
      </pre>
    );
  }
  const text = createText !== undefined ? createText : command;
  return (
    <pre className="border-border max-h-64 overflow-auto rounded-md border bg-transparent p-2 text-[11px] leading-snug whitespace-pre-wrap text-foreground">
      {text || "(nothing to show)"}
    </pre>
  );
}

const RUNNABLE_ACTIONS = [
  "run",
  "run_ipython",
  "edit",
  "write",
  "browse",
  "browse_interactive",
  "mcp",
  "call_tool",
];

export function ConfirmationBanner() {
  const { send, parsedEvents } = useWsClient();
  const { curAgentState } = useAgentStore();
  const addSubmittedEventId = useEventMessageStore(
    (state) => state.addSubmittedEventId,
  );
  const [show, setShow] = React.useState(false);
  const [other, setOther] = React.useState(false);
  const [otherText, setOtherText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // The agent action awaiting confirmation. Prefer the explicit
  // args.confirmation_state flag (CmdRun/IPython carry it), but FALL BACK to the most
  // recent runnable agent action whenever the agent state is AWAITING_USER_CONFIRMATION
  // — FileEditAction does NOT serialize confirmation_state into args, which previously
  // hid the banner and left the user stuck.
  const awaiting = React.useMemo(() => {
    const rev = parsedEvents.slice().reverse();
    const isAgentAction = (
      ev: unknown,
    ): ev is { id: number; action: string; args: Record<string, unknown> } =>
      isOpenHandsAction(ev as OpenHandsParsedEvent) &&
      (ev as { source?: string }).source === "agent";
    const explicit = rev.find(
      (ev) =>
        isAgentAction(ev) &&
        (ev as { args?: Record<string, unknown> }).args?.confirmation_state ===
          "awaiting_confirmation",
    );
    if (explicit)
      return explicit as {
        id: number;
        action: string;
        args: Record<string, unknown>;
      };
    if (curAgentState === AgentState.AWAITING_USER_CONFIRMATION) {
      return rev.find(
        (ev) =>
          isAgentAction(ev) &&
          RUNNABLE_ACTIONS.includes((ev as { action: string }).action),
      ) as
        | { id: number; action: string; args: Record<string, unknown> }
        | undefined;
    }
    return undefined;
  }, [parsedEvents, curAgentState]);

  if (curAgentState !== AgentState.AWAITING_USER_CONFIRMATION || !awaiting) {
    return null;
  }

  const d = describeAction(awaiting);

  const decide = (confirmed: boolean, instruction = "") => {
    setBusy(true);
    try {
      addSubmittedEventId(awaiting.id);
      send(
        generateAgentStateChangeEvent(
          confirmed ? AgentState.USER_CONFIRMED : AgentState.USER_REJECTED,
        ),
      );
      if (!confirmed && instruction.trim()) {
        send(
          createChatMessage(
            instruction.trim(),
            [],
            [],
            new Date().toISOString(),
          ),
        );
      }
      setShow(false);
      setOther(false);
      setOtherText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-tool-card border-border bg-card flex w-full flex-col gap-2.5 rounded-lg border px-3 py-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-muted-foreground">
            ⏸
          </span>
          <span>
            Approve this action — <b className="text-foreground">{d.title}</b>?
          </span>
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground shrink-0 underline transition-colors"
          onClick={() => setShow((v) => !v)}
        >
          {show ? "Hide" : "View more"}
        </button>
      </div>

      {show && (
        <DiffBlock
          command={d.command}
          oldStr={d.oldStr}
          newStr={d.newStr}
          createText={d.createText}
        />
      )}

      {!other ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="bg-foreground text-background rounded-full px-3 py-1 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            onClick={() => decide(true)}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            className="border-border text-foreground hover:bg-muted/60 rounded-full border px-3 py-1 transition-colors disabled:opacity-50"
            onClick={() => decide(false)}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1 transition-colors disabled:opacity-50"
            onClick={() => setOther(true)}
          >
            Other…
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <textarea
            className="border-border text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/40 w-full rounded-md border bg-transparent px-2 py-1 outline-none"
            rows={2}
            placeholder="Reject and tell the agent what to do instead…"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !otherText.trim()}
              className="bg-foreground text-background rounded-full px-3 py-1 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={() => decide(false, otherText)}
            >
              Send instruction
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1 transition-colors"
              onClick={() => setOther(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

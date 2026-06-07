/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useWsClient } from "#/context/ws-client-provider";
import { useAgentStore } from "#/stores/agent-store";
import { AgentState } from "#/types/agent-state";
import { generateAgentStateChangeEvent } from "#/services/agent-state-service";
import { createChatMessage } from "#/services/chat-service";
import { isOpenHandsAction } from "#/types/core/guards";
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
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-neutral-900/70 p-2 text-[11px] leading-snug">
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
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-neutral-900/70 p-2 text-[11px] leading-snug text-neutral-300">
      {text || "(nothing to show)"}
    </pre>
  );
}

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

  // The most recent agent action awaiting confirmation.
  const awaiting = React.useMemo(
    () =>
      parsedEvents
        .slice()
        .reverse()
        .find((ev) => {
          if (!isOpenHandsAction(ev) || ev.source !== "agent") return false;
          const { args } = ev as { args?: Record<string, unknown> };
          return args?.confirmation_state === "awaiting_confirmation";
        }) as
        | { id: number; action: string; args: Record<string, unknown> }
        | undefined,
    [parsedEvents],
  );

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
    <div className="flex flex-col gap-2 px-3 py-2 text-xs text-neutral-300 border border-neutral-700 bg-neutral-800/60 rounded-md">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-neutral-500">
            ⏸
          </span>
          <span>
            Approve this action — <b className="text-neutral-100">{d.title}</b>?
          </span>
        </span>
        <button
          type="button"
          className="underline text-neutral-400 hover:text-neutral-200"
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
            className="rounded bg-neutral-200 px-2 py-1 font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            onClick={() => decide(true)}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-neutral-700 px-2 py-1 text-neutral-100 hover:bg-neutral-600 disabled:opacity-50"
            onClick={() => decide(false)}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-700/50 disabled:opacity-50"
            onClick={() => setOther(true)}
          >
            Other…
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <textarea
            className="rounded bg-neutral-900/70 p-2 text-neutral-200"
            rows={2}
            placeholder="Reject and tell the agent what to do instead…"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !otherText.trim()}
              className="rounded bg-neutral-200 px-2 py-1 font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
              onClick={() => decide(false, otherText)}
            >
              Send instruction
            </button>
            <button
              type="button"
              className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-700/50"
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

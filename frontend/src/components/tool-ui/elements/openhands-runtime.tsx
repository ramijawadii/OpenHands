/**
 * OpenHands event stream → assistant-ui runtime.
 *
 * assistant-ui's Tool-use Elements (tool-fallback, tool timeline, elicitation
 * forms, computer-use) are not presentational: they read `useToolCallElapsed`,
 * `useScrollLock` and the `ToolCallMessagePart` model out of the runtime
 * context. Handing them props does not work — outside a provider the hooks
 * throw. This adapter is what makes them usable without rewriting the chat.
 *
 * It is a TRANSLATION layer, not a second source of truth. `parsedEvents` from
 * `useWsClient` stays authoritative; we derive assistant-ui messages from it on
 * every render and never write back. The composer, sending, and the transcript
 * itself are untouched — only tool rendering reads this runtime.
 */

import * as React from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { isOpenHandsAction, isOpenHandsObservation } from "#/types/core/guards";

type OpenHandsEvent = OpenHandsAction | OpenHandsObservation;

/** Actions that carry a tool call rather than conversational text. */
const isToolAction = (e: OpenHandsEvent): e is OpenHandsAction =>
  isOpenHandsAction(e) && e.action !== "message";

/**
 * Observations name the action they answer via `cause`, which is the action's
 * `id`. That pairing is what lets a tool call carry its result in ONE message
 * part — assistant-ui models a tool call as call+result together, whereas
 * OpenHands emits them as two separate events.
 */
const indexObservationsByCause = (
  events: OpenHandsEvent[],
): Map<number, OpenHandsObservation> => {
  const byCause = new Map<number, OpenHandsObservation>();
  for (const event of events) {
    if (isOpenHandsObservation(event) && typeof event.cause === "number") {
      byCause.set(event.cause, event);
    }
  }
  return byCause;
};

const textPart = (text: string) => ({ type: "text" as const, text });

export const toThreadMessages = (
  events: OpenHandsEvent[],
): ThreadMessageLike[] => {
  const observationFor = indexObservationsByCause(events);
  const messages: ThreadMessageLike[] = [];

  for (const event of events) {
    // Observations are folded into the tool call that caused them, so they are
    // never messages in their own right. Anything with no cause is orphaned
    // (the action was condensed away) and is dropped rather than shown bare.
    if (isOpenHandsObservation(event)) continue;
    if (!isOpenHandsAction(event)) continue;

    if (event.action === "message") {
      const fromUser = event.source === "user";
      messages.push({
        role: fromUser ? "user" : "assistant",
        // A user message carries `content`; an agent message carries
        // `thought`. Both shapes live under `action: "message"`.
        content: [
          textPart(
            ("content" in event.args ? event.args.content : event.args.thought) ??
              "",
          ),
        ],
      });
      continue;
    }

    if (!isToolAction(event)) continue;

    const observation = observationFor.get(event.id);
    messages.push({
      role: "assistant",
      content: [
        {
          type: "tool-call",
          // OpenHands ids are numeric; assistant-ui keys parts by string.
          toolCallId: String(event.id),
          toolName: event.action,
          // Cast through `unknown`: OpenHands arg shapes are unions of concrete
          // interfaces, which TS will not narrow to assistant-ui's readonly
          // JSON object on its own. The values ARE JSON — they arrived over the
          // websocket — so this is a typing gap, not an unsafe assertion.
          args: (event.args ?? {}) as unknown as Record<string, never>,
          // `result` absent is what assistant-ui reads as "still running", so
          // a pending tool call animates on its own with no extra state.
          ...(observation
            ? { result: observation.content ?? observation.message ?? "" }
            : {}),
        },
      ],
    });
  }

  return messages;
};

/**
 * Read-only runtime.
 *
 * `onNew` is required by the store contract but deliberately rejects: sending
 * belongs to the existing composer and `useWsClient`. Routing it through here
 * too would give the app two send paths that could disagree about optimistic
 * state — the kind of split that produces duplicate or lost messages.
 */
export function OpenHandsAssistantRuntime({
  events,
  isRunning,
  children,
}: {
  events: OpenHandsEvent[];
  isRunning: boolean;
  children: React.ReactNode;
}) {
  const messages = React.useMemo(() => toThreadMessages(events), [events]);

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {
      throw new Error(
        "OpenHandsAssistantRuntime is read-only: send through useWsClient.",
      );
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

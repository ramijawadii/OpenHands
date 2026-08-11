/**
 * Collapse runs of consecutive tool calls into groups.
 *
 * A KG-driven assessment emits long chains — search, schema, execute, store,
 * repeated per resource. Rendered one card per call, a single turn can push
 * the actual answer off screen. Grouping keeps the chain inspectable without
 * letting it dominate the transcript.
 *
 * Pure and separate from the render loop on purpose: the transcript carries a
 * render cap, memoisation, plan snapshots and scroll anchoring, and segmenting
 * inline would entangle all of that with list arithmetic. Here it can be tested
 * on its own.
 */

import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { isOpenHandsAction } from "#/types/core/guards";

type Ev = OpenHandsAction | OpenHandsObservation;

/** Only MCP calls group. Shell and file edits stay individually legible. */
const isGroupable = (e: Ev): boolean => {
  const key = isOpenHandsAction(e) ? e.action : e.observation;
  return key === "call_tool_mcp" || key === "mcp";
};

export type Segment =
  | { type: "single"; event: Ev }
  | { type: "group"; events: Ev[] };

/**
 * Runs shorter than this stay ungrouped: collapsing two calls hides as much as
 * it tidies, and the reader loses the result without gaining space.
 */
export const MIN_GROUP = 3;

export const segmentEvents = (events: readonly Ev[]): Segment[] => {
  const out: Segment[] = [];
  let run: Ev[] = [];

  const flush = () => {
    if (run.length === 0) return;
    // A run is counted in ACTIONS, not events: every call contributes an action
    // and an observation, so an event count would double it and group pairs
    // that read perfectly well on their own.
    const actions = run.filter(isOpenHandsAction).length;
    if (actions >= MIN_GROUP) {
      out.push({ type: "group", events: run });
    } else {
      for (const e of run) out.push({ type: "single", event: e });
    }
    run = [];
  };

  for (const event of events) {
    if (isGroupable(event)) {
      run.push(event);
    } else {
      flush();
      out.push({ type: "single", event });
    }
  }
  flush();
  return out;
};

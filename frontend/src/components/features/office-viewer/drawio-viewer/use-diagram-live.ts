import React from "react";
import { openHands } from "#/api/open-hands-axios";

/**
 * Live diagram co-pilot (client side, opt-in). When a diagram is open the agent can
 * drive THIS editor — recolor an attack path, drop an annotation — and the analyst
 * watches it happen. Mirrors the ONLYOFFICE live model, but here we OWN the embed
 * wrapper, so no third-party plugin is injected: we pull the agent's queued commands
 * from the control-plane seam (`/api/cloudguard/diagram/live/poll`, principal-authed,
 * same-origin) and apply them by re-loading a locally-mutated copy of the diagram XML
 * through the react-drawio embed API.
 *
 * Robustness (matches the backend SRE model — every path degrades cleanly):
 *  - we probe `/diagram/healthz` once; if live control is OFF we never start polling
 *    (the default) so an open diagram costs nothing;
 *  - the seam is the source of truth for auth/rate/audit; the client only renders;
 *  - a malformed command can't wedge the loop — each apply is isolated in try/catch;
 *  - `agentWorking` drives a calm chip so live changes never startle the analyst.
 */
const POLL_MS = 1500;

// Severity → stroke color (matches the engine's semantic palette). A raw #rrggbb passes through.
const SEVERITY_COLOR: Record<string, string> = {
  critical: "#DE350B",
  high: "#FF8B00",
  medium: "#FFAB00",
  low: "#36B37E",
  info: "#4C9AFF",
};
function resolveColor(c?: string): string {
  const v = (c || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return SEVERITY_COLOR[v.toLowerCase()] || SEVERITY_COLOR.critical;
}

interface LiveCommand {
  id: string;
  op: "highlight" | "annotate" | "reload" | string;
  node_ids?: string[];
  edge_ids?: string[];
  text?: string;
  near_node?: string;
  color?: string;
}

type DrawioRef = {
  load: (data: { xml: string }) => void;
} | null;

function setStyleStroke(style: string, hex: string): string {
  // Drop any existing stroke directives, then pin a bold semantic stroke.
  const cleaned = style
    .split(";")
    .filter((s) => s && !/^strokeColor=/i.test(s) && !/^strokeWidth=/i.test(s))
    .join(";");
  return `${cleaned}${cleaned && !cleaned.endsWith(";") ? ";" : ""}strokeColor=${hex};strokeWidth=3;`;
}

/** Return a mutated XML string with the given cell ids recolored, or the original on any parse error. */
function applyHighlight(xml: string, ids: string[], hex: string): string {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return xml;
    let touched = 0;
    ids.forEach((id) => {
      // The cell may be a bare <mxCell id=…> or a wrapper <object id=…><mxCell…>.
      const el =
        doc.querySelector(`mxCell[id="${CSS.escape(id)}"]`) ||
        doc.querySelector(`[id="${CSS.escape(id)}"] > mxCell`) ||
        doc.querySelector(`[id="${CSS.escape(id)}"]`);
      if (!el) return;
      const cell = el.tagName === "mxCell" ? el : el.querySelector("mxCell") || el;
      const style = cell.getAttribute("style") || "";
      cell.setAttribute("style", setStyleStroke(style, hex));
      touched += 1;
    });
    if (!touched) return xml;
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return xml;
  }
}

/** Append a callout annotation cell (optionally anchored beside a node) and return the new XML. */
function applyAnnotation(
  xml: string,
  text: string,
  nearNode: string,
  hex: string,
): string {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return xml;
    const root = doc.querySelector("mxGraphModel > root") || doc.querySelector("root");
    if (!root) return xml;

    // Anchor beside the referenced node's geometry when we can find it, else drop top-left.
    let x = 40;
    let y = 40;
    if (nearNode) {
      const anchor =
        doc.querySelector(`mxCell[id="${CSS.escape(nearNode)}"] > mxGeometry`) ||
        doc.querySelector(`[id="${CSS.escape(nearNode)}"] mxGeometry`);
      if (anchor) {
        x = parseFloat(anchor.getAttribute("x") || "40") + 80;
        y = parseFloat(anchor.getAttribute("y") || "40") - 40;
      }
    }
    const id = `cg-note-${Date.now().toString(36)}`;
    const cell = doc.createElement("mxCell");
    cell.setAttribute("id", id);
    cell.setAttribute("value", text);
    cell.setAttribute(
      "style",
      `text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;` +
        `fillColor=#FFFFFF;strokeColor=${hex};strokeWidth=2;spacing=6;fontSize=11;`,
    );
    cell.setAttribute("vertex", "1");
    cell.setAttribute("parent", "1");
    const geo = doc.createElement("mxGeometry");
    geo.setAttribute("x", String(Math.round(x)));
    geo.setAttribute("y", String(Math.round(y)));
    geo.setAttribute("width", "180");
    geo.setAttribute("height", "50");
    geo.setAttribute("as", "geometry");
    cell.appendChild(geo);
    root.appendChild(cell);
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return xml;
  }
}

export function useDiagramLive(
  conversationId: string,
  drawioRef: React.MutableRefObject<DrawioRef>,
  xmlRef: React.MutableRefObject<string>,
  refetch: () => Promise<string | null>,
) {
  const [agentWorking, setAgentWorking] = React.useState(false);

  React.useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    let timer: number | undefined;

    const applyOne = async (cmd: LiveCommand) => {
      if (cmd.op === "reload") {
        const fresh = await refetch().catch(() => null);
        if (fresh && drawioRef.current) {
          xmlRef.current = fresh;
          drawioRef.current.load({ xml: fresh });
        }
        return;
      }
      const hex = resolveColor(cmd.color);
      let next = xmlRef.current;
      if (cmd.op === "highlight") {
        next = applyHighlight(next, [...(cmd.node_ids || []), ...(cmd.edge_ids || [])], hex);
      } else if (cmd.op === "annotate") {
        next = applyAnnotation(next, String(cmd.text || ""), String(cmd.near_node || ""), hex);
      } else {
        return; // unknown op — ignore (server allow-lists, but stay defensive)
      }
      if (next !== xmlRef.current && drawioRef.current) {
        xmlRef.current = next;
        drawioRef.current.load({ xml: next });
      }
    };

    const poll = async () => {
      if (cancelled) return;
      try {
        const { data } = await openHands.get("/api/cloudguard/diagram/live/poll", {
          params: { conversation_id: conversationId },
        });
        const cmds = (data?.commands as LiveCommand[]) ?? [];
        if (cmds.length) {
          setAgentWorking(true);
          for (const cmd of cmds) {
            // eslint-disable-next-line no-await-in-loop
            await applyOne(cmd);
          }
          setAgentWorking(false);
        }
      } catch {
        /* transient — next tick retries */
      }
    };

    // Probe once: only spin up the poll loop when live control is actually enabled.
    openHands
      .get("/api/cloudguard/diagram/healthz")
      .then(({ data }) => {
        if (cancelled || !data?.live) return;
        timer = window.setInterval(poll, POLL_MS);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [conversationId, drawioRef, xmlRef, refetch]);

  return { agentWorking };
}

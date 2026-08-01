import React from "react";
import { openHands } from "#/api/open-hands-axios";
import ConversationService from "#/api/conversation-service/conversation-service.api";

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
  op: "highlight" | "annotate" | "reload" | "export" | string;
  node_ids?: string[];
  edge_ids?: string[];
  text?: string;
  near_node?: string;
  color?: string;
  req_id?: string;
  fmt?: string; // export: png | svg
  out?: string; // export: output basename
  payload?: Record<string, unknown>; // add_node/add_edge/edit_cell/delete_cell: the cell spec
}

const DEFAULT_EDGE_STYLE =
  "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8592A6;strokeWidth=1.5;endArrow=block;endFill=1;endSize=6;";

/** Parse the current diagram XML into a compact cell list the agent can reason over. */
export function parseCells(xml: string): Record<string, unknown>[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return [];
    const cells: Record<string, unknown>[] = [];
    doc.querySelectorAll("mxCell").forEach((c) => {
      const id = c.getAttribute("id") || "";
      if (id === "0" || id === "1") return;
      const geo = c.querySelector("mxGeometry");
      cells.push({
        id,
        value: c.getAttribute("value") || "",
        style: (c.getAttribute("style") || "").slice(0, 200),
        vertex: c.getAttribute("vertex") === "1",
        edge: c.getAttribute("edge") === "1",
        source: c.getAttribute("source") || undefined,
        target: c.getAttribute("target") || undefined,
        x: geo ? Number(geo.getAttribute("x")) || undefined : undefined,
        y: geo ? Number(geo.getAttribute("y")) || undefined : undefined,
      });
    });
    return cells;
  } catch {
    return [];
  }
}

const BLANK_PAGE_MODEL =
  '<mxGraphModel dx="800" dy="600" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" ' +
  'arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">' +
  '<root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** mxfile pages -> [{id, name, index}]. */
export function parsePages(xml: string): Record<string, unknown>[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return Array.from(doc.querySelectorAll("mxfile > diagram")).map((d, i) => ({
      id: d.getAttribute("id") || String(i),
      name: d.getAttribute("name") || `Page-${i + 1}`,
      index: i,
    }));
  } catch {
    return [];
  }
}

/** Current-page layers = root's mxCell children with parent="0" -> [{id, name}]. */
export function parseLayers(xml: string): Record<string, unknown>[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const root = doc.querySelector("mxGraphModel > root") || doc.querySelector("root");
    if (!root) return [];
    return Array.from(root.children)
      .filter((c) => c.tagName === "mxCell" && c.getAttribute("parent") === "0")
      .map((c) => ({ id: c.getAttribute("id") || "", name: c.getAttribute("value") || "Background" }));
  } catch {
    return [];
  }
}

/** Apply a page/layer/import struct op to the full mxfile XML and return the new XML. */
export function applyStructOp(
  xml: string,
  op: string,
  p: Record<string, unknown>,
): string {
  try {
    if (op === "import" && p.mode === "replace") {
      return typeof p.xml === "string" && p.xml.trimStart().startsWith("<") ? p.xml : xml;
    }
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return xml;
    const mxfile = doc.querySelector("mxfile");
    const diagrams = () => Array.from(doc.querySelectorAll("mxfile > diagram"));
    const pickPage = (sel: string): Element | null => {
      const ds = diagrams();
      const byId = ds.find((d) => d.getAttribute("id") === sel);
      if (byId) return byId;
      const i = Number(sel);
      return Number.isInteger(i) && ds[i] ? ds[i] : null;
    };

    if (op === "add_page" && mxfile) {
      const d = doc.createElement("diagram");
      d.setAttribute("id", uid("page"));
      d.setAttribute("name", String(p.name || "Page"));
      const model = new DOMParser().parseFromString(BLANK_PAGE_MODEL, "application/xml").documentElement;
      d.appendChild(doc.importNode(model, true));
      mxfile.appendChild(d);
    } else if (op === "rename_page") {
      pickPage(String(p.page ?? ""))?.setAttribute("name", String(p.name || "Page"));
    } else if (op === "delete_page") {
      if (diagrams().length > 1) pickPage(String(p.page ?? ""))?.remove();
    } else if (op === "add_layer") {
      const root = doc.querySelector("mxGraphModel > root") || doc.querySelector("root");
      if (root) {
        const c = doc.createElement("mxCell");
        c.setAttribute("id", String(p.id || uid("layer")));
        c.setAttribute("value", String(p.name || "Layer"));
        c.setAttribute("parent", "0");
        root.appendChild(c);
      }
    } else if (op === "move_to_layer") {
      const cell = doc.querySelector(`mxCell[id="${CSS.escape(String(p.id ?? ""))}"]`);
      if (cell) cell.setAttribute("parent", String(p.layer ?? "1"));
    } else if (op === "import" && p.mode === "add_page" && mxfile) {
      const imp = new DOMParser().parseFromString(String(p.xml || ""), "application/xml");
      imp.querySelectorAll("mxfile > diagram, diagram").forEach((d) => {
        if (!d.getAttribute("id")) d.setAttribute("id", uid("page"));
        mxfile.appendChild(doc.importNode(d, true));
      });
    } else {
      return xml;
    }
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return xml;
  }
}

/** Apply an incremental cell/edge op (add/edit/delete) to the XML and return the new XML. */
export function applyCellOp(
  xml: string,
  op: string,
  p: Record<string, unknown>,
): string {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return xml;
    const root = doc.querySelector("mxGraphModel > root") || doc.querySelector("root");
    if (!root) return xml;
    const id = String(p.id ?? "");
    const byId = (cid: string) => doc.querySelector(`mxCell[id="${CSS.escape(cid)}"]`);

    if (op === "delete_cell") {
      byId(id)?.remove();
      // drop incident edges
      doc.querySelectorAll("mxCell[edge='1']").forEach((e) => {
        if (e.getAttribute("source") === id || e.getAttribute("target") === id) e.remove();
      });
      return new XMLSerializer().serializeToString(doc);
    }
    if (op === "edit_cell") {
      const c = byId(id);
      if (!c) return xml;
      if (p.value !== undefined) c.setAttribute("value", String(p.value));
      if (p.style !== undefined) c.setAttribute("style", String(p.style));
      const geo = c.querySelector("mxGeometry");
      if (geo) {
        if (p.x !== undefined) geo.setAttribute("x", String(p.x));
        if (p.y !== undefined) geo.setAttribute("y", String(p.y));
      }
      return new XMLSerializer().serializeToString(doc);
    }
    if (op === "add_node") {
      if (byId(id)) return xml; // id exists — no dup
      const c = doc.createElement("mxCell");
      c.setAttribute("id", id);
      c.setAttribute("value", String(p.value ?? ""));
      c.setAttribute("style", String(p.style ?? "rounded=1;whiteSpace=wrap;html=1;"));
      c.setAttribute("vertex", "1");
      c.setAttribute("parent", "1");
      const g = doc.createElement("mxGeometry");
      g.setAttribute("x", String(p.x ?? 40));
      g.setAttribute("y", String(p.y ?? 40));
      g.setAttribute("width", String(p.w ?? 60));
      g.setAttribute("height", String(p.h ?? 60));
      g.setAttribute("as", "geometry");
      c.appendChild(g);
      root.appendChild(c);
      return new XMLSerializer().serializeToString(doc);
    }
    if (op === "add_edge") {
      if (byId(id)) return xml;
      const c = doc.createElement("mxCell");
      c.setAttribute("id", id);
      c.setAttribute("value", String(p.value ?? ""));
      c.setAttribute("style", String(p.style ?? DEFAULT_EDGE_STYLE));
      c.setAttribute("edge", "1");
      c.setAttribute("parent", "1");
      c.setAttribute("source", String(p.source ?? ""));
      c.setAttribute("target", String(p.target ?? ""));
      const g = doc.createElement("mxGeometry");
      g.setAttribute("relative", "1");
      g.setAttribute("as", "geometry");
      c.appendChild(g);
      root.appendChild(c);
      return new XMLSerializer().serializeToString(doc);
    }
    return xml;
  } catch {
    return xml;
  }
}

type DrawioRef = {
  load: (data: { xml: string }) => void;
  exportDiagram: (data: { format: string }) => void;
} | null;

// The agent's "png"/"svg" → the react-drawio embed export format. The xml* variants embed the
// source diagram in the image, so the exported figure is also a re-openable .drawio.
const EXPORT_FORMAT: Record<string, string> = { png: "xmlpng", svg: "xmlsvg" };

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
  // In-flight export: exportDiagram() is async (result arrives on the onExport event), so we stash
  // the request here and let handleExport (wired to DrawIoEmbed's onExport) finish the round-trip.
  const pendingExportRef = React.useRef<{
    reqId: string;
    fmt: string;
    out: string;
    mode: "file" | "read";
  } | null>(null);

  // Ack the round-trip so the waiting agent-side fn unblocks. `path` for export, `payload` for read.
  const ackRpc = React.useCallback(
    (
      reqId: string,
      ok: boolean,
      opts: { path?: string; payload?: unknown; error?: string },
    ) => {
      openHands
        .post("/api/cloudguard/diagram/live/export-result", {
          cid: conversationId,
          req_id: reqId,
          ok,
          path: opts.path || "",
          payload: opts.payload ?? null,
          error: opts.error || "",
        })
        .catch(() => {});
    },
    [conversationId],
  );

  // DrawIoEmbed calls this when an export finishes. For a `read` we parse the CURRENT canvas XML and
  // return its cells; for a file export we upload the image and return its path. Wired via onExport.
  const onExport = React.useCallback(
    async (evt: { data?: string }) => {
      const pending = pendingExportRef.current;
      if (!pending) return;
      pendingExportRef.current = null;
      try {
        const dataUri = evt?.data || "";
        if (pending.mode === "read") {
          // format=xmlsvg embeds the source XML; also accept a raw data: xml uri.
          let xml = "";
          if (dataUri.startsWith("data:")) {
            const txt = await (await fetch(dataUri)).text();
            const m = txt.match(/content="(&lt;mxfile[\s\S]*?&gt;)"/);
            xml = m
              ? m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
              : txt.trimStart().startsWith("<mxfile")
                ? txt
                : xmlRef.current;
          } else {
            xml = xmlRef.current;
          }
          // cells + layers from the (live) exported page; pages from the full loaded mxfile.
          ackRpc(pending.reqId, true, {
            payload: {
              cells: parseCells(xml),
              layers: parseLayers(xml),
              pages: parsePages(xmlRef.current),
            },
          });
          return;
        }
        if (!dataUri.startsWith("data:")) throw new Error("empty export");
        const blob = await (await fetch(dataUri)).blob();
        const ext = pending.fmt === "svg" ? "svg" : "png";
        const file = new File([blob], `${pending.out}.${ext}`, {
          type: blob.type || (ext === "svg" ? "image/svg+xml" : "image/png"),
        });
        const res = await ConversationService.uploadFiles(conversationId, [file]);
        const path = res?.uploaded_files?.[0] || `${pending.out}.${ext}`;
        ackRpc(pending.reqId, true, { path });
      } catch (e) {
        ackRpc(pending.reqId, false, {
          error: e instanceof Error ? e.message : "round-trip failed",
        });
      } finally {
        setAgentWorking(false);
      }
    },
    [conversationId, ackRpc, xmlRef],
  );

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
      if (cmd.op === "export" || cmd.op === "read") {
        // Round-trip: ask the embed to render (export) or hand us its current XML (read). The result
        // lands on onExport → uploaded/parsed + acked there. If we can't kick it off, ack failure now.
        if (!drawioRef.current || !cmd.req_id) {
          if (cmd.req_id)
            ackRpc(cmd.req_id, false, { error: "no open editor" });
          return;
        }
        pendingExportRef.current = {
          reqId: cmd.req_id,
          fmt: cmd.fmt === "svg" ? "svg" : "png",
          out: cmd.out || "diagram",
          mode: cmd.op === "read" ? "read" : "file",
        };
        try {
          drawioRef.current.exportDiagram({
            format: cmd.op === "read" ? "xmlsvg" : EXPORT_FORMAT[cmd.fmt || "png"] || "xmlpng",
          });
        } catch {
          pendingExportRef.current = null;
          ackRpc(cmd.req_id, false, { error: "export call failed" });
        }
        return;
      }
      const hex = resolveColor(cmd.color);
      let next = xmlRef.current;
      if (cmd.op === "highlight") {
        next = applyHighlight(next, [...(cmd.node_ids || []), ...(cmd.edge_ids || [])], hex);
      } else if (cmd.op === "annotate") {
        next = applyAnnotation(next, String(cmd.text || ""), String(cmd.near_node || ""), hex);
      } else if (
        cmd.op === "add_node" ||
        cmd.op === "add_edge" ||
        cmd.op === "edit_cell" ||
        cmd.op === "delete_cell"
      ) {
        next = applyCellOp(next, cmd.op, cmd.payload || {});
      } else if (
        cmd.op === "add_page" ||
        cmd.op === "rename_page" ||
        cmd.op === "delete_page" ||
        cmd.op === "add_layer" ||
        cmd.op === "move_to_layer" ||
        cmd.op === "import"
      ) {
        next = applyStructOp(next, cmd.op, cmd.payload || {});
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
  }, [conversationId, drawioRef, xmlRef, refetch, ackRpc]);

  return { agentWorking, onExport };
}

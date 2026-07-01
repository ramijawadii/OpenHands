/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string, no-bitwise, no-param-reassign, no-continue, @typescript-eslint/no-use-before-define -- CloudGuard IAM Impact Analysis graph (Cytoscape; no KeyLines dep) */
import React from "react";
import {
  RotateCcw,
  Maximize2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Frame,
  Plus,
  Minus,
  Crosshair,
  ArrowLeft,
  Lock,
  X,
  Star,
  Info,
  GitBranch,
} from "lucide-react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import cognitoIcon from "thesvg/aws-amazon-cognito";
import roleIcon from "thesvg/aws-res-aws-identity-access-management-role";
import policyIcon from "thesvg/aws-res-aws-identity-access-management-permissions";
import s3Icon from "thesvg/aws-res-amazon-simple-storage-service-bucket";
import rdsIcon from "thesvg/aws-amazon-rds";
import dynamoIcon from "thesvg/aws-amazon-dynamodb";
import kmsIcon from "thesvg/aws-aws-key-management-service";
import secretsIcon from "thesvg/aws-aws-secrets-manager";
import ec2Icon from "thesvg/aws-amazon-ec2";
import lambdaIcon from "thesvg/aws-aws-lambda";

// ════════════════════════════════════════════════════════════════════════════
// §7.13 Identity Blast-Radius — Impact Analysis. A faithful re-build of the
// Cambridge Intelligence KeyLines "Impact Analysis" sample (no KeyLines dep) on
// Cytoscape + fcose, mapped to a real AWS IAM estate: Identity → Role → Policy →
// Resource. Node size scales with downstream blast radius (cube-root). Hover a
// node to isolate its access chain (everything else greys out but stays);
// filter by tier to spotlight a class of entities; drill into a node to expand
// its reach rightward, with a back-stack to step out one level at a time. White
// canvas + real thesvg AWS icons to match the IAM Explorer diagram. Built to
// stay smooth on production-scale graphs (texture-on-viewport, batched paints).
// ════════════════════════════════════════════════════════════════════════════

let fcoseReady = false;
function ensureFcose() {
  if (!fcoseReady) {
    (cytoscape as any).use(fcose);
    fcoseReady = true;
  }
}

const svgUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// ── domain palette (KeyLines sample's four service colours) ───────────────────
const BG = "#ffffff";
const C_IDENTITY = "#2d86d4";
const C_ROLE = "#23b1c9";
const C_POLICY = "#16b8a6";
const C_RESOURCE = "#39b84e";
const C_ERROR = "#e0492f";
const C_WARN = "#d99a00";

type Tier = "identity" | "role" | "policy" | "resource";
const TIER_COLOUR: Record<Tier, string> = {
  identity: C_IDENTITY,
  role: C_ROLE,
  policy: C_POLICY,
  resource: C_RESOURCE,
};
const TIER_LABEL: Record<Tier, string> = {
  identity: "Identity",
  role: "Role",
  policy: "Policy",
  resource: "Resource",
};
const TIER_ORDER: Tier[] = ["identity", "role", "policy", "resource"];

// real thesvg AWS icons → data-URI (transparent nodes show the brand icon)
const ICON: Record<string, string> = {
  identity: svgUri(cognitoIcon.svg),
  role: svgUri(roleIcon.svg),
  policy: svgUri(policyIcon.svg),
  s3: svgUri(s3Icon.svg),
  rds: svgUri(rdsIcon.svg),
  dynamodb: svgUri(dynamoIcon.svg),
  kms: svgUri(kmsIcon.svg),
  secrets: svgUri(secretsIcon.svg),
  ec2: svgUri(ec2Icon.svg),
  lambda: svgUri(lambdaIcon.svg),
};

// golden star for marked nodes
const STAR_URI = svgUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f5b301" stroke="#a9760a" stroke-width="1.2" stroke-linejoin="round"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"/></svg>',
);

type Alert = "error" | "warning" | undefined;
type IANode = {
  id: string;
  tier: Tier;
  kind: string; // icon key
  label: string;
  alert?: Alert;
  message?: string;
};
type IAEdge = { source: string; target: string };

// ── representative, real-world AWS IAM estate (Sample data) ───────────────────
// Deterministic builder — a multi-account prod/stage/dev estate with shared,
// over-exposed resources so the blast-radius story is meaningful.
function buildModel(): { nodes: IANode[]; edges: IAEdge[] } {
  let seed = 991;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const some = <T,>(arr: T[], min: number, max: number): T[] => {
    const k = min + Math.floor(rnd() * (max - min + 1));
    const pool = [...arr];
    const out: T[] = [];
    for (let i = 0; i < k && pool.length; i += 1) {
      out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return out;
  };

  const ENVS = ["prod", "stage", "dev"];
  const RES_KINDS: { kind: string; noun: string }[] = [
    { kind: "s3", noun: "bucket" },
    { kind: "rds", noun: "rds" },
    { kind: "dynamodb", noun: "ddb" },
    { kind: "kms", noun: "key" },
    { kind: "secrets", noun: "secret" },
    { kind: "ec2", noun: "ec2" },
    { kind: "lambda", noun: "fn" },
  ];
  const RES_NAMES = [
    "customer-pii",
    "billing",
    "sessions",
    "audit-logs",
    "data-export",
    "analytics",
    "payments",
    "user-content",
    "model-artifacts",
    "config",
    "backups",
    "telemetry",
  ];

  const resources: IANode[] = [];
  let ri = 0;
  ENVS.forEach((env) => {
    RES_NAMES.forEach((name, i) => {
      const k = RES_KINDS[(i + ENVS.indexOf(env)) % RES_KINDS.length];
      resources.push({
        id: `res-${ri}`,
        tier: "resource",
        kind: k.kind,
        label: `${env}/${name}-${k.noun}`,
      });
      ri += 1;
    });
  });

  const POL_NAMES = [
    "ReadOnly",
    "ReadWrite",
    "FullAccess",
    "KMSDecrypt",
    "SecretsRead",
    "DataExport",
    "AdminAccess",
    "AssumeRole",
    "ListAll",
    "PutObject",
  ];
  const policies: IANode[] = [];
  ENVS.forEach((env) => {
    POL_NAMES.forEach((p, i) => {
      policies.push({
        id: `pol-${env}-${i}`,
        tier: "policy",
        kind: "policy",
        label: `${env}-${p}`,
      });
    });
  });

  const ROLE_NAMES = [
    "deploy",
    "data-eng",
    "sre",
    "ci-runner",
    "analyst",
    "read-only",
    "break-glass",
    "vendor",
    "backup",
    "lambda-exec",
  ];
  const roles: IANode[] = [];
  ENVS.forEach((env) => {
    ROLE_NAMES.forEach((r, i) => {
      roles.push({
        id: `role-${env}-${i}`,
        tier: "role",
        kind: "role",
        label: `${env}-${r}`,
      });
    });
  });

  const HUMANS = [
    "j.cooper",
    "m.lee",
    "p.nair",
    "a.khan",
    "l.rossi",
    "s.adeyemi",
    "d.park",
    "r.silva",
    "t.novak",
    "e.haddad",
  ];
  const SERVICES = [
    "svc-ci",
    "svc-scanner",
    "terraform",
    "github-oidc",
    "svc-backup",
    "svc-etl",
    "svc-billing",
    "svc-analytics",
  ];
  const identities: IANode[] = [
    ...HUMANS.map((h, i) => ({
      id: `id-h-${i}`,
      tier: "identity" as Tier,
      kind: "identity",
      label: h,
    })),
    ...SERVICES.map((s, i) => ({
      id: `id-s-${i}`,
      tier: "identity" as Tier,
      kind: "identity",
      label: s,
    })),
  ];

  const edges: IAEdge[] = [];
  const connect = (a: IANode[], b: IANode[], min: number, max: number) =>
    a.forEach((n) =>
      some(b, min, max).forEach((t) => {
        if (t.id !== n.id) edges.push({ source: n.id, target: t.id });
      }),
    );
  connect(identities, roles, 1, 3);
  connect(roles, policies, 1, 3);
  connect(policies, resources, 1, 4);

  // a handful of named, high-impact alert nodes (the red/yellow story)
  const set = (
    n: IANode | undefined,
    alert: Alert,
    label: string,
    message: string,
  ) => {
    if (n) {
      n.alert = alert;
      n.label = label;
      n.message = message;
    }
  };
  set(
    policies.find(
      (p) => p.label.endsWith("AdminAccess") && p.label.startsWith("prod"),
    ),
    "error",
    "prod-AdminAccess-*",
    "Wildcard Action:* on Resource:* — full account-takeover path",
  );
  set(
    roles.find((r) => r.label === "prod-break-glass"),
    "error",
    "prod-break-glass",
    "Standing privileged role with no session expiry",
  );
  set(
    resources.find((r) => r.label.includes("customer-pii")),
    "error",
    "prod/customer-pii-bucket",
    "Public bucket policy — reachable from external principals",
  );
  set(
    identities.find((i) => i.label === "svc-scanner"),
    "warning",
    "svc-scanner",
    "Service account with interactive console access",
  );
  set(
    policies.find((p) => p.label === "prod-DataExport"),
    "warning",
    "prod-DataExport",
    "Allows s3:GetObject across every data bucket",
  );
  set(
    roles.find((r) => r.label === "prod-vendor"),
    "warning",
    "prod-vendor",
    "External trust with broad permissions",
  );

  return {
    nodes: [...identities, ...roles, ...policies, ...resources],
    edges,
  };
}

const MODEL = buildModel();

// downstream reach (blast radius) for every node — drives node sizing
function downstreamCounts(): Record<string, number> {
  const adj: Record<string, string[]> = {};
  MODEL.edges.forEach((e) => {
    (adj[e.source] ||= []).push(e.target);
  });
  const out: Record<string, number> = {};
  MODEL.nodes.forEach((n) => {
    const seen = new Set<string>();
    const stack = [...(adj[n.id] || [])];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur)) continue;
      seen.add(cur);
      (adj[cur] || []).forEach((x) => stack.push(x));
    }
    out[n.id] = seen.size;
  });
  return out;
}
const REACH = downstreamCounts();

const NODE_BY_ID: Record<string, IANode> = Object.fromEntries(
  MODEL.nodes.map((n) => [n.id, n]),
);
// direct neighbours of a node, split by direction (for the details drawer)
function relationsOf(id: string): { up: IANode[]; down: IANode[] } {
  const up: IANode[] = [];
  const down: IANode[] = [];
  MODEL.edges.forEach((e) => {
    if (e.source === id && NODE_BY_ID[e.target])
      down.push(NODE_BY_ID[e.target]);
    if (e.target === id && NODE_BY_ID[e.source]) up.push(NODE_BY_ID[e.source]);
  });
  return { up, down };
}

function elements() {
  const els: any[] = [];
  MODEL.nodes.forEach((n) => {
    const reach = REACH[n.id] || 0;
    const scale = reach > 0 ? reach ** (1 / 3) : 1;
    els.push({
      data: {
        id: n.id,
        tier: n.tier,
        kind: n.kind,
        label: n.label,
        message: n.message || "",
        alert: n.alert || "",
        reach,
        baseSize: Math.round(30 + scale * 8),
      },
    });
  });
  MODEL.edges.forEach((e, i) => {
    els.push({
      data: {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        srcTier: MODEL.nodes.find((n) => n.id === e.source)?.tier,
      },
    });
  });
  return els;
}

function baseStyle(): any[] {
  const tint = (n: any) => TIER_COLOUR[n.data("tier") as Tier];
  return [
    {
      selector: "node",
      style: {
        width: "data(baseSize)",
        height: "data(baseSize)",
        shape: "round-rectangle",
        "corner-radius": "6",
        // light tier-tinted disc + tier border + real AWS brand icon on top
        "background-color": tint,
        "background-opacity": 0.12,
        "background-image": (n: any) => ICON[n.data("kind")],
        "background-fit": "contain",
        "background-clip": "none",
        "background-width": "66%",
        "background-height": "66%",
        "border-width": 1.5,
        "border-color": tint,
        label: "",
        "transition-property": "opacity",
        "transition-duration": "120ms",
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.3,
        "line-color": (e: any) => TIER_COLOUR[e.data("srcTier") as Tier],
        "target-arrow-color": (e: any) =>
          TIER_COLOUR[e.data("srcTier") as Tier],
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.7,
        "curve-style": "straight",
        opacity: 0.5,
      },
    },
    // alerts colouring
    {
      selector: "node.err",
      style: { "background-color": C_ERROR, "border-color": C_ERROR },
    },
    {
      selector: "node.warn",
      style: { "background-color": C_WARN, "border-color": C_WARN },
    },
    { selector: "node.muted", style: { "background-opacity": 0.05 } },
    {
      selector: "edge.err",
      style: {
        "line-color": C_ERROR,
        "target-arrow-color": C_ERROR,
        opacity: 0.85,
      },
    },
    {
      selector: "edge.warn",
      style: {
        "line-color": C_WARN,
        "target-arrow-color": C_WARN,
        opacity: 0.7,
      },
    },
    // golden star on marked nodes (layered over the tier icon)
    {
      selector: "node.marked",
      style: {
        "background-image": (n: any) => [ICON[n.data("kind")], STAR_URI],
        "background-width": ["66%", "40%"],
        "background-height": ["66%", "40%"],
        "background-position-x": ["50%", "96%"],
        "background-position-y": ["50%", "4%"],
        "background-fit": ["contain", "contain"],
        "background-clip": ["none", "none"],
      },
    },
    // active access-chain emphasis
    {
      selector: "node.chain",
      style: { "border-width": 3, "border-color": "#10221c" },
    },
    { selector: "edge.chain", style: { width: 2.2, opacity: 0.95 } },
    // hover / filter / lock de-emphasis — LAST so it wins over alert colouring
    { selector: "node.shadow", style: { opacity: 0.1 } },
    { selector: "edge.shadow", style: { opacity: 0.04 } },
    {
      selector: "node.picked",
      style: { "border-width": 4, "border-color": "#10221c" },
    },
    // focus (drill-in) hierarchy — clean labelled rectangles
    {
      selector: "node.rect",
      style: {
        shape: "round-rectangle",
        "corner-radius": "8",
        width: 236,
        height: 48,
        "background-color": tint,
        "background-opacity": 0.14,
        "background-image": (n: any) => ICON[n.data("kind")],
        "background-fit": "contain",
        "background-clip": "none",
        "background-width": "26px",
        "background-height": "26px",
        "background-position-x": "14px",
        "background-position-y": "50%",
        "border-width": 1.5,
        "border-color": tint,
        label: (n: any) => n.data("label"),
        color: "var(--cg-graph-label, #10221c)",
        "font-size": 12.5,
        "font-weight": 600,
        "text-valign": "center",
        "text-halign": "center",
        "text-margin-x": 22,
        "text-max-width": "168",
        "text-wrap": "ellipsis",
      },
    },
    {
      selector: "node.rect.err",
      style: { "background-color": C_ERROR, "border-color": C_ERROR },
    },
    {
      selector: "node.rect.warn",
      style: { "background-color": C_WARN, "border-color": C_WARN },
    },
    {
      selector: "edge.fedge",
      style: {
        "curve-style": "round-taxi",
        "taxi-direction": "horizontal",
        "taxi-turn": "50%",
        "taxi-turn-min-distance": "12px",
        radius: 18,
        width: 1.8,
        opacity: 0.7,
      },
    },
  ];
}

const ALERT_ROWS = MODEL.nodes
  .filter((n) => n.alert)
  .map((n) => ({
    id: n.id,
    label: n.label,
    type: n.alert as "error" | "warning",
    message: n.message || "",
    tier: n.tier,
  }));

const ALERTS_W = 320; // alerts drawer width (graph area shrinks by this)

// zoom (model) ↔ slider-percent on a log scale
const MINZ = 0.06;
const MAXZ = 2.5;
const zoomToPct = (z: number) =>
  Math.round(
    ((Math.log(z) - Math.log(MINZ)) / (Math.log(MAXZ) - Math.log(MINZ))) * 100,
  );
const pctToZoom = (p: number) =>
  Math.exp(Math.log(MINZ) + (p / 100) * (Math.log(MAXZ) - Math.log(MINZ)));

export function ImpactAnalysis() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const cyRef = React.useRef<any>(null);
  const [view, setView] = React.useState<"impact" | "alerts">("impact");
  const [stack, setStack] = React.useState<string[]>([]);
  const [sel, setSel] = React.useState<IANode | null>(null);
  const [filters, setFilters] = React.useState<Set<Tier>>(new Set());
  const [zoomPct, setZoomPct] = React.useState(40);
  const [showMini, setShowMini] = React.useState(true);
  const [hoverInfo, setHoverInfo] = React.useState<IANode | null>(null);
  // minimap is split: dots + graph bbox change only on layout (recomputeMini);
  // the viewport rect updates cheaply on every pan/zoom (updateFrame). This stops
  // the per-frame re-read of every node position that was glitching the pan.
  const [dots, setDots] = React.useState<{ x: number; y: number; a: string }[]>(
    [],
  );
  const bbRef = React.useRef({ x: 0, y: 0, w: 1, h: 1 });
  const [frame, setFrame] = React.useState<{
    bb: { x: number; y: number; w: number; h: number };
    view: { x: number; y: number; w: number; h: number };
  } | null>(null);

  // right-side auxiliary drawer (node details · mark · marked list)
  const [panel, setPanel] = React.useState<{
    type: "details" | "mark" | "marklist";
    nodeId?: string;
  } | null>(null);
  // marked nodes → note (persisted in state; golden star on the node)
  const [marked, setMarked] = React.useState<
    Record<string, { note: string; ts: number }>
  >({});
  const [locked, setLocked] = React.useState<string | null>(null);
  const [ctx, setCtx] = React.useState<{
    x: number;
    y: number;
    node: IANode;
  } | null>(null);

  const focusId = stack.length ? stack[stack.length - 1] : null;
  const viewRef = React.useRef(view);
  viewRef.current = view;
  const hoverRef = React.useRef<string | null>(null);
  const pinnedRef = React.useRef<string | null>(null); // alert row / dep-chain pin
  const lockedRef = React.useRef<string | null>(null);
  lockedRef.current = locked;
  const ctxRef = React.useRef<string | null>(null);
  const filterRef = React.useRef(filters);
  filterRef.current = filters;

  // ── emphasis: one place decides which elements are lit vs shadowed. Priority:
  // context-menu spotlight → locked view → hover → pinned (alert/chain) → filter.
  const applyEmphasis = React.useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const chainSet = (id: string) => {
      const n = cy.getElementById(id);
      return new Set<string>(
        n
          .predecessors()
          .union(n.successors())
          .union(n)
          .nodes()
          .map((x: any) => x.id()),
      );
    };
    let active: Set<string> | null = null;
    let chain = false;
    if (ctxRef.current) {
      active = new Set([ctxRef.current]); // menu spotlight: just the node
    } else if (lockedRef.current) {
      active = chainSet(lockedRef.current);
      chain = true;
    } else if (hoverRef.current) {
      active = chainSet(hoverRef.current);
      chain = true;
    } else if (pinnedRef.current) {
      active = chainSet(pinnedRef.current);
      chain = true;
    } else if (filterRef.current.size) {
      active = new Set(
        cy
          .nodes()
          .filter((x: any) => filterRef.current.has(x.data("tier") as Tier))
          .map((x: any) => x.id()),
      );
    }
    cy.batch(() => {
      cy.elements().removeClass("shadow chain");
      if (!active) return;
      cy.nodes().forEach((n: any) => {
        if (!active!.has(n.id())) n.addClass("shadow");
        else if (chain) n.addClass("chain");
      });
      cy.edges().forEach((e: any) => {
        const inA =
          active!.has(e.source().id()) && active!.has(e.target().id());
        if (!inA) e.addClass("shadow");
        else if (chain) e.addClass("chain");
      });
    });
  }, []);

  // pin a node's access path (alert row / dep-chain menu) — graph stays put.
  const emphasize = React.useCallback(
    (id: string | null) => {
      hoverRef.current = id ?? pinnedRef.current;
      applyEmphasis();
    },
    [applyEmphasis],
  );

  // ── build chart once ──────────────────────────────────────────────────────
  React.useEffect(() => {
    ensureFcose();
    if (!ref.current) return undefined;
    const cy = (cytoscape as any)({
      container: ref.current,
      elements: elements(),
      style: baseStyle(),
      minZoom: MINZ,
      maxZoom: MAXZ,
      wheelSensitivity: 0.35,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
      // crisp, glitch-free panning: render edges live (no hide/texture swap)
      textureOnViewport: false,
      hideEdgesOnViewport: false,
      motionBlur: false,
      layout: {
        name: "fcose",
        quality: "default",
        animate: true,
        animationDuration: 520,
        nodeRepulsion: 9000,
        idealEdgeLength: 64,
      },
    });
    cyRef.current = cy;

    const nodeInfo = (t: any): IANode => ({
      id: t.id(),
      tier: t.data("tier"),
      kind: t.data("kind"),
      label: t.data("label"),
      alert: t.data("alert") || undefined,
      message: t.data("message") || undefined,
    });

    cy.on("mouseover", "node", (e: any) => {
      setHoverInfo(nodeInfo(e.target));
      // locked view / alerts pin / open context menu own the emphasis — don't
      // let a graph hover drop the current selection.
      if (lockedRef.current || ctxRef.current) return;
      if (viewRef.current === "alerts") return;
      hoverRef.current = e.target.id();
      applyEmphasis();
    });
    cy.on("mouseout", "node", () => {
      setHoverInfo(null);
      if (lockedRef.current || ctxRef.current) return;
      if (viewRef.current === "alerts") return;
      hoverRef.current = null;
      applyEmphasis(); // falls back to pinned / filter
    });
    cy.on("tap", "node", (e: any) => {
      if (lockedRef.current) return; // locked: no drilling
      const id = e.target.id();
      setSel(nodeInfo(e.target));
      if (e.target.data("reach") > 0) {
        setStack((s) => (s[s.length - 1] === id ? s : [...s, id]));
      }
    });
    cy.on("tap", (e: any) => {
      if (e.target === cy) {
        setCtx(null);
        ctxRef.current = null;
        if (lockedRef.current) return;
        setSel(null);
        setStack([]);
      }
    });
    // right-click → context menu; spotlight the node, shadow the whole graph
    cy.on("cxttap", "node", (e: any) => {
      e.originalEvent?.preventDefault?.();
      const info = nodeInfo(e.target);
      const rp = e.renderedPosition || e.target.renderedPosition();
      ctxRef.current = info.id;
      setCtx({ x: rp.x, y: rp.y, node: info });
      setSel(info);
      applyEmphasis();
    });

    // cheap per-frame update: just the zoom read-out + minimap viewport rect
    let raf = 0;
    const updateFrame = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setZoomPct(zoomToPct(cy.zoom()));
        const ext = cy.extent();
        setFrame({
          bb: bbRef.current,
          view: { x: ext.x1, y: ext.y1, w: ext.w, h: ext.h },
        });
      });
    };
    // expensive update: re-read node dots + graph bbox — only when layout changes
    const recomputeMini = () => {
      const next: { x: number; y: number; a: string }[] = [];
      cy.nodes(":visible").forEach((n: any) => {
        const p = n.position();
        next.push({ x: p.x, y: p.y, a: n.data("alert") });
      });
      const bb = cy.elements(":visible").boundingBox();
      bbRef.current = { x: bb.x1, y: bb.y1, w: bb.w, h: bb.h };
      setDots(next);
      updateFrame();
    };
    cy.on("pan zoom", updateFrame);
    cy.on("layoutstop", recomputeMini);
    cy.ready(() => setTimeout(recomputeMini, 250));
    return () => {
      if (raf) cancelAnimationFrame(raf);
      cy.destroy();
    };
  }, [applyEmphasis]);

  // ── Impact / Alerts colouring ─────────────────────────────────────────────
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass("err warn muted");
      if (view === "impact") return;
      const errSet = new Set<string>();
      const warnSet = new Set<string>();
      cy.nodes().forEach((n: any) => {
        if (n.data("alert") === "error") {
          errSet.add(n.id());
          n.successors("node").forEach((s: any) => errSet.add(s.id()));
        }
      });
      cy.nodes().forEach((n: any) => {
        if (n.data("alert") === "warning") {
          warnSet.add(n.id());
          n.successors("node").forEach((s: any) => {
            if (!errSet.has(s.id())) warnSet.add(s.id());
          });
        }
      });
      cy.nodes().forEach((n: any) => {
        if (errSet.has(n.id())) n.addClass("err");
        else if (warnSet.has(n.id())) n.addClass("warn");
        else n.addClass("muted");
      });
      cy.edges().forEach((edge: any) => {
        const t = edge.target().id();
        if (errSet.has(t)) edge.addClass("err");
        else if (warnSet.has(t)) edge.addClass("warn");
      });
    });
  }, [view]);

  // ── filter re-emphasis ────────────────────────────────────────────────────
  React.useEffect(() => {
    applyEmphasis();
  }, [filters, applyEmphasis]);

  // ── any right drawer open/close: resize the canvas (graph stays put) ──────
  const rightOpen = view === "alerts" || panel !== null;
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return undefined;
    if (view === "impact" && !locked) {
      pinnedRef.current = null;
      hoverRef.current = null;
      applyEmphasis();
    }
    // let the width transition run, then sync the renderer to the new size
    const t = setTimeout(() => cy.resize(), 280);
    return () => clearTimeout(t);
  }, [view, rightOpen, locked, applyEmphasis]);

  // ── marked nodes → golden star class on the graph ─────────────────────────
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().forEach((n: any) => {
        if (marked[n.id()]) n.addClass("marked");
        else n.removeClass("marked");
      });
    });
  }, [marked]);

  // ── lock: apply the chain + Escape-to-exit ────────────────────────────────
  React.useEffect(() => {
    applyEmphasis();
    if (!locked) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, applyEmphasis]);

  // ── context menu: Escape / scroll closes it ───────────────────────────────
  React.useEffect(() => {
    if (!ctx) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCtx(null);
        ctxRef.current = null;
        applyEmphasis();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx, applyEmphasis]);

  // ── focus (drill-in) vs network ───────────────────────────────────────────
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("picked rect");
    cy.edges().removeClass("fedge");
    if (!focusId) {
      hoverRef.current = null;
      cy.batch(() => {
        cy.elements().style("display", "element");
        cy.elements().removeClass("shadow chain");
      });
      cy.layout({
        name: "fcose",
        animate: true,
        animationDuration: 520,
        animationEasing: "ease-in-out-cubic",
        nodeRepulsion: 9000,
        idealEdgeLength: 64,
      }).run();
      return;
    }
    const root = cy.getElementById(focusId);
    // expand strictly rightward from the source: downstream reach only
    const keep = root.successors().union(root);
    const kept = keep.nodes();

    // longest-path rank from the root → strict left→right columns
    const rank: Record<string, number> = { [root.id()]: 0 };
    TIER_ORDER.forEach(() => {
      keep.edges().forEach((e: any) => {
        const s = e.source().id();
        const t = e.target().id();
        if (rank[s] !== undefined)
          rank[t] = Math.max(rank[t] ?? 0, rank[s] + 1);
      });
    });

    const COL_GAP = 340;
    const ROW_GAP = 64;
    const cols: any[][] = [];
    kept.forEach((n: any) => {
      const r = rank[n.id()] ?? 0;
      (cols[r] ||= []).push(n);
    });
    const rowOf: Record<string, number> = {};
    const positions: Record<string, { x: number; y: number }> = {};
    cols.forEach((list, col) => {
      if (col > 0) {
        list.sort((a: any, b: any) => {
          const bary = (nd: any) => {
            const ps = nd.incomers("node").filter((p: any) => keep.contains(p));
            if (!ps.length) return Number.MAX_SAFE_INTEGER;
            let s = 0;
            ps.forEach((p: any) => {
              s += rowOf[p.id()] ?? 0;
            });
            return s / ps.length;
          };
          return bary(a) - bary(b);
        });
      }
      const offset = ((list.length - 1) * ROW_GAP) / 2;
      list.forEach((n: any, i: number) => {
        rowOf[n.id()] = i;
        positions[n.id()] = { x: col * COL_GAP, y: i * ROW_GAP - offset };
      });
    });

    cy.batch(() => {
      cy.elements().style("display", "none");
      cy.elements().removeClass("shadow chain");
      keep.style("display", "element");
      keep.nodes().addClass("rect");
      keep.edges().addClass("fedge");
      root.addClass("picked");
    });
    keep
      .layout({
        name: "preset",
        positions: (n: any) => positions[n.id()],
        animate: true,
        animationDuration: 520,
        animationEasing: "ease-in-out-cubic",
        fit: false,
      })
      .run();
    setTimeout(() => {
      cy.animate(
        { fit: { eles: keep, padding: 60 } },
        { duration: 320, easing: "ease-in-out-cubic" },
      );
      setTimeout(() => {
        if (cy.zoom() < 0.55) {
          cy.animate(
            { zoom: { level: 0.55, position: root.position() } },
            { duration: 260, easing: "ease-out" },
          );
        }
      }, 340);
    }, 540);
  }, [focusId]);

  // ── navigator actions ─────────────────────────────────────────────────────
  const pan = (dx: number, dy: number) =>
    cyRef.current?.panBy({ x: dx, y: dy });
  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    const z = Math.max(MINZ, Math.min(MAXZ, cy.zoom() * factor));
    cy.animate(
      {
        zoom: { level: z, position: { x: cy.width() / 2, y: cy.height() / 2 } },
      },
      { duration: 140 },
    );
  };
  const setZoom = (p: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: pctToZoom(p),
      position: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };
  const fit = () =>
    cyRef.current?.animate({ fit: { padding: 40 } }, { duration: 220 });
  const reset = () => {
    setStack([]);
    setSel(null);
  };
  const back = () => setStack((s) => s.slice(0, -1));
  const toggleFilter = (t: Tier) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  // ── context-menu actions ──────────────────────────────────────────────────
  const closeMenu = () => {
    setCtx(null);
    ctxRef.current = null;
  };
  const menuDetails = () => {
    if (ctx) setPanel({ type: "details", nodeId: ctx.node.id });
    closeMenu();
    applyEmphasis();
  };
  const menuChain = () => {
    if (ctx) {
      pinnedRef.current = ctx.node.id;
      closeMenu();
      emphasize(ctx.node.id);
    }
  };
  const menuLock = () => {
    if (ctx) {
      setLocked(ctx.node.id); // effect applies the chain + Escape handler
      closeMenu();
    }
  };
  const menuMark = () => {
    if (ctx) setPanel({ type: "mark", nodeId: ctx.node.id });
    closeMenu();
    applyEmphasis();
  };
  const unlock = () => setLocked(null);
  const saveMark = (id: string, note: string) => {
    setMarked((prev) => ({ ...prev, [id]: { note, ts: Date.now() } }));
    setPanel(null);
  };
  const unmark = (id: string) =>
    setMarked((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const selectMarked = (id: string) => {
    // activate just this marked node's view; others shadowed (graph stays put)
    pinnedRef.current = id;
    emphasize(id);
    setSel(NODE_BY_ID[id]);
  };

  const C = {
    border: "var(--cg-border-card)",
    text: "var(--cg-text-primary)",
    muted: "var(--cg-text-muted)",
    card: "var(--cg-bg-card)",
  };

  const alertsOpen = view === "alerts";
  return (
    <div
      style={{
        position: "relative",
        height: "calc(100vh - 230px)",
        minHeight: 540,
        border: `1px solid ${C.border}`,
        background: BG,
        overflow: "hidden",
      }}
    >
      {/* graph area — shrinks to make room for the right drawer */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          right: rightOpen ? ALERTS_W : 0,
          transition: "right .25s ease",
        }}
      >
        <div ref={ref} style={{ position: "absolute", inset: 0 }} />

        {/* context-menu spotlight backdrop — click to dismiss */}
        {ctx && (
          <div
            onClick={() => {
              closeMenu();
              applyEmphasis();
            }}
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, zIndex: 14 }}
          />
        )}

        {/* node context menu */}
        {ctx && (
          <NodeContextMenu
            ctx={ctx}
            marked={!!marked[ctx.node.id]}
            onDetails={menuDetails}
            onChain={menuChain}
            onLock={menuLock}
            onMark={menuMark}
          />
        )}

        {/* locked-view banner — Escape to exit */}
        {locked && (
          <div
            style={{
              position: "absolute",
              top: 54,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px 7px 14px",
              borderRadius: 8,
              background: "rgb(23,23,22)",
              color: "#fff",
              fontSize: 12.5,
              boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
            }}
          >
            <Lock size={13} />
            Locked · {NODE_BY_ID[locked]?.label}
            <button
              type="button"
              onClick={unlock}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 24,
                padding: "0 9px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "transparent",
                color: "#fff",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              <X size={12} /> Esc
            </button>
          </div>
        )}

        {/* top-left toolbar: back · reset · fit */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 8,
            zIndex: 10,
          }}
        >
          {stack.length > 0 && (
            <button type="button" onClick={back} style={toolBtn(false)}>
              <ArrowLeft size={13} /> Back
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            disabled={!focusId}
            style={toolBtn(!focusId)}
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={fit} style={toolBtn(false)}>
            <Maximize2 size={13} /> Fit
          </button>
        </div>

        {/* hover read-out — terminal-style, top-left under the toolbar */}
        {hoverInfo && <HoverReadout node={hoverInfo} />}

        {/* filter bar */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
            zIndex: 10,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 9,
            padding: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {TIER_ORDER.map((t) => {
            const on = filters.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleFilter(t)}
                style={{
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 6,
                  border: `1px solid ${on ? TIER_COLOUR[t] : "transparent"}`,
                  background: on ? `${TIER_COLOUR[t]}1f` : "transparent",
                  color: on ? C.text : C.muted,
                  fontSize: 12,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: TIER_COLOUR[t],
                  }}
                />
                {TIER_LABEL[t]}
              </button>
            );
          })}
        </div>

        {/* impact / alerts toggle */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            zIndex: 10,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {(["impact", "alerts"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                if (v === "alerts") reset();
              }}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: view === v ? 700 : 500,
                background: view === v ? "var(--cg-accent-bg)" : "transparent",
                color: view === v ? "var(--cg-accent)" : C.muted,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {v === "alerts" && <AlertTriangle size={12} />}
              {v === "impact" ? "Impact Analysis" : "Alerts"}
            </button>
          ))}
        </div>

        {/* navigator controller */}
        <Navigator
          onPan={pan}
          onZoomIn={() => zoomBy(1.3)}
          onZoomOut={() => zoomBy(1 / 1.3)}
          onFit={fit}
          zoomPct={zoomPct}
          onZoomPct={setZoom}
          showMini={showMini}
          onToggleMini={() => setShowMini((s) => !s)}
          markedCount={Object.keys(marked).length}
          onOpenMarked={() => setPanel({ type: "marklist" })}
        />

        {/* frame viewer (minimap) */}
        {showMini && frame && frame.bb.w > 0 && (
          <Minimap
            frame={frame}
            dots={dots}
            onJump={(gx, gy) => {
              const cy = cyRef.current;
              if (!cy) return;
              // centre the clicked graph point in the viewport (keep zoom)
              cy.animate(
                {
                  pan: {
                    x: cy.width() / 2 - gx * cy.zoom(),
                    y: cy.height() / 2 - gy * cy.zoom(),
                  },
                },
                { duration: 180 },
              );
            }}
          />
        )}
      </div>

      {/* auxiliary drawer — node details · mark · marked list */}
      {panel && (
        <AuxDrawer
          panel={panel}
          marked={marked}
          onClose={() => {
            setPanel(null);
            applyEmphasis();
          }}
          onSaveMark={saveMark}
          onUnmark={unmark}
          onSelectMarked={selectMarked}
        />
      )}

      {/* alerts drawer — styled exactly like the Explorer side panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: ALERTS_W,
          background: "rgb(23,23,22)",
          borderLeft: "1px solid rgba(255,255,255,0.09)",
          color: "#e8eaed",
          display: "flex",
          flexDirection: "column",
          opacity: alertsOpen && !panel ? 1 : 0,
          transform:
            alertsOpen && !panel ? "translateX(0)" : "translateX(18px)",
          pointerEvents: alertsOpen && !panel ? "auto" : "none",
          transition: "opacity .25s ease, transform .25s ease",
          zIndex: 40,
        }}
      >
        <div
          style={{
            padding: "16px 16px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            fontSize: 14.5,
            fontWeight: 600,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={15} color={C_WARN} />
          Alerts · {ALERT_ROWS.length}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {ALERT_ROWS.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseEnter={() => emphasize(a.id)}
              onMouseLeave={() => emphasize(null)}
              onClick={() => {
                // pin this alert's path; graph stays exactly where it is
                pinnedRef.current = pinnedRef.current === a.id ? null : a.id;
                setSel({
                  id: a.id,
                  tier: a.tier as Tier,
                  kind: "",
                  label: a.label,
                  alert: a.type,
                  message: a.message,
                });
                emphasize(pinnedRef.current);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "11px 16px",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                borderLeft:
                  sel?.id === a.id
                    ? `3px solid ${a.type === "error" ? C_ERROR : C_WARN}`
                    : "3px solid transparent",
                background:
                  sel?.id === a.id ? "rgba(255,255,255,0.06)" : "transparent",
                color: "#e8eaed",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: a.type === "error" ? C_ERROR : C_WARN,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  {a.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "#9aa3ad",
                  marginTop: 4,
                  lineHeight: 1.45,
                }}
              >
                {a.message}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── navigator controller (pad + fit + minimap toggle + zoom slider) ──────────
function Navigator({
  onPan,
  onZoomIn,
  onZoomOut,
  onFit,
  zoomPct,
  onZoomPct,
  showMini,
  onToggleMini,
  markedCount,
  onOpenMarked,
}: {
  onPan: (dx: number, dy: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  zoomPct: number;
  onZoomPct: (p: number) => void;
  showMini: boolean;
  onToggleMini: () => void;
  markedCount: number;
  onOpenMarked: () => void;
}) {
  const STEP = 70;
  const ring = "rgb(23,23,22)";
  const padBtn: React.CSSProperties = {
    position: "absolute",
    width: 20,
    height: 20,
    border: "none",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
  const sqBtn = (active = false): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: 9,
    border: "none",
    background: active ? "rgba(255,255,255,0.18)" : ring,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 9,
        zIndex: 11,
      }}
    >
      {/* directional pad */}
      <div
        style={{
          position: "relative",
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: ring,
          boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
        }}
      >
        <button
          type="button"
          aria-label="Pan up"
          style={{ ...padBtn, top: 3, left: 22 }}
          onClick={() => onPan(0, STEP)}
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan down"
          style={{ ...padBtn, bottom: 3, left: 22 }}
          onClick={() => onPan(0, -STEP)}
        >
          <ChevronDown size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan left"
          style={{ ...padBtn, left: 3, top: 22 }}
          onClick={() => onPan(STEP, 0)}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan right"
          style={{ ...padBtn, right: 3, top: 22 }}
          onClick={() => onPan(-STEP, 0)}
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          aria-label="Fit to screen"
          onClick={onFit}
          style={{
            position: "absolute",
            left: 20,
            top: 20,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            color: ring,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Crosshair size={13} />
        </button>
      </div>

      {/* minimap toggle */}
      <button
        type="button"
        aria-label="Toggle minimap"
        onClick={onToggleMini}
        style={sqBtn(showMini)}
      >
        <Frame size={15} />
      </button>

      {/* marked-resources list */}
      <button
        type="button"
        aria-label="Marked resources"
        onClick={onOpenMarked}
        style={{ ...sqBtn(false), position: "relative" }}
      >
        <Star size={15} color="#f5b301" fill="#f5b301" />
        {markedCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 15,
              height: 15,
              borderRadius: 8,
              background: "#f5b301",
              color: "#3a2a00",
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
            }}
          >
            {markedCount}
          </span>
        )}
      </button>

      {/* zoom slider */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          background: ring,
          borderRadius: 18,
          padding: "10px 6px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
        }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          onClick={onZoomIn}
          style={{
            border: "none",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <Plus size={15} />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={zoomPct}
          onChange={(e) => onZoomPct(Number(e.target.value))}
          aria-label="Zoom"
          className="cg-impact-zoom"
          style={{
            writingMode: "vertical-lr" as any,
            direction: "rtl",
            width: 6,
            height: 96,
            accentColor: "#fff",
            cursor: "pointer",
          }}
        />
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          style={{
            border: "none",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <Minus size={15} />
        </button>
      </div>
    </div>
  );
}

const MINI_DOT: Record<string, string> = { error: C_ERROR, warning: C_WARN };

const MW = 168;
const MH = 108;

// dots are heavy and only change on layout → memoise so a pan (which only moves
// the viewport rect) never re-renders the whole dot field. Kills the pan glitch.
const MiniDots = React.memo(
  ({
    dots,
    bb,
  }: {
    dots: { x: number; y: number; a: string }[];
    bb: { x: number; y: number; w: number; h: number };
  }) => {
    const s = Math.min(
      (MW - 20) / Math.max(bb.w, 1),
      (MH - 20) / Math.max(bb.h, 1),
    );
    const ox = (MW - bb.w * s) / 2;
    const oy = (MH - bb.h * s) / 2;
    return (
      <>
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={ox + (d.x - bb.x) * s}
            cy={oy + (d.y - bb.y) * s}
            r={d.a ? 2.6 : 1.9}
            fill={MINI_DOT[d.a] || "#aab6c4"}
          />
        ))}
      </>
    );
  },
);
MiniDots.displayName = "MiniDots";

// ── frame viewer (minimap) ────────────────────────────────────────────────────
function Minimap({
  frame,
  dots,
  onJump,
}: {
  frame: {
    bb: { x: number; y: number; w: number; h: number };
    view: { x: number; y: number; w: number; h: number };
  };
  dots: { x: number; y: number; a: string }[];
  onJump: (gx: number, gy: number) => void;
}) {
  const { bb, view } = frame;
  const s = Math.min(
    (MW - 20) / Math.max(bb.w, 1),
    (MH - 20) / Math.max(bb.h, 1),
  );
  const ox = (MW - bb.w * s) / 2;
  const oy = (MH - bb.h * s) / 2;
  const mx = (x: number) => ox + (x - bb.x) * s;
  const my = (y: number) => oy + (y - bb.y) * s;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const vx = clamp(mx(view.x), 1, MW - 1);
  const vy = clamp(my(view.y), 1, MH - 1);
  const vw = clamp(view.w * s, 3, MW - vx - 1);
  const vh = clamp(view.h * s, 3, MH - vy - 1);
  return (
    <svg
      width={MW}
      height={MH}
      onClick={(e) => {
        const r = (e.target as SVGElement)
          .closest("svg")!
          .getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        onJump((px - ox) / s + bb.x, (py - oy) / s + bb.y);
      }}
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        zIndex: 9,
        background: "#27313a",
        border: "1px solid #5b9bf0",
        borderRadius: 6,
        boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
        cursor: "pointer",
      }}
    >
      <MiniDots dots={dots} bb={bb} />
      <rect
        x={vx}
        y={vy}
        width={vw}
        height={vh}
        rx={2}
        fill="rgba(91,155,240,0.16)"
        stroke="#5b9bf0"
        strokeWidth={1.3}
      />
    </svg>
  );
}

// ── hover read-out — terminal-style key:value lines ──────────────────────────
function HoverReadout({ node }: { node: IANode }) {
  const rows: [string, string][] = [
    [node.tier === "resource" ? "resource" : node.tier, node.label],
    ["category", TIER_LABEL[node.tier]],
    ["blast radius", `${REACH[node.id] ?? 0} downstream`],
  ];
  if (node.alert) rows.push(["status", node.alert.toUpperCase()]);
  return (
    <div
      style={{
        position: "absolute",
        top: 54,
        left: 12,
        zIndex: 10,
        minWidth: 230,
        maxWidth: 320,
        background: "rgb(23,23,22)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
        fontFamily:
          "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
        fontSize: 12,
        lineHeight: 1.65,
        pointerEvents: "none",
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
          <span
            style={{
              color: "#7f8a84",
              minWidth: 92,
              display: "inline-block",
            }}
          >
            {k}
          </span>
          <span style={{ color: "#8a96a8" }}>:</span>
          <span
            style={{
              color: node.alert === "error" ? "#ff8c82" : "#e8e8e2",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── right-click node context menu ─────────────────────────────────────────────
function NodeContextMenu({
  ctx,
  marked,
  onDetails,
  onChain,
  onLock,
  onMark,
}: {
  ctx: { x: number; y: number; node: IANode };
  marked: boolean;
  onDetails: () => void;
  onChain: () => void;
  onLock: () => void;
  onMark: () => void;
}) {
  const items: { icon: React.ReactNode; label: string; on: () => void }[] = [
    { icon: <Info size={14} />, label: "View node details", on: onDetails },
    { icon: <GitBranch size={14} />, label: "Dependency chain", on: onChain },
    { icon: <Lock size={14} />, label: "Lock the view", on: onLock },
    {
      icon: (
        <Star
          size={14}
          color={marked ? "#f5b301" : undefined}
          fill={marked ? "#f5b301" : "none"}
        />
      ),
      label: marked ? "Edit mark / note" : "Mark node",
      on: onMark,
    },
  ];
  // keep the menu inside the canvas
  const left = Math.min(ctx.x + 6, 100000);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: ctx.y + 6,
        zIndex: 16,
        minWidth: 190,
        background: "rgb(23,23,22)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: 6,
        boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          padding: "6px 10px 8px",
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 220,
        }}
      >
        {ctx.node.label}
      </div>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.on}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            width: "100%",
            padding: "8px 10px",
            border: "none",
            borderRadius: 6,
            background: "transparent",
            color: "#dfe2e6",
            fontSize: 12.5,
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ── auxiliary right drawer (details · mark · marked list) ─────────────────────
const drawerShell: React.CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  height: "100%",
  width: ALERTS_W,
  background: "rgb(23,23,22)",
  borderLeft: "1px solid rgba(255,255,255,0.09)",
  color: "#e8eaed",
  display: "flex",
  flexDirection: "column",
  zIndex: 41,
};
const drawerHead: React.CSSProperties = {
  padding: "16px 16px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  fontSize: 14.5,
  fontWeight: 600,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const drawerSec: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "#878d96",
  margin: "18px 0 8px",
};

function AuxDrawer({
  panel,
  marked,
  onClose,
  onSaveMark,
  onUnmark,
  onSelectMarked,
}: {
  panel: { type: "details" | "mark" | "marklist"; nodeId?: string };
  marked: Record<string, { note: string; ts: number }>;
  onClose: () => void;
  onSaveMark: (id: string, note: string) => void;
  onUnmark: (id: string) => void;
  onSelectMarked: (id: string) => void;
}) {
  const node = panel.nodeId ? NODE_BY_ID[panel.nodeId] : undefined;
  const [note, setNote] = React.useState(
    panel.nodeId ? (marked[panel.nodeId]?.note ?? "") : "",
  );
  const closeBtn = (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      style={{
        marginLeft: "auto",
        background: "transparent",
        border: "none",
        color: "#9aa3ad",
        cursor: "pointer",
        display: "inline-flex",
      }}
    >
      <X size={17} />
    </button>
  );

  if (panel.type === "details" && node) {
    const rel = relationsOf(node.id);
    const relRow = (r: IANode, dir: string) => (
      <div
        key={dir + r.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0",
          fontSize: 12.5,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: TIER_COLOUR[r.tier],
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#8a96a8" }}>{dir}</span>
        <span
          style={{
            color: "#e8eaed",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.label}
        </span>
      </div>
    );
    return (
      <div style={drawerShell}>
        <div style={drawerHead}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              background: TIER_COLOUR[node.tier],
            }}
          />
          Node details
          {closeBtn}
        </div>
        <div style={{ overflowY: "auto", padding: "0 16px 20px", flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
              marginTop: 16,
              wordBreak: "break-all",
            }}
          >
            {node.label}
          </div>
          <div style={{ fontSize: 12, color: "#9aa3ad", marginTop: 4 }}>
            {TIER_LABEL[node.tier]} · blast radius{" "}
            <b style={{ color: "#fff" }}>{REACH[node.id] ?? 0}</b> downstream
          </div>
          {node.message && (
            <div
              style={{
                marginTop: 12,
                padding: "9px 11px",
                borderRadius: 8,
                background:
                  node.alert === "error"
                    ? "rgba(224,73,47,0.14)"
                    : "rgba(217,154,0,0.14)",
                border: `1px solid ${node.alert === "error" ? C_ERROR : C_WARN}55`,
                fontSize: 12,
                color: node.alert === "error" ? "#ff9b91" : "#f4d98a",
                lineHeight: 1.45,
              }}
            >
              {node.message}
            </div>
          )}
          {marked[node.id] && (
            <>
              <div style={drawerSec}>
                <Star
                  size={11}
                  color="#f5b301"
                  fill="#f5b301"
                  style={{ verticalAlign: -1, marginRight: 5 }}
                />
                Note
              </div>
              <div
                style={{ fontSize: 12.5, color: "#e8eaed", lineHeight: 1.5 }}
              >
                {marked[node.id].note || "—"}
              </div>
            </>
          )}
          {rel.up.length > 0 && (
            <>
              <div style={drawerSec}>Upstream ({rel.up.length})</div>
              {rel.up.map((r) => relRow(r, "←"))}
            </>
          )}
          {rel.down.length > 0 && (
            <>
              <div style={drawerSec}>Downstream ({rel.down.length})</div>
              {rel.down.map((r) => relRow(r, "→"))}
            </>
          )}
        </div>
      </div>
    );
  }

  if (panel.type === "mark" && node) {
    return (
      <div style={drawerShell}>
        <div style={drawerHead}>
          <Star size={15} color="#f5b301" fill="#f5b301" />
          Mark node
          {closeBtn}
        </div>
        <div
          style={{
            padding: "16px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              wordBreak: "break-all",
            }}
          >
            {node.label}
          </div>
          <div style={{ fontSize: 12, color: "#9aa3ad", marginTop: 3 }}>
            {TIER_LABEL[node.tier]}
          </div>
          <div style={drawerSec}>Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this flagged? Add context for your team…"
            style={{
              width: "100%",
              minHeight: 120,
              resize: "vertical",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 8,
              color: "#e8eaed",
              fontSize: 13,
              padding: 10,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => onSaveMark(node.id, note)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: "none",
                background: "#f5b301",
                color: "#3a2a00",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Star size={14} fill="#3a2a00" /> Save mark
            </button>
            {marked[node.id] && (
              <button
                type="button"
                onClick={() => {
                  onUnmark(node.id);
                  onClose();
                }}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "#dfe2e6",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // marklist
  const entries = Object.entries(marked).sort((a, b) => b[1].ts - a[1].ts);
  return (
    <div style={drawerShell}>
      <div style={drawerHead}>
        <Star size={15} color="#f5b301" fill="#f5b301" />
        Marked · {entries.length}
        {closeBtn}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {entries.length === 0 && (
          <div
            style={{
              padding: 20,
              fontSize: 12.5,
              color: "#9aa3ad",
              lineHeight: 1.5,
            }}
          >
            No marked nodes yet. Right-click a node → Mark node to flag it with
            a note.
          </div>
        )}
        {entries.map(([id, m]) => {
          const n = NODE_BY_ID[id];
          if (!n) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectMarked(id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "11px 16px",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                color: "#e8eaed",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={12} color="#f5b301" fill="#f5b301" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  {n.label}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10.5,
                    color: "#7f8a84",
                  }}
                >
                  {TIER_LABEL[n.tier]}
                </span>
              </div>
              {m.note && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#9aa3ad",
                    marginTop: 4,
                    lineHeight: 1.45,
                  }}
                >
                  {m.note}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toolBtn(disabled: boolean): React.CSSProperties {
  return {
    height: 30,
    padding: "0 12px",
    borderRadius: 7,
    border: "1px solid var(--cg-border-card)",
    background: "var(--cg-bg-card)",
    color: disabled ? "var(--cg-text-muted)" : "var(--cg-text-primary)",
    fontSize: 12,
    cursor: disabled ? "default" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    opacity: disabled ? 0.6 : 1,
  };
}

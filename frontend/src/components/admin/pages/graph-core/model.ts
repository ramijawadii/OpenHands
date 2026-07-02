// ─────────────────────────────────────────────────────────────────────────────
// CloudGuard graph-core — the typed security-graph model.
//
// This is the single source of truth for what a node/edge IS. Both the Security
// Graph and the Explorer feed their data through this model so connection
// semantics (direction, relationship kind, provenance) are explicit and
// validated instead of implied by an untyped {source,target} pair.
// ─────────────────────────────────────────────────────────────────────────────

// Semantic relationship kinds. Direction ALWAYS means source → target; what
// that implies (privilege, data, network) is captured by the kind so a caller
// can traverse "who can reach X" (privilege) separately from "what data flows
// to X" (data). Mixing these silently is the #1 accuracy bug in graph UIs.
export type EdgeKind =
  | "assumes_role" // identity → role
  | "attached_policy" // role → policy
  | "grants_access" // policy → resource (privilege)
  | "network_path" // resource → resource (reachability)
  | "data_flow" // resource → resource (data)
  | "decrypts_with" // resource → key
  | "member_of" // identity → group
  | "generic"; // unclassified (should trend to zero)

export const EDGE_KINDS: EdgeKind[] = [
  "assumes_role",
  "attached_policy",
  "grants_access",
  "network_path",
  "data_flow",
  "decrypts_with",
  "member_of",
  "generic",
];

// Traversal direction. down = follow out-edges (what this node reaches),
// up = follow in-edges (what reaches this node), both = union.
export type Dir = "down" | "up" | "both";

export interface GraphNodeInput {
  /** canonical id — an ARN/URN in production, a stable key in Sample data */
  id: string;
  /** domain kind / icon key (e.g. tier or resource kind) */
  kind: string;
  label: string;
  /** optional layer/tier for ordering (identity/role/policy/resource, …) */
  tier?: string;
  /** free-form attributes (env, account, region, finding, …) */
  attrs?: Record<string, unknown>;
}

export interface GraphEdgeInput {
  source: string;
  target: string;
  kind?: EdgeKind;
  /** 0..1 — observed (1) vs inferred (<1); lets the UI filter low-confidence */
  confidence?: number;
  /** which scan/rule produced this edge (audit + staleness) */
  provenance?: string;
}

export interface GraphSpec {
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
}

// Normalised edge as stored by the engine (kind/confidence defaulted).
export interface NormEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  confidence: number;
  provenance: string;
}

export interface NeighborhoodOpts {
  dir?: Dir;
  /** hop bound; 0 or undefined = unbounded (full transitive) */
  maxDepth?: number;
  /** restrict to these relationship kinds */
  kinds?: Set<EdgeKind> | EdgeKind[];
  /** minimum edge confidence to traverse */
  minConfidence?: number;
  /** cap on returned nodes (LOD / scale guard); default 1500 */
  nodeLimit?: number;
}

export interface Subgraph {
  nodes: GraphNodeInput[];
  edges: NormEdge[];
  /** true if nodeLimit was hit and the neighborhood was cut short */
  truncated: boolean;
  rootId: string;
}

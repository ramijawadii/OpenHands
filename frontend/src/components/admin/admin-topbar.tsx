/* eslint-disable i18next/no-literal-string, no-param-reassign, no-nested-ternary -- CloudGuard admin top bar (global search · notifications · profile) */
import React from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Bell,
  X,
  Settings,
  User,
  LogOut,
  CheckCheck,
  Folder,
} from "lucide-react";
import { create, insertMultiple, search } from "@orama/orama";
import { NAV_CATALOG, NAV_GROUP_ORDER } from "./admin-nav-catalog";
import { fetchNotifications, type Notif, type Cat } from "./notif-source";
import { T, Toggle } from "./admin-kit";
import {
  RoleChip,
  useCurrentRole,
} from "#/components/features/settings/settings-kit";

// ─────────────────────────────────────────────────────────────────────────────
// Global search — grouped, hierarchical result dropdown
// ─────────────────────────────────────────────────────────────────────────────
type Hit = { group: string; label: string; sub: string; to: string };

// Sample records (demo entities) — appended after the full nav catalog so the
// search also covers representative people/policies/workspaces/agents.
const SAMPLE_RECORDS: Hit[] = [
  {
    group: "People",
    label: "Jane Cooper",
    sub: "Admin · jane@acme.io",
    to: "/admin/identity?group=identity",
  },
  {
    group: "People",
    label: "Marcus Lee",
    sub: "Security · marcus@acme.io",
    to: "/admin/identity?group=identity",
  },
  {
    group: "People",
    label: "Priya Nair",
    sub: "Compliance · priya@acme.io",
    to: "/admin/identity?group=identity",
  },
  {
    group: "Service identities",
    label: "ci-deployer",
    sub: "Service account",
    to: "/admin/identity?group=identity",
  },
  {
    group: "Service identities",
    label: "scanner-bot",
    sub: "Workload identity",
    to: "/admin/identity?group=identity",
  },
  {
    group: "Policies",
    label: "Mandatory MFA",
    sub: "Enterprise floor",
    to: "/admin/security",
  },
  {
    group: "Policies",
    label: "No public S3",
    sub: "Posture policy",
    to: "/admin/security",
  },
  {
    group: "Policies",
    label: "Data residency — EU",
    sub: "Compliance floor",
    to: "/admin/compliance",
  },
  {
    group: "Workspaces",
    label: "Production",
    sub: "12 members",
    to: "/admin/workspaces",
  },
  {
    group: "Workspaces",
    label: "Staging",
    sub: "8 members",
    to: "/admin/workspaces",
  },
  {
    group: "Agents",
    label: "cloud-recon",
    sub: "Discovery agent",
    to: "/admin/runtime-governance",
  },
  {
    group: "Agents",
    label: "remediation-01",
    sub: "Action agent",
    to: "/admin/runtime-governance",
  },
];
// full IA (every section + sub-tab) first, then sample records
const SEARCH_INDEX: Hit[] = [...NAV_CATALOG, ...SAMPLE_RECORDS];
const GROUP_ORDER = [
  ...NAV_GROUP_ORDER,
  "People",
  "Service identities",
  "Policies",
  "Workspaces",
  "Agents",
];

// Orama full-text index — built once (typo-tolerant, boosts label over context).
function buildIndex() {
  const db = create({
    schema: {
      id: "string",
      label: "string",
      sub: "string",
      group: "string",
      to: "string",
    },
  });
  insertMultiple(
    db,
    SEARCH_INDEX.map((h, i) => ({ id: String(i), ...h })),
  );
  return db;
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const db = React.useMemo(buildIndex, []);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          inputRef.current?.focus();
          setOpen(true);
        }
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const term = q.trim();
  const hits: Hit[] = React.useMemo(() => {
    if (!term) return [];
    const res = search(db, {
      term,
      properties: ["label", "sub", "group"],
      boost: { label: 4, sub: 1.5, group: 1 },
      tolerance: 1,
      limit: 40,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((res as any).hits ?? []).map((h: any) => h.document as Hit);
  }, [term, db]);
  const groups = GROUP_ORDER.map((g) => ({
    g,
    items: hits.filter((h) => h.group === g),
  })).filter((x) => x.items.length);
  // flat list (in display order) drives ↑/↓ keyboard navigation
  const flat = groups.flatMap((x) => x.items);
  const activeKey = flat[active] ? flat[active].label + flat[active].to : null;
  React.useEffect(() => {
    setActive(0);
  }, [term]);

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
    setQ("");
  };
  const onInputKey = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[active];
      if (hit) go(hit.to);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: 32,
          width: open ? 300 : 220,
          transition: "width .15s ease",
          background: "var(--cg-input-bg, var(--cg-bg-card))",
          border: `1px solid ${open ? T.accent : T.border}`,
          borderRadius: 7,
          padding: "0 9px",
        }}
      >
        <Search size={14} color={T.textMuted} style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKey}
          placeholder="Search the console…"
          aria-label="Global search"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            background: "transparent",
            color: T.textPrimary,
            fontSize: 13,
            outline: "none",
          }}
        />
        {!q && (
          <kbd
            style={{
              fontSize: 10.5,
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              padding: "0 5px",
              lineHeight: "16px",
            }}
          >
            /
          </kbd>
        )}
      </div>

      {open && term && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: 38,
            right: 0,
            width: 420,
            maxHeight: 460,
            overflowY: "auto",
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            boxShadow: "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,0.3))",
            zIndex: 60,
            padding: "6px 0",
          }}
        >
          {groups.length === 0 ? (
            <div
              style={{
                padding: "18px 16px",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              No matches for “{q}”.
            </div>
          ) : (
            groups.map(({ g, items }) => (
              <div key={g} style={{ marginBottom: 2 }}>
                {/* folder (group) row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px 5px",
                  }}
                >
                  <Folder size={13} color={T.textMuted} />
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: T.textMuted,
                    }}
                  >
                    {g}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: T.textMuted,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                {/* children — indented under the folder with a tree guide line */}
                <div
                  style={{
                    marginLeft: 20,
                    borderLeft: `1px solid ${T.border}`,
                  }}
                >
                  {items.map((h) => {
                    const isActive = h.label + h.to === activeKey;
                    return (
                      <button
                        key={h.label + h.to}
                        type="button"
                        ref={(el) => {
                          if (isActive && el)
                            el.scrollIntoView({ block: "nearest" });
                        }}
                        onClick={() => go(h.to)}
                        onMouseMove={() => {
                          const idx = flat.findIndex(
                            (f) => f.label + f.to === h.label + h.to,
                          );
                          if (idx >= 0) setActive(idx);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "6px 14px 6px 0",
                          background: isActive
                            ? "var(--cg-accent-bg)"
                            : "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {/* horizontal connector tick → folder-tree feel */}
                        <span
                          aria-hidden="true"
                          style={{
                            width: 12,
                            height: 1,
                            background: T.border,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13,
                            color: T.textPrimary,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {h.label}
                        </span>
                        {/* aligned context column */}
                        <span
                          style={{
                            width: 150,
                            flexShrink: 0,
                            textAlign: "right",
                            fontSize: 11.5,
                            color: T.textMuted,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {h.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications — drawer with Recent (filterable) + Settings.
// Data comes from notif-source: Novu when configured, local sample otherwise.
// ─────────────────────────────────────────────────────────────────────────────
const CAT_LABEL: Record<Cat, string> = {
  agent: "AI Agent Actions",
  team: "Team Activity",
  platform: "Platform & Posture",
};
const CAT_FILTERS: { id: "all" | Cat; label: string }[] = [
  { id: "all", label: "All" },
  { id: "agent", label: "AI Agent Actions" },
  { id: "team", label: "Team Activity" },
  { id: "platform", label: "Platform & Posture" },
];

const NOTIFS: Notif[] = [
  {
    id: "n1",
    title: "Threat remediation needs approval",
    body: "Agent remediation-01 wants to revoke 3 over-privileged IAM keys.",
    time: "2m",
    read: false,
    category: "agent",
    critical: true,
    hitl: { resource: "prod-iam", policy: "Manual Approval" },
  },
  {
    id: "n2",
    title: "Public S3 bucket auto-quarantined",
    body: "Guardrail isolated prod-assets after a public-ACL detection.",
    time: "20m",
    read: false,
    category: "agent",
  },
  {
    id: "n3",
    title: "Reachability scan complete",
    body: "84 findings re-scored — 6 are now actually exploitable.",
    time: "1h",
    read: true,
    category: "agent",
  },
  {
    id: "n4",
    title: "Policy override requested",
    body: "John Doe requested a policy override for Production K8s.",
    time: "12m",
    read: false,
    category: "team",
  },
  {
    id: "n5",
    title: "Incident assigned to you",
    body: "Mark assigned Incident #402 to you.",
    time: "40m",
    read: false,
    category: "team",
  },
  {
    id: "n6",
    title: "Exception approved",
    body: "Priya approved your EU data-residency exception.",
    time: "3h",
    read: true,
    category: "team",
  },
  {
    id: "n7",
    title: "AWS connector token expiring",
    body: "Token for ‘aws-prod’ expires in 3 days — rotate to avoid scan gaps.",
    time: "5h",
    read: false,
    category: "platform",
    critical: true,
  },
  {
    id: "n8",
    title: "Daily CIS Benchmark scan complete",
    body: "AWS prod: 92% pass (+3% vs yesterday).",
    time: "8h",
    read: true,
    category: "platform",
  },
  {
    id: "n9",
    title: "New connector available",
    body: "Wiz integration is now supported.",
    time: "1d",
    read: true,
    category: "platform",
  },
  // ── older history (drives pagination / lazy-load) ──────────────────────────
  {
    id: "n10",
    title: "Agent revoked stale session tokens",
    body: "scanner-bot cleared 7 idle sessions over 30d old.",
    time: "1d",
    read: true,
    category: "agent",
  },
  {
    id: "n11",
    title: "Lateral-movement path detected",
    body: "Agent found an escalation path from ci-deployer to prod-rds.",
    time: "1d",
    read: true,
    category: "agent",
    critical: true,
  },
  {
    id: "n12",
    title: "Access review assigned",
    body: "Priya assigned you the Q2 privileged-access certification.",
    time: "2d",
    read: true,
    category: "team",
  },
  {
    id: "n13",
    title: "Comment on Incident #388",
    body: "John added a note to the closed S3 exposure incident.",
    time: "2d",
    read: true,
    category: "team",
  },
  {
    id: "n14",
    title: "GCP connector token expiring",
    body: "Token for ‘gcp-shared’ expires in 9 days.",
    time: "2d",
    read: true,
    category: "platform",
  },
  {
    id: "n15",
    title: "Weekly posture digest",
    body: "Secure score 88% across 4 accounts (+1%).",
    time: "3d",
    read: true,
    category: "platform",
  },
  {
    id: "n16",
    title: "Agent paused on low confidence",
    body: "remediation-02 paused a fix pending more signal.",
    time: "3d",
    read: true,
    category: "agent",
  },
  {
    id: "n17",
    title: "Override request resolved",
    body: "Mark denied the Production K8s privilege override.",
    time: "4d",
    read: true,
    category: "team",
  },
  {
    id: "n18",
    title: "CIS Benchmark scan complete",
    body: "Azure prod: 90% pass (-1%).",
    time: "4d",
    read: true,
    category: "platform",
  },
  {
    id: "n19",
    title: "Agent quarantined a malicious package",
    body: "Blocked a typosquatted dependency in build-api.",
    time: "5d",
    read: true,
    category: "agent",
  },
  {
    id: "n20",
    title: "New auditor invited",
    body: "Dana joined the workspace with the Auditor role.",
    time: "5d",
    read: true,
    category: "team",
  },
  {
    id: "n21",
    title: "DLP policy updated",
    body: "PII egress rules tightened on the data plane.",
    time: "6d",
    read: true,
    category: "platform",
  },
  {
    id: "n22",
    title: "Agent re-scored 1.2k findings",
    body: "Nightly reachability pass reprioritized the backlog.",
    time: "6d",
    read: true,
    category: "agent",
  },
];

// Settings model — concrete, per-category controls (not generic).
const SETTINGS_SECTIONS: {
  cat: string;
  rows: { k: string; desc: string; on: boolean }[];
  select?: { k: string; options: string[]; value: string };
}[] = [
  {
    cat: "AI Agent Actions",
    rows: [
      {
        k: "Autonomous action alerts",
        desc: "Every action a security agent proposes or executes",
        on: true,
      },
      {
        k: "Require approval (HITL) for high-risk actions",
        desc: "Gate destructive remediations behind a human Approve / Deny",
        on: true,
      },
      {
        k: "Agent telemetry & detections",
        desc: "Threat detections and scan results from agents",
        on: false,
      },
    ],
    select: {
      k: "Auto-escalate unanswered approvals after",
      options: ["15 minutes", "1 hour", "4 hours", "Never"],
      value: "1 hour",
    },
  },
  {
    cat: "Team Activity",
    rows: [
      {
        k: "Mentions & assignments",
        desc: "When a teammate @mentions or assigns you",
        on: true,
      },
      {
        k: "Override & exception requests",
        desc: "Policy override / waiver requests needing review",
        on: true,
      },
      {
        k: "Incident hand-offs",
        desc: "Incidents reassigned to you or your team",
        on: true,
      },
    ],
  },
  {
    cat: "Platform & Posture",
    rows: [
      {
        k: "Scan & benchmark summaries",
        desc: "CIS / posture scan completion digests",
        on: true,
      },
      {
        k: "Connector & credential expiry",
        desc: "Expiring connector tokens, keys and certificates",
        on: true,
      },
      {
        k: "Maintenance & releases",
        desc: "Platform maintenance windows and new features",
        on: false,
      },
    ],
  },
];
const DELIVERY = ["In-app", "Email", "Slack"];
const NOTIF_PAGE = 8;

// Loading skeleton — used for the initial fetch, lazy "load more", and Settings.
function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          style={{ display: "flex", gap: 10, padding: "10px 10px" }}
        >
          <span
            style={{
              marginTop: 5,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: T.border,
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                height: 11,
                width: `${60 + ((i * 13) % 30)}%`,
                borderRadius: 5,
                background: T.border,
                opacity: 0.7,
              }}
            />
            <span
              style={{
                display: "block",
                marginTop: 7,
                height: 9,
                width: `${40 + ((i * 17) % 35)}%`,
                borderRadius: 5,
                background: T.border,
                opacity: 0.45,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function NotifDrawer({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = React.useState<"recent" | "settings">("recent");
  const [readFilter, setReadFilter] = React.useState<"all" | "unread" | "read">(
    "all",
  );
  const [cat, setCat] = React.useState<"all" | Cat>("all");
  const [items, setItems] = React.useState(NOTIFS);
  // pagination / lazy-load + settings lazy-load
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [settingsReady, setSettingsReady] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  // settings state — seeded from the model so toggles reflect real values
  const [setVals, setSetVals] = React.useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    SETTINGS_SECTIONS.forEach((s) =>
      s.rows.forEach((r) => {
        v[r.k] = r.on;
      }),
    );
    DELIVERY.forEach((d) => {
      v[`ch:${d}`] = d !== "Slack";
    });
    v["Critical alerts bypass quiet hours"] = true;
    return v;
  });
  const flip = (k: string) => setSetVals((p) => ({ ...p, [k]: !p[k] }));

  const pool = items.filter(
    (n) =>
      (readFilter === "all" || (readFilter === "unread" ? !n.read : n.read)) &&
      (cat === "all" || n.category === cat),
  );
  const visible = pool.slice(0, count);
  const hasMore = count < pool.length;

  // Load from the source (Novu when configured, else local) on first open, then
  // re-page locally on filter changes — each with a skeleton.
  const loadedRef = React.useRef(false);
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setCount(0);
    const apply = () => {
      if (!alive) return;
      setCount(NOTIF_PAGE);
      setLoading(false);
    };
    if (!loadedRef.current) {
      fetchNotifications(NOTIFS).then((list) => {
        if (!alive) return;
        setItems(list);
        loadedRef.current = true;
        apply();
      });
      return () => {
        alive = false;
      };
    }
    const t = window.setTimeout(apply, 240);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [readFilter, cat]);

  // lazy "load more" on scroll via IntersectionObserver
  const loadMore = React.useCallback(() => {
    if (loading || loadingMore) return;
    setLoadingMore(true);
    window.setTimeout(() => {
      setCount((c) => c + NOTIF_PAGE);
      setLoadingMore(false);
    }, 380);
  }, [loading, loadingMore]);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadMore, visible.length]);

  // lazy-load the Settings panel the first time the tab is opened
  React.useEffect(() => {
    if (tab !== "settings" || settingsReady) return undefined;
    const t = window.setTimeout(() => setSettingsReady(true), 360);
    return () => window.clearTimeout(t);
  }, [tab, settingsReady]);

  const markAll = () => setItems((p) => p.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  const decide = (id: string, decision: "approved" | "denied") =>
    setItems((p) =>
      p.map((n) => (n.id === id ? { ...n, decision, read: true } : n)),
    );

  const chip = (active: boolean): React.CSSProperties => ({
    height: 26,
    padding: "0 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? "var(--cg-accent-bg)" : "transparent",
    color: active ? T.textPrimary : T.textNav,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--cg-overlay, rgba(0,0,0,0.4))",
          zIndex: 70,
        }}
      />
      <aside
        role="dialog"
        aria-label="Notifications"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: 408,
          background: T.cardBg,
          borderLeft: `1px solid ${T.border}`,
          zIndex: 71,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>
            Notifications
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: T.textMuted,
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* tab switch */}
        <div
          style={{
            display: "flex",
            gap: 18,
            padding: "0 16px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {(["recent", "settings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${tab === t ? T.accent : "transparent"}`,
                padding: "10px 1px",
                marginBottom: -1,
                color: tab === t ? T.textPrimary : T.textNav,
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "recent" ? (
          <>
            <div style={{ padding: "12px 16px 8px" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {(["all", "unread", "read"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setReadFilter(f)}
                    style={{
                      ...chip(readFilter === f),
                      textTransform: "capitalize",
                    }}
                  >
                    {f}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={markAll}
                  title="Mark all as read"
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 26,
                    padding: "0 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: T.accent,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              </div>
              {/* main category filter */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CAT_FILTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCat(c.id)}
                    style={chip(cat === c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{ flex: 1, overflowY: "auto", padding: "4px 8px 16px" }}
            >
              {loading ? (
                <RowSkeleton rows={6} />
              ) : pool.length === 0 ? (
                <div
                  style={{
                    padding: "24px 12px",
                    fontSize: 12.5,
                    color: T.textMuted,
                    textAlign: "center",
                  }}
                >
                  Nothing here.
                </div>
              ) : (
                visible.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      width: "100%",
                      padding: "10px 10px",
                      borderRadius: 8,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        marginTop: 5,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: n.read
                          ? "transparent"
                          : n.critical
                            ? T.danger
                            : T.accent,
                        border: n.read ? `1px solid ${T.border}` : "none",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => toggleRead(n.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: n.read ? 400 : 600,
                              color: T.textPrimary,
                            }}
                          >
                            {n.title}
                          </span>
                          <span style={{ fontSize: 11, color: T.textMuted }}>
                            {n.time}
                          </span>
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 12,
                            color: T.textMuted,
                            marginTop: 2,
                          }}
                        >
                          {n.body}
                        </span>
                      </button>

                      {/* HITL interactive approval gate */}
                      {n.hitl && !n.decision && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: `1px solid var(--cg-danger-border, ${T.border})`,
                            background: "var(--cg-danger-bg, transparent)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11.5,
                              color: T.textNav,
                              marginBottom: 8,
                            }}
                          >
                            <strong style={{ color: T.textPrimary }}>
                              Manual approval required
                            </strong>{" "}
                            · {n.hitl.resource} · policy: {n.hitl.policy}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => decide(n.id, "approved")}
                              style={{
                                flex: 1,
                                height: 28,
                                borderRadius: 6,
                                border: "none",
                                background: `var(--cg-btn-cta-bg, ${T.accent})`,
                                color: "var(--cg-btn-cta-text, #fff)",
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => decide(n.id, "denied")}
                              style={{
                                flex: 1,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${T.danger}`,
                                background: "transparent",
                                color: T.danger,
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      )}
                      {n.hitl && n.decision && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color:
                              n.decision === "approved" ? T.success : T.danger,
                          }}
                        >
                          {n.decision === "approved"
                            ? "✓ Approved by you"
                            : "✕ Denied by you"}
                        </div>
                      )}

                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: T.textNav,
                          background: T.badgeBg,
                          borderRadius: 5,
                          padding: "1px 7px",
                        }}
                      >
                        {CAT_LABEL[n.category]}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {/* lazy-load sentinel + "load more" skeleton */}
              {!loading && hasMore && (
                <div ref={sentinelRef}>
                  {loadingMore && <RowSkeleton rows={2} />}
                </div>
              )}
              {!loading && !hasMore && pool.length > NOTIF_PAGE && (
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11.5,
                    color: T.textMuted,
                    padding: "12px 0 4px",
                  }}
                >
                  You’re all caught up.
                </div>
              )}
            </div>
          </>
        ) : settingsReady ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
            {SETTINGS_SECTIONS.map((s) => (
              <div key={s.cat} style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: T.textMuted,
                    padding: "10px 0 2px",
                  }}
                >
                  {s.cat}
                </div>
                {s.rows.map((r) => (
                  <div
                    key={r.k}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "11px 0",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: T.textPrimary,
                        }}
                      >
                        {r.k}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: T.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {r.desc}
                      </div>
                    </div>
                    <Toggle on={!!setVals[r.k]} onChange={() => flip(r.k)} />
                  </div>
                ))}
                {s.select && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "11px 0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.textPrimary,
                      }}
                    >
                      {s.select.k}
                    </div>
                    <select
                      defaultValue={s.select.value}
                      style={{
                        height: 30,
                        borderRadius: 6,
                        border: `1px solid ${T.border}`,
                        background: "var(--cg-input-bg, var(--cg-bg-card))",
                        color: T.textPrimary,
                        fontSize: 12.5,
                        padding: "0 8px",
                      }}
                    >
                      {s.select.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}

            {/* delivery channels + global */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: T.textMuted,
                padding: "16px 0 2px",
              }}
            >
              Delivery
            </div>
            {DELIVERY.map((d) => (
              <div
                key={d}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 0",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.textPrimary,
                  }}
                >
                  {d}
                </div>
                <Toggle
                  on={!!setVals[`ch:${d}`]}
                  onChange={() => flip(`ch:${d}`)}
                />
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "11px 0",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.textPrimary,
                  }}
                >
                  Critical alerts bypass quiet hours
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                  Page on criticals (e.g. HITL approvals) even when muted
                </div>
              </div>
              <Toggle
                on={!!setVals["Critical alerts bypass quiet hours"]}
                onChange={() => flip("Critical alerts bypass quiet hours")}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
            <RowSkeleton rows={7} />
          </div>
        )}
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile menu
// ─────────────────────────────────────────────────────────────────────────────
function ProfileMenu() {
  const navigate = useNavigate();
  const role = useCurrentRole();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const item: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
    color: T.textNav,
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Profile"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `1px solid ${T.border}`,
          background: "var(--cg-accent-bg-strong, var(--cg-accent-bg))",
          color: T.accent,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        CA
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 38,
            right: 0,
            width: 230,
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            boxShadow: "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,0.3))",
            zIndex: 60,
            padding: "6px 0",
          }}
        >
          <div style={{ padding: "8px 12px 10px" }}>
            <div
              style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}
            >
              CloudGuard Admin
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>
              admin@cloudguard.io
            </div>
            <RoleChip role={role} />
          </div>
          <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
          <button type="button" style={item} onClick={() => setOpen(false)}>
            <User size={15} /> View profile
          </button>
          <button
            type="button"
            style={item}
            onClick={() => {
              navigate("/admin");
              setOpen(false);
            }}
          >
            <Settings size={15} /> Platform settings
          </button>
          <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
          <button
            type="button"
            style={{ ...item, color: T.danger }}
            onClick={() => setOpen(false)}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function AdminTopBar() {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const unread = NOTIFS.filter((n) => !n.read).length;
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        height: 50,
        padding: "0 20px",
        background: "var(--cg-bg-page)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <GlobalSearch />
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setNotifOpen(true)}
        style={{
          position: "relative",
          width: 32,
          height: 32,
          borderRadius: 7,
          border: `1px solid ${T.border}`,
          background: "transparent",
          color: T.textNav,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 16,
              height: 16,
              borderRadius: 9,
              background: T.danger,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {unread}
          </span>
        )}
      </button>
      <ProfileMenu />
      {notifOpen && <NotifDrawer onClose={() => setNotifOpen(false)} />}
    </div>
  );
}

/* eslint-disable i18next/no-literal-string, no-param-reassign, no-nested-ternary, @typescript-eslint/no-use-before-define -- CloudGuard admin top bar (global search · notifications · profile) */
import React from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Bell,
  X,
  User,
  LogOut,
  CheckCheck,
  Folder,
  Sun,
  Moon,
  Monitor,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { create, insertMultiple, search } from "@orama/orama";
import { NAV_CATALOG, NAV_GROUP_ORDER } from "./admin-nav-catalog";
import { fetchNotifications, type Notif, type Cat } from "./notif-source";
import { T } from "./admin-kit";
import { NotificationSettingsPanel } from "./notification-settings";
import {
  RoleChip,
  useCurrentRole,
} from "#/components/features/settings/settings-kit";
import { useTheme } from "#/context/theme-context";
import { NAVIGATION } from "#/components/features/sidebar/sidebar";
import {
  useHiddenNav,
  setHidden,
} from "#/components/features/sidebar/sidebar-prefs";

// Shared drawer entry animations (fade + slide) — injected once by AdminTopBar.
const DRAWER_KEYFRAMES =
  "@keyframes cgOverlayIn{from{opacity:0}to{opacity:1}}" +
  "@keyframes cgDrawerIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}";
const OVERLAY_ANIM = "cgOverlayIn .16s ease both";
const DRAWER_ANIM = "cgDrawerIn .22s cubic-bezier(.2,.7,.3,1) both";

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
// Orama index = static UI navigation (NAV_CATALOG, public, safe to ship) + ENTITY records.
// Per extreme-isolation R1, entity records must be SERVER-BUILT (tenant + RBAC filtered); the
// SAMPLE_RECORDS are synthetic dev fallback only, used when /api/cloudguard/search/index is
// unavailable. The client never filters for security and never indexes raw API data.
function buildIndex(records: Hit[]) {
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
    [...NAV_CATALOG, ...records].map((h, i) => ({ id: String(i), ...h })),
  );
  return db;
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [records, setRecords] = React.useState<Hit[]>(SAMPLE_RECORDS);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const db = React.useMemo(() => buildIndex(records), [records]);
  // R1: pull the tenant/RBAC-scoped entity records the server permits (heap then holds only those).
  React.useEffect(() => {
    let alive = true;
    fetch("/api/cloudguard/search/index", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.records)) setRecords(d.records);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  // folder order: static nav groups, then whatever groups the (server) records use
  const GROUP_ORDER = React.useMemo(
    () => [
      ...NAV_GROUP_ORDER,
      ...Array.from(new Set(records.map((r) => r.group))).filter(
        (g) => !NAV_GROUP_ORDER.includes(g),
      ),
    ],
    [records],
  );

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
          animation: OVERLAY_ANIM,
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
          animation: DRAWER_ANIM,
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
          <div
            style={{ flex: 1, overflowY: "auto", padding: "12px 16px 20px" }}
          >
            <NotificationSettingsPanel />
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
// Profile — avatar opens a drawer (profile link · theme/language · sidebar show-hide)
// ─────────────────────────────────────────────────────────────────────────────
const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];
// `id` is the persisted hidden-nav key (`global:<id>`) and must NOT change when
// the display label does. This list had drifted from the sidebar: it offered a
// toggle for "Issues", which the sidebar no longer renders, and none for
// Communication, which it does.
const SIDEBAR_GLOBALS: { id: string; label: string }[] = [
  { id: "Dashboard", label: "Dashboard" },
  { id: "Security graph", label: "Global Security Graph" },
  { id: "Communication", label: "Communication" },
  { id: "Findings", label: "All Findings" },
];

function ProfileDrawer({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const role = useCurrentRole();
  const { preference, setPreference } = useTheme();
  const { i18n } = useTranslation();
  const [customizeOpen, setCustomizeOpen] = React.useState(false);

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: T.textMuted,
    padding: "16px 0 8px",
  };
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
          animation: OVERLAY_ANIM,
        }}
      />
      <aside
        role="dialog"
        aria-label="Profile & preferences"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: 380,
          background: T.cardBg,
          borderLeft: `1px solid ${T.border}`,
          zIndex: 71,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.18)",
          animation: DRAWER_ANIM,
        }}
      >
        {/* header → links to the personal profile page */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--cg-accent-bg-strong, var(--cg-accent-bg))",
              color: T.accent,
              fontSize: 14,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            CA
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}
            >
              CloudGuard Admin
            </div>
            <div style={{ fontSize: 12, color: T.textMuted }}>
              admin@cloudguard.io
            </div>
            <div style={{ marginTop: 6 }}>
              <RoleChip role={role} />
            </div>
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

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 20px" }}>
          <button
            type="button"
            onClick={() => {
              navigate("/profile");
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <User size={16} color={T.accent} /> View personal profile
          </button>

          {/* Appearance — theme + language */}
          <div style={sectionLabel}>Appearance</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
            }}
          >
            <span style={{ fontSize: 13, color: T.textPrimary }}>Theme</span>
            <div style={{ display: "flex", gap: 4 }}>
              {(["light", "dark", "system"] as const).map((mode) => {
                const on = preference === mode;
                const Ico =
                  mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreference(mode)}
                    title={mode}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      height: 30,
                      padding: "0 9px",
                      borderRadius: 7,
                      textTransform: "capitalize",
                      border: `1px solid ${on ? T.accent : T.border}`,
                      background: on ? "var(--cg-accent-bg)" : "transparent",
                      color: on ? T.textPrimary : T.textNav,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <Ico size={13} /> {mode}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
            }}
          >
            <span style={{ fontSize: 13, color: T.textPrimary }}>Language</span>
            <select
              value={i18n.language?.split("-")[0] || "en"}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              style={{
                height: 30,
                borderRadius: 7,
                border: `1px solid ${T.border}`,
                background: "var(--cg-input-bg, var(--cg-bg-card))",
                color: T.textPrimary,
                fontSize: 12.5,
                padding: "0 8px",
              }}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sidebar — opens the customize sub-drawer */}
          <div style={sectionLabel}>Sidebar</div>
          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.textPrimary,
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <SlidersHorizontal size={16} color={T.accent} />
            <span style={{ flex: 1 }}>Customize sidebar</span>
            <ChevronRight size={15} color={T.textMuted} />
          </button>
        </div>

        <div
          style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}` }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: T.danger,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      {customizeOpen && (
        <CustomizeSidebarDrawer onClose={() => setCustomizeOpen(false)} />
      )}
    </>
  );
}

// Customize sidebar — the show/hide checklist, in its own drawer.
function CustomizeSidebarDrawer({ onClose }: { onClose: () => void }) {
  const committed = useHiddenNav();
  // edit against a local draft; nothing applies to the sidebar until Save.
  const [draft, setDraft] = React.useState<Set<string>>(
    () => new Set(committed),
  );
  const dirty =
    draft.size !== committed.size ||
    [...draft].some((id) => !committed.has(id));
  const toggleDraft = (id: string) =>
    setDraft((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const save = () => {
    setHidden(draft);
    onClose();
  };
  const toggles = [
    ...SIDEBAR_GLOBALS.map((g) => ({ id: `global:${g.id}`, label: g.label })),
    ...NAVIGATION.map((d) => ({ id: `domain:${d.id}`, label: d.label })),
  ];
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--cg-overlay, rgba(0,0,0,0.4))",
          zIndex: 72,
          animation: OVERLAY_ANIM,
        }}
      />
      <aside
        role="dialog"
        aria-label="Customize sidebar"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: 380,
          background: T.cardBg,
          borderLeft: `1px solid ${T.border}`,
          zIndex: 73,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.18)",
          animation: DRAWER_ANIM,
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
            Customize sidebar
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
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 18px" }}>
          <div
            style={{
              fontSize: 12,
              color: T.textMuted,
              padding: "8px 0 6px",
            }}
          >
            Show or hide items in the main sidebar.
          </div>
          {toggles.map((t) => {
            const shown = !draft.has(t.id);
            return (
              <label
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  fontSize: 13,
                  color: T.textPrimary,
                  cursor: "pointer",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={shown}
                  onChange={() => toggleDraft(t.id)}
                  style={{ accentColor: "var(--cg-accent)" }}
                />
                <span style={{ flex: 1 }}>{t.label}</span>
                {shown ? (
                  <Eye size={14} color={T.textMuted} />
                ) : (
                  <EyeOff size={14} color={T.textMuted} />
                )}
              </label>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 16px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 7,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.textNav,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            style={{
              height: 34,
              padding: "0 16px",
              borderRadius: 7,
              border: "none",
              background: dirty ? "var(--cg-accent)" : T.border,
              color: dirty ? "#fff" : T.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: dirty ? "pointer" : "default",
            }}
          >
            Save
          </button>
        </div>
      </aside>
    </>
  );
}

function ProfileMenu() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Profile"
        onClick={() => setOpen(true)}
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
      {open && <ProfileDrawer onClose={() => setOpen(false)} />}
    </>
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
        height: "var(--cg-topbar-h)",
        padding: "0 20px",
        background: "var(--cg-bg-page)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <style>{DRAWER_KEYFRAMES}</style>
      {/* Left slot — the conversation route portals its title in here, so the
          name sits top-left, on the same row as search/notifications. */}
      <div
        id="cg-topbar-left"
        style={{ marginRight: "auto", minWidth: 0, display: "flex" }}
      />
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

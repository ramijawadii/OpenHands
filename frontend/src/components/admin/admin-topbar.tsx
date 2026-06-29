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
// Notifications — drawer with Recent (filterable) + Settings
// ─────────────────────────────────────────────────────────────────────────────
type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  role: "Security" | "Compliance" | "Billing" | "Platform";
  critical?: boolean;
};
const NOTIFS: Notif[] = [
  {
    id: "n1",
    title: "Public S3 bucket detected",
    body: "prod-assets is world-readable.",
    time: "2m",
    read: false,
    role: "Security",
    critical: true,
  },
  {
    id: "n2",
    title: "Agent action awaiting approval",
    body: "remediation-01 wants to revoke 3 keys.",
    time: "14m",
    read: false,
    role: "Security",
  },
  {
    id: "n3",
    title: "MFA disabled for a member",
    body: "marcus@acme.io lost MFA enrollment.",
    time: "1h",
    read: false,
    role: "Security",
  },
  {
    id: "n4",
    title: "PCI-DSS evidence due",
    body: "Quarterly evidence export is due in 3 days.",
    time: "3h",
    read: true,
    role: "Compliance",
  },
  {
    id: "n5",
    title: "Seat limit approaching",
    body: "Workspace ‘Production’ at 11/12 seats.",
    time: "6h",
    read: true,
    role: "Billing",
  },
  {
    id: "n6",
    title: "New connector available",
    body: "Wiz integration is now supported.",
    time: "1d",
    read: true,
    role: "Platform",
  },
  {
    id: "n7",
    title: "Drift detected",
    body: "12 resources diverged from IaC baseline.",
    time: "1d",
    read: true,
    role: "Security",
  },
];
const NOTIF_ROLES = [
  "All roles",
  "Security",
  "Compliance",
  "Billing",
  "Platform",
] as const;
const SETTINGS_ROWS = [
  { k: "Security alerts", desc: "Critical findings, exposures, approvals" },
  {
    k: "Compliance & evidence",
    desc: "Framework deadlines, evidence requests",
  },
  { k: "Billing & capacity", desc: "Seat limits, usage, invoices" },
  { k: "Product updates", desc: "New connectors, features, releases" },
];

function NotifDrawer({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = React.useState<"recent" | "settings">("recent");
  const [readFilter, setReadFilter] = React.useState<"all" | "unread" | "read">(
    "all",
  );
  const [role, setRole] =
    React.useState<(typeof NOTIF_ROLES)[number]>("All roles");
  const [items, setItems] = React.useState(NOTIFS);

  const filtered = items.filter(
    (n) =>
      (readFilter === "all" || (readFilter === "unread" ? !n.read : n.read)) &&
      (role === "All roles" || n.role === role),
  );
  const markAll = () => setItems((p) => p.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

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
          width: 400,
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
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {NOTIF_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={chip(role === r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{ flex: 1, overflowY: "auto", padding: "4px 8px 16px" }}
            >
              {filtered.length === 0 ? (
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
                filtered.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => toggleRead(n.id)}
                    style={{
                      display: "flex",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.badgeBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
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
                    <span style={{ flex: 1, minWidth: 0 }}>
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
                        {n.role}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {SETTINGS_ROWS.map((s, i) => (
              <div
                key={s.k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 0",
                  borderBottom:
                    i < SETTINGS_ROWS.length - 1
                      ? `1px solid ${T.border}`
                      : "none",
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
                    {s.k}
                  </div>
                  <div
                    style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}
                  >
                    {s.desc}
                  </div>
                </div>
                <Toggle on={i < 3} onChange={() => {}} />
              </div>
            ))}
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

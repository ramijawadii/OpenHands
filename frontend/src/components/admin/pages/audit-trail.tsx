/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, react/no-unstable-nested-components -- CloudGuard Audit Trail (§16 / §34) */
import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  X,
  Link2,
  Copy,
} from "lucide-react";
import { useAuditLedger, useAuditVerify } from "#/hooks/query/use-cloudguard";
import type { CGAuditEntry } from "#/api/cloudguard-service";
import {
  Page,
  PageHeader,
  DirectoryTable,
  ScopeBadge,
  EmptyState,
  LiveCardSkeleton,
  FilterBar,
  Select,
  RefreshControl,
  HeaderButton,
  SampleTag,
  useDialogA11y,
  T,
  type Column,
} from "#/components/admin/admin-kit";

/**
 * Audit Trail — the tamper-evident, hash-chained activity ledger (§16 enterprise / §34 workspace).
 *
 * Investigation-grade filtering: §34 activity-stream chips + a filter bar (full-text, decision
 * facet, actor facet, date range). Sortable + paginated table, manual refresh with freshness, and a
 * per-event drawer with the complete 17-field §34 record (10 live + 7 sample-tagged). Live data:
 * /audit/ledger + /audit/verify.
 */

const DENIAL = new Set([
  "blocked",
  "denied",
  "rate-limited",
  "rate_limited",
  "error",
]);

const DECISION_TONE: Record<string, string> = {
  blocked: T.danger,
  denied: T.danger,
  "rate-limited": T.danger,
  rate_limited: T.danger,
  error: T.danger,
  allowed: T.success,
  approved: T.success,
  success: T.success,
  created: T.accent,
  updated: T.accent,
  deleted: T.warning,
  revoked: T.warning,
};

const STREAMS: { id: string; label: string; match: string[] }[] = [
  { id: "", label: "All streams", match: [] },
  {
    id: "admin",
    label: "Administrative",
    match: ["admin", "org", "setting", "config"],
  },
  {
    id: "member",
    label: "Member",
    match: ["member", "user", "invite", "role"],
  },
  {
    id: "agent",
    label: "Agent",
    match: ["agent", "model assignment", "tool assignment"],
  },
  {
    id: "workflow",
    label: "Workflow",
    match: ["workflow", "run", "execution"],
  },
  { id: "sandbox", label: "Sandbox", match: ["sandbox", "cell", "container"] },
  { id: "tool", label: "Tool & MCP", match: ["tool", "mcp"] },
  { id: "model", label: "Model", match: ["model", "llm", "inference"] },
  {
    id: "secret",
    label: "Secret",
    match: ["secret", "key", "credential", "vault"],
  },
  { id: "api", label: "API & Webhook", match: ["api", "webhook", "token"] },
  {
    id: "resource",
    label: "Resource",
    match: ["resource", "scope", "criticality"],
  },
  {
    id: "security",
    label: "Security",
    match: [
      "security",
      "violation",
      "block",
      "deny",
      "kill",
      "isolation",
      "policy",
    ],
  },
  { id: "evidence", label: "Evidence", match: ["evidence", "export", "audit"] },
];

function fmtTs(ts: string): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shortHash(h?: string | null): string {
  if (!h) return "—";
  return h.length > 14 ? `${h.slice(0, 10)}…${h.slice(-4)}` : h;
}

function Badge({ text, tone }: { text: string; tone: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        padding: "0 8px",
        borderRadius: 99,
        fontSize: 11,
        color: tone,
        background: T.badgeBg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: tone }}
      />
      {text}
    </span>
  );
}

type Row = CGAuditEntry & { id: string };

export function AuditTrailPage({
  scope,
}: {
  scope: "workspace" | "enterprise";
}) {
  const [stream, setStream] = React.useState<string>("");
  const [search, setSearch] = React.useState("");
  const [decision, setDecision] = React.useState("");
  const [actor, setActor] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selected, setSelected] = React.useState<Row | null>(null);

  const ledger = useAuditLedger({ limit: 1000 });
  const verify = useAuditVerify();
  const tenantId = ledger.data?.tenant_id ?? "";

  const entries: Row[] = React.useMemo(
    () =>
      (ledger.data?.entries ?? []).map((e) => ({
        ...e,
        id: e.entry_hash || String(e.seq),
      })),
    [ledger.data],
  );

  const decisions = React.useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.decision && s.add(e.decision));
    return Array.from(s).sort();
  }, [entries]);
  const actors = React.useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.actor && s.add(e.actor));
    return Array.from(s).sort();
  }, [entries]);

  const streamMatch = STREAMS.find((s) => s.id === stream)?.match ?? [];
  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromT = from ? new Date(from).getTime() : null;
    const toT = to ? new Date(to).getTime() + 86400000 : null; // inclusive end-of-day
    return entries.filter((e) => {
      if (streamMatch.length) {
        const hay = `${e.category} ${e.action}`.toLowerCase();
        if (!streamMatch.some((m) => hay.includes(m))) return false;
      }
      if (decision && e.decision !== decision) return false;
      if (actor && e.actor !== actor) return false;
      if (fromT || toT) {
        const t = new Date(e.ts).getTime();
        if (fromT && t < fromT) return false;
        if (toT && t > toT) return false;
      }
      if (q) {
        return (
          e.actor?.toLowerCase().includes(q) ||
          e.action?.toLowerCase().includes(q) ||
          e.resource?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, search, streamMatch, decision, actor, from, to]);

  // Live aggregates over the current result set — auditor situational awareness.
  const insights = React.useMemo(() => {
    const dec: Record<string, number> = {};
    const act: Record<string, number> = {};
    rows.forEach((e) => {
      if (e.decision) dec[e.decision] = (dec[e.decision] ?? 0) + 1;
      const a = e.actor || "system";
      act[a] = (act[a] ?? 0) + 1;
    });
    const topActors = Object.entries(act)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const denials = rows.filter((e) =>
      DENIAL.has((e.decision || "").toLowerCase()),
    ).length;
    return { dec, topActors, denials };
  }, [rows]);

  const setPreset = (days: number | null) => {
    if (days == null) {
      setFrom("");
      setTo("");
      return;
    }
    const now = new Date();
    setFrom(
      new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10),
    );
    setTo(now.toISOString().slice(0, 10));
  };

  const hasFilters = !!(stream || search || decision || actor || from || to);
  const clearAll = () => {
    setStream("");
    setSearch("");
    setDecision("");
    setActor("");
    setFrom("");
    setTo("");
  };

  const exportCsv = () => {
    const cols = [
      "seq",
      "ts",
      "actor",
      "category",
      "action",
      "resource",
      "decision",
      "entry_hash",
      "prev_hash",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows
      .map((r) =>
        cols
          .map((c) => esc((r as unknown as Record<string, unknown>)[c]))
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${cols.join(",")}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${tenantId || "trail"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Evidence pack: a self-describing JSON artefact for an auditor — chain-verification status +
  // the exact filter context + the matching entries. Stronger than a bare CSV.
  const exportPack = () => {
    const pack = {
      generated_at: new Date().toISOString(),
      tenant_id: tenantId,
      scope,
      chain_verification: verify.data ?? null,
      filters: { stream, search, decision, actor, from, to },
      entry_count: rows.length,
      entries: rows.map(({ id, ...e }) => e),
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-evidence-pack-${tenantId || "trail"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<Row>[] = [
    {
      key: "seq",
      header: "#",
      width: 64,
      sortValue: (r) => r.seq,
      render: (r) => (
        <span
          style={{ color: T.textMuted, fontVariantNumeric: "tabular-nums" }}
        >
          {r.seq}
        </span>
      ),
    },
    {
      key: "ts",
      header: "Timestamp",
      sortValue: (r) => r.ts,
      render: (r) => fmtTs(r.ts),
    },
    {
      key: "actor",
      header: "Actor",
      sortValue: (r) => r.actor || "",
      render: (r) => (
        <span style={{ color: T.textPrimary }}>{r.actor || "system"}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category || "",
      render: (r) =>
        r.category ? <Badge text={r.category} tone={T.textNav} /> : "—",
    },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <span style={{ color: T.textPrimary }}>{r.action || "—"}</span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      render: (r) => (
        <span style={{ color: T.textMuted }}>{r.resource || "—"}</span>
      ),
    },
    {
      key: "decision",
      header: "Decision",
      sortValue: (r) => r.decision || "",
      render: (r) =>
        r.decision ? (
          <Badge
            text={r.decision}
            tone={DECISION_TONE[r.decision.toLowerCase()] ?? T.textMuted}
          />
        ) : (
          "—"
        ),
    },
    {
      key: "hash",
      header: "Entry hash",
      render: (r) => (
        <span
          style={{ fontFamily: "monospace", fontSize: 11, color: T.textMuted }}
        >
          {shortHash(r.entry_hash)}
        </span>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Audit Trail"
        subtitle={
          scope === "workspace"
            ? "Immutable, tamper-evident record of every action in this workspace."
            : "Cross-workspace administrative, security and execution activity."
        }
        actions={
          <>
            <ScopeBadge
              scope={scope === "workspace" ? "This workspace" : "Organization"}
            />
            <RefreshControl
              onRefresh={() => {
                ledger.refetch();
                verify.refetch();
              }}
              isFetching={ledger.isFetching}
              updatedAt={ledger.dataUpdatedAt}
            />
            <HeaderButton
              icon={<Download size={14} />}
              onClick={exportCsv}
              disabled={rows.length === 0}
            >
              CSV
            </HeaderButton>
            <HeaderButton
              variant="primary"
              icon={<Download size={14} />}
              onClick={exportPack}
              disabled={rows.length === 0}
            >
              Evidence pack
            </HeaderButton>
          </>
        }
      />

      <ChainBanner verify={verify} />

      {/* Live insights over the current result set */}
      {!ledger.isLoading && entries.length > 0 && (
        <InsightBar
          insights={insights}
          total={rows.length}
          onActor={setActor}
        />
      )}

      {scope === "enterprise" && (
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 14 }}>
          <span style={{ color: T.warning }}>Note </span>— showing this
          administrator’s tenant ledger; the authorized cross-workspace fan-in
          (§16, §39.6) is on the Global console roadmap.
        </div>
      )}

      {/* time presets */}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 11.5, color: T.textMuted, marginRight: 2 }}>
          Period
        </span>
        {[
          { label: "24h", days: 1 },
          { label: "7d", days: 7 },
          { label: "30d", days: 30 },
          { label: "All", days: null as number | null },
        ].map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            active={p.days == null ? !from && !to : false}
            onClick={() => setPreset(p.days)}
          />
        ))}
      </div>

      {/* §34 activity streams */}
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}
      >
        {STREAMS.map((s) => (
          <Chip
            key={s.id || "all"}
            label={s.label}
            active={stream === s.id}
            onClick={() => setStream(s.id)}
          />
        ))}
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search actor, action or resource…"
        count={rows.length}
        total={entries.length}
        showClear={hasFilters}
        onClear={clearAll}
      >
        <Select
          label="Decision"
          value={decision}
          onChange={setDecision}
          options={[
            { value: "", label: "All decisions" },
            ...decisions.map((d) => ({ value: d, label: d })),
          ]}
        />
        <Select
          label="Actor"
          value={actor}
          onChange={setActor}
          options={[
            { value: "", label: "All actors" },
            ...actors.map((a) => ({ value: a, label: a })),
          ]}
        />
        <DateInput value={from} onChange={setFrom} label="From" />
        <DateInput value={to} onChange={setTo} label="To" />
      </FilterBar>

      {ledger.isLoading ? (
        <LiveCardSkeleton lines={5} />
      ) : ledger.isError ? (
        <EmptyState
          icon={<ShieldAlert size={22} />}
          title="Audit ledger unavailable"
          hint="The audit service did not respond. The chain is preserved server-side; retry shortly."
        />
      ) : (
        <DirectoryTable
          columns={columns}
          rows={rows}
          pageSize={25}
          initialSort={{ key: "seq", dir: "desc" }}
          onRowClick={(r) => setSelected(r)}
          rowActions={(r) => (
            <button
              type="button"
              title="Copy entry hash"
              onClick={() => navigator.clipboard?.writeText(r.entry_hash || "")}
              style={{
                background: "transparent",
                border: "none",
                color: T.textMuted,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <Copy size={14} />
            </button>
          )}
          empty={
            <EmptyState
              icon={<ShieldCheck size={22} />}
              title="No matching activity"
              hint="No events match this stream / filter. Events appear here as they occur."
            />
          }
        />
      )}

      {selected && (
        <EventDrawer
          row={selected}
          tenantId={tenantId}
          onClose={() => setSelected(null)}
          onFilterActor={(a) => {
            setActor(a);
            setSelected(null);
          }}
          onFilterResource={(r) => {
            setSearch(r);
            setSelected(null);
          }}
        />
      )}
    </Page>
  );
}

function InsightBar({
  insights,
  total,
  onActor,
}: {
  insights: {
    dec: Record<string, number>;
    topActors: [string, number][];
    denials: number;
  };
  total: number;
  onActor: (a: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        flexWrap: "wrap",
        alignItems: "stretch",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          flex: "1 1 280px",
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          background: T.cardBg,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
          }}
        >
          Decisions ({total})
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(insights.dec).length === 0 ? (
            <span style={{ fontSize: 12, color: T.textMuted }}>—</span>
          ) : (
            Object.entries(insights.dec)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    color: DECISION_TONE[k.toLowerCase()] ?? T.textNav,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: DECISION_TONE[k.toLowerCase()] ?? T.textMuted,
                    }}
                  />
                  {k} <strong style={{ color: T.textPrimary }}>{v}</strong>
                </span>
              ))
          )}
        </div>
        {insights.denials > 0 && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: T.danger }}>
            {insights.denials} denial/blocked event
            {insights.denials === 1 ? "" : "s"} in view
          </div>
        )}
      </div>
      <div
        style={{
          flex: "1 1 280px",
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          background: T.cardBg,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
          }}
        >
          Top actors
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {insights.topActors.length === 0 ? (
            <span style={{ fontSize: 12, color: T.textMuted }}>—</span>
          ) : (
            insights.topActors.map(([a, v]) => (
              <button
                key={a}
                type="button"
                onClick={() => onActor(a)}
                title="Filter to this actor"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 24,
                  padding: "0 9px",
                  borderRadius: 99,
                  border: `1px solid ${T.border}`,
                  background: "transparent",
                  color: T.textNav,
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {a} <strong style={{ color: T.textPrimary }}>{v}</strong>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 11px",
        borderRadius: 99,
        border: `1px solid ${active ? "transparent" : T.border}`,
        background: active ? "var(--cg-accent-bg-strong)" : "transparent",
        color: active ? T.accent : T.textNav,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function DateInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      title={label}
      style={{
        height: 32,
        padding: "0 8px",
        background: "var(--cg-input-bg)",
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        color: value ? T.textPrimary : T.textMuted,
        fontSize: 12.5,
        outline: "none",
        colorScheme: "dark",
      }}
    />
  );
}

function ChainBanner({
  verify,
}: {
  verify: ReturnType<typeof useAuditVerify>;
}) {
  const d = verify.data;
  const ok = d?.ok ?? true;
  const loading = verify.isLoading;
  const tone = loading ? T.textMuted : ok ? T.success : T.danger;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        border: `1px solid ${ok ? T.border : "var(--cg-danger-border)"}`,
        background: ok ? T.cardBg : "var(--cg-danger-bg)",
        marginBottom: 16,
      }}
    >
      {ok ? (
        <ShieldCheck size={20} color={tone} />
      ) : (
        <ShieldAlert size={20} color={tone} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>
          {loading
            ? "Verifying chain integrity…"
            : ok
              ? "Chain intact — tamper-evident"
              : "Chain integrity broken"}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
          {loading
            ? "Recomputing the hash chain over every entry."
            : ok
              ? `${d?.count ?? 0} entries verified end-to-end (SHA-256 / HMAC hash chain).`
              : `Verification failed at entry #${d?.broken_at ?? "?"}: ${d?.reason ?? "hash mismatch"}.`}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  mono,
  sample,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  sample?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span
        style={{
          fontSize: 11,
          color: T.textMuted,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        {sample && <SampleTag />}
      </span>
      <span
        style={{
          fontSize: 13,
          color: T.textPrimary,
          fontFamily: mono ? "monospace" : "inherit",
          wordBreak: mono ? "break-all" : "normal",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function sampleActorType(actor: string): string {
  if (!actor || actor === "system") return "Service identity";
  if (actor.includes("agent") || actor.includes("run")) return "Agent";
  return "Human";
}
function sampleIp(seq: number): string {
  return `10.${(seq * 7) % 255}.${(seq * 13) % 255}.${(seq * 29) % 255}`;
}

const pivotBtn: React.CSSProperties = {
  height: 28,
  padding: "0 11px",
  borderRadius: 6,
  border: `1px solid var(--cg-border)`,
  background: "transparent",
  color: "var(--cg-accent)",
  fontSize: 12,
  cursor: "pointer",
};

function EventDrawer({
  row,
  tenantId,
  onClose,
  onFilterActor,
  onFilterResource,
}: {
  row: Row;
  tenantId: string;
  onClose: () => void;
  onFilterActor: (a: string) => void;
  onFilterResource: (r: string) => void;
}) {
  const ref = useDialogA11y(true, onClose);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cg-overlay)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Audit event ${row.seq}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "94vw",
          height: "100%",
          background: T.cardBg,
          borderLeft: `1px solid ${T.borderStrong}`,
          padding: 24,
          overflowY: "auto",
          outline: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 15, color: T.textPrimary, fontWeight: 600 }}>
            Event #{row.seq}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: T.textMuted,
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 14 }}>
          Full §34 record — 10 live fields plus 7 representative fields (tagged)
          the chain will emit on schema enrichment.
        </div>

        {/* Related-event pivots */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            onClick={() => onFilterActor(row.actor || "system")}
            style={pivotBtn}
          >
            Related by actor →
          </button>
          {row.resource && (
            <button
              type="button"
              onClick={() => onFilterResource(row.resource)}
              style={pivotBtn}
            >
              Related by resource →
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Field label="Timestamp">{fmtTs(row.ts)}</Field>
          <Field label="Actor">{row.actor || "system"}</Field>
          <Field label="Actor type" sample>
            {sampleActorType(row.actor)}
          </Field>
          <Field label="Active role" sample>
            {row.actor === "system" ? "system" : "Workspace Admin"}
          </Field>
          <Field label="Workspace">
            <span style={{ fontFamily: "monospace", fontSize: 12 }}>
              {tenantId || "—"}
            </span>
          </Field>
          <Field label="Source IP" sample>
            {sampleIp(row.seq)}
          </Field>
          <Field label="Session" sample>
            sess-{shortHash(row.entry_hash).replace("…", "")}
          </Field>
          <Field label="Category">{row.category || "—"}</Field>
          <Field label="Action">{row.action || "—"}</Field>
          <Field label="Target">{row.resource || "—"}</Field>
          <Field label="Previous value" sample>
            {row.decision === "updated" ? "ask" : "—"}
          </Field>
          <Field label="New value" sample>
            {row.decision === "updated" ? "plan" : "—"}
          </Field>
          <Field label="Result">{row.decision || "—"}</Field>
          <Field label="Approval" sample>
            {["delete", "iam"].some((k) =>
              (row.action || "").toLowerCase().includes(k),
            )
              ? "approved · 2 approvers"
              : "n/a"}
          </Field>
          <Field label="Ticket" sample>
            {row.category === "policy_decision" ? "CHG-4821" : "—"}
          </Field>
          <Field label="Workflow" sample>
            {row.resource?.startsWith("run") ? row.resource : "—"}
          </Field>
        </div>

        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12,
              color: T.textNav,
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            <Link2 size={14} color={T.success} /> Evidence integrity
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Entry hash" mono>
              {row.entry_hash || "—"}
            </Field>
            <Field label="Previous hash (chain link)" mono>
              {row.prev_hash || "— (genesis)"}
            </Field>
            <Field
              label="Evidence hash"
              mono
              sample
            >{`sha256:${shortHash(row.entry_hash).replace("…", "")}`}</Field>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted }}>
          Live fields are read from the tamper-evident chain. Tagged fields are
          representative until the §34 schema enrichment (05_WORKSPACE) lands;
          the layout binds to them unchanged.
        </div>
      </div>
    </div>
  );
}

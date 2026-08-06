/* eslint-disable i18next/no-literal-string -- overview scope bar */
import React from "react";
import {
  Building2,
  GitBranch,
  Layers,
  RefreshCw,
  RotateCcw,
  Timer,
} from "lucide-react";
import { APP_FONT } from "./theme";
import { FilterSelect, type FilterOption } from "./FilterSelect";
import { ENV_COLOR } from "./icons";
import { SCOPE_RANGES, type ScopeApi } from "./overview-scope";

export type Density = "comfortable" | "compact";

/**
 * The drawer tab-strip pill, reused for every control on this bar.
 *
 * The scope controls are page chrome in exactly the way the Chat / Canvas /
 * Report tabs are, so they should read as the same kind of thing. Bordered
 * input-style controls made them look like fields to fill in rather than views
 * to switch between.
 */
const tabBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  fontSize: 12.5,
  lineHeight: 1,
  fontFamily: APP_FONT,
  background: "transparent",
  color: "var(--cg-text-nav)",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/**
 * Comfortable / compact, the density control every mature ops table carries.
 *
 * A segmented pair rather than a dropdown: two mutually exclusive options with
 * a visible current state cost one click and no recall (Hick's Law — a menu
 * would hide both the choice and the current value behind an interaction).
 */
function DensityToggle({
  value,
  onChange,
}: {
  value: Density;
  onChange: (d: Density) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Row density"
      style={{ display: "inline-flex", gap: 2 }}
    >
      {(["comfortable", "compact"] as const).map((d) => {
        const on = d === value;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(d)}
            className="cg-scope-tab"
            style={{
              ...tabBtn,
              textTransform: "capitalize",
              background: on ? "var(--cg-bg-card)" : "transparent",
              color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

export function OverviewScope({
  scope,
  accounts,
  refreshedAt,
  onRefresh,
  density,
  onDensity,
}: {
  scope: ScopeApi;
  accounts: string[];
  refreshedAt: Date;
  onRefresh: () => void;
  density: Density;
  onDensity: (d: Density) => void;
}) {
  const rangeOptions: FilterOption[] = SCOPE_RANGES.map((r) => ({
    value: r.value,
    label: r.label,
  }));

  const envOptions: FilterOption[] = [
    { value: "All", label: "All environments" },
    // The bare mark, not `EnvBadge` — the badge renders its own label, and
    // `FilterSelect` already draws one beside the icon.
    ...(["prod", "staging", "dev"] as const).map((e) => ({
      value: e,
      label: e,
      icon: <GitBranch size={12} strokeWidth={1.9} color={ENV_COLOR[e]} />,
    })),
  ];

  const accountOptions: FilterOption[] = [
    { value: "All", label: "All accounts" },
    ...accounts.map((a) => ({ value: a, label: a })),
  ];

  return (
    <section
      aria-label="Overview scope"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginLeft: 10,
        marginRight: 10,
        marginBottom: 10,
        fontFamily: APP_FONT,
        color: "var(--cg-text-primary)",
      }}
    >
      <style>{`
        .cg-scope-tab { transition: background-color .12s, color .12s; }
        .cg-scope-tab:hover {
          background: var(--cg-bg-hover);
          color: var(--cg-text-primary);
        }
      `}</style>

      <FilterSelect
        variant="tab"
        label="Range"
        icon={<Timer size={12} />}
        value={scope.range}
        options={rangeOptions}
        onChange={(v) => scope.set({ range: v })}
      />
      <FilterSelect
        variant="tab"
        label="Env"
        icon={<Layers size={12} />}
        value={scope.env}
        options={envOptions}
        onChange={(v) => scope.set({ env: v })}
      />
      <FilterSelect
        variant="tab"
        label="Account"
        icon={<Building2 size={12} />}
        value={scope.account}
        options={accountOptions}
        onChange={(v) => scope.set({ account: v })}
      />

      {scope.narrowed && (
        <button
          type="button"
          onClick={scope.clear}
          className="cg-scope-tab"
          style={tabBtn}
        >
          <RotateCcw size={11} /> Reset scope
        </button>
      )}

      {/* Freshness and density sit right, away from the scope controls: they
          describe the page rather than narrow it. */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <DensityToggle value={density} onChange={onDensity} />
        <span
          style={{
            fontSize: 11,
            color: "var(--cg-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Updated{" "}
          {refreshedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="cg-scope-tab"
          style={tabBtn}
          aria-label="Refresh data"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>
    </section>
  );
}

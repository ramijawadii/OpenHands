/* eslint-disable i18next/no-literal-string -- artifact settings */
import React from "react";
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  RotateCcw,
  Server,
  Share2,
  Wrench,
} from "lucide-react";
import { SideRailPanel, type RailSection } from "#/components/admin/admin-kit";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { GridPalette } from "#/components/features/explore/cloudguard-grid/palette";
import {
  SETTINGS_VIEWS,
  type SettingField,
  type SettingGroup,
} from "./settings-structure";
import {
  initialValues,
  provenanceLabel,
  type Effective,
} from "./settings-data";

/**
 * Artifact Settings — the drawer's Settings tab.
 *
 * Same shell as the Remediation record: `SideRailPanel`, a flat rail, the
 * header pager, the same collapsible sections and `.cg-report-action` buttons.
 * They are the same kind of object — one thing with many facets — and giving
 * them different chromes would make the drawer feel like two products.
 *
 * **This tab is operational, not governance.** Platform Settings decide what is
 * permitted and Workspace Settings the team default; this decides how THIS
 * artifact runs, within both. Every control therefore renders its provenance
 * and its ceiling: without them an operator cannot tell whether a value is
 * theirs, the team's, or a mandatory floor — and will assume it is theirs.
 *
 * Structure lives in `settings-structure.ts`; this file decides how a field is
 * drawn, never which fields exist.
 */

const VIEW_ICON: Record<string, React.ReactNode> = {
  ai: <Bot size={13} />,
  runtime: <Server size={13} />,
  context: <Activity size={13} />,
  sharing: <Share2 size={13} />,
  maintenance: <Wrench size={13} />,
};

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  fontSize: 12.5,
  lineHeight: 1,
  fontFamily: APP_FONT,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

/* ------------------------------------------------------------------ *
 * Section
 * ------------------------------------------------------------------ */

function Section({
  title,
  hint,
  count,
  open: initial,
  children,
}: {
  title: string;
  hint?: string;
  count: number;
  open?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(Boolean(initial));
  return (
    <section style={{ borderBottom: "1px solid var(--cg-border-subtle)" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          width: "100%",
          padding: "12px 2px",
          background: "none",
          border: "none",
          color: "var(--cg-text-primary)",
          fontSize: 13.5,
          fontWeight: 600,
          fontFamily: APP_FONT,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "inline-flex", alignSelf: "center" }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        {title}
        {hint && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: "var(--cg-text-muted)",
            }}
          >
            {hint}
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11.5,
            fontWeight: 400,
            color: "var(--cg-text-muted)",
          }}
        >
          {count}
        </span>
      </button>
      {open && <div style={{ padding: "0 2px 14px 22px" }}>{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  height: 26,
  padding: "0 8px",
  fontSize: 12,
  fontFamily: APP_FONT,
  background: "var(--cg-input-bg)",
  color: "var(--cg-text-primary)",
  border: "1px solid var(--cg-input-border)",
  borderRadius: 4,
};

function Toggle({
  on,
  label,
  disabled,
  onChange,
}: {
  on: boolean;
  /** The field's own label — a switch with no accessible name is unusable. */
  label: string;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 34,
        height: 18,
        flexShrink: 0,
        borderRadius: 9,
        border: "none",
        padding: 0,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        background: on ? "var(--cg-accent)" : "var(--cg-toggle-off)",
        transition: "background-color .14s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .14s ease",
        }}
      />
    </button>
  );
}

/** Read-only chip list. Editing a set is a picker, not a text field. */
function Chips({ values }: { values: string[] }) {
  if (!values.length)
    return <span style={{ color: "var(--cg-text-muted)" }}>None</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: 4,
        justifyContent: "flex-end",
      }}
    >
      {values.map((v) => (
        <span
          key={v}
          style={{
            padding: "0 6px",
            fontSize: 10.5,
            lineHeight: "17px",
            borderRadius: 3,
            border: "1px solid var(--cg-border)",
            color: "var(--cg-text-primary)",
            fontFamily: MONO,
            whiteSpace: "nowrap",
          }}
        >
          {v}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Field row
 * ------------------------------------------------------------------ */

/**
 * One setting, with the five-part anatomy the whole tab depends on:
 * label + hint, the control, the effective value's provenance, the ceiling,
 * and a reset when the value is local.
 *
 * A control without its provenance is the reason people mistrust settings
 * pages — they cannot tell an inherited default from something they chose.
 */
function FieldRow({
  field,
  state,
  onChange,
  onReset,
  onAction,
}: {
  field: SettingField;
  state: Effective;
  onChange: (v: Effective["value"]) => void;
  onReset: () => void;
  onAction: () => void;
}) {
  const locked = Boolean(field.lockedBy);
  const disabled = locked || !field.editable;
  const isLocal = state.from === "artifact";

  const control = (() => {
    if (field.kind === "action")
      return (
        <button
          type="button"
          className={`cg-report-action${field.danger ? " cg-report-action-danger" : ""}`}
          style={{ ...btn, height: 26 }}
          onClick={onAction}
        >
          {field.label}
        </button>
      );

    if (field.kind === "toggle")
      return (
        <Toggle
          on={Boolean(state.value)}
          label={field.label}
          disabled={disabled}
          onChange={onChange}
        />
      );

    if (field.kind === "select")
      return (
        <select
          value={String(state.value)}
          disabled={disabled || !field.options?.length}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, maxWidth: 260, opacity: disabled ? 0.5 : 1 }}
        >
          {(field.options?.length
            ? field.options
            : [{ value: String(state.value), label: String(state.value) }]
          ).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );

    if (field.kind === "number")
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="number"
            value={Number(state.value)}
            min={field.min}
            max={field.max}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ ...inputStyle, width: 96, opacity: disabled ? 0.5 : 1 }}
          />
          {field.unit && (
            <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
              {field.unit}
            </span>
          )}
        </span>
      );

    if (field.kind === "text")
      return (
        <input
          type="text"
          value={String(state.value)}
          disabled={disabled}
          placeholder="—"
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, width: 240, opacity: disabled ? 0.5 : 1 }}
        />
      );

    if (field.kind === "chips")
      return <Chips values={(state.value as string[]) ?? []} />;

    return (
      <span
        style={{
          fontSize: 12,
          color: "var(--cg-text-primary)",
          fontFamily: MONO,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {String(state.value)}
      </span>
    );
  })();

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        padding: "9px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: "var(--cg-text-primary)",
          }}
        >
          {field.kind !== "action" && field.label}
          {locked && (
            <span
              title={field.lockReason ?? `Set by ${field.lockedBy}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "0 6px",
                fontSize: 10,
                lineHeight: "16px",
                borderRadius: 3,
                border: "1px solid var(--cg-accent-purple)",
                color: "var(--cg-accent-purple)",
                whiteSpace: "nowrap",
              }}
            >
              <Lock size={9} />
              {field.lockedBy}
            </span>
          )}
          {field.restart && (
            <span style={{ fontSize: 10, color: "var(--cg-text-muted)" }}>
              needs restart
            </span>
          )}
        </div>

        {field.hint && (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--cg-text-muted)",
              marginTop: 2,
              maxWidth: "62ch",
            }}
          >
            {field.hint}
          </div>
        )}

        {/* Provenance + ceiling. Always present — the operator must be able to
            tell an inherited default from something they chose. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            fontSize: 10.5,
            color: "var(--cg-text-muted)",
          }}
        >
          <span>{provenanceLabel(state.from)}</span>
          {state.ceiling !== undefined && (
            <span>
              · Ceiling{" "}
              <span style={{ fontFamily: MONO }}>{String(state.ceiling)}</span>
            </span>
          )}
          {field.tighten && <span>· May narrow only</span>}
          {isLocal && state.inherited !== undefined && (
            <button
              type="button"
              onClick={onReset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                padding: 0,
                fontFamily: APP_FONT,
                fontSize: 10.5,
                color: "var(--cg-accent)",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={10} /> Reset to inherited
            </button>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, paddingTop: 1 }}>{control}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * View
 * ------------------------------------------------------------------ */

function GroupPane({
  groups,
  values,
  onChange,
  onReset,
  onAction,
}: {
  groups: SettingGroup[];
  values: Record<string, Effective>;
  onChange: (key: string, v: Effective["value"]) => void;
  onReset: (key: string) => void;
  onAction: (field: SettingField) => void;
}) {
  return (
    <>
      {groups.map((grp, i) => (
        <Section
          key={grp.id}
          title={grp.label}
          hint={grp.hint}
          count={grp.fields.length}
          open={i === 0}
        >
          {grp.fields.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              state={values[f.key] ?? { value: "—", from: "derived" }}
              onChange={(v) => onChange(f.key, v)}
              onReset={() => onReset(f.key)}
              onAction={() => onAction(f)}
            />
          ))}
        </Section>
      ))}
    </>
  );
}

export function ArtifactSettingsView() {
  const [view, setView] = React.useState(SETTINGS_VIEWS[0].id);
  const [values, setValues] =
    React.useState<Record<string, Effective>>(initialValues);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const sections: RailSection[] = React.useMemo(
    () =>
      SETTINGS_VIEWS.map((v) => ({
        id: v.id,
        label: v.label,
        icon: VIEW_ICON[v.id],
      })),
    [],
  );

  const idx = SETTINGS_VIEWS.findIndex((v) => v.id === view);
  const current = SETTINGS_VIEWS[idx] ?? SETTINGS_VIEWS[0];

  /**
   * Local-only. A real build PATCHes and lets the server re-resolve — the
   * client's ceiling knowledge is a convenience, never the enforcement.
   */
  const onChange = (key: string, value: Effective["value"]) =>
    setValues((prevVals) => ({
      ...prevVals,
      [key]: {
        ...prevVals[key],
        value,
        from: "artifact",
        inherited: prevVals[key]?.inherited ?? prevVals[key]?.value,
      },
    }));

  const onReset = (key: string) =>
    setValues((prevVals) => {
      const cur = prevVals[key];
      if (!cur || cur.inherited === undefined) return prevVals;
      return {
        ...prevVals,
        [key]: { ...cur, value: cur.inherited, from: "workspace" },
      };
    });

  const dirty = Object.values(values).filter(
    (v) => v.from === "artifact",
  ).length;

  return (
    <div style={{ height: "100%", minHeight: 0, fontFamily: APP_FONT }}>
      <GridPalette />
      <SideRailPanel
        background="var(--cg-bg-page)"
        title="Artifact settings"
        subtitle={
          <>
            How this artifact runs — within what the platform and workspace
            permit. {dirty} setting{dirty === 1 ? "" : "s"} set here.
          </>
        }
        sections={sections}
        active={view}
        onSelect={setView}
        actions={
          <>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              disabled={dirty === 0}
              onClick={() => {
                setValues(initialValues());
                setMsg("All settings reset to inherited.");
              }}
            >
              <RotateCcw size={12} /> Reset all
            </button>
            <button
              type="button"
              className="cg-report-action cg-report-action-primary"
              style={btn}
              onClick={() => setMsg("Settings applied to this artifact.")}
            >
              <Check size={12} /> Apply
            </button>
          </>
        }
        footer={
          <span
            style={{
              marginRight: "auto",
              alignSelf: "center",
              fontSize: 11,
              color: "var(--cg-text-muted)",
            }}
          >
            {msg ??
              "Values are inherited from Platform and Workspace settings unless set here."}
          </span>
        }
      >
        <GroupPane
          groups={current.groups}
          values={values}
          onChange={onChange}
          onReset={onReset}
          onAction={(f) => setMsg(`${f.label} — not wired yet.`)}
        />
      </SideRailPanel>
    </div>
  );
}

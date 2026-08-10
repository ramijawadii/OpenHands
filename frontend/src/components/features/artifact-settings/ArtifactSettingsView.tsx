/* eslint-disable i18next/no-literal-string -- artifact settings */
import React from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  LayoutGrid,
  Lock,
  MessagesSquare,
  Plus,
  RotateCcw,
  Search,
  Server,
  Share2,
  Terminal,
  Wrench,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  ConfirmButton,
  SideRailPanel,
  type RailSection,
} from "#/components/admin/admin-kit";
import { PillSelect } from "#/components/features/chat/pill-select";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { GridPalette } from "#/components/features/explore/cloudguard-grid/palette";
import {
  SETTINGS_VIEWS,
  FIELD_BY_KEY,
  type SettingField,
  type SettingGroup,
  type TableColumn,
} from "./settings-structure";
import {
  initialValues,
  scopeLabel,
  chainLabel,
  formatValue,
  type Effective,
  type SettingValue,
  type TableRow,
} from "./settings-data";
import {
  searchSettings,
  settingCount,
  type SettingHit,
} from "./settings-search";

/**
 * Artifact Settings — the drawer's Settings tab.
 *
 * Same shell as the Remediation record: `SideRailPanel`, a rail of views, the
 * same collapsible sections and `.cg-report-action` buttons. They are the same
 * kind of object — one thing with many facets — and giving them different
 * chromes would make the drawer feel like two products.
 *
 * **This tab is operational, not governance.** Enterprise decides what is
 * permitted, the workspace narrows it for the team, and this decides how THIS
 * conversation runs inside both. Every control therefore renders where its
 * value came from, what its ceiling is, and — where more than one layer set it
 * — the narrowing chain. Without the chain an operator blocked by a workspace
 * narrowing escalates to the wrong people.
 *
 * Three decisions worth stating, because each replaced something that looked
 * fine and was not:
 *
 * 1. **No native `<select>`.** The browser widget cannot be themed, so it
 *    rendered the operating system's menu inside a dark drawer. Every picker is
 *    the composer's `PillSelect`, imported rather than reimplemented.
 * 2. **Sets are edited by narrowing, not by typing.** A chip list marked "may
 *    narrow only" that could not be touched was a claim with no control behind
 *    it. Chips now remove (and restore, up to the inherited set) in place.
 * 3. **Long tables cap rather than paginate.** These are ledgers read newest
 *    first; a pager adds state, a footer and two clicks to reach rows nobody
 *    was looking for. Six rows and "show all" costs neither.
 *
 * Structure lives in `settings-structure.ts`; this file decides how a field is
 * drawn, never which fields exist.
 */

const VIEW_ICON: Record<string, React.ReactNode> = {
  quick: <Zap size={13} />,
  session: <Server size={13} />,
  chat: <MessagesSquare size={13} />,
  tools: <Wrench size={13} />,
  canvas: <LayoutGrid size={13} />,
  report: <FileText size={13} />,
  remediation: <Workflow size={13} />,
  sharing: <Share2 size={13} />,
  data: <Database size={13} />,
  observability: <Terminal size={13} />,
  danger: <AlertTriangle size={13} />,
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

/** One local edit, for the Observability change log. */
interface ChangeEntry {
  time: string;
  key: string;
  change: string;
}

/** Where a search result wants the pane to land. */
interface FocusTarget {
  viewId: string;
  groupId: string;
  key: string;
  /** Bumped on every jump so repeat-selecting the same hit still scrolls. */
  nonce: number;
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

/**
 * Find a setting by name rather than by remembering where it lives.
 *
 * Sticky at the top of the pane, above the rail's content, because it is the
 * fastest path to any of the ~140 keys and burying it inside a view would make
 * it findable only by someone who already knew where to look.
 */
function SettingsSearch({ onJump }: { onJump: (hit: SettingHit) => void }) {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const hits = React.useMemo(() => searchSettings(q), [q]);

  React.useEffect(() => setActive(0), [q]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (hit: SettingHit) => {
    onJump(hit);
    setOpen(false);
    setQ("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(hits[active]);
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        paddingBottom: 10,
        background: "var(--cg-bg-page)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 32,
          padding: "0 10px",
          borderRadius: 8,
          border: "1px solid var(--cg-input-border)",
          background: "var(--cg-input-bg)",
        }}
      >
        <Search size={13} style={{ color: "var(--cg-text-muted)" }} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={`Search ${settingCount()} settings — name, group or key`}
          aria-label="Search settings"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--cg-text-primary)",
            fontFamily: APP_FONT,
            fontSize: 12.5,
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            style={{
              display: "inline-flex",
              border: "none",
              background: "none",
              padding: 0,
              color: "var(--cg-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div
          role="listbox"
          aria-label="Search results"
          className="cg-scroll"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 300,
            overflowY: "auto",
            borderRadius: 8,
            border: "1px solid var(--cg-border)",
            background: "var(--cg-bg-card)",
            boxShadow: "0 12px 32px rgb(0 0 0 / 32%)",
          }}
        >
          {hits.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: 12,
                color: "var(--cg-text-muted)",
              }}
            >
              Nothing matches “{q.trim()}”.
            </div>
          ) : (
            hits.map((h, i) => (
              <button
                key={h.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(h)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "7px 12px",
                  border: "none",
                  background:
                    i === active ? "var(--cg-hover-bg)" : "transparent",
                  color: "var(--cg-text-primary)",
                  fontFamily: APP_FONT,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 12.5 }}>{h.label}</span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10.5,
                    color: "var(--cg-text-muted)",
                  }}
                >
                  {h.view} › {h.group}
                </span>
                {h.hint && (
                  <span
                    style={{
                      display: "block",
                      marginTop: 1,
                      fontSize: 11,
                      lineHeight: 1.4,
                      color: "var(--cg-text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section
 * ------------------------------------------------------------------ */

function Section({
  title,
  hint,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  hint?: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section style={{ borderBottom: "1px solid var(--cg-border-subtle)" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
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

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "0 6px",
  fontSize: 10.5,
  lineHeight: "18px",
  borderRadius: 3,
  fontFamily: MONO,
  whiteSpace: "nowrap",
};

/**
 * A set, edited the only way its own rule permits.
 *
 * `tighten` sets remove in place and show what was removed, dimmed, so the
 * operator can restore up to — never past — the inherited set. `raiseOnly`
 * sets add and cannot remove, because removing an approver or a redaction
 * pattern is the widening direction. Read-only sets render plain.
 *
 * There is no free-text field for a tighten set on purpose: a destination
 * nobody approved is not a destination, so the only legal values are the ones
 * already inherited.
 */
function ChipSet({
  field,
  values,
  inherited,
  onChange,
}: {
  field: SettingField;
  values: string[];
  inherited: string[];
  onChange: (next: string[]) => void;
}) {
  const [adding, setAdding] = React.useState("");

  const removed = inherited.filter((v) => !values.includes(v));
  const canNarrow = field.editable && Boolean(field.tighten);
  const canAdd = field.editable && Boolean(field.raiseOnly);

  if (!values.length && !removed.length && !canAdd)
    return <span style={{ color: "var(--cg-text-muted)" }}>None</span>;

  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: 4,
        justifyContent: "flex-end",
        maxWidth: 320,
      }}
    >
      {values.map((v) => (
        <span
          key={v}
          style={{
            ...chipBase,
            border: "1px solid var(--cg-border)",
            color: "var(--cg-text-primary)",
          }}
        >
          {v}
          {canNarrow && (
            <button
              type="button"
              aria-label={`Remove ${v} from ${field.label}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              style={{
                display: "inline-flex",
                border: "none",
                background: "none",
                padding: 0,
                color: "var(--cg-text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={9} />
            </button>
          )}
        </span>
      ))}

      {canNarrow &&
        removed.map((v) => (
          <button
            key={v}
            type="button"
            aria-label={`Restore ${v} to ${field.label}`}
            onClick={() =>
              onChange(inherited.filter((x) => values.includes(x) || x === v))
            }
            style={{
              ...chipBase,
              border: "1px dashed var(--cg-border)",
              color: "var(--cg-text-muted)",
              background: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={9} />
            {v}
          </button>
        ))}

      {canAdd && (
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const v = adding.trim();
            if (!v || values.includes(v)) return;
            onChange([...values, v]);
            setAdding("");
          }}
          placeholder="add…"
          aria-label={`Add to ${field.label}`}
          style={{ ...inputStyle, height: 20, width: 110, fontSize: 10.5 }}
        />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */

/**
 * A ledger, rendered as a table because it is one.
 *
 * Full width rather than in the right-hand control column: these are lists of
 * unknown length whose columns need to line up, and squeezing four columns into
 * a 240px control slot makes them unreadable. The label sits above, the table
 * spans the row.
 *
 * Capped rather than paginated. Every table here is read newest-first and the
 * answer is almost always in the first few rows; a pager would add state, a
 * control strip and two clicks to reach rows nobody was looking for.
 */
function DataTable({
  columns,
  rows,
  maxRows,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  maxRows?: number;
}) {
  const [showAll, setShowAll] = React.useState(false);

  if (!rows.length)
    return (
      <div
        style={{
          padding: "10px 0 2px",
          fontSize: 11.5,
          color: "var(--cg-text-muted)",
        }}
      >
        None.
      </div>
    );

  const capped = maxRows !== undefined && !showAll && rows.length > maxRows;
  const visible = capped ? rows.slice(0, maxRows) : rows;

  return (
    <>
      <div
        className="cg-scroll"
        style={{
          marginTop: 8,
          overflowX: "auto",
          border: "1px solid var(--cg-border-subtle)",
          borderRadius: 6,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11.5,
            fontFamily: APP_FONT,
          }}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={{
                    textAlign: c.numeric ? "right" : "left",
                    padding: "7px 10px",
                    minWidth: c.minWidth,
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                    color: "var(--cg-text-muted)",
                    borderBottom: "1px solid var(--cg-border-subtle)",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              // Ledger rows have no stable id — they are a snapshot, and the
              // index is their identity within it.
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      textAlign: c.numeric ? "right" : "left",
                      padding: "6px 10px",
                      color: "var(--cg-text-primary)",
                      fontFamily: c.mono ? MONO : undefined,
                      verticalAlign: "top",
                      borderTop:
                        i === 0
                          ? undefined
                          : "1px solid var(--cg-border-subtle)",
                    }}
                  >
                    {row[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {maxRows !== undefined && rows.length > maxRows && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: 6,
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: APP_FONT,
            fontSize: 11,
            color: "var(--cg-accent)",
            cursor: "pointer",
          }}
        >
          {showAll
            ? "Show fewer"
            : `Show all ${rows.length} (${rows.length - maxRows} more)`}
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Provenance line
 * ------------------------------------------------------------------ */

/**
 * Where the value came from, what bounds it, and who to ask.
 *
 * The chain is the part that earns its space. "Mandatory — Enterprise" on a
 * value the workspace actually narrowed sends an operator to the wrong team;
 * `Enterprise canary → Workspace iac_pr → you` tells them the workspace admin
 * owns the escalation.
 */
function Provenance({
  field,
  state,
  onReset,
}: {
  field: SettingField;
  state: Effective;
  onReset: () => void;
}) {
  const isLocal = state.from === "conversation";
  const chain = state.chain ?? [];

  return (
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
      <span>{scopeLabel(state.from)}</span>

      {chain.length > 1 && (
        <span>
          ·{" "}
          {chain.map((link, i) => (
            <React.Fragment key={link.scope}>
              {i > 0 && " → "}
              {chainLabel(link.scope)}{" "}
              <span style={{ fontFamily: MONO }}>{link.value}</span>
            </React.Fragment>
          ))}
        </span>
      )}

      {state.ceiling !== undefined && (
        <span>
          · Ceiling{" "}
          <span style={{ fontFamily: MONO }}>{String(state.ceiling)}</span>
          {state.ceilingFrom && ` (${chainLabel(state.ceilingFrom)})`}
        </span>
      )}

      {field.tighten && <span>· May narrow only</span>}
      {field.raiseOnly && <span>· May strengthen only</span>}

      {state.askContact && <span>· Ask {state.askContact}</span>}

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
  );
}

/* ------------------------------------------------------------------ *
 * Field row
 * ------------------------------------------------------------------ */

function FieldRow({
  field,
  state,
  rows,
  focused,
  onChange,
  onReset,
  onAction,
}: {
  field: SettingField;
  state: Effective;
  /** Supplied for computed tables, whose rows are not in the seed. */
  rows?: TableRow[];
  focused: boolean;
  onChange: (v: SettingValue) => void;
  onReset: () => void;
  onAction: () => void;
}) {
  const locked = Boolean(field.lockedBy);
  const disabled = locked || !field.editable;
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (focused)
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused]);

  const focusRing: React.CSSProperties = focused
    ? {
        outline: "1px solid var(--cg-accent)",
        outlineOffset: 4,
        borderRadius: 4,
      }
    : {};

  // Tables own the full width of the row; every other control sits in the
  // right-hand column beside its label.
  if (field.kind === "table") {
    const data = rows ?? (state.value as TableRow[]) ?? [];
    return (
      <div
        ref={ref}
        style={{
          padding: "9px 0 12px",
          borderBottom: "1px solid var(--cg-border-subtle)",
          ...focusRing,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            color: "var(--cg-text-primary)",
          }}
        >
          {field.label}
          <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
            {data.length}
          </span>
        </div>
        {field.hint && (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--cg-text-muted)",
              marginTop: 2,
              maxWidth: "72ch",
            }}
          >
            {field.hint}
          </div>
        )}
        <DataTable
          columns={field.columns ?? []}
          rows={data}
          maxRows={field.maxRows}
        />
      </div>
    );
  }

  const control = (() => {
    if (field.kind === "action")
      return field.danger ? (
        <ConfirmButton
          label={field.label}
          title={field.label}
          body={field.hint ?? "This cannot be undone."}
          confirmLabel={field.label}
          onConfirm={onAction}
          style={{ ...btn, height: 26 }}
        />
      ) : (
        <button
          type="button"
          className="cg-report-action"
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
        <PillSelect
          value={String(state.value)}
          options={
            field.options?.length
              ? field.options
              : [{ value: String(state.value), label: String(state.value) }]
          }
          onChange={onChange}
          disabled={disabled}
          ariaLabel={field.label}
          align="right"
          width={248}
        />
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

    if (field.kind === "chips") {
      const values = (state.value as string[]) ?? [];
      const inherited = (state.inherited as string[] | undefined) ?? values;
      return (
        <ChipSet
          field={field}
          values={values}
          inherited={inherited}
          onChange={onChange}
        />
      );
    }

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
      ref={ref}
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        padding: "9px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        ...focusRing,
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
              maxWidth: "72ch",
            }}
          >
            {field.hint}
          </div>
        )}

        {locked && field.lockReason && (
          <div
            style={{
              fontSize: 10.5,
              lineHeight: 1.5,
              color: "var(--cg-accent-purple)",
              marginTop: 3,
            }}
          >
            {field.lockReason}
          </div>
        )}

        {/* Actions have no inherited value — a provenance line under a button
            would describe something that does not exist. */}
        {field.kind !== "action" && (
          <Provenance field={field} state={state} onReset={onReset} />
        )}
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
  open,
  onToggleGroup,
  focus,
  computed,
  onChange,
  onReset,
  onAction,
}: {
  groups: SettingGroup[];
  values: Record<string, Effective>;
  open: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  focus: FocusTarget | null;
  computed: (what: NonNullable<SettingField["compute"]>) => TableRow[];
  onChange: (key: string, v: SettingValue) => void;
  onReset: (key: string) => void;
  onAction: (field: SettingField) => void;
}) {
  return (
    <>
      {groups.map((grp) => (
        <Section
          key={grp.id}
          title={grp.label}
          hint={grp.hint}
          count={grp.fields.length}
          open={Boolean(open[grp.id])}
          onToggle={() => onToggleGroup(grp.id)}
        >
          {grp.fields.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              state={values[f.key] ?? { value: "—", from: "derived" }}
              rows={f.compute ? computed(f.compute) : undefined}
              focused={focus?.key === f.key}
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

function now(): string {
  return new Date().toISOString().slice(11, 19);
}

/** Groups a view opens with: the first, unless it is marked advanced. */
function defaultOpen(viewId: string): Record<string, boolean> {
  const view = SETTINGS_VIEWS.find((v) => v.id === viewId);
  const state: Record<string, boolean> = {};
  view?.groups.forEach((grp, i) => {
    state[grp.id] = i === 0 && !grp.advanced;
  });
  return state;
}

export function ArtifactSettingsView() {
  const [view, setView] = React.useState(SETTINGS_VIEWS[0].id);
  const [values, setValues] =
    React.useState<Record<string, Effective>>(initialValues);
  const [log, setLog] = React.useState<ChangeEntry[]>([]);
  const [pending, setPending] = React.useState<string[]>([]);
  const [focus, setFocus] = React.useState<FocusTarget | null>(null);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    () => defaultOpen(SETTINGS_VIEWS[0].id),
  );
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  // The focus ring is a landing cue, not a selection — it fades once the
  // operator has had time to see where they arrived.
  React.useEffect(() => {
    if (!focus) return undefined;
    const t = window.setTimeout(() => setFocus(null), 2600);
    return () => window.clearTimeout(t);
  }, [focus]);

  const sections: RailSection[] = React.useMemo(
    () =>
      SETTINGS_VIEWS.map((v) => ({
        id: v.id,
        label: v.label,
        icon: VIEW_ICON[v.id],
      })),
    [],
  );

  const current =
    SETTINGS_VIEWS.find((v) => v.id === view) ?? SETTINGS_VIEWS[0];

  const selectView = (id: string) => {
    setView(id);
    setOpenGroups(defaultOpen(id));
  };

  /** A search hit lands on the field: right view, group opened, scrolled to. */
  const jumpTo = (hit: SettingHit) => {
    setView(hit.viewId);
    setOpenGroups({ ...defaultOpen(hit.viewId), [hit.groupId]: true });
    setFocus({
      viewId: hit.viewId,
      groupId: hit.groupId,
      key: hit.key,
      nonce: Date.now(),
    });
  };

  /**
   * Local-only. A real build PATCHes and lets the server re-resolve — the
   * client's ceiling knowledge is a convenience, never the enforcement.
   */
  const onChange = (key: string, value: SettingValue) => {
    setValues((prev) => {
      const before = prev[key];
      if (!before) return prev;
      return {
        ...prev,
        [key]: {
          ...before,
          value,
          from: "conversation",
          inherited: before.inherited ?? before.value,
        },
      };
    });
    setPending((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setLog((prev) => [
      {
        time: now(),
        key,
        change: `${formatValue(values[key]?.value ?? "")} → ${formatValue(value)}`,
      },
      ...prev,
    ]);
  };

  const onReset = (key: string) => {
    setValues((prev) => {
      const cur = prev[key];
      if (!cur || cur.inherited === undefined) return prev;
      return {
        ...prev,
        [key]: { ...cur, value: cur.inherited, from: "workspace" },
      };
    });
    setPending((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setLog((prev) => [
      { time: now(), key, change: "reset to inherited" },
      ...prev,
    ]);
  };

  const overrides = React.useMemo(
    () => Object.entries(values).filter(([, v]) => v.from === "conversation"),
    [values],
  );

  /**
   * The four computed tables.
   *
   * They describe the *state of this tab* rather than the session, so they
   * cannot come from the seed — an overrides table read from static data would
   * stop matching the moment anything is changed.
   */
  const computed = React.useCallback(
    (what: NonNullable<SettingField["compute"]>): TableRow[] => {
      if (what === "overrides")
        return overrides.map(([key, v]) => {
          const def = FIELD_BY_KEY[key];
          let direction = "Changed";
          if (def?.tighten) direction = "Narrowed";
          else if (def?.raiseOnly) direction = "Strengthened";
          return {
            setting: def?.label ?? key,
            inherited:
              v.inherited === undefined ? "—" : formatValue(v.inherited),
            here: formatValue(v.value),
            direction,
          };
        });

      if (what === "restartQueue")
        return overrides
          .filter(([key]) => FIELD_BY_KEY[key]?.restart)
          .map(([key, v]) => ({
            setting: FIELD_BY_KEY[key]?.label ?? key,
            value: formatValue(v.value),
          }));

      if (what === "profileEffect") {
        // What the chosen profile would set, against what is actually in force.
        // Read live so "In force now" cannot go stale the moment anything moves.
        const profile = String(values["quick.profile"]?.value ?? "custom");
        const PROFILES: Record<string, Record<string, string>> = {
          investigate: {
            "rem.ceiling": "none",
            "chat.exec.mode": "plan",
            "session.net.mode": "broker",
            "tools.conn.scope": "on",
          },
          author: {
            "rem.ceiling": "none",
            "chat.exec.mode": "edit_auto",
            "session.net.mode": "broker",
            "tools.conn.scope": "on",
          },
          remediate_plan: {
            "rem.ceiling": "iac_pr",
            "chat.exec.mode": "plan",
            "session.net.mode": "broker",
            "rem.canaryRequired": "on",
          },
          remediate_exec: {
            "rem.ceiling": "execute",
            "chat.exec.mode": "edit_auto",
            "session.net.mode": "allowlist",
            "rem.canaryRequired": "on",
          },
        };
        const spec = PROFILES[profile];
        if (!spec) return [];
        return Object.entries(spec).map(([key, want]) => ({
          setting: FIELD_BY_KEY[key]?.label ?? key,
          profile: want,
          current: formatValue(values[key]?.value ?? "—"),
        }));
      }

      return log.map((e) => ({
        time: e.time,
        setting: FIELD_BY_KEY[e.key]?.label ?? e.key,
        change: e.change,
      }));
    },
    [overrides, log, values],
  );

  const dirty = overrides.length;
  const restartPending = overrides.filter(
    ([key]) => FIELD_BY_KEY[key]?.restart,
  ).length;

  return (
    <div style={{ height: "100%", minHeight: 0, fontFamily: APP_FONT }}>
      <GridPalette />
      <SideRailPanel
        background="var(--cg-bg-page)"
        title="Session settings"
        subtitle={
          <>
            {current.hint}. {dirty} setting{dirty === 1 ? "" : "s"} set here
            {restartPending > 0 && `, ${restartPending} waiting on a restart`}.
          </>
        }
        sections={sections}
        active={view}
        onSelect={selectView}
        actions={
          <>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              disabled={dirty === 0}
              onClick={() => {
                setValues(initialValues());
                setPending([]);
                setLog((prev) => [
                  { time: now(), key: "*", change: "all reset to inherited" },
                  ...prev,
                ]);
                setMsg("All settings reset to inherited.");
              }}
            >
              <RotateCcw size={12} /> Reset all
            </button>
            <button
              type="button"
              className="cg-report-action cg-report-action-primary"
              style={btn}
              disabled={pending.length === 0}
              onClick={() => {
                setMsg(
                  `Applied ${pending.length} change${pending.length === 1 ? "" : "s"} to this conversation.`,
                );
                setPending([]);
              }}
            >
              <Check size={12} /> Apply
              {pending.length > 0 ? ` (${pending.length})` : ""}
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
              "Inherited from Enterprise and Workspace unless set here. A value may be narrowed, never widened."}
          </span>
        }
      >
        <SettingsSearch onJump={jumpTo} />
        <GroupPane
          groups={current.groups}
          values={values}
          open={openGroups}
          onToggleGroup={(id) =>
            setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
          }
          focus={focus}
          computed={computed}
          onChange={onChange}
          onReset={onReset}
          onAction={(f) => setMsg(`${f.label} — not wired yet.`)}
        />
      </SideRailPanel>
    </div>
  );
}

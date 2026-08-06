/* eslint-disable i18next/no-literal-string -- resource report page */
import React from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileJson,
  Globe,
  LifeBuoy,
  Radar,
  Save,
  ShieldAlert,
  Users,
} from "lucide-react";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useConversationId } from "#/hooks/use-conversation-id";
import { SideRailPanel } from "#/components/admin/admin-kit";
import { APP_FONT } from "./theme";
import { GridPalette } from "./palette";
import { buildColumns } from "./columns";
import { ICON_FIELDS, ValueWithIcon, ResourceIcon } from "./icons";
import { SeverityGauge } from "./SeverityGauge";
import type { ResourceRow } from "./data";
import {
  resourceReportFilename,
  resourceReportMarkdown,
} from "./resource-report";

/**
 * One-page report for a resource, opened by clicking a row in the inventory.
 *
 * The same shape as the event report — header, tabs, openable sections, save to
 * the artifact listing — because they are the same job: take the thing you
 * clicked and answer "what is it, how bad is it, what do I do".
 *
 * **The views ARE the table's column groups**, derived from `buildColumns` at
 * runtime rather than restated here. Resource · Placement · Ownership · Risk ·
 * Compliance · Resilience · Operations · Discovery, each split by its
 * sub-group. A hand-written copy of that taxonomy would drift the first time a
 * column moved, and then the report and the table would disagree about what a
 * resource *is*.
 */

interface FieldRef {
  field: string;
  label: string;
  subGroup: string;
}
interface GroupRef {
  group: string;
  fields: FieldRef[];
}

/** One glyph per column group, so the rail reads at a glance. */
const GROUP_ICON: Record<string, React.ReactNode> = {
  Resource: <Boxes size={13} />,
  Placement: <Globe size={13} />,
  Ownership: <Users size={13} />,
  Risk: <ShieldAlert size={13} />,
  Compliance: <BadgeCheck size={13} />,
  Resilience: <LifeBuoy size={13} />,
  Operations: <Activity size={13} />,
  Discovery: <Radar size={13} />,
};

/** Walk the grid's own column definitions into report sections. */
function deriveGroups(): GroupRef[] {
  const defs = buildColumns({
    expanded: new Set<string>(),
    onToggle: () => {},
  });
  return defs.map((g) => ({
    group: (g as ColGroupDef).headerName ?? "Other",
    fields: ((g as ColGroupDef).children as ColDef[])
      .filter((c) => Boolean(c.field))
      .map((c) => ({
        field: c.field as string,
        label: c.headerName ?? (c.field as string),
        subGroup:
          (c.context as { subGroup?: string } | undefined)?.subGroup ?? "Other",
      })),
  }));
}

function scalar(v: unknown): React.ReactNode {
  if (v instanceof Date) return v.toLocaleString();
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

/**
 * Metrics copied from `ConversationTabNav` so the report actions and the drawer
 * tabs are the same control: 28px tall, 10px padding, 12.5px type, 6px gap.
 * Colour, background, radius and every interactive state come from the
 * `.cg-report-action` class — inline styles beat a class, so nothing the class
 * owns may be repeated here.
 */
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "7px 0",
        fontSize: 13,
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <span
        style={{
          flex: "0 0 150px",
          fontSize: 12.5,
          color: "var(--cg-text-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          color: "var(--cg-text-primary)",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Section({
  title,
  count,
  open: initial,
  children,
}: {
  title: string;
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
          alignItems: "center",
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
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {title}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
          }}
        >
          {count}
        </span>
      </button>
      {open && <div style={{ padding: "0 2px 16px 22px" }}>{children}</div>}
    </section>
  );
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(
    new Blob([body], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ResourceReport({
  resource,
  onBack,
  onSaved,
}: {
  resource: ResourceRow;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { conversationId } = useConversationId();
  // Derived once: the column definitions do not change between renders, and
  // rebuilding 60 columns per keystroke on a report is wasted work.
  const groups = React.useMemo(deriveGroups, []);
  const [view, setView] = React.useState(groups[0]?.group ?? "Resource");
  const [save, setSave] = React.useState<SaveState>("idle");

  React.useEffect(() => {
    setSave("idle");
    setView(groups[0]?.group ?? "Resource");
  }, [resource.id, groups]);

  const active = groups.find((g) => g.group === view) ?? groups[0];
  const record = resource as unknown as Record<string, unknown>;

  // Sub-groups become the openable sections inside a view, in first-seen order
  // so they match the header groups' left-to-right reading order.
  const sections = React.useMemo(() => {
    const out = new Map<string, FieldRef[]>();
    (active?.fields ?? []).forEach((f) => {
      const list = out.get(f.subGroup);
      if (list) list.push(f);
      else out.set(f.subGroup, [f]);
    });
    return [...out.entries()];
  }, [active]);

  const onSave = async () => {
    if (!conversationId) {
      setSave("error");
      return;
    }
    setSave("saving");
    try {
      await ConversationService.uploadFiles(conversationId, [
        new File(
          [resourceReportMarkdown(resource, groups)],
          resourceReportFilename(resource),
          { type: "text/markdown" },
        ),
      ]);
      setSave("saved");
      onSaved();
    } catch {
      setSave("error");
    }
  };

  return (
    <div style={{ height: "100%", minHeight: 0, fontFamily: APP_FONT }}>
      <GridPalette />

      <SideRailPanel
        title={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <ResourceIcon kind={resource.kind} size={16} />
            {resource.resource}
          </span>
        }
        subtitle={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <SeverityGauge severity={resource.severity} size={13} />
            {resource.severity} · {resource.kind} · {resource.provider} ·{" "}
            {resource.region} · {resource.environment} · {resource.owner}
          </span>
        }
        sections={groups.map((g) => ({
          id: g.group,
          label: g.group,
          icon: GROUP_ICON[g.group],
        }))}
        active={view}
        onSelect={setView}
        footer={
          <span
            style={{
              marginRight: "auto",
              alignSelf: "center",
              fontSize: 11,
              color: "var(--cg-text-muted)",
            }}
          >
            {save === "saved" ? "Saved to reports" : "Unsaved report"}
          </span>
        }
        actions={
          <>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              onClick={onBack}
            >
              <ArrowLeft size={12} /> Reports
            </button>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              onClick={() =>
                navigator.clipboard?.writeText(
                  groups
                    .flatMap((g) =>
                      g.fields.map(
                        (f) => `${f.label}\t${String(record[f.field])}`,
                      ),
                    )
                    .join("\n"),
                )
              }
            >
              <Copy size={12} /> Copy
            </button>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              onClick={() =>
                download(
                  `${resource.id}.json`,
                  JSON.stringify(
                    resource,
                    (_k, v) => (v instanceof Date ? v.toISOString() : v),
                    2,
                  ),
                )
              }
            >
              <FileJson size={12} /> Export
            </button>
            <button
              type="button"
              className={`cg-report-action ${
                save === "error"
                  ? "cg-report-action-danger"
                  : "cg-report-action-primary"
              }`}
              style={btn}
              disabled={save === "saving"}
              onClick={onSave}
            >
              {save === "saved" ? <Check size={12} /> : <Save size={12} />}
              {
                {
                  idle: "Save to reports",
                  saving: "Saving…",
                  saved: "Saved",
                  error: "Save failed — retry",
                }[save]
              }
            </button>
          </>
        }
      >
        {sections.map(([sub, fields], i) => (
          <Section key={sub} title={sub} count={fields.length} open={i === 0}>
            {fields.map((f) => (
              <Row
                key={f.field}
                label={f.label}
                value={
                  ICON_FIELDS.has(f.field) ? (
                    <ValueWithIcon
                      field={f.field}
                      value={String(record[f.field] ?? "")}
                    />
                  ) : (
                    scalar(record[f.field])
                  )
                }
              />
            ))}
          </Section>
        ))}
      </SideRailPanel>
    </div>
  );
}

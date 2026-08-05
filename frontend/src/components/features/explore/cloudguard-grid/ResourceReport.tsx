/* eslint-disable i18next/no-literal-string -- resource report page */
import React from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileJson,
  Save,
} from "lucide-react";
import {
  CG_ASK_ABOUT_EVENT,
  type CgAskAboutDetail,
} from "#/hooks/chat/use-chat-input-logic";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useConversationId } from "#/hooks/use-conversation-id";
import {
  drawerTabStrip,
  drawerTab,
} from "#/components/admin/pages/graph-shell";
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

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 24,
  padding: "0 9px",
  fontSize: 11.5,
  fontFamily: APP_FONT,
  background: "transparent",
  color: "var(--cg-text-primary)",
  border: "1px solid var(--cg-border)",
  borderRadius: 3,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        fontSize: 11.5,
        lineHeight: "18px",
        borderRadius: 11,
        border: "1px solid var(--cg-border)",
        color: "var(--cg-text-primary)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

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

  const askAgent = () => {
    const detail: CgAskAboutDetail = {
      text: `${resource.kind} \`${resource.resource}\` (id: \`${resource.id}\`) — `,
    };
    window.dispatchEvent(new CustomEvent(CG_ASK_ABOUT_EVENT, { detail }));
  };

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
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        fontFamily: APP_FONT,
        background: "var(--cg-bg-page)",
      }}
    >
      <GridPalette />

      <header
        style={{
          flexShrink: 0,
          padding: "12px 16px 8px",
          borderBottom: "1px solid var(--cg-border-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <button type="button" style={btn} onClick={onBack}>
            <ArrowLeft size={12} /> Reports
          </button>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--cg-text-primary)",
            }}
          >
            <SeverityGauge severity={resource.severity} size={18} />
            {resource.severity}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10.5,
              color: "var(--cg-text-muted)",
            }}
          >
            {save === "saved" ? "Saved to reports" : "Unsaved report"}
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 19,
            fontWeight: 700,
            lineHeight: 1.2,
            color: "var(--cg-text-primary)",
          }}
        >
          <ResourceIcon kind={resource.kind} size={18} />
          {resource.resource}
        </h1>
        <div
          style={{
            marginTop: 2,
            fontSize: 12.5,
            color: "var(--cg-text-muted)",
          }}
          title={resource.urn}
        >
          {resource.id}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            margin: "10px 0 2px",
          }}
        >
          <Chip>{resource.provider}</Chip>
          <Chip>{resource.region}</Chip>
          <Chip>{resource.environment}</Chip>
          <Chip>{resource.serviceType}</Chip>
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button type="button" style={btn} onClick={askAgent}>
              <Bot size={12} /> Ask AI
            </button>
            <button
              type="button"
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
              style={{ ...btn, borderColor: "var(--cg-accent)" }}
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
          </span>
        </div>
      </header>

      {/*
       * Wrap rather than scroll. `drawerTabStrip` is nowrap + overflow-x auto,
       * which put a scrollbar under eight tabs and hid the last of them behind
       * a gesture; a view the user cannot see is a view they will not use.
       */}
      <nav
        style={{
          ...drawerTabStrip,
          flexWrap: "wrap",
          overflowX: "hidden",
          overflowY: "hidden",
          gap: 16,
          rowGap: 0,
          padding: "4px 16px 0",
        }}
      >
        {groups.map((g) => (
          <button
            key={g.group}
            type="button"
            role="tab"
            aria-selected={view === g.group}
            style={drawerTab(view === g.group)}
            onClick={() => setView(g.group)}
          >
            {g.group}
          </button>
        ))}
      </nav>

      <div
        className="cg-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "8px 16px 32px",
        }}
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
      </div>
    </div>
  );
}

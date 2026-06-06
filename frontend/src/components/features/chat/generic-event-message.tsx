import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { ChevronDown, Activity, type LucideIcon } from "lucide-react";
import { code } from "../markdown/code";
import { ol, ul } from "../markdown/list";
import { SuccessIndicator } from "./success-indicator";
import type { ObservationResultStatus } from "./event-content-helpers/get-observation-result";

const RAIL_LINE = "var(--cg-border)";
const RAIL_ICON = "var(--cg-text-muted)";
const BOX_BG = "var(--cg-input-bg)";
const BOX_BORDER = "var(--cg-border)";

interface GenericEventMessageProps {
  title: React.ReactNode;
  details: string | React.ReactNode;
  success?: ObservationResultStatus;
  initiallyExpanded?: boolean;
  icon?: LucideIcon;
  /** When false, the details are always shown (no collapse toggle / chevron). */
  collapsible?: boolean;
}

export function GenericEventMessage({
  title,
  details,
  success,
  initiallyExpanded = false,
  icon: Icon = Activity,
  collapsible = true,
}: GenericEventMessageProps) {
  const [showDetails, setShowDetails] = React.useState(initiallyExpanded);
  const expanded = collapsible ? showDetails : true;

  return (
    <div className="flex w-full">
      {/* ── Timeline rail ── */}
      <div className="w-[20px] flex flex-col items-center shrink-0" aria-hidden>
        <div className="w-px flex-1" style={{ background: RAIL_LINE }} />
        <Icon
          size={16}
          className="shrink-0 my-[3px]"
          style={{ color: RAIL_ICON }}
        />
        <div className="w-px flex-1" style={{ background: RAIL_LINE }} />
      </div>

      {/* ── Content column ── */}
      <div className="min-w-0 pl-2 py-1.5 flex-1">
        {/* Header row */}
        <button
          type="button"
          onClick={() => collapsible && setShowDetails((prev) => !prev)}
          className={`flex items-center gap-2 py-1 text-sm flex-1 min-w-0 w-full transition-colors text-[var(--cg-text-nav)] ${
            collapsible
              ? "cursor-pointer hover:text-[var(--cg-text-primary)]"
              : "cursor-default"
          }`}
        >
          <span className="text-sm truncate w-0 flex-grow text-left leading-[1.7]">
            {title}
          </span>
          {success && <SuccessIndicator status={success} />}
          {collapsible && (
            <span
              className="inline-flex transition-transform duration-200 shrink-0"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <ChevronDown size={12} />
            </span>
          )}
        </button>

        {/* Expanded content box */}
        {expanded && details && (
          <div
            className="mt-1 mb-1 rounded-md overflow-auto pl-3 pr-2 py-2 border-l text-sm"
            style={{
              background: BOX_BG,
              borderColor: BOX_BORDER,
              color: "var(--cg-text-primary)",
            }}
          >
            {typeof details === "string" ? (
              <Markdown
                components={{ code, ul, ol }}
                remarkPlugins={[remarkGfm, remarkBreaks]}
              >
                {details}
              </Markdown>
            ) : (
              details
            )}
          </div>
        )}
      </div>
    </div>
  );
}

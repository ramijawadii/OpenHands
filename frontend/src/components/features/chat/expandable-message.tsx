import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import { Link } from "react-router";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useConfig } from "#/hooks/query/use-config";
import { I18nKey } from "#/i18n/declaration";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { cn } from "#/utils/utils";
import { code } from "../markdown/code";
import { ol, ul } from "../markdown/list";
import { paragraph } from "../markdown/paragraph";
import { MonoComponent } from "./mono-component";
import { PathComponent } from "./path-component";

const trimText = (text: string, maxLength: number): string => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

interface ExpandableMessageProps {
  id?: string;
  message: string;
  type: string;
  success?: boolean;
  observation?: { payload: OpenHandsObservation };
  action?: { payload: OpenHandsAction };
}

export function ExpandableMessage({
  id,
  message,
  type,
  success,
  observation,
  action,
}: ExpandableMessageProps) {
  const { data: config } = useConfig();
  const { t, i18n } = useTranslation();
  const [showDetails, setShowDetails] = useState(true);
  const [details, setDetails] = useState(message);
  const [translationId, setTranslationId] = useState<string | undefined>(id);
  const [translationParams, setTranslationParams] = useState<
    Record<string, unknown>
  >({
    observation,
    action,
  });

  useEffect(() => {
    // If we have a translation ID, process it
    if (id && i18n.exists(id)) {
      let processedObservation = observation;
      let processedAction = action;

      if (action && action.payload.action === "run") {
        const trimmedCommand = trimText(action.payload.args.command, 80);
        processedAction = {
          ...action,
          payload: {
            ...action.payload,
            args: {
              ...action.payload.args,
              command: trimmedCommand,
            },
          },
        };
      }

      if (observation && observation.payload.observation === "run") {
        const trimmedCommand = trimText(observation.payload.extras.command, 80);
        processedObservation = {
          ...observation,
          payload: {
            ...observation.payload,
            extras: {
              ...observation.payload.extras,
              command: trimmedCommand,
            },
          },
        };
      }

      setTranslationId(id);
      setTranslationParams({
        observation: processedObservation,
        action: processedAction,
      });
      setDetails(message);
      setShowDetails(false);
    }
  }, [id, message, observation, action, i18n.language]);

  const statusIconClasses = "h-4 w-4 ml-2 inline";

  if (
    config?.FEATURE_FLAGS.ENABLE_BILLING &&
    config?.APP_MODE === "saas" &&
    id === I18nKey.STATUS$ERROR_LLM_OUT_OF_CREDITS
  ) {
    return (
      <div
        data-testid="out-of-credits"
        className="flex gap-2 items-center justify-start border-l-2 pl-2 my-2 py-2 border-danger"
      >
        <div className="text-sm w-full">
          <div className="font-bold text-danger">
            {t(I18nKey.STATUS$ERROR_LLM_OUT_OF_CREDITS)}
          </div>
          <Link
            className="mt-2 mb-2 w-full h-10 rounded-sm flex items-center justify-center gap-2 bg-primary text-[#0D0F11]"
            to="/settings/billing"
          >
            {t(I18nKey.BILLING$CLICK_TO_TOP_UP)}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 items-center justify-start border-l pl-2 my-1 py-2",
      )}
      style={{
        borderColor:
          type === "error" ? undefined : "var(--cg-border)",
        borderLeftColor:
          type === "error" ? "var(--color-danger)" : "var(--cg-border)",
        background: "var(--cg-input-bg)",
        borderRadius: "0 6px 6px 0",
      }}
    >
      <div className="text-sm w-full">
        <div className="flex flex-row justify-between items-center w-full">
          <span
            className={cn(
              "font-bold",
              type === "error" ? "text-danger" : "text-[var(--cg-text-nav)]",
            )}
          >
            {translationId && i18n.exists(translationId) ? (
              <Trans
                i18nKey={translationId}
                values={translationParams}
                components={{
                  bold: <strong />,
                  path: <PathComponent />,
                  cmd: <MonoComponent />,
                }}
              />
            ) : (
              message
            )}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="cursor-pointer text-left"
            >
              {showDetails ? (
                <ChevronUp
                  className={cn(
                    "h-4 w-4 ml-2 inline",
                    type === "error" ? "fill-danger" : "fill-[var(--cg-text-nav)]",
                  )}
                />
              ) : (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 ml-2 inline",
                    type === "error" ? "fill-danger" : "fill-[var(--cg-text-nav)]",
                  )}
                />
              )}
            </button>
          </span>
          {type === "action" && success !== undefined && (
            <span className="flex-shrink-0">
              {success ? (
                <CheckCircle2
                  data-testid="status-icon"
                  className={cn(statusIconClasses, "fill-success")}
                />
              ) : (
                <XCircle
                  data-testid="status-icon"
                  className={cn(statusIconClasses, "fill-danger")}
                />
              )}
            </span>
          )}
        </div>
        {showDetails && (
          <div className="text-sm">
            <Markdown
              components={{
                code,
                ul,
                ol,
                p: paragraph,
              }}
              remarkPlugins={[remarkGfm, remarkBreaks]}
            >
              {details}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

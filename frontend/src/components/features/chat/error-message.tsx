import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useTranslation } from "react-i18next";
import { code } from "../markdown/code";
import { ol, ul } from "../markdown/list";
import { ChevronDown, ChevronUp, XCircle } from "lucide-react";
import i18n from "#/i18n";

interface ErrorMessageProps {
  errorId?: string;
  defaultMessage: string;
}

export function ErrorMessage({ errorId, defaultMessage }: ErrorMessageProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = React.useState(false);

  const hasValidTranslationId = !!errorId && i18n.exists(errorId);
  const errorKey = hasValidTranslationId
    ? errorId
    : "CHAT_INTERFACE$AGENT_ERROR_MESSAGE";

  return (
    <div className="flex flex-col gap-2 my-2 py-1 text-sm w-full text-[var(--cg-text-primary)]">
      <div className="flex items-center gap-1.5 text-danger">
        <XCircle className="h-4 w-4 fill-transparent text-danger shrink-0" />
        <span className="font-medium">{t(errorKey)}</span>
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="cursor-pointer text-left"
        >
          {showDetails ? (
            <ChevronUp className="h-4 w-4 inline text-danger" />
          ) : (
            <ChevronDown className="h-4 w-4 inline text-danger" />
          )}
        </button>
      </div>

      {showDetails && (
        <Markdown
          components={{
            code,
            ul,
            ol,
          }}
          remarkPlugins={[remarkGfm, remarkBreaks]}
        >
          {defaultMessage}
        </Markdown>
      )}
    </div>
  );
}

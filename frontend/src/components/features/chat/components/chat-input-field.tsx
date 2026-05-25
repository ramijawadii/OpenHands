import React from "react";
import { useTranslation } from "react-i18next";
import { isLongPaste } from "./chat-paste-preview";

interface ChatInputFieldProps {
  chatInputRef: React.RefObject<HTMLDivElement | null>;
  onInput: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onLongPaste?: (text: string) => void;
}

export function ChatInputField({
  chatInputRef,
  onInput,
  onPaste,
  onKeyDown,
  onFocus,
  onBlur,
  onLongPaste,
}: ChatInputFieldProps) {
  const { t } = useTranslation();

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text && isLongPaste(text) && onLongPaste) {
      e.preventDefault();
      onLongPaste(text);
      return;
    }
    onPaste(e);
  };

  return (
    <div
      className="box-border content-stretch flex flex-row items-center justify-start min-h-6 p-0 relative shrink-0 flex-1"
      data-name="Text & caret"
    >
      <div className="basis-0 flex flex-col font-normal grow justify-center leading-[0] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[var(--cg-text-muted)] text-[16px] text-left">
        <div
          ref={chatInputRef}
          className="chat-input bg-transparent text-[var(--cg-text-primary)] text-[16px] font-normal leading-[20px] outline-none resize-none custom-scrollbar min-h-[20px] max-h-[400px] [text-overflow:inherit] [text-wrap-mode:inherit] [white-space-collapse:inherit] block whitespace-pre-wrap"
          contentEditable
          data-placeholder={t("SUGGESTIONS$WHAT_TO_BUILD")}
          data-testid="chat-input"
          onInput={onInput}
          onPaste={handlePaste}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}

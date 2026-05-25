import React from "react";
import { Paperclip, ChevronDown, Terminal, Command } from "lucide-react";
import { cn } from "#/utils/utils";
import { ChatSendButton } from "../chat-send-button";
import { ChatInputField } from "./chat-input-field";
import {
  PastePreviewBlock,
  type PasteBlock,
} from "./chat-paste-preview";
import { expandSlashCommand } from "#/utils/expand-slash-command";
import AwsColorIcon from "#/icons/aws-color (1).svg?react";
import AzureAIcon from "#/icons/azure-a.svg?react";
import GoogleCloudIcon from "#/icons/icons8-google-cloud.svg?react";

const CLOUD_PROVIDERS = [
  {
    label: "AWS",
    Icon: AwsColorIcon,
    prompt:
      "Analyse my AWS infrastructure and report on security posture, resource inventory, and compliance status.",
  },
  {
    label: "Azure",
    Icon: AzureAIcon,
    prompt:
      "Analyse my Azure infrastructure and report on security posture, resource inventory, and compliance status.",
  },
  {
    label: "Google Cloud",
    Icon: GoogleCloudIcon,
    prompt:
      "Analyse my Google Cloud infrastructure and report on security posture, resource inventory, and compliance status.",
  },
] as const;

interface ChatInputRowProps {
  chatInputRef: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
  showButton: boolean;
  buttonClassName: string;
  handleFileIconClick: (isDisabled: boolean) => void;
  handleSubmit: () => void;
  onInput: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showCmdMenu?: boolean;
  onToggleCmdMenu?: () => void;
  modeSlot?: React.ReactNode;
  agentStatusSlot?: React.ReactNode;
}

export function ChatInputRow({
  chatInputRef,
  disabled,
  showButton,
  buttonClassName,
  handleFileIconClick,
  handleSubmit,
  onInput,
  onPaste,
  onKeyDown,
  onFocus,
  onBlur,
  showCmdMenu,
  onToggleCmdMenu,
  modeSlot,
  agentStatusSlot,
}: ChatInputRowProps) {
  const [showUploadMenu, setShowUploadMenu] = React.useState(false);
  const [pastedBlocks, setPastedBlocks] = React.useState<PasteBlock[]>([]);
  const uploadRef = React.useRef<HTMLDivElement>(null);

  /* ── Close upload menu on outside click ── */
  React.useEffect(() => {
    if (!showUploadMenu) return;
    const handle = (e: MouseEvent) => {
      if (
        uploadRef.current &&
        !uploadRef.current.contains(e.target as Node)
      ) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showUploadMenu]);

  /* ── Paste helpers ── */
  const handleLongPaste = (text: string) => {
    setPastedBlocks((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), text, createdAt: Date.now() },
    ]);
  };

  const removePastedBlock = (id: string) =>
    setPastedBlocks((prev) => prev.filter((b) => b.id !== id));

  /* Prepend paste blocks to the contentEditable just before the message fires */
  const flushPasteBlocks = () => {
    if (pastedBlocks.length === 0 || !chatInputRef.current) return;
    const prefix = pastedBlocks.map((b) => b.text).join("\n\n---\n\n");
    const current = chatInputRef.current.textContent?.trim() ?? "";
    chatInputRef.current.textContent =
      prefix + (current ? "\n\n" + current : "");
    setPastedBlocks([]);
  };

  const handleWrappedSubmit = () => {
    flushPasteBlocks();
    const el = chatInputRef.current;
    if (el) {
      const raw = el.textContent ?? "";
      const expanded = expandSlashCommand(raw);
      if (expanded !== raw) {
        el.textContent = expanded;
      }
    }
    handleSubmit();
  };

  const handleWrappedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && pastedBlocks.length > 0) {
      flushPasteBlocks();
    }
    onKeyDown(e);
  };

  /* ── Button style helpers ── */
  const btnBase =
    "flex items-center gap-1.5 px-2.5 py-[5px] rounded-lg text-[12px] font-medium transition-colors duration-150 select-none cursor-pointer";
  const btnIdle = "text-[var(--cg-text-nav)] hover:text-[var(--cg-text-primary)]";
  const btnActive = "text-[var(--cg-text-primary)]";
  const btnStyle = { border: "1px solid var(--cg-border)", background: "var(--cg-workspace-bg)" } as React.CSSProperties;

  return (
    <div className="flex flex-col w-full gap-2.5 pb-[18px]">
      {/* Paste preview blocks */}
      {pastedBlocks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {pastedBlocks.map((block) => (
            <PastePreviewBlock
              key={block.id}
              block={block}
              onRemove={removePastedBlock}
            />
          ))}
        </div>
      )}

      {/* Text input */}
      <ChatInputField
        chatInputRef={chatInputRef}
        onInput={onInput}
        onPaste={onPaste}
        onKeyDown={handleWrappedKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onLongPaste={handleLongPaste}
      />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between w-full">
        {/* Left: Upload + Cmd + Cloud icons */}
        <div className="flex items-center gap-2">
          {/* Upload dropdown */}
          <div ref={uploadRef} className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setShowUploadMenu((v) => !v)}
              style={disabled ? { border: "1px solid var(--cg-border)", background: "transparent" } : btnStyle}
              className={cn(
                btnBase,
                disabled
                  ? "text-[var(--cg-text-muted)] cursor-not-allowed"
                  : showUploadMenu
                    ? btnActive
                    : btnIdle,
              )}
            >
              <Paperclip size={13} />
              <span>Upload</span>
              <ChevronDown size={11} className="opacity-50" />
            </button>

            {showUploadMenu && (
              <div
                className="absolute bottom-full left-0 mb-1.5 rounded-xl overflow-hidden z-50 w-52"
                style={{
                  background: "var(--cg-bg-primary-sidebar)",
                  border: "1px solid var(--cg-border)",
                  boxShadow: "var(--cg-shadow-dropdown)",
                }}
              >
                {[
                  {
                    label: "Attach file",
                    action: () => {
                      handleFileIconClick(disabled);
                      setShowUploadMenu(false);
                    },
                  },
                  {
                    label: "Add context",
                    action: () => {
                      const el = chatInputRef.current;
                      if (el) {
                        el.focus();
                        document.execCommand("insertText", false, "@");
                      }
                      setShowUploadMenu(false);
                    },
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="w-full text-left px-3 py-2.5 flex items-center text-sm transition-colors text-[var(--cg-text-nav)]"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "var(--cg-bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "transparent")
                    }
                    onClick={item.action}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cmd button */}
          <button
            type="button"
            onClick={onToggleCmdMenu}
            style={btnStyle}
            className={cn(
              btnBase,
              showCmdMenu ? btnActive : btnIdle,
            )}
          >
            <Command size={13} />
            <span>Cmd</span>
          </button>

          {/* Cloud provider icon buttons */}
          {CLOUD_PROVIDERS.map(({ label, Icon, prompt }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!chatInputRef.current || disabled) return;
                chatInputRef.current.focus();
                document.execCommand("insertText", false, prompt);
              }}
              title={label}
              className="flex items-center justify-center cursor-pointer select-none transition-opacity duration-150"
              style={{
                background: "transparent",
                border: "none",
                padding: "4px",
                borderRadius: "6px",
                opacity: disabled ? 0.25 : 0.65,
              }}
              onMouseEnter={(e) => {
                if (!disabled)
                  (e.currentTarget as HTMLElement).style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = disabled ? "0.25" : "0.65";
              }}
            >
              <Icon width={16} height={16} style={{ display: "block" }} />
            </button>
          ))}
        </div>

        {/* Right: mode selector + agent status + send */}
        <div className="flex items-center gap-2">
          {modeSlot}
          {agentStatusSlot}
          {showButton && (
            <ChatSendButton
              buttonClassName={buttonClassName}
              handleSubmit={handleWrappedSubmit}
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}

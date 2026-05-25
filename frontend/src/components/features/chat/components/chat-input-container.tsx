import React from "react";
import { ConversationStatus } from "#/types/conversation-status";
import { DragOver } from "../drag-over";
import { UploadedFiles } from "../uploaded-files";
import { ChatInputRow } from "./chat-input-row";
import { ChatCmdMenu } from "./chat-cmd-menu";
import { ChatSkillMenu } from "./chat-skill-menu";
import { ServerStatus } from "#/components/features/controls/server-status";
import { AgentStatus } from "#/components/features/controls/agent-status";
import { ChatModeButton } from "./chat-mode-menu";
import { filterSkills, type Skill } from "#/data/skill-registry";

interface ChatInputContainerProps {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  isDragOver: boolean;
  disabled: boolean;
  showButton: boolean;
  buttonClassName: string;
  conversationStatus: ConversationStatus | null;
  chatInputRef: React.RefObject<HTMLDivElement | null>;
  handleFileIconClick: (isDisabled: boolean) => void;
  handleSubmit: () => void;
  handleStop: (onStop?: () => void) => void;
  handleResumeAgent: () => void;
  onDragOver: (e: React.DragEvent, isDisabled: boolean) => void;
  onDragLeave: (e: React.DragEvent, isDisabled: boolean) => void;
  onDrop: (e: React.DragEvent, isDisabled: boolean) => void;
  onInput: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onStop?: () => void;
}

export function ChatInputContainer({
  chatContainerRef,
  isDragOver,
  disabled,
  showButton,
  buttonClassName,
  conversationStatus,
  chatInputRef,
  handleFileIconClick,
  handleSubmit,
  handleStop,
  handleResumeAgent,
  onDragOver,
  onDragLeave,
  onDrop,
  onInput,
  onPaste,
  onKeyDown,
  onFocus,
  onBlur,
  onStop,
}: ChatInputContainerProps) {
  const [showCmdMenu, setShowCmdMenu] = React.useState(false);
  const [slashQuery, setSlashQuery] = React.useState<string | null>(null);
  const [slashIndex, setSlashIndex] = React.useState(0);

  // Close cmd menu on click outside the container
  React.useEffect(() => {
    if (!showCmdMenu) return;
    const handle = (e: MouseEvent) => {
      if (
        chatContainerRef.current &&
        !chatContainerRef.current.contains(e.target as Node)
      ) {
        setShowCmdMenu(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showCmdMenu, chatContainerRef]);

  const selectSkill = React.useCallback(
    (skill: Skill) => {
      const el = chatInputRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      document.execCommand("insertText", false, skill.prompt);
      setSlashQuery(null);
    },
    [chatInputRef],
  );

  // Detect `/` at start of input to open skill menu (hide once user types a space after the command)
  const handleInputWithSlash = React.useCallback(() => {
    const text = chatInputRef.current?.textContent ?? "";
    const afterSlash = text.slice(1);
    if (text.startsWith("/") && !afterSlash.includes(" ")) {
      setSlashQuery(afterSlash);
      setSlashIndex(0);
    } else {
      setSlashQuery(null);
    }
    onInput();
  }, [onInput, chatInputRef]);

  // Keyboard navigation for skill menu — must be after selectSkill
  const handleKeyDownWithSlash = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (slashQuery !== null) {
        const skills = filterSkills(slashQuery);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSlashIndex((i) => (i + 1) % Math.max(skills.length, 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSlashIndex((i) =>
            i <= 0 ? Math.max(skills.length - 1, 0) : i - 1,
          );
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setSlashQuery(null);
          return;
        }
        if (e.key === "Enter" && skills.length > 0) {
          e.preventDefault();
          selectSkill(skills[slashIndex % skills.length]);
          return;
        }
      }
      onKeyDown(e);
    },
    [slashQuery, slashIndex, onKeyDown, selectSkill],
  );

  return (
    <div
      ref={chatContainerRef}
      className="relative box-border content-stretch flex flex-col items-start justify-center p-4 pt-3 w-full"
      style={{
        background: "var(--cg-bg-primary-sidebar)",
        borderRadius: "15px",
        border: "1px solid var(--cg-border)",
      }}
      onDragOver={(e) => onDragOver(e, disabled)}
      onDragLeave={(e) => onDragLeave(e, disabled)}
      onDrop={(e) => onDrop(e, disabled)}
    >
      {/* Drag overlay */}
      {isDragOver && <DragOver />}

      {/* Cmd menu — floats above the container, full width */}
      {showCmdMenu && !slashQuery && (
        <ChatCmdMenu
          chatInputRef={chatInputRef}
          handleFileIconClick={() => handleFileIconClick(disabled)}
          onClose={() => setShowCmdMenu(false)}
        />
      )}

      {/* Skill menu — shown when input starts with "/" */}
      {slashQuery !== null && (
        <ChatSkillMenu
          query={slashQuery}
          activeIndex={slashIndex}
          onSelect={selectSkill}
          onClose={() => setSlashQuery(null)}
          onIndexChange={setSlashIndex}
        />
      )}

      {/* Top row: server status top-right */}
      <div className="flex justify-end w-full mb-1.5">
        <ServerStatus conversationStatus={conversationStatus} />
      </div>

      <UploadedFiles />

      <ChatInputRow
        chatInputRef={chatInputRef}
        disabled={disabled}
        showButton={showButton}
        buttonClassName={buttonClassName}
        handleFileIconClick={handleFileIconClick}
        handleSubmit={handleSubmit}
        onInput={handleInputWithSlash}
        onPaste={onPaste}
        onKeyDown={handleKeyDownWithSlash}
        onFocus={onFocus}
        onBlur={onBlur}
        showCmdMenu={showCmdMenu}
        onToggleCmdMenu={() => setShowCmdMenu((v) => !v)}
        modeSlot={<ChatModeButton />}
        agentStatusSlot={
          <AgentStatus
            className="ml-1"
            handleStop={() => handleStop(onStop)}
            handleResumeAgent={handleResumeAgent}
            disabled={disabled}
          />
        }
      />
    </div>
  );
}

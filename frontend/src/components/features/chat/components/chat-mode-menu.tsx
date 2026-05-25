import React from "react";
import { HelpCircle, Cpu, ListChecks, type LucideIcon } from "lucide-react";
import { cn } from "#/utils/utils";

export type ChatMode = "autonomous" | "ask" | "plan";

const MODE_STORAGE_KEY = "cloudguard-chat-mode";

const MODES: {
  id: ChatMode;
  label: string;
  Icon: LucideIcon;
  description: string;
}[] = [
  {
    id: "ask",
    label: "Ask before commands",
    Icon: HelpCircle,
    description: "Agent will ask for approval before executing each command",
  },
  {
    id: "autonomous",
    label: "Autonomous",
    Icon: Cpu,
    description: "Agent will execute commands and edit files without asking",
  },
  {
    id: "plan",
    label: "Plan mode",
    Icon: ListChecks,
    description: "Agent will explore and present a plan before executing",
  },
];

const MODE_SHORT: Record<ChatMode, string> = {
  autonomous: "Autonomous",
  ask: "Ask before",
  plan: "Plan mode",
};

const MODE_ICON: Record<ChatMode, LucideIcon> = {
  autonomous: Cpu,
  ask: HelpCircle,
  plan: ListChecks,
};

interface ChatModeMenuProps {
  onClose: () => void;
}

function ChatModeMenu({ onClose }: ChatModeMenuProps) {
  const [mode, setMode] = React.useState<ChatMode>(() => {
    try {
      return (localStorage.getItem(MODE_STORAGE_KEY) as ChatMode) ?? "autonomous";
    } catch {
      return "autonomous";
    }
  });

  const select = (m: ChatMode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div
      className="absolute bottom-full right-0 mb-2 rounded-xl overflow-hidden z-50 w-[260px]"
      style={{
        background: "var(--cg-bg-primary-sidebar)",
        border: "1px solid var(--cg-border)",
        boxShadow: "var(--cg-shadow-dropdown)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--cg-border)" }}
      >
        <span className="text-[11px] font-semibold" style={{ color: "var(--cg-text-primary)" }}>Modes</span>
        <span className="text-[10px]" style={{ color: "var(--cg-text-muted)" }}>
          ⬆ + tab to switch
        </span>
      </div>

      {/* Options */}
      <div className="py-1">
        {MODES.map((m) => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => select(m.id)}
              className="w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors"
              style={{
                background: selected ? "var(--cg-bg-active)" : "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!selected)
                  (e.currentTarget as HTMLElement).style.background = "var(--cg-bg-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = selected
                  ? "var(--cg-bg-active)"
                  : "transparent";
              }}
            >
              {/* Icon column */}
              <span
                className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0"
                style={{
                  background: selected ? "var(--cg-bg-hover)" : "var(--cg-bg-badge)",
                  color: selected ? "var(--cg-text-primary)" : "var(--cg-text-muted)",
                }}
              >
                <m.Icon size={14} />
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium"
                  style={{ color: selected ? "var(--cg-text-primary)" : "var(--cg-text-nav)" }}
                >
                  {m.label}
                </div>
                <div
                  className="text-[11px] mt-0.5 leading-tight"
                  style={{ color: "var(--cg-text-muted)" }}
                >
                  {m.description}
                </div>
              </div>

              {/* Checkmark */}
              {selected && (
                <span className="mt-1 text-[var(--cg-text-primary)] text-xs flex-shrink-0">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Mode button (used in ChatInputActions) ─── */

export function ChatModeButton() {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<ChatMode>(() => {
    try {
      return (localStorage.getItem(MODE_STORAGE_KEY) as ChatMode) ?? "autonomous";
    } catch {
      return "autonomous";
    }
  });

  // Sync label with localStorage when menu closes
  const handleClose = () => {
    setOpen(false);
    try {
      setMode(
        (localStorage.getItem(MODE_STORAGE_KEY) as ChatMode) ?? "autonomous",
      );
    } catch {
      /* ignore */
    }
  };

  // Close on outside click
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-[4px] rounded-md text-[11px] font-medium transition-colors select-none",
          open ? "text-[var(--cg-text-primary)]" : "text-[var(--cg-text-muted)] hover:text-[var(--cg-text-nav)]",
        )}
        style={{
          background: open ? "var(--cg-bg-active)" : "transparent",
        }}
      >
        {React.createElement(MODE_ICON[mode], { size: 11 })}
        <span>{MODE_SHORT[mode]}</span>
      </button>

      {open && <ChatModeMenu onClose={handleClose} />}
    </div>
  );
}

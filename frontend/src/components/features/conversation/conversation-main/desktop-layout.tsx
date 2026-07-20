import { cn } from "#/utils/utils";
import { ChatInterfaceWrapper } from "./chat-interface-wrapper";
import { ConversationTabContent } from "../conversation-tabs/conversation-tab-content/conversation-tab-content";
import { ConversationTabs } from "../conversation-tabs/conversation-tabs";
import { ResizeHandle } from "../../../ui/resize-handle";
import { useResizablePanels } from "#/hooks/use-resizable-panels";

interface DesktopLayoutProps {
  isRightPanelShown: boolean;
}

export function DesktopLayout({ isRightPanelShown }: DesktopLayoutProps) {
  const { leftWidth, rightWidth, isDragging, containerRef, handleMouseDown } =
    useResizablePanels({
      defaultLeftWidth: 50,
      minLeftWidth: 30,
      maxLeftWidth: 80,
      storageKey: "desktop-layout-panel-width",
    });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="flex flex-1 transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          // Only apply smooth transitions when not dragging
          transitionProperty: isDragging ? "none" : "all",
        }}
      >
        {/* Left Panel (Chat) */}
        <div
          className="flex flex-col bg-base overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            width: isRightPanelShown ? `${leftWidth}%` : undefined,
            flex: isRightPanelShown ? undefined : "1 1 auto",
            transitionProperty: isDragging ? "none" : "all",
          }}
        >
          <ChatInterfaceWrapper isRightPanelShown={isRightPanelShown} />
        </div>

        {/* Resize Handle — only meaningful while the panel is expanded */}
        {isRightPanelShown && <ResizeHandle onMouseDown={handleMouseDown} />}

        {/* Right Panel — unmounted entirely when closed so nothing (not even the
            tab strip) lingers. Reopen via the panel button in the chat header. */}
        {isRightPanelShown && (
          <div
            className={cn(
              "flex flex-col h-full shrink-0 overflow-hidden",
              "border-l border-[var(--cg-border-subtle)] bg-[var(--cg-bg-sidebar)]",
            )}
            // Floor the panel width so dragging can't squeeze it past the point
            // where its content (terminal columns, tab strip) starts clipping.
            style={{ width: `${rightWidth}%`, minWidth: 460 }}
          >
            <div className="shrink-0 flex min-w-0 items-center gap-1 overflow-x-auto border-b border-[var(--cg-border-subtle)] px-3 py-2">
              <ConversationTabs />
            </div>
            <div className="flex flex-col flex-1 min-h-0 w-full">
              <ConversationTabContent />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

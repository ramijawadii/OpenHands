import { useRef, useCallback, useEffect } from "react";
import {
  isContentEmpty,
  clearEmptyContent,
  getTextContent,
} from "#/components/features/chat/utils/chat-input.utils";
import { useConversationStore } from "#/state/conversation-store";

// Custom event type fired by viewers (XlsxViewer) to append context to the chat
export interface CgAskAboutDetail { text: string }
export const CG_ASK_ABOUT_EVENT = "cg:ask-about";

/**
 * Hook for managing chat input content logic
 */
export const useChatInputLogic = () => {
  const chatInputRef = useRef<HTMLDivElement | null>(null);

  const {
    messageToSend,
    hasRightPanelToggled,
    setMessageToSend,
    setIsRightPanelShown,
  } = useConversationStore();

  // Save current input value when drawer state changes
  useEffect(() => {
    if (chatInputRef.current) {
      const currentText = getTextContent(chatInputRef.current);
      setMessageToSend(currentText);
      setIsRightPanelShown(hasRightPanelToggled);
    }
  }, [hasRightPanelToggled, setMessageToSend, setIsRightPanelShown]);

  // Listen for "ask about this" events from viewers (XlsxViewer, PDFViewer, etc.)
  // and append the context text to the chat input without replacing existing content.
  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<CgAskAboutDetail>).detail;
      const el = chatInputRef.current;
      if (!el) return;
      el.focus();
      // Move cursor to end of content, then insert the context text
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand("insertText", false, text);
    };
    window.addEventListener(CG_ASK_ABOUT_EVENT, handler);
    return () => window.removeEventListener(CG_ASK_ABOUT_EVENT, handler);
  }, [chatInputRef]);

  // Helper function to check if contentEditable is truly empty
  const checkIsContentEmpty = useCallback(
    (): boolean => isContentEmpty(chatInputRef.current),
    [],
  );

  // Helper function to properly clear contentEditable for placeholder display
  const clearEmptyContentHandler = useCallback((): void => {
    clearEmptyContent(chatInputRef.current);
  }, []);

  // Get current message text
  const getCurrentMessage = useCallback(
    (): string => getTextContent(chatInputRef.current),
    [],
  );

  return {
    chatInputRef,
    messageToSend,
    checkIsContentEmpty,
    clearEmptyContentHandler,
    getCurrentMessage,
  };
};

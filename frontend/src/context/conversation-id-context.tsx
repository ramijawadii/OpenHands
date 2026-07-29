import React from "react";

/**
 * Supplies a conversation id to subtrees that live OUTSIDE the
 * `/conversations/:conversationId` route — currently the conversation drawer
 * embedded in the explore (dashboard) views.
 *
 * `useConversationId` reads the route param FIRST and only falls back to this
 * context, so the conversation page keeps behaving exactly as before and the
 * embedded drawer can bind itself to the last active conversation.
 */
const ConversationIdContext = React.createContext<string | null>(null);

export function ConversationIdProvider({
  conversationId,
  children,
}: React.PropsWithChildren<{ conversationId: string }>) {
  return (
    <ConversationIdContext.Provider value={conversationId}>
      {children}
    </ConversationIdContext.Provider>
  );
}

export function useConversationIdContext(): string | null {
  return React.useContext(ConversationIdContext);
}

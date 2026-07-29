import { useParams } from "react-router";
import { useConversationIdContext } from "#/context/conversation-id-context";

export function useConversationId() {
  const { conversationId: routeConversationId } = useParams<{
    conversationId: string;
  }>();
  // Route param wins; the context is the fallback used by the conversation
  // drawer embedded in views that have no :conversationId of their own.
  const contextConversationId = useConversationIdContext();
  const conversationId = routeConversationId ?? contextConversationId;

  if (!conversationId) {
    throw new Error(
      "useConversationId must be used within a route that has a conversationId parameter, or inside a ConversationIdProvider",
    );
  }

  return { conversationId };
}

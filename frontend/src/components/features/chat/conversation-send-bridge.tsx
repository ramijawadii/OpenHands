import React from "react";
import { useWsClient } from "#/context/ws-client-provider";
import { createChatMessage } from "#/services/chat-service";
import { useConversationStore } from "#/state/conversation-store";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { convertImageToBase64 } from "#/utils/convert-image-to-base-64";

/**
 * The always-mounted sender for messages posted from outside the drawer.
 *
 * ## The bug this exists to fix
 *
 * The composers that live outside the conversation surface post to
 * `submittedMessage` and let one real sender do the work. That sender was
 * `InteractiveChatBox` — which lives *inside* the drawer. With the drawer
 * collapsed the drawer renders only a rail, so nothing was mounted to consume
 * the message: it sat in the store until you opened the drawer, at which point
 * everything you had typed suddenly happened at once. From the outside that
 * looked like sending did nothing.
 *
 * This bridge is mounted at layout level, so it is alive whether the drawer is
 * open, collapsed, or was never opened. The floating composer is a working
 * control on its own terms rather than a form that queues work for a panel.
 *
 * ## Why it is safe to have two senders
 *
 * It is not two. `ChatInterface` sends *its own* composer's messages directly
 * and never goes through the store; this bridge owns the store channel and is
 * its only consumer. One message, one path — the difference is which composer
 * it came from.
 *
 * The WebSocket itself comes from `WsClientProvider`, which sits above both, so
 * the socket is shared and neither path can open a second one.
 */
export function ConversationSendBridge() {
  const { send } = useWsClient();
  const { submittedMessage, setSubmittedMessage, images, clearAllFiles } =
    useConversationStore();
  const { setOptimisticUserMessage } = useOptimisticUserMessageStore();

  // The latest values, without making the effect re-run on every render.
  const latest = React.useRef({ send, images });
  latest.current = { send, images };

  React.useEffect(() => {
    if (!submittedMessage) return;

    // Claimed synchronously, before the await below. Without this a second
    // render during the image conversion would see the message still pending
    // and send it twice.
    const content = submittedMessage;
    setSubmittedMessage(null);

    const deliver = async () => {
      const { images: pending, send: sendNow } = latest.current;
      const imageUrls = await Promise.all(
        pending.map((image) => convertImageToBase64(image)),
      );

      sendNow(
        createChatMessage(content, imageUrls, [], new Date().toISOString()),
      );
      // Shows in the transcript the moment the drawer is opened, rather than
      // appearing only once the server echoes it back.
      setOptimisticUserMessage(content);
      clearAllFiles();
    };

    deliver();
  }, [
    submittedMessage,
    setSubmittedMessage,
    setOptimisticUserMessage,
    clearAllFiles,
  ]);

  return null;
}

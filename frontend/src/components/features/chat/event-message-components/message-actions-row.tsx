import React from "react";
import {
  MessageActions,
  type Reaction,
} from "#/components/tool-ui/elements/message-actions";
import { useSubmitConversationFeedback } from "#/hooks/mutation/use-submit-conversation-feedback";
import { useBatchFeedback } from "#/hooks/query/use-batch-feedback";

/** Thumbs mapped onto the server's 1-5 scale (`rating: int, ge=1, le=5`).
 *  The endpoint has no binary mode, so the extremes stand in for the reaction
 *  and anything already stored in between reads back as "no reaction". */
const RATING_UP = 5;
const RATING_DOWN = 1;

function reactionFromRating(rating?: number): Reaction {
  if (rating === undefined) return null;
  if (rating >= 4) return "up";
  if (rating <= 2) return "down";
  return null;
}

interface MessageActionsRowProps {
  /** Event this row belongs to. Feedback is stored per event id. */
  eventId?: number;
  /** Raw text copied to the clipboard — the message as the user sees it. */
  message: string;
}

/**
 * The action row under an assistant message: copy and a thumbs reaction.
 *
 * Regenerate and the overflow menu are deliberately NOT passed: there is no
 * regenerate endpoint in this product, and a button that does nothing is worse
 * than an absent one. They appear as soon as a real handler exists.
 *
 * Reaction state is read back from the batch-feedback query rather than kept
 * locally, so it survives remount and reflects what the server actually holds.
 */
export function MessageActionsRow({
  eventId,
  message,
}: MessageActionsRowProps) {
  const [copied, setCopied] = React.useState(false);
  const { mutate: submitFeedback } = useSubmitConversationFeedback();
  const { data: feedback } = useBatchFeedback();

  // The batch query only runs in saas mode, so server state is absent in OSS.
  // A local selection therefore takes precedence: without it the thumb would
  // light up and immediately forget itself everywhere except saas.
  const [localReaction, setLocalReaction] = React.useState<Reaction>(null);
  const stored =
    eventId !== undefined ? feedback?.[eventId.toString()] : undefined;
  const reaction = localReaction ?? reactionFromRating(stored?.rating);

  React.useEffect(() => {
    if (!copied) return undefined;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
  }, [message]);

  const handleReactionChange = React.useCallback(
    (next: Reaction) => {
      // Clearing a reaction has no representation on a 1-5 scale, so only a
      // positive selection is sent. Re-clicking the active thumb is a no-op
      // rather than a silently-dropped request.
      if (next === null || eventId === undefined) return;
      setLocalReaction(next);
      submitFeedback({
        rating: next === "up" ? RATING_UP : RATING_DOWN,
        eventId,
      });
    },
    [eventId, submitFeedback],
  );

  return (
    <MessageActions
      className="mt-1"
      copied={copied}
      reaction={reaction}
      onCopy={handleCopy}
      onReactionChange={handleReactionChange}
    />
  );
}

import { CircleAlert } from "lucide-react";
import { Trans } from "react-i18next";
import { Link } from "react-router";
import i18n from "#/i18n";

interface ErrorMessageBannerProps {
  message: string;
}

export function ErrorMessageBanner({ message }: ErrorMessageBannerProps) {
  return (
    /*
     * A line in the composer strip, not a red slab.
     *
     * The old treatment was a saturated red block with black text — loud
     * enough to be the most prominent thing on screen and styled unlike
     * anything else in the app. Inside the strip it only has to say what went
     * wrong: a red mark carries the severity, the words carry the message.
     */
    <div className="flex w-full items-start gap-2 text-xs leading-relaxed">
      <CircleAlert
        size={14}
        className="mt-0.5 shrink-0"
        style={{ color: "var(--cgx-critical)" }}
      />
      <span style={{ color: "var(--color-foreground)" }}>
        {i18n.exists(message) ? (
          <Trans
            i18nKey={message}
            components={{
              a: (
                <Link
                  className="underline font-bold cursor-pointer"
                  to="/settings/billing"
                >
                  link
                </Link>
              ),
            }}
          />
        ) : (
          message
        )}
      </span>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";

interface CopyToClipboardButtonProps {
  isHidden: boolean;
  isDisabled: boolean;
  onClick: () => void;
  mode: "copy" | "copied";
}

export function CopyToClipboardButton({
  isHidden,
  isDisabled,
  onClick,
  mode,
}: CopyToClipboardButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      hidden={isHidden}
      disabled={isDisabled}
      data-testid="copy-to-clipboard"
      type="button"
      onClick={onClick}
      aria-label={t(
        mode === "copy" ? I18nKey.BUTTON$COPY : I18nKey.BUTTON$COPIED,
      )}
      className="button-base p-1 cursor-pointer"
    >
      {mode === "copy" && <Copy size={15} />}
      {mode === "copied" && <Check size={15} />}
    </button>
  );
}

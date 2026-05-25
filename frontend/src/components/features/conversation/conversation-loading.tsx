import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

export function ConversationLoading() {
  const { t } = useTranslation();

  return (
    <div className="bg-[var(--cg-bg-page)] border border-[var(--cg-border-strong)] rounded-xl flex flex-col items-center justify-center h-full w-full">
      <LoaderCircle className="animate-spin w-16 h-16 text-[var(--cg-text-primary)]" />
      <span className="text-2xl font-normal leading-5 text-[var(--cg-text-primary)] p-4">
        {t(I18nKey.HOME$LOADING)}
      </span>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

export function NoRepository() {
  const { t } = useTranslation();

  return (
    <span className="text-xs text-[var(--cg-text-muted)]">
      {t(I18nKey.COMMON$NO_REPOSITORY)}
    </span>
  );
}

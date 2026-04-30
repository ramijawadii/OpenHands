import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { SettingsNavItem } from "#/constants/settings-nav";
import { Typography } from "#/ui/typography";

interface ContextMenuNavLinkProps {
  item: SettingsNavItem;
  onClick: () => void;
  disabled?: boolean;
}

export function ContextMenuNavLink({
  item,
  onClick,
  disabled,
}: ContextMenuNavLinkProps) {
  const { t } = useTranslation();
  const { to, icon, text } = item;

  if (disabled) {
    return (
      <span
        className="flex items-center gap-2 p-2 w-full text-xs opacity-40 cursor-not-allowed"
        title={t(I18nKey.SETTINGS$AGENT_DISABLED_TOOLTIP)}
      >
        {React.cloneElement(icon, {
          width: 16,
          height: 16,
          size: 16,
        } as React.SVGProps<SVGSVGElement>)}
        <Typography.Text className="text-xs">
          {t(text as I18nKey)}
        </Typography.Text>
      </span>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-white/10 hover:text-white rounded w-full text-xs"
    >
      {React.cloneElement(icon, {
        className: "text-white",
        width: 16,
        height: 16,
        size: 16,
      } as React.SVGProps<SVGSVGElement>)}
      <Typography.Text className="text-xs">
        {t(text as I18nKey)}
      </Typography.Text>
    </Link>
  );
}

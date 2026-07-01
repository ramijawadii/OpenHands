/* eslint-disable i18next/no-literal-string, no-nested-ternary -- profile menu theme/language controls */
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Sun, Moon, Monitor } from "lucide-react";
import { ContextMenu } from "#/ui/context-menu";
import { ContextMenuListItem } from "./context-menu-list-item";
import { Divider } from "#/ui/divider";
import { useClickOutsideElement } from "#/hooks/use-click-outside-element";
import { I18nKey } from "#/i18n/declaration";
import LogOutIcon from "#/icons/log-out.svg?react";
import { CLOUDGUARD_ACCOUNT_MENU } from "#/constants/settings-nav";
import { useTheme } from "#/context/theme-context";

interface AccountSettingsContextMenuProps {
  onLogout: () => void;
  onClose: () => void;
}

const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

export function AccountSettingsContextMenu({
  onLogout,
  onClose,
}: AccountSettingsContextMenuProps) {
  const ref = useClickOutsideElement<HTMLUListElement>(onClose);
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();

  const navItems = CLOUDGUARD_ACCOUNT_MENU.map((item) => ({
    ...item,
    icon: React.cloneElement(item.icon, {
      width: 16,
      height: 16,
    } as React.SVGProps<SVGSVGElement>),
  }));

  const themeBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    height: 26,
    padding: "0 8px",
    borderRadius: 6,
    fontSize: 11.5,
    textTransform: "capitalize",
    border: `1px solid ${active ? "var(--cg-accent)" : "var(--cg-border)"}`,
    background: active ? "var(--cg-accent-bg)" : "transparent",
    color: active ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
    cursor: "pointer",
  });

  return (
    <ContextMenu
      testId="account-settings-context-menu"
      ref={ref}
      alignment="right"
      className="mt-0 md:right-full md:left-full md:bottom-0 ml-0 w-[240px] z-[9999]"
    >
      {navItems.map(({ to, text, icon }) => (
        <Link key={to} to={to} className="text-decoration-none">
          <ContextMenuListItem
            onClick={() => onClose()}
            className="flex items-center gap-2 p-2 hover:bg-[var(--cg-bg-hover)] rounded h-[30px]"
          >
            {icon}
            <span className="text-[var(--cg-text-primary)] text-sm">
              {t(text)}
            </span>
          </ContextMenuListItem>
        </Link>
      ))}

      <Divider />

      {/* Theme — Light / Dark / System */}
      <li className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="text-[var(--cg-text-primary)] text-sm">Theme</span>
        <div style={{ display: "flex", gap: 3 }}>
          {(["light", "dark", "system"] as const).map((mode) => {
            const Ico =
              mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
            return (
              <button
                key={mode}
                type="button"
                title={mode}
                onClick={() => setPreference(mode)}
                style={themeBtn(preference === mode)}
              >
                <Ico size={12} />
              </button>
            );
          })}
        </div>
      </li>

      {/* Language */}
      <li className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="text-[var(--cg-text-primary)] text-sm">Language</span>
        <select
          value={i18n.language?.split("-")[0] || "en"}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          style={{
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--cg-border)",
            background: "var(--cg-input-bg, var(--cg-bg-card))",
            color: "var(--cg-text-primary)",
            fontSize: 12,
            padding: "0 6px",
          }}
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </li>

      <Divider />

      <ContextMenuListItem
        onClick={onLogout}
        className="flex items-center gap-2 p-2 hover:bg-[var(--cg-bg-hover)] rounded h-[30px]"
      >
        <LogOutIcon width={16} height={16} />
        <span className="text-[var(--cg-text-primary)] text-sm">
          {t(I18nKey.ACCOUNT_SETTINGS$LOGOUT)}
        </span>
      </ContextMenuListItem>
    </ContextMenu>
  );
}

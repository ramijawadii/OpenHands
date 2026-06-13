import { Building2, LayoutGrid, ShieldCheck, Code2 } from "lucide-react";
import CreditCardIcon from "#/icons/credit-card.svg?react";
import KeyIcon from "#/icons/key.svg?react";
import ServerProcessIcon from "#/icons/server-process.svg?react";
import SettingsGearIcon from "#/icons/settings-gear.svg?react";
import CircuitIcon from "#/icons/u-circuit.svg?react";
import PuzzlePieceIcon from "#/icons/u-puzzle-piece.svg?react";
import UserIcon from "#/icons/user.svg?react";

export interface SettingsNavItem {
  icon: React.ReactElement;
  to: string;
  text: string;
}

// CloudGuard profile-icon menu — jumps to each settings group's landing page.
export const CLOUDGUARD_ACCOUNT_MENU: SettingsNavItem[] = [
  {
    icon: <UserIcon width={22} height={22} />,
    to: "/settings/profile",
    text: "Personal Profile",
  },
  {
    icon: <Building2 size={22} />,
    to: "/settings/org",
    text: "Org Profile",
  },
  {
    icon: <LayoutGrid size={22} />,
    to: "/settings/workspace",
    text: "Workspace",
  },
  {
    icon: <ShieldCheck size={22} />,
    to: "/settings/agent-guardrails",
    text: "Security & Data",
  },
  {
    icon: <Code2 size={22} />,
    to: "/settings/service-accounts",
    text: "Developer",
  },
];

export const SAAS_NAV_ITEMS: SettingsNavItem[] = [
  {
    icon: <Building2 size={22} />,
    to: "/settings/org",
    text: "Organization",
  },
  {
    icon: <UserIcon width={22} height={22} />,
    to: "/settings/user",
    text: "SETTINGS$NAV_USER",
  },
  {
    icon: <PuzzlePieceIcon width={22} height={22} />,
    to: "/settings/integrations",
    text: "SETTINGS$NAV_INTEGRATIONS",
  },
  {
    icon: <SettingsGearIcon width={22} height={22} />,
    to: "/settings/app",
    text: "SETTINGS$NAV_APPLICATION",
  },
  {
    icon: <CircuitIcon width={22} height={22} />,
    to: "/settings",
    text: "COMMON$LANGUAGE_MODEL_LLM",
  },
  {
    icon: <CreditCardIcon width={22} height={22} />,
    to: "/settings/billing",
    text: "SETTINGS$NAV_BILLING",
  },
  {
    icon: <KeyIcon width={22} height={22} />,
    to: "/settings/secrets",
    text: "SETTINGS$NAV_SECRETS",
  },
  {
    icon: <KeyIcon width={22} height={22} />,
    to: "/settings/api-keys",
    text: "SETTINGS$NAV_API_KEYS",
  },
  {
    icon: <ServerProcessIcon width={22} height={22} />,
    to: "/settings/mcp",
    text: "SETTINGS$NAV_MCP",
  },
];

export const OSS_NAV_ITEMS: SettingsNavItem[] = [
  {
    icon: <Building2 size={22} />,
    to: "/settings/org",
    text: "Organization",
  },
  {
    icon: <CircuitIcon width={22} height={22} />,
    to: "/settings",
    text: "SETTINGS$NAV_LLM",
  },
  {
    icon: <ServerProcessIcon width={22} height={22} />,
    to: "/settings/mcp",
    text: "SETTINGS$NAV_MCP",
  },
  {
    icon: <PuzzlePieceIcon width={22} height={22} />,
    to: "/settings/integrations",
    text: "SETTINGS$NAV_INTEGRATIONS",
  },
  {
    icon: <SettingsGearIcon width={22} height={22} />,
    to: "/settings/app",
    text: "SETTINGS$NAV_APPLICATION",
  },
  {
    icon: <KeyIcon width={22} height={22} />,
    to: "/settings/secrets",
    text: "SETTINGS$NAV_SECRETS",
  },
];

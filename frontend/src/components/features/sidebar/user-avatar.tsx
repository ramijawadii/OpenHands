import { useTranslation } from "react-i18next";
import { CircleUserRound } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
// The nav is drawn in lucide; the bundled `profile.svg` was the last
// asset from the previous icon set and read as a different weight and
// corner radius from everything above it.
import { cn } from "#/utils/utils";
import { Avatar } from "./avatar";

interface UserAvatarProps {
  onClick: () => void;
  avatarUrl?: string;
  isLoading?: boolean;
}

export function UserAvatar({ onClick, avatarUrl, isLoading }: UserAvatarProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      data-testid="user-avatar"
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center cursor-pointer",
        isLoading && "bg-transparent",
      )}
      onClick={onClick}
    >
      {!isLoading && avatarUrl && <Avatar src={avatarUrl} />}
      {!isLoading && !avatarUrl && (
        <CircleUserRound
          aria-label={t(I18nKey.USER$AVATAR_PLACEHOLDER)}
          size={24}
          strokeWidth={1.5}
          className="text-[var(--cg-text-muted)]"
        />
      )}
      {isLoading && <LoadingSpinner size="small" />}
    </button>
  );
}

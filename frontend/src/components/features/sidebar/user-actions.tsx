import React from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "./user-avatar";
import { AccountSettingsContextMenu } from "../context-menu/account-settings-context-menu";
import { useShouldShowUserFeatures } from "#/hooks/use-should-show-user-features";
import { useConfig } from "#/hooks/query/use-config";

interface UserActionsProps {
  onLogout: () => void;
  user?: { avatar_url: string };
  isLoading?: boolean;
}

export function UserActions({ onLogout, user, isLoading }: UserActionsProps) {
  const [accountContextMenuIsVisible, setAccountContextMenuIsVisible] =
    React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const closeDelay = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: config } = useConfig();
  const shouldShowUserActions = useShouldShowUserFeatures();
  const isOSS = config?.APP_MODE === "oss";

  const showMenu =
    (shouldShowUserActions || isOSS) &&
    (hovered || accountContextMenuIsVisible);

  // Anchor the portal-rendered menu to the avatar's viewport rect. We size
  // the portal wrapper as a 0x0 fixed marker so the menu's own absolute
  // positioning (`left:100%; bottom:0`) lands the menu just to the right
  // of the avatar, aligned with its bottom edge — same visual as before.
  const updatePos = React.useCallback(() => {
    const r = wrapperRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom, left: r.right + 4 });
  }, []);

  React.useEffect(() => {
    if (!showMenu) return undefined;
    updatePos();
    const onChange = () => updatePos();
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [showMenu, updatePos]);

  const cancelClose = () => {
    if (closeDelay.current) {
      clearTimeout(closeDelay.current);
      closeDelay.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeDelay.current = setTimeout(() => setHovered(false), 120);
  };

  const toggleAccountMenu = () => {
    setAccountContextMenuIsVisible((prev) => !prev);
  };

  const closeAccountMenu = () => {
    setAccountContextMenuIsVisible(false);
    setHovered(false);
  };

  const handleLogout = () => {
    onLogout();
    closeAccountMenu();
  };

  return (
    <div
      data-testid="user-actions"
      ref={wrapperRef}
      className="w-8 h-8 relative cursor-pointer"
      onMouseEnter={() => {
        cancelClose();
        setHovered(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <UserAvatar
        avatarUrl={user?.avatar_url}
        onClick={toggleAccountMenu}
        isLoading={isLoading}
      />

      {showMenu &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: 0,
              height: 0,
              zIndex: 2147483647,
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <AccountSettingsContextMenu
              onLogout={handleLogout}
              onClose={closeAccountMenu}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

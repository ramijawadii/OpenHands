import { TooltipButton } from "./tooltip-button";

export function AllHandsLogoButton() {
  return (
    <TooltipButton
      tooltip="CloudGuard"
      ariaLabel="CloudGuard logo"
      navLinkTo="/"
    >
      <img
        src="/logo.png"
        alt="CloudGuard"
        width={52}
        height={52}
        style={{ objectFit: "contain" }}
      />
    </TooltipButton>
  );
}

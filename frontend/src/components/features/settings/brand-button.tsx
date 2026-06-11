import { cn } from "#/utils/utils";

interface BrandButtonProps {
  testId?: string;
  name?: string;
  variant: "primary" | "secondary" | "danger" | "ghost-danger";
  type: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  isDisabled?: boolean;
  className?: string;
  onClick?: () => void;
  startContent?: React.ReactNode;
}

export function BrandButton({
  testId,
  name,
  children,
  variant,
  type,
  isDisabled,
  className,
  onClick,
  startContent,
}: React.PropsWithChildren<BrandButtonProps>) {
  const style: React.CSSProperties | undefined = {
    primary: {
      background: "var(--cg-text-primary)",
      borderColor: "var(--cg-text-primary)",
    },
    secondary: { borderColor: "var(--cg-border)" },
    danger: undefined,
    "ghost-danger": undefined,
  }[variant];
  return (
    <button
      name={name}
      data-testid={testId}
      disabled={isDisabled}
      // The type is alreadt passed as a prop to the button component
      // eslint-disable-next-line react/button-has-type
      type={type}
      onClick={onClick}
      className={cn(
        "w-fit p-2 text-sm rounded-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 cursor-pointer",
        variant === "primary" && "text-[var(--cg-bg-card)] font-medium",
        variant === "secondary" && "border text-[var(--cg-text-nav)]",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost-danger" &&
          "bg-transparent text-red-600 underline hover:text-red-700 hover:no-underline font-medium",
        startContent && "flex items-center justify-center gap-2",
        className,
      )}
      style={style}
    >
      {startContent}
      {children}
    </button>
  );
}

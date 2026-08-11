import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#/utils/utils";

/**
 * Trimmed shadcn/ui Button.
 *
 * Only the variants the tool-ui blocks actually use are defined, and they are
 * expressed in THIS project's theme tokens (see `@theme` in tailwind.css)
 * rather than shadcn's default palette — pulling the full shadcn token set in
 * would mean a second, competing set of colour variables.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-foreground hover:bg-muted/80 border border-border",
        ghost: "hover:bg-muted/60 text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

export { buttonVariants };

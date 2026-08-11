import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#/utils/utils";

/** Trimmed shadcn/ui Badge in this project's theme tokens. */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-foreground",
        secondary: "border-border text-muted-foreground",
        destructive:
          "border-transparent bg-red-500/15 text-red-600 dark:text-red-400",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

export { badgeVariants };

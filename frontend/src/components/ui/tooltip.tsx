import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "#/utils/utils";

/** Trimmed shadcn/ui Tooltip over the Radix primitive. */

const {
  Provider: TooltipProviderPrimitive,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Portal: TooltipPortal,
} = TooltipPrimitive;

/* eslint-disable react/jsx-props-no-spreading */

function TooltipProvider({
  delayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipProviderPrimitive>) {
  return <TooltipProviderPrimitive delayDuration={delayDuration} {...props} />;
}

function Tooltip(props: React.ComponentProps<typeof TooltipRoot>) {
  // Self-providing, so a bare <Tooltip> works wherever it is dropped —
  // the data-table renders them inside cells with no provider above.
  return (
    <TooltipProvider>
      <TooltipRoot {...props} />
    </TooltipProvider>
  );
}

function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPortal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-card text-foreground border-border z-50 max-w-xs rounded-md border px-2 py-1 text-xs shadow-md",
          className,
        )}
        {...props}
      />
    </TooltipPortal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

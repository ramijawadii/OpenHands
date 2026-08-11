import * as React from "react";
import { cn } from "#/utils/utils";

/** Trimmed shadcn/ui Card, expressed in this project's theme tokens. */

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/* eslint-disable react/jsx-props-no-spreading */

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-foreground border-border flex flex-col rounded-lg border",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1 px-4 py-3", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-sm leading-none font-medium", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 pb-3", className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4 pb-3", className)}
      {...props}
    />
  );
}

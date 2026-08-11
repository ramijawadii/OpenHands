import * as React from "react";
import { cn } from "#/utils/utils";

/** Trimmed shadcn/ui Table, expressed in this project's theme tokens. */

/* eslint-disable react/jsx-props-no-spreading */

export function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      data-slot="table"
      className={cn("w-full table-fixed caption-bottom text-sm", className)}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-border/60 [&_tr]:border-b", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // No row rules: a ruled grid in a chat column reads as a
        // spreadsheet. Rows separate by hover and spacing instead.
        "hover:bg-muted/40 transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-muted-foreground h-9 px-3 text-left align-middle text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "text-foreground px-3 py-2 align-middle wrap-break-word",
        className,
      )}
      {...props}
    />
  );
}

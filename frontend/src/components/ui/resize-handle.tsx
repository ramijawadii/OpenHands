import { cn } from "#/utils/utils";

interface ResizeHandleProps {
  /** Legacy mouse start. Prefer `onPointerDown`, which supports pointer capture
   *  (and therefore dragging across iframes) as well as pen and touch. */
  onMouseDown?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  className?: string;
}

export function ResizeHandle({
  onMouseDown,
  onPointerDown,
  className,
}: ResizeHandleProps) {
  return (
    <div
      className={cn(
        "group relative w-1 bg-transparent cursor-ew-resize touch-none",
        className,
      )}
      onMouseDown={onMouseDown}
      onPointerDown={onPointerDown}
    >
      {/* Grip — the affordance that says "this divider is draggable". Without
          it the handle is an invisible 4px strip users only find by accident.
          Centred vertically so it reads at any panel height. */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 h-9 w-1 -translate-x-1/2 -translate-y-1/2",
          "rounded-full bg-[var(--cg-border-card)] transition-colors",
          "group-hover:bg-[var(--cg-accent)]",
        )}
      />

      {/* Larger hit area for easier dragging */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

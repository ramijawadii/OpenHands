/* eslint-disable i18next/no-literal-string, react/require-default-props, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- chat composer */
import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "#/utils/utils";
import { ContextRingIndicator } from "./context-ring-indicator";
import { PlanIndicatorButton } from "./plan-indicator-button";
import { PillSelect, MorphingText } from "./pill-select";
import { useExecutionMode } from "./use-execution-mode";

// ----------------------------------------------------------------------
// Transition Physics
// ----------------------------------------------------------------------
const SPRING_TRANSITION =
  "max-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
/**
 * The composer's surface, read from its own scoped palette.
 *
 * This was a hardcoded `#0a0a0a` inline style, which is exactly the wrong
 * mechanism: an inline background outranks the `.cg-composer` variables, so
 * the box stayed black in light mode however the palette was defined. Reading
 * the variable lets the theme decide — black on dark, white on light.
 */
const SURFACE = "var(--color-card)";

const SMOOTH_HEIGHT_TRANSITION =
  "max-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.15s ease-out";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
interface Attachment {
  id: string;
  file: File;
  url: string;
  name: string;
  width?: number;
  height?: number;
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

/**
 * Execution mode, marked by how much the agent may do unattended.
 *
 * The glyph escalates with autonomy — a hand for Manual, a pencil for Edit
 * auto, a list for Plan, a spark for Autonomous — because the mode decides
 * what runs without asking, and that is worth reading at a glance rather than
 * only in the label beside it.
 */
function ModeIcon({ mode, className }: { mode: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    Manual: (
      <path
        d="M7 2.5v5M4.5 4.5v3M9.5 4.5v3M2.5 6.5v2a4.5 4.5 0 0 0 9 0v-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    ),
    "Edit auto": (
      <path
        d="M9.5 2.5l2 2-6 6-2.5.5.5-2.5 6-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    Plan: (
      <path
        d="M3 3.5h8M3 7h8M3 10.5h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    ),
    Autonomous: (
      <path
        d="M7 1.5l1.4 3.6 3.6 1.4-3.6 1.4L7 11.5 5.6 7.9 2 6.5l3.6-1.4L7 1.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  };

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={className}
      aria-hidden="true"
    >
      {paths[mode] ?? paths.Manual}
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Stop. A filled square, the universal transport glyph — deliberately not a
 * cross, which reads as "dismiss this" rather than "halt the work".
 */
function StopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0" y="0" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 2.5V11.5M2.5 7H11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 2.5L11.5 11.5M11.5 2.5L2.5 11.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DynamicBarsIcon({ level }: { level: string }) {
  const isMediumOrHigh = level === "Medium" || level === "Max Effort";
  const isHigh = level === "Max Effort";

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="8"
        width="2.5"
        height="4.5"
        rx="1"
        fill="currentColor"
        className="transition-opacity duration-300"
        opacity={1}
      />
      <rect
        x="5.75"
        y="5"
        width="2.5"
        height="7.5"
        rx="1"
        fill="currentColor"
        className="transition-opacity duration-300"
        opacity={isMediumOrHigh ? 1 : 0.3}
      />
      <rect
        x="10"
        y="2"
        width="2.5"
        height="10.5"
        rx="1"
        fill="currentColor"
        className="transition-opacity duration-300"
        opacity={isHigh ? 1 : 0.3}
      />
    </svg>
  );
}

// ----------------------------------------------------------------------
// Attachment Thumbnail
// ----------------------------------------------------------------------
function AttachmentThumb({
  attachment,
  index,
  onRemove,
  onOpen,
  registerRef,
}: {
  attachment: Attachment;
  index: number;
  onRemove: (id: string) => void;
  onOpen: (attachment: Attachment, rect: DOMRect) => void;
  registerRef: (id: string, el: HTMLButtonElement | null) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={(el) => {
        btnRef.current = el;
        registerRef(attachment.id, el);
      }}
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (btnRef.current)
          onOpen(attachment, btnRef.current.getBoundingClientRect());
      }}
      style={{
        animationDelay: `${index * 35}ms`,
        animationFillMode: "backwards",
      }}
      className={cn(
        "group relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted outline-none",
        "transition-transform duration-200 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-[1.04] active:scale-[0.96]",
        "prompt-thumb-in",
      )}
      aria-label={`Open preview of ${attachment.name}`}
    >
      <img
        src={attachment.url}
        alt={attachment.name}
        className="size-full object-cover"
        draggable={false}
      />
      <span
        className={cn(
          "absolute inset-0 flex items-start justify-end bg-black/0 transition-colors duration-200",
          isHovered && "bg-black/25",
        )}
      >
        <span
          role="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(attachment.id);
          }}
          className={cn(
            "m-1 flex size-4 items-center justify-center rounded-full bg-background/90 text-foreground/70 shadow-sm transition-all duration-200 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:bg-background hover:text-foreground hover:scale-110",
            isHovered
              ? "opacity-100 scale-100"
              : "opacity-0 scale-50 pointer-events-none",
          )}
          aria-label={`Remove ${attachment.name}`}
        >
          <CloseIcon />
        </span>
      </span>
    </button>
  );
}

// ----------------------------------------------------------------------
// Shared-Element Gallery Modal
// ----------------------------------------------------------------------
function AttachmentGalleryModal({
  attachment,
  originRect,
  onClose,
}: {
  attachment: Attachment;
  originRect: DOMRect;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    radius: number;
  } | null>(null);

  useEffect(() => {
    const maxW = Math.min(window.innerWidth * 0.86, 560);
    const maxH = Math.min(window.innerHeight * 0.78, 720);

    const naturalW = attachment.width || 800;
    const naturalH = attachment.height || 600;
    const scale = Math.min(maxW / naturalW, maxH / naturalH, 1.6);

    const width = naturalW * scale;
    const height = naturalH * scale;

    setTargetRect({
      top: (window.innerHeight - height) / 2,
      left: (window.innerWidth - width) / 2,
      width,
      height,
      radius: 20,
    });

    const raf = requestAnimationFrame(() => setPhase("open"));
    return () => cancelAnimationFrame(raf);
  }, [attachment]);

  const handleClose = useCallback(() => setPhase("closing"), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const isOpen = phase === "open";
  const isClosing = phase === "closing";

  const geometry =
    isOpen && targetRect
      ? targetRect
      : {
          top: originRect.top,
          left: originRect.left,
          width: originRect.width,
          height: originRect.height,
          radius: 12,
        };

  const animEasing = isClosing
    ? "ease-out"
    : "cubic-bezier(0.175, 0.885, 0.32, 1.275)";
  const animDur = isClosing ? "0.3s" : "0.45s";
  const flipTransition = `top ${animDur} ${animEasing}, left ${animDur} ${animEasing}, width ${animDur} ${animEasing}, height ${animDur} ${animEasing}, border-radius ${animDur} ${animEasing}`;

  return (
    <div
      className="fixed inset-0 z-[100]"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md transition-opacity duration-400"
        style={{ opacity: isOpen ? 1 : 0 }}
      />
      <div
        style={{
          position: "fixed",
          top: geometry.top,
          left: geometry.left,
          width: geometry.width,
          height: geometry.height,
          borderRadius: geometry.radius,
          transition: flipTransition,
          overflow: "hidden",
          boxShadow: isOpen
            ? "0 24px 60px -12px rgb(0 0 0 / 0.35)"
            : "0 0px 0px 0px rgb(0 0 0 / 0)",
        }}
        className="bg-muted"
        onTransitionEnd={() => {
          if (phase === "closing") onClose();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="size-full object-cover"
          draggable={false}
        />
      </div>

      <button
        type="button"
        onClick={handleClose}
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1)" : "scale(0.7)",
        }}
        className={cn(
          "fixed right-4 top-4 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground/70 shadow-md backdrop-blur-sm",
          "transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:bg-card hover:text-foreground",
          !isOpen && "pointer-events-none",
        )}
        aria-label="Close preview"
      >
        <span className="scale-150">
          <CloseIcon />
        </span>
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export interface PromptInputProps {
  onSubmit?: (
    value: string,
    meta: { mode: string; effort: string; attachments: File[] },
  ) => void;
  placeholder?: string;
  className?: string;
  modes?: string[];
  efforts?: string[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  maxAttachments?: number;
  /**
   * Start open. The Chat tab is a dedicated conversation surface, so the
   * composer arriving collapsed there costs a click for no information —
   * everywhere else it stays compact until used.
   */
  defaultExpanded?: boolean;
  /**
   * Where the composer is sitting, shown inside the box as `@Name`.
   *
   * Rendered in the action row rather than floating above the card: a chip
   * hovering over the top edge reads as a notification about the composer,
   * not as part of it.
   */
  tag?: string;
  /**
   * Content for the strip that rises from behind the card — the same place
   * attachments appear.
   *
   * Interruptions about the message you are composing belong on the message
   * you are composing, not stacked above the whole conversation where they
   * compete with the transcript.
   */
  banner?: React.ReactNode;
  /** The agent is working, so the send control becomes a stop control. */
  busy?: boolean;
  /** Cancel the run. Must take effect in the UI immediately. */
  onStop?: () => void;
}

export const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      onSubmit,
      placeholder = "Ask anything",
      className,
      modes = ["Manual", "Edit auto", "Plan", "Autonomous"],
      efforts = ["Low", "Medium", "Max Effort"],
      defaultValue = "",
      value: controlledValue,
      onChange,
      maxAttachments = 6,
      defaultExpanded = false,
      tag,
      banner,
      busy = false,
      onStop,
    },
    ref,
  ) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [isSmoothResize, setIsSmoothResize] = useState(false);
    const [localValue, setLocalValue] = useState(defaultValue);
    /*
      The mode pill is the backend's execution mode, not a local preference —
      see use-execution-mode.ts. `modes[0]` is only the value shown until the
      backend answers with the posture it is actually running under.
    */
    const { label: selectedMode, change: setSelectedMode } = useExecutionMode(
      modes[0],
    );
    const [effortIndex, setEffortIndex] = useState(1);

    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [activeAttachment, setActiveAttachment] = useState<{
      attachment: Attachment;
      rect: DOMRect;
    } | null>(null);

    const valueRef = useRef(
      controlledValue !== undefined ? controlledValue : localValue,
    );

    const [containerHeight, setContainerHeight] = useState(116);
    const [textareaHeight, setTextareaHeight] = useState(68);
    const [isScrolling, setIsScrolling] = useState(false);

    const modeOptions = React.useMemo(
      () => modes.map((m) => ({ value: m, label: m })),
      [modes],
    );

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : localValue;
    const hasValue = value.trim() !== "" || attachments.length > 0;
    const hasAttachments = attachments.length > 0;
    /*
     * Whether the banner slot actually has anything in it.
     *
     * The caller passes a fragment holding a stack of self-gating banners, so
     * the prop is truthy even when every one of them renders null. Measuring
     * the wrapper is the only honest test — otherwise the strip would sit
     * permanently open around 24px of padding and the composer would never
     * collapse again.
     */
    const [bannerHeight, setBannerHeight] = useState(0);
    const hasBanner = bannerHeight > 0;
    const stripOpen = hasAttachments || hasBanner;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const internalContainerRef = useRef<HTMLDivElement | null>(null);
    const topFadeRef = useRef<HTMLDivElement>(null);
    const bottomFadeRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const thumbRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
    const stripRef = useRef<HTMLDivElement | null>(null);
    const bannerRef = useRef<HTMLDivElement | null>(null);
    /*
     * The strip sizes to its contents rather than to a constant.
     *
     * It used to be 68px for thumbnails and 108px for a banner, which was
     * already two magic numbers and would have become one per banner type as
     * more moved in — a queued-turns list is as tall as its queue. Measuring
     * means the animation stays a real height transition (so it still springs)
     * without anyone maintaining the table.
     */
    const [stripHeight, setStripHeight] = useState(68);

    useEffect(() => {
      const el = stripRef.current;
      const inner = bannerRef.current;
      if (!el) return undefined;
      const measure = () => {
        setStripHeight(Math.ceil(el.getBoundingClientRect().height));
        setBannerHeight(
          inner ? Math.ceil(inner.getBoundingClientRect().height) : 0,
        );
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      if (inner) ro.observe(inner);
      return () => ro.disconnect();
    }, [banner, attachments.length]);

    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    const updateFades = () => {
      const el = textareaRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (topFadeRef.current)
        topFadeRef.current.style.opacity = Math.min(
          scrollTop / 20,
          1,
        ).toString();
      if (bottomFadeRef.current) {
        const bottomScroll = scrollHeight - clientHeight - scrollTop;
        bottomFadeRef.current.style.opacity = Math.min(
          Math.max(bottomScroll - 16, 0) / 10,
          1,
        ).toString();
      }
    };

    const handleValueChange = useCallback(
      (val: string) => {
        setIsSmoothResize(true);
        if (!isControlled) setLocalValue(val);
        onChange?.(val);
      },
      [isControlled, onChange],
    );

    const expand = () => {
      setIsSmoothResize(false);
      setExpanded(true);
    };

    useEffect(
      () => () => {
        attachments.forEach((a) => URL.revokeObjectURL(a.url));
      },
      [attachments],
    );

    useEffect(() => {
      if ((value.trim() !== "" || hasAttachments || hasBanner) && !expanded) {
        setIsSmoothResize(false);
        setExpanded(true);
      }
    }, [value, expanded, hasAttachments, hasBanner]);

    useEffect(() => {
      if (expanded) {
        const timer = setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const { length } = textareaRef.current.value;
            textareaRef.current.setSelectionRange(length, length);
          }
        }, 50);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [expanded]);

    useEffect(() => {
      if (!textareaRef.current) return;
      const el = textareaRef.current;

      const currentHeight = el.style.height;
      el.style.transition = "none";
      el.style.height = "0px";
      const { scrollHeight } = el;
      el.style.height = currentHeight;
      // Force a reflow so the browser applies the reset height before the
      // measured one — without it the transition is skipped.
      el.getBoundingClientRect();
      el.style.transition = "";

      const newHeight = Math.max(68, Math.min(scrollHeight, 160));
      el.style.height = `${newHeight}px`;

      setTextareaHeight(newHeight);
      setIsScrolling(scrollHeight > 160);

      setTimeout(updateFades, 0);
    }, [value, expanded]);

    useEffect(() => {
      setContainerHeight(Math.max(116, textareaHeight + 48));
      setTimeout(updateFades, 0);
    }, [textareaHeight]);

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      if (
        internalContainerRef.current &&
        internalContainerRef.current.contains(e.relatedTarget as Node)
      )
        return;
      // Pinned open on its own tab, and pinned open whenever the strip is
      // carrying something: collapsing to a 48px pill under a banner that asks
      // a question leaves the question floating over nothing.
      if (defaultExpanded || hasBanner) return;
      if (value.trim() === "" && !hasAttachments) {
        setIsSmoothResize(false);
        setExpanded(false);
      }
    };

    const handleSubmit = () => {
      if (value.trim() === "" && !hasAttachments) return;
      setIsSmoothResize(false);
      onSubmit?.(value, {
        mode: selectedMode,
        effort: efforts[effortIndex],
        attachments: attachments.map((a) => a.file),
      });
      handleValueChange("");
      attachments.forEach((a) => URL.revokeObjectURL(a.url));
      setAttachments([]);
      setExpanded(false);
    };

    const cycleEffort = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEffortIndex((prev) => (prev + 1) % efforts.length);
    };

    const openFileChooser = (e: React.MouseEvent) => {
      e.stopPropagation();
      fileInputRef.current?.click();
    };

    const addAttachment = (
      file: File,
      url: string,
      width: number,
      height: number,
    ) => {
      const id = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
      setAttachments((prev) => [
        ...prev,
        { id, file, url, name: file.name, width, height },
      ]);
    };

    const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      const input = e.target;
      input.value = "";

      if (files.length === 0) return;
      const room = Math.max(0, maxAttachments - attachments.length);
      const accepted = files.slice(0, room);

      if (!expanded) {
        setIsSmoothResize(false);
        setExpanded(true);
      } else {
        setIsSmoothResize(true);
      }

      accepted.forEach((file) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () =>
          addAttachment(file, url, img.naturalWidth, img.naturalHeight);
        img.onerror = () => addAttachment(file, url, 800, 600);
        img.src = url;
      });
    };

    const removeAttachment = (id: string) => {
      setIsSmoothResize(true);
      setAttachments((prev) => {
        const target = prev.find((a) => a.id === id);
        if (target) URL.revokeObjectURL(target.url);
        return prev.filter((a) => a.id !== id);
      });
      thumbRefs.current.delete(id);
    };

    const onActionButtonClick = (e: React.MouseEvent) => {
      e.preventDefault();
      handleSubmit();
    };

    return (
      <>
        <div
          ref={(node) => {
            if (typeof ref === "function") ref(node);
            else if (ref) {
              const box = ref as React.MutableRefObject<HTMLDivElement | null>;
              box.current = node;
            }
            internalContainerRef.current = node;
          }}
          onBlur={handleBlur}
          className={cn("cg-composer relative flex flex-col w-full", className)}
          style={{
            maxWidth: expanded ? 480 : 320,
            transition: isSmoothResize
              ? "max-width 0.15s ease-out"
              : "max-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesChosen}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* Independent Attachment Tab (slides up from behind the input) */}
          <div
            aria-hidden={!stripOpen}
            style={{
              height: stripOpen ? stripHeight : 0,
              transition: isSmoothResize
                ? "height 0.15s ease-out"
                : "height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
            className="w-full relative z-0 overflow-hidden"
          >
            <div
              ref={stripRef}
              style={{
                position: "absolute",
                bottom: -8,
                left: 20,
                right: 20,
                transform: stripOpen ? "translateY(0)" : "translateY(100%)",
                opacity: stripOpen ? 1 : 0,
                transition: isSmoothResize
                  ? "transform 0.15s ease-out, opacity 0.15s ease-out"
                  : "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-out",
              }}
              /*
                No surface of its own.

                The strip used to be a `bg-muted` slab with a border and
                rounded top, sliding out from behind the composer. Because it
                is absolutely positioned inside an `overflow-hidden` wrapper,
                what you actually saw was a coloured band clipped mid-way — a
                shape that belonged to no component. Every banner that rides
                this strip already draws its own card, so the strip only needs
                to be a transparent stack.
              */
              className="px-3 pt-2.5 pb-3.5 flex flex-col items-stretch gap-2 overflow-x-auto prompt-scrollbar"
            >
              <div ref={bannerRef} className="flex flex-col gap-2">
                {banner}
              </div>
              {hasAttachments && (
                <div className="flex items-start gap-2">
                  {attachments.map((attachment, index) => (
                    <AttachmentThumb
                      key={attachment.id}
                      attachment={attachment}
                      index={index}
                      onRemove={removeAttachment}
                      onOpen={(a, rect) =>
                        setActiveAttachment({ attachment: a, rect })
                      }
                      registerRef={(id, el) => thumbRefs.current.set(id, el)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Input Card */}
          <div
            onMouseDown={(e) => {
              const isTextarea = e.target === textareaRef.current;
              if (expanded && !isTextarea) {
                e.preventDefault();
                textareaRef.current?.focus();
              }
            }}
            style={{
              borderRadius: 24,
              height: expanded ? containerHeight : 48,
              transition: isSmoothResize
                ? SMOOTH_HEIGHT_TRANSITION
                : SPRING_TRANSITION,
              overflow: expanded ? "visible" : "hidden",
              // Fixed surface rather than a token: the composer is meant to sit
              // a shade below the page rather than track it.
              background: SURFACE,
            }}
            className={cn(
              // Focus reads as a neutral lift, not an accent. A blue ring on a
              // permanently-focused composer is a standing highlight competing
              // with everything the agent is actually saying above it.
              // Always outlined. The borderless treatment was fine when the
              // transcript sat on a lighter ground, but with the whole drawer
              // unified at #121212 the box had no edge at all — it read as a
              // hole in the panel rather than as an input.
              "relative w-full shadow-sm z-10 border border-border",
              !defaultExpanded &&
                "focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-600/40 hover:border-border/80",
              expanded ? "cursor-text" : "cursor-default",
            )}
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => handleValueChange(e.target.value)}
              onScroll={updateFades}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (
                  e.key === "Escape" &&
                  value.trim() === "" &&
                  !hasAttachments &&
                  !defaultExpanded &&
                  !hasBanner
                ) {
                  setIsSmoothResize(false);
                  setExpanded(false);
                }
              }}
              placeholder={placeholder}
              aria-label="Prompt"
              style={{
                transition: isSmoothResize
                  ? "height 0.15s ease-out"
                  : "opacity 0.3s ease-out, transform 0.3s ease-out, height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              }}
              className={cn(
                "prompt-scrollbar absolute top-0 inset-x-0 z-[1] w-full resize-none bg-transparent pl-4 pr-12 py-3.5 text-sm leading-[22px] text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground/80 cursor-text",
                expanded
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-1 pointer-events-none",
                isScrolling ? "overflow-y-auto" : "overflow-y-hidden",
              )}
            />

            <div
              ref={topFadeRef}
              className="absolute left-4 right-12 top-0 z-[2] h-8 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to bottom, ${SURFACE}, transparent)`,
              }}
            />
            <div
              ref={bottomFadeRef}
              className="absolute left-4 right-12 z-[2] h-8 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to top, ${SURFACE}, transparent)`,
                opacity: 0,
                top: `${textareaHeight - 32}px`,
                transition: isSmoothResize
                  ? "top 0.15s ease-out"
                  : "top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              }}
            />

            <button
              type="button"
              onClick={expand}
              style={{
                transition: isSmoothResize
                  ? "none"
                  : "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              }}
              className={cn(
                "absolute inset-x-0 top-0 z-[1] cursor-text pl-4 pr-12 py-[15px] text-left text-sm font-medium leading-[17px] text-muted-foreground/80 outline-none",
                !expanded
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-105 translate-y-1 pointer-events-none",
              )}
              aria-label="Open prompt input"
            >
              {placeholder}
            </button>

            {/* Bottom actions — hidden while recording to make room for the visualiser */}
            <div
              className={cn(
                "absolute bottom-2 left-3 right-12 z-[10] flex items-center gap-0 transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                expanded
                  ? "opacity-100 blur-0 translate-y-0 pointer-events-auto"
                  : "opacity-0 blur-sm translate-y-2 pointer-events-none",
              )}
            >
              <PillSelect
                value={selectedMode}
                options={modeOptions}
                onChange={setSelectedMode}
                ariaLabel="Execution mode"
                disabled={!expanded}
                placement="top"
                width={176}
                renderIcon={(v, iconClass) => (
                  <ModeIcon mode={v} className={iconClass} />
                )}
              />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={cycleEffort}
                className="group flex items-center gap-1 rounded-full px-2 py-1 text-foreground transition-all duration-200 hover:bg-accent/60 outline-none cursor-default"
                aria-label={`Effort: ${efforts[effortIndex]}`}
              >
                <DynamicBarsIcon level={efforts[effortIndex]} />
                <span className="text-xs font-semibold select-none transition-colors">
                  <MorphingText text={efforts[effortIndex]} />
                </span>
              </button>

              {/* The plan indicator. It appears only once a plan exists, so the
                  row is unchanged for a conversation that never invoked one,
                  and it opens the task list on the banner strip rather than
                  pushing a second panel into the transcript. */}
              <PlanIndicatorButton />

              {/* Where you are, in the same shape as the mode control so the
                  row reads as one set of chips rather than a control strip
                  with a label bolted on. */}
              {tag ? (
                <span
                  title={tag}
                  className="ml-auto max-w-[46%] truncate rounded-full px-2 py-1 text-xs font-semibold text-foreground select-none"
                >
                  @{tag}
                </span>
              ) : (
                <span className="ml-auto" />
              )}

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={openFileChooser}
                disabled={attachments.length >= maxAttachments}
                className="ml-1 flex size-7 items-center justify-center rounded-full text-foreground transition-all duration-200 hover:bg-accent/60 outline-none cursor-default disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Attach images"
              >
                <PlusIcon />
              </button>

              {/* Context pressure. Sits at the end of the action row rather
                  than beside the send button, so it reads as status about the
                  conversation rather than a control on the message. */}
              <span className="flex items-center">
                <ContextRingIndicator />
              </span>
            </div>

            {/*
              One control, two jobs. While the agent is working the send button
              IS the stop button: the thing you want at that moment is under the
              cursor you just clicked with, rather than somewhere else in the
              chrome. It is never disabled while busy — a stop you cannot press
              is the one case where a disabled control is unacceptable.
            */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={busy ? onStop : onActionButtonClick}
              aria-label={busy ? "Stop the agent" : "Send prompt"}
              title={busy ? "Stop" : undefined}
              disabled={busy ? false : !hasValue}
              style={{ borderRadius: 9999 }}
              className="absolute right-2 bottom-2 z-[10] flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground transition-all duration-300 hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-default disabled:opacity-40 disabled:pointer-events-none"
            >
              {busy ? <StopIcon /> : <ArrowUpIcon />}
            </button>
          </div>
        </div>

        {activeAttachment && (
          <AttachmentGalleryModal
            attachment={activeAttachment.attachment}
            originRect={activeAttachment.rect}
            onClose={() => setActiveAttachment(null)}
          />
        )}
      </>
    );
  },
);

PromptInput.displayName = "PromptInput";

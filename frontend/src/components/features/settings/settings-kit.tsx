/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard settings UI kit (mock, local-state) */
import React from "react";
import { Link } from "react-router";

/**
 * Shared settings UI kit — one source of truth for the cross-cutting B2B-UX patterns:
 * role context, scope clarity, safe destructive actions, empty states, dirty-state save bar,
 * accessible toggle, and an undo toast host. All styling uses the --cg-* CSS vars so it
 * matches every settings tab.
 */

export const K = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  danger: "var(--cg-danger)",
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

// ── Current user role (mock; later from auth/rbac) ───────────────────────────
export type Role = "Admin" | "Security Engineer" | "Analyst" | "Viewer";
const ROLE_RANK: Record<Role, number> = {
  Viewer: 0,
  Analyst: 1,
  "Security Engineer": 2,
  Admin: 3,
};

export function useCurrentRole(): Role {
  // Mock: persisted so you can demo RBAC by changing it. Defaults to Admin.
  const [role] = React.useState<Role>(() => {
    try {
      return (localStorage.getItem("cg_current_role") as Role) || "Admin";
    } catch {
      return "Admin";
    }
  });
  return role;
}

/** True if the current role meets the required minimum. */
export function roleMeets(current: Role, required: Role): boolean {
  return ROLE_RANK[current] >= ROLE_RANK[required];
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Dialog accessibility: Esc to close, focus trap, restore focus on close, scroll lock. */
export function useDialogA11y(open: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && node) {
        const items = Array.from(
          node.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

/** Loading placeholder block. */
export function Skeleton({
  width,
  height,
  radius,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
}) {
  return (
    <span
      className="cg-skel"
      style={{
        display: "inline-block",
        width: width ?? "100%",
        height: height ?? 14,
        borderRadius: radius ?? 6,
      }}
    />
  );
}

/** Light preloader card for live data points (shown while a query is loading). */
export function LiveCardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div
      style={{
        background: "var(--cg-bg-card)",
        border: "1px solid var(--cg-border)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <Skeleton width={160} height={13} />
      {Array.from({ length: lines }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Skeleton key={i} width={`${85 - i * 12}%`} height={11} />
      ))}
    </div>
  );
}

export function RoleChip({ role }: { role: Role }) {
  const color =
    role === "Admin" ? K.purple : role === "Viewer" ? K.textMuted : K.accent;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 10px",
        borderRadius: 99,
        fontSize: 12,
        color,
        background: K.badgeBg,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: color }}
      />
      Your role: {role}
    </span>
  );
}

// ── Scope clarity ────────────────────────────────────────────────────────────
export function ScopeBadge({
  scope,
}: {
  scope: "You" | "This workspace" | "Organization";
}) {
  const map = {
    You: K.accent,
    "This workspace": K.success,
    Organization: K.purple,
  } as const;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        color: map[scope],
        background: K.badgeBg,
        whiteSpace: "nowrap",
      }}
    >
      Applies to: {scope}
    </span>
  );
}

// ── Cross-surface "Related" links ────────────────────────────────────────────
// One control where the same concept is managed/observed in more than one place
// (e.g. a policy edited in Settings is enforced+observed live in the Agent
// Control Plane, or the audit ledger appears in both). Client-side nav (Link).
export function RelatedLinks({
  label = "Related",
  items,
}: {
  label?: string;
  items: [string, string][];
}) {
  if (!items.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 14,
        fontSize: 12,
      }}
    >
      <span style={{ color: K.textMuted }}>{label}:</span>
      {items.map(([text, to]) => (
        <Link
          key={to}
          to={to}
          style={{
            color: K.accent,
            textDecoration: "none",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {text} →
        </Link>
      ))}
    </div>
  );
}

// ── Accessible toggle (button + role=switch) ─────────────────────────────────
export function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        background: on ? K.accent : "var(--cg-toggle-off)",
        position: "relative",
        padding: 0,
        opacity: disabled ? 0.5 : 1,
        transition: "background 120ms ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 14 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: K.textPrimary,
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  hint,
  cta,
  onCta,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div
      style={{
        border: `1px dashed ${K.borderStrong}`,
        borderRadius: 10,
        padding: "36px 24px",
        textAlign: "center",
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            justifyContent: "center",
            color: K.textMuted,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 14, color: K.textSecondary, fontWeight: 500 }}>
        {title}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 12.5,
            color: K.textMuted,
            marginTop: 6,
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          style={{
            marginTop: 16,
            height: 34,
            padding: "0 14px",
            borderRadius: 6,
            background: "var(--cg-text-primary)",
            color: "var(--cg-bg-card)",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

// ── Confirm dialog for destructive actions (optional type-to-confirm) ─────────
export function ConfirmButton({
  label,
  title,
  body,
  confirmLabel,
  confirmWord,
  onConfirm,
  disabled,
  disabledReason,
  variant = "danger",
  style,
}: {
  label: React.ReactNode;
  title: string;
  body: string;
  confirmLabel?: string;
  confirmWord?: string; // if set, user must type it
  onConfirm: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: "danger" | "link" | "ghost";
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const ok = !confirmWord || typed.trim() === confirmWord;
  const dialogRef = useDialogA11y(open, () => setOpen(false));

  const base: React.CSSProperties =
    variant === "link"
      ? {
          background: "none",
          border: "none",
          color: disabled ? K.textMuted : K.danger,
          fontSize: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          padding: 0,
          opacity: disabled ? 0.5 : 1,
        }
      : variant === "ghost"
        ? {
            height: 34,
            padding: "0 14px",
            borderRadius: 6,
            background: "transparent",
            border: `1px solid rgba(224,82,82,0.4)`,
            color: K.danger,
            fontSize: 13,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }
        : {
            height: 34,
            padding: "0 14px",
            borderRadius: 6,
            background: K.danger,
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          };

  return (
    <>
      <button
        type="button"
        title={disabled ? disabledReason : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{ ...base, ...style }}
      >
        {label}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            style={{
              width: 440,
              maxWidth: "92vw",
              background: K.cardBg,
              border: `1px solid ${K.borderStrong}`,
              borderRadius: 12,
              padding: 24,
              outline: "none",
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: K.textPrimary,
                margin: 0,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: K.textMuted,
                marginTop: 8,
                marginBottom: 0,
                lineHeight: 1.5,
              }}
            >
              {body}
            </p>
            {confirmWord && (
              <div style={{ marginTop: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: K.textMuted,
                    marginBottom: 6,
                  }}
                >
                  Type{" "}
                  <strong style={{ color: K.textSecondary }}>
                    {confirmWord}
                  </strong>{" "}
                  to confirm
                </label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    background: K.inputBg,
                    border: `1px solid ${K.border}`,
                    borderRadius: 6,
                    color: K.textPrimary,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${K.borderStrong}`,
                  color: K.textSecondary,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!ok}
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                  setTyped("");
                }}
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 6,
                  background: K.danger,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: ok ? "pointer" : "not-allowed",
                  opacity: ok ? 1 : 0.5,
                }}
              >
                {confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sticky dirty-state save bar ──────────────────────────────────────────────
export function SaveBar({
  dirty,
  onSave,
  onDiscard,
  saving,
  savedAt,
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean;
  savedAt?: number;
}) {
  const showSaved = !dirty && savedAt && Date.now() - savedAt < 2500;
  if (!dirty && !showSaved) return null;
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        marginTop: 28,
        padding: "12px 16px",
        background: K.cardBg,
        border: `1px solid ${K.borderStrong}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.25)",
      }}
    >
      <span
        style={{ fontSize: 13, color: showSaved ? K.success : K.textSecondary }}
      >
        {showSaved ? "All changes saved ✓" : "You have unsaved changes"}
      </span>
      {dirty && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onDiscard}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${K.borderStrong}`,
              color: K.textSecondary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              height: 34,
              padding: "0 16px",
              borderRadius: 6,
              background: "var(--cg-text-primary)",
              color: "var(--cg-bg-card)",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Undo toast host ──────────────────────────────────────────────────────────
export function useUndoToast() {
  const [toast, setToast] = React.useState<{
    msg: string;
    onUndo?: () => void;
  } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (msg: string, onUndo?: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, onUndo });
    timer.current = setTimeout(() => setToast(null), 6000);
  };
  const node = toast ? (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: K.cardBg,
        border: `1px solid ${K.borderStrong}`,
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontSize: 13,
        color: K.textSecondary,
        zIndex: 1200,
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
      }}
    >
      <span>{toast.msg}</span>
      {toast.onUndo && (
        <button
          type="button"
          onClick={() => {
            toast.onUndo?.();
            setToast(null);
          }}
          style={{
            background: "none",
            border: "none",
            color: K.accent,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Undo
        </button>
      )}
    </div>
  ) : null;
  return { show, node };
}

/** Hook to track a form's dirty state against a baseline snapshot. */
export function useDirty<T>(value: T): {
  dirty: boolean;
  baseline: T;
  reset: (v?: T) => void;
} {
  const [baseline, setBaseline] = React.useState<T>(value);
  const dirty = JSON.stringify(value) !== JSON.stringify(baseline);
  return { dirty, baseline, reset: (v?: T) => setBaseline(v ?? value) };
}

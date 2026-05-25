import { CSSProperties } from "react";
import toast, { ToastOptions } from "react-hot-toast";
import { calculateToastDuration } from "./toast-duration";

const TOAST_STYLE: CSSProperties = {
  background: "var(--cg-bg-card)",
  border: "1px solid var(--cg-border-strong)",
  color: "var(--cg-text-primary)",
  borderRadius: "4px",
};

export const TOAST_OPTIONS: ToastOptions = {
  position: "top-right",
  style: TOAST_STYLE,
};

export const displayErrorToast = (error: string) => {
  const duration = calculateToastDuration(error, 4000);
  toast.error(error, { ...TOAST_OPTIONS, duration });
};

export const displaySuccessToast = (message: string) => {
  const duration = calculateToastDuration(message, 5000);
  toast.success(message, { ...TOAST_OPTIONS, duration });
};

/* eslint-disable i18next/no-literal-string */
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * TabErrorBoundary — shell blast-radius containment (FAIL_SAFE_ISOLATION_SPEC §4
 * Gap 1). A render/runtime error inside one drawer tab must degrade ONLY that tab,
 * not white-screen the whole SPA. Each tab is wrapped in its own boundary; the
 * others (and chat/nav) keep working. "Reload tab" resets the boundary and
 * remounts the tab's component from scratch.
 */
interface Props {
  name: string;
  children: React.ReactNode;
}
interface State {
  failed: boolean;
  message?: string;
}

export class TabErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      failed: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    const { name } = this.props;
    // eslint-disable-next-line no-console
    console.error(
      `[tab:${name}] crashed — contained to this tab:`,
      error,
      info,
    );
  }

  reset = () => this.setState({ failed: false, message: undefined });

  render() {
    const { failed, message } = this.state;
    const { name, children } = this.props;
    if (!failed) return children;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]">
        <AlertTriangle className="h-6 w-6 text-amber-400" />
        <span className="text-[13px] text-[var(--cg-text-nav)]">
          The {name} tab hit an error
        </span>
        {message && (
          <span className="max-w-md text-center text-[11px] opacity-70">
            {message}
          </span>
        )}
        <button
          type="button"
          onClick={this.reset}
          className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded border border-[var(--cg-border-subtle)] px-2 py-1 text-[11px] hover:text-[var(--cg-text-primary)]"
        >
          <RefreshCw className="h-3 w-3" />
          Reload tab
        </button>
      </div>
    );
  }
}

export default TabErrorBoundary;

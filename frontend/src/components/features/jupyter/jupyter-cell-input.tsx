import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { python } from "@codemirror/lang-python";
import type { CellExecutionState } from "#/state/jupyter-store";

interface JupytrerCellInputProps {
  code: string;
  executionState: CellExecutionState;
  executionCount?: number;
  executionStart?: number;
}

function ExecutionBracket({
  executionState,
  executionCount,
  executionStart,
}: {
  executionState: CellExecutionState;
  executionCount?: number;
  executionStart?: number;
}) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (executionState !== "running") {
      setElapsed(0);
      return;
    }
    const start = executionStart ?? Date.now();
    setElapsed(Math.floor((Date.now() - start) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [executionState, executionStart]);

  if (executionState === "idle") {
    return (
      <span className="font-mono text-[10px] text-[#555] select-none">
        {"[ ]"}
      </span>
    );
  }
  if (executionState === "queued") {
    return (
      <span className="font-mono text-[10px] text-[#6b7280] animate-pulse select-none">
        {"[*]"}
      </span>
    );
  }
  if (executionState === "running") {
    return (
      <span className="font-mono text-[10px] text-[#60a5fa] select-none">
        {elapsed > 0 ? `[${elapsed}s]` : "[*]"}
      </span>
    );
  }
  if (executionState === "success") {
    return (
      <span className="font-mono text-[10px] text-[#4ade80] select-none">
        [{executionCount ?? "✓"}]
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] text-[#f87171] select-none">
      {"[!]"}
    </span>
  );
}

const BORDER_COLOR: Record<CellExecutionState, string> = {
  idle: "#2a2a2a",
  queued: "#374151",
  running: "#3b82f6",
  success: "#707070",
  error: "#ef4444",
};

const DOT_COLOR: Record<CellExecutionState, string> = {
  idle: "#3a7cf8",
  queued: "#6b7280",
  running: "#60a5fa",
  success: "#707070",
  error: "#f87171",
};

export function JupytrerCellInput({
  code,
  executionState,
  executionCount,
  executionStart,
}: JupytrerCellInputProps) {
  return (
    <div
      className="mx-4 mb-3 rounded-lg overflow-hidden border transition-colors duration-300"
      style={{ borderColor: BORDER_COLOR[executionState] }}
    >
      <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <ExecutionBracket
          executionState={executionState}
          executionCount={executionCount}
          executionStart={executionStart}
        />
        <div
          className="w-1.5 h-1.5 rounded-full opacity-70 transition-colors duration-300"
          style={{ backgroundColor: DOT_COLOR[executionState] }}
        />
      </div>
      <CodeMirror
        value={code}
        extensions={[python()]}
        theme={vscodeDark}
        editable={false}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
        }}
        style={{ fontSize: "12px" }}
      />
    </div>
  );
}

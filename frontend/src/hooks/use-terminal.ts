import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import React from "react";
import { Command, useCommandStore } from "#/state/command-store";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { useWsClient } from "#/context/ws-client-provider";
import { getTerminalCommand } from "#/services/terminal-service";
import { parseTerminalOutput } from "#/utils/parse-terminal-output";
import { useAgentStore } from "#/stores/agent-store";

/*
  NOTE: Tests for this hook are indirectly covered by the tests for the XTermTerminal component.
  The reason for this is that the hook exposes a ref that requires a DOM element to be rendered.
*/

/** Resolve the panel background token so the terminal blends with its panel.
 *  xterm needs a concrete colour, so read the computed CSS variable. */
const panelBackground = (): string => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "#1a1a19";
  }
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--cg-code-bg")
    .trim();
  return v || "#1a1a19";
};

// xterm renders ANSI natively (parseTerminalOutput passes escapes through), so
// colour is just a matter of emitting codes. Tool output keeps whatever colour
// the process emits; these codes syntax-highlight the ECHOED command line, which
// we write ourselves and would otherwise be flat white.
const ANSI = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m", // command / binary
  yellow: "\x1b[33m", // flags
  green: "\x1b[32m", // quoted strings
  blue: "\x1b[34m", // prompt
};

export const PROMPT = `${ANSI.blue}$${ANSI.reset} `;

/** Colourise a shell command line: binary, flags, quoted strings. */
export const highlightCommand = (line: string): string =>
  line
    // quoted strings first so later passes don't recolour inside them
    .replace(/('[^']*'|"[^"]*")/g, (m) => `${ANSI.green}${m}${ANSI.reset}`)
    .replace(/(^|\s)(--?[A-Za-z][\w-]*)/g, (_m, s, flag) => `${s}${ANSI.yellow}${flag}${ANSI.reset}`)
    .replace(/^(\s*)([\w./-]+)/, (_m, ws, cmd) => `${ws}${ANSI.cyan}${cmd}${ANSI.reset}`);

const renderCommand = (
  command: Command,
  terminal: Terminal,
  isUserInput: boolean = false,
) => {
  const { content, type } = command;

  // Skip rendering user input commands that come from the event stream
  // as they've already been displayed in the terminal as the user typed
  if (type === "input" && isUserInput) {
    return;
  }

  const parsed = parseTerminalOutput(content.replaceAll("\n", "\r\n").trim());
  terminal.writeln(type === "input" ? highlightCommand(parsed) : parsed);
};

// Create a persistent reference that survives component unmounts
// This ensures terminal history is preserved when navigating away and back
const persistentLastCommandIndex = { current: 0 };

export const useTerminal = () => {
  const { send } = useWsClient();
  const { curAgentState } = useAgentStore();
  const commands = useCommandStore((state) => state.commands);
  const terminal = React.useRef<Terminal | null>(null);
  const fitAddon = React.useRef<FitAddon | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const lastCommandIndex = persistentLastCommandIndex; // Use the persistent reference
  const keyEventDisposable = React.useRef<{ dispose: () => void } | null>(null);
  const disabled = RUNTIME_INACTIVE_STATES.includes(curAgentState);

  const createTerminal = () =>
    new Terminal({
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      scrollback: 1000,
      scrollSensitivity: 1,
      fastScrollModifier: "alt",
      fastScrollSensitivity: 5,
      allowTransparency: false,
      // vscodeDark palette — matches @uiw/codemirror-theme-vscode used in Jupyter cells.
      // Background follows the panel token (--cg-code-bg) so the terminal blends
      // with the surrounding panel instead of sitting on a darker block.
      theme: {
        background: panelBackground(),
        foreground: "#d4d4d4",
        cursor: "#aeafad",
        cursorAccent: panelBackground(),
        selectionBackground: "#264f78",
        selectionForeground: "#ffffff",
        black: "#1e1e1e",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#d7ba7d",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
        brightBlack: "#808080",
        brightRed: "#f44747",
        brightGreen: "#b5cea8",
        brightYellow: "#d7ba7d",
        brightBlue: "#9cdcfe",
        brightMagenta: "#c586c0",
        brightCyan: "#4ec9b0",
        brightWhite: "#e6e6e6",
      },
    });

  const initializeTerminal = () => {
    if (terminal.current) {
      if (fitAddon.current) terminal.current.loadAddon(fitAddon.current);
      if (ref.current) terminal.current.open(ref.current);
    }
  };

  const copySelection = (selection: string) => {
    const clipboardItem = new ClipboardItem({
      "text/plain": new Blob([selection], { type: "text/plain" }),
    });

    navigator.clipboard.write([clipboardItem]);
  };

  const pasteSelection = (callback: (text: string) => void) => {
    navigator.clipboard.readText().then(callback);
  };

  const pasteHandler = (event: KeyboardEvent, cb: (text: string) => void) => {
    const isControlOrMetaPressed =
      event.type === "keydown" && (event.ctrlKey || event.metaKey);

    if (isControlOrMetaPressed) {
      if (event.code === "KeyV") {
        pasteSelection((text: string) => {
          terminal.current?.write(text);
          cb(text);
        });
      }

      if (event.code === "KeyC") {
        const selection = terminal.current?.getSelection();
        if (selection) copySelection(selection);
      }
    }

    return true;
  };

  const handleEnter = (command: string) => {
    // The line was echoed raw as the user typed, and the matching `input` event
    // is skipped below (isUserInput), so it would never get highlighted until a
    // remount. Repaint it in colour now: \r → line start, \x1b[2K → clear line.
    terminal.current?.write(`\r\x1b[2K${PROMPT}${highlightCommand(command)}`);
    terminal.current?.write("\r\n");
    // Don't write the command again as it will be added to the commands array
    // and rendered by the useEffect that watches commands
    send(getTerminalCommand(command));
    // Don't add the prompt here as it will be added when the command is processed
    // and the commands array is updated
  };

  const handleBackspace = (command: string) => {
    terminal.current?.write("\b \b");
    return command.slice(0, -1);
  };

  // Initialize terminal and handle cleanup
  React.useEffect(() => {
    terminal.current = createTerminal();
    fitAddon.current = new FitAddon();

    if (ref.current) {
      initializeTerminal();
      terminal.current.writeln("\x1b[32m✓\x1b[0m Connected successfully to inference defense runtime");
      // Render all commands in array
      // This happens when we just switch to Terminal from other tabs
      if (commands.length > 0) {
        for (let i = 0; i < commands.length; i += 1) {
          if (commands[i].type === "input") {
            terminal.current.write(PROMPT);
          }
          // Don't pass isUserInput=true here because we're initializing the terminal
          // and need to show all previous commands
          renderCommand(commands[i], terminal.current, false);
        }
        lastCommandIndex.current = commands.length;
      }
      terminal.current.write(PROMPT);
    }

    return () => {
      terminal.current?.dispose();
    };
  }, []);

  React.useEffect(() => {
    if (
      terminal.current &&
      commands.length > 0 &&
      lastCommandIndex.current < commands.length
    ) {
      let lastCommandType = "";
      for (let i = lastCommandIndex.current; i < commands.length; i += 1) {
        lastCommandType = commands[i].type;
        // Pass true for isUserInput to skip rendering user input commands
        // that have already been displayed as the user typed
        renderCommand(commands[i], terminal.current, true);
      }
      lastCommandIndex.current = commands.length;
      if (lastCommandType === "output") {
        terminal.current.write(PROMPT);
      }
    }
  }, [commands, disabled]);

  React.useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    resizeObserver = new ResizeObserver(() => {
      fitAddon.current?.fit();
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  React.useEffect(() => {
    if (terminal.current) {
      // Dispose of existing listeners if they exist
      if (keyEventDisposable.current) {
        keyEventDisposable.current.dispose();
        keyEventDisposable.current = null;
      }

      let commandBuffer = "";

      if (!disabled) {
        // Add new key event listener and store the disposable
        keyEventDisposable.current = terminal.current.onKey(
          ({ key, domEvent }) => {
            if (domEvent.key === "Enter") {
              handleEnter(commandBuffer);
              commandBuffer = "";
            } else if (domEvent.key === "Backspace") {
              if (commandBuffer.length > 0) {
                commandBuffer = handleBackspace(commandBuffer);
              }
            } else {
              // Ignore paste event
              if (key.charCodeAt(0) === 22) {
                return;
              }
              commandBuffer += key;
              terminal.current?.write(key);
            }
          },
        );

        // Add custom key handler and store the disposable
        terminal.current.attachCustomKeyEventHandler((event) =>
          pasteHandler(event, (text) => {
            commandBuffer += text;
          }),
        );
      } else {
        // Add a noop handler when disabled
        keyEventDisposable.current = terminal.current.onKey((e) => {
          e.domEvent.preventDefault();
          e.domEvent.stopPropagation();
        });
      }
    }

    return () => {
      if (keyEventDisposable.current) {
        keyEventDisposable.current.dispose();
        keyEventDisposable.current = null;
      }
    };
  }, [disabled]);

  return ref;
};

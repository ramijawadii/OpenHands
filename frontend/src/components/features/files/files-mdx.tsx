/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  Save,
  Pencil,
  RotateCcw,
  Undo2,
  AlertTriangle,
  Workflow,
} from "lucide-react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  HighlightToggle,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  DiffSourceToggleWrapper,
  imagePlugin,
  linkDialogPlugin,
  directivesPlugin,
  AdmonitionDirectiveDescriptor,
  InsertImage,
  InsertCodeBlock,
  InsertAdmonition,
  InsertFrontmatter,
  CodeToggle,
  Separator,
  ConditionalContents,
  ChangeCodeMirrorLanguage,
  searchPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "./files-mdx.css";
import { MERMAID_CODE_BLOCK_DESCRIPTOR } from "./files-mermaid";
import {
  useAutosave,
  recoverDraft,
  discardDraft,
} from "#/components/shared/use-autosave";
import { ColorControl } from "./files-mdx-colors";

/**
 * Markdown reading and editing, on MDXEditor (MIT).
 *
 * REPLACES the chat `MarkdownRenderer` for this surface. That component is
 * styled for the chat transcript — it carries `md-vscode--chat`, which paints a
 * dark code surface — so a report opened in the light-themed Files pane rendered
 * as a black slab. It was the right renderer in the wrong room.
 *
 * MDXEditor is a real editor rather than a renderer, which is what this surface
 * actually needs: markdown is the format the agent writes most, and being able
 * to fix a sentence in a finding without leaving the library is the point.
 *
 * READ-ONLY IS THE DEFAULT, as everywhere else here. These are versioned,
 * audited artifacts; opening one to read it must not be able to mint a revision
 * by accident. The toolbar only appears once someone has deliberately chosen to
 * edit.
 */

/** Hoisted for the same reason as `Toolbar`: an inline arrow here is a new
 *  component type on every render, and the language dropdown would be destroyed
 *  mid-interaction each time the document changed. */
const CODE_BLOCK_CONTENTS = [
  {
    when: (editor: { editorType?: string } | null) =>
      editor?.editorType === "codeblock",
    contents: () => <ChangeCodeMirrorLanguage />,
  },
];

/** Module level, not an arrow in the plugin options: a component defined during
 *  render is a new type every render, and React would tear down and rebuild the
 *  whole toolbar — losing focus mid-keystroke — on every document change. */
/** Set by the editor on mount so the module-level Toolbar can reach the live
 *  insert method. A context would mean re-creating the toolbar component per
 *  render, which is the very thing that tears the toolbar down mid-keystroke. */
let insertMarkdownRef: ((md: string) => void) | undefined;

/**
 * A toolbar button that looks like MDXEditor's own.
 *
 * The editor's `ButtonWithTooltip` is not exported, and its button styling is
 * delivered through CSS-module class names that are hashed at ITS build time —
 * which is why `files-mdx.css` reaches them with `[class*="_toolbarButton_"]`
 * attribute selectors. A plain button carrying no such class would sit in the
 * strip at a different size with different hover behaviour, so this borrows the
 * shape from the surrounding rules instead of inventing a third look.
 */
function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      // The editor keeps focus: losing the selection on mousedown would insert
      // the block at the top of the document instead of at the caret.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="cg-mdx-toolbar-btn"
    >
      {children}
    </button>
  );
}

function Toolbar() {
  return (
    <DiffSourceToggleWrapper>
      <UndoRedo />
      <Separator />
      <BoldItalicUnderlineToggles />
      <StrikeThroughSupSubToggles />
      <HighlightToggle />
      {/* Colour lives in the main toolbar rather than in a bar that appears over
          a selection — the floating one interrupted reading every time text was
          selected for any reason, including just to copy it. */}
      <ColorControl />
      {/* Insert a diagram. Beside the other INSERT verbs rather than in the
          block-type dropdown: a mermaid graph is a thing you add, like a table
          or an image, not a paragraph style you convert into. The seed is a
          minimal VALID flowchart — an empty fence renders as a parse error, and
          starting someone off with an error is a poor first impression of a
          feature. */}
      <ToolbarButton
        title="Insert diagram (mermaid)"
        onClick={() =>
          insertMarkdownRef?.(
            [
              "```mermaid",
              "flowchart LR",
              "    A[Start] --> B{Decision}",
              "    B -->|yes| C[Do the thing]",
              "    B -->|no| D[Stop]",
              "```",
              "",
            ].join("\n"),
          )
        }
      >
        <Workflow className="h-4 w-4" />
      </ToolbarButton>
      <CodeToggle />
      <Separator />
      <BlockTypeSelect />
      <ListsToggle />
      <Separator />
      <CreateLink />
      <InsertImage />
      <InsertTable />
      <InsertCodeBlock />
      <InsertAdmonition />
      <InsertThematicBreak />
      <InsertFrontmatter />
      {/* Inside a fence the block controls are useless and the LANGUAGE picker
          is the only thing anyone wants, so the strip swaps rather than showing
          both sets greyed out. */}
      <ConditionalContents options={CODE_BLOCK_CONTENTS} />
    </DiffSourceToggleWrapper>
  );
}

export interface MarkdownEditorProps {
  markdown: string;
  readOnly: boolean;
  /** Where pasted or chosen images are stored, so the reference resolves for
   *  everyone rather than only in the author's browser. */
  imageDir?: string;
  conversationId?: string;
  store?: string;
  /** Called with the current document when the user asks to save. */
  /** MAY RETURN A PROMISE, and should when the write can fail. The editor only
   *  rebases its "saved" baseline and clears the dirty flag once that promise
   *  resolves — see `commit` for why that matters. */
  onSave?: (markdown: string) => void | Promise<void>;
  /** Marks the buffer dirty so the caller can enable its Save control. */
  onDirty?: () => void;
  /** Identifies the document for autosave drafts. Must be stable per file and
   *  unique across stores — the same path exists in both. */
  autosaveKey?: string;
}

/**
 * One sentence for the editor's state, in priority order.
 *
 * A manual save failing outranks everything — it is the one the person is
 * standing there waiting for. Autosave activity comes next because it is
 * happening now, and the plain dirty/clean state last, since it is the least
 * urgent thing the line can say.
 */
function statusLabel({
  saveState,
  autosaveState,
  dirty,
}: {
  saveState: { kind: string; message?: string };
  autosaveState: { kind: string; message?: string };
  dirty: boolean;
}): string {
  if (saveState.kind === "failed") return `Not saved — ${saveState.message}`;
  if (autosaveState.kind === "saving") return "Autosaving…";
  if (autosaveState.kind === "saved") return "Autosaved";
  if (autosaveState.kind === "failed")
    return `Autosave failed — ${autosaveState.message}`;
  return dirty ? "Unsaved changes" : "Editing";
}

export function MarkdownEditor({
  markdown,
  readOnly,
  onSave,
  onDirty,
  imageDir = "",
  conversationId = "",
  store = "artifacts",
  autosaveKey = "",
}: MarkdownEditorProps) {
  const ref = React.useRef<MDXEditorMethods>(null);
  const [dirty, setDirty] = React.useState(false);
  /**
   * Where MDXEditor mounts its dialogs and menus.
   *
   * By default it appends a container to `document.body`, which is why the image
   * dialog opened centred on the WHOLE WINDOW rather than over the pane — it had
   * no idea it was living inside a drawer. Anchoring it to this element puts
   * every popup over the editor, and as a bonus they now inherit the theme
   * variables from `.cg-mdx` instead of needing a body-level override.
   */
  // NO SECTION RAIL. A tick-per-heading minimap rode the right edge here; it
  // was removed because on a real specification it is a column of dashes down
  // the side of the text you are trying to read, competing with the document
  // for exactly the attention the document wants. The document's own headings
  // are the outline, and the browser's find is how people actually jump.
  const paneRef = React.useRef<HTMLDivElement>(null);

  const overlayHost = React.useRef<HTMLDivElement>(null);
  const [overlayEl, setOverlayEl] = React.useState<HTMLDivElement | null>(null);
  React.useEffect(() => {
    setOverlayEl(overlayHost.current);
  }, []);

  // Published for the toolbar, and cleared on unmount so a stale editor can
  // never receive an insert.
  React.useEffect(() => {
    insertMarkdownRef = (md: string) => ref.current?.insertMarkdown(md);
    return () => {
      insertMarkdownRef = undefined;
    };
  }, []);

  // What is currently ON SCREEN, tracked so a save writes the live buffer and a
  // revert can restore exactly what was loaded.
  const loadedRef = React.useRef(markdown);

  /**
   * Push a new document in ONLY when it is genuinely a different one.
   *
   * MDXEditor takes `markdown` as an initial value and never re-reads the prop,
   * so switching files has to call `setMarkdown`. But calling it on every change
   * of the prop is destructive: `setMarkdown` resets the document AND clears the
   * undo history, so a save (which re-reads the file and hands back a new
   * string) would wipe the user's undo stack and drop the cursor to the top.
   * Comparing against what was last loaded keeps both intact.
   */
  React.useEffect(() => {
    if (markdown === loadedRef.current) return;
    loadedRef.current = markdown;
    ref.current?.setMarkdown(markdown);
    setDirty(false);
  }, [markdown]);

  /**
   * Revert, with a way back.
   *
   * `setMarkdown` resets the document AND CLEARS MDXEditor'S UNDO HISTORY, so
   * before this the Revert button was a one-click, irreversible discard of
   * everything since the last save — Ctrl+Z could not bring it back, because
   * there was no longer a stack to walk. For a control sitting one button away
   * from Save, on documents that are versioned evidence, that is not an
   * acceptable failure mode.
   *
   * The discarded text is therefore kept, and Revert becomes undoable for as
   * long as the pane is open. Nothing is lost by pressing the wrong button.
   */
  const [discarded, setDiscarded] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "failed"; message: string }
  >({ kind: "idle" });

  /**
   * Write the buffer, and only THEN call it saved.
   *
   * THE BUG THIS REPLACES. Both the Save button and Ctrl+S did
   * `loadedRef.current = current; setDirty(false); onSave(current)` — rebasing
   * the baseline and clearing the dirty flag BEFORE the write was known to have
   * worked. When a save failed, three things went wrong silently at once:
   *
   *   1. the pane said "Editing" instead of "Unsaved changes";
   *   2. `beforeunload` disarmed, so closing the tab cost no warning;
   *   3. Revert would restore text that never reached the store, because the
   *      baseline now pointed at the unsaved buffer.
   *
   * Together that is losing someone's work while telling them it is safe. The
   * write is awaited, the baseline moves only on success, and a failure stays
   * dirty, armed and visible.
   */
  const commit = React.useCallback(async () => {
    if (!onSave) return;
    const current = ref.current?.getMarkdown() ?? markdown;
    setSaveState({ kind: "saving" });
    try {
      await onSave(current);
      // Rebased ONLY here. `loadedRef` is what Revert returns to, so it must
      // never point at text the store does not have.
      loadedRef.current = current;
      setDirty(false);
      setDiscarded(null);
      setSaveState({ kind: "idle" });
    } catch (e: unknown) {
      setSaveState({
        kind: "failed",
        message: e instanceof Error ? e.message : "the document was not saved",
      });
    }
  }, [onSave, markdown]);

  /**
   * Autosave.
   *
   * Wired to the SAME `onSave` the button uses, so an autosave and a manual save
   * are one operation and cannot disagree about what "saved" means. The local
   * draft tier is what survives a tab being closed or killed; the durable tier
   * is deliberately unhurried, because every durable write mints a revision and
   * nobody wants a version history made of keystrokes.
   */
  const autosave = useAutosave({
    enabled: !readOnly && !!onSave && !!autosaveKey,
    draftKey: autosaveKey || `${store}:${imageDir}`,
    // The SERVER draft tier. `autosaveKey` is "<store>:<path>", so the path is
    // everything after the first colon — a path can itself contain one.
    remote: autosaveKey
      ? {
          store: autosaveKey.slice(0, autosaveKey.indexOf(":")),
          path: autosaveKey.slice(autosaveKey.indexOf(":") + 1),
          conversationId,
          mime: "text/markdown",
        }
      : undefined,
    baseline: markdown,
    getSnapshot: () => ref.current?.getMarkdown() ?? markdown,
    save: async (content: string) => {
      await onSave?.(content);
      loadedRef.current = content;
      setDirty(false);
    },
  });

  /**
   * A draft left behind by a previous session.
   *
   * Read once at mount and NOT applied automatically. Silently replacing the
   * stored document with local text someone may not remember writing is its own
   * kind of data loss — they are told it exists and choose.
   */
  const [pendingDraft, setPendingDraft] = React.useState<{
    content: string;
    at: number;
  } | null>(null);
  React.useEffect(() => {
    if (readOnly || !autosaveKey) return;
    // Keyed on the DOCUMENT, not on `markdown`: re-running per save would
    // re-offer a draft that was just superseded.
    setPendingDraft(recoverDraft(autosaveKey, markdown));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveKey, readOnly]);

  const revert = React.useCallback(() => {
    const current = ref.current?.getMarkdown() ?? "";
    // Never stash an empty or identical buffer as "recoverable work" — offering
    // to restore something indistinguishable from what is on screen is noise.
    setDiscarded(current !== loadedRef.current ? current : null);
    ref.current?.setMarkdown(loadedRef.current);
    setDirty(false);
  }, []);

  /** Put the discarded text back. */
  const undoRevert = React.useCallback(() => {
    if (discarded === null) return;
    ref.current?.setMarkdown(discarded);
    setDiscarded(null);
    setDirty(true);
    onDirty?.();
  }, [discarded, onDirty]);

  // Leaving with unsaved work should cost a confirmation, not a shrug. Bound
  // only while dirty so a read-only pane never arms the browser prompt.
  React.useEffect(() => {
    if (!dirty || readOnly) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      // preventDefault alone is the modern signal; the legacy returnValue is set
      // via the event object rather than by reassigning the parameter, which the
      // lint rule correctly objects to.
      e.preventDefault();
      Object.assign(e, { returnValue: "" });
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, readOnly]);

  /**
   * Store a pasted or chosen image IN THE LIBRARY and return the URL that reads
   * it back.
   *
   * The obvious shortcut — a `data:` URI inlined into the markdown — is wrong
   * here: it bloats every future revision of the document with the image bytes,
   * and the picture then lives outside the store that is supposed to hold the
   * evidence. Writing it as a sibling artifact keeps the document small and the
   * image versioned, audited and downloadable like everything else.
   */
  const uploadImage = React.useCallback(
    async (file: File) => {
      const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
      const path = `${imageDir ? `${imageDir}/` : ""}${Date.now()}-${safe}`;
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
      }
      const res = await fetch("/api/cloudguard/vfs/write", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          path,
          content_b64: btoa(binary),
          mime: file.type || "application/octet-stream",
          store,
        }),
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          detail = (await res.json())?.detail ?? detail;
        } catch {
          /* a non-JSON error body is still an error */
        }
        throw new Error(`Could not store the image: ${detail}`);
      }
      const url = new URL("/api/cloudguard/vfs/read", window.location.origin);
      url.searchParams.set("conversation_id", conversationId);
      url.searchParams.set("path", path);
      url.searchParams.set("store", store);
      return url.pathname + url.search;
    },
    [imageDir, conversationId, store],
  );

  const plugins = React.useMemo(() => {
    const base = [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      thematicBreakPlugin(),
      tablePlugin(),
      frontmatterPlugin(),
      // Fenced code keeps its language and gets CodeMirror highlighting. A
      // security report is mostly prose wrapped around commands and policy
      // JSON, so unhighlighted fences would be most of the document.
      // The mermaid descriptor is registered HERE rather than added later:
      // `RealmWithPlugins` initialises each plugin exactly once, so a descriptor
      // that arrives after mount is never seen — the same trap that left the
      // toolbar missing in view mode (see the note further down).
      codeBlockPlugin({
        defaultCodeBlockLanguage: "text",
        codeBlockEditorDescriptors: [MERMAID_CODE_BLOCK_DESCRIPTOR],
      }),
      linkDialogPlugin(),
      // Admonitions are how a security report says "this one matters" — a
      // callout for a caveat or a danger note is the single most-asked-for
      // block after tables.
      directivesPlugin({
        directiveDescriptors: [AdmonitionDirectiveDescriptor],
      }),
      imagePlugin({ imageUploadHandler: uploadImage }),
      searchPlugin(),
      codeMirrorPlugin({
        codeBlockLanguages: {
          text: "Text",
          bash: "Shell",
          sh: "Shell",
          json: "JSON",
          yaml: "YAML",
          python: "Python",
          sql: "SQL",
          hcl: "Terraform",
          // Listed so a fence can be RETYPED as a diagram from the language
          // dropdown. Choosing it hands the block to the mermaid descriptor
          // above rather than to CodeMirror.
          mermaid: "Mermaid diagram",
          js: "JavaScript",
          ts: "TypeScript",
        },
      }),
      markdownShortcutPlugin(),
      // Source view stays available while editing: markdown authors reach for it
      // the moment the rich-text view fights them.
      diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: markdown }),
      toolbarPlugin({ toolbarContents: Toolbar }),
    ];
    // EVERY plugin is registered on the FIRST render, including the editing
    // ones, and read-only is expressed through the editor's own `readOnly` prop
    // plus CSS — NOT by handing MDXEditor a different plugin list.
    //
    // `RealmWithPlugins` calls `init()` exactly once, inside a `useEffect` with
    // an EMPTY dependency array; afterwards it only calls `update()`. A plugin
    // absent at mount therefore never initialises. Because this pane opens in
    // view mode, `toolbarPlugin` was missing on that first render, so clicking
    // Edit added it to the array and nothing happened — no formatting toolbar,
    // ever. That is why editing looked like a plain text box.
    return base;
  }, [markdown, uploadImage]);

  return (
    // TWO BOXES, deliberately.
    //
    // The outer one is positioned and does NOT scroll; the inner `.cg-mdx` is
    // the scroller. Anything that must stay put while the document moves goes
    // in the outer box and the browser pins it for free — kept even though the
    // section rail that needed it is gone, because MDXEditor's own popups rely
    // on this pane being positioned and non-clipping.
    //
    // The outer box adds position only, never `overflow`: MDXEditor portals its
    // select and dialog popups, and a clipping ancestor is what made them
    // silently do nothing (see the long note in files-mdx.css).
    //
    // Ctrl/Cmd-S is bound here rather than on the editor: MDXEditor exposes no
    // key handler of its own, and the shortcut is what people press — without it
    // the only way to save is a header button that is off-screen on a long
    // document. Capture phase, so it beats the browser's Save Page dialog.
    <div
      role="presentation"
      // A COLUMN: a fixed header, then a scroller that takes the rest. The
      // header being a sibling of the scroller rather than its first child is
      // what keeps it on screen and stops it moving the document.
      className="relative flex h-full flex-col"
      onKeyDownCapture={(e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          // The SAME path as the button. Two copies of "what saving means" is
          // how the two drift into disagreeing about whether the buffer is clean.
          if (!readOnly && onSave) {
            commit().catch(() => {
              /* `commit` records the failure in saveState; nothing to add here. */
            });
          }
        }
      }}
    >
      {/* `relative` stays on the scroller: MDXEditor positions several of its
          own affordances against it, and moving the offset parent out to the
          box above shifts them by the header's height. */}
      {!readOnly && (
        // An explicit Save, above the formatting toolbar.
        //
        // Ctrl/Cmd-S alone is not enough: nothing on screen said the document
        // was editable or that there were unsaved changes, which is exactly what
        // "I do not see what lets me edit" meant. The row states the mode, and
        // the button only lights up once there is something to write.
        // A FIXED-HEIGHT ROW, and every child inside it is dimensionally
        // stable.
        //
        // This bar sits INSIDE the scroll container, above the document. The
        // status text cycles on its own — Editing → Autosaving… → Autosaved,
        // and occasionally a long failure message — and it used to switch
        // between `inline` and `flex`, grow an icon, and wrap. Each of those
        // changed the row's HEIGHT, which moved everything below it and made
        // the page appear to jump while you were reading it. A status line
        // that reports quietly in the background must not be able to move the
        // document.
        //
        // So: the row's height is pinned, the label never wraps and never
        // changes its box, and the icon slot is always present (merely
        // invisible when there is nothing to warn about).
        <div className="flex h-9 shrink-0 items-center gap-2 overflow-hidden border-b border-[var(--cg-border)] bg-[var(--cg-bg-card,var(--cg-bg-page))] px-3">
          <Pencil className="h-3 w-3 shrink-0 text-[var(--cg-text-muted)]" />
          <span
            className={`inline-flex min-w-0 max-w-[46%] items-center gap-1 whitespace-nowrap text-[11px] ${
              saveState.kind === "failed" || autosave.state.kind === "failed"
                ? "font-medium text-amber-400"
                : "text-[var(--cg-text-muted)]"
            }`}
            title={saveState.kind === "failed" ? saveState.message : undefined}
          >
            {/* Reserved, not conditional: an icon that appears and disappears
                  is a width change, and a width change here is a reflow. */}
            <AlertTriangle
              className={`h-3 w-3 shrink-0 ${
                saveState.kind === "failed" || autosave.state.kind === "failed"
                  ? ""
                  : "invisible"
              }`}
            />
            {/*
             * THE WORD ANIMATES; NOTHING APPEARS.
             *
             * `key` changes each time an autosave completes, so React remounts
             * this span and the CSS animation replays — a brief fade-and-lift on
             * the label itself. That is the whole signal.
             *
             * Deliberately not a bar, a toast or a badge that comes and goes:
             * anything entering or leaving the layout moves the document, and a
             * routine background save has not earned the right to move what you
             * are reading. The label is always present and always the same size;
             * only its text and a 400ms animation change.
             */}
            <span
              key={`${autosave.state.kind}:${
                autosave.state.kind === "saved" ? autosave.state.at : 0
              }`}
              className={`truncate ${
                autosave.state.kind === "saved" ? "cg-autosave-flash" : ""
              }`}
            >
              {statusLabel({
                saveState,
                autosaveState: autosave.state,
                dirty,
              })}
            </span>
          </span>
          <button
            type="button"
            disabled={!dirty || saveState.kind === "saving"}
            onClick={() => {
              commit().catch(() => {
                /* surfaced by saveState */
              });
            }}
            className="ml-auto flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Save className="h-3 w-3 shrink-0" />
            {/* Fixed width: "Save" and "Saving…" are different lengths, and a
                  button that resizes mid-save shuffles the row beside it. */}
            <span className="w-[46px] text-left">
              {saveState.kind === "saving" ? "Saving…" : "Save"}
            </span>
          </button>
          {/* Undo revert REPLACES Revert while there is something to bring
                back, rather than sitting beside it: two adjacent buttons that
                both mean "undo something" is how the wrong one gets pressed. */}
          {discarded !== null ? (
            <button
              type="button"
              onClick={undoRevert}
              title="Bring back the edits that were just discarded"
              className="flex items-center gap-1.5 rounded border border-[var(--cg-accent,#4C9AFF)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
            >
              <Undo2 className="h-3 w-3" />
              Undo revert
            </button>
          ) : (
            <button
              type="button"
              disabled={!dirty}
              onClick={revert}
              title="Discard local edits and reload the saved document. This can be undone."
              className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <RotateCcw className="h-3 w-3" />
              Revert
            </button>
          )}
          <span className="text-[10px] text-[var(--cg-text-muted)]">
            Ctrl+S
          </span>
        </div>
      )}
      {pendingDraft && (
        // Offered, never applied silently. The stored document is what everyone
        // else sees; swapping it for local text without asking would be a second
        // kind of data loss dressed up as a feature.
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] text-[var(--cg-text-nav)]">
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
          <span>
            Unsaved changes from {new Date(pendingDraft.at).toLocaleString()}{" "}
            were recovered from this browser.
          </span>
          <button
            type="button"
            onClick={() => {
              ref.current?.setMarkdown(pendingDraft.content);
              setDirty(true);
              onDirty?.();
              setPendingDraft(null);
            }}
            className="ml-auto rounded border border-[var(--cg-accent,#4C9AFF)] px-2 py-0.5 text-[10px] hover:bg-[var(--cg-bg-hover)]"
          >
            Restore them
          </button>
          <button
            type="button"
            onClick={() => {
              discardDraft(autosaveKey);
              setPendingDraft(null);
            }}
            className="rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[10px] hover:bg-[var(--cg-bg-hover)]"
          >
            Discard
          </button>
        </div>
      )}
      {/* THE SCROLLER STARTS HERE — the save/status bar above is deliberately
            OUTSIDE it.
            It used to be the first child inside this box, which meant it
            scrolled away with the document (so Save was unreachable half way
            down a long report) and every change to its height shifted the
            content below it, which is what made the page jump while the
            autosave label cycled. Out here it is always visible and cannot move
            the document at all. */}
      <div
        ref={paneRef}
        className={`cg-mdx relative min-h-0 flex-1${readOnly ? " cg-mdx--readonly" : ""}`}
      >
        {/* Positioned, so absolutely-placed dialogs centre on the PANE. */}
        <div ref={overlayHost} className="cg-mdx-overlay-host" />
        <MDXEditor
          ref={ref}
          overlayContainer={overlayEl}
          markdown={markdown}
          readOnly={readOnly}
          contentEditableClassName="cg-mdx-content"
          plugins={plugins}
          onChange={() => {
            setDirty(true);
            onDirty?.();
            autosave.onChange();
          }}
        />
      </div>
    </div>
  );
}

/** Current buffer, for a caller that owns the Save button. */
export function useMarkdownRef() {
  return React.useRef<MDXEditorMethods>(null);
}

/* eslint-disable i18next/no-literal-string */
import React from "react";
import { Loader2, Search, X, LayoutTemplate, Layers } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";

/** One template's catalog metadata (from /api/cloudguard/templates/index → templates.json). */
interface Template {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  also_in?: string[];
  products?: string[];
  pages?: number;
}

const OTHER = "other";
const prettyCat = (c: string) =>
  (c || OTHER)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/Ai Machine Learning/i, "AI + Machine Learning");

function normCat(c?: string): string {
  const v = (c || "").trim().toLowerCase();
  return !v || v === "_uncategorized" ? OTHER : v;
}

interface Props {
  onSelect: (xml: string, template: Template) => void;
  onClose: () => void;
}

/** TemplateCatalog — a per-category gallery of starter architecture diagrams. The analyst picks one;
 *  we fetch that single .drawio and hand the XML back to the caller to load into a NEW canvas. The
 *  template files are immutable — saving writes a new document, never the source. */
export default function TemplateCatalog({ onSelect, onClose }: Props) {
  const [state, setState] = React.useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; templates: Template[] }
  >({ status: "loading" });
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<string | null>(null);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    openHands
      .get("/api/cloudguard/templates/index")
      .then(({ data }) => {
        if (!cancelled)
          setState({ status: "ready", templates: data?.templates ?? [] });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const templates = state.status === "ready" ? state.templates : [];

  // categories (+ counts), sorted by count desc; "Other" last.
  const categories = React.useMemo(() => {
    const counts = new Map<string, number>();
    templates.forEach((t) => {
      const c = normCat(t.category);
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) =>
      a[0] === OTHER ? 1 : b[0] === OTHER ? -1 : b[1] - a[1],
    );
  }, [templates]);

  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return templates.filter((t) => {
      if (cat) {
        const inCat =
          normCat(t.category) === cat ||
          (t.also_in || []).some((c) => normCat(c) === cat);
        if (!inCat) return false;
      }
      if (!needle) return true;
      const hay = `${t.title} ${t.summary ?? ""} ${(t.products || []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [templates, q, cat]);

  const pick = async (t: Template) => {
    setLoadingId(t.id);
    try {
      // text fetch; generous timeout — three templates are 30 MB+.
      const { data } = await openHands.get(
        `/api/cloudguard/templates/file/${encodeURIComponent(t.id)}`,
        { responseType: "text", timeout: 120000 },
      );
      onSelect(typeof data === "string" ? data : String(data), t);
    } catch {
      setLoadingId(null);
    }
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-[var(--cg-bg,#0b0e14)]/98 text-[var(--cg-text,#e6e6e6)]"
      role="dialog"
      aria-label="Architecture templates"
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b border-[var(--cg-border,#2a2f3a)] px-4 py-2.5">
        <LayoutTemplate className="h-4 w-4 text-[var(--cg-accent,#4C9AFF)]" />
        <span className="text-[13px] font-semibold">Architecture templates</span>
        <div className="relative ml-2 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates…"
            className="w-full rounded-md border border-[var(--cg-border,#2a2f3a)] bg-transparent py-1 pl-7 pr-2 text-[12px] outline-none focus:border-[var(--cg-accent,#4C9AFF)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close templates"
          className="ml-auto rounded p-1 hover:bg-[var(--cg-border,#2a2f3a)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {state.status === "loading" && (
        <div className="flex flex-1 items-center justify-center gap-2 text-[12px] opacity-70">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
        </div>
      )}
      {state.status === "error" && (
        <div className="flex flex-1 items-center justify-center text-[12px] opacity-70">
          No template library available on this instance.
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex min-h-0 flex-1">
          {/* category rail */}
          <aside className="w-52 shrink-0 overflow-y-auto border-r border-[var(--cg-border,#2a2f3a)] p-2">
            <button
              type="button"
              onClick={() => setCat(null)}
              className={`mb-0.5 block w-full rounded px-2 py-1 text-left text-[12px] ${cat === null ? "bg-[var(--cg-accent,#4C9AFF)] text-white" : "hover:bg-[var(--cg-border,#2a2f3a)]"}`}
            >
              All templates{" "}
              <span className="opacity-60">({templates.length})</span>
            </button>
            {categories.map(([c, n]) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`mb-0.5 block w-full truncate rounded px-2 py-1 text-left text-[12px] ${cat === c ? "bg-[var(--cg-accent,#4C9AFF)] text-white" : "hover:bg-[var(--cg-border,#2a2f3a)]"}`}
              >
                {prettyCat(c)} <span className="opacity-60">({n})</span>
              </button>
            ))}
          </aside>

          {/* cards */}
          <div className="min-w-0 flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {shown.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t)}
                  disabled={loadingId === t.id}
                  className="group flex flex-col rounded-lg border border-[var(--cg-border,#2a2f3a)] bg-[var(--cg-bg-elev,#12161f)] p-3 text-left transition hover:border-[var(--cg-accent,#4C9AFF)] disabled:opacity-60"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-[12px] font-semibold leading-tight line-clamp-2">
                      {t.title}
                    </span>
                    {loadingId === t.id && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--cg-accent,#4C9AFF)]" />
                    )}
                  </div>
                  {t.summary && (
                    <span className="mb-2 text-[11px] leading-snug opacity-70 line-clamp-3">
                      {t.summary}
                    </span>
                  )}
                  <div className="mt-auto flex items-center gap-2 text-[10px] opacity-60">
                    <span className="rounded bg-[var(--cg-border,#2a2f3a)] px-1.5 py-0.5">
                      {prettyCat(normCat(t.category))}
                    </span>
                    {t.pages && t.pages > 1 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Layers className="h-3 w-3" />
                        {t.pages} pages
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {shown.length === 0 && (
              <div className="pt-10 text-center text-[12px] opacity-60">
                No templates match.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useParams } from "react-router";
import { HelpCircle } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";
import { Button } from "#/components/ui/button";
import { cn } from "#/utils/utils";

interface Question {
  header?: string;
  question: string;
  options?: string[];
  multi?: boolean;
}
interface ClarificationRecord {
  cid: string;
  questions: Question[];
}

const POLL_MS = 3000;

export function ClarificationBanner() {
  const { conversationId } = useParams();
  const [pending, setPending] = React.useState<ClarificationRecord[]>([]);
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [otherText, setOtherText] = React.useState<Record<number, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data } = await openHands.get("/api/cloudguard/clarifications", {
          // Scope to THIS conversation (see approval banner).
          params: { status: "pending", conversation_id: conversationId },
        });
        if (alive) setPending(data?.clarifications ?? []);
      } catch {
        /* not configured — stay hidden */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId]);

  const current = pending[0];
  React.useEffect(() => {
    if (current) setAnswers(new Array(current.questions.length).fill(""));
  }, [current?.cid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  const pick = (qi: number, value: string) =>
    setAnswers((a) => a.map((v, i) => (i === qi ? value : v)));

  const submit = async () => {
    setBusy(true);
    try {
      const finalAnswers = current.questions.map(
        (_, i) => answers[i] || otherText[i] || "",
      );
      await openHands.post(
        `/api/cloudguard/clarifications/${current.cid}/answer`,
        {
          answers: finalAnswers,
        },
      );
      setPending((p) => p.filter((r) => r.cid !== current.cid));
      setAnswers([]);
      setOtherText({});
    } finally {
      setBusy(false);
    }
  };

  const allAnswered = current.questions.every(
    (_, i) => answers[i] || otherText[i],
  );

  /*
    Themed with the same tokens as every other card on the strip.

    It used to hardcode `neutral-*` greys, so it read as a foreign panel pasted
    onto the composer — wrong surface in dark mode and unreadable in light,
    because those greys do not invert with the theme.
  */
  return (
    <div className="cg-tool-card border-border bg-card flex w-full flex-col gap-3 rounded-lg border px-3 py-2.5 text-xs">
      <span className="text-muted-foreground flex items-center gap-2">
        <HelpCircle className="size-3.5 shrink-0" aria-hidden />
        <span>The agent needs a quick clarification</span>
      </span>

      {current.questions.map((q, qi) => (
        <div key={q.question} className="flex flex-col gap-1.5">
          {q.header && (
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {q.header}
            </span>
          )}
          <span className="text-foreground text-sm">{q.question}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(q.options ?? []).map((opt) => (
              <button
                type="button"
                key={opt}
                aria-pressed={answers[qi] === opt}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors",
                  answers[qi] === opt
                    ? "bg-foreground text-background font-medium"
                    : "border-border text-foreground hover:bg-muted/60 border",
                )}
                onClick={() => pick(qi, opt)}
              >
                {opt}
              </button>
            ))}
            <input
              className="border-border text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/40 min-w-32 flex-1 rounded-full border bg-transparent px-2.5 py-1 outline-none"
              placeholder="Other…"
              value={otherText[qi] ?? ""}
              onChange={(e) => {
                setOtherText((o) => ({ ...o, [qi]: e.target.value }));
                pick(qi, "");
              }}
            />
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button size="sm" disabled={busy || !allAnswered} onClick={submit}>
          Send answer
        </Button>
      </div>
    </div>
  );
}

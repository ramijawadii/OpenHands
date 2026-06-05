/* eslint-disable i18next/no-literal-string */
import React from "react";
import { openHands } from "#/api/open-hands-axios";

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
  const [pending, setPending] = React.useState<ClarificationRecord[]>([]);
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [otherText, setOtherText] = React.useState<Record<number, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data } = await openHands.get("/api/cloudguard/clarifications", {
          params: { status: "pending" },
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
  }, []);

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

  return (
    <div className="flex flex-col gap-2 px-3 py-2 text-xs text-sky-200 border border-sky-700/60 bg-sky-900/20 rounded-md">
      <span className="flex items-center gap-2">
        <span aria-hidden>?</span>
        <span>The agent needs a quick clarification:</span>
      </span>
      {current.questions.map((q, qi) => (
        <div key={qi} className="flex flex-col gap-1">
          <span className="text-sky-100">{q.question}</span>
          <div className="flex flex-wrap items-center gap-1">
            {(q.options ?? []).map((opt) => (
              <button
                type="button"
                key={opt}
                className={`rounded px-2 py-1 ${
                  answers[qi] === opt
                    ? "bg-sky-700"
                    : "border border-neutral-600 hover:bg-neutral-700/50"
                }`}
                onClick={() => pick(qi, opt)}
              >
                {opt}
              </button>
            ))}
            <input
              className="rounded bg-neutral-900/70 px-2 py-1 text-neutral-200"
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
      <div>
        <button
          type="button"
          disabled={busy || !allAnswered}
          className="rounded bg-sky-700/80 px-2 py-1 hover:bg-sky-600 disabled:opacity-50"
          onClick={submit}
        >
          Send answer
        </button>
      </div>
    </div>
  );
}

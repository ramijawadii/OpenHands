import React from "react";
import { useWsClient } from "#/context/ws-client-provider";

const PHASES = [
  { word: "thinking", pause: 1400 },
  { word: "inferring", pause: 1400 },
];

const LETTER_DELAY = 70; // ms per letter reveal
const FADE_DURATION = 300; // ms for opacity transition between words

export function TypingIndicator() {
  const { streamingContent } = useWsClient();
  const [phaseIdx, setPhaseIdx] = React.useState(0);
  const [visibleChars, setVisibleChars] = React.useState(0);
  const [fading, setFading] = React.useState(false);

  const { word } = PHASES[phaseIdx];

  React.useEffect(() => {
    setVisibleChars(0);
    setFading(false);
  }, [phaseIdx]);

  React.useEffect(() => {
    if (streamingContent !== null) return;
    if (visibleChars < word.length) {
      const t = setTimeout(() => setVisibleChars((v) => v + 1), LETTER_DELAY);
      return () => clearTimeout(t);
    }

    // Word fully revealed — pause then fade out and switch
    const pauseTimer = setTimeout(() => {
      setFading(true);
      const fadeTimer = setTimeout(() => {
        setPhaseIdx((i) => (i + 1) % PHASES.length);
      }, FADE_DURATION);
      return () => clearTimeout(fadeTimer);
    }, PHASES[phaseIdx].pause);

    return () => clearTimeout(pauseTimer);
  }, [visibleChars, word.length, phaseIdx, streamingContent]);

  // Real tokens are visible — suppress the fake animation
  if (streamingContent !== null) return null;

  const revealed = word.slice(0, visibleChars);
  const hidden = word.slice(visibleChars);

  return (
    <span
      className="text-[11px] font-mono tracking-wide select-none"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease`,
        color: "var(--cg-text-muted)",
      }}
    >
      <span style={{ color: "var(--cg-text-nav)" }}>{revealed}</span>
      <span style={{ color: "var(--cg-border)" }}>{hidden}</span>
    </span>
  );
}

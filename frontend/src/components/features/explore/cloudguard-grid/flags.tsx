import React from "react";
import IE from "country-flag-icons/react/3x2/IE";
import US from "country-flag-icons/react/3x2/US";
import IN from "country-flag-icons/react/3x2/IN";
import NL from "country-flag-icons/react/3x2/NL";

/**
 * Country flags as real SVGs, from `country-flag-icons` (MIT).
 *
 * **Not Unicode flag emoji.** Windows does not render regional-indicator pairs
 * as flags — it shows the letter pair instead — so emoji would silently
 * degrade for a large share of users. SVG renders identically everywhere.
 *
 * **Imported per country, not as a namespace.** `import * as Flags` pulls all
 * ~250 flags and cost ~237KB in the bundle for the four we actually use.
 * Adding a country means one import plus one registry line.
 */

type FlagComponent = React.ComponentType<{
  title?: string;
  style?: React.CSSProperties;
}>;

const REGISTRY: Record<string, FlagComponent> = { IE, US, IN, NL };

export const COUNTRY_NAME: Record<string, string> = {
  IE: "Ireland",
  US: "United States",
  IN: "India",
  NL: "Netherlands",
};

export function CountryFlag({
  code,
  width = 16,
}: {
  code: string;
  width?: number;
}) {
  const Flag = REGISTRY[code?.toUpperCase()];
  // Reserve the width even when unknown, so labels stay aligned.
  if (!Flag) return <span style={{ width, flexShrink: 0 }} />;
  return (
    <Flag
      title={COUNTRY_NAME[code] ?? code}
      style={{
        width,
        height: (width * 2) / 3,
        borderRadius: 2,
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}

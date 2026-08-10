/* eslint-disable i18next/no-literal-string -- CloudGuard admin drawer kit */
/**
 * Drawer kit — the console's bridge to the record-drawer UI system.
 *
 * The list side of the console already borrows the overview system through
 * `discovery-kit`: `StatStrip` wraps the real `AssetStats`, `DiscoveryTable`
 * wraps the real AG Grid. This is the same idea for the *detail* side — the
 * drawer that opens off a row.
 *
 * It deliberately **re-exports** the remediation drawer primitives rather than
 * restating their metrics. Those components are the shipped definition of the
 * drawer look (13.5/600 pane titles, 12.5px rows on a 210px label column,
 * collapsible sections on `--cg-border-subtle`), and a second copy here would
 * drift from them the first time either side is tuned. Importing the real
 * component means the console cannot fall out of step by accident.
 *
 * `KVRows` is the one addition: an adapter with `KVGrid`'s item shape that
 * renders kit `Row`s, so a console pane can move onto the drawer system without
 * its call sites being rewritten.
 */
import React from "react";
import { Row } from "../features/remediation/RemediationPanes";

export {
  PaneTitle,
  Section,
  Row,
  IconRow,
  Pill,
} from "../features/remediation/RemediationPanes";

/** The console's "this value is illustrative" mark, in the kit's row scale. */
function SampleMark() {
  return (
    <span
      style={{
        padding: "0 5px",
        fontSize: 9.5,
        lineHeight: "15px",
        borderRadius: 3,
        border: "1px solid var(--cg-border)",
        color: "var(--cg-text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      sample
    </span>
  );
}

/**
 * A key/value block in the drawer's row system.
 *
 * Takes `KVGrid`'s `{ k, v, sample }` items but renders them as a single
 * column of `Row`s instead of a two-across grid. One column is the drawer
 * convention for a reason: labels and values each keep a fixed left edge, so
 * the eye tracks straight down one line rather than zig-zagging between two
 * pairs per line — which matters most on the panes where the values are
 * identifiers and hashes that are read character by character.
 */
export function KVRows({
  items,
}: {
  items: { k: string; v: React.ReactNode; sample?: boolean }[];
}) {
  return (
    <div>
      {items.map((it) => (
        <Row
          key={it.k}
          label={it.k}
          value={
            it.sample ? (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                {it.v}
                <SampleMark />
              </span>
            ) : (
              it.v
            )
          }
        />
      ))}
    </div>
  );
}

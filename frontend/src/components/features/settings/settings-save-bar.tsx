/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { SaveBar } from "#/components/features/settings/settings-kit";
import {
  useSettingsDoc,
  useSaveSettingsDoc,
} from "#/hooks/query/use-cloudguard";

/**
 * Drop-in, backend-persisted Save bar for any settings tab.
 *
 * - On first load, hydrates the tab's form state from `/settings/{tab}` by calling
 *   `onLoad(doc)` once (so a refresh restores the last saved edits — no field is lost).
 * - Tracks dirty by comparing the live `doc` (assembled by the tab from its own state)
 *   against the last-saved baseline. The Save button appears the moment any field changes.
 * - On Save, PUTs the WHOLE doc to `/settings/{tab}` (every field round-trips, no mock).
 * - On Discard, reverts the form to the last-saved baseline via `onLoad`.
 *
 * The tab owns its field state; this component owns persistence + the dirty UI.
 */
export function SettingsSaveBar({
  tab,
  doc,
  onLoad,
}: {
  tab: string;
  doc: Record<string, unknown>;
  onLoad: (d: Record<string, unknown>) => void;
}) {
  const docQ = useSettingsDoc(tab);
  const save = useSaveSettingsDoc(tab);
  const [baseline, setBaseline] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState(0);
  const loaded = React.useRef(false);

  React.useEffect(() => {
    if (loaded.current) return;
    if (docQ.isError) {
      loaded.current = true;
      setBaseline(JSON.stringify(doc));
      return;
    }
    if (docQ.data) {
      loaded.current = true;
      const hasData = Object.keys(docQ.data).length > 0;
      if (hasData) onLoad(docQ.data);
      // Baseline = what the form will show after hydration (saved doc), or the current
      // defaults when nothing has been saved yet.
      setBaseline(JSON.stringify(hasData ? docQ.data : doc));
    }
  }, [docQ.data, docQ.isError]);

  const cur = JSON.stringify(doc);
  const dirty = baseline !== null && cur !== baseline;

  return (
    <SaveBar
      dirty={dirty}
      saving={save.isPending}
      savedAt={savedAt}
      onSave={() =>
        save.mutate(doc, {
          onSuccess: () => {
            setBaseline(cur);
            setSavedAt(Date.now());
          },
        })
      }
      onDiscard={() => {
        if (baseline) onLoad(JSON.parse(baseline));
      }}
    />
  );
}

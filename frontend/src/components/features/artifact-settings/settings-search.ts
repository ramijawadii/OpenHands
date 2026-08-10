/**
 * Instant search over every setting in the registry.
 *
 * Same engine as the admin top bar's global search (`@orama/orama`, in-memory,
 * client-side) but indexed on this tab alone. The registry is roughly 140 keys
 * across eleven views and nine collapsible groups, which means the thing an
 * operator wants is usually two clicks and a scroll away — and mid-incident
 * that is the difference between using the tab and guessing.
 *
 * Everything searchable is already public structure: labels, hints, group and
 * view names, and the dotted key. No values are indexed. That matters — values
 * carry account identifiers, repository names and destinations, and an index is
 * a copy; keeping it to structure means the search box cannot leak what the
 * page itself redacts.
 */
import { create, insertMultiple, search } from "@orama/orama";
import { SETTINGS_VIEWS } from "./settings-structure";

export interface SettingHit {
  id: string;
  key: string;
  label: string;
  hint: string;
  group: string;
  groupId: string;
  view: string;
  viewId: string;
}

function buildEntries(): SettingHit[] {
  return SETTINGS_VIEWS.flatMap((view) =>
    view.groups.flatMap((group) =>
      group.fields.map((field) => ({
        id: field.key,
        key: field.key,
        label: field.label,
        hint: field.hint ?? "",
        group: group.label,
        groupId: group.id,
        view: view.label,
        viewId: view.id,
      })),
    ),
  );
}

const ENTRIES = buildEntries();
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

const db = create({
  schema: {
    id: "string",
    key: "string",
    label: "string",
    hint: "string",
    group: "string",
    view: "string",
  },
});
insertMultiple(db, ENTRIES);

/**
 * Ranked matches.
 *
 * Label is boosted hardest because an operator searching "egress" wants the
 * egress control, not the six fields whose hint happens to mention egress. The
 * dotted key is indexed too, so someone who knows `session.net.mode` from the
 * API can jump straight to it.
 */
export function searchSettings(term: string, limit = 12): SettingHit[] {
  const q = term.trim();
  if (q.length < 2) return [];
  const res = search(db, {
    term: q,
    properties: ["label", "hint", "group", "view", "key"],
    boost: { label: 5, group: 2, view: 1.5, key: 1.5, hint: 1 },
    tolerance: 1,
    limit,
  }) as unknown as { hits?: { document: { id: string } }[] };

  return (res.hits ?? [])
    .map((h) => BY_ID.get(h.document.id))
    .filter((e): e is SettingHit => Boolean(e));
}

export function settingCount(): number {
  return ENTRIES.length;
}

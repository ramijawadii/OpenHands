import { useEffect, useRef } from "react";
import {
  useCollection,
  useAddCollectionItem,
  useUpdateCollectionItem,
  useRemoveCollectionItem,
} from "#/hooks/query/use-cloudguard";
import type { CGCollectionItem } from "#/api/cloudguard-service";

/**
 * Backend-persisted list (`/collections/{seg}`, admin-gated + audited) with one-time demo
 * seeding. Returns the live items plus add/update/remove that hit the API and invalidate the
 * cache, so every mutation survives a refresh (no more local-only state).
 *
 * Seeding: the collection starts empty. The first time a browser loads an empty collection it
 * POSTs `seed` once and sets a localStorage flag, so the list starts populated for the demo —
 * but a user who then deletes everything does NOT get it re-seeded on the next load.
 *
 * Items carry the backend-assigned `id`; callers MUST key/update/remove by `item.id`.
 */
export function useLiveCollection(
  seg: string,
  seed: Record<string, unknown>[],
) {
  const q = useCollection(seg);
  const addM = useAddCollectionItem(seg);
  const updM = useUpdateCollectionItem(seg);
  const remM = useRemoveCollectionItem(seg);
  const seeding = useRef(false);
  const flag = `cg-seeded-${seg}`;

  useEffect(() => {
    if (seeding.current) return;
    if (q.isLoading || q.isError) return;
    const items = q.data ?? [];
    if (items.length > 0) {
      localStorage.setItem(flag, "1");
      return;
    }
    if (localStorage.getItem(flag)) return; // seeded once already (then emptied) — respect it
    if (!seed.length) return;
    seeding.current = true;
    localStorage.setItem(flag, "1");
    (async () => {
      // sequential POSTs keep the display order stable
      // eslint-disable-next-line no-restricted-syntax
      for (const s of seed) {
        // eslint-disable-next-line no-await-in-loop
        await addM.mutateAsync(s);
      }
      seeding.current = false;
    })().catch(() => {
      seeding.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.isLoading, q.isError, q.data]);

  return {
    items: (q.data ?? []) as CGCollectionItem[],
    loading: q.isLoading,
    add: (body: Record<string, unknown>) => addM.mutate(body),
    update: (id: string, body: Record<string, unknown>) =>
      updM.mutate({ id, body }),
    remove: (id: string) => remM.mutate(id),
  };
}

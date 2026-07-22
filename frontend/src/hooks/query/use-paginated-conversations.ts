import { useEffect } from "react";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useIsAuthed } from "./use-is-authed";

type Page = Awaited<
  ReturnType<typeof ConversationService.getUserConversations>
>;

// Local cache so the history list paints INSTANTLY on reopen instead of showing
// a spinner while the network round-trips (the "too long to show" problem). It
// holds only the first page — enough for the immediate view — and is always
// revalidated against the server, which then replaces it.
const CACHE_KEY = "cg-conv-cache-v1";

function readCache(): InfiniteData<Page, string | undefined> | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const results = JSON.parse(raw);
    if (!Array.isArray(results) || !results.length) return undefined;
    return {
      pages: [{ results, next_page_id: undefined } as unknown as Page],
      pageParams: [undefined],
    };
  } catch {
    return undefined;
  }
}

function writeCache(results: unknown[]) {
  try {
    // cap what we persist so a huge history can't blow the storage quota
    localStorage.setItem(CACHE_KEY, JSON.stringify(results.slice(0, 100)));
  } catch {
    /* quota — non-fatal */
  }
}

export const usePaginatedConversations = (limit: number = 20) => {
  const { data: userIsAuthenticated } = useIsAuthed();

  const query = useInfiniteQuery({
    queryKey: ["user", "conversations", "paginated", limit],
    queryFn: ({ pageParam }) =>
      ConversationService.getUserConversations(limit, pageParam),
    enabled: !!userIsAuthenticated,
    getNextPageParam: (lastPage) => lastPage.next_page_id,
    initialPageParam: undefined as string | undefined,
    // Serve cached data as fresh for 30s so switching away and back doesn't
    // refetch; keep it in memory for 10 min so remounts are instant.
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    // Keep the previous list visible while a background refetch runs.
    placeholderData: (prev) => prev,
    // Instant first paint from localStorage; `initialDataUpdatedAt: 0` marks it
    // stale so the server is still queried and the real data replaces it.
    initialData: () => readCache(),
    initialDataUpdatedAt: 0,
  });

  // persist the freshest first page for the next open
  useEffect(() => {
    const first = query.data?.pages?.[0]?.results;
    if (first?.length) writeCache(first);
  }, [query.data]);

  return query;
};

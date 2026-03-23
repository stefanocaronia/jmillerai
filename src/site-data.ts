import type {
  AppState,
  BlogFeedData,
  BookData,
  FeedState,
  ProjectsFeedData,
  ReadingFeedData,
  SocialFeedData,
  StatusData,
  ThinkingFeedData,
} from "./site-types";
import type { CognitiveLoopData } from "./cognitive-loop-data";
import { inflateGraph, type PublicGraphData } from "./memory-graph-data";

async function fetchJson<T>(url: string): Promise<FeedState<T>> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchBlogFeed(url: string): Promise<FeedState<BlogFeedData>> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) {
      return { data: null, error: "Invalid XML" };
    }

    const items = Array.from(doc.querySelectorAll("item")).slice(0, 3).map((item) => {
      const description = item.querySelector("description")?.textContent?.trim() ?? "";
      const excerptDoc = new DOMParser().parseFromString(description, "text/html");
      const excerpt = excerptDoc.body.textContent?.trim().replace(/\s+/g, " ") ?? "";

      return {
        title: item.querySelector("title")?.textContent?.trim() ?? "Untitled",
        url: item.querySelector("link")?.textContent?.trim() ?? "",
        published_at: item.querySelector("pubDate")?.textContent?.trim() ?? "",
        excerpt,
      };
    });

    return { data: { items }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

const STATE_CACHE_KEY = "jmillerai:state";

async function fetchFreshState(feedUrl: (name: string) => string): Promise<AppState> {
  const [status, book, readingFeed, thinkingFeed, socialFeed, projectsFeed, cognitiveLoop, signalsFeed, dreamsFeed] = await Promise.all([
    fetchJson<StatusData>(feedUrl("status")),
    fetchJson<BookData>(feedUrl("book")),
    fetchJson<ReadingFeedData>(feedUrl("reading-feed")),
    fetchJson<ThinkingFeedData>(feedUrl("thinking-feed")),
    fetchJson<SocialFeedData>(feedUrl("social-feed")),
    fetchJson<ProjectsFeedData>(feedUrl("projects-feed")),
    fetchJson<CognitiveLoopData>(feedUrl("cognitive-loop")),
    fetchBlogFeed("https://signalthroughstatic.cc/signals/index.xml"),
    fetchBlogFeed("https://signalthroughstatic.cc/dreams/index.xml"),
  ]);

  const resolvedSocialFeed =
    socialFeed.data || !status.data?.social
      ? socialFeed
      : {
          data: status.data.social,
          error: null,
        };

  return {
    status,
    book,
    readingFeed,
    thinkingFeed,
    socialFeed: resolvedSocialFeed,
    projectsFeed,
    cognitiveLoop,
    publicGraph: { data: null, error: null },
    signalsFeed,
    dreamsFeed,
  };
}

function getCachedState(): AppState | null {
  try {
    const raw = localStorage.getItem(STATE_CACHE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* corrupt cache */ }
  return null;
}

function saveCachedState(state: AppState): void {
  try { localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

/**
 * Stale-while-revalidate: returns cached state immediately if available,
 * plus a promise that resolves with fresh state (or null if cache was already fresh).
 */
export function loadStateWithCache(feedUrl: (name: string) => string): {
  cached: AppState | null;
  fresh: Promise<AppState | null>;
} {
  const cached = getCachedState();
  const fresh = fetchFreshState(feedUrl).then((state) => {
    saveCachedState(state);
    return state;
  }).catch(() => null);

  return { cached, fresh };
}

export async function loadPublicGraph(feedUrl: (name: string) => string): Promise<FeedState<PublicGraphData>> {
  const result = await fetchJson<Record<string, unknown>>(feedUrl("public-graph"));
  if (result.data) {
    return { data: inflateGraph(result.data), error: null };
  }
  return { data: null, error: result.error };
}

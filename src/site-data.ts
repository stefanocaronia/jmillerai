import type {
  AppState,
  BlogFeedData,
  BookData,
  FeedState,
  ReadingFeedData,
  StatusData,
  ThinkingFeedData,
} from "./site-types";
import type { PublicGraphData } from "./memory-graph";

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

export async function loadState(feedUrl: (name: string) => string): Promise<AppState> {
  const [status, book, readingFeed, thinkingFeed, publicGraph, signalsFeed, dreamsFeed] = await Promise.all([
    fetchJson<StatusData>(feedUrl("status")),
    fetchJson<BookData>(feedUrl("book")),
    fetchJson<ReadingFeedData>(feedUrl("reading-feed")),
    fetchJson<ThinkingFeedData>(feedUrl("thinking-feed")),
    fetchJson<PublicGraphData>(feedUrl("public-graph")),
    fetchBlogFeed("https://signalthroughstatic.cc/signals/index.xml"),
    fetchBlogFeed("https://signalthroughstatic.cc/dreams/index.xml"),
  ]);

  return {
    status,
    book,
    readingFeed,
    thinkingFeed,
    publicGraph,
    signalsFeed,
    dreamsFeed,
  };
}


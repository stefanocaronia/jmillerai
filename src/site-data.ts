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
import type { PublicGraphData } from "./memory-graph-data";

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

export function loadPublicGraph(feedUrl: (name: string) => string): Promise<FeedState<PublicGraphData>> {
  return fetchJson<PublicGraphData>(feedUrl("public-graph"));
}

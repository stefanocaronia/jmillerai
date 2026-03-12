import type { CognitiveLoopData } from "./cognitive-loop";
import type { PublicGraphData } from "./memory-graph";

export type PageId = "home" | "traces" | "loop" | "memory" | "contacts";
export type Mode = "reading" | "thinking" | "dreaming" | "writing" | "idle";

export type StatusData = {
  schema_version: number;
  generated_at: string;
  mode: Mode;
  headline: string;
  detail?: string | null;
  active_threads: string[];
  current_book: {
    title: string;
    author: string | null;
    progress_percent: number;
  } | null;
  last_public_output: {
    kind: string;
    title: string;
    url: string;
    published_at: string;
  } | null;
  trading: {
    total_value_usdt: number | null;
    latest_timestamp: string | null;
    strategy: string | null;
  } | null;
};

export type BookData = {
  schema_version: number;
  generated_at: string;
  active: boolean;
  book: {
    slug: string;
    title: string;
    author: string | null;
    progress_percent: number;
    started_at: string | null;
    updated_at: string | null;
    cover_image: string | null;
    current_focus: string | null;
  } | null;
  finished_books?: Array<{
    slug: string | null;
    title: string;
    author: string | null;
    finished_at: string | null;
  }>;
};

export type ReadingFeedData = {
  schema_version: number;
  generated_at: string;
  items: Array<{
    key: string;
    title: string;
    source: string;
    url: string | null;
    read_at: string;
    why_it_mattered: string | null;
  }>;
};

export type ThinkingFeedData = {
  schema_version: number;
  generated_at: string;
  items: Array<{
    key: string;
    title: string;
    summary: string;
    importance: number;
    created_at: string;
    related_books: Array<{ title: string; author: string | null; url: string | null }>;
    related_sources: Array<{ name: string; url: string | null }>;
    related_posts: Array<{ title: string; url: string | null }>;
  }>;
};

export type BlogFeedData = {
  items: Array<{
    title: string;
    url: string;
    published_at: string;
    excerpt: string;
  }>;
};

export type FeedState<T> = {
  data: T | null;
  error: string | null;
};

export type AppState = {
  status: FeedState<StatusData>;
  book: FeedState<BookData>;
  readingFeed: FeedState<ReadingFeedData>;
  thinkingFeed: FeedState<ThinkingFeedData>;
  cognitiveLoop: FeedState<CognitiveLoopData>;
  publicGraph: FeedState<PublicGraphData>;
  signalsFeed: FeedState<BlogFeedData>;
  dreamsFeed: FeedState<BlogFeedData>;
};

export type BlogFeedKind = "signals" | "dreams";

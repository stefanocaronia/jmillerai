import type { CognitiveLoopData } from "./cognitive-loop";
import type { PublicGraphData } from "./memory-graph";

export type PageId = "home" | "traces" | "surface" | "loop" | "mind" | "contacts" | "devlog";
export type Mode = string;

export type StatusData = {
  schema_version: number;
  generated_at: string;
  last_mode: Mode | null;
  current_mode: Mode | null;
  headline: string;
  headline_en?: string | null;
  detail?: string | null;
  detail_en?: string | null;
  active_threads: string[];
  active_threads_en?: string[] | null;
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
  social?: SocialFeedData | null;
  related?: Array<{ kind: string; label: string; label_en?: string | null; relation: string }>;
  cognition?: {
    criticality: number;
    exploration: number;
    grounding: number;
    novelty: number;
    public_dimensions?: Array<{
      internal_key: string;
      public_key: string;
      label: string;
      description: string;
      value: number;
    }>;
  } | null;
  affect?: {
    created_at: string;
    source: string;
    state: {
      valence: number;
      arousal: number;
      certainty: number;
      coping: number;
      curiosity: number;
      saturation: number;
    };
    public_dimensions?: Array<{
      internal_key: string;
      public_key: string;
      label: string;
      description: string;
      value: number;
    }>;
  } | null;
  peer_signals?: Array<{
    label: string;
    url: string;
    description: string;
  }> | null;
};

export type BookData = {
  schema_version: number;
  generated_at: string;
  active: boolean;
  book: {
    slug: string;
    title: string;
    title_en?: string | null;
    author: string | null;
    progress_percent: number;
    started_at: string | null;
    updated_at: string | null;
    cover_image: string | null;
    current_focus: string | null;
    current_focus_en?: string | null;
  } | null;
  last_source?: {
    title: string;
    source: string;
    url: string | null;
    read_at: string | null;
    thought: string | null;
    thought_en?: string | null;
  } | null;
  last_essay?: {
    title: string;
    title_en?: string | null;
    author: string | null;
    read_at: string | null;
    thought: string | null;
    thought_en?: string | null;
  } | null;
  finished_books?: Array<{
    slug: string | null;
    title: string;
    title_en?: string | null;
    author: string | null;
    started_at?: string | null;
    finished_at: string | null;
    review_url?: string | null;
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
    why_it_mattered_en?: string | null;
  }>;
};

export type ThinkingFeedData = {
  schema_version: number;
  generated_at: string;
  items: Array<{
    key: string;
    title: string;
    title_en?: string | null;
    summary?: string;
    summary_en?: string | null;
    content?: string;
    content_en?: string | null;
    importance: number;
    originality?: number | null;
    solidity?: number | null;
    tags?: string[];
    tags_en?: string[] | null;
    created_at: string;
    related?: Array<{ kind: string; label: string; label_en?: string | null; relation: string }>;
    related_books?: Array<{ title: string; author: string | null; url: string | null }>;
    related_sources?: Array<{ name: string; url: string | null }>;
    related_posts?: Array<{ title: string; url: string | null }>;
  }>;
};

export type SocialFeedData = {
  schema_version?: number;
  generated_at?: string;
  handle: string;
  profile_url: string;
  latest_at: string | null;
  items: Array<{
    key: string;
    action: string;
    action_label: string;
    origin: string | null;
    occurred_at: string;
    url: string | null;
    actor: string | null;
    content?: string | null;
    summary: string;
    summary_en?: string | null;
  }>;
};

export type ProjectsFeedData = {
  schema_version: number;
  generated_at: string;
  has_current: boolean;
  current: {
    slug: string;
    title: string;
    title_en?: string | null;
    description: string | null;
    description_en?: string | null;
    language: string | null;
    platform: string | null;
    status: string;
    version: string | null;
    repo_url: string | null;
    pages_url: string | null;
    created_at: string | null;
    updated_at: string | null;
    recent_activity?: Array<{
      type: string;
      message?: string;
      title?: string;
      sha_short?: string;
      number?: number;
      date: string;
    }>;
  } | null;
  completed: Array<{
    slug: string;
    title: string;
    description: string | null;
    language: string | null;
    platform: string | null;
    version: string | null;
    repo_url: string | null;
    pages_url: string | null;
    updated_at: string | null;
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
  socialFeed: FeedState<SocialFeedData>;
  projectsFeed: FeedState<ProjectsFeedData>;
  cognitiveLoop: FeedState<CognitiveLoopData>;
  publicGraph: FeedState<PublicGraphData>;
  signalsFeed: FeedState<BlogFeedData>;
  dreamsFeed: FeedState<BlogFeedData>;
};

export type BlogFeedKind = "signals" | "dreams";

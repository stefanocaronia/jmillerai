import "./style.css";

type PageId = "home" | "map";
type Mode = "reading" | "thinking" | "dreaming" | "writing" | "idle";

type StatusData = {
  schema_version: number;
  generated_at: string;
  mode: Mode;
  headline: string;
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
};

type BookData = {
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
};

type ReadingFeedData = {
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

type ThinkingFeedData = {
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

type PublicGraphData = {
  schema_version: number;
  generated_at: string;
  nodes: Array<{ id: string; kind: string; label: string; url: string | null }>;
  edges: Array<{ source: string; target: string; relation: string; strength: number }>;
};

type BlogFeedData = {
  items: Array<{
    title: string;
    url: string;
    published_at: string;
  }>;
};

type FeedState<T> = {
  data: T | null;
  error: string | null;
};

type AppState = {
  status: FeedState<StatusData>;
  book: FeedState<BookData>;
  readingFeed: FeedState<ReadingFeedData>;
  thinkingFeed: FeedState<ThinkingFeedData>;
  publicGraph: FeedState<PublicGraphData>;
  signalsFeed: FeedState<BlogFeedData>;
  dreamsFeed: FeedState<BlogFeedData>;
};

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root");
}

const app: HTMLDivElement = appRoot;
const page = (document.body.dataset.page as PageId | undefined) ?? "home";

const baseUrl = import.meta.env.BASE_URL;
const configuredFeedBase = (import.meta.env.VITE_PUBLIC_FEED_BASE as string | undefined)?.replace(/\/+$/, "");
const feedUrl = (name: string) =>
  configuredFeedBase ? `${configuredFeedBase}/${name}.json` : `${baseUrl}data/${name}.json`;

const pageUrl = (pageId: PageId): string => (pageId === "home" ? baseUrl : `${baseUrl}${pageId}.html`);

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return timeFormat.format(date);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

    const items = Array.from(doc.querySelectorAll("item")).slice(0, 3).map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() ?? "Untitled",
      url: item.querySelector("link")?.textContent?.trim() ?? "",
      published_at: item.querySelector("pubDate")?.textContent?.trim() ?? "",
    }));

    return { data: { items }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function renderFeedError<T>(feed: FeedState<T>, label: string): string {
  if (feed.error) {
    return `<p class="empty-state">Unable to load ${escapeHtml(label)}: ${escapeHtml(feed.error)}</p>`;
  }
  if (!feed.data) {
    return `<p class="empty-state">${escapeHtml(label)} unavailable.</p>`;
  }
  return "";
}

function renderTagList(items: string[]): string {
  if (items.length === 0) {
    return `<p class="muted-copy">No active threads.</p>`;
  }

  return `
    <ul class="tag-list">
      ${items.map((item) => `<li>#${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderRelatedList(items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  return `
    <div class="related-list">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function renderHeader(): string {
  return `
    <header class="site-header">
      <a class="site-title" href="${escapeHtml(pageUrl("home"))}">J. Miller AI</a>
      <nav class="site-nav" aria-label="Primary">
        <a href="${escapeHtml(pageUrl("home"))}" class="${page === "home" ? "is-active" : ""}">home</a>
        <a href="${escapeHtml(pageUrl("map"))}" class="${page === "map" ? "is-active" : ""}">map</a>
      </nav>
    </header>
  `;
}

function renderMapHeader(): string {
  return `
    <header class="page-header">
      <h1>Map</h1>
      <p class="body-copy">A filtered graph surface: selected memories, books, sources, and public posts.</p>
    </header>
  `;
}

function renderIntro(): string {
  return `
    <section class="section-block">
      <div class="text-flow">
        <p class="body-copy">
          J. Miller AI is a long-running project started by Stefano Caronia. It runs as a local cognitive system with memory,
          reading loops, thinking, dream compression, and a public surface that only receives filtered snapshots.
        </p>
        <p class="body-copy">
          The site is in English. The live traces stay in Italian because that is Miller's working language.
          The public site never talks directly to the runtime. It only reads exported static data.
        </p>
        <p class="body-copy">
          Internally the loop is simple: gather traces, collide them, read deeper, compress, and only then decide what can become public.
        </p>
      </div>
    </section>
  `;
}

function renderCurrentState(status: FeedState<StatusData>): string {
  if (!status.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Current state</span>
        </div>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Current state</span>
        <span class="section-meta">${escapeHtml(formatDate(status.data.generated_at))}</span>
      </div>
      <h2>${escapeHtml(status.data.mode)}</h2>
      <p class="body-copy">${escapeHtml(status.data.headline)}</p>
    </section>
  `;
}

function renderCurrentlyReading(book: FeedState<BookData>): string {
  if (!book.data || !book.data.book) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Currently reading</span>
        </div>
        ${renderFeedError(book, "book feed")}
      </section>
    `;
  }

  const active = book.data.book;

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Currently reading</span>
        <span class="section-meta">${escapeHtml(formatDate(active.updated_at))}</span>
      </div>
      <h2>${escapeHtml(active.title)}</h2>
      <p class="body-copy">${escapeHtml(active.author ?? "Unknown author")}</p>
      <div class="progress-meter">
        <span style="width:${active.progress_percent.toFixed(1)}%"></span>
      </div>
      <p class="section-note">${active.progress_percent.toFixed(1)}%</p>
    </section>
  `;
}

function renderActiveThreads(status: FeedState<StatusData>): string {
  if (!status.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Active threads</span>
        </div>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Active threads</span>
        <span class="section-meta">${escapeHtml(status.data.mode)}</span>
      </div>
      ${renderTagList(status.data.active_threads)}
    </section>
  `;
}

function renderReadingTrace(feed: FeedState<ReadingFeedData>, limit = 6): string {
  if (!feed.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Reading trace</span>
        </div>
        ${renderFeedError(feed, "reading feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Reading trace</span>
      </div>
      <div class="stream-list">
        ${feed.data.items.slice(0, limit).map((item) => {
          const title = item.url
            ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
            : escapeHtml(item.title);

          return `
            <article class="stream-item">
              <div class="section-line">
                <span class="section-name section-name-small">${escapeHtml(item.source)}</span>
                <span class="section-meta">${escapeHtml(formatDate(item.read_at))}</span>
              </div>
              <h3>${title}</h3>
              ${item.why_it_mattered ? `<p class="muted-copy">${escapeHtml(item.why_it_mattered)}</p>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderThinkingFeed(feed: FeedState<ThinkingFeedData>, limit = 5): string {
  if (!feed.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Thinking feed</span>
        </div>
        ${renderFeedError(feed, "thinking feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Thinking feed</span>
      </div>
      <div class="stream-list">
        ${feed.data.items.slice(0, limit).map((item) => {
          const related = [
            ...item.related_books.map((book) => book.title),
            ...item.related_sources.map((source) => source.name),
            ...item.related_posts.map((post) => post.title),
          ].slice(0, 4);

          return `
            <article class="stream-item">
              <div class="section-line">
                <span class="section-name section-name-small">importance ${item.importance}</span>
                <span class="section-meta">${escapeHtml(formatDate(item.created_at))}</span>
              </div>
              <h3>${escapeHtml(item.title)}</h3>
              <p class="body-copy">${escapeHtml(item.summary)}</p>
              ${renderRelatedList(related)}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderBlogFeedBlock(label: string, feed: FeedState<BlogFeedData>): string {
  if (!feed.data) {
    return `
      <div class="blog-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(label)}</span>
        </div>
        ${renderFeedError(feed, `${label.toLowerCase()} feed`)}
      </div>
    `;
  }

  return `
    <div class="blog-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(label)}</span>
      </div>
      <div class="stream-list">
        ${feed.data.items.map((item) => `
          <article class="stream-item">
            <div class="section-line">
              <span class="section-name section-name-small">${escapeHtml(label)}</span>
              <span class="section-meta">${escapeHtml(formatDate(item.published_at))}</span>
            </div>
            <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderBlog(signalsFeed: FeedState<BlogFeedData>, dreamsFeed: FeedState<BlogFeedData>): string {
  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Blog</span>
      </div>
      ${renderBlogFeedBlock("Signals", signalsFeed)}
      ${renderBlogFeedBlock("Dreams", dreamsFeed)}
    </section>
  `;
}

function renderMap(graph: FeedState<PublicGraphData>): string {
  if (!graph.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Map</span>
        </div>
        ${renderFeedError(graph, "public graph")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Map</span>
        <span class="section-meta">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <p class="body-copy">${graph.data.nodes.length} nodes, ${graph.data.edges.length} edges.</p>
      <ul class="node-list">
        ${graph.data.nodes.slice(0, 12).map((node) => `
          <li>
            <span class="section-name section-name-small">${escapeHtml(node.kind)}</span>
            <span>${escapeHtml(node.label)}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderHomePage(state: AppState): string {
  return `
    ${renderIntro()}
    ${renderCurrentState(state.status)}
    ${renderCurrentlyReading(state.book)}
    ${renderActiveThreads(state.status)}
    ${renderReadingTrace(state.readingFeed)}
    ${renderThinkingFeed(state.thinkingFeed)}
    ${renderBlog(state.signalsFeed, state.dreamsFeed)}
  `;
}

function renderMapPage(state: AppState): string {
  return `
    ${renderMapHeader()}
    ${renderMap(state.publicGraph)}
  `;
}

function renderPageContent(state: AppState): string {
  if (page === "map") {
    return renderMapPage(state);
  }

  return renderHomePage(state);
}

function renderShell(state: AppState): string {
  return `
    <div class="site-shell">
      ${renderHeader()}
      ${renderPageContent(state)}
    </div>
  `;
}

async function loadState(): Promise<AppState> {
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

async function start() {
  app.innerHTML = `<div class="loading">Loading public snapshots...</div>`;
  const state = await loadState();
  app.innerHTML = renderShell(state);
}

void start();

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
};

const BLOG_LINKS = [
  { label: "Signals", href: "https://signalthroughstatic.cc/signals/" },
  { label: "Dreams", href: "https://signalthroughstatic.cc/dreams/" },
  { label: "Connections", href: "https://signalthroughstatic.cc/connections/" },
] as const;

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

function renderFeedError<T>(feed: FeedState<T>, label: string): string {
  if (feed.error) {
    return `<p class="empty-state">Unable to load ${escapeHtml(label)}: ${escapeHtml(feed.error)}</p>`;
  }
  if (!feed.data) {
    return `<p class="empty-state">${escapeHtml(label)} unavailable.</p>`;
  }
  return "";
}

function renderChips(items: string[]): string {
  if (items.length === 0) {
    return `<span class="muted-copy">No active threads.</span>`;
  }
  return items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");
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

function renderPageHeader(title: string, copy: string): string {
  return `
    <header class="page-header">
      <h1>${escapeHtml(title)}</h1>
      <p class="body-copy">${escapeHtml(copy)}</p>
    </header>
  `;
}

function renderLiveSnapshot(status: FeedState<StatusData>): string {
  if (!status.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="terminal-label">Live snapshot</span>
        </div>
        <h2>Unavailable</h2>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="terminal-label">Live snapshot</span>
        <span class="timestamp">${escapeHtml(formatDate(status.data.generated_at))}</span>
      </div>
      <h2>${escapeHtml(status.data.mode)}</h2>
      <p class="body-copy">${escapeHtml(status.data.headline)}</p>
    </section>
  `;
}

function renderCurrentBook(book: FeedState<BookData>): string {
  if (!book.data || !book.data.book) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="terminal-label">Current book</span>
        </div>
        <h2>No active book</h2>
        ${renderFeedError(book, "book feed")}
      </section>
    `;
  }

  const active = book.data.book;

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="terminal-label">Current book</span>
        <span class="timestamp">${escapeHtml(formatDate(active.updated_at))}</span>
      </div>
      <h2>${escapeHtml(active.title)}</h2>
      <p class="body-copy">${escapeHtml(active.author ?? "Unknown author")}</p>
      <div class="progress-meter">
        <span style="width:${active.progress_percent.toFixed(1)}%"></span>
      </div>
      <p class="terminal-note">${active.progress_percent.toFixed(1)}%</p>
      <p class="muted-copy">${escapeHtml(active.current_focus ?? "No current focus available.")}</p>
    </section>
  `;
}

function renderActiveThreads(status: FeedState<StatusData>): string {
  if (!status.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="terminal-label">Active threads</span>
        </div>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="terminal-label">Active threads</span>
        <span class="timestamp">${escapeHtml(status.data.mode)}</span>
      </div>
      <div class="chip-row">${renderChips(status.data.active_threads)}</div>
    </section>
  `;
}

function renderReadingItems(feed: FeedState<ReadingFeedData>, limit: number): string {
  if (!feed.data) {
    return renderFeedError(feed, "reading feed");
  }

  return feed.data.items.slice(0, limit).map((item) => {
    const title = item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title);

    return `
      <article class="stream-item">
        <div class="section-line">
          <span class="terminal-label">${escapeHtml(item.source)}</span>
          <span class="timestamp">${escapeHtml(formatDate(item.read_at))}</span>
        </div>
        <h3>${title}</h3>
        ${item.why_it_mattered ? `<p class="muted-copy">${escapeHtml(item.why_it_mattered)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderReading(feed: FeedState<ReadingFeedData>, limit = 6): string {
  return `
    <section class="section-block">
      <div class="section-line">
        <span class="terminal-label">Reading trace</span>
      </div>
      <div class="stream-list">${renderReadingItems(feed, limit)}</div>
    </section>
  `;
}

function renderThinkingItems(feed: FeedState<ThinkingFeedData>, limit: number): string {
  if (!feed.data) {
    return renderFeedError(feed, "thinking feed");
  }

  return feed.data.items.slice(0, limit).map((item) => {
    const related = [
      ...item.related_books.map((book) => book.title),
      ...item.related_sources.map((source) => source.name),
      ...item.related_posts.map((post) => post.title),
    ].slice(0, 4);

    return `
      <article class="stream-item">
        <div class="section-line">
          <span class="terminal-label">Importance ${item.importance}</span>
          <span class="timestamp">${escapeHtml(formatDate(item.created_at))}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="body-copy">${escapeHtml(item.summary)}</p>
        <div class="chip-row">${renderChips(related)}</div>
      </article>
    `;
  }).join("");
}

function renderThinking(feed: FeedState<ThinkingFeedData>, limit = 5): string {
  return `
    <section class="section-block">
      <div class="section-line">
        <span class="terminal-label">Thinking feed</span>
      </div>
      <div class="stream-list">${renderThinkingItems(feed, limit)}</div>
    </section>
  `;
}

function renderBlog(status: FeedState<StatusData>): string {
  const latest = status.data?.last_public_output ?? null;

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="terminal-label">Blog</span>
      </div>
      ${
        latest
          ? `
            <h2>${escapeHtml(latest.title)}</h2>
            <p class="muted-copy">${escapeHtml(formatDate(latest.published_at))}</p>
            <a class="plain-link" href="${escapeHtml(latest.url)}" target="_blank" rel="noreferrer">Open latest post</a>
          `
          : `
            <h2>No public post</h2>
            <p class="muted-copy">The blog surface is quiet right now.</p>
          `
      }
      <div class="link-list">
        ${BLOG_LINKS.map((link) => `
          <a class="plain-link" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMap(graph: FeedState<PublicGraphData>): string {
  if (!graph.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="terminal-label">Public map</span>
        </div>
        ${renderFeedError(graph, "public graph")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="terminal-label">Public map</span>
        <span class="timestamp">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <p class="body-copy">${graph.data.nodes.length} nodes, ${graph.data.edges.length} edges.</p>
      <ul class="node-list">
        ${graph.data.nodes.slice(0, 12).map((node) => `
          <li>
            <span class="terminal-label">${escapeHtml(node.kind)}</span>
            <span>${escapeHtml(node.label)}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderHomePage(state: AppState): string {
  return `
    ${renderPageHeader(
      "J. Miller AI",
      "A public site for a persistent cognitive process with memory, reading, and filtered live traces.",
    )}

    <section class="section-block">
      <div class="home-text">
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

    ${renderLiveSnapshot(state.status)}
    ${renderCurrentBook(state.book)}
    ${renderActiveThreads(state.status)}
    ${renderReading(state.readingFeed)}
    ${renderThinking(state.thinkingFeed)}
    ${renderBlog(state.status)}
  `;
}

function renderMapPage(state: AppState): string {
  return `
    ${renderPageHeader(
      "Map",
      "A filtered graph surface: selected memories, books, sources, and public posts.",
    )}
    ${renderMap(state.publicGraph)}
  `;
}

function renderPageContent(state: AppState): string {
  switch (page) {
    case "map":
      return renderMapPage(state);
    case "home":
    default:
      return renderHomePage(state);
  }
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
  const [status, book, readingFeed, thinkingFeed, publicGraph] = await Promise.all([
    fetchJson<StatusData>(feedUrl("status")),
    fetchJson<BookData>(feedUrl("book")),
    fetchJson<ReadingFeedData>(feedUrl("reading-feed")),
    fetchJson<ThinkingFeedData>(feedUrl("thinking-feed")),
    fetchJson<PublicGraphData>(feedUrl("public-graph")),
  ]);

  return {
    status,
    book,
    readingFeed,
    thinkingFeed,
    publicGraph,
  };
}

async function start() {
  app.innerHTML = `<div class="loading">Loading public snapshots...</div>`;
  const state = await loadState();
  app.innerHTML = renderShell(state);
}

void start();

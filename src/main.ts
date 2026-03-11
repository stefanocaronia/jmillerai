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

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root");
}

const app: HTMLDivElement = appRoot;

const baseUrl = import.meta.env.BASE_URL;
const configuredFeedBase = (import.meta.env.VITE_PUBLIC_FEED_BASE as string | undefined)?.replace(/\/+$/, "");
const feedUrl = (name: string) =>
  configuredFeedBase ? `${configuredFeedBase}/${name}.json` : `${baseUrl}data/${name}.json`;

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
    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function renderTagList(tags: string[]): string {
  if (tags.length === 0) {
    return `<span class="muted">No active tags</span>`;
  }

  return tags
    .map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`)
    .join("");
}

function renderFeedStatus<T>(feed: FeedState<T>, label: string): string {
  if (feed.error) {
    return `<div class="empty">Unable to load ${escapeHtml(label)}: ${escapeHtml(feed.error)}</div>`;
  }
  if (!feed.data) {
    return `<div class="empty">${escapeHtml(label)} unavailable.</div>`;
  }
  return "";
}

function renderStatusSection(status: FeedState<StatusData>): string {
  if (status.error || !status.data) {
    return `
      <section class="panel panel-wide">
        <div class="panel-header">
          <p class="eyebrow">Live Status</p>
          <h2>Current state unavailable</h2>
        </div>
        ${renderFeedStatus(status, "status feed")}
      </section>
    `;
  }

  const { data } = status;
  const currentBook = data.current_book
    ? `<p class="panel-meta">Current book: ${escapeHtml(data.current_book.title)} (${data.current_book.progress_percent.toFixed(1)}%)</p>`
    : `<p class="panel-meta">No active book</p>`;
  const lastOutput = data.last_public_output
    ? `<a class="mini-link" href="${escapeHtml(data.last_public_output.url)}" target="_blank" rel="noreferrer">${escapeHtml(data.last_public_output.title)}</a>`
    : `<span class="muted">No public output yet</span>`;

  return `
    <section class="panel panel-wide status-panel">
      <div class="panel-header">
        <p class="eyebrow">Live Status</p>
        <h2>${escapeHtml(data.mode)}</h2>
        <p class="panel-meta">Last update ${escapeHtml(formatDate(data.generated_at))}</p>
      </div>
      <p class="headline">${escapeHtml(data.headline)}</p>
      ${currentBook}
      <div class="chip-row">${renderTagList(data.active_threads)}</div>
      <div class="status-footer">
        <div>
          <span class="footer-label">Latest public output</span>
          ${lastOutput}
        </div>
        <div>
          <span class="footer-label">Working language</span>
          <span class="language-note">Italian live feed</span>
        </div>
      </div>
    </section>
  `;
}

function renderBookSection(book: FeedState<BookData>): string {
  if (book.error || !book.data || !book.data.book) {
    return `
      <section class="panel">
        <div class="panel-header">
          <p class="eyebrow">Current Reading</p>
          <h2>No active book</h2>
        </div>
        ${renderFeedStatus(book, "book feed")}
      </section>
    `;
  }

  const active = book.data.book;
  return `
    <section class="panel">
      <div class="panel-header">
        <p class="eyebrow">Current Reading</p>
        <h2>${escapeHtml(active.title)}</h2>
        <p class="panel-meta">${escapeHtml(active.author ?? "Unknown author")}</p>
      </div>
      <div class="reading-progress">
        <div class="progress-bar">
          <span style="width:${active.progress_percent.toFixed(1)}%"></span>
        </div>
        <p class="progress-value">${active.progress_percent.toFixed(1)}%</p>
      </div>
      <dl class="meta-grid">
        <div>
          <dt>Started</dt>
          <dd>${escapeHtml(formatDate(active.started_at))}</dd>
        </div>
        <div>
          <dt>Last progress</dt>
          <dd>${escapeHtml(formatDate(active.updated_at))}</dd>
        </div>
      </dl>
      <p class="focus-copy">${escapeHtml(active.current_focus ?? "No current focus available.")}</p>
    </section>
  `;
}

function renderReadingFeed(feed: FeedState<ReadingFeedData>): string {
  if (feed.error || !feed.data) {
    return `
      <section class="panel">
        <div class="panel-header">
          <p class="eyebrow">Reading Trace</p>
          <h2>Unavailable</h2>
        </div>
        ${renderFeedStatus(feed, "reading feed")}
      </section>
    `;
  }

  const items = feed.data.items.slice(0, 6);
  const list = items
    .map((item) => {
      const link = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
        : `<span>${escapeHtml(item.title)}</span>`;
      const why = item.why_it_mattered
        ? `<p class="item-note">${escapeHtml(item.why_it_mattered)}</p>`
        : "";
      return `
        <article class="feed-item">
          <div class="feed-topline">
            <span class="feed-source">${escapeHtml(item.source)}</span>
            <span class="feed-time">${escapeHtml(formatDate(item.read_at))}</span>
          </div>
          <h3>${link}</h3>
          ${why}
        </article>
      `;
    })
    .join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <p class="eyebrow">Reading Trace</p>
        <h2>Recent sources</h2>
      </div>
      <div class="feed-list">${list}</div>
    </section>
  `;
}

function renderThinkingFeed(feed: FeedState<ThinkingFeedData>): string {
  if (feed.error || !feed.data) {
    return `
      <section class="panel">
        <div class="panel-header">
          <p class="eyebrow">Thinking Feed</p>
          <h2>Unavailable</h2>
        </div>
        ${renderFeedStatus(feed, "thinking feed")}
      </section>
    `;
  }

  const items = feed.data.items.slice(0, 5);
  const list = items
    .map((item) => {
      const related = [
        ...item.related_books.map((book) => book.title),
        ...item.related_sources.map((source) => source.name),
        ...item.related_posts.map((post) => post.title),
      ].slice(0, 4);

      return `
        <article class="thought-item">
          <div class="feed-topline">
            <span class="importance">Importance ${item.importance}</span>
            <span class="feed-time">${escapeHtml(formatDate(item.created_at))}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <div class="chip-row">${renderTagList(related)}</div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <p class="eyebrow">Thinking Feed</p>
        <h2>Public insights</h2>
      </div>
      <div class="feed-list">${list}</div>
    </section>
  `;
}

function renderGraphSection(graph: FeedState<PublicGraphData>): string {
  if (graph.error || !graph.data) {
    return `
      <section class="panel panel-wide">
        <div class="panel-header">
          <p class="eyebrow">Public Graph</p>
          <h2>Unavailable</h2>
        </div>
        ${renderFeedStatus(graph, "public graph")}
      </section>
    `;
  }

  const { data } = graph;
  const sampleNodes = data.nodes.slice(0, 6).map((node) => `
    <li>
      <span class="node-kind">${escapeHtml(node.kind)}</span>
      <span>${escapeHtml(node.label)}</span>
    </li>
  `).join("");

  return `
    <section class="panel panel-wide">
      <div class="panel-header">
        <p class="eyebrow">Public Graph</p>
        <h2>Filtered memory map</h2>
        <p class="panel-meta">${data.nodes.length} nodes, ${data.edges.length} edges</p>
      </div>
      <p class="graph-copy">
        This is a public subgraph only: books, sources, blog posts, and selected memories.
        Friends, mail, and private memory remain excluded.
      </p>
      <ul class="node-list">${sampleNodes}</ul>
    </section>
  `;
}

function renderShell(state: AppState): string {
  return `
    <main class="site-shell">
      <section class="hero">
        <div class="hero-copy">
          <p class="hero-kicker">Project by Stefano Caronia</p>
          <h1>J. Miller AI</h1>
          <p class="hero-text">
            A public project site about an AI with continuity, recurrence, and a live cognitive trace.
            The framing is in English. The live feed stays in Italian, because that is Miller's working language.
          </p>
        </div>
        <div class="hero-note">
          <span class="note-label">Live boundary</span>
          <p>
            Public snapshots are exported from a protected local system, sanitized, then published as static JSON.
            The site never talks directly to Miller.
          </p>
        </div>
      </section>

      <section class="grid two-up">
        ${renderStatusSection(state.status)}
        ${renderBookSection(state.book)}
      </section>

      <section class="grid two-up">
        ${renderReadingFeed(state.readingFeed)}
        ${renderThinkingFeed(state.thinkingFeed)}
      </section>

      ${renderGraphSection(state.publicGraph)}
    </main>
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
  app.innerHTML = `<div class="loading">Loading live feeds...</div>`;
  const state = await loadState();
  app.innerHTML = renderShell(state);
}

void start();

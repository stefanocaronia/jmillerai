import "./style.css";

type PageId = "home" | "flow" | "live" | "map" | "about";
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

type NavItem = {
  id: PageId;
  label: string;
  href: string;
};

const FLOW_STEPS = [
  {
    name: "Experience",
    blurb: "Pulls in links, fragments, news, posts, and outside pressure.",
  },
  {
    name: "Thinking",
    blurb: "Builds collisions between memory, reading, graph distance, and fresh traces.",
  },
  {
    name: "Reading",
    blurb: "Stays on a thread long enough to understand it instead of skimming across many.",
  },
  {
    name: "Dream",
    blurb: "Compresses and reframes material overnight before it becomes public language.",
  },
  {
    name: "Blog",
    blurb: "Publishes only after sanitization and an explicit decision that a text can go out.",
  },
] as const;

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

const pageUrl = (pageId: PageId): string => {
  if (pageId === "home") {
    return baseUrl;
  }
  return `${baseUrl}${pageId}.html`;
};

const navItems: NavItem[] = [
  { id: "home", label: "Home", href: pageUrl("home") },
  { id: "flow", label: "Flow", href: pageUrl("flow") },
  { id: "live", label: "Live", href: pageUrl("live") },
  { id: "map", label: "Map", href: pageUrl("map") },
  { id: "about", label: "About", href: pageUrl("about") },
];

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

function renderTopbar(state: AppState): string {
  const timestamp = state.status.data ? formatDate(state.status.data.generated_at) : "offline";

  return `
    <header class="topbar">
      <a class="brand" href="${escapeHtml(pageUrl("home"))}">
        <span class="brand-mark">JM</span>
        <span class="brand-text">J. Miller AI</span>
      </a>
      <nav class="topnav" aria-label="Primary">
        ${navItems
          .map((item) => `
            <a href="${escapeHtml(item.href)}" class="${item.id === page ? "is-active" : ""}">
              ${escapeHtml(item.label)}
            </a>
          `)
          .join("")}
      </nav>
      <div class="status-chip">
        <span class="status-chip-dot" aria-hidden="true"></span>
        <span>Snapshot</span>
        <span class="status-chip-time">${escapeHtml(timestamp)}</span>
      </div>
    </header>
  `;
}

function renderPageHeader(kicker: string, title: string, copy: string): string {
  return `
    <header class="page-header">
      <p class="section-kicker">${escapeHtml(kicker)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="page-copy">${escapeHtml(copy)}</p>
    </header>
  `;
}

function renderLiveSnapshotCard(status: FeedState<StatusData>): string {
  if (!status.data) {
    return `
      <section class="panel panel-strong">
        <p class="section-kicker">Live snapshot</p>
        <h2>Unavailable</h2>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="panel panel-strong">
      <div class="mini-heading">
        <span class="terminal-label">Live snapshot</span>
        <span class="timestamp">${escapeHtml(formatDate(status.data.generated_at))}</span>
      </div>
      <h2>${escapeHtml(status.data.mode)}</h2>
      <p class="body-copy">${escapeHtml(status.data.headline)}</p>
    </section>
  `;
}

function renderCurrentBookCard(book: FeedState<BookData>): string {
  if (!book.data || !book.data.book) {
    return `
      <section class="panel panel-accent">
        <p class="section-kicker">Current book</p>
        <h2>No active book</h2>
        ${renderFeedError(book, "book feed")}
      </section>
    `;
  }

  const active = book.data.book;

  return `
    <section class="panel panel-accent">
      <div class="mini-heading">
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

function renderActiveThreadsCard(status: FeedState<StatusData>): string {
  if (!status.data) {
    return `
      <section class="panel">
        <p class="section-kicker">Active threads</p>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="mini-heading">
        <span class="terminal-label">Active threads</span>
        <span class="timestamp">${escapeHtml(status.data.mode)}</span>
      </div>
      <div class="chip-row">${renderChips(status.data.active_threads)}</div>
    </section>
  `;
}

function renderReadingList(feed: FeedState<ReadingFeedData>, limit: number): string {
  if (!feed.data) {
    return renderFeedError(feed, "reading feed");
  }

  return feed.data.items.slice(0, limit).map((item) => {
    const title = item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title);

    return `
      <article class="stream-item">
        <div class="mini-heading">
          <span class="terminal-label">${escapeHtml(item.source)}</span>
          <span class="timestamp">${escapeHtml(formatDate(item.read_at))}</span>
        </div>
        <h3>${title}</h3>
        ${item.why_it_mattered ? `<p class="body-copy muted-copy">${escapeHtml(item.why_it_mattered)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderReadingCard(feed: FeedState<ReadingFeedData>, limit = 4): string {
  return `
    <section class="panel">
      <p class="section-kicker">Reading trace</p>
      <div class="stream-list">
        ${renderReadingList(feed, limit)}
      </div>
    </section>
  `;
}

function renderThinkingList(feed: FeedState<ThinkingFeedData>, limit: number): string {
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
      <article class="stream-item stream-item-accent">
        <div class="mini-heading">
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

function renderThinkingCard(feed: FeedState<ThinkingFeedData>, limit = 4): string {
  return `
    <section class="panel panel-accent">
      <p class="section-kicker">Thinking feed</p>
      <div class="stream-list">
        ${renderThinkingList(feed, limit)}
      </div>
    </section>
  `;
}

function renderBlogCard(status: FeedState<StatusData>): string {
  const latest = status.data?.last_public_output ?? null;

  return `
    <section class="panel">
      <p class="section-kicker">Blog</p>
      ${
        latest
          ? `
            <div class="mini-heading">
              <span class="terminal-label">${escapeHtml(latest.kind)}</span>
              <span class="timestamp">${escapeHtml(formatDate(latest.published_at))}</span>
            </div>
            <h2>${escapeHtml(latest.title)}</h2>
            <a class="inline-link" href="${escapeHtml(latest.url)}" target="_blank" rel="noreferrer">Open latest post</a>
          `
          : `
            <h2>No public post</h2>
            <p class="muted-copy">The blog surface is quiet right now.</p>
          `
      }
      <div class="link-list">
        ${BLOG_LINKS.map((link) => `
          <a class="plain-link" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer">
            ${escapeHtml(link.label)}
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderFlowSection(): string {
  return `
    <section class="section-block">
      <div class="flow-grid">
        ${FLOW_STEPS.map((step, index) => `
          <article class="flow-node">
            <span class="flow-index">0${index + 1}</span>
            <h2>${escapeHtml(step.name)}</h2>
            <p class="body-copy">${escapeHtml(step.blurb)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGraphPreview(graph: FeedState<PublicGraphData>): string {
  if (!graph.data) {
    return renderFeedError(graph, "public graph");
  }

  return `
    <section class="panel panel-strong">
      <div class="metrics-row">
        <div class="metric-box">
          <span class="terminal-label">Nodes</span>
          <strong>${graph.data.nodes.length}</strong>
        </div>
        <div class="metric-box">
          <span class="terminal-label">Edges</span>
          <strong>${graph.data.edges.length}</strong>
        </div>
      </div>
      <ul class="node-grid">
        ${graph.data.nodes.slice(0, 8).map((node) => `
          <li class="node-card">
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
      "Home",
      "J. Miller AI",
      "A public site for a persistent cognitive process with memory, reading, and filtered live traces.",
    )}

    <section class="hero-grid">
      <div class="panel panel-strong hero-panel">
        <p class="hero-copy">
          The site stays in English. The live traces stay in Italian.
          Public data is exported as static snapshots from a protected local system.
        </p>
      </div>
      <div class="stack-column">
        ${renderLiveSnapshotCard(state.status)}
        ${renderCurrentBookCard(state.book)}
      </div>
    </section>

    <section class="home-grid">
      ${renderActiveThreadsCard(state.status)}
      ${renderReadingCard(state.readingFeed, 3)}
      ${renderBlogCard(state.status)}
    </section>
  `;
}

function renderFlowPage(): string {
  return `
    ${renderPageHeader(
      "Flow",
      "Cognitive flow",
      "The public loop is simple: take in traces, collide them, read deeply, compress, then decide whether something should be published.",
    )}
    ${renderFlowSection()}
  `;
}

function renderLivePage(state: AppState): string {
  return `
    ${renderPageHeader(
      "Live",
      "Live traces",
      "These are public snapshots of what Miller is reading and thinking. They are exported, sanitized, and published as static JSON.",
    )}

    <section class="live-grid">
      <div class="stack-column">
        ${renderLiveSnapshotCard(state.status)}
        ${renderCurrentBookCard(state.book)}
      </div>
      ${renderReadingCard(state.readingFeed, 6)}
      ${renderThinkingCard(state.thinkingFeed, 5)}
    </section>
  `;
}

function renderMapPage(state: AppState): string {
  return `
    ${renderPageHeader(
      "Map",
      "Public map",
      "This is only a filtered graph surface: selected memories, books, sources, and public posts.",
    )}
    ${renderGraphPreview(state.publicGraph)}
  `;
}

function renderAboutPage(): string {
  return `
    ${renderPageHeader(
      "About",
      "About",
      "Project notes, boundary notes, and the language choice for the live feed.",
    )}

    <section class="about-grid">
      <section class="panel">
        <p class="section-kicker">Project</p>
        <p class="body-copy">
          J. Miller AI is a long-running project started by Stefano Caronia.
          Stefano maintains the cognitive flow, the runtime boundary, and the public surface that appears here.
        </p>
      </section>

      <section class="panel panel-accent">
        <p class="section-kicker">Language</p>
        <p class="body-copy">
          The site framing is in English. The live traces remain in Italian because that is Miller's working language.
        </p>
      </section>

      <section class="panel">
        <p class="section-kicker">Boundary</p>
        <p class="body-copy">
          The public site never talks directly to the live runtime. It only reads exported, static, sanitized snapshots.
        </p>
      </section>
    </section>
  `;
}

function renderPageContent(state: AppState): string {
  switch (page) {
    case "flow":
      return renderFlowPage();
    case "live":
      return renderLivePage(state);
    case "map":
      return renderMapPage(state);
    case "about":
      return renderAboutPage();
    case "home":
    default:
      return renderHomePage(state);
  }
}

function renderShell(state: AppState): string {
  return `
    <div class="site-chassis">
      ${renderTopbar(state)}
      <main class="site-shell">
        ${renderPageContent(state)}
      </main>
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

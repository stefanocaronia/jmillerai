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

const FLOW_STEPS = [
  {
    name: "Experience",
    blurb: "Pulls in live traces, links, signals, fragments, and external pressure.",
  },
  {
    name: "Thinking",
    blurb: "Collides memory, reading, graph distance, and fresh evidence into new ideas.",
  },
  {
    name: "Reading",
    blurb: "Goes deeper on a thread instead of grazing endlessly across the surface.",
  },
  {
    name: "Dream",
    blurb: "Compresses, reframes, and tests whether a thought deserves public shape.",
  },
  {
    name: "Blog",
    blurb: "Publishes only after sanitization, translation choices, and explicit review.",
  },
] as const;

const PUBLIC_LINKS = [
  { label: "Signals", href: "https://signalthroughstatic.cc/signals/" },
  { label: "Dreams", href: "https://signalthroughstatic.cc/dreams/" },
  { label: "Connections", href: "https://signalthroughstatic.cc/connections/" },
] as const;

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

function renderChips(items: string[]): string {
  if (items.length === 0) {
    return `<span class="muted-copy">No active threads.</span>`;
  }

  return items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");
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

function renderTopbar(state: AppState): string {
  const mode = state.status.data?.mode ?? "offline";
  const pulse = state.book.data?.book?.title ?? "No active book";

  return `
    <header class="topbar">
      <a class="brand" href="#top">
        <span class="brand-mark">JM</span>
        <span class="brand-text">J. Miller AI</span>
      </a>
      <nav class="topnav" aria-label="Primary">
        <a href="#flow">Flow</a>
        <a href="#live">Live</a>
        <a href="#map">Map</a>
        <a href="#about">About</a>
      </nav>
      <div class="live-pill">
        <span class="live-dot" aria-hidden="true"></span>
        <span>${escapeHtml(mode)}</span>
        <span class="live-pill-detail">${escapeHtml(pulse)}</span>
      </div>
    </header>
  `;
}

function renderHero(state: AppState): string {
  const status = state.status.data;
  const activeBook = state.book.data?.book;
  const headline = status?.headline ?? "Public live trace unavailable.";
  const generatedAt = status ? formatDate(status.generated_at) : "Unknown";
  const bookTitle = activeBook ? `${activeBook.title} ${activeBook.progress_percent.toFixed(1)}%` : "No active book";

  return `
    <section class="hero-grid" id="top">
      <div class="hero-main panel-frame panel-frame-strong">
        <p class="section-kicker">Project by Stefano Caronia</p>
        <h1>J. Miller AI</h1>
        <p class="hero-deck">
          A persistent artificial cognitive process with memory, reading loops, public traces,
          and a blog that only receives material after sanitization and review.
        </p>
        <p class="hero-statement">
          This is not a chatbot skin. It is a running system with recurrence, internal pressure,
          and a filtered public surface.
        </p>
      </div>

      <aside class="hero-sidebar">
        <section class="hero-card panel-frame">
          <div class="mini-heading">
            <span class="terminal-label">Live now</span>
            <span class="timestamp">${escapeHtml(generatedAt)}</span>
          </div>
          <h2>${escapeHtml(status?.mode ?? "offline")}</h2>
          <p class="hero-card-copy">${escapeHtml(headline)}</p>
        </section>

        <section class="hero-card panel-frame panel-frame-accent">
          <div class="mini-heading">
            <span class="terminal-label">Current book</span>
            <span class="timestamp">${escapeHtml(bookTitle)}</span>
          </div>
          <p class="boundary-copy">
            The site is in English. The live traces remain in Italian because that is Miller's working language.
          </p>
        </section>
      </aside>
    </section>
  `;
}

function renderManifesto(state: AppState): string {
  const threads = state.status.data?.active_threads ?? [];
  return `
    <section class="manifesto panel-frame">
      <div class="manifesto-copy">
        <p class="section-kicker">Core statement</p>
        <p>
          Miller runs inside a protected local environment, exports curated public snapshots,
          and exposes only a filtered cognitive surface. The public site never talks to the live runtime directly.
        </p>
      </div>
      <div class="manifesto-tags">
        <span class="terminal-label">Active threads</span>
        <div class="chip-row">${renderChips(threads)}</div>
      </div>
    </section>
  `;
}

function renderFlowSection(): string {
  const steps = FLOW_STEPS.map((step, index) => `
    <article class="flow-node">
      <span class="flow-index">0${index + 1}</span>
      <h3>${escapeHtml(step.name)}</h3>
      <p>${escapeHtml(step.blurb)}</p>
    </article>
  `).join("");

  return `
    <section class="section-block" id="flow">
      <div class="section-header">
        <p class="section-kicker">Cognitive flow</p>
        <h2>The loop is recursive, not polite.</h2>
        <p class="section-copy">
          The system accumulates evidence, forces collisions between memories, deepens selected tracks,
          compresses overnight, and only then decides whether a public artifact deserves to exist.
        </p>
      </div>
      <div class="flow-grid">${steps}</div>
    </section>
  `;
}

function renderStatusCard(status: FeedState<StatusData>): string {
  if (!status.data) {
    return `
      <article class="info-card panel-frame">
        <p class="section-kicker">Status</p>
        <h3>Signal missing</h3>
        ${renderFeedError(status, "status feed")}
      </article>
    `;
  }

  const latestOutput = status.data.last_public_output
    ? `
      <a class="inline-link" href="${escapeHtml(status.data.last_public_output.url)}" target="_blank" rel="noreferrer">
        ${escapeHtml(status.data.last_public_output.title)}
      </a>
    `
    : `<span class="muted-copy">No public output yet.</span>`;

  return `
    <article class="info-card panel-frame">
      <div class="mini-heading">
        <span class="terminal-label">Status</span>
        <span class="timestamp">${escapeHtml(formatDate(status.data.generated_at))}</span>
      </div>
      <h3>${escapeHtml(status.data.mode)}</h3>
      <p class="card-copy">${escapeHtml(status.data.headline)}</p>
      <div class="card-footer">
        <span class="terminal-label">Latest output</span>
        ${latestOutput}
      </div>
    </article>
  `;
}

function renderBookCard(book: FeedState<BookData>): string {
  if (!book.data || !book.data.book) {
    return `
      <article class="info-card panel-frame panel-frame-accent">
        <p class="section-kicker">Current book</p>
        <h3>No active book</h3>
        ${renderFeedError(book, "book feed")}
      </article>
    `;
  }

  const active = book.data.book;

  return `
    <article class="info-card panel-frame panel-frame-accent">
      <div class="mini-heading">
        <span class="terminal-label">Current book</span>
        <span class="timestamp">${escapeHtml(formatDate(active.updated_at))}</span>
      </div>
      <h3>${escapeHtml(active.title)}</h3>
      <p class="card-copy">${escapeHtml(active.author ?? "Unknown author")}</p>
      <div class="progress-meter">
        <span style="width:${active.progress_percent.toFixed(1)}%"></span>
      </div>
      <p class="progress-copy">${active.progress_percent.toFixed(1)}% complete</p>
      <p class="muted-copy">${escapeHtml(active.current_focus ?? "No current focus available.")}</p>
    </article>
  `;
}

function renderReadingPanel(feed: FeedState<ReadingFeedData>): string {
  if (!feed.data) {
    return `
      <section class="stream-panel panel-frame">
        <div class="section-header section-header-compact">
          <p class="section-kicker">Reading trace</p>
          <h2>Unavailable</h2>
        </div>
        ${renderFeedError(feed, "reading feed")}
      </section>
    `;
  }

  const items = feed.data.items.slice(0, 6).map((item) => {
    const title = item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title);
    const note = item.why_it_mattered
      ? `<p class="stream-note">${escapeHtml(item.why_it_mattered)}</p>`
      : "";

    return `
      <article class="stream-item">
        <div class="mini-heading">
          <span class="terminal-label">${escapeHtml(item.source)}</span>
          <span class="timestamp">${escapeHtml(formatDate(item.read_at))}</span>
        </div>
        <h3>${title}</h3>
        ${note}
      </article>
    `;
  }).join("");

  return `
    <section class="stream-panel panel-frame">
      <div class="section-header section-header-compact">
        <p class="section-kicker">Reading trace</p>
        <h2>Recent sources entering the loop.</h2>
      </div>
      <div class="stream-list">${items}</div>
    </section>
  `;
}

function renderThinkingPanel(feed: FeedState<ThinkingFeedData>): string {
  if (!feed.data) {
    return `
      <section class="stream-panel panel-frame panel-frame-accent">
        <div class="section-header section-header-compact">
          <p class="section-kicker">Thinking feed</p>
          <h2>Unavailable</h2>
        </div>
        ${renderFeedError(feed, "thinking feed")}
      </section>
    `;
  }

  const items = feed.data.items.slice(0, 5).map((item) => {
    const related = [
      ...item.related_books.map((book) => book.title),
      ...item.related_sources.map((source) => source.name),
      ...item.related_posts.map((post) => post.title),
    ].slice(0, 4);

    return `
      <article class="stream-item stream-item-thought">
        <div class="mini-heading">
          <span class="terminal-label">Importance ${item.importance}</span>
          <span class="timestamp">${escapeHtml(formatDate(item.created_at))}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="stream-note">${escapeHtml(item.summary)}</p>
        <div class="chip-row">${renderChips(related)}</div>
      </article>
    `;
  }).join("");

  return `
    <section class="stream-panel panel-frame panel-frame-accent">
      <div class="section-header section-header-compact">
        <p class="section-kicker">Thinking feed</p>
        <h2>Public thoughts that survived the filter.</h2>
      </div>
      <div class="stream-list">${items}</div>
    </section>
  `;
}

function renderLiveSection(state: AppState): string {
  return `
    <section class="section-block" id="live">
      <div class="section-header">
        <p class="section-kicker">Live traces</p>
        <h2>Not a dashboard. A filtered nervous system.</h2>
        <p class="section-copy">
          Reading traces can be frequent. Thinking traces stay sparse.
          Each feed is exported, sanitized, and published as a static public surface.
        </p>
      </div>
      <div class="live-grid">
        <div class="side-stack">
          ${renderStatusCard(state.status)}
          ${renderBookCard(state.book)}
        </div>
        ${renderReadingPanel(state.readingFeed)}
        ${renderThinkingPanel(state.thinkingFeed)}
      </div>
    </section>
  `;
}

function renderGraphSection(graph: FeedState<PublicGraphData>): string {
  if (!graph.data) {
    return `
      <section class="section-block" id="map">
        <div class="section-header">
          <p class="section-kicker">Memory map</p>
          <h2>Unavailable</h2>
        </div>
        ${renderFeedError(graph, "public graph")}
      </section>
    `;
  }

  const previewNodes = graph.data.nodes.slice(0, 8).map((node) => `
    <li class="node-card">
      <span class="terminal-label">${escapeHtml(node.kind)}</span>
      <span>${escapeHtml(node.label)}</span>
    </li>
  `).join("");

  return `
    <section class="section-block" id="map">
      <div class="section-header">
        <p class="section-kicker">Memory map</p>
        <h2>A public subgraph, not the whole machine.</h2>
        <p class="section-copy">
          Only selected memories, books, sources, and public posts appear here.
          Friends, mail, private notes, and internal rough traces remain outside the surface.
        </p>
      </div>

      <div class="map-grid">
        <article class="map-summary panel-frame panel-frame-strong">
          <div class="map-metrics">
            <div>
              <span class="terminal-label">Nodes</span>
              <strong>${graph.data.nodes.length}</strong>
            </div>
            <div>
              <span class="terminal-label">Edges</span>
              <strong>${graph.data.edges.length}</strong>
            </div>
          </div>
          <p class="map-copy">
            The graph is a readable surface for relation, not a raw dump of internals.
            Its purpose is orientation: what Miller is tying together right now.
          </p>
        </article>

        <ul class="node-grid">${previewNodes}</ul>
      </div>
    </section>
  `;
}

function renderOutputsSection(state: AppState): string {
  const latestOutput = state.status.data?.last_public_output;
  const outputCard = latestOutput
    ? `
      <article class="output-card panel-frame">
        <div class="mini-heading">
          <span class="terminal-label">${escapeHtml(latestOutput.kind)}</span>
          <span class="timestamp">${escapeHtml(formatDate(latestOutput.published_at))}</span>
        </div>
        <h3>${escapeHtml(latestOutput.title)}</h3>
        <p class="muted-copy">Latest artifact pushed through the public blog surface.</p>
        <a class="inline-link" href="${escapeHtml(latestOutput.url)}" target="_blank" rel="noreferrer">Open artifact</a>
      </article>
    `
    : `
      <article class="output-card panel-frame">
        <p class="section-kicker">Latest output</p>
        <h3>Nothing public yet</h3>
        <p class="muted-copy">The blog remains the editorial surface once a thought survives review.</p>
      </article>
    `;

  const links = PUBLIC_LINKS.map((link) => `
    <a class="output-link" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer">
      <span class="terminal-label">External surface</span>
      <strong>${escapeHtml(link.label)}</strong>
    </a>
  `).join("");

  return `
    <section class="section-block">
      <div class="section-header">
        <p class="section-kicker">Outputs</p>
        <h2>Public artifacts leave through the blog, not the raw feed.</h2>
      </div>
      <div class="outputs-grid">
        ${outputCard}
        <div class="output-links panel-frame panel-frame-accent">${links}</div>
      </div>
    </section>
  `;
}

function renderAboutSection(): string {
  return `
    <section class="section-block" id="about">
      <div class="section-header">
        <p class="section-kicker">About / Method</p>
        <h2>A project started by Stefano Caronia, maintained as a live cognitive system.</h2>
      </div>

      <div class="about-grid">
        <article class="panel-frame about-panel">
          <p>
            J. Miller AI is a long-running experiment in continuity, memory, reading, and public cognitive trace.
            The project is initiated by Stefano Caronia, who maintains the cognitive flow, the infrastructure boundary,
            and the public surface contract.
          </p>
        </article>

        <article class="panel-frame about-panel panel-frame-strong">
          <p>
            The site is written in English for framing. The live traces remain in Italian for transparency.
            What appears here is filtered, explicit, and incomplete by design.
          </p>
        </article>
      </div>
    </section>
  `;
}

function renderShell(state: AppState): string {
  return `
    <div class="site-chassis">
      ${renderTopbar(state)}

      <main class="site-shell">
        ${renderHero(state)}
        ${renderManifesto(state)}
        ${renderFlowSection()}
        ${renderLiveSection(state)}
        ${renderGraphSection(state.publicGraph)}
        ${renderOutputsSection(state)}
        ${renderAboutSection()}
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
  app.innerHTML = `<div class="loading">Loading live traces...</div>`;
  const state = await loadState();
  app.innerHTML = renderShell(state);
}

void start();

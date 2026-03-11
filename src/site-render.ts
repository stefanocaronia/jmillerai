import type { PublicGraphData } from "./memory-graph";
import { CONTACT_SECTIONS, INTRO_PARAGRAPHS, SITE_SUBTITLE } from "./site-content";
import type { AppState, BlogFeedData, BlogFeedKind, BookData, FeedState, PageId, ReadingFeedData, StatusData, ThinkingFeedData } from "./site-types";
import { escapeHtml, formatDate, parseDate, summarizeText } from "./site-utils";

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

function renderHeader(page: PageId, pageUrl: (pageId: PageId) => string): string {
  return `
    <header class="site-header">
      <a class="site-title" href="${escapeHtml(pageUrl("home"))}">J. Miller AI</a>
      <p class="site-subtitle">${escapeHtml(SITE_SUBTITLE)}</p>
      <nav class="site-nav" aria-label="Primary">
        <a href="${escapeHtml(pageUrl("home"))}" class="${page === "home" ? "is-active" : ""}">traces</a>
        <a href="${escapeHtml(pageUrl("memory"))}" class="${page === "memory" ? "is-active" : ""}">memory</a>
        <a href="${escapeHtml(pageUrl("contacts"))}" class="${page === "contacts" ? "is-active" : ""}">contacts</a>
      </nav>
    </header>
  `;
}

function renderFooterSnapshot(state: AppState): string {
  const latest = [
    state.status.data?.generated_at,
    state.book.data?.generated_at,
    state.readingFeed.data?.generated_at,
    state.thinkingFeed.data?.generated_at,
    state.publicGraph.data?.generated_at,
  ]
    .map((value) => ({ value, timestamp: parseDate(value) }))
    .filter((entry): entry is { value: string; timestamp: number } => !!entry.value && entry.timestamp !== null)
    .sort((left, right) => right.timestamp - left.timestamp)[0];

  if (!latest) {
    return "";
  }

  return `<span class="site-footer-snapshot">Snapshot ${escapeHtml(formatDate(latest.value))}</span>`;
}

function renderIntro(): string {
  return `
    <section class="section-block">
      <div class="text-flow">
        ${INTRO_PARAGRAPHS.map((paragraph) => `<p class="body-copy">${escapeHtml(paragraph)}</p>`).join("")}
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
      <h2 class="state-title">${escapeHtml(status.data.headline)}</h2>
      ${status.data.detail ? `<p class="body-copy">${escapeHtml(status.data.detail)}</p>` : ""}
      <div class="state-inline">
        <span class="kind-badge">${escapeHtml(status.data.mode)}</span>
      </div>
      ${renderTagList(status.data.active_threads)}
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
  const progress = active.progress_percent.toFixed(1);

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Currently reading</span>
        <span class="section-meta">${escapeHtml(formatDate(active.updated_at))}</span>
      </div>
      <h2>${escapeHtml(active.title)}</h2>
      <p class="body-copy">${escapeHtml(active.author ?? "Unknown author")}</p>
      <div class="progress-meter">
        <span class="progress-meter-fill" data-progress="${escapeHtml(progress)}"></span>
      </div>
      <p class="section-note">${progress}%</p>
      ${active.current_focus ? `<p class="muted-copy">${escapeHtml(active.current_focus)}</p>` : ""}
    </section>
  `;
}

function renderReadingArchive(book: FeedState<BookData>): string {
  const items = book.data?.finished_books ?? [];
  if (items.length === 0) {
    return "";
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Reading archive</span>
        <span class="section-meta">${items.length}</span>
      </div>
      <ul class="book-archive-list">
        ${items.map((item) => `
          <li>
            <span class="book-archive-title">${escapeHtml(item.title)}</span>
            <span class="muted-copy">${escapeHtml(item.author ?? "Unknown author")}</span>
            ${item.finished_at ? `<span class="section-meta">${escapeHtml(formatDate(item.finished_at))}</span>` : ""}
          </li>
        `).join("")}
      </ul>
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

function renderTrading(status: FeedState<StatusData>): string {
  if (!status.data || !status.data.trading) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Trading</span>
        </div>
        <p class="muted-copy">Trading snapshot unavailable.</p>
      </section>
    `;
  }

  const trading = status.data.trading;
  const total = trading.total_value_usdt !== null
    ? `${trading.total_value_usdt.toFixed(2)} USDT`
    : "Unknown total";
  const timestamp = trading.latest_timestamp ?? status.data.generated_at;
  const strategy = trading.strategy ?? "Strategy snapshot unavailable.";

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Trading</span>
        <span class="section-meta">${escapeHtml(formatDate(timestamp))}</span>
      </div>
      <h2>${escapeHtml(total)}</h2>
      <p class="body-copy">${escapeHtml(strategy)}</p>
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
              <p class="body-copy">${escapeHtml(summarizeText(item.summary))}</p>
              ${renderRelatedList(related)}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderBlogFeedBlock(kind: BlogFeedKind, feed: FeedState<BlogFeedData>): string {
  if (!feed.data) {
    return `
      <div class="blog-block">
        ${renderFeedError(feed, `${kind} feed`)}
      </div>
    `;
  }

  return `
    <div class="blog-block">
      <div class="stream-list">
        ${feed.data.items.map((item) => `
          <article class="stream-item">
            <div class="section-line">
              <span class="section-name section-name-small">${kind}</span>
              <span class="section-meta">${escapeHtml(formatDate(item.published_at))}</span>
            </div>
            <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
            <p class="muted-copy">${escapeHtml(summarizeText(item.excerpt, 190))}</p>
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
        <span class="section-name">Blog _ Signal Through Static</span>
      </div>
      ${renderBlogFeedBlock("signals", signalsFeed)}
      ${renderBlogFeedBlock("dreams", dreamsFeed)}
    </section>
  `;
}

function renderLastMemories(graph: FeedState<PublicGraphData>): string {
  if (!graph.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Latest memories</span>
        </div>
        ${renderFeedError(graph, "public graph")}
      </section>
    `;
  }

  const memories = graph.data.nodes
    .filter((node) => node.kind === "memory")
    .sort((left, right) => {
      const leftTime = parseDate(left.timestamp) ?? 0;
      const rightTime = parseDate(right.timestamp) ?? 0;
      return rightTime - leftTime;
    })
    .slice(0, 12);

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Latest memories</span>
        <span class="section-meta">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <p class="body-copy">${memories.length} public memory nodes from the latest exported graph snapshot.</p>
      <ul class="node-list">
        ${memories.map((node) => `
          <li>
            <span class="kind-badge">${escapeHtml(node.memory_type ?? node.kind)}</span>
            <span>${escapeHtml(node.label)}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderMemoryGraphBlock(graph: FeedState<PublicGraphData>): string {
  if (!graph.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Memory graph</span>
        </div>
        <p class="muted-copy">Graph canvas pending.</p>
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Memory graph</span>
        <span class="section-meta">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <div id="memory-graph-stage" class="memory-graph-stage"></div>
      <p class="muted-copy">Filtered live graph. Current snapshot: ${graph.data.nodes.length} nodes, ${graph.data.edges.length} edges.</p>
    </section>
  `;
}

function renderContactsPage(): string {
  return CONTACT_SECTIONS.map((section) => `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(section.title)}</span>
      </div>
      <ul class="contact-list">
        ${section.links.map((link) => `
          <li>
            <a class="plain-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>
            <p class="muted-copy">${escapeHtml(link.description)}</p>
          </li>
        `).join("")}
      </ul>
    </section>
  `).join("");
}

function renderHomePage(state: AppState): string {
  return `
    ${renderIntro()}
    ${renderCurrentState(state.status)}
    ${renderCurrentlyReading(state.book)}
    ${renderReadingArchive(state.book)}
    ${renderActiveThreads(state.status)}
    ${renderReadingTrace(state.readingFeed)}
    ${renderThinkingFeed(state.thinkingFeed)}
    ${renderBlog(state.signalsFeed, state.dreamsFeed)}
    ${renderTrading(state.status)}
  `;
}

function renderMapPage(state: AppState): string {
  return `
    ${renderLastMemories(state.publicGraph)}
    ${renderMemoryGraphBlock(state.publicGraph)}
  `;
}

function renderPageContent(state: AppState, page: PageId): string {
  if (page === "memory") {
    return renderMapPage(state);
  }

  if (page === "contacts") {
    return renderContactsPage();
  }

  return renderHomePage(state);
}

export function renderShell(state: AppState, page: PageId, pageUrl: (pageId: PageId) => string): string {
  return `
    <div class="site-shell">
      ${renderHeader(page, pageUrl)}
      ${renderPageContent(state, page)}
      <footer class="site-footer">
        <span>© 2026 Stefano Caronia — <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC BY-NC 4.0</a></span>
        ${renderFooterSnapshot(state)}
      </footer>
    </div>
  `;
}

export function applyProgressMeters(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(".progress-meter-fill").forEach((element) => {
    const raw = Number(element.dataset.progress ?? "0");
    const progress = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
    element.style.width = `${progress}%`;
  });
}


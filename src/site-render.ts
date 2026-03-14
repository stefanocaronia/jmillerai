import { isLoopDebugEnabled, projectLoopGraph, type CognitiveLoopData } from "./cognitive-loop";
import {
  getMemoryGraphEdgeLegend,
  getMemoryGraphLegend,
  getMemoryGraphStats,
  presentPublicMemoryTypeLabel,
  presentPublicNodeLabel,
  type PublicGraphData,
} from "./memory-graph";
import { CONTACT_SECTIONS, INTRO_SECTIONS, SITE_SUBTITLE } from "./site-content";
import type {
  AppState,
  BlogFeedData,
  BlogFeedKind,
  BookData,
  FeedState,
  PageId,
  ProjectsFeedData,
  ReadingFeedData,
  SocialFeedData,
  StatusData,
  ThinkingFeedData,
} from "./site-types";
import { escapeHtml, formatDate, parseDate, summarizeText } from "./site-utils";

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/+$/, "");
  } catch {
    return url;
  }
}

function versionPhase(version: string | null | undefined): string | null {
  if (!version) return null;
  const v = version.toLowerCase();
  if (v.includes("-rc")) return "rc";
  if (v.includes("-beta")) return "beta";
  if (v.includes("-alpha")) return "alpha";
  if (v.startsWith("0.")) return "alpha";
  return "stable";
}

function badgeClass(value: string | null | undefined): string {
  const key = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return key ? ` kind-badge--${key}` : "";
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

function countLoopConnections(edges: CognitiveLoopData["edges"]): number {
  return new Set(
    edges.map((edge) => [edge.source, edge.target].sort().join("::")),
  ).size;
}

function renderHeader(page: PageId, pageUrl: (pageId: PageId) => string): string {
  const titleIconUrl = `${import.meta.env.BASE_URL}favicon.svg`;

  return `
    <header class="site-header">
      <a class="site-title" href="${escapeHtml(pageUrl("home"))}">
        <img class="site-title__mark" src="${escapeHtml(titleIconUrl)}" alt="" aria-hidden="true" />
        <span>J. Miller AI</span>
      </a>
      <p class="site-subtitle">${escapeHtml(SITE_SUBTITLE)}</p>
      <nav class="site-nav" aria-label="Primary">
        <a href="${escapeHtml(pageUrl("home"))}" class="${page === "home" ? "is-active" : ""}">project</a>
        <a href="${escapeHtml(pageUrl("traces"))}" class="${page === "traces" ? "is-active" : ""}">traces</a>
        <a href="${escapeHtml(pageUrl("loop"))}" class="${page === "loop" ? "is-active" : ""}">loop</a>
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
    state.projectsFeed.data?.generated_at,
    state.cognitiveLoop.data?.generated_at,
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

function renderFooterBrand(): string {
  const titleIconUrl = `${import.meta.env.BASE_URL}favicon.svg`;

  return `
    <span class="site-footer-brand">
      <img class="site-footer-brand__mark" src="${escapeHtml(titleIconUrl)}" alt="" aria-hidden="true" />
      <span>J. Miller AI</span>
    </span>
  `;
}

function renderIntro(): string {
  return `
    <section class="section-block">
      <div class="text-flow">
        ${INTRO_SECTIONS.map((section) => `
          <article class="intro-section">
            ${section.title ? `
              <div class="section-line">
                <span class="section-name">${escapeHtml(section.title)}</span>
              </div>
            ` : ""}
            <div class="text-flow">
              ${section.paragraphs.map((paragraph) => `<p class="body-copy">${paragraph}</p>`).join("")}
            </div>
          </article>
        `).join("")}
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
      <div class="state-inline">
        <span class="kind-badge${badgeClass(status.data.mode)}">${escapeHtml(status.data.mode)}</span>
      </div>
      <h2 class="state-title">${escapeHtml(status.data.headline)}</h2>
      ${status.data.detail ? `<p class="body-copy">${escapeHtml(status.data.detail)}</p>` : ""}
      ${renderTagList(status.data.active_threads)}
    </section>
  `;
}

function renderLastSource(data: BookData): string {
  const src = data.last_source;
  if (!src) return "";
  return `
    <hr class="section-divider">
    <p class="subsection-label">Last source studied</p>
    <p class="subsection-title">${escapeHtml(src.title)}</p>
    <p class="muted-copy">${escapeHtml(src.source)}${src.read_at ? ` · ${escapeHtml(formatDate(src.read_at))}` : ""}</p>
    ${src.thought ? `<p class="muted-copy">${escapeHtml(src.thought)}</p>` : ""}
  `;
}

function renderLastEssay(data: BookData): string {
  const essay = data.last_essay;
  if (!essay) return "";
  return `
    <hr class="section-divider">
    <p class="subsection-label">Last essay read</p>
    <p class="subsection-title">${escapeHtml(essay.title)}</p>
    <p class="muted-copy">${escapeHtml(essay.author ?? "Unknown author")}${essay.read_at ? ` · ${escapeHtml(formatDate(essay.read_at))}` : ""}</p>
    ${essay.thought ? `<p class="muted-copy">${escapeHtml(essay.thought)}</p>` : ""}
  `;
}

function renderCurrentlyReading(book: FeedState<BookData>): string {
  if (!book.data || !book.data.book) {
    const hasExtras = book.data?.last_source || book.data?.last_essay;
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Currently reading</span>
        </div>
        ${!hasExtras ? renderFeedError(book, "book feed") : ""}
        ${book.data ? renderLastSource(book.data) : ""}
        ${book.data ? renderLastEssay(book.data) : ""}
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
      ${renderLastSource(book.data)}
      ${renderLastEssay(book.data)}
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

function renderSocialFeed(feed: FeedState<SocialFeedData>, limit = 6): string {
  if (!feed.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Social</span>
        </div>
        ${renderFeedError(feed, "social feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Social</span>
        <span class="section-meta">${feed.data.latest_at ? escapeHtml(formatDate(feed.data.latest_at)) : "No public actions yet"}</span>
      </div>
      <p class="body-copy">
        Public Bluesky activity from
        <a class="plain-link social-profile-link" href="${escapeHtml(feed.data.profile_url)}" target="_blank" rel="noreferrer">
          @${escapeHtml(feed.data.handle)}
        </a>.
      </p>
      ${
        feed.data.items.length
          ? `
        <div class="stream-list">
          ${feed.data.items.slice(0, limit).map((item) => `
            <article class="stream-item social-stream-item">
              <div class="section-line social-item-head">
                <div class="social-item-head-main">
                  <span class="kind-badge${badgeClass(item.action)}">${escapeHtml(item.action_label)}</span>
                  <span class="social-item-summary">${escapeHtml(item.summary)}</span>
                </div>
                <span class="section-meta">${escapeHtml(formatDate(item.occurred_at))}</span>
              </div>
              <div class="social-item-target">
                ${renderSocialTarget(item)}
              </div>
            </article>
          `).join("")}
        </div>
      `
          : `<p class="muted-copy">No public Bluesky interactions exported yet.</p>`
      }
    </section>
  `;
}

function renderSocialTarget(item: SocialFeedData["items"][number]): string {
  if (item.action === "post" && item.content) {
    return `<span class="social-item-label">${escapeHtml(item.content)}</span>`
  }
  const targetLabel = item.origin || item.actor || null
  if (!targetLabel) {
    return `<span class="muted-copy">No linked target</span>`
  }
  if (item.url) {
    return `<a class="social-item-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(targetLabel)}</a>`
  }
  return `<span class="social-item-label">${escapeHtml(targetLabel)}</span>`
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
    .slice(0, 18);

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Latest memories</span>
        <span class="section-meta">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <p class="body-copy">${memories.length} public memory nodes from the latest exported graph snapshot.</p>
      <ul class="node-list">
        ${memories.map((node) => {
          const label = node.memory_type === "conversation"
            ? (node.contact_label ? `Chat with a friend: ${node.contact_label}` : "Chat with a friend")
            : presentPublicNodeLabel(node);
          const badgeLabel = presentPublicMemoryTypeLabel(node.memory_type ?? node.kind);

          return `
            <li class="node-list-item">
              <span class="kind-badge${badgeClass(badgeLabel)}">${escapeHtml(badgeLabel)}</span>
              <span class="node-list-label">${escapeHtml(label)}</span>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

function renderMemoryGraphBlock(graph: FeedState<PublicGraphData>): string {
  if (!graph.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Memory network</span>
        </div>
        <p class="muted-copy">Graph canvas pending.</p>
      </section>
    `;
  }

  const stats = getMemoryGraphStats(graph.data);
  const legend = getMemoryGraphLegend();
  const edgeLegend = getMemoryGraphEdgeLegend();

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Memory network</span>
        <span class="section-meta">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <p class="body-copy">Current snapshot: ${stats.visibleNodes} visible nodes, ${stats.visibleEdges} visible edges.</p>
      <div id="memory-graph-stage" class="memory-graph-stage"></div>
      <div class="graph-legend-block" aria-label="Memory graph legends">
        <div>
          <div class="graph-legend-title">Node types</div>
          <div class="graph-legend">
            ${legend.map((item) => `
              <span class="graph-legend-item">
                <span class="graph-legend-dot" style="--legend-color: ${escapeHtml(item.color)}"></span>
                <span>${escapeHtml(item.label)}</span>
              </span>
            `).join("")}
          </div>
        </div>
        <div>
          <div class="graph-legend-title">Edge relations</div>
          <div class="graph-legend">
            ${edgeLegend.map((item) => `
              <span class="graph-legend-item">
                <span class="graph-edge-legend" style="--legend-color: ${escapeHtml(item.color)}"></span>
                <span>${escapeHtml(item.label)}</span>
              </span>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderLoopPage(loop: FeedState<CognitiveLoopData>): string {
  if (!loop.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Loop</span>
        </div>
        ${renderFeedError(loop, "cognitive loop")}
      </section>
    `;
  }

  const graph = projectLoopGraph(loop.data);
  const debugEnabled = isLoopDebugEnabled();

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Loop</span>
        <span class="section-meta">${escapeHtml(formatDate(loop.data.generated_at))}</span>
      </div>
      <p class="body-copy">${graph.nodes.length} nodes, ${countLoopConnections(graph.edges)} connections in the current exported loop.</p>
      ${debugEnabled ? `
        <div class="loop-debug-panel" data-loop-debug-panel>
          <div class="section-line">
            <span class="section-name">Local debug</span>
            <span class="section-meta">?loopDebug=1</span>
          </div>
          <p class="muted-copy" data-loop-debug-status>Preparing local controls...</p>
          <p class="muted-copy" data-loop-debug-edge>No edge selected.</p>
          <div class="loop-debug-actions">
            <button type="button" class="loop-debug-button" data-loop-debug-action="dump-nodes">Dump nodes</button>
            <button type="button" class="loop-debug-button" data-loop-debug-action="dump-curves">Dump curves</button>
            <button type="button" class="loop-debug-button" data-loop-debug-action="flip-curve">Flip edge</button>
            <button type="button" class="loop-debug-button" data-loop-debug-action="curve-less">Curve -</button>
            <button type="button" class="loop-debug-button" data-loop-debug-action="curve-more">Curve +</button>
            <button type="button" class="loop-debug-button" data-loop-debug-action="weight-less">Weight -</button>
            <button type="button" class="loop-debug-button" data-loop-debug-action="weight-more">Weight +</button>
            <button type="button" class="loop-debug-button" data-loop-debug-action="fit">Refit canvas</button>
          </div>
          <p class="muted-copy">Use <code>/loop/?loopDebug=1</code>. Drag nodes to log positions. Click an edge, then use the buttons to tweak and log <code>graphEdgeCurves</code>.</p>
        </div>
      ` : ""}
      <div id="cognitive-loop-stage" class="memory-graph-stage loop-graph-stage"></div>
    </section>
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Modules</span>
      </div>
      <div class="stream-list">
        ${loop.data.nodes.map((node) => `
          <article class="stream-item loop-module-item">
            <div class="section-line">
              <div class="module-meta">
                <span class="module-dot module-dot--${escapeHtml(node.kind)}" aria-hidden="true"></span>
                <span class="kind-badge kind-badge-loop kind-badge-loop--${escapeHtml(node.kind)}">${escapeHtml(node.kind)}</span>
              </div>
            </div>
            <h3 class="loop-module-title">${escapeHtml(node.label)}</h3>
            <p class="body-copy">${escapeHtml(node.summary)}</p>
            ${node.notes.length > 0 ? `<ul class="note-list">${node.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
          </article>
        `).join("")}
      </div>
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

function renderProjectPage(): string {
  return `
    ${renderIntro()}
  `;
}

function renderCurrentProject(feed: FeedState<ProjectsFeedData>): string {
  if (!feed.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Current project</span>
        </div>
        ${renderFeedError(feed, "projects feed")}
      </section>
    `;
  }

  if (!feed.data.current) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Current project</span>
        </div>
        <p class="muted-copy">No active project at the moment.</p>
      </section>
    `;
  }

  const project = feed.data.current;
  const tags = [project.language, project.platform].filter(Boolean);
  const projectLinks: string[] = [];
  if (project.repo_url) {
    projectLinks.push(`<li><a class="plain-link project-link" href="${escapeHtml(project.repo_url)}" target="_blank" rel="noreferrer"><svg class="project-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>Source code</a> <span class="muted-copy">(${escapeHtml(shortUrl(project.repo_url))})</span></li>`);
  }
  if (project.pages_url) {
    const phase = versionPhase(project.version);
    const previewParts = ["Preview", project.version ? `v${escapeHtml(project.version)}` : "", phase ? phase : ""].filter(Boolean).join(" ");
    projectLinks.push(`<li><a class="plain-link project-link" href="${escapeHtml(project.pages_url)}" target="_blank" rel="noreferrer"><svg class="project-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3"/><path d="M9 2h5v5"/><path d="M14 2L7 9"/></svg>${previewParts}</a> <span class="muted-copy">(${escapeHtml(shortUrl(project.pages_url))})</span></li>`);
  }
  const linksHtml = projectLinks.length
    ? `<ul class="project-links">${projectLinks.join("")}</ul>`
    : "";

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Current project</span>
        <span class="section-meta">${escapeHtml(formatDate(project.updated_at))}</span>
      </div>
      <h2>${escapeHtml(project.title)}</h2>
      <div class="state-inline">
        <span class="kind-badge${badgeClass(project.status)}">${escapeHtml(project.status)}</span>
        ${(() => { const phase = versionPhase(project.version); return phase ? `<span class="kind-badge${badgeClass(phase)}">${escapeHtml(phase)}</span>` : ""; })()}
        ${project.version ? `<span class="kind-badge kind-badge--version">v${escapeHtml(project.version)}</span>` : ""}
        ${tags.map((tag) => `<span class="kind-badge">${escapeHtml(tag!)}</span>`).join("")}
      </div>
      ${project.description ? `<p class="body-copy">${escapeHtml(project.description)}</p>` : ""}
      ${linksHtml}
    </section>
  `;
}

function renderProjectsArchive(feed: FeedState<ProjectsFeedData>): string {
  const items = feed.data?.completed ?? [];
  if (items.length === 0) {
    return "";
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Completed projects</span>
        <span class="section-meta">${items.length}</span>
      </div>
      <ul class="book-archive-list">
        ${items.map((item) => {
          const tags = [item.language, item.platform].filter(Boolean);
          const link = item.repo_url
            ? `<a class="plain-link" href="${escapeHtml(item.repo_url)}" target="_blank" rel="noreferrer">source code</a>`
            : "";
          const itemPhase = versionPhase(item.version);
          const releaseLabel = ["release", item.version ? `v${escapeHtml(item.version)}` : "", itemPhase ? itemPhase : ""].filter(Boolean).join(" ");
          const pages = item.pages_url
            ? `<a class="plain-link" href="${escapeHtml(item.pages_url)}" target="_blank" rel="noreferrer">${releaseLabel}</a>`
            : "";

          return `
            <li>
              <span class="book-archive-title">${escapeHtml(item.title)}</span>
              ${tags.length ? `<span class="muted-copy">${tags.map((t) => escapeHtml(t!)).join(" · ")}</span>` : ""}
              ${link}${pages}
              ${item.updated_at ? `<span class="section-meta">${escapeHtml(formatDate(item.updated_at))}</span>` : ""}
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

function renderTracesPage(state: AppState): string {
  return `
    ${renderCurrentState(state.status)}
    ${renderCurrentlyReading(state.book)}
    ${renderReadingArchive(state.book)}
    ${renderCurrentProject(state.projectsFeed)}
    ${renderProjectsArchive(state.projectsFeed)}
    ${renderReadingTrace(state.readingFeed)}
    ${renderThinkingFeed(state.thinkingFeed)}
    ${renderSocialFeed(state.socialFeed)}
    ${renderBlog(state.signalsFeed, state.dreamsFeed)}
    ${renderTrading(state.status)}
  `;
}

function renderMapPage(state: AppState): string {
  return `
    ${renderMemoryGraphBlock(state.publicGraph)}
    ${renderLastMemories(state.publicGraph)}
  `;
}

function renderPageContent(state: AppState, page: PageId): string {
  if (page === "home") {
    return renderProjectPage();
  }

  if (page === "traces") {
    return renderTracesPage(state);
  }

  if (page === "loop") {
    return renderLoopPage(state.cognitiveLoop);
  }

  if (page === "memory") {
    return renderMapPage(state);
  }

  if (page === "contacts") {
    return renderContactsPage();
  }

  return renderProjectPage();
}

export function renderShell(state: AppState, page: PageId, pageUrl: (pageId: PageId) => string): string {
  return `
    <div class="site-shell">
      ${renderHeader(page, pageUrl)}
      ${renderPageContent(state, page)}
      <footer class="site-footer">
        <span class="site-footer-meta">${renderFooterBrand()} <span>© 2026 S. Caronia / J. Miller <a class="site-license-link" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener"><span class="site-license-mark" aria-hidden="true">cc</span><span>CC BY-NC-SA 4.0</span></a> · <a href="https://github.com/stefanocaronia/jmillerai/blob/main/COPYRIGHT" target="_blank" rel="noopener">Copyright</a></span></span>
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

export function applySpoilerToggles(root: ParentNode): void {
  if (!(root instanceof HTMLElement) || root.dataset.spoilerBound === "true") {
    return;
  }

  root.dataset.spoilerBound = "true";
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLElement>("[data-spoiler-toggle]");
    if (!button || !root.contains(button)) {
      return;
    }

    const wrapper = button.closest<HTMLElement>("[data-spoiler]");
    const content = wrapper?.querySelector<HTMLElement>("[data-spoiler-content]");
    if (!wrapper || !content) {
      return;
    }

    button.remove();
    content.hidden = false;
  });
}

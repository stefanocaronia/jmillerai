import { isLoopDebugEnabled, nodePublicMode, projectLoopGraph, type CognitiveLoopData } from "./cognitive-loop";
import {
  getMemoryGraphEdgeLegend,
  getMemoryGraphLegend,
  getMemoryGraphStats,
  presentPublicMemoryTypeLabel,
  presentPublicNodeLabel,
  type PublicGraphData,
} from "./memory-graph";
import { CONTACT_SECTIONS, SITE_SUBTITLE } from "./site-content";
import introSections from "virtual:intro-sections";
import devlogPosts from "virtual:devlog-posts";
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
import { en, escapeHtml, formatDate, parseDate, truncateText } from "./site-utils";

function renderExpandable(text: string, maxLength = 220, cssClass = "body-copy", richFormat = false): string {
  const fmt = richFormat ? formatDetail : escapeHtml;
  const t = truncateText(text, maxLength);
  if (!t) return `<p class="${cssClass}">${fmt(text)}</p>`;
  return `<p class="${cssClass}">${fmt(t.short)} <a class="expand-toggle" href="javascript:void(0)">[...]</a><span class="expand-rest" hidden> ${fmt(t.rest)}</span></p>`;
}

function formatDetail(raw: string): string {
  const safe = raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return safe
    .replace(/\\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/^(Collisione|Nesso|Shift(?:\s+da\s+[^:]+)?|Nota|Legame|Origine|Traccia|Risultato):/gm,
      '<span class="detail-label">$1:</span>')
    .replace(/#(\d+)/g, '<span class="detail-ref">#$1</span>');
}

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

export function badgeClass(value: string | null | undefined): string {
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
  if (items.length === 0) return "";
  return `
    <ul class="tag-list">
      ${items.map((item) => `<li>#${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderRelatedList(items: Array<{ kind?: string; label: string }>, opts?: { small?: boolean; heading?: boolean }): string {
  if (items.length === 0) {
    return "";
  }

  const small = opts?.small ?? false;
  const heading = opts?.heading ?? false;
  const badgeSizeClass = small ? " kind-badge--sm" : "";

  return `
    ${heading ? `<hr class="section-divider" /><span class="subsection-label">Related</span>` : ""}
    <div class="related-list">
      ${items.map((item) => {
        const badge = item.kind ? `<span class="kind-badge${badgeSizeClass} kind-badge--${escapeHtml(item.kind)}">${escapeHtml(item.kind)}</span> ` : "";
        const label = item.label.charAt(0).toUpperCase() + item.label.slice(1);
        return `<span>${badge}${escapeHtml(label)}</span>`;
      }).join("")}
    </div>
  `;
}

function countLoopConnections(edges: CognitiveLoopData["edges"]): number {
  return new Set(
    edges.map((edge) => [edge.source, edge.target].sort().join("::")),
  ).size;
}

function renderHeader(page: PageId, pageUrl: (pageId: PageId) => string, mode?: string): string {
  const titleIconUrl = `${import.meta.env.BASE_URL}favicon.svg`;
  const effectiveMode = mode || "idle";
  const activeClass = effectiveMode !== "idle" ? " is-active-mode" : "";
  const modeBadge = `<span class="header-mode-group"><span class="header-mode-label">current state</span><span class="kind-badge${badgeClass(effectiveMode)} header-mode-badge${activeClass}" data-mode-badge>${escapeHtml(effectiveMode)}</span></span>`;

  return `
    <header class="site-header">
      <div class="site-header-top">
        <a class="site-title" href="${escapeHtml(pageUrl("home"))}">
          <img class="site-title__mark" src="${escapeHtml(titleIconUrl)}" alt="" aria-hidden="true" />
          <span>J. Miller AI</span>
        </a>
        ${modeBadge}
      </div>
      <p class="site-subtitle">${escapeHtml(SITE_SUBTITLE)}</p>
      <nav class="site-nav" aria-label="Primary">
        <a href="${escapeHtml(pageUrl("home"))}" class="${page === "home" ? "is-active" : ""}">project</a>
        <a href="${escapeHtml(pageUrl("traces"))}" class="${page === "traces" ? "is-active" : ""}">traces</a>
        <a href="${escapeHtml(pageUrl("surface"))}" class="${page === "surface" ? "is-active" : ""}">surface</a>
        <a href="${escapeHtml(pageUrl("loop"))}" class="${page === "loop" ? "is-active" : ""}">loop</a>
        <a href="${escapeHtml(pageUrl("mind"))}" class="${page === "mind" ? "is-active" : ""}">mind</a>
        <a href="${escapeHtml(pageUrl("devlog"))}" class="${page === "devlog" ? "is-active" : ""}">devlog</a>
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
        ${introSections.map((section) => `
          <article class="intro-section">
            ${section.title ? `
              <div class="section-line">
                <span class="section-name">${escapeHtml(section.title)}</span>
              </div>
            ` : ""}
            <div class="text-flow body-copy">
              ${section.html}
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
          <span class="section-name">Last cycle</span>
        </div>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Last cycle</span>
        <span class="section-meta">${escapeHtml(formatDate(status.data.generated_at))}</span>
      </div>
      <p class="muted-copy">Latest snapshot from Miller's cognitive loop.</p>
      ${(() => { const lm = status.data.last_mode ?? "idle"; return lm && lm !== "idle" ? `<div class="state-inline"><span class="kind-badge${badgeClass(lm)}">${escapeHtml(lm)}</span></div>` : ""; })()}
      <h2 class="state-title">${escapeHtml(en(status.data.headline, status.data.headline_en))}</h2>
      ${(() => { const d = en(status.data.detail, status.data.detail_en); return d ? renderExpandable(d, 300, "state-detail", true) : ""; })()}
      ${(() => { const threads = status.data.active_threads_en?.length ? status.data.active_threads_en : status.data.active_threads; return threads.length > 0 ? `
        <hr class="section-divider" />
        <span class="subsection-label">Active threads</span>
        ${renderTagList(threads)}
      ` : ""; })()}
      ${(() => { const rel = status.data.related ?? []; return rel.length > 0 ? renderRelatedList(rel.map((r) => ({ kind: r.kind, label: en(r.label, r.label_en) })).slice(0, 6), { small: true, heading: true }) : ""; })()}
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
      <p class="muted-copy">The book Miller is currently reading, processed slowly in small chunks across sessions.</p>
      <h2>${escapeHtml(en(active.title, active.title_en))}</h2>
      <p class="body-copy">${escapeHtml(active.author ?? "Unknown author")}</p>
      <div class="progress-meter">
        <span class="progress-meter-fill" data-progress="${escapeHtml(progress)}"></span>
      </div>
      <p class="section-note">${progress}%</p>
      ${(() => { const f = en(active.current_focus, active.current_focus_en); return f ? renderExpandable(f, 200, "muted-copy") : ""; })()}
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
      <p class="muted-copy">Live trading snapshot.</p>
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
      <p class="muted-copy">Recent sources and essays studied by Miller.</p>
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
              ${(() => { const w = en(item.why_it_mattered, item.why_it_mattered_en); return w ? `<p class="muted-copy">${escapeHtml(w)}</p>` : ""; })()}
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
      <p class="muted-copy">Raw thoughts emerging from the loop.</p>
      <div class="stream-list">
        ${feed.data.items.slice(0, limit).map((item) => {
          const metrics = [
            { label: "Importance", value: item.importance, max: 10, cls: "metric-bar--importance" },
            { label: "Originality", value: item.originality, max: 5, cls: "metric-bar--originality" },
            { label: "Solidity", value: item.solidity ?? 0, max: 5, cls: "metric-bar--solidity" },
          ];
          const bars = metrics
            .filter((m) => m.value != null)
            .map((m) => { const pct = m.value! / m.max; return `<span class="metric-bar ${m.cls}" title="${m.label}: ${m.value}/${m.max}" style="opacity:${(0.25 + pct * 0.75).toFixed(2)}"></span>`; })
            .join("");

          const relatedItems = item.related?.length
            ? item.related.map((r) => ({ kind: r.kind, label: en(r.label, r.label_en) })).slice(0, 4)
            : [
                ...(item.related_books ?? []).map((b) => ({ kind: "book" as const, label: b.title })),
                ...(item.related_sources ?? []).map((s) => ({ label: s.name })),
                ...(item.related_posts ?? []).map((p) => ({ label: p.title })),
              ].slice(0, 4);

          const tagSource = item.tags_en?.length ? item.tags_en : item.tags;
          const tags = tagSource?.length
            ? `<ul class="tag-list">${tagSource.map((t) => `<li>#${escapeHtml(t)}</li>`).join("")}</ul>`
            : "";

          return `
            <article class="stream-item">
              <div class="section-line">
                <span class="metric-bars">${bars}</span>
                <span class="section-meta">${escapeHtml(formatDate(item.created_at))}</span>
              </div>
              <h3>${escapeHtml(en(item.title, item.title_en))}</h3>
              ${renderExpandable(en(item.content ?? item.summary, item.content_en ?? item.summary_en) ?? "", 320, "muted-copy", true)}
              ${renderRelatedList(relatedItems, { small: true })}
              ${tags}
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
      <p class="muted-copy">
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
                  <span class="social-item-summary">${escapeHtml(en(item.summary, item.summary_en))}</span>
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
            ${renderExpandable(item.excerpt, 190, "muted-copy")}
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
        <span class="section-name">Personal blog</span>
      </div>
      <p class="muted-copy">Published on <a class="plain-link" href="https://signalthroughstatic.cc/" target="_blank" rel="noreferrer">Signal Through Static</a>.</p>
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
      <p class="muted-copy">${memories.length} public memory nodes from the latest exported graph snapshot.</p>
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
      <p class="muted-copy">Current snapshot: ${stats.visibleNodes} visible nodes, ${stats.visibleEdges} visible edges.</p>
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
      <p class="muted-copy">${graph.nodes.length} nodes, ${countLoopConnections(graph.edges)} connections in the current exported loop.</p>
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
        <span class="section-name">States</span>
      </div>
      <p class="muted-copy">Active states that make up Miller's cognitive loop.</p>
      <div class="stream-list">
        ${loop.data.nodes.filter((node) => node.id !== "memory" && node.id !== "short-state").map((node) => `
          <article class="stream-item loop-module-item">
            <div class="section-line">
              <div class="module-meta">
                ${(() => { const mode = nodePublicMode(node); return mode ? `<span class="kind-badge${badgeClass(mode)}">${escapeHtml(mode)}</span>` : `<span class="kind-badge">${escapeHtml(node.label)}</span>`; })()}
              </div>
            </div>
            <p class="body-copy loop-state-desc">${escapeHtml(en(node.summary, node.summary_en))}</p>
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

  const activityHtml = (() => {
    const items = project.recent_activity?.slice(0, 3);
    if (!items || items.length === 0) return "";
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return `
      <div class="recent-activity">
        <hr class="section-divider" />
        <span class="subsection-label">Recent activity</span>
        <div class="stream-list">
          ${items.map((item) => {
            const dateStr = formatDate(item.date);
            const typeLabel = item.type === "issue_closed" ? "issue closed" : item.type;
            const text = item.type === "issue_closed"
              ? `#${item.number ?? ""} ${escapeHtml(capitalize(item.title ?? ""))}`
              : escapeHtml(capitalize(item.message ?? item.title ?? ""));
            return `<article class="stream-item">
              <div class="section-line">
                <span class="activity-type-badge activity-type--${escapeHtml(item.type)}">${escapeHtml(typeLabel)}</span>
                <span class="section-meta">${escapeHtml(dateStr)}</span>
              </div>
              <p class="muted-copy">${text}</p>
            </article>`;
          }).join("")}
        </div>
      </div>`;
  })();

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Current project</span>
        <span class="section-meta">${escapeHtml(formatDate(project.updated_at))}</span>
      </div>
      <p class="muted-copy">Active development project on <a class="plain-link" href="https://github.com/josephusm" target="_blank" rel="noreferrer">GitHub</a>, built iteratively across multiple sessions.</p>
      <h2>${escapeHtml(en(project.title, project.title_en))}</h2>
      <div class="state-inline">
        <span class="kind-badge${badgeClass(project.status)}">${escapeHtml(project.status)}</span>
        ${(() => { const phase = versionPhase(project.version); return phase ? `<span class="kind-badge${badgeClass(phase)}">${escapeHtml(phase)}</span>` : ""; })()}
        ${project.version ? `<span class="kind-badge kind-badge--version">v${escapeHtml(project.version)}</span>` : ""}
        ${tags.map((tag) => `<span class="kind-badge">${escapeHtml(tag!)}</span>`).join("")}
      </div>
      ${(() => { const desc = en(project.description, project.description_en); return desc ? `<p class="body-copy">${escapeHtml(desc)}</p>` : ""; })()}
      ${linksHtml}
      ${activityHtml}
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
    ${renderReadingTrace(state.readingFeed)}
    ${renderReadingArchive(state.book)}
    ${renderThinkingFeed(state.thinkingFeed)}
  `;
}

function renderSurfacePage(state: AppState): string {
  return `
    ${renderCurrentProject(state.projectsFeed)}
    ${renderProjectsArchive(state.projectsFeed)}
    ${renderBlog(state.signalsFeed, state.dreamsFeed)}
    ${renderSocialFeed(state.socialFeed)}
    ${renderTrading(state.status)}
  `;
}

function renderCognitionRadar(status: FeedState<StatusData>): string {
  const cog = status.data?.cognition;
  if (!cog) return "";

  const axes: Array<{ key: string; label: string; value: number }> = [
    { key: "criticality", label: "Criticality", value: cog.criticality },
    { key: "exploration", label: "Exploration", value: cog.exploration },
    { key: "grounding", label: "Grounding", value: cog.grounding },
    { key: "novelty", label: "Novelty", value: cog.novelty },
  ];

  const cx = 230, cy = 175, r = 120;
  const n = axes.length;
  const angleOffset = -Math.PI / 2;

  function polarX(i: number, scale: number): number {
    return cx + r * scale * Math.cos(angleOffset + (2 * Math.PI * i) / n);
  }
  function polarY(i: number, scale: number): number {
    return cy + r * scale * Math.sin(angleOffset + (2 * Math.PI * i) / n);
  }

  const rings = [0.25, 0.5, 0.75, 1.0];
  const gridLines = rings.map((s) => {
    const pts = axes.map((_, i) => `${polarX(i, s)},${polarY(i, s)}`).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  }).join("");

  const spokes = axes.map((_, i) =>
    `<line x1="${cx}" y1="${cy}" x2="${polarX(i, 1)}" y2="${polarY(i, 1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`
  ).join("");

  const dataPoints = axes.map((a, i) => `${polarX(i, a.value)},${polarY(i, a.value)}`).join(" ");
  const dataShape = `<polygon points="${dataPoints}" fill="rgba(255,122,0,0.15)" stroke="var(--accent)" stroke-width="1.5"/>`;

  const dots = axes.map((a, i) =>
    `<circle cx="${polarX(i, a.value)}" cy="${polarY(i, a.value)}" r="3" fill="var(--accent)"/>`
  ).join("");

  const labels = axes.map((a, i) => {
    const lx = polarX(i, 1.22);
    const ly = polarY(i, 1.22);
    const anchor = i === 0 || i === 2 ? "middle" : i === 1 ? "start" : "end";
    return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="central" fill="var(--ink-muted)" font-family="Share Tech Mono, monospace" font-size="10" letter-spacing="0.06em" text-transform="uppercase">${escapeHtml(a.label)}</text>`;
  }).join("");

  const values = axes.map((a, i) => {
    const vx = polarX(i, a.value + 0.14);
    const vy = polarY(i, a.value + 0.14);
    const anchor = i === 0 || i === 2 ? "middle" : i === 1 ? "start" : "end";
    return `<text x="${vx}" y="${vy}" text-anchor="${anchor}" dominant-baseline="central" fill="var(--accent)" font-family="Share Tech Mono, monospace" font-size="9" letter-spacing="0.04em">${a.value.toFixed(2)}</text>`;
  }).join("");

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">Cognition</span>
      </div>
      <p class="muted-copy">Current cognitive parameter tuning.</p>
      <div class="cognition-radar-wrap">
        <svg class="cognition-radar" viewBox="0 0 460 360" xmlns="http://www.w3.org/2000/svg">
          ${gridLines}
          ${spokes}
          ${dataShape}
          ${dots}
          ${labels}
          ${values}
        </svg>
      </div>
    </section>
  `;
}

function renderMapPage(state: AppState): string {
  return `
    ${renderCognitionRadar(state.status)}
    ${renderMemoryGraphBlock(state.publicGraph)}
    ${renderLastMemories(state.publicGraph)}
  `;
}

const DEVLOG_PAGE_SIZE = 10;

function renderDevlogSinglePost(slug: string): string {
  const post = devlogPosts.find((p) => p.slug === slug);
  if (!post) return renderDevlogArchive();
  const timeMeta = post.time ? `, ${escapeHtml(post.time)}` : "";
  return `
    <article class="section-block" id="${escapeHtml(post.slug)}">
      <div class="section-line">
        <span class="section-name">${escapeHtml(post.title)}</span>
        <span class="section-meta">${escapeHtml(formatDate(post.date, false))}${timeMeta}</span>
      </div>
      <div class="devlog-body body-copy">${post.html}</div>
    </article>
    <div class="devlog-more-wrap devlog-single-back">
      <a class="devlog-more" href="${import.meta.env.BASE_URL}devlog/">&larr; all entries</a>
    </div>
  `;
}

function renderDevlogArchive(): string {
  if (devlogPosts.length === 0) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Devlog</span>
        </div>
        <p class="muted-copy">No entries yet.</p>
      </section>
    `;
  }

  const [latest, ...older] = devlogPosts;
  const listLimit = DEVLOG_PAGE_SIZE;

  return `
    <article class="section-block" id="${escapeHtml(latest.slug)}">
      <div class="section-line">
        <a class="section-name devlog-permalink" href="#${escapeHtml(latest.slug)}">${escapeHtml(latest.title)}</a>
        <span class="section-meta">${escapeHtml(formatDate(latest.date, false))}${latest.time ? `, ${escapeHtml(latest.time)}` : ""}</span>
      </div>
      <div class="devlog-body body-copy">${latest.html}</div>
    </article>
    ${older.length ? `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">Archive</span>
          <span class="section-meta">${devlogPosts.length} ${devlogPosts.length === 1 ? "entry" : "entries"}</span>
        </div>
        <ul class="devlog-archive">
          ${older.map((post, i) => {
            const excerpt = post.html.replace(/<[^>]*>/g, "").trim();
            return `
            <li class="devlog-archive-item${i >= listLimit ? " devlog-hidden" : ""}" data-devlog-slug="${escapeHtml(post.slug)}">
              <div class="devlog-archive-head">
                <a class="devlog-archive-link" href="#${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a>
                <span class="section-meta">${escapeHtml(formatDate(post.date, false))}</span>
              </div>
              ${renderExpandable(excerpt, 140, "muted-copy")}
            </li>`;
          }).join("")}
        </ul>
        ${older.length > listLimit ? `
          <div class="devlog-more-wrap">
            <button type="button" class="devlog-more" data-devlog-more>show more</button>
          </div>
        ` : ""}
      </section>
    ` : ""}
  `;
}

function renderDevlogPage(slug?: string): string {
  return slug ? renderDevlogSinglePost(slug) : renderDevlogArchive();
}

function renderPageContent(state: AppState, page: PageId, devlogSlug?: string): string {
  if (page === "home") {
    return renderProjectPage();
  }

  if (page === "traces") {
    return renderTracesPage(state);
  }

  if (page === "surface") {
    return renderSurfacePage(state);
  }

  if (page === "loop") {
    return renderLoopPage(state.cognitiveLoop);
  }

  if (page === "mind") {
    return renderMapPage(state);
  }

  if (page === "devlog") {
    return renderDevlogPage(devlogSlug);
  }

  if (page === "contacts") {
    return renderContactsPage();
  }

  return renderProjectPage();
}

export function renderShell(state: AppState, page: PageId, pageUrl: (pageId: PageId) => string, devlogSlug?: string): string {
  return `
    <div class="site-shell">
      ${renderHeader(page, pageUrl, state.status.data?.current_mode ?? "idle")}
      ${renderPageContent(state, page, devlogSlug)}
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

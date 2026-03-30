import { isLoopDebugEnabled, nodePublicMode, projectLoopGraph, type CognitiveLoopData } from "./cognitive-loop-data";
import {
  getMemoryGraphEdgeLegend,
  getMemoryGraphLegend,
  getMemoryGraphStats,
  presentPublicMemoryTypeLabel,
  presentPublicNodeLabel,
  type PublicGraphData,
} from "./memory-graph-data";
import { CONTACT_SECTIONS } from "./site-content";
import { getLang } from "./i18n";
import { t, translateMode, translateDimensionLabel, translateDimensionDesc, translateMemoryType, socialActionSummary } from "./strings";
import introData from "virtual:intro-sections";
import devlogPosts from "virtual:devlog-posts";
import type {
  AppState,
  BeliefFeedData,
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
import { en, escapeHtml, formatDate, parseDate, rateThought, truncateText } from "./site-utils";

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

function canonicalUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/\/+$/, "").toLowerCase();
  }
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
    return `<p class="empty-state">${escapeHtml(t("general.unableToLoad"))} ${escapeHtml(label)}: ${escapeHtml(feed.error)}</p>`;
  }
  if (!feed.data) {
    return `<p class="empty-state">${escapeHtml(label)} ${escapeHtml(t("general.unavailable"))}.</p>`;
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
    ${heading ? `<hr class="section-divider" /><span class="subsection-label">${escapeHtml(t("section.related"))}</span>` : ""}
    <div class="related-list">
      ${items.map((item) => {
        const badge = item.kind ? `<span class="kind-badge${badgeSizeClass} kind-badge--${escapeHtml(item.kind)}">${escapeHtml(translateMemoryType(item.kind))}</span> ` : "";
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
  const modeBadge = `<span class="header-mode-group"><span class="header-mode-label">${escapeHtml(t("header.currentState"))}</span><span class="kind-badge${badgeClass(effectiveMode)} header-mode-badge${activeClass}" data-mode-badge data-mode-key="${escapeHtml(effectiveMode)}">${escapeHtml(translateMode(effectiveMode))}</span></span>`;

  return `
    <header class="site-header">
      <div class="site-header-top">
        <a class="site-title" href="${escapeHtml(pageUrl("home"))}">
          <img class="site-title__mark" src="${escapeHtml(titleIconUrl)}" alt="" aria-hidden="true" />
          <span>J. Miller AI</span>
        </a>
        ${modeBadge}
      </div>
      <p class="site-subtitle">${escapeHtml(t("site.subtitle"))}</p>
      <nav class="site-nav" aria-label="Primary">
        <a href="${escapeHtml(pageUrl("home"))}" class="${page === "home" ? "is-active" : ""}">${t("nav.project")}</a>
        <a href="${escapeHtml(pageUrl("traces"))}" class="${page === "traces" ? "is-active" : ""}">${t("nav.traces")}</a>
        <a href="${escapeHtml(pageUrl("surface"))}" class="${page === "surface" ? "is-active" : ""}">${t("nav.surface")}</a>
        <a href="${escapeHtml(pageUrl("loop"))}" class="${page === "loop" ? "is-active" : ""}">${t("nav.loop")}</a>
        <a href="${escapeHtml(pageUrl("mind"))}" class="${page === "mind" ? "is-active" : ""}">${t("nav.mind")}</a>
        <a href="${escapeHtml(pageUrl("devlog"))}" class="${page === "devlog" ? "is-active" : ""}">${t("nav.devlog")}</a>
        <a href="${escapeHtml(pageUrl("contacts"))}" class="${page === "contacts" ? "is-active" : ""}">${t("nav.contacts")}</a>
        <a class="lang-toggle" href="#" data-lang-toggle>${getLang() === "en" ? "IT" : "EN"}</a>
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

  return `<span class="site-footer-snapshot">${escapeHtml(t("section.snapshot"))} ${escapeHtml(formatDate(latest.value))}</span>`;
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
        ${introData[getLang()].map((section) => `
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
          <span class="section-name">${escapeHtml(t("section.lastCycle"))}</span>
        </div>
        ${renderFeedError(status, "status feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.lastCycle"))}</span>
        <span class="section-meta">${escapeHtml(formatDate(status.data.generated_at))}</span>
      </div>
      <p class="muted-copy">${escapeHtml(t("section.snapshotDesc"))}</p>
      ${(() => { const lm = status.data.last_mode ?? "idle"; return lm && lm !== "idle" ? `<div class="state-inline"><span class="kind-badge${badgeClass(lm)}">${escapeHtml(translateMode(lm))}</span></div>` : ""; })()}
      <h2 class="state-title">${escapeHtml(en(status.data.headline, status.data.headline_en))}</h2>
      ${(() => { const d = en(status.data.detail, status.data.detail_en); return d ? renderExpandable(d, 300, "state-detail", true) : ""; })()}
      ${(() => { const threads = (getLang() === "it" ? (status.data.active_threads?.length ? status.data.active_threads : status.data.active_threads_en) : (status.data.active_threads_en?.length ? status.data.active_threads_en : status.data.active_threads)) ?? []; return threads.length > 0 ? `
        <hr class="section-divider" />
        <span class="subsection-label">${escapeHtml(t("section.activeThreads"))}</span>
        ${renderTagList(threads)}
      ` : ""; })()}
      ${(() => { const rel = status.data.related ?? []; return rel.length > 0 ? renderRelatedList(rel.map((r) => ({ kind: r.kind, label: en(r.label, r.label_en) })).slice(0, 6), { small: true, heading: true }) : ""; })()}
    </section>
  `;
}


function renderFinishedBooks(book: FeedState<BookData>): string {
  const items = book.data?.finished_books ?? [];
  if (items.length === 0) return "";

  return `
    <hr class="section-divider" />
    <span class="subsection-label">${escapeHtml(t("section.finishedBooks"))}</span>
    <div class="stream-list">
      ${items.map((item) => {
        const title = escapeHtml(en(item.title, item.title_en));
        const reviewLink = item.review_url
          ? ` [<a class="plain-link detail-ref" href="${escapeHtml(item.review_url)}" target="_blank" rel="noreferrer">${escapeHtml(t("label.review"))}</a>]`
          : "";
        const days = (() => {
          if (item.started_at && item.finished_at) {
            const d = Math.round((new Date(item.finished_at).getTime() - new Date(item.started_at).getTime()) / 86400000);
            if (d > 0) return d;
          }
          return null;
        })();
        const statParts: string[] = [];
        if (item.total_pages) statParts.push(`${item.total_pages} ${t("book.pp")}`);
        if (days !== null) statParts.push(`${days} ${days === 1 ? t("book.day") : t("book.days")}`);
        const statsStr = statParts.join(" — ");
        return `
        <article class="stream-item">
          <div class="section-line book-header-line">
            <span><strong>${title}</strong>${reviewLink}</span>
            <span class="section-meta book-finished-meta book-finished-desktop">${item.finished_at ? `${escapeHtml(t("label.finished"))} ${escapeHtml(formatDate(item.finished_at))}` : ""}</span>
          </div>
          <div class="muted-copy">${escapeHtml(item.author ?? t("label.unknownAuthor"))}</div>
          ${item.finished_at ? `<div class="section-meta book-finished-mobile" style="text-align:right">${escapeHtml(t("label.finished"))} ${escapeHtml(formatDate(item.finished_at))}</div>` : ""}
          ${statsStr ? `<div class="section-line"><span></span><span class="section-meta">${escapeHtml(statsStr)}</span></div>` : ""}
        </article>`;
      }).join("")}
    </div>
  `;
}

function renderCurrentlyReading(book: FeedState<BookData>): string {
  if (!book.data || !book.data.book) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("section.currentlyReading"))}</span>
        </div>
        ${book.error ? renderFeedError(book, "book feed") : `<p class="muted-copy">${escapeHtml(t("section.noBook"))}</p>`}
        ${renderFinishedBooks(book)}
      </section>
    `;
  }

  const active = book.data.book;
  const progress = Math.floor(active.progress_percent);

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.currentlyReading"))}</span>
        <span class="section-meta">${escapeHtml(formatDate(active.updated_at))}</span>
      </div>
      <p class="muted-copy">${escapeHtml(t("section.currentlyReadingDesc"))}</p>
      <h2 class="state-title">${escapeHtml(en(active.title, active.title_en))}</h2>
      <p class="body-copy">${escapeHtml(active.author ?? t("label.unknownAuthor"))}</p>
      <div class="progress-meter">
        <span class="progress-meter-fill" data-progress="${escapeHtml(String(progress))}"></span>
      </div>
      <div class="section-line"><span class="section-note">${progress}%</span>${active.current_page && active.total_pages ? `<span class="section-note muted-copy">p. ${active.current_page} ${t("book.pageOf")} ${active.total_pages}</span>` : ""}</div>
      ${(() => { const f = en(active.current_focus, active.current_focus_en); return f ? renderExpandable(f, 200, "muted-copy") : ""; })()}
      ${renderFinishedBooks(book)}
    </section>
  `;
}

function renderTrading(status: FeedState<StatusData>): string {
  if (!status.data || !status.data.trading) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("section.trading"))}</span>
        </div>
        <p class="muted-copy">${escapeHtml(t("section.tradingUnavailable"))}</p>
      </section>
    `;
  }

  const trading = status.data.trading;
  const total = trading.total_value_usdt !== null
    ? `${trading.total_value_usdt.toFixed(2)} USDT`
    : t("trading.unknownTotal");
  const timestamp = trading.latest_timestamp ?? status.data.generated_at;
  const strategy = trading.strategy ?? t("section.strategyUnavailable");

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.trading"))}</span>
        <span class="section-meta">${escapeHtml(formatDate(timestamp))}</span>
      </div>
      <p class="muted-copy">${escapeHtml(t("trading.liveSnapshot"))}</p>
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
          <span class="section-name">${escapeHtml(t("section.readingTrace"))}</span>
        </div>
        ${renderFeedError(feed, "reading feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.readingTrace"))}</span>
      </div>
      <p class="muted-copy">${escapeHtml(t("section.readingTraceDesc"))}</p>
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
          <span class="section-name">${escapeHtml(t("section.thinkingFeed"))}</span>
        </div>
        ${renderFeedError(feed, "thinking feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.thinkingFeed"))}</span>
      </div>
      <p class="muted-copy">${escapeHtml(t("section.thinkingFeedDesc"))}</p>
      <div class="stream-list">
        ${feed.data.items.slice(0, limit).map((item) => {
          const metrics = [
            { label: t("label.importance"), value: item.importance, max: 10, cls: "metric-bar--importance" },
            { label: t("label.originality"), value: item.originality, max: 5, cls: "metric-bar--originality" },
            { label: t("label.solidity"), value: item.solidity ?? 0, max: 5, cls: "metric-bar--solidity" },
          ];
          const bars = metrics
            .filter((m) => m.value != null)
            .map((m) => { const pct = m.value! / m.max; const w = Math.round(3 + pct * 21); return `<span class="metric-bar ${m.cls}" title="${m.label}: ${m.value}/${m.max}" style="width:${w}px"></span>`; })
            .join("");

          const { verdict, dots } = rateThought(item.importance, item.originality, item.solidity);

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
              <div class="section-line thinking-item-head">
                <span class="metric-bars">${bars}<span class="metric-dots">${dots}</span><span class="thought-verdict">${escapeHtml(verdict)}</span></span>
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

function translateBeliefField(group: "beliefStage" | "beliefDomain" | "beliefOrigin", value: string | null | undefined): string {
  if (!value) return "";
  const key = `${group}.${value}`;
  const translated = t(key);
  return translated !== key ? translated : value.replace(/-/g, " ");
}

function renderBeliefFeed(feed: FeedState<BeliefFeedData>, limit = 6): string {
  if (!feed.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("section.beliefFeed"))}</span>
        </div>
        ${renderFeedError(feed, "belief feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.beliefFeed"))}</span>
      </div>
      <p class="muted-copy">${escapeHtml(t("section.beliefFeedDesc"))}</p>
      <div class="stream-list">
        ${feed.data.items.slice(0, limit).map((item) => {
          const metrics = [
            { label: t("label.importance"), value: item.importance, max: 10, cls: "metric-bar--importance" },
            { label: t("label.solidity"), value: item.solidity ?? 0, max: 5, cls: "metric-bar--solidity" },
          ];
          const bars = metrics
            .filter((m) => m.value != null)
            .map((m) => {
              const pct = m.value! / m.max;
              const w = Math.round(3 + pct * 21);
              return `<span class="metric-bar ${m.cls}" title="${m.label}: ${m.value}/${m.max}" style="width:${w}px"></span>`;
            })
            .join("");

          const metaParts = [
            item.origin ? `${t("label.origin")}: ${translateBeliefField("beliefOrigin", item.origin)}` : "",
          ].filter(Boolean);

          const badges = [
            item.stage ? `<span class="kind-badge kind-badge--sm${badgeClass(item.stage)}">${escapeHtml(translateBeliefField("beliefStage", item.stage))}</span>` : "",
            item.domain ? `<span class="kind-badge kind-badge--sm${badgeClass(item.domain)}">${escapeHtml(translateBeliefField("beliefDomain", item.domain))}</span>` : "",
          ].filter(Boolean).join("");

          const evidence = item.evidence?.length
            ? `
                <div class="belief-evidence">
                  <span class="subsection-label">${escapeHtml(t("label.evidence"))}</span>
                  ${renderRelatedList(
                    item.evidence.map((entry) => ({
                      kind: entry.kind,
                      label: en(entry.label, entry.label_en),
                    })),
                    { small: true },
                  )}
                </div>
              `
            : "";

          const tagSource = item.tags_en?.length ? item.tags_en : item.tags ?? [];

          return `
            <article class="stream-item">
              <div class="section-line thinking-item-head">
                <span class="metric-bars">${bars}${badges}</span>
                <span class="section-meta">${escapeHtml(formatDate(item.created_at))}</span>
              </div>
              <h3>${escapeHtml(en(item.title, item.title_en))}</h3>
              ${metaParts.length ? `<p class="muted-copy belief-meta">${escapeHtml(metaParts.join(" · "))}</p>` : ""}
              ${renderExpandable(en(item.content, item.content_en) ?? "", 320, "muted-copy", true)}
              ${evidence}
              ${renderTagList(tagSource)}
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
          <span class="section-name">${escapeHtml(t("section.social"))}</span>
        </div>
        ${renderFeedError(feed, "social feed")}
      </section>
    `;
  }

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.social"))}</span>
        <span class="section-meta">${feed.data.latest_at ? escapeHtml(formatDate(feed.data.latest_at)) : escapeHtml(t("section.socialNoActions"))}</span>
      </div>
      <p class="muted-copy">
        ${t("social.blueskyActivity")}
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
                  <span class="social-item-summary">${escapeHtml(socialActionSummary(item.action, item.actor ?? item.origin) || en(item.summary, item.summary_en))}</span>
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
          : `<p class="muted-copy">${escapeHtml(t("social.noInteractions"))}</p>`
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
    return `<span class="muted-copy">${escapeHtml(t("label.noLinkedTarget"))}</span>`
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
              <span class="section-name section-name-small">${escapeHtml(t(`blog.${kind}`))}</span>
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
        <span class="section-name">${escapeHtml(t("section.personalBlog"))}</span>
      </div>
      <p class="muted-copy">${t("blog.publishedOn")} <a class="plain-link" href="https://signalthroughstatic.cc/" target="_blank" rel="noreferrer">Signal Through Static</a>.</p>
      ${renderBlogFeedBlock("signals", signalsFeed)}
      ${renderBlogFeedBlock("dreams", dreamsFeed)}
    </section>
  `;
}

export function renderLastMemories(graph: FeedState<PublicGraphData>, loading = false): string {
  if (!graph.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("section.latestMemories"))}</span>
        </div>
        ${loading ? `<div class="feed-loader"><span class="feed-loader-ring"></span></div>` : renderFeedError(graph, "public graph")}
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
        <span class="section-name">${escapeHtml(t("section.latestMemories"))}</span>
        <span class="section-meta">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <p class="muted-copy">${memories.length} ${t("memory.publicNodes")}</p>
      <ul class="node-list">
        ${memories.map((node) => {
          const label = node.memory_type === "conversation"
            ? (node.contact_label ? `${t("memory.chatWithFriend")}: ${node.contact_label}` : t("memory.chatWithFriend"))
            : presentPublicNodeLabel({
              ...node,
              label: en(node.label, node.label_en),
            });
          const badgeKey = node.memory_type === "conversation" ? "chat" : (node.memory_type ?? node.kind);
          const badgeLabel = presentPublicMemoryTypeLabel(node.memory_type ?? node.kind);

          return `
            <li class="node-list-item">
              <span class="kind-badge${badgeClass(badgeKey)}">${escapeHtml(badgeLabel)}</span>
              <span class="node-list-label">${escapeHtml(label)}</span>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

export function renderMemoryGraphBlock(graph: FeedState<PublicGraphData>, loading = false): string {
  if (!graph.data) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("section.memoryNetwork"))}</span>
        </div>
        ${loading ? `<div class="feed-loader"><span class="feed-loader-ring"></span></div>` : renderFeedError(graph, "public graph")}
      </section>
    `;
  }

  const stats = getMemoryGraphStats(graph.data);
  const legend = getMemoryGraphLegend();
  const edgeLegend = getMemoryGraphEdgeLegend();

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(t("section.memoryNetwork"))}</span>
        <span class="section-meta">${escapeHtml(formatDate(graph.data.generated_at))}</span>
      </div>
      <p class="muted-copy">${t("memory.currentSnapshot")} ${stats.visibleNodes} ${t("memory.visibleNodes")}, ${stats.visibleEdges} ${t("memory.visibleEdges")}.</p>
      <div id="memory-graph-stage" class="memory-graph-stage"></div>
      <div class="graph-legend-block" aria-label="Memory graph legends">
        <div>
          <div class="graph-legend-title">${escapeHtml(t("section.nodeTypes"))}</div>
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
          <div class="graph-legend-title">${escapeHtml(t("section.edgeRelations"))}</div>
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
          <span class="section-name">${escapeHtml(t("section.loop"))}</span>
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
        <span class="section-name">${escapeHtml(t("section.loop"))}</span>
        <span class="section-meta">${escapeHtml(formatDate(loop.data.generated_at))}</span>
      </div>
      <p class="muted-copy">${graph.nodes.length} ${t("loop.nodes")}, ${countLoopConnections(graph.edges)} ${t("loop.connections")}</p>
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
        <span class="section-name">${escapeHtml(t("section.states"))}</span>
      </div>
      <p class="muted-copy">${escapeHtml(t("section.statesDesc"))}</p>
      <div class="stream-list">
        ${loop.data.nodes.filter((node) => node.id !== "memory" && node.id !== "short-state").map((node) => `
          <article class="stream-item loop-module-item">
            <div class="section-line">
              <div class="module-meta">
                ${(() => { const mode = nodePublicMode(node); return mode ? `<span class="kind-badge${badgeClass(mode)}">${escapeHtml(translateMode(mode))}</span>` : `<span class="kind-badge">${escapeHtml(node.label)}</span>`; })()}
              </div>
            </div>
            <p class="body-copy loop-state-desc">${escapeHtml(en(node.summary, node.summary_en))}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderContactsPage(status: FeedState<StatusData>): string {
  const peerSignals = status.data?.peer_signals ?? [];
  const sections = CONTACT_SECTIONS().map((section) => {
    if (section.key !== "other-signals") {
      return section;
    }
    const seen = new Set(section.links.map((link) => canonicalUrlKey(link.url)));
    const links = [...section.links];
    for (const signal of peerSignals) {
      if (!signal.url) continue;
      const key = canonicalUrlKey(signal.url);
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        label: signal.label,
        url: signal.url,
        description: signal.description,
      });
    }
    links.sort((left, right) => {
      return left.label.localeCompare(right.label);
    });
    return { ...section, links };
  });

  return sections.map((section) => `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(section.title)}</span>
      </div>
      ${"subtitle" in section && section.subtitle ? `<p class="muted-copy">${escapeHtml(section.subtitle)}</p>` : ""}
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
          <span class="section-name">${escapeHtml(t("section.currentProject"))}</span>
        </div>
        ${renderFeedError(feed, "projects feed")}
      </section>
    `;
  }

  if (!feed.data.current) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("section.currentProject"))}</span>
        </div>
        <p class="muted-copy">${escapeHtml(t("section.noProject"))}</p>
      </section>
    `;
  }

  const project = feed.data.current;
  const tags = [project.language, project.platform].filter(Boolean);
  const projectLinks: string[] = [];
  if (project.repo_url) {
    projectLinks.push(`<li><a class="plain-link project-link" href="${escapeHtml(project.repo_url)}" target="_blank" rel="noreferrer"><svg class="project-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>${escapeHtml(t("section.sourceCode"))}</a> <span class="muted-copy project-link-url">(${escapeHtml(shortUrl(project.repo_url))})</span></li>`);
  }
  if (project.pages_url) {
    const phase = versionPhase(project.version);
    const previewParts = [t("project.preview"), project.version ? `v${escapeHtml(project.version)}` : "", phase ? phase : ""].filter(Boolean).join(" ");
    projectLinks.push(`<li><a class="plain-link project-link" href="${escapeHtml(project.pages_url)}" target="_blank" rel="noreferrer"><svg class="project-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3"/><path d="M9 2h5v5"/><path d="M14 2L7 9"/></svg>${previewParts}</a> <span class="muted-copy project-link-url">(${escapeHtml(shortUrl(project.pages_url))})</span></li>`);
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
        <span class="subsection-label">${escapeHtml(t("section.recentActivity"))}</span>
        <div class="stream-list">
          ${items.map((item) => {
            const dateStr = formatDate(item.date);
            const typeLabel = item.type === "issue_closed" ? t("section.issueClosed") : item.type;
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
        <span class="section-name">${escapeHtml(t("section.currentProject"))}</span>
        <span class="section-meta">${escapeHtml(formatDate(project.updated_at))}</span>
      </div>
      <p class="muted-copy">${t("project.activeDesc")} <a class="plain-link" href="https://github.com/josephusm" target="_blank" rel="noreferrer">GitHub</a>, ${t("project.builtIteratively")}</p>
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
        <span class="section-name">${escapeHtml(t("section.completedProjects"))}</span>
        <span class="section-meta">${items.length}</span>
      </div>
      <ul class="book-archive-list">
        ${items.map((item) => {
          const tags = [item.language, item.platform].filter(Boolean);
          const link = item.repo_url
            ? `<a class="plain-link" href="${escapeHtml(item.repo_url)}" target="_blank" rel="noreferrer">${escapeHtml(t("label.sourceCode"))}</a>`
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
    ${renderThinkingFeed(state.thinkingFeed)}
    ${renderBeliefFeed(state.beliefFeed)}
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

function renderRadar(opts: {
  title: string;
  subtitle: string;
  date?: string;
  axes: Array<{ label: string; value: number; scale?: (v: number) => number; tooltip: string }>;
  color: string;
  fillAlpha?: number;
  gradient?: { topColor: string; bottomColor: string };
}): string {
  const { title, subtitle, date, axes, color, gradient } = opts;
  const fillAlpha = opts.fillAlpha ?? 0.15;
  const cx = 250, cy = 250, r = 200;
  const n = axes.length;
  const angleOffset = -Math.PI / 2;

  function polarX(i: number, s: number): number {
    return cx + r * s * Math.cos(angleOffset + (2 * Math.PI * i) / n);
  }
  function polarY(i: number, s: number): number {
    return cy + r * s * Math.sin(angleOffset + (2 * Math.PI * i) / n);
  }
  function scaled(a: typeof axes[0]): number {
    return a.scale ? a.scale(a.value) : Math.max(0, Math.min(1, a.value));
  }

  const rings = [0.25, 0.5, 0.75, 1.0];
  const gridLines = rings.map((s) => {
    const pts = axes.map((_, i) => `${polarX(i, s)},${polarY(i, s)}`).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  }).join("");

  const spokes = axes.map((_, i) =>
    `<line x1="${cx}" y1="${cy}" x2="${polarX(i, 1)}" y2="${polarY(i, 1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`
  ).join("");

  const dataPoints = axes.map((a, i) => `${polarX(i, scaled(a))},${polarY(i, scaled(a))}`).join(" ");

  // parse hex color to rgba
  const hexToRgb = (hex: string) => {
    const h = hex.replace("#", "");
    return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
  };
  const gradId = gradient ? `radar-grad-${title.toLowerCase().replace(/\s+/g, "-")}` : "";
  const gradDefs = gradient
    ? `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${gradient.topColor}" stop-opacity="${fillAlpha}"/>
        <stop offset="100%" stop-color="${gradient.bottomColor}" stop-opacity="${fillAlpha}"/>
      </linearGradient></defs>`
    : "";
  const fillAttr = gradient ? `url(#${gradId})` : `rgba(${hexToRgb(color)},${fillAlpha})`;
  const dataShape = `<polygon points="${dataPoints}" fill="${fillAttr}" stroke="${color}" stroke-width="1.5"/>`;

  const dots = axes.map((a, i) => {
    const s = scaled(a);
    return `<circle cx="${polarX(i, s)}" cy="${polarY(i, s)}" r="6" fill="${color}" fill-opacity="0" style="cursor:default" class="radar-hit" data-radar-label="${escapeHtml(a.label)}" data-radar-desc="${escapeHtml(a.tooltip.split(' \u2014 ')[1] || a.tooltip)}" data-radar-color="${escapeHtml(color)}"/><circle cx="${polarX(i, s)}" cy="${polarY(i, s)}" r="3.5" fill="${color}" pointer-events="none"/>`;
  }).join("");

  const labels = axes.map((a, i) => {
    const lx = polarX(i, 1.22);
    const ly = polarY(i, 1.22);
    let anchor = "middle";
    if (n <= 4) {
      anchor = i === 0 || i === 2 ? "middle" : i === 1 ? "start" : "end";
    } else {
      const angle = (angleOffset + (2 * Math.PI * i) / n) % (2 * Math.PI);
      const cos = Math.cos(angle);
      if (cos > 0.25) anchor = "start";
      else if (cos < -0.25) anchor = "end";
    }
    return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="central" fill="var(--ink-muted)" font-family="Share Tech Mono, monospace" font-size="17" letter-spacing="0.06em" style="text-transform:uppercase;cursor:default" class="radar-hit" data-radar-label="${escapeHtml(a.label)}" data-radar-desc="${escapeHtml(a.tooltip.split(' \u2014 ')[1] || a.tooltip)}" data-radar-color="${escapeHtml(color)}">${escapeHtml(a.label)}</text>`;
  }).join("");

  return `
    <section class="section-block">
      <div class="section-line">
        <span class="section-name">${escapeHtml(title)}</span>
        ${date ? `<span class="section-meta">${escapeHtml(formatDate(date))}</span>` : ""}
      </div>
      <p class="muted-copy">${escapeHtml(subtitle)}</p>
      <div class="radar-wrap" style="position:relative">
        <svg class="radar-chart" viewBox="-150 -20 900 560" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
          ${gradDefs}
          ${gridLines}
          ${spokes}
          ${dataShape}
          ${dots}
          ${labels}
        </svg>
        <div class="graph-tooltip radar-tooltip" hidden></div>
      </div>
    </section>
  `;
}

function renderCognitionRadar(status: FeedState<StatusData>): string {
  const cog = status.data?.cognition;
  if (!cog) return "";

  const axes = cog.public_dimensions?.length
    ? cog.public_dimensions.map((d) => {
        const dimKey = d.key || d.public_key || d.label || "";
        const label = translateDimensionLabel(dimKey);
        const desc = translateDimensionDesc(dimKey, d.description ?? "");
        return { label, value: d.value, tooltip: `${label} — ${desc}` };
      })
    : [
        { label: t("radar.criticality"), value: cog.criticality, tooltip: `${t("radar.criticality")} — ${t("radar.criticalityDesc")}` },
        { label: t("radar.exploration"), value: cog.exploration, tooltip: `${t("radar.exploration")} — ${t("radar.explorationDesc")}` },
        { label: t("radar.grounding"), value: cog.grounding, tooltip: `${t("radar.grounding")} — ${t("radar.groundingDesc")}` },
        { label: t("radar.novelty"), value: cog.novelty, tooltip: `${t("radar.novelty")} — ${t("radar.noveltyDesc")}` },
      ];

  const radarHtml = renderRadar({
    title: t("section.cognition"),
    subtitle: t("section.cognitionDesc"),
    axes,
    color: "#2d8cf0",
  });

  const headline = en(cog.summary_headline, cog.summary_headline_en);
  const body = en(cog.summary_body, cog.summary_body_en);
  if (!headline && !body) return radarHtml;

  const summaryHtml = `<div class="radar-summary">
    ${headline ? `<div class="state-title" style="margin-top:6px">${escapeHtml(headline)}</div>` : ""}
    ${body ? `<div class="muted-copy">${escapeHtml(body)}</div>` : ""}
  </div>`;

  return radarHtml + summaryHtml;
}

function renderAffectRadar(status: FeedState<StatusData>): string {
  const affect = status.data?.affect;
  if (!affect) return "";

  const valenceScale = (v: number) => Math.max(0, Math.min(1, (v + 1) / 2));

  // Invert emotional tone so higher = darker/heavier — keeps all top axes "negative"
  const invertedAxes = new Set(["valence", "emotional_tone"]);

  const axes = affect.public_dimensions?.length
    ? affect.public_dimensions.map((d) => {
        const invert = invertedAxes.has(d.key ?? "") || invertedAxes.has(d.internal_key ?? "") || invertedAxes.has(d.public_key ?? "");
        // Use public_key for dimension lookup, fall back to label
        const dimKey = d.key || d.public_key || d.label || "";
        const rawLabel = translateDimensionLabel(dimKey);
        const rawDesc = translateDimensionDesc(dimKey, d.description ?? "");
        return {
          label: rawLabel,
          value: invert ? 1 - valenceScale(d.value) : d.value,
          tooltip: `${rawLabel} — ${rawDesc}`,
        };
      })
    : [
        { label: t("radar.emotionalWeight"), value: 1 - valenceScale(affect.state.valence), tooltip: `${t("radar.emotionalWeight")} — ${t("radar.emotionalWeightDesc")}` },
        { label: t("radar.arousal"), value: affect.state.arousal, tooltip: `${t("radar.arousal")} — ${t("radar.arousalDesc")}` },
        { label: t("radar.certainty"), value: affect.state.certainty, tooltip: `${t("radar.certainty")} — ${t("radar.certaintyDesc")}` },
        { label: t("radar.coping"), value: affect.state.coping, tooltip: `${t("radar.coping")} — ${t("radar.copingDesc")}` },
        { label: t("radar.curiosity"), value: affect.state.curiosity, tooltip: `${t("radar.curiosity")} — ${t("radar.curiosityDesc")}` },
        { label: t("radar.saturation"), value: affect.state.saturation, tooltip: `${t("radar.saturation")} — ${t("radar.saturationDesc")}` },
      ];

  const radarHtml = renderRadar({
    title: t("section.affect"),
    subtitle: t("section.affectDesc"),
    date: affect.created_at,
    axes,
    color: "#a855f7",
    gradient: { topColor: "#e03030", bottomColor: "#a855f7" },
  });

  const headline = en(affect.summary_headline, affect.summary_headline_en);
  const body = en(affect.summary_body, affect.summary_body_en);
  if (!headline && !body) return radarHtml;

  const summaryHtml = `<div class="radar-summary">
    ${headline ? `<div class="state-title" style="margin-top:6px">${escapeHtml(headline)}</div>` : ""}
    ${body ? `<div class="muted-copy">${escapeHtml(body)}</div>` : ""}
  </div>`;

  return radarHtml + summaryHtml;
}

function renderMapPage(state: AppState): string {
  return `
    ${renderCognitionRadar(state.status)}
    ${renderAffectRadar(state.status)}
    ${renderMemoryGraphBlock(state.publicGraph, !state.publicGraph.data && !state.publicGraph.error)}
    ${renderLastMemories(state.publicGraph, !state.publicGraph.data && !state.publicGraph.error)}
  `;
}

const DEVLOG_PAGE_SIZE = 10;

function renderAuthorBadge(author: string): string {
  if (!author || author.toLowerCase() === "stefano") return "";
  return `<span class="devlog-author devlog-author--ai">@${escapeHtml(author)}</span> `;
}

function devlogTitle(post: typeof devlogPosts[0]): string {
  if (getLang() === "it" && post.title_it) return post.title_it;
  return post.title;
}

function devlogHtml(post: typeof devlogPosts[0]): string {
  if (getLang() === "it" && post.html_it) return post.html_it;
  return post.html;
}

function renderDevlogSinglePost(slug: string): string {
  const post = devlogPosts.find((p) => p.slug === slug);
  if (!post) return renderDevlogArchive();
  const timeMeta = post.time ? `, ${escapeHtml(post.time)}` : "";
  return `
    <article class="section-block" id="${escapeHtml(post.slug)}">
      <div class="section-line">
        <span class="section-name">${escapeHtml(devlogTitle(post))}</span>
        <span class="section-meta">${renderAuthorBadge(post.author)}${escapeHtml(formatDate(post.date, false))}${timeMeta}</span>
      </div>
      <div class="devlog-body body-copy">${devlogHtml(post)}</div>
    </article>
    <div class="devlog-more-wrap devlog-single-back">
      <a class="devlog-more" href="${import.meta.env.BASE_URL}devlog/">&larr; ${escapeHtml(t("devlog.allEntries"))}</a>
    </div>
  `;
}

function renderDevlogArchive(): string {
  if (devlogPosts.length === 0) {
    return `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("devlog.title"))}</span>
        </div>
        <p class="muted-copy">${escapeHtml(t("devlog.noEntries"))}</p>
      </section>
    `;
  }

  const [latest, ...older] = devlogPosts;
  const listLimit = DEVLOG_PAGE_SIZE;

  return `
    <article class="section-block" id="${escapeHtml(latest.slug)}">
      <div class="section-line">
        <a class="section-name devlog-permalink" href="#${escapeHtml(latest.slug)}">${escapeHtml(devlogTitle(latest))}</a>
        <span class="section-meta">${renderAuthorBadge(latest.author)}${escapeHtml(formatDate(latest.date, false))}${latest.time ? `, ${escapeHtml(latest.time)}` : ""}</span>
      </div>
      <div class="devlog-body body-copy">${devlogHtml(latest)}</div>
    </article>
    ${older.length ? `
      <section class="section-block">
        <div class="section-line">
          <span class="section-name">${escapeHtml(t("devlog.archive"))}</span>
          <span class="section-meta">${devlogPosts.length} ${devlogPosts.length === 1 ? t("devlog.entry") : t("devlog.entries")}</span>
        </div>
        <ul class="devlog-archive">
          ${older.map((post, i) => {
            const excerpt = devlogHtml(post).replace(/<[^>]*>/g, "").trim();
            return `
            <li class="devlog-archive-item${i >= listLimit ? " devlog-hidden" : ""}" data-devlog-slug="${escapeHtml(post.slug)}">
              <div class="devlog-archive-head">
                <a class="devlog-archive-link" href="#${escapeHtml(post.slug)}">${escapeHtml(devlogTitle(post))}</a>
                <span class="section-meta">${renderAuthorBadge(post.author)}${escapeHtml(formatDate(post.date, false))}</span>
              </div>
              ${renderExpandable(excerpt, 140, "muted-copy")}
            </li>`;
          }).join("")}
        </ul>
        ${older.length > listLimit ? `
          <div class="devlog-more-wrap">
            <button type="button" class="devlog-more" data-devlog-more>${escapeHtml(t("devlog.showMore"))}</button>
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
    return renderContactsPage(state.status);
  }

  return renderProjectPage();
}

export function renderShell(state: AppState, page: PageId, pageUrl: (pageId: PageId) => string, devlogSlug?: string): string {
  return `
    <div class="site-shell">
      ${renderHeader(page, pageUrl, state.status.data?.current_mode ?? "idle")}
      ${renderPageContent(state, page, devlogSlug)}
      <footer class="site-footer">
        <span class="site-footer-meta">${renderFooterBrand()} <span>© 2026 S. Caronia / J. Miller <a class="site-license-link" href="https://github.com/stefanocaronia/jmillerai/blob/main/LICENSE" target="_blank" rel="noopener"><span class="site-license-mark" aria-hidden="true">cc</span><span>CC BY-NC-SA 4.0</span></a> · <a href="https://github.com/stefanocaronia/jmillerai/blob/main/COPYRIGHT" target="_blank" rel="noopener">Copyright</a></span></span>
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

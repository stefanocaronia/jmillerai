import "./style.css";
import { injectCssVars } from "./colors";
import { initializeConsentBanner } from "./consent";
import { getLang, setLang } from "./i18n";
import { t, translateMode } from "./strings";
import { loadStateWithCache, loadPublicGraph } from "./site-data";
import { renderShell, applyProgressMeters, applySpoilerToggles, badgeClass, renderMemoryGraphBlock, renderLastMemories } from "./site-render";
import type { FeedState, PageId, StatusData } from "./site-types";

injectCssVars();

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root");
}

const app: HTMLDivElement = appRoot;
const page = (document.body.dataset.page as PageId | undefined) ?? "home";
let unmountGraph: (() => void) | null = null;

const baseUrl = import.meta.env.BASE_URL;
const defaultDevFeedBase = "https://stefanocaronia.it/jmillerai/data";
const configuredFeedBase = (
  (import.meta.env.VITE_PUBLIC_FEED_BASE as string | undefined) ||
  (import.meta.env.DEV ? defaultDevFeedBase : undefined)
)?.replace(/\/+$/, "");
const feedUrl = (name: string) =>
  configuredFeedBase ? `${configuredFeedBase}/${name}.json` : `${baseUrl}data/${name}.json`;

const pageUrl = (pageId: PageId): string => (pageId === "home" ? baseUrl : `${baseUrl}${pageId}/`);

const staticPages = new Set<PageId>(["devlog", "contacts"]);

function wireRadarTooltips(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(".radar-wrap").forEach((wrap) => {
    const tip = wrap.querySelector<HTMLElement>(".radar-tooltip");
    if (!tip) return;

    wrap.querySelectorAll<SVGElement>(".radar-hit").forEach((hit) => {
      hit.addEventListener("mouseenter", (e) => {
        const label = hit.dataset.radarLabel ?? "";
        const desc = hit.dataset.radarDesc ?? "";
        const color = hit.dataset.radarColor ?? "var(--accent)";
        tip.innerHTML = `<div class="graph-tooltip-type" style="--tooltip-type-color:${color}">${label}</div><div class="graph-tooltip-label">${desc}</div>`;
        tip.hidden = false;
        const rect = wrap.getBoundingClientRect();
        const mx = (e as MouseEvent).clientX - rect.left;
        const my = (e as MouseEvent).clientY - rect.top;
        tip.style.left = `${mx + 14}px`;
        tip.style.top = `${my + 14}px`;
      });

      hit.addEventListener("mousemove", (e) => {
        const rect = wrap.getBoundingClientRect();
        tip.style.left = `${(e as MouseEvent).clientX - rect.left + 14}px`;
        tip.style.top = `${(e as MouseEvent).clientY - rect.top + 14}px`;
      });

      hit.addEventListener("mouseleave", () => {
        tip.hidden = true;
      });
    });
  });
}

async function start() {
  if (staticPages.has(page)) {
    // These pages use only build-time data, but fetch status for mode badge
    const empty = { data: null, error: null };
    let status = empty as typeof empty & { data: import("./site-types").StatusData | null };
    try {
      const res = await fetch(feedUrl("status"), { cache: "no-store" });
      if (res.ok) status = { data: await res.json(), error: null };
    } catch { /* silent */ }
    const emptyState = {
      status, book: empty, readingFeed: empty, thinkingFeed: empty,
      socialFeed: empty, projectsFeed: empty, cognitiveLoop: empty,
      publicGraph: empty, signalsFeed: empty, dreamsFeed: empty,
    } as Parameters<typeof renderShell>[0];
    const devlogSlug = page === "devlog" ? location.hash.slice(1) || undefined : undefined;
    app.innerHTML = renderShell(emptyState, page, pageUrl, devlogSlug);
  } else if (page === "mind") {
    const empty = { data: null, error: null };

    // Render page shell immediately (cached status for radars, spinners for graph)
    function renderMindShell(status: FeedState<import("./site-types").StatusData>) {
      const state = {
        status, book: empty, readingFeed: empty, thinkingFeed: empty,
        socialFeed: empty, projectsFeed: empty, cognitiveLoop: empty,
        publicGraph: empty, signalsFeed: empty, dreamsFeed: empty,
      } as Parameters<typeof renderShell>[0];
      app.innerHTML = renderShell(state, page, pageUrl);
      wireRadarTooltips(app);
    }

    // Try cached status for instant radars
    let hasRendered = false;
    try {
      const raw = localStorage.getItem("jmillerai:state");
      if (raw) {
        const cached = JSON.parse(raw) as { status?: { data: import("./site-types").StatusData | null } };
        if (cached.status?.data) {
          renderMindShell({ data: cached.status.data, error: null });
          hasRendered = true;
        }
      }
    } catch { /* corrupt cache */ }

    // Fetch fresh status in background, update radars if changed
    fetch(feedUrl("status"), { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          renderMindShell({ data, error: null });
          hasRendered = true;
        } else if (!hasRendered) {
          renderMindShell({ data: null, error: null });
          hasRendered = true;
        }
      })
      .catch(() => {
        if (!hasRendered) {
          renderMindShell({ data: null, error: null });
          hasRendered = true;
        }
      });

    if (!hasRendered) {
      renderMindShell({ data: null, error: null });
      hasRendered = true;
    }

    // Load graph async — replaces spinner sections when ready
    function applyGraphSections(graphState: import("./site-types").FeedState<import("./memory-graph-data").PublicGraphData>) {
      if (!graphState.data) return;
      const sections = app.querySelectorAll<HTMLElement>(".section-block");
      const memoriesSection = sections[sections.length - 1];
      if (memoriesSection) {
        const tmp = document.createElement("div");
        tmp.innerHTML = renderLastMemories(graphState);
        memoriesSection.replaceWith(tmp.firstElementChild!);
      }
      import("./memory-graph").then(({ mountMemoryGraph }) => {
        const graphSections = app.querySelectorAll<HTMLElement>(".section-block");
        const gs = graphSections[graphSections.length - 2];
        if (gs) {
          const tmp = document.createElement("div");
          tmp.innerHTML = renderMemoryGraphBlock(graphState);
          gs.replaceWith(tmp.firstElementChild!);
        }
        const stage = app.querySelector<HTMLElement>("#memory-graph-stage");
        if (stage) {
          unmountGraph = mountMemoryGraph(stage, graphState.data!);
        }
      });
    }

    loadPublicGraph(feedUrl).then(applyGraphSections);
  } else {
    function renderPage(state: Parameters<typeof renderShell>[0]) {
      unmountGraph?.();
      unmountGraph = null;
      app.innerHTML = renderShell(state, page, pageUrl);
      applyProgressMeters(app);
      applySpoilerToggles(app);
      wireRadarTooltips(app);
      if (page === "loop" && state.cognitiveLoop.data) {
        const container = document.querySelector<HTMLElement>("#cognitive-loop-stage");
        if (container) {
          const loopData = state.cognitiveLoop.data;
          import("./cognitive-loop").then(({ mountCognitiveLoop }) => {
            unmountGraph = mountCognitiveLoop(container, loopData);
          });
        }
      }
    }

    const { cached, fresh } = loadStateWithCache(feedUrl);
    if (cached) {
      renderPage(cached);
    } else {
      app.innerHTML = `<div class="loading">${t("general.initializing")}</div>`;
    }
    fresh.then((state) => {
      if (state) renderPage(state);
    });
  }
  initializeConsentBanner(import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined);
  if (page === "devlog") {
    applyDevlogBehavior(app);
  }

  app.addEventListener("click", (e) => {
    const langToggle = (e.target as HTMLElement).closest<HTMLElement>("[data-lang-toggle]");
    if (langToggle) {
      e.preventDefault();
      setLang(getLang() === "en" ? "it" : "en");
      location.reload();
      return;
    }

    const toggle = (e.target as HTMLElement).closest<HTMLElement>(".expand-toggle");
    if (!toggle) return;
    e.preventDefault();
    const rest = toggle.nextElementSibling as HTMLElement | null;
    if (rest) {
      rest.hidden = false;
      toggle.remove();
    }
  });
}

function applyDevlogBehavior(root: HTMLElement): void {
  const btn = root.querySelector<HTMLButtonElement>("[data-devlog-more]");
  if (btn) {
    btn.addEventListener("click", () => {
      const hidden = root.querySelectorAll<HTMLElement>(".devlog-hidden");
      let shown = 0;
      for (const el of hidden) {
        el.classList.remove("devlog-hidden");
        shown++;
        if (shown >= 10) break;
      }
      if (root.querySelectorAll(".devlog-hidden").length === 0) {
        btn.closest(".devlog-more-wrap")?.remove();
      }
    });
  }

  // Archive links navigate to single-post view
  root.querySelectorAll<HTMLAnchorElement>(".devlog-archive-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const slug = link.closest<HTMLElement>(".devlog-archive-item")?.dataset.devlogSlug;
      if (slug) {
        location.hash = slug;
        location.reload();
      }
    });
  });

  // Featured post permalink
  const permalink = root.querySelector<HTMLAnchorElement>(".devlog-permalink");
  if (permalink) {
    permalink.addEventListener("click", (e) => {
      e.preventDefault();
      const hash = permalink.getAttribute("href");
      if (hash) {
        location.hash = hash.slice(1);
        location.reload();
      }
    });
  }
}

const STATUS_POLL_INTERVAL = 5_000;

async function pollStatus() {
  try {
    const url = feedUrl("status");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as StatusData;
    const badge = document.querySelector<HTMLElement>("[data-mode-badge]");
    if (!badge) return;
    const newMode = data.current_mode ?? "idle";
    if (badge.dataset.modeKey === newMode) return;
    badge.dataset.modeKey = newMode;
    badge.textContent = translateMode(newMode);
    const activeClass = newMode !== "idle" ? " is-active-mode" : "";
    badge.className = `kind-badge${badgeClass(newMode)} header-mode-badge${activeClass}`;
  } catch {
    // silent fail
  }
}

void start().then(() => {
  setInterval(pollStatus, STATUS_POLL_INTERVAL);
});

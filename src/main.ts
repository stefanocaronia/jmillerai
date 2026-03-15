import "./style.css";
import { initializeConsentBanner } from "./consent";
import { mountCognitiveLoop } from "./cognitive-loop";
import { mountMemoryGraph } from "./memory-graph";
import { loadState } from "./site-data";
import { renderShell, applyProgressMeters, applySpoilerToggles, badgeClass } from "./site-render";
import type { PageId, StatusData } from "./site-types";

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
  } else {
    app.innerHTML = `<div class="loading">Initializing…</div>`;
    const state = await loadState(feedUrl);
    unmountGraph?.();
    unmountGraph = null;
    app.innerHTML = renderShell(state, page, pageUrl);
    applyProgressMeters(app);
    applySpoilerToggles(app);
    if (page === "loop" && state.cognitiveLoop.data) {
      const container = document.querySelector<HTMLElement>("#cognitive-loop-stage");
      if (container) {
        unmountGraph = mountCognitiveLoop(container, state.cognitiveLoop.data);
      }
    }
    if (page === "memory" && state.publicGraph.data) {
      const container = document.querySelector<HTMLElement>("#memory-graph-stage");
      if (container) {
        unmountGraph = mountMemoryGraph(container, state.publicGraph.data);
      }
    }
  }
  initializeConsentBanner(import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined);
  if (page === "devlog") {
    applyDevlogBehavior(app);
  }
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
}

const STATUS_POLL_INTERVAL = 60_000;

async function pollStatus() {
  try {
    const url = feedUrl("status");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as StatusData;
    const badge = document.querySelector<HTMLElement>("[data-mode-badge]");
    if (!badge) return;
    const newMode = data.current_mode ?? data.mode;
    if (badge.textContent === newMode) return;
    badge.textContent = newMode;
    const activeClass = newMode !== "idle" ? " is-active-mode" : "";
    badge.className = `kind-badge${badgeClass(newMode)} header-mode-badge${activeClass}`;
  } catch {
    // silent fail
  }
}

void start().then(() => {
  setInterval(pollStatus, STATUS_POLL_INTERVAL);
});

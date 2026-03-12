import "./style.css";
import { initializeAnalytics } from "./analytics";
import { mountCognitiveLoop } from "./cognitive-loop";
import { mountMemoryGraph } from "./memory-graph";
import { loadState } from "./site-data";
import { renderShell, applyProgressMeters, applySpoilerToggles } from "./site-render";
import type { PageId } from "./site-types";

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

async function start() {
  await initializeAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined);
  app.innerHTML = `<div class="loading">Loading public snapshots...</div>`;
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

void start();

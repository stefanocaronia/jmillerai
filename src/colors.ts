/** Single source of truth for all colors used across the site. */

/* ── Base theme ─────────────────────────────────────────────── */

export const theme = {
  bg: "#100606",
  ink: "#f2f2f2",
  inkSoft: "#c3c3c3",
  inkMuted: "#787878",
  line: "rgba(255, 255, 255, 0.14)",
  accent: "#ff7a00",
} as const;

/* ── Memory types (thinking feed, mind graph, badges) ──────── */

export const memoryTypeColors: Record<string, string> = {
  thinking: "#46d9ff",
  experience: "#ffd000",
  reading: "#d3ce96",
  dream: "#b07cff",
  conversation: "#ff5ea8",
  mail: "#106e42",
  social: "#ff6b6b",
  heartbeat: "#ef4444",
  belief: "#362c91",
  trade: "#9a9a9a",
  summary: "#f9a8d4",
};

/* ── Graph node kinds (memory graph) ───────────────────────── */

export const kindColors: Record<string, string> = {
  memory: "#f2f2f2",
  book: "#afafaf",
  source: "#ea4df8",
  blog_post: "#f97316",
  friend: "#34d399",
  project: "#2563eb",
};

/* ── Graph edge relations ──────────────────────────────────── */

export const relationColors: Record<string, string> = {
  came_from: "#8f8f8f",
  extends: "#46d9ff",
  contradicts: "#d14b4b",
  about: "#60a5fa",
  inspired: "#ff7a00",
  continues: "#f2f2f2",
  relates_to: "#b07cff",
};

/* ── Cognitive loop modes ──────────────────────────────────── */

export const modeColors: Record<string, string> = {
  reading: "#f4e409",
  thinking: "#46d9ff",
  browsing: "#ffb000",
  dreaming: "#b07cff",
  heartbeat: "#ef4444",
  trading: "#8f8f8f",
  blogging: "#f472b6",
  mailing: "#a78bfa",
  coding: "#34d399",
  sharing: "#ff5ea8",
  chat: "#6ee7b7",
};

export const defaultModeColor = "#c3c3c3";

/* ── Badge colors (status, social actions, versions) ───────── */

export const badgeColors: Record<string, string> = {
  idle: "rgba(255, 255, 255, 0.25)",
  coding: "#34d399",
  sharing: "#ff5ea8",
  blogging: "#f472b6",
  mailing: "#a78bfa",
  maintenance: theme.inkMuted,
  // social actions
  like: "#f59e0b",
  post: "#38bdf8",
  reply: "#34d399",
  follow: "#f472b6",
  repost: "#a78bfa",
  unfollow: "#fb7185",
  // project status
  active: "#34d399",
  completed: "#38bdf8",
  paused: "#f59e0b",
  // version phases
  version: theme.inkSoft,
  alpha: "#f59e0b",
  beta: "#38bdf8",
  rc: "#a78bfa",
  stable: "#34d399",
};

/* ── Helpers ───────────────────────────────────────────────── */

/** Inject all colors as CSS custom properties on :root */
export function injectCssVars(): void {
  const root = document.documentElement.style;
  // theme
  root.setProperty("--bg", theme.bg);
  root.setProperty("--ink", theme.ink);
  root.setProperty("--ink-soft", theme.inkSoft);
  root.setProperty("--ink-muted", theme.inkMuted);
  root.setProperty("--line", theme.line);
  root.setProperty("--accent", theme.accent);
  // memory types
  for (const [key, val] of Object.entries(memoryTypeColors)) {
    root.setProperty(`--memory-${key}`, val);
  }
  // badges (memory type badges use --memory-* vars, these are the extras)
  for (const [key, val] of Object.entries(badgeColors)) {
    root.setProperty(`--badge-${key}`, val);
  }
}

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnlyFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export function formatDate(value: string | null | undefined, includeTime = true): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return includeTime ? dateTimeFormat.format(date) : dateOnlyFormat.format(date);
}

export function parseDate(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Prefer English (_en) field if available, fallback to original */
export function en<T extends string | null | undefined>(original: T, english?: T | null): T {
  return (english != null && english !== "" ? english : original) as T;
}

export function summarizeText(text: string, maxLength = 220): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength && /[.!?]$/.test(normalized)) {
    return normalized;
  }

  const slice = normalized.slice(0, maxLength + 1);
  const boundary = slice.lastIndexOf(" ");
  const trimmed = (boundary > 0 ? slice.slice(0, boundary) : slice).trim().replace(/[.,;:!?-]+$/, "");
  return `${trimmed} [...]`;
}

/**
 * Returns a brief English verdict and a 5-dot quality rating
 * for a thinking-feed item based on its three metrics.
 *
 * importance 1-10, originality 1-5 (nullable), solidity 0-5
 */
export function rateThought(
  importance: number,
  originality: number | null | undefined,
  solidity: number | null | undefined,
): { verdict: string; dots: string } {
  const imp = importance ?? 0;
  const ori = originality ?? 0;
  const sol = solidity ?? 0;

  // --- composite score 0-1 (importance weighs most) ---
  const score = imp / 10 * 0.5 + ori / 5 * 0.25 + sol / 5 * 0.25;
  const filled = Math.max(1, Math.min(5, Math.round(score * 5)));
  const dots = "★".repeat(filled);

  // --- verbal verdict ---
  const parts: string[] = [];

  // importance
  if (imp >= 8) parts.push("Key insight");
  else if (imp >= 6) parts.push("Noteworthy");
  else parts.push("Minor note");

  // originality
  if (ori >= 4) parts.push("fresh angle");
  else if (ori <= 1) parts.push("well-trodden ground");

  // solidity
  if (sol >= 4) parts.push("well-grounded");
  else if (sol >= 2) parts.push("needs testing");
  else parts.push("raw speculation");

  // combine: "Key insight — fresh angle, well-grounded"
  const verdict = parts.length > 1
    ? `${parts[0]} — ${parts.slice(1).join(", ")}`
    : parts[0];

  return { verdict, dots };
}

export function truncateText(text: string, maxLength = 220): { short: string; rest: string } | null {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength && /[.!?]$/.test(normalized)) {
    return null;
  }
  const slice = normalized.slice(0, maxLength + 1);
  const boundary = slice.lastIndexOf(" ");
  const trimmed = (boundary > 0 ? slice.slice(0, boundary) : slice).trim().replace(/[.,;:!?-]+$/, "");
  return { short: trimmed, rest: normalized.slice(trimmed.length).trim() };
}


const timeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return timeFormat.format(date);
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


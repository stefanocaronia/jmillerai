import { getLang } from "./i18n";
import i18n from "virtual:i18n";

/**
 * Get a translated string by dotted key (e.g. "nav.project", "section.lastCycle").
 * Falls back to English if Italian is missing, then to the key itself.
 */
export function t(key: string): string {
  const lang = getLang();
  const [section, ...rest] = key.split(".");
  const field = rest.join(".");
  const entry = (i18n as Record<string, Record<string, Record<string, string>>>)[section]?.[field];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? key;
}

/**
 * Translate a cognitive mode name (browsing, thinking, etc.)
 */
export function translateMode(mode: string): string {
  return t(`mode.${mode}`) !== `mode.${mode}` ? t(`mode.${mode}`) : mode;
}

type DimEntry = { en?: string; it?: string; desc_en?: string; desc_it?: string };
const dims = (i18n as Record<string, Record<string, DimEntry>>).dimensions ?? {};

// Build reverse lookup: English label → key (for backward compat with current backend)
const labelToKey: Record<string, string> = {};
for (const [key, entry] of Object.entries(dims)) {
  if (entry.en) labelToKey[entry.en] = key;
}

/**
 * Resolve a dimension by public_key or English label, return translated label.
 */
export function translateDimensionLabel(keyOrLabel: string): string {
  const lang = getLang();
  const key = labelToKey[keyOrLabel] ?? keyOrLabel;
  const entry = dims[key];
  if (!entry) return keyOrLabel;
  return entry[lang] ?? entry.en ?? keyOrLabel;
}

export function translateDimensionDesc(keyOrLabel: string, fallbackDesc: string): string {
  const lang = getLang();
  const key = labelToKey[keyOrLabel] ?? keyOrLabel;
  const entry = dims[key];
  if (!entry) return fallbackDesc;
  const descKey = `desc_${lang}` as keyof DimEntry;
  return (entry[descKey] as string | undefined) ?? entry.desc_en ?? fallbackDesc;
}

/**
 * Translate a memory type key (thinking, dream, conversation, etc.)
 */
export function translateMemoryType(memoryType: string): string {
  const lang = getLang();
  const entry = (i18n as Record<string, Record<string, Record<string, string>>>).memoryType?.[memoryType];
  return entry?.[lang] ?? (memoryType === "conversation" ? "chat" : memoryType);
}

/**
 * Translate a node kind key (friend, book, source, etc.)
 */
export function translateKind(kind: string): string {
  const lang = getLang();
  const entry = (i18n as Record<string, Record<string, Record<string, string>>>).kind?.[kind];
  return entry?.[lang] ?? kind;
}

/**
 * Get a localized summary for a social action type.
 * For follow actions, pass the target handle to include it.
 */
export function socialActionSummary(action: string, target?: string | null): string {
  if (action === "follow" && target) {
    return `${t("social.action.follow")} ${target}`;
  }
  const key = `social.action.${action}`;
  const result = t(key);
  return result !== key ? result : "";
}

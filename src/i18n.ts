export type Lang = "en" | "it";

const STORAGE_KEY = "jm-lang";

function detectLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "it" || stored === "en") return stored;
  return navigator.language.startsWith("it") ? "it" : "en";
}

let currentLang: Lang = detectLang();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
}

/** Pick the right field based on current language.
 *  Fields come from the backend as: original (Italian), _en (English).
 *  - lang=en → prefer english, fallback to original
 *  - lang=it → prefer original, fallback to english
 */
export function localized<T extends string | null | undefined>(original: T, english?: T | null): T {
  if (currentLang === "it") {
    return (original != null && original !== "" ? original : english ?? original) as T;
  }
  return (english != null && english !== "" ? english : original) as T;
}

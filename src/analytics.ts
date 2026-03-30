declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const DENIED_CONSENT = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

const GRANTED_ANALYTICS_CONSENT = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "granted",
} as const;

let defaultConsentConfigured = false;
let analyticsScriptPromise: Promise<void> | null = null;
let analyticsInitialized = false;
let configuredMeasurementId: string | null = null;

function ensureGtagStub(): void {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });
}

function loadAnalyticsScript(measurementId: string): Promise<void> {
  if (analyticsScriptPromise) {
    return analyticsScriptPromise;
  }

  analyticsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Analytics script."));
    document.head.appendChild(script);
  });

  return analyticsScriptPromise;
}

export function prepareAnalytics(measurementId: string | undefined): void {
  const trimmedId = measurementId?.trim();
  if (!trimmedId || typeof window === "undefined") {
    return;
  }

  ensureGtagStub();

  // Consent default is set by the inline script in each HTML page
  // (before any module JS loads). This ensures it's the first dataLayer command.
  // We only set it here as a safety fallback if somehow the inline was missing.
  if (!defaultConsentConfigured) {
    window.gtag?.("consent", "default", {
      ...DENIED_CONSENT,
    });
    defaultConsentConfigured = true;
  }
}

export function rejectAnalyticsConsent(measurementId: string | undefined): void {
  if (!measurementId?.trim() || typeof window === "undefined") {
    return;
  }

  prepareAnalytics(measurementId);
  window.gtag?.("consent", "update", DENIED_CONSENT);
}

export async function grantAnalyticsConsent(measurementId: string | undefined): Promise<void> {
  const trimmedId = measurementId?.trim();
  if (!trimmedId || typeof window === "undefined") {
    return;
  }

  prepareAnalytics(trimmedId);
  await loadAnalyticsScript(trimmedId);

  if (!analyticsInitialized) {
    window.gtag?.("js", new Date());
    analyticsInitialized = true;
  }

  window.gtag?.("consent", "update", GRANTED_ANALYTICS_CONSENT);

  if (configuredMeasurementId !== trimmedId) {
    window.gtag?.("config", trimmedId);
    configuredMeasurementId = trimmedId;
  }
}

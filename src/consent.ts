import { grantAnalyticsConsent, prepareAnalytics, rejectAnalyticsConsent } from "./analytics";

type ConsentChoice = "accepted" | "rejected";

const CONSENT_STORAGE_KEY = "jmillerai-cookie-consent";

function readConsentChoice(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

function writeConsentChoice(value: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures and keep consent in memory for the current page.
  }
}

function removeConsentBanner(): void {
  document.querySelector("[data-consent-banner]")?.remove();
}

function renderConsentBanner(): string {
  return `
    <aside class="consent-banner" data-consent-banner role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div class="consent-banner__copy">
        <span class="section-name">Cookies</span>
        <p class="body-copy">This site uses essential storage for core functionality and optional Google Analytics to measure visits. Essential storage stays on. Analytics starts only if you accept.</p>
      </div>
      <div class="consent-banner__actions">
        <button type="button" class="consent-banner__button consent-banner__button--ghost" data-consent-action="reject">Reject analytics</button>
        <button type="button" class="consent-banner__button" data-consent-action="accept">Accept analytics</button>
      </div>
    </aside>
  `;
}

export function initializeConsentBanner(measurementId: string | undefined): void {
  const trimmedId = measurementId?.trim();
  if (!trimmedId || typeof window === "undefined") {
    return;
  }

  prepareAnalytics(trimmedId);

  const consent = readConsentChoice();
  if (consent === "accepted") {
    void grantAnalyticsConsent(trimmedId);
    removeConsentBanner();
    return;
  }

  if (consent === "rejected") {
    rejectAnalyticsConsent(trimmedId);
    removeConsentBanner();
    return;
  }

  removeConsentBanner();
  document.body.insertAdjacentHTML("beforeend", renderConsentBanner());

  const banner = document.querySelector<HTMLElement>("[data-consent-banner]");
  const acceptButton = banner?.querySelector<HTMLButtonElement>("[data-consent-action='accept']");
  const rejectButton = banner?.querySelector<HTMLButtonElement>("[data-consent-action='reject']");

  acceptButton?.addEventListener("click", () => {
    writeConsentChoice("accepted");
    removeConsentBanner();
    void grantAnalyticsConsent(trimmedId);
  }, { once: true });

  rejectButton?.addEventListener("click", () => {
    writeConsentChoice("rejected");
    rejectAnalyticsConsent(trimmedId);
    removeConsentBanner();
  }, { once: true });
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function appendAnalyticsScript(measurementId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Analytics script."));
    document.head.appendChild(script);
  });
}

export async function initializeAnalytics(measurementId: string | undefined): Promise<void> {
  const trimmedId = measurementId?.trim();
  if (!trimmedId || typeof window === "undefined") {
    return;
  }

  if (window.gtag) {
    window.gtag("config", trimmedId);
    return;
  }

  await appendAnalyticsScript(trimmedId);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", trimmedId);
}

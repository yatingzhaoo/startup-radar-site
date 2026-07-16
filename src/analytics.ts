type EventProperties = Record<string, boolean | number | string | null | undefined>;
type PostHogClient = typeof import("posthog-js").default;

const OWNER_STORAGE_KEY = "startup_radar_owner";
let clientPromise: Promise<PostHogClient | null> | null = null;

function readEnv(name: string) {
  return import.meta.env[name] as string | undefined;
}

export function getVisitorType() {
  if (typeof window === "undefined") return "visitor";
  const params = new URLSearchParams(window.location.search);
  if (params.get("owner") === "1") {
    window.localStorage.setItem(OWNER_STORAGE_KEY, "1");
  }
  return window.localStorage.getItem(OWNER_STORAGE_KEY) === "1" ? "owner" : "visitor";
}

export function baseEventProperties(): EventProperties {
  if (typeof window === "undefined") return { visitor_type: "visitor" };
  return {
    site: "startup_radar",
    visitor_type: getVisitorType(),
    source_page: document.title || "每日创业阅读",
    current_path: window.location.pathname,
    path: window.location.pathname,
    url: window.location.href,
    title: document.title || "",
    referrer: document.referrer || ""
  };
}

export function initializeAnalytics() {
  if (typeof window === "undefined") return;
  void getClient();
}

async function getClient() {
  if (clientPromise) return clientPromise;
  const token = readEnv("VITE_POSTHOG_PROJECT_TOKEN") || readEnv("NEXT_PUBLIC_POSTHOG_KEY");
  const host = readEnv("VITE_POSTHOG_HOST") || readEnv("NEXT_PUBLIC_POSTHOG_HOST") || "https://us.i.posthog.com";
  if (!token) {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }

  clientPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(token, {
      api_host: host,
      capture_pageview: false,
      autocapture: false,
      loaded: () => {
        if (getVisitorType() === "owner") {
          posthog.register({ visitor_type: "owner" });
        }
      }
    });
    return posthog;
  });
  return clientPromise;
}

export function trackEvent(eventName: string, properties: EventProperties = {}) {
  if (typeof window === "undefined") return;
  void getClient().then((posthog) => {
    if (!posthog) return;
    posthog.capture(eventName, {
      ...baseEventProperties(),
      ...properties
    });
  });
}

export function capturePageview() {
  trackEvent("$pageview");
}

export function installGlobalClickTracking() {
  if (typeof window === "undefined") return () => {};

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a");
    if (!(link instanceof HTMLAnchorElement)) return;

    const href = link.href;
    const label = link.textContent?.trim() || href;
    const location = link.dataset.analyticsLocation || "page";

    if (link.dataset.analyticsEvent) {
      trackEvent(link.dataset.analyticsEvent, {
        title: label,
        href,
        label,
        location,
        source: document.title || "每日创业阅读",
        destination: href,
        project_title: link.dataset.analyticsProjectTitle
      });
      return;
    }

    if (href && new URL(href, window.location.href).origin !== window.location.origin) {
      trackEvent("outbound_link_clicked", {
        label,
        href,
        location,
        destination: href,
        source: document.title || "每日创业阅读"
      });
    }
  };

  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

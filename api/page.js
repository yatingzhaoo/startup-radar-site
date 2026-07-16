import { readStoredFeed } from "./feed.js";

export const config = {
  maxDuration: 10
};

export default async function handler(_request, response) {
  try {
    const feed = await readStoredFeed();
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    response.status(200).send(renderPage(feed));
  } catch (error) {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.status(500).send(renderPage(null, error));
  }
}

export function renderPage(feed, error) {
  const days = Array.isArray(feed?.days) ? feed.days.slice(0, 14) : [];
  const content = days.length
    ? days.map((day) => renderDay(day)).join("")
    : `<p class="loadingText">${escapeHtml(error ? "内容读取失败，请稍后再试。" : "暂无内容。")}</p>`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>每日创业阅读</title>
    <style>${CSS}</style>
  </head>
  <body>
    <main class="page">${content}</main>
    ${renderAnalyticsScript()}
  </body>
</html>`;
}

function renderDay(day) {
  return `<section class="dayFeed">
  <div class="dayHead"><h2>${escapeHtml(day.date || "")}</h2></div>
  <section class="section">
    <h3>值得关注的十家新公司</h3>
    <ol class="linkList">${(day.companies || []).slice(0, 10).map((company, index) => renderCompany(company, index)).join("")}</ol>
  </section>
  <section class="section readingSection">
    <h3>三篇当日阅读</h3>
    <ol class="readingList">${(day.readings || []).slice(0, 3).map((reading, index) => renderReading(reading, index)).join("")}</ol>
  </section>
</section>`;
}

function renderCompany(company, index) {
  const name = escapeHtml(company.name || "");
  const title = isRealLink(company.url)
    ? `<a class="companyName" href="${escapeAttribute(company.url)}" target="_blank" rel="noreferrer" data-analytics-location="company" data-analytics-label="${name}">${name}</a>`
    : `<span class="companyName">${name}</span>`;

  return `<li class="companyRow">
  <div class="rowNumber">${index + 1}</div>
  <article>
    <div class="rowTitle">${title}</div>
    <p class="companyExplanation">${escapeHtml(formatBodyText(company.story || company.explanation || ""))}</p>
  </article>
</li>`;
}

function renderReading(reading, index) {
  const titleText = escapeHtml(reading.title || "");
  const title = isRealLink(reading.url)
    ? `<a href="${escapeAttribute(reading.url)}" target="_blank" rel="noreferrer" data-analytics-event="writing_link_clicked" data-analytics-location="reading" data-analytics-label="${titleText}">${titleText}</a>`
    : `<span>${titleText}</span>`;

  return `<li class="readingRow">
  <div class="rowNumber">${index + 1}</div>
  <article class="readingItem">
    <h4>${title}</h4>
    <p>${escapeHtml(formatBodyText(reading.story || reading.narration || ""))}</p>
  </article>
</li>`;
}

function isRealLink(url) {
  return Boolean(url) && !String(url).includes("example.com");
}

function formatBodyText(value = "") {
  return String(value)
    .replace(/\s*[—–]+\s*/g, "：")
    .replace(/：+/g, "：");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function renderAnalyticsScript() {
  const token = process.env.VITE_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
  if (!token) return "";
  const host = process.env.VITE_POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  return `<script src="${escapeAttribute(`${host.replace(/\/$/, "")}/static/array.js`)}"></script>
<script>
(function () {
  var token = ${JSON.stringify(token)};
  var host = ${JSON.stringify(host.replace(/\/$/, ""))};
  var ownerKey = "startup_radar_owner";

  function visitorType() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("owner") === "1") window.localStorage.setItem(ownerKey, "1");
      return window.localStorage.getItem(ownerKey) === "1" ? "owner" : "visitor";
    } catch (_) {
      return "visitor";
    }
  }

  function baseProperties() {
    return {
      site: "startup_radar",
      visitor_type: visitorType(),
      source_page: document.title || "每日创业阅读",
      current_path: window.location.pathname,
      path: window.location.pathname,
      url: window.location.href,
      title: document.title || "",
      referrer: document.referrer || ""
    };
  }

  window.trackEvent = function (eventName, properties) {
    if (!window.posthog || typeof window.posthog.capture !== "function") return;
    window.posthog.capture(eventName, Object.assign(baseProperties(), properties || {}));
  };

  if (window.posthog && typeof window.posthog.init === "function") {
    window.posthog.init(token, {
      api_host: host,
      capture_pageview: false,
      autocapture: false
    });
    if (visitorType() === "owner") window.posthog.register({ visitor_type: "owner" });
    window.trackEvent("$pageview");
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var link = target.closest("a");
    if (!link || !link.href) return;
    var label = link.getAttribute("data-analytics-label") || (link.textContent || "").trim() || link.href;
    var location = link.getAttribute("data-analytics-location") || "page";
    var eventName = link.getAttribute("data-analytics-event");
    if (eventName) {
      window.trackEvent(eventName, {
        title: label,
        href: link.href,
        label: label,
        location: location,
        source: document.title || "每日创业阅读",
        destination: link.href,
        project_title: link.getAttribute("data-analytics-project-title") || undefined
      });
      return;
    }
    try {
      if (new URL(link.href, window.location.href).origin !== window.location.origin) {
        window.trackEvent("outbound_link_clicked", {
          label: label,
          href: link.href,
          location: location,
          destination: link.href,
          source: document.title || "每日创业阅读"
        });
      }
    } catch (_) {}
  });
})();
</script>`;
}

const CSS = `
:root {
  color-scheme: light;
  --bg: #f7f7f7;
  --text: #111111;
  --muted: #666666;
  --faint: #8a8a8a;
  --link: #1d3f72;
  --link-hover: #000000;
  --content-width: 820px;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.55;
  background: var(--bg);
  color: var(--text);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); }
a { color: var(--link); text-decoration: none; font: inherit; }
a:hover { color: var(--link-hover); text-decoration: underline; }
.page { width: min(var(--content-width), calc(100vw - 28px)); margin: 0 auto; padding: 18px 0 56px; }
h1, h2, h3, h4, p { margin: 0; }
.dayFeed { padding: 18px 0 30px; }
.dayHead { padding: 6px 0 12px; }
.dayHead h2 {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 20px;
  line-height: 1.2;
}
.section { padding-top: 12px; }
h3 { font-size: 17px; font-weight: 700; }
.linkList, .readingList { list-style: none; margin: 0; padding: 0; }
.companyRow, .readingRow {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 8px;
}
.companyRow { padding: 18px 0 20px; }
.readingRow { padding: 13px 0; }
.rowNumber {
  color: var(--faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  padding-top: 2px;
  text-align: right;
}
.rowTitle { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.companyName { font-size: 16px; font-weight: 700; }
.companyExplanation, .readingItem p {
  margin-top: 7px;
  color: #202020;
  font-size: 16px;
  line-height: 1.72;
}
.readingSection { padding-top: 18px; }
.readingItem { padding: 4px 0; }
.readingItem h4 { font-size: 16px; font-weight: 700; line-height: 1.35; }
.readingItem p { margin-top: 8px; }
.loadingText { color: var(--muted); font-size: 15px; margin: 24px 0; }
@media (max-width: 720px) {
  :root { font-size: 14px; }
  .page { width: calc(100vw - 20px); padding-top: 10px; }
  .companyRow, .readingRow { grid-template-columns: 24px 1fr; gap: 6px; }
  .rowNumber { text-align: left; }
  .companyExplanation, .readingItem p { font-size: 15px; line-height: 1.68; }
}`;

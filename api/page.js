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
  const dateNavigation = days.length ? renderDateNavigation(days) : "";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>每日创业阅读</title>
    <style>${CSS}</style>
  </head>
  <body>
    ${dateNavigation}
    <main class="page">${content}</main>
    ${days.length ? renderDateNavigationScript() : ""}
    ${renderAnalyticsScript()}
  </body>
</html>`;
}

function renderDay(day) {
  const date = escapeHtml(day.date || "");
  return `<section class="dayFeed" id="date-${escapeAttribute(day.date || "")}" data-date="${escapeAttribute(day.date || "")}">
  <div class="dayHead"><h2>${date}</h2></div>
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

function renderDateNavigation(days) {
  return `<nav class="dateRail" aria-label="按日期快速跳转"><ol>${days.map((day, index) => {
    const date = escapeAttribute(day.date || "");
    return `<li><a class="dateTick${index === 0 ? " isActive" : ""}" href="#date-${date}" ${index === 0 ? 'aria-current="date" ' : ""}aria-label="跳转到 ${date}" data-date="${date}"><span class="visuallyHidden">${date}</span></a></li>`;
  }).join("")}</ol></nav>`;
}

function renderDateNavigationScript() {
  return `<script>
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll(".dateTick"));
  var sections = Array.prototype.slice.call(document.querySelectorAll(".dayFeed[data-date]"));
  var frame = null;

  function updateActiveDate() {
    frame = null;
    var targetY = window.innerHeight * 0.28;
    var closest = sections.reduce(function (best, section) {
      var distance = Math.abs(section.getBoundingClientRect().top - targetY);
      return !best || distance < best.distance ? { date: section.getAttribute("data-date"), distance: distance } : best;
    }, null);

    links.forEach(function (link) {
      var active = closest && link.getAttribute("data-date") === closest.date;
      link.classList.toggle("isActive", Boolean(active));
      if (active) link.setAttribute("aria-current", "date");
      else link.removeAttribute("aria-current");
    });
  }

  function requestUpdate() {
    if (frame === null) frame = window.requestAnimationFrame(updateActiveDate);
  }

  updateActiveDate();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
})();
</script>`;
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
html { scroll-behavior: smooth; }
a { color: var(--link); text-decoration: none; font: inherit; }
a:hover { color: var(--link-hover); text-decoration: underline; }
.page { width: min(var(--content-width), calc(100vw - 28px)); margin: 0 auto; padding: 18px 0 56px; }
.dateRail { position: fixed; z-index: 10; top: 50%; left: 16px; transform: translateY(-50%); }
.dateRail ol { display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0; list-style: none; }
.dateTick { position: relative; display: block; width: 44px; height: 20px; }
.dateTick::before {
  position: absolute; top: 9px; left: 4px; width: 10px; border-top: 3px solid #c8c8c8;
  content: ""; transition: width 140ms ease, border-color 140ms ease;
}
.dateTick::after {
  position: absolute; top: 50%; left: 30px; padding: 3px 7px; border: 1px solid #ececec;
  border-radius: 4px; background: rgba(255, 255, 255, 0.96); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: var(--muted); content: attr(data-date); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px; line-height: 1.4; opacity: 0; pointer-events: none; transform: translate(4px, -50%);
  transition: opacity 120ms ease, transform 120ms ease; white-space: nowrap;
}
.dateTick:hover, .dateTick:focus-visible { text-decoration: none; }
.dateTick:hover::before, .dateTick:focus-visible::before { width: 16px; border-color: #777777; }
.dateTick:hover::after, .dateTick:focus-visible::after { opacity: 1; transform: translate(0, -50%); }
.dateTick.isActive::before { width: 18px; border-color: #5e5e5e; }
.dateTick:focus-visible { outline: 2px solid var(--link); outline-offset: 1px; }
.visuallyHidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
h1, h2, h3, h4, p { margin: 0; }
.dayFeed { padding: 18px 0 30px; scroll-margin-top: 18px; }
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
  .page { width: auto; margin: 0 10px 0 42px; padding-top: 10px; }
  .dateRail { left: 4px; }
  .dateTick { width: 34px; height: 18px; }
  .dateTick::before { top: 8px; }
  .dateTick::after { display: none; }
  .companyRow, .readingRow { grid-template-columns: 24px 1fr; gap: 6px; }
  .rowNumber { text-align: left; }
  .companyExplanation, .readingItem p { font-size: 15px; line-height: 1.68; }
}`;

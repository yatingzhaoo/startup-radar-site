import { readFile } from "node:fs/promises";

const days = parseDays(process.argv[2] || "7");
const env = await readAnalyticsEnv();
const projectId = required(env.POSTHOG_PROJECT_ID, "POSTHOG_PROJECT_ID");
const host = (env.POSTHOG_HOST || "https://us.posthog.com").replace(/\/$/, "");
const apiKey = required(env.POSTHOG_PERSONAL_API_KEY, "POSTHOG_PERSONAL_API_KEY");

const queries = [
  ["Unique visitors", uniqueVisitorsQuery(days)],
  ["Sessions", sessionsQuery(days)],
  ["Pageviews", pageviewsQuery(days)],
  ["Daily visitors", dailyVisitorsQuery(days)],
  ["Referrers", referrersQuery(days)],
  ["Top clicked events", topClickedEventsQuery(days)],
  ["Booking clicks", eventCountQuery(days, "booking_link_clicked")],
  ["Case study opens", eventCountQuery(days, "case_study_opened")],
  ["Writing clicks", writingClicksQuery(days)],
  ["High-intent visitors", highIntentVisitorsQuery(days)]
];

console.log(`PostHog report: last ${days} days`);
console.log(`Project: ${projectId}`);
console.log("");

for (const [title, query] of queries) {
  const rows = await runHogQl(query);
  printSection(title, rows);
}

async function readAnalyticsEnv() {
  const text = await readFile(new URL("../.env.analytics", import.meta.url), "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

async function runHogQl(query) {
  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog query failed ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.results || [];
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required in .env.analytics`);
  return value;
}

function parseDays(value) {
  const parsed = Number.parseInt(String(value).replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

function since(days) {
  return `timestamp >= now() - interval ${Number(days)} day`;
}

function notOwner() {
  return `coalesce(properties['visitor_type'], '') != 'owner'`;
}

function uniqueVisitorsQuery(days) {
  return `
    select count(distinct person_id)
    from events
    where ${since(days)} and ${notOwner()}
  `;
}

function sessionsQuery(days) {
  return `
    select count(distinct properties['$session_id'])
    from events
    where ${since(days)} and ${notOwner()} and properties['$session_id'] is not null
  `;
}

function pageviewsQuery(days) {
  return `
    select count()
    from events
    where ${since(days)} and ${notOwner()} and event = '$pageview'
  `;
}

function dailyVisitorsQuery(days) {
  return `
    select toDate(timestamp) as day, count(distinct person_id) as visitors, countIf(event = '$pageview') as pageviews
    from events
    where ${since(days)} and ${notOwner()}
    group by day
    order by day desc
  `;
}

function referrersQuery(days) {
  return `
    select coalesce(nullIf(properties['referrer'], ''), nullIf(properties['$referrer'], ''), '(direct)') as referrer, count() as events
    from events
    where ${since(days)} and ${notOwner()} and event = '$pageview'
    group by referrer
    order by events desc
    limit 20
  `;
}

function topClickedEventsQuery(days) {
  return `
    select event, coalesce(properties['label'], properties['title'], properties['href'], '') as label, count() as clicks
    from events
    where ${since(days)} and ${notOwner()} and event in ('outbound_link_clicked', 'writing_link_clicked', 'booking_link_clicked', 'project_card_clicked', 'case_study_opened', 'image_lightbox_opened', 'pricing_tooltip_toggled')
    group by event, label
    order by clicks desc
    limit 25
  `;
}

function eventCountQuery(days, eventName) {
  return `
    select count()
    from events
    where ${since(days)} and ${notOwner()} and event = '${eventName}'
  `;
}

function writingClicksQuery(days) {
  return `
    select coalesce(properties['title'], properties['label'], '') as title, coalesce(properties['href'], '') as href, count() as clicks
    from events
    where ${since(days)} and ${notOwner()} and event = 'writing_link_clicked'
    group by title, href
    order by clicks desc
    limit 25
  `;
}

function highIntentVisitorsQuery(days) {
  return `
    select person_id, count() as high_intent_events, max(timestamp) as last_seen
    from events
    where ${since(days)}
      and ${notOwner()}
      and event in ('booking_link_clicked', 'case_study_opened', 'writing_link_clicked', 'outbound_link_clicked')
    group by person_id
    order by high_intent_events desc, last_seen desc
    limit 25
  `;
}

function printSection(title, rows) {
  console.log(`## ${title}`);
  if (!rows.length) {
    console.log("(no rows)");
    console.log("");
    return;
  }
  for (const row of rows) {
    console.log(Array.isArray(row) ? row.join(" | ") : JSON.stringify(row));
  }
  console.log("");
}

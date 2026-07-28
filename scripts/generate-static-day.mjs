import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichFeedWithDeepSeek } from "../api/feed.js";
import {
  companyDedupeKeys,
  generateLiveFeed,
  isClearlyNotCompanyEntity,
  isBlockedReading,
  isInsightfulReading,
  readingDedupeKey
} from "./update-data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const feedPath = join(root, "src/data/feed.json");
const readingHistoryPath = join(root, "src/data/reading-history.json");
const date = process.argv[2] || currentLosAngelesDate();
const existingFeed = JSON.parse(readFileSync(feedPath, "utf8"));
const historyDays = (existingFeed.days || []).filter((day) => day.date !== date);
const storedReadingHistory = readReadingHistory();
const sharedReadingHistory = await readSharedReadingHistory();
const knownReadingHistory = mergeReadingHistory([
  ...storedReadingHistory,
  ...feedReadingHistory(existingFeed, "startup-radar"),
  ...feedReadingHistory(sharedReadingHistory, "daily-reading")
]);
const usedReadingKeys = new Set(knownReadingHistory.map((entry) => entry.key).filter(Boolean));

const dayFeed = await generateLiveFeed({
  daysBack: 1,
  today: date,
  initialExcludedCompanyIds: collectCompanyKeys(historyDays),
  initialUsedReadingKeys: usedReadingKeys,
  checkReadingLinks: true
});

for (const company of dayFeed.days?.[0]?.companies || []) {
  company.url = safeCompanyUrl(company);
}
validateSelection(dayFeed.days?.[0], date);
let usedAi = false;
if (process.env.DEEPSEEK_API_KEY) {
  await enrichFeedWithDeepSeek(dayFeed, { days: 1, strict: true });
  usedAi = true;
} else if (process.env.ALLOW_NO_AI !== "1") {
  throw new Error("DEEPSEEK_API_KEY is required; set ALLOW_NO_AI=1 only for an explicit fallback build");
}

const day = dayFeed.days[0];
const updatedReadingHistory = mergeReadingHistory([
  ...knownReadingHistory,
  ...day.readings.map((reading) => readingHistoryEntry(reading, date, "startup-radar"))
]);
const feed = {
  generatedAt: new Date().toISOString(),
  source: "github-static",
  days: [day, ...historyDays].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14)
};

mkdirSync(dirname(feedPath), { recursive: true });
writeFileSync(feedPath, `${JSON.stringify(feed, null, 2)}\n`);
writeFileSync(readingHistoryPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), readings: updatedReadingHistory }, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  date,
  companies: day.companies.map((company) => company.name),
  readings: day.readings.map((reading) => reading.title),
  usedAi
}, null, 2));

function validateSelection(value, expectedDate) {
  if (value?.date !== expectedDate) throw new Error(`Generated ${value?.date || "nothing"}, expected ${expectedDate}`);
  if (value.companies?.length !== 10) throw new Error(`Expected 10 companies, received ${value.companies?.length || 0}`);
  if (value.readings?.length !== 3) throw new Error(`Expected 3 readings, received ${value.readings?.length || 0}`);
  const invalidCompany = value.companies.find(isClearlyNotCompanyEntity);
  if (invalidCompany) throw new Error(`Non-company entity selected: ${invalidCompany.name}`);
  for (const item of [...value.companies, ...value.readings]) {
    if (!/^https:\/\//.test(item.url || "")) throw new Error(`Invalid URL for ${item.name || item.title}`);
  }
  for (const reading of value.readings) {
    if (!isInsightfulReading(reading)) throw new Error(`Introductory or low-insight reading selected: ${reading.title}`);
  }
}

function safeCompanyUrl(company) {
  const candidates = [company.url, company.website, company.sourceUrl];
  for (const candidate of candidates) {
    if (/^https:\/\//.test(candidate || "")) return candidate;
  }
  for (const candidate of candidates) {
    if (/^http:\/\//.test(candidate || "")) return String(candidate).replace(/^http:\/\//, "https://");
  }
  return "";
}

function collectCompanyKeys(days) {
  return new Set(days.flatMap((day) => day.companies || []).flatMap((company) => companyDedupeKeys(company)));
}

function readReadingHistory() {
  if (!existsSync(readingHistoryPath)) return [];
  try {
    return JSON.parse(readFileSync(readingHistoryPath, "utf8")).readings || [];
  } catch {
    return [];
  }
}

async function readSharedReadingHistory() {
  const localPath = join(root, "../daily-reading-feed/data/fallback-feed.mjs");
  try {
    const source = existsSync(localPath)
      ? readFileSync(localPath, "utf8")
      : await fetch(
          "https://raw.githubusercontent.com/yatingzhaoo/daily-reading-feed/main/data/fallback-feed.mjs",
          { signal: AbortSignal.timeout(10000) }
        ).then((response) => {
          if (!response.ok) throw new Error(`Shared reading history returned ${response.status}`);
          return response.text();
        });
    const match = source.match(/^const fallbackFeed = ([\s\S]+);\s*export default fallbackFeed;\s*$/);
    if (!match) throw new Error("Shared reading history has an unknown format");
    return JSON.parse(match[1]);
  } catch (error) {
    if (storedReadingHistory.length) {
      console.warn(`Shared reading history unavailable; using the stored ledger: ${error.message}`);
      return { days: [] };
    }
    throw error;
  }
}

function feedReadingHistory(feed, site) {
  return (feed?.days || []).flatMap((day) =>
    (day.readings || [])
      .filter((reading) => !isBlockedReading(reading))
      .map((reading) => readingHistoryEntry(reading, day.date, site))
  );
}

function readingHistoryEntry(reading, usedAt, site) {
  return {
    key: readingDedupeKey(reading),
    title: reading.title || "",
    url: reading.url || "",
    usedAt,
    site
  };
}

function mergeReadingHistory(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    if (!entry?.key) continue;
    const previous = byKey.get(entry.key);
    if (!previous || String(entry.usedAt || "") < String(previous.usedAt || "")) {
      byKey.set(entry.key, entry);
    }
  }
  return [...byKey.values()].sort(
    (left, right) => String(right.usedAt || "").localeCompare(String(left.usedAt || "")) || left.key.localeCompare(right.key)
  );
}

function currentLosAngelesDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

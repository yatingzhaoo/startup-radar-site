import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichFeedWithDeepSeek } from "../api/feed.js";
import {
  companyDedupeKeys,
  generateLiveFeed,
  isBlockedReading,
  readingDedupeKey
} from "./update-data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const feedPath = join(root, "src/data/feed.json");
const date = process.argv[2] || currentLosAngelesDate();
const existingFeed = JSON.parse(readFileSync(feedPath, "utf8"));
const historyDays = (existingFeed.days || []).filter((day) => day.date !== date && day.date <= date);

const dayFeed = await generateLiveFeed({
  daysBack: 1,
  today: date,
  initialExcludedCompanyIds: collectCompanyKeys(historyDays),
  initialUsedReadingKeys: collectReadingKeys(historyDays),
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
const feed = {
  generatedAt: new Date().toISOString(),
  source: "github-static",
  days: [day, ...historyDays].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14)
};

mkdirSync(dirname(feedPath), { recursive: true });
writeFileSync(feedPath, `${JSON.stringify(feed, null, 2)}\n`);
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
  for (const item of [...value.companies, ...value.readings]) {
    if (!/^https:\/\//.test(item.url || "")) throw new Error(`Invalid URL for ${item.name || item.title}`);
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

function collectReadingKeys(days) {
  return new Set(
    days
      .flatMap((day) => day.readings || [])
      .filter((reading) => !isBlockedReading(reading))
      .map((reading) => readingDedupeKey(reading))
      .filter(Boolean)
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

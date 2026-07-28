import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichFeedWithDeepSeek } from "../api/feed.js";
import {
  companyDedupeKeys,
  generateLiveFeed,
  isClearlyNotCompanyEntity
} from "./update-data.mjs";

if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is required");

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const feedPath = join(root, "src/data/feed.json");
const feed = JSON.parse(readFileSync(feedPath, "utf8"));
const invalidItems = (feed.days || []).flatMap((day) =>
  (day.companies || [])
    .map((company, index) => ({ day, company, index }))
    .filter(({ company }) => isClearlyNotCompanyEntity(company))
);

if (!invalidItems.length) {
  console.log(JSON.stringify({ ok: true, repaired: 0 }, null, 2));
  process.exit(0);
}

const excluded = new Set(
  (feed.days || [])
    .flatMap((day) => day.companies || [])
    .filter((company) => !isClearlyNotCompanyEntity(company))
    .flatMap(companyDedupeKeys)
);

const repairsByDate = new Map();
for (const { day, index } of invalidItems) {
  const entries = repairsByDate.get(day.date) || [];
  entries.push(index);
  repairsByDate.set(day.date, entries);
}

for (const [date, indexes] of repairsByDate) {
  const candidateFeed = await generateLiveFeed({
    daysBack: 1,
    today: date,
    initialExcludedCompanyIds: excluded
  });
  const replacements = candidateFeed.days[0].companies.slice(0, indexes.length);
  if (replacements.length !== indexes.length) {
    throw new Error(`Could not find ${indexes.length} replacements for ${date}`);
  }

  await enrichFeedWithDeepSeek(
    { days: [{ date, companies: replacements, readings: [] }] },
    { days: 1, strict: true }
  );

  const targetDay = feed.days.find((day) => day.date === date);
  indexes.forEach((index, replacementIndex) => {
    targetDay.companies[index] = replacements[replacementIndex];
  });
  targetDay.companies.forEach((company, index) => {
    company.rank = index + 1;
  });
  for (const company of replacements) {
    for (const key of companyDedupeKeys(company)) excluded.add(key);
  }
}

const remaining = (feed.days || [])
  .flatMap((day) => day.companies || [])
  .filter(isClearlyNotCompanyEntity);
if (remaining.length) {
  throw new Error(`Non-company entities remain: ${remaining.map((item) => item.name).join(", ")}`);
}

feed.generatedAt = new Date().toISOString();
writeFileSync(feedPath, `${JSON.stringify(feed, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  repaired: invalidItems.length,
  removed: invalidItems.map(({ day, company }) => `${day.date}: ${company.name}`)
}, null, 2));

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichFeedWithDeepSeek } from "../api/feed.js";

if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is required");

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const feedPath = join(root, "src/data/feed.json");
const feed = JSON.parse(readFileSync(feedPath, "utf8"));
const fallbackPatterns = [
  /如果你是这类业务的一线负责人，最常见的痛苦往往不是一个惊天动地的大问题/,
  /很多关于.+的问题，刚开始看都像常识，真正做起来才会发现细节很难/,
  /而这类文章的价值就是把这些坑讲清楚/
];

const repairDays = (feed.days || [])
  .map((day) => ({
    date: day.date,
    companies: (day.companies || []).filter((item) => isFallback(item.story)),
    readings: (day.readings || []).filter((item) => isFallback(item.story))
  }))
  .filter((day) => day.companies.length || day.readings.length);

if (!repairDays.length) {
  console.log(JSON.stringify({ ok: true, repaired: 0 }, null, 2));
  process.exit(0);
}

await enrichFeedWithDeepSeek({ days: repairDays }, { days: repairDays.length, strict: true });

let repaired = 0;
for (const repairDay of repairDays) {
  const targetDay = feed.days.find((day) => day.date === repairDay.date);
  for (const type of ["companies", "readings"]) {
    const stories = new Map(repairDay[type].map((item) => [String(item.id), item.story]));
    for (const item of targetDay[type] || []) {
      if (!stories.has(String(item.id))) continue;
      item.story = stories.get(String(item.id));
      repaired += 1;
    }
  }
}

const remaining = (feed.days || []).flatMap((day) => [
  ...(day.companies || []).filter((item) => isFallback(item.story)),
  ...(day.readings || []).filter((item) => isFallback(item.story))
]);
if (remaining.length) throw new Error(`Fallback stories remain after repair: ${remaining.length}`);

feed.generatedAt = new Date().toISOString();
writeFileSync(feedPath, `${JSON.stringify(feed, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  repaired,
  days: repairDays.map((day) => day.date)
}, null, 2));

function isFallback(value) {
  return fallbackPatterns.some((pattern) => pattern.test(String(value || "")));
}

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { companyDedupeKeys, isBlockedReading, readingDedupeKey } from "./update-data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const expectedDate = process.argv[2] || currentLosAngelesDate();
const feed = JSON.parse(readFileSync(join(root, "src/data/feed.json"), "utf8"));
const latest = feed.days?.[0];
const companyKeys = new Set();
const readingKeys = new Set();

assert(latest?.date === expectedDate, `Latest date is ${latest?.date || "missing"}, expected ${expectedDate}`);
assertFreshNarration(latest);
for (const day of feed.days || []) {
  assert(day.companies?.length === 10, `${day.date}: expected 10 companies`);
  assert(day.readings?.length === 3, `${day.date}: expected 3 readings`);
  for (const company of day.companies) {
    assert(/^https:\/\//.test(company.url || ""), `${day.date}: invalid company URL for ${company.name}`);
    const keys = companyDedupeKeys(company);
    assert(keys.length > 0, `${day.date}: missing company dedupe key for ${company.name}`);
    assert(!keys.some((key) => companyKeys.has(key)), `${day.date}: duplicate company ${company.name}`);
    keys.forEach((key) => companyKeys.add(key));
  }
  for (const reading of day.readings) {
    if (day.date === expectedDate) {
      assert(!isBlockedReading(reading), `${day.date}: blocked reading ${reading.title}`);
    }
    assert(/^https:\/\//.test(reading.url || ""), `${day.date}: invalid reading URL for ${reading.title}`);
    const key = readingDedupeKey(reading);
    assert(key && !readingKeys.has(key), `${day.date}: duplicate reading ${reading.title}`);
    readingKeys.add(key);
  }
}

function assertFreshNarration(day) {
  const fallbackPatterns = [
    /如果你是这类业务的一线负责人，最常见的痛苦往往不是一个惊天动地的大问题/,
    /很多关于.+的问题，刚开始看都像常识，真正做起来才会发现细节很难/,
    /而这类文章的价值就是把这些坑讲清楚/
  ];
  const groups = [
    ["company", day.companies || []],
    ["reading", day.readings || []]
  ];

  for (const [type, items] of groups) {
    for (const item of items) {
      const label = item.name || item.title || item.id;
      const story = String(item.story || "").trim();
      assert(story.length >= 100, `${day.date}: ${type} story is too short for ${label}`);
      assert(!fallbackPatterns.some((pattern) => pattern.test(story)), `${day.date}: fallback ${type} story for ${label}`);
    }
    for (let left = 0; left < items.length; left += 1) {
      for (let right = left + 1; right < items.length; right += 1) {
        const similarity = storySimilarity(items[left].story, items[right].story);
        assert(
          similarity < 0.72,
          `${day.date}: overly similar ${type} stories for ${items[left].name || items[left].title} and ${items[right].name || items[right].title}`
        );
      }
    }
  }
}

function storySimilarity(left, right) {
  const leftParts = ngrams(normalizeStory(left), 4);
  const rightParts = ngrams(normalizeStory(right), 4);
  if (!leftParts.size || !rightParts.size) return 0;
  let shared = 0;
  for (const part of leftParts) if (rightParts.has(part)) shared += 1;
  return shared / (leftParts.size + rightParts.size - shared);
}

function normalizeStory(value) {
  return String(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function ngrams(value, size) {
  const result = new Set();
  for (let index = 0; index <= value.length - size; index += 1) result.add(value.slice(index, index + size));
  return result;
}

console.log(JSON.stringify({
  ok: true,
  latestDate: latest.date,
  days: feed.days.length,
  companies: companyKeys.size,
  readings: readingKeys.size
}, null, 2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function currentLosAngelesDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

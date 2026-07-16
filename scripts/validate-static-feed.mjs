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

import { companyDedupeKeys, generateLiveFeed, isBlockedReading, readingDedupeKey, readingSourceKey } from "../../scripts/update-data.mjs";
import { enrichFeedWithDeepSeek, readStoredFeed, writeStoredFeed } from "../feed.js";

export const config = {
  maxDuration: 60
};

export default async function handler(request, response) {
  try {
    if (!isAuthorizedCron(request)) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const daysBack = 14;
    if (isScheduledCron(request) && !isLosAngelesMidnight()) {
      response.status(200).json({
        ok: true,
        skipped: true,
        reason: "Not midnight in America/Los_Angeles",
        losAngelesTime: currentLosAngelesTime()
      });
      return;
    }

    const today = currentLosAngelesDate();
    const storedFeed = await readStoredFeed({ forceRefresh: true });
    if (!isForceRefresh(request) && storedFeed?.days?.[0]?.date === today) {
      response.status(200).json({
        ok: true,
        skipped: true,
        reason: "Feed already exists for today in America/Los_Angeles",
        today
      });
      return;
    }

    const historyFeed = withoutDate(storedFeed, today);
    const todayFeed = await generateLiveFeed({
      daysBack: 1,
      today,
      initialExcludedCompanyIds: collectCompanyKeys(historyFeed),
      initialUsedReadingKeys: collectReadingKeys(historyFeed),
      checkReadingLinks: true
    });

    if (process.env.DEEPSEEK_API_KEY) {
      await enrichFeedWithDeepSeek(todayFeed, { days: 1 });
    }

    const mergedFeed = await mergeWithPreviousDays(todayFeed, storedFeed, daysBack);
    const blob = await writeStoredFeed(mergedFeed);

    response.status(200).json({
      ok: true,
      generatedAt: mergedFeed.generatedAt,
      today: mergedFeed.days[0]?.date || "",
      days: mergedFeed.days.length,
      url: blob.url
    });
  } catch (error) {
    response.status(500).json({
      error: "Failed to refresh feed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function isAuthorizedCron(request) {
  if (!process.env.CRON_SECRET) return true;
  return request.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
}

function isScheduledCron(request) {
  return request.headers["x-vercel-cron"] === "1" || request.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
}

function isForceRefresh(request) {
  try {
    const url = new URL(request.url, "https://startup-radar-site.vercel.app");
    return url.searchParams.get("force") === "1";
  } catch {
    return false;
  }
}

async function mergeWithPreviousDays(todayFeed, storedFeed, daysBack) {
  const today = todayFeed.days[0];
  const days = [today];
  const seenDates = new Set([today.date]);

  for (const day of storedFeed?.days || []) {
    if (!day?.date || seenDates.has(day.date)) continue;
    days.push(day);
    seenDates.add(day.date);
    if (days.length >= daysBack) break;
  }

  if (days.length < daysBack) {
    const fallbackFeed = await generateLiveFeed({ daysBack, checkReadingLinks: true });
    for (const day of fallbackFeed.days || []) {
      if (!day?.date || seenDates.has(day.date)) continue;
      days.push(day);
      seenDates.add(day.date);
      if (days.length >= daysBack) break;
    }
  }

  return dedupeAndBackfillFeed({
    generatedAt: new Date().toISOString(),
    days: days.slice(0, daysBack).sort((a, b) => b.date.localeCompare(a.date))
  }, daysBack, today.date);
}

async function dedupeAndBackfillFeed(feed, daysBack, maxDate = "") {
  const companyKeys = new Set();
  const readingKeys = new Set();
  const cleanedDays = [];

  for (const day of feed.days || []) {
    if (!day?.date || (maxDate && day.date > maxDate)) continue;
    const companies = [];
    for (const company of day.companies || []) {
      const keys = companyDedupeKeys(company);
      if (!keys.length || keys.some((key) => companyKeys.has(key))) continue;
      companies.push(company);
      keys.forEach((key) => companyKeys.add(key));
      if (companies.length >= 10) break;
    }

    const readings = [];
    const dayReadingSources = new Set();
    for (const reading of day.readings || []) {
      if (isBlockedReading(reading)) continue;
      const key = readingDedupeKey(reading);
      if (!key || readingKeys.has(key)) continue;
      const source = readingSourceKey(reading);
      if (source && dayReadingSources.has(source)) continue;
      readings.push(reading);
      readingKeys.add(key);
      if (source) {
        dayReadingSources.add(source);
      }
      if (readings.length >= 3) break;
    }

    if (companies.length < 10 || readings.length < 3) {
      const backfill = await generateLiveFeed({
        daysBack: 1,
        today: day.date,
        initialExcludedCompanyIds: companyKeys,
        initialUsedReadingKeys: readingKeys,
        checkReadingLinks: true
      });
      const backfillDay = backfill.days[0];

      if (companies.length < 10) {
        for (const company of backfillDay.companies || []) {
          const keys = companyDedupeKeys(company);
          if (!keys.length || keys.some((key) => companyKeys.has(key))) continue;
          companies.push(company);
          keys.forEach((key) => companyKeys.add(key));
          if (companies.length >= 10) break;
        }
      }

      if (readings.length < 3) {
        for (const reading of backfillDay.readings || []) {
          if (isBlockedReading(reading)) continue;
          const key = readingDedupeKey(reading);
          if (!key || readingKeys.has(key)) continue;
          const source = readingSourceKey(reading);
          if (source && dayReadingSources.has(source)) continue;
          readings.push(reading);
          readingKeys.add(key);
          if (source) {
            dayReadingSources.add(source);
          }
          if (readings.length >= 3) break;
        }
      }
    }

    cleanedDays.push({
      ...day,
      companies: companies.slice(0, 10),
      readings: readings.slice(0, 3)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    days: cleanedDays.slice(0, daysBack).sort((a, b) => b.date.localeCompare(a.date))
  };
}

function withoutDate(feed, date) {
  return {
    generatedAt: feed?.generatedAt || "",
    days: (feed?.days || []).filter((day) => day.date !== date && day.date <= date)
  };
}

function collectCompanyKeys(feed) {
  return new Set((feed?.days || []).flatMap((day) => day.companies || []).flatMap((company) => companyDedupeKeys(company)));
}

function collectReadingKeys(feed) {
  return new Set(
    (feed?.days || [])
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

function currentLosAngelesTime() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function isLosAngelesMidnight() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value;
  return hour === "00" || hour === "24";
}

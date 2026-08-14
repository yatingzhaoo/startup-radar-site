import { startupEligibilityIssue } from "./update-data.mjs";

const editionDate = "2026-08-14";
const cases = [
  {
    name: "rejects the legacy non-YC watchlist",
    company: { source: ["Non-YC watchlist"] },
    rejected: true
  },
  {
    name: "rejects the legacy hardware watchlist",
    company: { source: ["Smart hardware watchlist"] },
    rejected: true
  },
  {
    name: "rejects old YC batches",
    company: { source: ["Y Combinator"], batch: "Summer 2024" },
    rejected: true
  },
  {
    name: "accepts recent YC batches",
    company: { source: ["Y Combinator"], batch: "Summer 2026" },
    rejected: false
  },
  {
    name: "rejects stale Launch HN entries",
    company: { source: ["Launch HN"], published: "2026-05-01T12:00:00Z" },
    rejected: true
  },
  {
    name: "rejects recently launched companies from old YC batches",
    company: {
      source: ["Launch HN"],
      published: "2026-08-13T12:00:00Z",
      originalOneLiner: "YC S24) - A newly launched product"
    },
    rejected: true
  },
  {
    name: "accepts recent Launch HN companies",
    company: {
      source: ["Launch HN"],
      published: "2026-08-13T12:00:00Z",
      originalOneLiner: "YC S26) - A newly launched product"
    },
    rejected: false
  }
];

for (const testCase of cases) {
  const issue = startupEligibilityIssue(testCase.company, editionDate);
  if (Boolean(issue) !== testCase.rejected) {
    throw new Error(`${testCase.name}: ${issue || "unexpectedly eligible"}`);
  }
}

console.log(`Passed ${cases.length} startup eligibility checks.`);

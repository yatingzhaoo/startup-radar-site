import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage } from "../api/page.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const outputDir = join(root, "dist");
const feed = JSON.parse(readFileSync(join(root, "src/data/feed.json"), "utf8"));

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "index.html"), renderPage(feed));
writeFileSync(join(outputDir, "feed.json"), `${JSON.stringify(feed, null, 2)}\n`);
writeFileSync(
  join(outputDir, "_headers"),
  "/index.html\n  Cache-Control: public, max-age=300, must-revalidate\n/feed.json\n  Cache-Control: public, max-age=300, must-revalidate\n"
);

console.log(JSON.stringify({
  ok: true,
  latestDate: feed.days?.[0]?.date || null,
  days: feed.days?.length || 0,
  outputDir
}, null, 2));

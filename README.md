# Startup Radar

A static daily feed of ten startups and three long-form readings.

## Publishing

- `npm run generate:today` creates the newest Los Angeles calendar day.
- `npm run validate:feed` rejects incomplete or duplicate daily content.
- `npm run build` writes a pre-rendered site to `dist/`.
- GitHub Actions generates a new edition shortly after midnight in Los Angeles.
- Cloudflare Pages publishes each successful commit automatically.
- Daily readings are selected from current official feeds and Hacker News first. Sources span startup media, product and engineering publications, AI research labs, and venture firms; the curated evergreen list is only a fallback.
- A reading is excluded for 30 days after use, then becomes eligible again. Override this with `READING_COOLDOWN_DAYS`.

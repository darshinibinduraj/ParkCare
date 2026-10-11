# ParkCare

ParkCare helps a person with Parkinson's, or someone who cares for them, describe what is going on in their own words. Three helpers (medical, equipment, and caregiver) read the same story, exchange notes, and return **one informational care plan**.

ParkCare provides general information, not medical advice. Talk with your care team before making medical or equipment decisions.

## Stack

- Next.js 15 (App Router), React, TypeScript
- Tailwind CSS and accessible components built on Radix (shadcn-style)
- React Hook Form and Zod
- PostgreSQL with Drizzle ORM
- Embedded Postgres (PGlite) when `DATABASE_URL` is unset, so the demo runs locally
- Optional Anthropic API for extraction and explanation wording

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

No database server is required. The first request creates `.data/pglite` and loads the seed data. To use hosted Postgres instead, copy `.env.example` to `.env.local` and set `DATABASE_URL`, then run `pnpm db:seed`.

```bash
pnpm test
pnpm lint
pnpm typecheck
```

## Optional AI key

Set `LLM_API_KEY` or `ANTHROPIC_API_KEY` to send answer text to Anthropic for the summary and for explanation wording. Resource choices still come only from the dataset. With no key, a built-in planner runs on the server and no outside AI service sees the answers.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | What ParkCare is, start, disclaimer, privacy summary |
| `/intake` | One question per screen, with voice, chips, back, skip, and autosave |
| `/intake/review` | "Here is what we understood", then edit and confirm |
| `/results/[sessionId]` | Care plan, trust badges, helper notes, print, rerun |
| `/about` | How it works, sources, and limits |
| `/privacy` | Plain-language notice and delete my data |
| `/demo` | Three fictional stories |

## Data

Seed files live in `src/data/seed/`. `pnpm db:seed` loads `medical.json`, `equipment.json`, and `caregivers.json` when those files exist, and otherwise uses `catalog.ts`. Regenerate the JSON with `pnpm db:export-seed`.

Verified rows are public directories and paraphrased Parkinson's Foundation guidance, with links back to the source. Local clinics, products, and agencies are simulated and labeled in the UI. Prices on simulated products are fake estimates. Verified guidance has no invented price.

Source notes for the medical and equipment datasets are also in `parkinsons-care-ai.md`.

## Not in this version

- Accounts, real patient histories, and custom model training
- A live import of the full CMS or NPI datasets
- A side-by-side write-up of multi-agent versus three fully independent agents (stretch)
- A usability session with a person with Parkinson's

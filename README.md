# 🍌 Nano Banana

AI social media content & calendar generator. Upload a logo, let GPT-4o extract your brand identity, refine it by hand or by chatting with the AI, then generate, edit and export a month of on-brand posts for TikTok, Instagram, Facebook and LinkedIn.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 + shadcn/ui · PostgreSQL + Prisma · OpenAI (`gpt-4o`)

## Quick start

```bash
cp .env.example .env          # set DATABASE_URL (+ OPENAI_API_KEY for real AI)
npm install                   # also runs `prisma generate`
npx prisma migrate deploy     # or `npm run db:migrate` during development
npm run dev                   # http://localhost:3000
```

With no `OPENAI_API_KEY` (or `AI_MOCK=1`) the app runs in **mock AI mode**. Logo colours still come from real pixel analysis, but the text is deterministic sample content. You can develop, demo and test the whole app offline at no cost.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | empty → mock mode | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | Multimodal model for extraction, chat and generation |
| `AI_MOCK` | empty | `1` forces mock mode |
| `UPLOAD_DIR` | `./uploads` | Where uploaded logos are stored |
| `MAX_UPLOAD_MB` | `5` | Upload size limit |

## Scripts

`npm run dev` · `build` · `start` · `lint` · `typecheck` · `test` (Vitest) · `db:migrate` · `db:deploy` · `db:studio`

## How it works

### 1. Brand onboarding & AI extraction
`/brands/new`: upload a logo (PNG/JPG/WEBP/GIF). `POST /api/brands/analyze` checks the file's magic bytes (not the client-sent MIME type), stores it under a random UUID name, samples the dominant colours with `sharp`, and sends the image plus those colours to `gpt-4o` with a strict JSON schema. The result is the primary and secondary colours, tone of voice, style keywords, audience and description. The user reviews and edits everything before saving.

### 2. Brand settings & AI chat
`/brands/:id/settings` has a form (colour pickers, keyword chips, text fields) next to a chat assistant (`POST /api/brands/:id/chat`). The assistant returns a reply plus a structured patch. The patch is applied to the unsaved draft and the changed fields are highlighted, so nothing is persisted until you click **Save**. You can also re-upload the logo to re-run the analysis.

### 3. Bulk generation engine
`/brands/:id/generate`: pick a month, platforms, posts per week and optional campaign notes. `POST /api/brands/:id/generate` streams NDJSON progress events:

1. **Deterministic scheduling.** Posting slots come from each platform's preferred weekdays and hour, so the calendar is balanced and the AI never invents dates. Slots that already have a post are skipped. "Replace existing drafts" clears drafts first and always keeps approved posts.
2. **Monthly strategy.** One call produces the content pillars and a theme for each week.
3. **Platform × week batches.** Small, independent AI calls run with a concurrency of 3. Each batch is retried once and saved as soon as it returns. One failed batch never loses the others; run generation again to fill any gaps.

### 4. Calendar & editing
`/brands/:id/calendar?month=YYYY-MM` shows a month grid (or a list view on mobile) with platform and status filters. Clicking a post opens a side panel where you can edit the platform, date/time, caption (with a character count against the platform limit), hashtags, visual concept, pillar and approval. **Regenerate with AI** takes an optional instruction (e.g. "shorter") and is told the post's neighbours so it doesn't repeat them. You can also add posts manually.

### 5. Export
`GET /api/brands/:id/export?month=YYYY-MM&format=csv|json|txt[&platforms=…][&status=APPROVED]`
- **CSV:** RFC 4180 escaping, a UTF-8 BOM so Excel shows emoji correctly, and protection against formula injection.
- **JSON:** structured data.
- **Text:** a readable day-by-day brief.

## Notes & MVP trade-offs
- **Auth** is passwordless and email-only (an httpOnly cookie holds the user id). Every API route and page checks that the brand or post belongs to the current user. Replace `src/lib/session.ts` with a real provider (Auth.js, Clerk…) before production use.
- **Uploads** go to local disk and are served by `/api/uploads/:file`. On serverless hosts, swap `src/lib/uploads.ts` for object storage (S3, R2, Vercel Blob).
- **Times** are stored as wall-clock times in UTC and always displayed in UTC, so a post planned for 19:00 shows as 19:00 in every time zone.
- Generation sets `maxDuration = 300` for serverless platforms. Batching keeps each AI call small.

## Project layout
```
prisma/schema.prisma        User, Brand, ContentPost (+ Platform, PostStatus enums)
src/lib/ai/                 OpenAI client (strict JSON schema + zod), prompts, generators, mock
src/lib/generation.ts       Batched month generation engine
src/lib/schedule.ts         Month/week/slot maths
src/lib/export.ts           CSV / JSON / text builders
src/app/api/…               Route handlers
src/components/brand|content|ui
```

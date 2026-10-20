import "server-only";
import type { Brand, Platform } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { toBrandProfile } from "./brand";
import { generatePostsBatch, generateStrategy, type Slot, type Strategy } from "./ai/content";
import { PLATFORMS } from "./platforms";
import { toPostDTO, type PostDTO } from "./posts";
import { isoDay, parseMonth, platformSlots, weekChunks } from "./schedule";

export const generateRequestSchema = z.object({
  month: z.string().refine((v) => parseMonth(v) !== null, "Month must look like 2026-11"),
  platforms: z.array(z.enum(PLATFORMS)).min(1, "Pick at least one platform").transform((p) => Array.from(new Set(p))),
  /** Optional posts-per-week override per platform (1–7) */
  postsPerWeek: z.partialRecord(z.enum(PLATFORMS), z.number().int().min(1).max(7)).optional(),
  /** Delete existing DRAFT posts for the selected platforms/month first (approved posts are kept) */
  replaceDrafts: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export type GenerationEvent =
  | { type: "start"; totalBatches: number; totalSlots: number; skippedSlots: number; deleted: number }
  | { type: "strategy"; strategy: Strategy }
  | { type: "batch"; platform: Platform; week: number; posts: PostDTO[]; completed: number; totalBatches: number }
  | { type: "batch_error"; platform: Platform; week: number; message: string; completed: number; totalBatches: number }
  | { type: "done"; created: number; failedBatches: number }
  | { type: "error"; message: string };

interface Batch {
  platform: Platform;
  week: number; // 1-based
  slots: Slot[];
}

const CONCURRENCY = 3;

/**
 * Generate a month of content in platform × week batches. Each batch is a
 * small, independent AI call persisted as soon as it returns, so progress
 * streams to the client and a slow/failed batch never loses the others.
 */
export async function runGeneration(
  brand: Brand,
  req: GenerateRequest,
  emit: (event: GenerationEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const range = parseMonth(req.month)!;
  const profile = toBrandProfile(brand);
  const weeks = weekChunks(range);

  let deleted = 0;
  if (req.replaceDrafts) {
    const res = await prisma.contentPost.deleteMany({
      where: {
        brandId: brand.id,
        platform: { in: req.platforms },
        status: "DRAFT",
        scheduledDate: { gte: range.start, lt: range.end },
      },
    });
    deleted = res.count;
  }

  // Never double-book: skip platform/day slots that already have a post.
  const existing = await prisma.contentPost.findMany({
    where: { brandId: brand.id, platform: { in: req.platforms }, scheduledDate: { gte: range.start, lt: range.end } },
    select: { platform: true, scheduledDate: true },
  });
  const occupied = new Set(existing.map((p) => `${p.platform}|${isoDay(p.scheduledDate)}`));

  const batches: Batch[] = [];
  let skippedSlots = 0;
  for (const platform of req.platforms) {
    for (const week of weeks) {
      const dates = platformSlots(platform, week.start, week.end, req.postsPerWeek?.[platform]);
      const free = dates.filter((d) => !occupied.has(`${platform}|${isoDay(d)}`));
      skippedSlots += dates.length - free.length;
      if (free.length) {
        batches.push({
          platform,
          week: week.index + 1,
          slots: free.map((date) => ({ id: `${platform[0]}${isoDay(date)}`, date })),
        });
      }
    }
  }

  const totalSlots = batches.reduce((n, b) => n + b.slots.length, 0);
  emit({ type: "start", totalBatches: batches.length, totalSlots, skippedSlots, deleted });
  if (batches.length === 0) {
    emit({ type: "done", created: 0, failedBatches: 0 });
    return;
  }

  const strategy = await generateStrategy({
    brand: profile,
    monthKey: req.month,
    weeks,
    platforms: req.platforms,
    notes: req.notes,
    signal,
  });
  emit({ type: "strategy", strategy });

  let completed = 0;
  let created = 0;
  let failedBatches = 0;
  const queue = [...batches];

  async function worker() {
    for (let batch = queue.shift(); batch; batch = queue.shift()) {
      if (signal?.aborted) return;
      try {
        const posts = await withRetry(() =>
          generatePostsBatch({
            brand: profile,
            platform: batch.platform,
            strategy,
            weekNumber: batch.week,
            slots: batch.slots,
            notes: req.notes,
            signal,
          }),
        );
        const rows = batch.slots.flatMap((slot) => {
          const post = posts.get(slot.id);
          return post
            ? [{
                brandId: brand.id,
                platform: batch.platform,
                scheduledDate: slot.date,
                caption: post.caption,
                hashtags: post.hashtags,
                visualConcept: post.visualConcept,
                pillar: post.pillar,
              }]
            : [];
        });
        const saved = rows.length ? await prisma.contentPost.createManyAndReturn({ data: rows }) : [];
        created += saved.length;
        completed++;
        emit({ type: "batch", platform: batch.platform, week: batch.week, posts: saved.map(toPostDTO), completed, totalBatches: batches.length });
      } catch (err) {
        if (signal?.aborted) return;
        completed++;
        failedBatches++;
        emit({
          type: "batch_error",
          platform: batch.platform,
          week: batch.week,
          message: err instanceof Error ? err.message : "Generation failed",
          completed,
          totalBatches: batches.length,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
  emit({ type: "done", created, failedBatches });
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

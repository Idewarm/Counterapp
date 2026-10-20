import "server-only";
import type { Platform } from "@prisma/client";
import { z } from "zod";
import type { BrandProfile } from "../brand";
import { PLATFORM_META } from "../platforms";
import { normalizeHashtags } from "../posts";
import { formatMonthLabel, isoDay } from "../schedule";
import { aiMode, js, structured } from "./client";
import { mockPost, mockPostsBatch, mockStrategy } from "./mock";
import { POSTS_SYSTEM, STRATEGY_SYSTEM, describeBrand, describePlatform } from "./prompts";

// ---------- Monthly strategy ----------

export const strategySchema = z.object({
  pillars: z.array(z.object({ name: z.string().min(1), description: z.string() })).min(1).max(6),
  weeklyThemes: z.array(z.object({ week: z.number().int(), theme: z.string(), focus: z.string() })),
});
export type Strategy = z.infer<typeof strategySchema>;

const strategyJsonSchema = js.obj({
  pillars: js.arr(js.obj({ name: js.str(), description: js.str() })),
  weeklyThemes: js.arr(js.obj({ week: js.int("1-based week number"), theme: js.str(), focus: js.str() })),
});

export async function generateStrategy(input: {
  brand: BrandProfile;
  monthKey: string;
  weeks: { index: number; start: Date; end: Date }[];
  platforms: Platform[];
  notes?: string;
  signal?: AbortSignal;
}): Promise<Strategy> {
  if (aiMode() === "mock") return mockStrategy(input.brand, input.weeks.length);
  const weekLines = input.weeks
    .map((w) => `Week ${w.index + 1}: ${isoDay(w.start)} to ${isoDay(new Date(w.end.getTime() - 86_400_000))}`)
    .join("\n");
  return structured({
    system: STRATEGY_SYSTEM,
    user: [
      describeBrand(input.brand),
      "",
      `Month: ${formatMonthLabel(input.monthKey)}`,
      `Platforms: ${input.platforms.map((p) => PLATFORM_META[p].label).join(", ")}`,
      `Weeks:\n${weekLines}`,
      input.notes ? `\nCampaign notes from the user (prioritise these): ${input.notes}` : "",
      `\nReturn exactly ${input.weeks.length} weekly themes.`,
    ].join("\n"),
    schemaName: "content_strategy",
    jsonSchema: strategyJsonSchema,
    validator: strategySchema,
    temperature: 0.8,
    signal: input.signal,
  });
}

// ---------- Post batches ----------

export const generatedPostSchema = z.object({
  pillar: z.string(),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).transform(normalizeHashtags),
  visualConcept: z.string().min(1),
});
export type GeneratedPost = z.infer<typeof generatedPostSchema>;

const batchSchema = z.object({ posts: z.array(generatedPostSchema.extend({ slotId: z.string() })) });

const postJsonProps = {
  pillar: js.str("One of the content pillars"),
  caption: js.str(),
  hashtags: js.arr(js.str()),
  visualConcept: js.str(),
};
const batchJsonSchema = js.obj({ posts: js.arr(js.obj({ slotId: js.str(), ...postJsonProps })) });
const singleJsonSchema = js.obj(postJsonProps);

export interface Slot {
  id: string;
  date: Date;
}

function slotLine(s: Slot) {
  const weekday = s.date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return `- slotId "${s.id}": ${weekday} ${isoDay(s.date)}`;
}

/** Generate one platform's posts for one week. Returns posts keyed by slot id. */
export async function generatePostsBatch(input: {
  brand: BrandProfile;
  platform: Platform;
  strategy: Strategy;
  weekNumber: number;
  slots: Slot[];
  notes?: string;
  signal?: AbortSignal;
}): Promise<Map<string, GeneratedPost>> {
  if (input.slots.length === 0) return new Map();
  if (aiMode() === "mock") return mockPostsBatch(input);

  const theme = input.strategy.weeklyThemes.find((t) => t.week === input.weekNumber) ?? input.strategy.weeklyThemes[0];
  const result = await structured({
    system: POSTS_SYSTEM,
    user: [
      describeBrand(input.brand),
      "",
      describePlatform(input.platform),
      "",
      `Content pillars:\n${input.strategy.pillars.map((p) => `- ${p.name}: ${p.description}`).join("\n")}`,
      theme ? `\nThis week's theme: ${theme.theme} — ${theme.focus}` : "",
      input.notes ? `\nCampaign notes from the user: ${input.notes}` : "",
      `\nWrite one post for each slot:\n${input.slots.map(slotLine).join("\n")}`,
    ].join("\n"),
    schemaName: "post_batch",
    jsonSchema: batchJsonSchema,
    validator: batchSchema,
    temperature: 0.9,
    signal: input.signal,
  });

  const valid = new Set(input.slots.map((s) => s.id));
  const out = new Map<string, GeneratedPost>();
  for (const { slotId, ...post } of result.posts) {
    if (valid.has(slotId) && !out.has(slotId)) out.set(slotId, post);
  }
  return out;
}

/** Regenerate a single post, avoiding repetition with its neighbours. */
export async function regeneratePost(input: {
  brand: BrandProfile;
  platform: Platform;
  date: Date;
  current: { caption: string; pillar: string };
  otherCaptions: string[];
  instruction?: string;
}): Promise<GeneratedPost> {
  if (aiMode() === "mock") return mockPost(input.brand, input.platform, input.date, Date.now(), input.current.pillar);
  return structured({
    system: POSTS_SYSTEM.replace("Write exactly one post per provided slot, using the slot's id.", "Write exactly one post."),
    user: [
      describeBrand(input.brand),
      "",
      describePlatform(input.platform),
      "",
      `Scheduled for: ${slotLine({ id: "post", date: input.date }).replace('- slotId "post": ', "")}`,
      input.current.pillar ? `Content pillar: ${input.current.pillar}` : "",
      `\nThe current version (write a clearly different, better alternative):\n"""${input.current.caption}"""`,
      input.otherCaptions.length
        ? `\nOther posts this month on this platform — do not repeat their hooks or angles:\n${input.otherCaptions
            .slice(0, 20)
            .map((c) => `- ${c.slice(0, 120).replace(/\s+/g, " ")}`)
            .join("\n")}`
        : "",
      input.instruction ? `\nUser instruction for this rewrite (follow it): ${input.instruction}` : "",
    ].join("\n"),
    schemaName: "single_post",
    jsonSchema: singleJsonSchema,
    validator: generatedPostSchema,
    temperature: 1,
  });
}

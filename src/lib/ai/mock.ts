/**
 * Offline "mock AI" used when OPENAI_API_KEY is not set (or AI_MOCK=1).
 * Produces deterministic, plausible output so the whole app can be developed,
 * demoed and tested without network access or API costs.
 */
import type { Platform } from "@prisma/client";
import type { BrandProfile } from "../brand";
import { PLATFORM_META } from "../platforms";
import { isoDay } from "../schedule";
import type { BrandChatResult, BrandExtraction } from "./brand";
import type { GeneratedPost, Slot, Strategy } from "./content";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(list: T[], seed: number, offset = 0): T {
  return list[(seed + offset) % list.length];
}

export function mockBrandExtraction(sampled: string[], brandName?: string): BrandExtraction {
  const [primary = "#FFD60A", ...rest] = sampled;
  return {
    primaryColor: primary,
    secondaryColors: rest.slice(0, 3).length ? rest.slice(0, 3) : ["#1C1917"],
    toneOfVoice: `${brandName ?? "The brand"} speaks in a warm, confident and approachable voice. Clear and upbeat, with a touch of playful wit — never stuffy.`,
    styleKeywords: ["bold", "friendly", "modern", "clean", "optimistic"],
    targetAudience: "Digitally-savvy adults aged 22–40 who value quality and personality in the brands they follow.",
    description: "Mock analysis (no OpenAI key configured) — colours were sampled from the uploaded image.",
  };
}

const NO_UPDATES: BrandChatResult["updates"] = {
  name: null,
  primaryColor: null,
  secondaryColors: null,
  toneOfVoice: null,
  targetAudience: null,
  styleKeywords: null,
  description: null,
};

export function mockBrandChat(brand: BrandProfile, message: string): BrandChatResult {
  const m = message.toLowerCase();
  const hex = message.match(/#[0-9a-f]{6}\b/i)?.[0];
  if (hex && /primary|main/.test(m)) {
    return { reply: `Done — I set the primary colour to ${hex.toUpperCase()}.`, updates: { ...NO_UPDATES, primaryColor: hex } };
  }
  if (/playful|fun|casual/.test(m)) {
    return {
      reply: "I've made the tone more playful and added a couple of matching style keywords.",
      updates: {
        ...NO_UPDATES,
        toneOfVoice: "Playful, witty and energetic. We talk like a fun friend — emojis welcome, jargon banned.",
        styleKeywords: Array.from(new Set([...brand.styleKeywords, "playful", "witty"])).slice(0, 12),
      },
    };
  }
  if (/professional|formal|corporate/.test(m)) {
    return {
      reply: "Switched the tone to something more professional and authoritative.",
      updates: {
        ...NO_UPDATES,
        toneOfVoice: "Professional, clear and authoritative, while staying human and approachable. Insight first, hype never.",
      },
    };
  }
  if (/audience|customer|target/.test(m)) {
    return {
      reply: "Here's a sharper audience definition — tweak it if it doesn't fit.",
      updates: { ...NO_UPDATES, targetAudience: message.replace(/^.*?(audience|customers?|target)\s*(is|are|:)?\s*/i, "") || brand.targetAudience },
    };
  }
  return {
    reply:
      "(Mock AI) I can adjust your tone, audience, colours or keywords. Try: “make the tone more playful”, “set primary colour to #FF5A5F”, or “our audience is busy parents”.",
    updates: NO_UPDATES,
  };
}

const PILLARS = [
  { name: "Education", description: "Tips, how-tos and myth-busting that make the audience smarter." },
  { name: "Behind the scenes", description: "People, process and the story behind the brand." },
  { name: "Product spotlight", description: "Showcase products/services and their benefits in context." },
  { name: "Community", description: "User stories, questions, polls and conversations." },
  { name: "Inspiration", description: "Motivating, aspirational or entertaining moments." },
];

const THEMES = [
  ["Meet the brand", "Introduce who we are and what we stand for."],
  ["Problem → solution", "Highlight a common pain point and how we help."],
  ["Community week", "Spotlight customers, answer questions, invite participation."],
  ["Deep dive", "Go deeper on expertise and craft."],
  ["Month wrap-up", "Recap highlights and tease what's next."],
];

export function mockStrategy(_brand: BrandProfile, weekCount: number): Strategy {
  return {
    pillars: PILLARS.slice(0, 4),
    weeklyThemes: Array.from({ length: weekCount }, (_, i) => ({
      week: i + 1,
      theme: THEMES[i % THEMES.length][0],
      focus: THEMES[i % THEMES.length][1],
    })),
  };
}

const HOOKS = [
  "Nobody talks about this, but",
  "3 things we wish everyone knew:",
  "POV: you just discovered",
  "Quick question for you 👇",
  "Here's how we actually do it.",
  "The secret ingredient?",
  "Save this for later:",
  "We asked our community, and",
];

const CTAS = [
  "Tell us in the comments!",
  "Save this post for later.",
  "Share it with someone who needs it.",
  "Link in bio to learn more.",
  "What would you add?",
  "Follow for more.",
];

export function mockPost(brand: BrandProfile, platform: Platform, date: Date, salt: number | string, pillarName?: string): GeneratedPost {
  const seed = hash(`${brand.name}|${platform}|${isoDay(date)}|${salt}`);
  const pillar = pillarName || pick(PILLARS, seed).name;
  const meta = PLATFORM_META[platform];
  const hook = pick(HOOKS, seed);
  const cta = pick(CTAS, seed, 3);
  const name = brand.name;
  const body =
    platform === "LINKEDIN"
      ? `${hook} building ${name} taught us that consistency beats intensity.\n\nEvery week we focus on one ${pillar.toLowerCase()} lesson and share it openly.\n\n${cta}`
      : platform === "TIKTOK"
        ? `${hook} ${name} edition ✨ ${cta}`
        : platform === "FACEBOOK"
          ? `${hook} we're sharing a little ${pillar.toLowerCase()} from the ${name} team today. ${cta}`
          : `${hook} a ${pillar.toLowerCase()} moment from ${name} 💛\n\n${cta}`;
  const base = name.replace(/[^\p{L}\p{N}]/gu, "");
  const tags = [base, pillar.replace(/\s+/g, ""), ...brand.styleKeywords.map((k) => k.replace(/\s+/g, "")), "smallbusiness", "brandstory", meta.label]
    .slice(0, meta.hashtagRange[1]);
  return {
    pillar,
    caption: body,
    hashtags: tags,
    visualConcept: `${meta.visualFormat.split(".")[0]}. Theme: ${pillar.toLowerCase()} for ${name}. Use ${brand.colors.primary} as the dominant accent with ${brand.colors.secondary[0] ?? "a neutral"} for text; on-screen text: “${hook.replace(/[:👇]/g, "").trim()}”. Mood: ${brand.styleKeywords.slice(0, 3).join(", ") || "bright and friendly"}.`,
  };
}

export function mockPostsBatch(input: {
  brand: BrandProfile;
  platform: Platform;
  strategy: Strategy;
  slots: Slot[];
}): Map<string, GeneratedPost> {
  const out = new Map<string, GeneratedPost>();
  input.slots.forEach((slot, i) => {
    const pillar = input.strategy.pillars[(slot.date.getUTCDate() + i) % input.strategy.pillars.length]?.name;
    out.set(slot.id, mockPost(input.brand, input.platform, slot.date, slot.id, pillar));
  });
  return out;
}

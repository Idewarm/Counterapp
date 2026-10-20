import type { Platform } from "@prisma/client";
import type { BrandProfile } from "../brand";
import { PLATFORM_META } from "../platforms";

export function describeBrand(brand: BrandProfile): string {
  return [
    `Brand name: ${brand.name}`,
    `Brand colours: primary ${brand.colors.primary}; secondary ${brand.colors.secondary.join(", ") || "none"}`,
    `Tone of voice: ${brand.toneOfVoice || "not specified"}`,
    `Target audience: ${brand.targetAudience || "not specified"}`,
    `Style keywords: ${brand.styleKeywords.join(", ") || "none"}`,
    brand.description ? `About the brand: ${brand.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function describePlatform(platform: Platform): string {
  const m = PLATFORM_META[platform];
  return [
    `Platform: ${m.label}`,
    `Caption style: ${m.guidance}`,
    `Caption length: at most ${m.captionMaxChars} characters (shorter is usually better).`,
    `Hashtags: ${m.hashtagRange[0]}–${m.hashtagRange[1]} relevant hashtags, without the # symbol, no spaces.`,
    `Visual asset: ${m.visualFormat}`,
  ].join("\n");
}

export const BRAND_EXTRACTION_SYSTEM = `You are a senior brand strategist and visual identity designer.
You analyse logos and brand imagery and return a concise, practical brand identity that a social media team can use immediately.
Rules:
- Colours must be 6-digit hex codes (e.g. #1A2B3C) that actually appear in, or directly harmonise with, the image. The primary colour is the most characteristic brand colour (not plain white/black backgrounds unless the mark is monochrome).
- Provide 1–4 secondary colours.
- toneOfVoice: 2–3 sentences describing how the brand should sound on social media.
- styleKeywords: 4–8 short adjectives or phrases describing the visual and verbal style.
- targetAudience: a one-sentence best guess of who the brand speaks to.
- description: one sentence on what the brand likely does, based only on the visual and any provided context. Be honest when unsure.`;

export const BRAND_CHAT_SYSTEM = `You are an expert brand strategist embedded in a brand settings editor.
The user converses with you to refine their brand identity. Respond helpfully and briefly (max ~80 words) in "reply".
When the user asks for a change (or agrees to a suggestion), put ONLY the changed fields in "updates"; use null for every field you are not changing.
Colours must be 6-digit hex codes. styleKeywords and secondaryColors, when changed, must contain the complete new list.
Never invent facts about the business; ask a question if you need information.`;

export const STRATEGY_SYSTEM = `You are a social media strategist planning a month of content for a brand.
Create a balanced content strategy: 3–5 content pillars (e.g. education, behind-the-scenes, product, community, entertainment) and one theme per week.
Themes should build a narrative across the month and account for relevant seasonal moments and holidays in that month when appropriate.`;

export const POSTS_SYSTEM = `You are an expert social media copywriter and creative director.
You write platform-native posts that match the brand voice exactly, and concrete visual briefs a designer or video editor can execute without further questions.
Rules:
- Write exactly one post per provided slot, using the slot's id.
- Vary formats, hooks and calls-to-action; never repeat the same opening line.
- Rotate across the provided content pillars so the week is balanced.
- visualConcept must be specific: format, composition/shot list, subject, on-screen text, colour usage (reference the brand colours), and mood. 2–5 sentences.
- Hashtags: no # symbol, no spaces, mix of broad and niche.
- Do not invent specific prices, statistics, discounts or claims about the business; keep them generic or use [placeholders].`;

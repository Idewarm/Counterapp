import { z } from "zod";

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export const hexColor = z
  .string()
  .trim()
  .transform((v) => (v.startsWith("#") ? v : `#${v}`))
  .transform((v) => (/^#[0-9A-Fa-f]{3}$/.test(v) ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v))
  .pipe(z.string().regex(HEX_RE, "Must be a hex colour like #FFD60A"))
  .transform((v) => v.toUpperCase());

export const brandColorsSchema = z.object({
  primary: hexColor,
  secondary: z.array(hexColor).max(6),
});

export type BrandColors = z.infer<typeof brandColorsSchema>;

export const DEFAULT_COLORS: BrandColors = { primary: "#FFD60A", secondary: ["#1C1917"] };

/** Safely read the JSON `colors` column. */
export function parseColors(value: unknown): BrandColors {
  const parsed = brandColorsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_COLORS;
}

const keywordList = z
  .array(z.string().trim().min(1).max(40))
  .max(12)
  .transform((list) => Array.from(new Set(list)));

export const brandInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  colors: brandColorsSchema,
  toneOfVoice: z.string().trim().max(1000).default(""),
  targetAudience: z.string().trim().max(1000).default(""),
  styleKeywords: keywordList.default([]),
  description: z.string().trim().max(2000).default(""),
});

export type BrandInput = z.infer<typeof brandInputSchema>;

export const brandPatchSchema = brandInputSchema.partial();

/** Shape the AI layer receives — independent of the DB row. */
export interface BrandProfile {
  name: string;
  colors: BrandColors;
  toneOfVoice: string;
  targetAudience: string;
  styleKeywords: string[];
  description: string;
}

export function toBrandProfile(brand: {
  name: string;
  colors: unknown;
  toneOfVoice: string;
  targetAudience: string;
  styleKeywords: string[];
  description: string;
}): BrandProfile {
  return {
    name: brand.name,
    colors: parseColors(brand.colors),
    toneOfVoice: brand.toneOfVoice,
    targetAudience: brand.targetAudience,
    styleKeywords: brand.styleKeywords,
    description: brand.description,
  };
}

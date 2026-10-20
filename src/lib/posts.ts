import { z } from "zod";
import { PLATFORMS } from "./platforms";

/** Hashtags are stored without "#", deduplicated, alphanumeric/underscore only. */
export function normalizeHashtags(input: string[] | string): string[] {
  const parts = Array.isArray(input) ? input : input.split(/[\s,]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const tag = raw.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!tag || tag.length > 60) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.slice(0, 30);
}

export const postPatchSchema = z
  .object({
    caption: z.string().max(5000),
    hashtags: z.union([z.array(z.string()), z.string()]).transform(normalizeHashtags),
    visualConcept: z.string().max(5000),
    pillar: z.string().max(100),
    scheduledDate: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
    platform: z.enum(PLATFORMS),
    status: z.enum(["DRAFT", "APPROVED"]),
  })
  .partial();

export type PostPatch = z.infer<typeof postPatchSchema>;

/** JSON-safe post shape sent to the client. */
export interface PostDTO {
  id: string;
  brandId: string;
  platform: (typeof PLATFORMS)[number];
  scheduledDate: string;
  caption: string;
  hashtags: string[];
  visualConcept: string;
  pillar: string;
  status: "DRAFT" | "APPROVED";
}

export function toPostDTO(p: {
  id: string;
  brandId: string;
  platform: PostDTO["platform"];
  scheduledDate: Date;
  caption: string;
  hashtags: string[];
  visualConcept: string;
  pillar: string;
  status: PostDTO["status"];
}): PostDTO {
  return {
    id: p.id,
    brandId: p.brandId,
    platform: p.platform,
    scheduledDate: p.scheduledDate.toISOString(),
    caption: p.caption,
    hashtags: p.hashtags,
    visualConcept: p.visualConcept,
    pillar: p.pillar,
    status: p.status,
  };
}

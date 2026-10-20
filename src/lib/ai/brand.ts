import "server-only";
import { z } from "zod";
import { brandColorsSchema, hexColor, type BrandProfile } from "../brand";
import { dominantColors } from "../colors";
import { aiMode, js, structured } from "./client";
import { mockBrandChat, mockBrandExtraction } from "./mock";
import { BRAND_CHAT_SYSTEM, BRAND_EXTRACTION_SYSTEM, describeBrand } from "./prompts";

export const brandExtractionSchema = z.object({
  primaryColor: hexColor,
  secondaryColors: z.array(hexColor).max(6),
  toneOfVoice: z.string(),
  styleKeywords: z.array(z.string()).max(12),
  targetAudience: z.string(),
  description: z.string(),
});

export type BrandExtraction = z.infer<typeof brandExtractionSchema>;

const extractionJsonSchema = js.obj({
  primaryColor: js.str("Primary brand colour as #RRGGBB"),
  secondaryColors: js.arr(js.str("#RRGGBB"), "1–4 secondary colours"),
  toneOfVoice: js.str(),
  styleKeywords: js.arr(js.str()),
  targetAudience: js.str(),
  description: js.str(),
});

export async function extractBrandFromImage(input: {
  image: Buffer;
  mimeType: string;
  brandName?: string;
  context?: string;
}): Promise<BrandExtraction> {
  // Pixel analysis is cheap and grounds the model's colour picks.
  const sampled = await dominantColors(input.image, 5).catch(() => [] as string[]);
  if (aiMode() === "mock") return mockBrandExtraction(sampled, input.brandName);

  const dataUrl = `data:${input.mimeType};base64,${input.image.toString("base64")}`;
  const text = [
    input.brandName ? `Brand name: ${input.brandName}` : "Brand name: unknown",
    input.context ? `Context from the user: ${input.context}` : null,
    sampled.length ? `Pixel analysis found these dominant colours (most frequent first): ${sampled.join(", ")}` : null,
    "Analyse this logo/brand image and return the brand identity.",
  ]
    .filter(Boolean)
    .join("\n");

  return structured({
    system: BRAND_EXTRACTION_SYSTEM,
    user: [
      { type: "text", text },
      { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
    ],
    schemaName: "brand_identity",
    jsonSchema: extractionJsonSchema,
    validator: brandExtractionSchema,
    temperature: 0.4,
  });
}

export const brandUpdatesSchema = z.object({
  name: z.string().trim().min(1).max(100).nullable(),
  primaryColor: hexColor.nullable(),
  secondaryColors: z.array(hexColor).max(6).nullable(),
  toneOfVoice: z.string().nullable(),
  targetAudience: z.string().nullable(),
  styleKeywords: z.array(z.string()).max(12).nullable(),
  description: z.string().nullable(),
});

export const brandChatResultSchema = z.object({ reply: z.string(), updates: brandUpdatesSchema });
export type BrandChatResult = z.infer<typeof brandChatResultSchema>;

const chatJsonSchema = js.obj({
  reply: js.str("Short conversational answer to the user"),
  updates: js.obj({
    name: js.nullable(js.str()),
    primaryColor: js.nullable(js.str("#RRGGBB")),
    secondaryColors: js.nullable(js.arr(js.str("#RRGGBB"))),
    toneOfVoice: js.nullable(js.str()),
    targetAudience: js.nullable(js.str()),
    styleKeywords: js.nullable(js.arr(js.str())),
    description: js.nullable(js.str()),
  }),
});

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function brandChat(brand: BrandProfile, history: ChatTurn[], message: string): Promise<BrandChatResult> {
  if (aiMode() === "mock") return mockBrandChat(brand, message);
  return structured({
    system: `${BRAND_CHAT_SYSTEM}\n\nCurrent brand identity (may include unsaved edits):\n${describeBrand(brand)}`,
    history: history.slice(-12).map((t) => ({ role: t.role, content: t.content })),
    user: message,
    schemaName: "brand_chat",
    jsonSchema: chatJsonSchema,
    validator: brandChatResultSchema,
    temperature: 0.6,
  });
}

/** Apply non-null chat updates to a brand profile. */
export function applyBrandUpdates(brand: BrandProfile, u: BrandChatResult["updates"]): BrandProfile {
  const colors = brandColorsSchema.parse({
    primary: u.primaryColor ?? brand.colors.primary,
    secondary: u.secondaryColors ?? brand.colors.secondary,
  });
  return {
    name: u.name ?? brand.name,
    colors,
    toneOfVoice: u.toneOfVoice ?? brand.toneOfVoice,
    targetAudience: u.targetAudience ?? brand.targetAudience,
    styleKeywords: u.styleKeywords ?? brand.styleKeywords,
    description: u.description ?? brand.description,
  };
}

import type { BrandColors } from "@/lib/brand";

/** Editable brand values on the client (onboarding + settings). */
export interface BrandDraft {
  name: string;
  logoUrl: string | null;
  colors: BrandColors;
  toneOfVoice: string;
  targetAudience: string;
  styleKeywords: string[];
  description: string;
}

export type BrandDraftField = keyof BrandDraft;

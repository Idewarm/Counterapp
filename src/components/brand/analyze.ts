import { api } from "@/lib/client-api";
import type { BrandDraft, BrandDraftField } from "./types";

export interface BrandExtraction {
  primaryColor: string;
  secondaryColors: string[];
  toneOfVoice: string;
  styleKeywords: string[];
  targetAudience: string;
  description: string;
}

export interface AnalyzeResult {
  logoUrl: string;
  extraction: BrandExtraction;
  mode: "openai" | "mock";
}

export function analyzeLogo(file: File, name?: string, context?: string) {
  const body = new FormData();
  body.set("file", file);
  if (name) body.set("name", name);
  if (context) body.set("context", context);
  return api<AnalyzeResult>("/api/brands/analyze", { method: "POST", body });
}

export function applyExtraction(draft: BrandDraft, result: AnalyzeResult): { draft: BrandDraft; changed: BrandDraftField[] } {
  const e = result.extraction;
  return {
    draft: {
      ...draft,
      logoUrl: result.logoUrl,
      colors: { primary: e.primaryColor, secondary: e.secondaryColors },
      toneOfVoice: e.toneOfVoice,
      styleKeywords: e.styleKeywords.slice(0, 12),
      targetAudience: e.targetAudience,
      description: draft.description || e.description,
    },
    changed: ["colors", "toneOfVoice", "styleKeywords", "targetAudience", "description"],
  };
}

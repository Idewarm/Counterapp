"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ColorEditor } from "./color-editor";
import { KeywordInput } from "./keyword-input";
import type { BrandDraft, BrandDraftField } from "./types";

/** The editable brand identity fields, shared by onboarding and settings. */
export function BrandFields({
  draft,
  onChange,
  highlighted = [],
}: {
  draft: BrandDraft;
  onChange: (draft: BrandDraft) => void;
  /** Fields recently changed by the AI — briefly highlighted */
  highlighted?: BrandDraftField[];
}) {
  const set = <K extends BrandDraftField>(key: K, value: BrandDraft[K]) => onChange({ ...draft, [key]: value });
  const hl = (field: BrandDraftField) =>
    cn("space-y-2 rounded-lg p-2 -m-2 transition-colors duration-700", highlighted.includes(field) && "bg-primary/20");

  return (
    <div className="grid gap-6">
      <div className={hl("name")}>
        <Label htmlFor="brand-name">Brand name</Label>
        <Input id="brand-name" value={draft.name} maxLength={100} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className={hl("colors")}>
        <Label>Brand colours</Label>
        <ColorEditor value={draft.colors} onChange={(colors) => set("colors", colors)} />
      </div>
      <div className={hl("toneOfVoice")}>
        <Label htmlFor="tone">Tone of voice</Label>
        <Textarea id="tone" rows={3} maxLength={1000} value={draft.toneOfVoice} onChange={(e) => set("toneOfVoice", e.target.value)} placeholder="e.g. Warm, witty and confident…" />
      </div>
      <div className={hl("styleKeywords")}>
        <Label>Style keywords</Label>
        <KeywordInput value={draft.styleKeywords} onChange={(v) => set("styleKeywords", v)} />
      </div>
      <div className={hl("targetAudience")}>
        <Label htmlFor="audience">Target audience</Label>
        <Textarea id="audience" rows={2} maxLength={1000} value={draft.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Who are you talking to?" />
      </div>
      <div className={hl("description")}>
        <Label htmlFor="description">About the brand</Label>
        <Textarea id="description" rows={2} maxLength={2000} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="What do you offer? Anything the AI should know." />
      </div>
    </div>
  );
}

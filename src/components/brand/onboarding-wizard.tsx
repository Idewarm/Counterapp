"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_COLORS } from "@/lib/brand";
import { api } from "@/lib/client-api";
import { analyzeLogo, applyExtraction } from "./analyze";
import { BrandFields } from "./brand-fields";
import { colorsValid } from "./color-editor";
import { LogoDropzone } from "./logo-dropzone";
import type { BrandDraft, BrandDraftField } from "./types";

const EMPTY: BrandDraft = {
  name: "",
  logoUrl: null,
  colors: DEFAULT_COLORS,
  toneOfVoice: "",
  targetAudience: "",
  styleKeywords: [],
  description: "",
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState<BrandDraft>(EMPTY);
  const [highlighted, setHighlighted] = useState<BrandDraftField[]>([]);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [mode, setMode] = useState<"openai" | "mock" | null>(null);

  async function analyze() {
    if (!file) return;
    setBusy("analyze");
    try {
      const result = await analyzeLogo(file, draft.name, context);
      const { draft: next, changed } = applyExtraction(draft, result);
      setDraft(next);
      setHighlighted(changed);
      setMode(result.mode);
      setStep("review");
      setTimeout(() => setHighlighted([]), 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft.name.trim()) return toast.error("Please give your brand a name.");
    if (!colorsValid(draft.colors)) return toast.error("Fix the highlighted colour codes first.");
    setBusy("save");
    try {
      const { brand } = await api<{ brand: { id: string } }>("/api/brands", { method: "POST", json: draft });
      toast.success("Brand created!");
      router.push(`/brands/${brand.id}/generate`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save brand");
      setBusy(null);
    }
  }

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>1. Upload your branding</CardTitle>
          <CardDescription>Upload a logo or any key brand image. AI will extract your colours, tone of voice and style.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Brand name</Label>
            <Input id="name" value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Nano Banana Coffee" />
          </div>
          <LogoDropzone
            file={file}
            onFile={(f, error) => {
              if (error) toast.error(error);
              setFile(f);
            }}
          />
          <div className="grid gap-2">
            <Label htmlFor="context">
              Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id="context" rows={2} maxLength={1000} value={context} onChange={(e) => setContext(e.target.value)} placeholder="What you sell, who it's for, the vibe you're going for…" />
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep("review")} disabled={busy !== null}>
            Skip — enter details manually
          </Button>
          <Button onClick={analyze} disabled={!file || busy !== null}>
            {busy === "analyze" ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy === "analyze" ? "Analysing your brand…" : "Analyse with AI"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-5" /> 2. Review your brand identity
        </CardTitle>
        <CardDescription>
          {mode === "mock"
            ? "Mock AI mode (no OpenAI key configured): colours were sampled from your image and the rest is placeholder text — edit freely."
            : mode === "openai"
              ? "Here's what the AI found. Adjust anything — you can also refine it later by chatting with the AI."
              : "Fill in your brand details. You can refine them later by chatting with the AI."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[160px_1fr]">
        <div className="flex flex-col items-center gap-2">
          {draft.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded logo
            <img src={draft.logoUrl} alt="Uploaded logo" className="size-36 rounded-xl border bg-white object-contain p-2" />
          ) : (
            <div className="flex size-36 items-center justify-center rounded-xl border text-4xl font-semibold text-white" style={{ backgroundColor: draft.colors.primary }}>
              {(draft.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <BrandFields draft={draft} onChange={setDraft} highlighted={highlighted} />
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep("upload")} disabled={busy !== null}>
          <ArrowLeft /> Back
        </Button>
        <Button onClick={save} disabled={busy !== null}>
          {busy === "save" && <Loader2 className="animate-spin" />}
          Save brand & continue
        </Button>
      </CardFooter>
    </Card>
  );
}

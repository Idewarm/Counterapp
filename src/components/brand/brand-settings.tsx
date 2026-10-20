"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/client-api";
import { analyzeLogo, applyExtraction } from "./analyze";
import { BrandChat } from "./brand-chat";
import { BrandFields } from "./brand-fields";
import { colorsValid } from "./color-editor";
import { LogoDropzone } from "./logo-dropzone";
import type { BrandDraft, BrandDraftField } from "./types";

export function BrandSettings({ brandId, initial }: { brandId: string; initial: BrandDraft }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [highlighted, setHighlighted] = useState<BrandDraftField[]>([]);
  const [saving, setSaving] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function highlight(fields: BrandDraftField[]) {
    setHighlighted(fields);
    setTimeout(() => setHighlighted([]), 2500);
  }

  async function save() {
    if (!draft.name.trim()) return toast.error("Brand name is required.");
    if (!colorsValid(draft.colors)) return toast.error("Fix the highlighted colour codes first.");
    setSaving(true);
    try {
      await api(`/api/brands/${brandId}`, { method: "PATCH", json: draft });
      setSaved(draft);
      toast.success("Brand saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await api(`/api/brands/${brandId}`, { method: "DELETE" });
      toast.success("Brand deleted");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Brand identity</CardTitle>
          <CardDescription>These values steer every post the AI writes. Edit them directly, or ask the assistant.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex flex-wrap items-center gap-4">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded logo
              <img src={draft.logoUrl} alt="Brand logo" className="size-20 rounded-xl border bg-white object-contain p-1.5" />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-xl border text-2xl font-semibold text-white" style={{ backgroundColor: draft.colors.primary }}>
                {(draft.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <Button variant="outline" onClick={() => setLogoOpen(true)}>
              <ImageUp /> {draft.logoUrl ? "Replace logo & re-analyse" : "Upload logo & analyse"}
            </Button>
          </div>
          <BrandFields draft={draft} onChange={setDraft} highlighted={highlighted} />
          <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 px-6 pt-4 pb-1 backdrop-blur">
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Delete brand
            </Button>
            <div className="flex items-center gap-2">
              {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
              <Button variant="outline" disabled={!dirty || saving} onClick={() => setDraft(saved)}>
                <RotateCcw /> Reset
              </Button>
              <Button disabled={!dirty || saving} onClick={save}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />} Save changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BrandChat
        brandId={brandId}
        draft={draft}
        onApply={(next, changed) => {
          setDraft(next);
          highlight(changed);
        }}
        className="h-[640px] lg:sticky lg:top-20"
      />

      <LogoDialog
        open={logoOpen}
        onOpenChange={setLogoOpen}
        brandName={draft.name}
        onResult={(result) => {
          const { draft: next, changed } = applyExtraction(draft, result);
          setDraft(next);
          highlight(changed);
          toast.success("Logo analysed — review the highlighted fields and save.");
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{saved.name}”?</DialogTitle>
            <DialogDescription>This permanently deletes the brand and all of its posts. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LogoDialog({
  open,
  onOpenChange,
  brandName,
  onResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandName: string;
  onResult: (result: Awaited<ReturnType<typeof analyzeLogo>>) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!file) return;
    setBusy(true);
    try {
      onResult(await analyzeLogo(file, brandName));
      setFile(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a new logo</DialogTitle>
          <DialogDescription>AI will re-extract colours, tone and keywords. Nothing is saved until you click “Save changes”.</DialogDescription>
        </DialogHeader>
        <LogoDropzone
          file={file}
          onFile={(f, error) => {
            if (error) toast.error(error);
            setFile(f);
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={run} disabled={!file || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Analyse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

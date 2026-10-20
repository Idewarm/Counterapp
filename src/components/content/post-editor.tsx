"use client";

import { useState } from "react";
import type { Platform } from "@prisma/client";
import { Check, Copy, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { PLATFORM_META, PLATFORMS } from "@/lib/platforms";
import type { PostDTO } from "@/lib/posts";
import { cn } from "@/lib/utils";

export type EditorTarget = { mode: "edit"; post: PostDTO } | { mode: "create"; date: string };

interface FormState {
  platform: Platform;
  date: string;
  time: string;
  status: "DRAFT" | "APPROVED";
  pillar: string;
  caption: string;
  hashtags: string;
  visualConcept: string;
}

function toForm(target: EditorTarget): FormState {
  if (target.mode === "create") {
    return {
      platform: "INSTAGRAM",
      date: target.date,
      time: `${String(PLATFORM_META.INSTAGRAM.defaultHour).padStart(2, "0")}:00`,
      status: "DRAFT",
      pillar: "",
      caption: "",
      hashtags: "",
      visualConcept: "",
    };
  }
  const p = target.post;
  return {
    platform: p.platform,
    date: p.scheduledDate.slice(0, 10),
    time: p.scheduledDate.slice(11, 16),
    status: p.status,
    pillar: p.pillar,
    caption: p.caption,
    hashtags: p.hashtags.map((h) => `#${h}`).join(" "),
    visualConcept: p.visualConcept,
  };
}

const selectClass =
  "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function PostEditor(props: {
  brandId: string;
  target: EditorTarget | null;
  onClose: () => void;
  onSaved: (post: PostDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const { target, onClose } = props;
  const key = !target ? "none" : target.mode === "edit" ? target.post.id : `new-${target.date}`;
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        {target && <EditorBody key={key} {...props} target={target} />}
      </SheetContent>
    </Sheet>
  );
}

function EditorBody({
  brandId,
  target,
  onSaved,
  onDeleted,
}: {
  brandId: string;
  target: EditorTarget;
  onSaved: (post: PostDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(target));
  const [initial, setInitial] = useState(form);
  const [busy, setBusy] = useState<"save" | "regen" | "delete" | null>(null);
  const [instruction, setInstruction] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const isEdit = target.mode === "edit";
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const meta = PLATFORM_META[form.platform];
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function payload() {
    return {
      platform: form.platform,
      scheduledDate: new Date(`${form.date}T${form.time || "12:00"}:00.000Z`).toISOString(),
      status: form.status,
      pillar: form.pillar,
      caption: form.caption,
      hashtags: form.hashtags,
      visualConcept: form.visualConcept,
    };
  }

  function accept(post: PostDTO) {
    const next = toForm({ mode: "edit", post });
    setForm(next);
    setInitial(next);
    onSaved(post);
  }

  async function save() {
    if (!form.date) return toast.error("Pick a date.");
    setBusy("save");
    try {
      const { post } = isEdit
        ? await api<{ post: PostDTO }>(`/api/posts/${target.post.id}`, { method: "PATCH", json: payload() })
        : await api<{ post: PostDTO }>(`/api/brands/${brandId}/posts`, { method: "POST", json: payload() });
      accept(post);
      toast.success(isEdit ? "Post saved" : "Post added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    if (!isEdit) return;
    setBusy("regen");
    try {
      // Persist manual changes first so the AI rewrites the current version.
      if (dirty) await api(`/api/posts/${target.post.id}`, { method: "PATCH", json: payload() });
      const { post } = await api<{ post: PostDTO }>(`/api/posts/${target.post.id}/regenerate`, {
        method: "POST",
        json: { instruction: instruction.trim() || undefined },
      });
      accept(post);
      setInstruction("");
      toast.success("Post regenerated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!isEdit) return;
    setBusy("delete");
    try {
      await api(`/api/posts/${target.post.id}`, { method: "DELETE" });
      toast.success("Post deleted");
      onDeleted(target.post.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
      setBusy(null);
    }
  }

  async function copy() {
    const tags = form.hashtags.trim();
    await navigator.clipboard.writeText(tags ? `${form.caption}\n\n${tags}` : form.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{isEdit ? "Edit post" : "New post"}</SheetTitle>
        <SheetDescription>
          {new Date(`${form.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_100px]">
          <div className="col-span-2 grid gap-1.5 sm:col-span-1">
            <Label htmlFor="platform">Platform</Label>
            <select id="platform" className={selectClass} value={form.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_META[p].label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox checked={form.status === "APPROVED"} onCheckedChange={(v) => set("status", v === true ? "APPROVED" : "DRAFT")} />
            Approved
          </label>
          <Input aria-label="Content pillar" placeholder="Content pillar" value={form.pillar} maxLength={100} onChange={(e) => set("pillar", e.target.value)} className="h-8 w-48" />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="caption">Caption</Label>
            <span className={cn("text-xs text-muted-foreground", form.caption.length > meta.captionMaxChars && "text-destructive")}>
              {form.caption.length} / {meta.captionMaxChars}
            </span>
          </div>
          <Textarea id="caption" rows={7} maxLength={5000} value={form.caption} onChange={(e) => set("caption", e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="hashtags">Hashtags</Label>
            <span className="text-xs text-muted-foreground">
              Recommended {meta.hashtagRange[0]}–{meta.hashtagRange[1]}
            </span>
          </div>
          <Textarea id="hashtags" rows={2} value={form.hashtags} onChange={(e) => set("hashtags", e.target.value)} placeholder="#coffee #morningritual" className="text-sky-700 dark:text-sky-400" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="visual">Visual concept</Label>
          <Textarea id="visual" rows={5} maxLength={5000} value={form.visualConcept} onChange={(e) => set("visualConcept", e.target.value)} placeholder={meta.visualFormat} />
        </div>

        {isEdit && (
          <>
            <Separator />
            <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
              <Label htmlFor="instruction" className="flex items-center gap-2">
                <Sparkles className="size-4" /> Regenerate with AI
              </Label>
              <div className="flex gap-2">
                <Input
                  id="instruction"
                  value={instruction}
                  maxLength={500}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Optional: “shorter”, “add a question”, “focus on the new menu”…"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), regenerate())}
                />
                <Button onClick={regenerate} disabled={busy !== null} variant="secondary">
                  {busy === "regen" ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Replaces caption, hashtags and visual concept, and sets the post back to draft.</p>
            </div>
          </>
        )}
      </div>

      <SheetFooter className="flex-row flex-wrap justify-between gap-2 border-t">
        <div className="flex gap-2">
          {isEdit &&
            (confirmDelete ? (
              <Button variant="destructive" onClick={remove} disabled={busy !== null}>
                {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />} Confirm delete
              </Button>
            ) : (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Delete
              </Button>
            ))}
          <Button variant="ghost" onClick={copy} disabled={!form.caption}>
            {copied ? <Check /> : <Copy />} Copy
          </Button>
        </div>
        <Button onClick={save} disabled={busy !== null || (isEdit && !dirty)}>
          {busy === "save" ? <Loader2 className="animate-spin" /> : <Save />}
          {isEdit ? "Save changes" : "Add post"}
        </Button>
      </SheetFooter>
    </>
  );
}

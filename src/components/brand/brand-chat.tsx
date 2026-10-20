"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import type { BrandColors } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { BrandDraft, BrandDraftField } from "./types";

interface Turn {
  role: "user" | "assistant";
  content: string;
  changed?: string[];
}

interface ChatResponse {
  reply: string;
  changed: string[];
  draft: Omit<BrandDraft, "logoUrl"> & { colors: BrandColors };
}

const SUGGESTIONS = ["Make the tone more playful", "Suggest a bolder colour palette", "Our audience is busy young parents", "Add style keywords for a premium feel"];

const FIELD_LABELS: Record<string, string> = {
  name: "name",
  primaryColor: "primary colour",
  secondaryColors: "secondary colours",
  toneOfVoice: "tone of voice",
  targetAudience: "audience",
  styleKeywords: "keywords",
  description: "description",
};

/** AI chat sidebar: proposes brand changes and applies them to the (unsaved) draft. */
export function BrandChat({
  brandId,
  draft,
  onApply,
  className,
}: {
  brandId: string;
  draft: BrandDraft;
  onApply: (draft: BrandDraft, changed: BrandDraftField[]) => void;
  className?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: "Hi! Tell me how you'd like to adjust your brand — tone, audience, colours or style. I'll update the form for you to review and save." },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, pending]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || pending) return;
    const history = turns.slice(1).map(({ role, content }) => ({ role, content }));
    setTurns((t) => [...t, { role: "user", content: text }]);
    setInput("");
    setPending(true);
    try {
      const { logoUrl: _logo, ...draftValues } = draft;
      void _logo;
      const res = await api<ChatResponse>(`/api/brands/${brandId}/chat`, { method: "POST", json: { message: text, history, draft: draftValues } });
      setTurns((t) => [...t, { role: "assistant", content: res.reply, changed: res.changed }]);
      if (res.changed.length) {
        const fields = new Set<BrandDraftField>(
          res.changed.map((c) => (c === "primaryColor" || c === "secondaryColors" ? "colors" : (c as BrandDraftField))),
        );
        onApply({ ...res.draft, logoUrl: draft.logoUrl }, [...fields]);
      }
    } catch (err) {
      setTurns((t) => [...t, { role: "assistant", content: `Sorry — ${err instanceof Error ? err.message : "something went wrong"}.` }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-2 border-b px-4 py-3 font-medium">
        <Bot className="size-4" /> Brand assistant
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.map((t, i) => (
          <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap", t.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {t.content}
              {t.changed && t.changed.length > 0 && (
                <p className="mt-1.5 text-xs opacity-70">Updated: {t.changed.map((c) => FIELD_LABELS[c] ?? c).join(", ")} — review & save.</p>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {turns.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent">
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="e.g. Make us sound more premium"
          className="max-h-32 min-h-9 resize-none"
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}

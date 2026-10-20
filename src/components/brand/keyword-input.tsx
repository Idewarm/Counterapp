"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function KeywordInput({ value, onChange, max = 12 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [text, setText] = useState("");

  function commit() {
    const additions = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!additions.length) return;
    const next = Array.from(new Set([...value, ...additions])).slice(0, max);
    onChange(next);
    setText("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((k) => (
          <Badge key={k} variant="secondary" className="gap-1 py-1 pr-1">
            {k}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== k))} className="rounded-sm hover:bg-foreground/10" aria-label={`Remove ${k}`}>
              <X />
            </button>
          </Badge>
        ))}
        {value.length === 0 && <span className="text-sm text-muted-foreground">No keywords yet.</span>}
      </div>
      <Input
        value={text}
        disabled={value.length >= max}
        placeholder={value.length >= max ? `Maximum ${max} keywords` : "Type a keyword and press Enter"}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

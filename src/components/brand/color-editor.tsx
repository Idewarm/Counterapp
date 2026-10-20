"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BrandColors } from "@/lib/brand";
import { cn } from "@/lib/utils";

const HEX = /^#[0-9A-Fa-f]{6}$/;

function Swatch({
  value,
  onChange,
  onRemove,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  onRemove?: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs" style={{ backgroundColor: HEX.test(value) ? value : "transparent" }}>
        <span className="sr-only">{label} colour picker</span>
        <input
          type="color"
          value={HEX.test(value) ? value.toLowerCase() : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Input
        aria-label={`${label} hex code`}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className={cn("w-28 font-mono uppercase", !HEX.test(value) && "border-destructive")}
        maxLength={7}
      />
      {onRemove && (
        <Button type="button" size="icon" variant="ghost" onClick={onRemove} aria-label={`Remove ${label}`}>
          <X />
        </Button>
      )}
    </div>
  );
}

export function ColorEditor({ value, onChange }: { value: BrandColors; onChange: (colors: BrandColors) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Primary</p>
        <Swatch label="Primary" value={value.primary} onChange={(primary) => onChange({ ...value, primary })} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Secondary</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {value.secondary.map((hex, i) => (
            <Swatch
              key={i}
              label={`Secondary ${i + 1}`}
              value={hex}
              onChange={(next) => onChange({ ...value, secondary: value.secondary.map((c, j) => (j === i ? next : c)) })}
              onRemove={() => onChange({ ...value, secondary: value.secondary.filter((_, j) => j !== i) })}
            />
          ))}
          {value.secondary.length < 6 && (
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => onChange({ ...value, secondary: [...value.secondary, "#FFFFFF"] })}>
              <Plus /> Add colour
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function colorsValid(colors: BrandColors) {
  return HEX.test(colors.primary) && colors.secondary.every((c) => HEX.test(c));
}

"use client";

import { useState } from "react";
import type { Platform } from "@prisma/client";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PLATFORMS } from "@/lib/platforms";
import { formatMonthLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const FORMATS = [
  { id: "csv", label: "CSV", hint: "Spreadsheets, Buffer, Hootsuite, Later…", icon: FileSpreadsheet },
  { id: "json", label: "JSON", hint: "Structured data for tools and APIs", icon: FileJson },
  { id: "txt", label: "Text", hint: "Readable day-by-day brief for your team", icon: FileText },
] as const;

export function ExportDialog({
  brandId,
  brandName,
  month,
  platforms,
  status,
  total,
}: {
  brandId: string;
  brandName: string;
  month: string;
  platforms: Platform[];
  status: "ALL" | "DRAFT" | "APPROVED";
  total: number;
}) {
  const [format, setFormat] = useState<(typeof FORMATS)[number]["id"]>("csv");
  const [useFilters, setUseFilters] = useState(true);

  const params = new URLSearchParams({ month, format });
  if (useFilters) {
    if (platforms.length && platforms.length < PLATFORMS.length) params.set("platforms", platforms.join(","));
    if (status !== "ALL") params.set("status", status);
  }
  const href = `/api/brands/${brandId}/export?${params}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Download /> Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export calendar</DialogTitle>
          <DialogDescription>
            {brandName} · {formatMonthLabel(month)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {FORMATS.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFormat(id)}
              className={cn("flex items-center gap-3 rounded-lg border p-3 text-left transition-colors", format === id ? "border-primary bg-primary/10" : "hover:bg-accent")}
            >
              <Icon className="size-5" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={useFilters} onCheckedChange={(v) => setUseFilters(v === true)} />
          Only export what the current filters show ({total} posts)
        </label>
        <DialogFooter>
          <Button asChild>
            <a href={href} download>
              <Download /> Download {format.toUpperCase()}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

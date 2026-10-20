import type { Platform } from "@prisma/client";
import { PLATFORM_META } from "./platforms";

export interface ExportPost {
  platform: Platform;
  scheduledDate: Date;
  caption: string;
  hashtags: string[];
  visualConcept: string;
  pillar: string;
  status: "DRAFT" | "APPROVED";
}

export type ExportFormat = "csv" | "json" | "txt";

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const fmtTime = (d: Date) => d.toISOString().slice(11, 16);
const tags = (list: string[]) => list.map((t) => `#${t}`).join(" ");

/** RFC 4180 field escaping; also neutralises spreadsheet formula injection. */
export function csvField(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCSV(posts: ExportPost[]): string {
  const header = ["Date", "Time", "Weekday", "Platform", "Status", "Pillar", "Caption", "Hashtags", "Visual Concept"];
  const lines = posts.map((p) =>
    [
      fmtDate(p.scheduledDate),
      fmtTime(p.scheduledDate),
      p.scheduledDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
      PLATFORM_META[p.platform].label,
      p.status,
      p.pillar,
      p.caption,
      tags(p.hashtags),
      p.visualConcept,
    ]
      .map(csvField)
      .join(","),
  );
  // BOM so Excel opens UTF-8 (emojis!) correctly.
  return "﻿" + [header.join(","), ...lines].join("\r\n") + "\r\n";
}

export function toJSON(brandName: string, month: string, posts: ExportPost[]): string {
  return JSON.stringify(
    {
      brand: brandName,
      month,
      exportedAt: new Date().toISOString(),
      count: posts.length,
      posts: posts.map((p) => ({
        date: fmtDate(p.scheduledDate),
        time: fmtTime(p.scheduledDate),
        platform: p.platform,
        status: p.status,
        pillar: p.pillar,
        caption: p.caption,
        hashtags: p.hashtags.map((t) => `#${t}`),
        visualConcept: p.visualConcept,
      })),
    },
    null,
    2,
  );
}

export function toText(brandName: string, monthLabel: string, posts: ExportPost[]): string {
  const out = [`${brandName} — Content calendar for ${monthLabel}`, `${posts.length} posts`, ""];
  let currentDay = "";
  for (const p of posts) {
    const day = p.scheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
    if (day !== currentDay) {
      out.push("", "=".repeat(60), day.toUpperCase(), "=".repeat(60));
      currentDay = day;
    }
    out.push(
      "",
      `[${PLATFORM_META[p.platform].label}] ${fmtTime(p.scheduledDate)} · ${p.status}${p.pillar ? ` · ${p.pillar}` : ""}`,
      "",
      p.caption,
      "",
      tags(p.hashtags),
      "",
      `Visual: ${p.visualConcept}`,
      "-".repeat(60),
    );
  }
  return out.join("\n") + "\n";
}

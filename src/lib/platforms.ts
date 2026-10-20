import type { Platform } from "@prisma/client";

export const PLATFORMS = ["TIKTOK", "INSTAGRAM", "FACEBOOK", "LINKEDIN"] as const satisfies readonly Platform[];

export interface PlatformMeta {
  label: string;
  /** Tailwind classes for chips/badges */
  chip: string;
  dot: string;
  /** Default posting days (0 = Sunday … 6 = Saturday) */
  defaultWeekdays: number[];
  /** Default posting hour (24h wall-clock) */
  defaultHour: number;
  captionMaxChars: number;
  hashtagRange: [number, number];
  guidance: string;
  visualFormat: string;
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  TIKTOK: {
    label: "TikTok",
    chip: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    dot: "bg-zinc-900 dark:bg-zinc-100",
    defaultWeekdays: [1, 3, 5],
    defaultHour: 19,
    captionMaxChars: 2200,
    hashtagRange: [3, 6],
    guidance:
      "Short, punchy captions (1–2 sentences) with a strong hook in the first line. Trend-aware, casual, entertaining. Encourage comments or duets.",
    visualFormat:
      "Vertical 9:16 short-form video (7–45s). Describe the hook in the first 2 seconds, shot list, on-screen text and audio/trend suggestion.",
  },
  INSTAGRAM: {
    label: "Instagram",
    chip: "bg-pink-600 text-white",
    dot: "bg-pink-600",
    defaultWeekdays: [2, 4, 6],
    defaultHour: 11,
    captionMaxChars: 2200,
    hashtagRange: [5, 12],
    guidance:
      "Visual-first storytelling. Hook in the first line, line breaks for readability, emojis where on-brand, and a clear call-to-action (save, share, link in bio).",
    visualFormat:
      "Feed post (4:5 image or carousel) or Reel (9:16). Describe composition, colors, subject, text overlays and carousel slide breakdown if relevant.",
  },
  FACEBOOK: {
    label: "Facebook",
    chip: "bg-blue-600 text-white",
    dot: "bg-blue-600",
    defaultWeekdays: [3, 0],
    defaultHour: 13,
    captionMaxChars: 1500,
    hashtagRange: [1, 3],
    guidance:
      "Conversational, community-oriented copy that sparks discussion. Questions, polls, behind-the-scenes and local/community angles work well. Minimal hashtags.",
    visualFormat:
      "Landscape 1.91:1 or square image, short video, or link preview. Describe the image/video and any headline text.",
  },
  LINKEDIN: {
    label: "LinkedIn",
    chip: "bg-sky-800 text-white",
    dot: "bg-sky-800",
    defaultWeekdays: [2, 4],
    defaultHour: 9,
    captionMaxChars: 3000,
    hashtagRange: [3, 5],
    guidance:
      "Professional, insight-driven thought leadership. Open with a bold one-line hook, share a lesson, data point or story, use short paragraphs, end with a question.",
    visualFormat:
      "Document carousel (PDF slides), infographic, team photo or native video. Describe slide structure or the visual and its key message.",
  },
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}

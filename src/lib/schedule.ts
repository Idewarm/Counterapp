import type { Platform } from "@prisma/client";
import { PLATFORM_META } from "./platforms";

/**
 * Scheduled dates are treated as "wall-clock" times stored in UTC: a post at
 * 2026-11-03T19:00Z is shown as 3 Nov, 19:00 regardless of the viewer's zone.
 * Always format them with `timeZone: "UTC"`.
 */

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export interface MonthRange {
  key: string; // "2026-11"
  year: number;
  month: number; // 1-12
  start: Date; // inclusive, UTC
  end: Date; // exclusive, UTC
  daysInMonth: number;
}

export function parseMonth(key: string | null | undefined): MonthRange | null {
  if (!key) return null;
  const m = MONTH_RE.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { key, year, month, start, end, daysInMonth };
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
  const r = parseMonth(key);
  if (!r) return key;
  return monthKey(new Date(Date.UTC(r.year, r.month - 1 + delta, 1)));
}

export function formatMonthLabel(key: string): string {
  const r = parseMonth(key);
  if (!r) return key;
  return r.start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface WeekChunk {
  index: number; // 0-based week of the month
  start: Date; // first day in chunk (inclusive)
  end: Date; // exclusive
}

/** Split a month into Monday-starting week chunks, clipped to the month. */
export function weekChunks(range: MonthRange): WeekChunk[] {
  const chunks: WeekChunk[] = [];
  let cursor = range.start;
  let index = 0;
  while (cursor < range.end) {
    const dow = cursor.getUTCDay(); // 0 = Sun
    const daysUntilNextMonday = ((8 - dow) % 7) || 7;
    let next = new Date(cursor.getTime() + daysUntilNextMonday * 86_400_000);
    if (next > range.end) next = range.end;
    chunks.push({ index, start: cursor, end: next });
    cursor = next;
    index++;
  }
  // Fold stub weeks (< 3 days) at either end into their neighbour so each
  // chunk is a meaningful batch with its own theme.
  const days = (c: WeekChunk) => (c.end.getTime() - c.start.getTime()) / 86_400_000;
  if (chunks.length > 1 && days(chunks[0]) < 3) {
    const [first, second] = chunks.splice(0, 2);
    chunks.unshift({ index: 0, start: first.start, end: second.end });
  }
  if (chunks.length > 1 && days(chunks[chunks.length - 1]) < 3) {
    const last = chunks.pop()!;
    chunks[chunks.length - 1] = { ...chunks[chunks.length - 1], end: last.end };
  }
  return chunks.map((c, i) => ({ ...c, index: i }));
}

/**
 * Posting slots for one platform in a date window. Uses the platform's
 * preferred weekdays and posting hour, so the calendar is balanced across the
 * month and the AI only has to write content for fixed dates.
 */
export function platformSlots(
  platform: Platform,
  start: Date,
  end: Date,
  postsPerWeek?: number,
): Date[] {
  const meta = PLATFORM_META[platform];
  const weekdays = pickWeekdays(meta.defaultWeekdays, postsPerWeek);
  const slots: Date[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) {
    const d = new Date(t);
    if (weekdays.includes(d.getUTCDay())) {
      slots.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), meta.defaultHour)));
    }
  }
  return slots;
}

// Spread order used when a platform needs more days than its defaults.
const SPREAD = [1, 3, 5, 2, 4, 6, 0];

export function pickWeekdays(defaults: number[], postsPerWeek?: number): number[] {
  if (!postsPerWeek || postsPerWeek === defaults.length) return defaults;
  const n = Math.max(1, Math.min(7, Math.round(postsPerWeek)));
  if (n < defaults.length) return defaults.slice(0, n);
  const extra = SPREAD.filter((d) => !defaults.includes(d));
  return [...defaults, ...extra.slice(0, n - defaults.length)];
}

/** Calendar grid cells (Monday-first) for a month, with leading/trailing blanks as null. */
export function calendarCells(range: MonthRange): (Date | null)[] {
  const leading = (range.start.getUTCDay() + 6) % 7;
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= range.daysInMonth; day++) {
    cells.push(new Date(Date.UTC(range.year, range.month - 1, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

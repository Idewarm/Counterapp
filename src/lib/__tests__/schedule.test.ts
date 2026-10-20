import { describe, expect, it } from "vitest";
import { calendarCells, parseMonth, pickWeekdays, platformSlots, shiftMonth, weekChunks } from "../schedule";

describe("parseMonth", () => {
  it("parses valid keys into UTC bounds", () => {
    const r = parseMonth("2026-02")!;
    expect(r.start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(r.daysInMonth).toBe(28);
  });
  it("rejects invalid keys", () => {
    for (const k of ["2026-13", "2026-1", "nope", "", null, undefined]) expect(parseMonth(k)).toBeNull();
  });
});

describe("shiftMonth", () => {
  it("wraps years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("weekChunks", () => {
  it("covers the whole month without gaps, splitting on Mondays and folding stubs", () => {
    const r = parseMonth("2026-11")!; // 1 Nov 2026 is a Sunday, 30 Nov a Monday
    const chunks = weekChunks(r);
    expect(chunks.length).toBe(4);
    expect(chunks[0].start.toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(chunks[0].end.toISOString().slice(0, 10)).toBe("2026-11-09");
    expect(chunks.at(-1)!.end.getTime()).toBe(r.end.getTime());
    chunks.forEach((c, i) => expect(c.index).toBe(i));
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start.getTime()).toBe(chunks[i - 1].end.getTime());
      expect(chunks[i].start.getUTCDay()).toBe(1);
    }
  });
});

describe("platformSlots", () => {
  it("uses platform weekdays and hour, within the window", () => {
    const r = parseMonth("2026-11")!;
    const slots = platformSlots("TIKTOK", r.start, r.end);
    expect(slots.every((d) => [1, 3, 5].includes(d.getUTCDay()))).toBe(true);
    expect(slots.every((d) => d.getUTCHours() === 19)).toBe(true);
    expect(slots.every((d) => d >= r.start && d < r.end)).toBe(true);
    expect(slots.length).toBe(13); // Mon/Wed/Fri in Nov 2026
  });
  it("honours posts-per-week overrides", () => {
    const r = parseMonth("2026-11")!;
    expect(platformSlots("LINKEDIN", r.start, r.end, 1).every((d) => d.getUTCDay() === 2)).toBe(true);
    expect(platformSlots("INSTAGRAM", r.start, r.end, 7).length).toBe(30);
  });
});

describe("pickWeekdays", () => {
  it("trims or extends without duplicates", () => {
    expect(pickWeekdays([2, 4], 1)).toEqual([2]);
    const five = pickWeekdays([2, 4], 5);
    expect(new Set(five).size).toBe(5);
  });
});

describe("calendarCells", () => {
  it("is Monday-first and a multiple of 7", () => {
    const cells = calendarCells(parseMonth("2026-11")!);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 6).every((c) => c === null)).toBe(true); // Sunday the 1st → 6 blanks
    expect(cells[6]!.getUTCDate()).toBe(1);
  });
});

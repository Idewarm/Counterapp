import { describe, expect, it } from "vitest";
import { brandColorsSchema, parseColors, DEFAULT_COLORS } from "../brand";
import { normalizeHashtags, postPatchSchema } from "../posts";

describe("brand colours", () => {
  it("normalises hex codes", () => {
    expect(brandColorsSchema.parse({ primary: "fd0", secondary: ["#abcdef"] })).toEqual({ primary: "#FFDD00", secondary: ["#ABCDEF"] });
  });
  it("rejects invalid colours and falls back when parsing stored JSON", () => {
    expect(brandColorsSchema.safeParse({ primary: "red", secondary: [] }).success).toBe(false);
    expect(parseColors({ nope: true })).toEqual(DEFAULT_COLORS);
  });
});

describe("normalizeHashtags", () => {
  it("strips #, punctuation and duplicates (case-insensitive)", () => {
    expect(normalizeHashtags("#Coffee, #coffee #morning-ritual  ##café")).toEqual(["Coffee", "morningritual", "café"]);
  });
});

describe("postPatchSchema", () => {
  it("accepts string hashtags and ISO dates", () => {
    const parsed = postPatchSchema.parse({ hashtags: "#a #b", scheduledDate: "2026-11-03T11:00:00.000Z" });
    expect(parsed.hashtags).toEqual(["a", "b"]);
    expect(parsed.scheduledDate).toBeInstanceOf(Date);
  });
  it("rejects unknown platforms", () => {
    expect(postPatchSchema.safeParse({ platform: "MYSPACE" }).success).toBe(false);
  });
});

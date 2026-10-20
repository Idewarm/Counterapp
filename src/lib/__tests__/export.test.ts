import { describe, expect, it } from "vitest";
import { csvField, toCSV, toJSON, toText, type ExportPost } from "../export";

const post: ExportPost = {
  platform: "INSTAGRAM",
  scheduledDate: new Date("2026-11-03T11:00:00Z"),
  caption: 'Hello, "world"\nNew line ☕',
  hashtags: ["coffee", "morning"],
  visualConcept: "Flat lay",
  pillar: "Product",
  status: "DRAFT",
};

describe("csvField", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("plain")).toBe("plain");
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField("+1")).toBe("'+1");
  });
});

describe("toCSV", () => {
  it("emits a BOM, header and escaped rows", () => {
    const csv = toCSV([post]);
    expect(csv.startsWith("﻿Date,Time,Weekday,Platform")).toBe(true);
    expect(csv).toContain('2026-11-03,11:00,Tuesday,Instagram,DRAFT,Product,"Hello, ""world""\nNew line ☕",#coffee #morning,Flat lay');
  });
});

describe("toJSON / toText", () => {
  it("round-trips through JSON.parse", () => {
    const data = JSON.parse(toJSON("Acme", "2026-11", [post]));
    expect(data.count).toBe(1);
    expect(data.posts[0]).toMatchObject({ date: "2026-11-03", time: "11:00", hashtags: ["#coffee", "#morning"] });
  });
  it("groups text by day", () => {
    const text = toText("Acme", "November 2026", [post]);
    expect(text).toContain("TUESDAY, NOVEMBER 3");
    expect(text).toContain("[Instagram] 11:00 · DRAFT · Product");
  });
});

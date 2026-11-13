import { describe, expect, it } from "vitest";

// Mirrors the tokenizer in src/server/ai/faq.ts (kept private there).
const STOP = new Set("a an the is are do does you your we our i me my for of to in on at and or can what how much when where there any have has be it this that with".split(" "));
const words = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w.replace(/s$/, "")));

describe("faq tokenizer", () => {
  it("matches park / parking", () => {
    expect(words("Where can I park my car?")).toContain("park");
    expect(words("Is there parking?")).toContain("park");
  });
});

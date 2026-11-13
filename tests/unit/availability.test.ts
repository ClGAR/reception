import { describe, expect, it } from "vitest";
import { canTransition, computeSlots, type SlotInput } from "@/server/booking/availability";
import { localToUtc, localParts, tzOffsetMinutes } from "@/lib/time";

const TZ = "Asia/Manila";
// Friday 2026-11-13 08:00 Manila
const now = localToUtc("2026-11-13", 8 * 60, TZ);
const base: SlotInput = {
  date: "2026-11-14", // Saturday
  timezone: TZ,
  durationMinutes: 60,
  bufferMinutes: 0,
  staffIds: ["a"],
  hours: [{ staffId: null, weekday: 6, startMinute: 9 * 60, endMinute: 12 * 60 }],
  exceptions: [],
  busy: [],
  now,
  leadTimeMinutes: 60,
  maxDaysAhead: 30,
  stepMinutes: 60,
};
const mins = (s: { minute: number }[]) => s.map((x) => x.minute / 60);

describe("time", () => {
  it("Manila is UTC+8", () => {
    expect(tzOffsetMinutes(new Date(), TZ)).toBe(480);
    expect(localToUtc("2026-11-14", 9 * 60, TZ).toISOString()).toBe("2026-11-14T01:00:00.000Z");
    expect(localParts(new Date("2026-11-14T01:00:00Z"), TZ)).toMatchObject({ date: "2026-11-14", minute: 540, weekday: 6 });
  });
});

describe("computeSlots", () => {
  it("generates slots inside working hours", () => {
    expect(mins(computeSlots(base))).toEqual([9, 10, 11]);
  });
  it("respects service duration at closing", () => {
    expect(mins(computeSlots({ ...base, durationMinutes: 90, stepMinutes: 30 }))).toEqual([9, 9.5, 10, 10.5]);
  });
  it("buffer blocks the following slot", () => {
    const busy = [{ staffId: "a", startsAt: localToUtc("2026-11-14", 600, TZ), blockEndsAt: localToUtc("2026-11-14", 690, TZ) }];
    expect(mins(computeSlots({ ...base, busy, stepMinutes: 30 }))).toEqual([9]);
  });
  it("closed day returns nothing", () => {
    expect(computeSlots({ ...base, date: "2026-11-15" })).toEqual([]);
  });
  it("all-day closure exception", () => {
    expect(computeSlots({ ...base, exceptions: [{ staffId: null, date: "2026-11-14", startMinute: null, endMinute: null }] })).toEqual([]);
  });
  it("partial exception removes a window", () => {
    expect(mins(computeSlots({ ...base, exceptions: [{ staffId: "a", date: "2026-11-14", startMinute: 600, endMinute: 660 }] }))).toEqual([9, 11]);
  });
  it("staff own hours intersect business hours", () => {
    const hours = [...base.hours, { staffId: "a", weekday: 6, startMinute: 600, endMinute: 900 }];
    expect(mins(computeSlots({ ...base, hours }))).toEqual([10, 11]);
  });
  it("lead time hides near slots", () => {
    const nowSat = localToUtc("2026-11-14", 9 * 60 + 30, TZ);
    expect(mins(computeSlots({ ...base, now: nowSat }))).toEqual([11]);
  });
  it("past and too-far dates are empty", () => {
    expect(computeSlots({ ...base, date: "2026-11-12" })).toEqual([]);
    expect(computeSlots({ ...base, date: "2026-12-30" })).toEqual([]);
  });
  it("merges staff into one slot list", () => {
    const busy = [{ staffId: "a", startsAt: localToUtc("2026-11-14", 540, TZ), blockEndsAt: localToUtc("2026-11-14", 600, TZ) }];
    const s = computeSlots({ ...base, staffIds: ["a", "b"], busy });
    expect(s[0]).toMatchObject({ minute: 540, staffIds: ["b"] });
    expect(s[1].staffIds).toEqual(["a", "b"]);
  });
});

describe("status transitions", () => {
  it("allows only legal moves", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("declined", "confirmed")).toBe(false);
    expect(canTransition("confirmed", "pending")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { checkReply, claimsConfirmed, isAffirmative, parseTime, pesosIn, timesIn } from "@/server/ai/flow-rules";

describe("parseTime", () => {
  it("parses common formats", () => {
    expect(parseTime("2 PM")).toBe(840);
    expect(parseTime("2:30pm")).toBe(870);
    expect(parseTime("14:00")).toBe(840);
    expect(parseTime("12 nn")).toBe(720);
    expect(parseTime("9:00 a.m.")).toBe(540);
    expect(parseTime("3")).toBe(900);
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("soon")).toBeNull();
  });
});

describe("timesIn / pesosIn", () => {
  it("finds times and prices in text", () => {
    expect(timesIn("We have 1:00 PM, 2pm and 12 NN.")).toEqual([780, 840, 720]);
    expect(pesosIn("Hair Spa is ₱900 and Color is PHP 2,500.")).toEqual([90000, 250000]);
  });
});

describe("isAffirmative", () => {
  it.each(["yes", "Yes please", "oo", "sige po", "ok", "go ahead", "Confirm", "yes, book it"])("yes: %s", (t) => expect(isAffirmative(t)).toBe(true));
  it.each(["no", "wait, change it to 3 PM", "can we do another day?", "hmm", "what about Tuesday", "yes but change the time"])("not yes: %s", (t) =>
    expect(isAffirmative(t)).toBe(false),
  );
});

describe("checkReply", () => {
  const ctx = { allowedMinutes: [780, 840], prices: [90000], hoursMinutes: [540, 1140], appointmentConfirmed: false };
  it("accepts real times/prices", () => expect(checkReply("Hair Spa is ₱900. I have 1:00 PM or 2:00 PM.", ctx)).toBeNull());
  it("rejects invented times", () => expect(checkReply("How about 4:00 PM?", ctx)).toMatch(/unverified time/));
  it("rejects invented prices", () => expect(checkReply("That's ₱750.", ctx)).toMatch(/unknown price/));
  it("rejects false confirmation", () => {
    expect(checkReply("Great, your appointment is confirmed!", ctx)).toBe("claims confirmation");
    expect(claimsConfirmed("You're all set for Monday")).toBe(true);
    expect(claimsConfirmed("It isn't confirmed yet. Staff will confirm it.")).toBe(false);
  });
  it("allows opening hours mentions", () => expect(checkReply("We're open 9:00 AM to 7:00 PM.", ctx)).toBeNull());
});

import { pickTimes } from "@/server/ai/receptionist";
describe("pickTimes", () => {
  const day = [540, 570, 600, 630, 660, 690, 720, 750, 780, 810, 840, 870, 900];
  it("honors afternoon", () => expect(pickTimes(day, "afternoon please").every((m) => m >= 720)).toBe(true));
  it("honors morning", () => expect(pickTimes(day, "morning").every((m) => m < 720)).toBe(true));
  it("spreads across the day", () => expect(pickTimes(day)).toEqual([540, 660, 780, 900]));
});

import { extractContact } from "@/server/ai/receptionist";
describe("extractContact", () => {
  it("reads name + email", () => expect(extractContact("I'm Eval Tester, eval.tester@example.test")).toEqual({ name: "Eval Tester", email: "eval.tester@example.test", phone: undefined }));
  it("reads name + phone", () => expect(extractContact("Ana Cruz 0917 123 4567")).toMatchObject({ name: "Ana Cruz", phone: "0917 123 4567" }));
  it("no contact → nothing usable", () => expect(extractContact("what time?").email).toBeUndefined());
});

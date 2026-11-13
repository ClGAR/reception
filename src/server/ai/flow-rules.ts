// Pure, deterministic rules for the chat booking flow. No database, no model: unit-tested directly.
import { minuteLabel } from "@/lib/time";

/** "2 PM", "2:30pm", "14:00", "2:00 P.M." → minutes from midnight, or null. */
export function parseTime(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|nn|noon)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const suf = m[3];
  if (min > 59 || h > 23) return null;
  if (suf === "pm" && h < 12) h += 12;
  if (suf === "am" && h === 12) h = 0;
  if ((suf === "nn" || suf === "noon") && h !== 12) return null;
  if (!suf && h < 7) h += 12; // "3" in a salon context means 3 PM
  return h * 60 + min;
}

/** All clock times mentioned in free text (e.g. "1:00 PM", "2pm", "12 NN"). */
export function timesIn(text: string): number[] {
  const out: number[] = [];
  const re = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|nn)\b/gi;
  for (const m of text.matchAll(re)) {
    const t = parseTime(`${m[1]}${m[2] ? `:${m[2]}` : ""} ${m[3].replace(/\./g, "")}`);
    if (t !== null) out.push(t);
  }
  return out;
}

/** Peso amounts mentioned in text, in centavos. */
export function pesosIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(?:₱|php\s?|p(?=\d))\s?([\d,]+(?:\.\d{1,2})?)/gi)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(Math.round(n * 100));
  }
  return out;
}

const YES = /^(yes|yep|yeah|ya|yup|sure|ok|okay|okey|oo|opo|sige|go|go ahead|confirm|confirmed|book it|please do|please|correct|tama|g|game|yes please|yes po|sige po|oo po)\b/i;
const YES_ANYWHERE = /\b(yes|confirm|book it|go ahead|sige|that'?s (right|correct)|looks good|please (send|book))\b/i;
const NO = /\b(no|not yet|wait|hold on|change|cancel|wrong|mali|hindi|huwag|wag|instead|different|other time|another)\b/i;

/** Explicit agreement to the summary just shown. Negations and change requests win. */
export function isAffirmative(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 120) return false;
  if (NO.test(t)) return false;
  return YES.test(t) || YES_ANYWHERE.test(t);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[\d\s-]{7,20}$/;

/** Claims that an appointment is confirmed/booked/reserved. */
export function claimsConfirmed(text: string): boolean {
  return /\b(is|are|been|now|all) (confirmed|booked|reserved|set)\b|\byou'?re (all set|booked|confirmed)\b|\bconfirmed (your|the) (appointment|booking)\b/i.test(text);
}

export interface ReplyContext {
  /** Times the server has shown/validated for the current date (local minutes). */
  allowedMinutes: number[];
  /** Real service prices (centavos). */
  prices: number[];
  /** Opening/closing minutes mentioned by approved business hours (allowed in text). */
  hoursMinutes: number[];
  appointmentConfirmed: boolean;
}

/** Server-side check of a model reply. Returns a reason when the reply must not be sent. */
export function checkReply(text: string, ctx: ReplyContext): string | null {
  const allowed = new Set([...ctx.allowedMinutes, ...ctx.hoursMinutes]);
  const badTime = timesIn(text).find((t) => !allowed.has(t));
  if (badTime !== undefined) return `unverified time ${minuteLabel(badTime)}`;
  const badPrice = pesosIn(text).find((p) => !ctx.prices.includes(p));
  if (badPrice !== undefined) return `unknown price ${badPrice / 100}`;
  if (!ctx.appointmentConfirmed && claimsConfirmed(text)) return "claims confirmation";
  return null;
}

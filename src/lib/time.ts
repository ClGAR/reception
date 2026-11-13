// Timezone helpers. All timestamps are stored as UTC (timestamptz) and rendered in the business timezone.

/** Offset of `tz` from UTC in minutes at instant `at` (e.g. Asia/Manila = +480). */
export function tzOffsetMinutes(at: Date, tz: string): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** "2026-11-14" + minute-of-day in tz → UTC Date. */
export function localToUtc(date: string, minute: number, tz: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, 0, minute));
  const off = tzOffsetMinutes(guess, tz);
  const first = new Date(guess.getTime() - off * 60_000);
  const off2 = tzOffsetMinutes(first, tz);
  return off2 === off ? first : new Date(guess.getTime() - off2 * 60_000);
}

export function localParts(at: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minute: Number(p.hour) * 60 + Number(p.minute),
    weekday: weekdays.indexOf(p.weekday),
  };
}

export function todayIn(tz: string, now = new Date()): string {
  return localParts(now, tz).date;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && addDays(s, 0) === s;
}

export function fmtTime(at: Date, tz: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(at);
}

export function fmtDate(at: Date | string, tz: string, opts: Intl.DateTimeFormatOptions = {}) {
  const d = typeof at === "string" ? localToUtc(at, 12 * 60, tz) : at;
  return new Intl.DateTimeFormat("en-PH", { timeZone: tz, weekday: "short", month: "short", day: "numeric", ...opts }).format(d);
}

export function minuteLabel(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

/** "2 min ago", "1 hr ago", "Yesterday", "Nov 3". */
export function relative(at: Date, now = new Date()) {
  const s = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(at);
}

export function peso(centavos: number) {
  return `₱${(centavos / 100).toLocaleString("en-PH", { maximumFractionDigits: centavos % 100 ? 2 : 0 })}`;
}

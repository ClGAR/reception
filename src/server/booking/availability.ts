// Deterministic availability engine. Pure: no database access, so it is unit-tested directly.
import { addDays, localToUtc, todayIn, weekdayOf } from "@/lib/time";

export interface HoursRule {
  staffId: string | null;
  weekday: number;
  startMinute: number;
  endMinute: number;
}
export interface ExceptionRule {
  staffId: string | null;
  date: string;
  startMinute: number | null;
  endMinute: number | null;
}
export interface Busy {
  staffId: string;
  startsAt: Date;
  blockEndsAt: Date;
}
export interface SlotInput {
  date: string; // business-local YYYY-MM-DD
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  staffIds: string[]; // staff qualified for the service
  hours: HoursRule[];
  exceptions: ExceptionRule[];
  busy: Busy[];
  now: Date;
  leadTimeMinutes: number;
  maxDaysAhead: number;
  stepMinutes: number;
}
export interface Slot {
  startsAt: Date;
  endsAt: Date;
  blockEndsAt: Date;
  minute: number; // local minute of day
  staffIds: string[];
}

type Range = [number, number];

function subtract(ranges: Range[], cut: Range): Range[] {
  const out: Range[] = [];
  for (const [a, b] of ranges) {
    if (cut[1] <= a || cut[0] >= b) out.push([a, b]);
    else {
      if (cut[0] > a) out.push([a, cut[0]]);
      if (cut[1] < b) out.push([cut[1], b]);
    }
  }
  return out;
}

function intersect(a: Range[], b: Range[]): Range[] {
  const out: Range[] = [];
  for (const [a0, a1] of a)
    for (const [b0, b1] of b) {
      const s = Math.max(a0, b0);
      const e = Math.min(a1, b1);
      if (s < e) out.push([s, e]);
    }
  return out;
}

/** Local-minute windows when a staff member can work on `date`. */
export function staffWindows(staffId: string, input: Pick<SlotInput, "date" | "hours" | "exceptions">): Range[] {
  const wd = weekdayOf(input.date);
  const biz: Range[] = input.hours
    .filter((h) => h.staffId === null && h.weekday === wd)
    .map((h) => [h.startMinute, h.endMinute]);
  const ownRules = input.hours.filter((h) => h.staffId === staffId);
  const own: Range[] = ownRules.filter((h) => h.weekday === wd).map((h) => [h.startMinute, h.endMinute]);
  // Staff without their own schedule follow business hours.
  let windows = ownRules.length ? intersect(own, biz) : biz;
  for (const ex of input.exceptions) {
    if (ex.date !== input.date || (ex.staffId !== null && ex.staffId !== staffId)) continue;
    if (ex.startMinute == null || ex.endMinute == null) return [];
    windows = subtract(windows, [ex.startMinute, ex.endMinute]);
  }
  return windows;
}

export function computeSlots(input: SlotInput): Slot[] {
  const today = todayIn(input.timezone, input.now);
  if (input.date < today || input.date > addDays(today, input.maxDaysAhead)) return [];
  const earliest = input.now.getTime() + input.leadTimeMinutes * 60_000;
  const need = input.durationMinutes + input.bufferMinutes;
  const byMinute = new Map<number, string[]>();

  for (const staffId of input.staffIds) {
    const busy = input.busy.filter((b) => b.staffId === staffId);
    for (const [ws, we] of staffWindows(staffId, input)) {
      // align to step from window start
      for (let m = ws; m + input.durationMinutes <= we; m += input.stepMinutes) {
        const start = localToUtc(input.date, m, input.timezone);
        if (start.getTime() < earliest) continue;
        const blockEnd = new Date(start.getTime() + need * 60_000);
        const clash = busy.some((b) => start < b.blockEndsAt && b.startsAt < blockEnd);
        if (clash) continue;
        const list = byMinute.get(m) ?? [];
        list.push(staffId);
        byMinute.set(m, list);
      }
    }
  }

  return [...byMinute.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minute, staffIds]) => {
      const startsAt = localToUtc(input.date, minute, input.timezone);
      return {
        minute,
        staffIds,
        startsAt,
        endsAt: new Date(startsAt.getTime() + input.durationMinutes * 60_000),
        blockEndsAt: new Date(startsAt.getTime() + need * 60_000),
      };
    });
}

/** Legal appointment status transitions. */
export const transitions: Record<string, readonly string[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled", "completed", "no_show"],
  declined: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function canTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}

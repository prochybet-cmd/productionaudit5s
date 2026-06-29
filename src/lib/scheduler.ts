// Deterministic 5S audit planner.
// Defaults: 12 zones, 18 auditors. Constraints:
//  - every zone audited ≥1× per ISO week
//  - every auditor performs ≥1 audit per ISO week
//  - auditor never audits same zone twice in the month
//  - audits evenly distributed Mon–Fri
//
// Plan is deterministic per (year, month, zoneCount, auditorCount) so the
// same parameters always produce the same schedule.

export const DEFAULT_ZONES: string[] = [
  "L1 — 730B - svařovna",
  "L2 — XFK - svařovna",
  "L3 — Caddy5 op - svařovna",
  "L4 — PO416 / VLB - svařovna",
  "L5 — C5 PLATE, 730B MO, PPE 40R MO",
  "L6 — PPE 20C, 40L, XFK MO",
  "L7 — PPE 40L svařovna, KEB24 svařovna",
  "L8 — PPE 40R/20 - svařovna",
  "L9 — PPC 40R/20 - svařovna střed",
  "L10 — PPC 40R/20 - svařovna",
  "L11 — Před lakovnou",
  "L12 — Rework",
];

export const DEFAULT_AUDITORS: string[] = [
  "V Tykal (VTY)",
  "R Gabor (RGA)",
  "M Jardek (MJA)",
  "J Suja (JSU)",
  "J Jira (JJI)",
  "R Volf (RVO)",
  "M Nosian (MNO)",
  "L Mihali (LMI)",
  "K Genšorová (KGE)",
  "D Dakhno (DDA)",
  "R Kožurko (RKO)",
  "R Márkuš (RMA)",
  "M Modrá (MMO)",
  "S Ostaša (SOS)",
  "R Prytuliak (RPR)",
  "K Rajchl (KRA)",
  "Y Starynin (YST)",
  "K Lévai (KLE)",
];

// České státní svátky (rozšiřitelné)
export const HOLIDAYS: Record<string, string> = {
  "2026-01-01": "Nový rok",
  "2026-04-03": "Velký pátek",
  "2026-04-06": "Velikonoční pondělí",
  "2026-05-01": "Svátek práce",
  "2026-05-08": "Den vítězství",
  "2026-07-05": "Sv. Cyril a Metoděj",
  "2026-07-06": "Den upálení mistra Jana Husa",
  "2026-09-28": "Den české státnosti",
  "2026-10-28": "Den vzniku samostatného Československa",
  "2026-11-17": "Den boje za svobodu a demokracii",
  "2026-12-24": "Štědrý den",
  "2026-12-25": "1. svátek vánoční",
  "2026-12-26": "2. svátek vánoční",
};

export interface AuditAssignment {
  date: string;        // ISO yyyy-mm-dd
  weekday: string;     // Po, Út, …
  weekNumber: number;  // ISO week
  weekIndexInMonth: number; // 1-based, ordinal within the generated month
  zone: string;
  auditor: string;
}

const WEEKDAY_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoWeek(d: Date): number {
  // ISO week number per Mon-first convention
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function mondayOf(d: Date): Date {
  const out = new Date(d);
  const wd = out.getDay(); // 0=Sun..6=Sat
  const delta = (wd + 6) % 7; // days since Monday
  out.setDate(out.getDate() - delta);
  out.setHours(0, 0, 0, 0);
  return out;
}

function workdaysOfMonth(year: number, month: number): Date[] {
  // Return Mon–Fri for every ISO week that has AT LEAST ONE workday (Mon–Fri)
  // within `month` (0-based). All five workdays of such a week are returned,
  // even if some spill into the previous/next month.
  const out: Date[] = [];
  const seen = new Set<string>();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cursor = new Date(first);
  while (cursor <= last) {
    const monday = mondayOf(cursor);
    const key = fmtDate(monday);
    if (!seen.has(key)) {
      seen.add(key);
      const weekDays: Date[] = [];
      let hasWorkdayInMonth = false;
      for (let i = 0; i < 5; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        weekDays.push(day);
        if (day.getFullYear() === year && day.getMonth() === month) {
          hasWorkdayInMonth = true;
        }
      }
      if (hasWorkdayInMonth) out.push(...weekDays);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export interface PlanInput {
  year: number;
  month: number; // 0-based
  zones?: string[];
  auditors?: string[];
}

export interface MonthlyPlan {
  year: number;
  month: number;
  zones: string[];
  auditors: string[];
  assignments: AuditAssignment[];
  weeks: WeekBucket[];
}

export interface WeekBucket {
  weekNumber: number;
  weekIndexInMonth: number;
  start: string;
  end: string;
  days: DayBucket[];
}
export interface DayBucket {
  date: string;
  weekday: string;
  isHoliday: boolean;
  holidayName?: string;
  assignments: AuditAssignment[];
}

export function generatePlan(input: PlanInput): MonthlyPlan {
  const zones = input.zones ?? DEFAULT_ZONES;
  const auditors = input.auditors ?? DEFAULT_AUDITORS;
  const Z = zones.length;
  const A = auditors.length;

  const days = workdaysOfMonth(input.year, input.month);

  // Group workdays by ISO week, preserving order.
  const weekMap = new Map<number, Date[]>();
  for (const d of days) {
    const w = isoWeek(d);
    if (!weekMap.has(w)) weekMap.set(w, []);
    weekMap.get(w)!.push(d);
  }
  const orderedWeeks = Array.from(weekMap.entries()); // [weekNo, dates][]

  const assignments: AuditAssignment[] = [];
  // Track zones each auditor has already audited this month (rotation rule)
  const auditorHistory: Set<string>[] = auditors.map(() => new Set());

  orderedWeeks.forEach(([weekNo, dates], wIdx) => {
    // Build this week's assignment list of length max(Z, A):
    // 1) ensure each zone covered ≥1×
    // 2) ensure each auditor used ≥1×
    const count = Math.max(Z, A);

    // Auditors for this week — rotate by week index.
    const auditorOrder: number[] = [];
    for (let i = 0; i < count; i++) {
      auditorOrder.push((i + wIdx * 5) % A);
    }
    // Ensure every auditor appears at least once
    const seenA = new Set(auditorOrder);
    if (seenA.size < A) {
      // Fall back: explicit cover of all auditors first
      const explicit = Array.from({ length: A }, (_, i) => (i + wIdx) % A);
      auditorOrder.length = 0;
      auditorOrder.push(...explicit);
      // Pad with rotating extras up to count
      for (let i = A; i < count; i++) {
        auditorOrder.push((i + wIdx * 3) % A);
      }
    }

    // Zone order — rotate so every zone covered ≥1× and rotates across weeks
    const zoneOrder: number[] = [];
    for (let i = 0; i < count; i++) {
      zoneOrder.push((i + wIdx * 7) % Z);
    }
    // Ensure every zone covered
    const seenZ = new Set(zoneOrder.slice(0, Z));
    if (seenZ.size < Z) {
      for (let i = 0; i < Z; i++) zoneOrder[i] = (i + wIdx) % Z;
    }

    // Avoid auditor-repeats-same-zone-this-month: swap zones within week if conflict.
    for (let i = 0; i < count; i++) {
      const aIdx = auditorOrder[i];
      let zIdx = zoneOrder[i];
      if (auditorHistory[aIdx].has(zones[zIdx])) {
        // Try to find another slot in this week to swap with
        for (let j = 0; j < count; j++) {
          if (j === i) continue;
          const aJ = auditorOrder[j];
          const zJ = zoneOrder[j];
          if (
            !auditorHistory[aIdx].has(zones[zJ]) &&
            !auditorHistory[aJ].has(zones[zIdx])
          ) {
            zoneOrder[i] = zJ;
            zoneOrder[j] = zIdx;
            zIdx = zJ;
            break;
          }
        }
      }
      auditorHistory[aIdx].add(zones[zIdx]);
    }

    // Distribute assignments evenly across this week's workdays (Mon–Pá), holidays skipped.
    const workDates = dates.filter((d) => !HOLIDAYS[fmtDate(d)]);
    const dayCount = workDates.length || 1;
    const buckets: number[][] = workDates.map(() => []);
    for (let i = 0; i < count; i++) {
      buckets[i % dayCount].push(i);
    }

    workDates.forEach((date, di) => {
      for (const slot of buckets[di]) {
        assignments.push({
          date: fmtDate(date),
          weekday: WEEKDAY_SHORT[date.getDay()],
          weekNumber: weekNo,
          weekIndexInMonth: wIdx + 1,
          zone: zones[zoneOrder[slot]],
          auditor: auditors[auditorOrder[slot]],
        });
      }
    });
  });

  // Build week → day groupings
  const weeks: WeekBucket[] = orderedWeeks.map(([weekNo, dates], wIdx) => {
    const dayBuckets: DayBucket[] = dates.map((d) => {
      const iso = fmtDate(d);
      const holidayName = HOLIDAYS[iso];
      return {
        date: iso,
        weekday: WEEKDAY_SHORT[d.getDay()],
        isHoliday: Boolean(holidayName),
        holidayName,
        assignments: assignments.filter((a) => a.date === iso),
      };
    });
    return {
      weekNumber: weekNo,
      weekIndexInMonth: wIdx + 1,
      start: fmtDate(dates[0]),
      end: fmtDate(dates[dates.length - 1]),
      days: dayBuckets,
    };
  });

  return {
    year: input.year,
    month: input.month,
    zones,
    auditors,
    assignments,
    weeks,
  };
}

export const MONTH_NAMES_CS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

export const MONTH_SHORT_NAMES_CS = [
  "led", "úno", "bře", "dub", "kvě", "čer",
  "čvc", "srp", "zář", "říj", "lis", "pros",
];

export function formatDateCs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

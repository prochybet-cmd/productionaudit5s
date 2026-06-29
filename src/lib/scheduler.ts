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
  "Z01 — Lisovna A",
  "Z02 — Lisovna B",
  "Z03 — Svařovna 1",
  "Z04 — Svařovna 2",
  "Z05 — Svařovna 3",
  "Z06 — Robotická linka R1",
  "Z07 — Robotická linka R2",
  "Z08 — Montáž rámů",
  "Z09 — Lakovna",
  "Z10 — Sklad materiálu",
  "Z11 — Expedice",
  "Z12 — Údržba & nástrojárna",
];

export const DEFAULT_AUDITORS: string[] = [
  "Jan Novák",
  "Petr Svoboda",
  "Lucie Dvořáková",
  "Martin Procházka",
  "Tomáš Kučera",
  "Jana Veselá",
  "Pavel Horák",
  "Eva Marková",
  "Ondřej Pokorný",
  "Kateřina Nováková",
  "Michal Beneš",
  "Tereza Černá",
  "David Růžička",
  "Hana Konečná",
  "Filip Sedláček",
  "Markéta Urbanová",
  "Roman Doležal",
  "Veronika Krejčí",
];

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

function workdaysOfMonth(year: number, month: number): Date[] {
  // month is 0-based
  const out: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
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

    // Distribute assignments evenly across this week's workdays (Mon–Fri)
    const dayCount = dates.length || 1;
    const buckets: number[][] = dates.map(() => []);
    for (let i = 0; i < count; i++) {
      buckets[i % dayCount].push(i);
    }

    dates.forEach((date, di) => {
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
    const dayBuckets: DayBucket[] = dates.map((d) => ({
      date: fmtDate(d),
      weekday: WEEKDAY_SHORT[d.getDay()],
      assignments: assignments.filter(
        (a) => a.date === fmtDate(d),
      ),
    }));
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

export function formatDateCs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

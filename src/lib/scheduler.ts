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
  "L4 — PPE/C / VLB - svařovna",
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
  "P Škorupka (PSK)",
];

// Eligibility — supervizoři mohou všude, ostatní pouze do svých zón.
export const SUPERVISOR_CODES = ["VTY", "RGA", "MJA", "JSU", "JJI", "RVO"];
const Z1_CODES = ["KRA", "MMO", "KGE", "RPR", "LMI", "KLE"];
const Z2_CODES = ["YST", "RMA", "MNO"];
const Z3_CODES = ["PSK", "SOS", "DDA", "RKO"];

export type ZoneGroup = "Z1A" | "Z1B" | "Z2" | "Z3";
export const ALL_ZONE_GROUPS: ZoneGroup[] = ["Z1A", "Z1B", "Z2", "Z3"];

export interface AuditorInfo {
  name: string;
  supervisor: boolean;
  groups: ZoneGroup[];
}

function auditorCode(name: string): string {
  const m = name.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : name;
}

export function defaultInfoFor(name: string): AuditorInfo {
  const code = auditorCode(name);
  if (SUPERVISOR_CODES.includes(code))
    return { name, supervisor: true, groups: [...ALL_ZONE_GROUPS] };
  if (Z1_CODES.includes(code))
    return { name, supervisor: false, groups: ["Z1A", "Z1B"] };
  if (Z2_CODES.includes(code))
    return { name, supervisor: false, groups: ["Z2"] };
  if (Z3_CODES.includes(code))
    return { name, supervisor: false, groups: ["Z3"] };
  // Nový auditor — defaultně do všech zón, uživatel může upravit.
  return { name, supervisor: false, groups: [...ALL_ZONE_GROUPS] };
}

export const DEFAULT_AUDITOR_INFOS: AuditorInfo[] = DEFAULT_AUDITORS.map(defaultInfoFor);

export function zoneGroupOf(zone: string): ZoneGroup {
  const m = zone.match(/^L(\d+)/);
  const n = m ? parseInt(m[1], 10) : 0;
  if ([1, 2, 3, 4].includes(n)) return "Z2";
  if ([5, 6, 11, 12].includes(n)) return "Z3";
  if ([9, 10].includes(n)) return "Z1A";
  return "Z1B"; // L7, L8
}

export function isEligible(
  auditor: string,
  zone: string,
  infos?: AuditorInfo[],
): boolean {
  const g = zoneGroupOf(zone);
  const info = infos?.find((i) => i.name === auditor) ?? defaultInfoFor(auditor);
  return info.supervisor || info.groups.includes(g);
}



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
  auditorInfos?: AuditorInfo[];
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

function groupWorkdaysByIsoWeek(days: Date[]): Array<[number, Date[]]> {
  const weekMap = new Map<number, Date[]>();
  for (const d of days) {
    const w = isoWeek(d);
    if (!weekMap.has(w)) weekMap.set(w, []);
    weekMap.get(w)!.push(d);
  }
  return Array.from(weekMap.entries());
}

function canonicalMonthForWeek(dates: Date[]): { year: number; month: number } {
  // Shared boundary weeks are planned by the month containing Thursday.
  // This keeps the same ISO week identical when switching between months
  // (e.g. KW27 2026: 29.–30.6. belongs to the July plan).
  const thursday = new Date(dates[0]);
  thursday.setDate(thursday.getDate() + 3);
  return { year: thursday.getFullYear(), month: thursday.getMonth() };
}

function generateRawMonthPlan(input: PlanInput): MonthlyPlan {
  const zones = input.zones ?? DEFAULT_ZONES;
  const auditors = input.auditors ?? DEFAULT_AUDITORS;
  const auditorInfos = input.auditorInfos;
  const Z = zones.length;
  const A = auditors.length;

  const days = workdaysOfMonth(input.year, input.month);
  const orderedWeeks = groupWorkdaysByIsoWeek(days);

  const assignments: AuditAssignment[] = [];
  // Track zones each auditor has already audited this month (rotation rule)
  const auditorHistory: Set<string>[] = auditors.map(() => new Set());

  // Precompute eligible auditor indices per zone
  const eligibleByZone: number[][] = zones.map((z) =>
    auditors.map((_, i) => i).filter((i) => isEligible(auditors[i], z, auditorInfos)),
  );


  orderedWeeks.forEach(([weekNo, dates], wIdx) => {
    const weekSlots: { zone: number; auditor: number }[] = [];
    const usedAuditors = new Set<number>();

    // 1) Cover every zone exactly once with an eligible auditor.
    //    Prefer auditors who haven't audited this zone this month, then those
    //    not yet used this week, rotated by week index for variety.
    for (let zi = 0; zi < Z; zi++) {
      const zIdx = (zi + wIdx * 7) % Z;
      const eligible = eligibleByZone[zIdx];
      if (eligible.length === 0) continue;

      const notRepeated = eligible.filter(
        (i) => !auditorHistory[i].has(zones[zIdx]),
      );
      const pool1 = notRepeated.length ? notRepeated : eligible;
      const notUsedThisWeek = pool1.filter((i) => !usedAuditors.has(i));
      const pool2 = notUsedThisWeek.length ? notUsedThisWeek : pool1;

      const pick = pool2[(zi + wIdx * 3) % pool2.length];
      weekSlots.push({ zone: zIdx, auditor: pick });
      usedAuditors.add(pick);
      auditorHistory[pick].add(zones[zIdx]);
    }

    // 2) Ensure every auditor gets ≥1 audit this week — give unused
    //    auditors an extra slot in an eligible zone (preferably one they
    //    haven't done yet this month).
    for (let ai = 0; ai < A; ai++) {
      const aIdx = (ai + wIdx) % A;
      if (usedAuditors.has(aIdx)) continue;
      const eligibleZones = zones
        .map((_, i) => i)
        .filter((zi) => isEligible(auditors[aIdx], zones[zi], auditorInfos));
      if (eligibleZones.length === 0) continue;
      const fresh = eligibleZones.filter(
        (zi) => !auditorHistory[aIdx].has(zones[zi]),
      );
      const pool = fresh.length ? fresh : eligibleZones;
      const zIdx = pool[(ai + wIdx) % pool.length];
      weekSlots.push({ zone: zIdx, auditor: aIdx });
      usedAuditors.add(aIdx);
      auditorHistory[aIdx].add(zones[zIdx]);
    }

    // 3) Distribute slots evenly across this week's workdays (skip holidays).
    const workDates = dates.filter((d) => !HOLIDAYS[fmtDate(d)]);
    const dayCount = workDates.length || 1;
    const buckets: number[][] = workDates.map(() => []);
    weekSlots.forEach((_, i) => {
      buckets[i % dayCount].push(i);
    });

    workDates.forEach((date, di) => {
      for (const slot of buckets[di]) {
        const s = weekSlots[slot];
        assignments.push({
          date: fmtDate(date),
          weekday: WEEKDAY_SHORT[date.getDay()],
          weekNumber: weekNo,
          weekIndexInMonth: wIdx + 1,
          zone: zones[s.zone],
          auditor: auditors[s.auditor],
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

export function generatePlan(input: PlanInput): MonthlyPlan {
  const zones = input.zones ?? DEFAULT_ZONES;
  const auditors = input.auditors ?? DEFAULT_AUDITORS;
  const auditorInfos = input.auditorInfos;
  const days = workdaysOfMonth(input.year, input.month);
  const orderedWeeks = groupWorkdaysByIsoWeek(days);
  const rawPlanCache = new Map<string, MonthlyPlan>();

  const getRawPlan = (year: number, month: number) => {
    const key = `${year}-${month}`;
    const cached = rawPlanCache.get(key);
    if (cached) return cached;
    const generated = generateRawMonthPlan({ year, month, zones, auditors, auditorInfos });
    rawPlanCache.set(key, generated);
    return generated;
  };

  const assignments: AuditAssignment[] = [];
  const weeks: WeekBucket[] = orderedWeeks.map(([weekNo, dates], wIdx) => {
    const canonical = canonicalMonthForWeek(dates);
    const canonicalPlan = getRawPlan(canonical.year, canonical.month);
    const start = fmtDate(dates[0]);
    const end = fmtDate(dates[dates.length - 1]);
    const canonicalWeek = canonicalPlan.weeks.find(
      (week) => week.start === start && week.end === end,
    );
    const weekAssignments = (canonicalWeek?.days.flatMap((day) => day.assignments) ?? [])
      .map((assignment) => ({
        ...assignment,
        weekIndexInMonth: wIdx + 1,
      }));

    assignments.push(...weekAssignments);

    const dayBuckets: DayBucket[] = dates.map((d) => {
      const iso = fmtDate(d);
      const holidayName = HOLIDAYS[iso];
      return {
        date: iso,
        weekday: WEEKDAY_SHORT[d.getDay()],
        isHoliday: Boolean(holidayName),
        holidayName,
        assignments: weekAssignments.filter((a) => a.date === iso),
      };
    });

    return {
      weekNumber: weekNo,
      weekIndexInMonth: wIdx + 1,
      start,
      end,
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

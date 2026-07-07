import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  CalendarCheck2,
  Maximize2,
  Check,
  X,
  ClipboardCheck,
  FileSpreadsheet,
  BarChart3,
  Archive,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  MONTH_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";
import { useAuditorsStore } from "@/lib/auditors-store";
import { useZonesStore } from "@/lib/zones-store";
import { supabase } from "@/integrations/supabase/client";
import { useDepartment } from "@/lib/department-store";





export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Měsíční plán — 5S Audit Planner" },
      {
        name: "description",
        content:
          "Generovaný měsíční plán 5S auditů: 12 zón, 18 auditorů, rotace dvojic, rovnoměrné rozložení Po–Pá.",
      },
      { property: "og:title", content: "Měsíční plán 5S auditů" },
      {
        property: "og:description",
        content: "Plánovač auditů pro výrobu kovových konstrukcí autosedaček.",
      },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const { department } = useDepartment();
  if (department === "logistika") return <LogisticsHome />;
  return <VyrobaPlanner />;
}

function VyrobaPlanner() {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const { active: zones } = useZonesStore();
  const { all: allAuditors, active: auditors, activeInfos } = useAuditorsStore();

  const [expanded, setExpanded] = useState<string | null>(null);

  const plan = useMemo(
    () => generatePlan({ year, month, zones, auditors, auditorInfos: activeInfos }),
    [year, month, zones, auditors, activeInfos],
  );

  // Fetch audits covering the full span of visible weeks (weeks may spill across months).
  const rangeStart = plan.weeks[0]?.start ?? `${year}-01-01`;
  const rangeEnd = plan.weeks[plan.weeks.length - 1]?.end ?? `${year}-12-31`;
  const { data: completedAudits } = useQuery({
    queryKey: ["audits-for-plan", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("id, zone, auditor, audit_date, created_at")
        .eq("department", "vyroba")
        .gte("audit_date", rangeStart)
        .lte("audit_date", rangeEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; zone: string; auditor: string; audit_date: string; created_at: string }[];
    },
  });

  // Map weekNumber -> ("zone|auditor" -> archive audit id) audited in that week.
  const completedAuditByWeek = useMemo(() => {
    const map = new Map<number, Map<string, string>>();
    for (const w of plan.weeks) map.set(w.weekNumber, new Map());
    for (const a of completedAudits ?? []) {
      const w = plan.weeks.find((wk) => a.audit_date >= wk.start && a.audit_date <= wk.end);
      const key = `${a.zone}|${a.auditor}`;
      if (w && !map.get(w.weekNumber)!.has(key)) map.get(w.weekNumber)!.set(key, a.id);
    }
    return map;
  }, [completedAudits, plan.weeks]);

  const getCompletedAuditId = (weekNumber: number, zone: string, auditor: string) =>
    completedAuditByWeek.get(weekNumber)?.get(`${zone}|${auditor}`);


  const goto = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const totalAudits = plan.assignments.length;
  const auditorsUsed = new Set(plan.assignments.map((a) => a.auditor)).size;
  const zonesCovered = new Set(plan.assignments.map((a) => a.zone)).size;

  const currentWeek = plan.weeks.find((w) => w.days.some((d) => d.date === todayIso));
  const showTodayHighlight = Boolean(currentWeek);
  const visibleWeeks = showTodayHighlight
    ? plan.weeks.filter((w) => w.end >= todayIso)
    : plan.weeks;

  const completedCount = plan.assignments.filter((a) => {
    const w = plan.weeks.find((wk) => a.date >= wk.start && a.date <= wk.end);
    return w ? Boolean(getCompletedAuditId(w.weekNumber, a.zone, a.auditor)) : false;
  }).length;



  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Plán 5S auditů
          </div>
          <h1 className="font-display text-5xl text-ink mt-1">
            {MONTH_NAMES_CS[month]} {year}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Každá zóna ≥1× týdně, každý auditor ≥1 audit týdně, žádné opakování
            stejné dvojice v měsíci. Po–Pá, rovnoměrně.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goto(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth());
            }}
            className="font-mono uppercase"
          >
            Dnes
          </Button>
          <Button variant="outline" size="icon" onClick={() => goto(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>


      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={CalendarCheck2} label="Provedených auditů" value={`${completedCount}/${totalAudits}`} />
        <KpiCard icon={MapPin} label="Zón v plánu" value={`${zonesCovered}/${zones.length}`} />
        <KpiCard icon={Users} label="Auditorů nasazeno" value={`${auditorsUsed}/${allAuditors.length}`} />
        <KpiCard icon={CalendarCheck2} label="Pracovních týdnů" value={plan.weeks.length} />
      </section>

      {/* Weekly plan */}
      <section className="space-y-6">
        {visibleWeeks.map((w) => {
          const isCurrentWeek = showTodayHighlight && currentWeek?.weekNumber === w.weekNumber;
          return (
            <div
              key={w.weekNumber}
              className={`stamp bg-card overflow-hidden ${isCurrentWeek ? "ring-4 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between bg-secondary text-secondary-foreground px-4 py-2">
                <div className="font-display text-xl tracking-wider">
                  KW {w.weekNumber}
                </div>
                <div className="font-mono text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                  <span>{formatDateCs(w.start)} – {formatDateCs(w.end)} · {w.days.reduce((n, d) => n + d.assignments.length, 0)} auditů</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5">
                {w.days.map((d) => {
                  const isToday = d.date === todayIso;
                  const isHoliday = d.isHoliday;
                  return (
                    <div
                      key={d.date}
                      className={`border-l border-border first:border-l-0 border-t md:border-t-0 p-3 min-h-[140px] ${isToday ? "bg-primary/20 border-l-4 border-r-4 border-y-4 border-primary relative" : ""} ${isHoliday && !isToday ? "bg-muted/40" : ""}`}
                    >
                      <div className="flex items-baseline justify-between mb-2">
                        <div className="font-display text-lg flex items-center gap-2">
                          {d.weekday}
                          {isToday && (
                            <span className="font-mono text-[9px] uppercase tracking-wider bg-ink text-primary px-1.5 py-0.5">
                              Dnes
                            </span>
                          )}
                          {isHoliday && (
                            <span className="font-mono text-[9px] uppercase tracking-wider bg-destructive text-destructive-foreground px-1.5 py-0.5">
                              Svátek
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {formatDateCs(d.date)}
                        </div>
                      </div>
                      {isHoliday ? (
                        <div className="hazard-stripe h-full min-h-[80px] flex items-center justify-center">
                          <span className="bg-card px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-ink border border-ink">
                            {d.holidayName ?? "Státní svátek"} — nepracuje se
                          </span>
                        </div>
                      ) : (
                        <ul className="space-y-1.5">
                          {d.assignments.map((a, i) => {
                            const key = `${a.date}-${i}`;
                            const isExpanded = expanded === key;
                            const completedAuditId = getCompletedAuditId(w.weekNumber, a.zone, a.auditor);
                            const isCompleted = Boolean(completedAuditId);
                            const weekEnded = todayIso > w.end;
                            const isMissed = !isCompleted && weekEnded;
                            const [zoneCode, zoneName] = a.zone.includes(" — ")
                              ? a.zone.split(" — ")
                              : [a.zone, ""];
                            return (
                              <li
                                key={i}
                                onClick={isCompleted ? undefined : () => setExpanded(isExpanded ? null : key)}
                                className={`border-l-4 px-2 py-1.5 transition-all ${isCompleted ? "cursor-pointer hover:bg-emerald-500/15" : "cursor-pointer"} ${isToday ? "border-ink bg-primary/50" : "border-primary bg-accent/40"} ${isExpanded && !isCompleted ? "py-3" : ""}`}
                                title={isCompleted ? "Klikni pro otevření detailu auditu v archivu" : "Klikni pro zvětšení zóny"}
                              >
                                {isCompleted && completedAuditId ? (
                                  <Link
                                    to="/archive/$id"
                                    params={{ id: completedAuditId }}
                                    className="block -mx-2 -my-1.5 px-2 py-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
                                        {a.zone}
                                      </div>
                                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 text-white p-0.5" title="Otevřít audit v archivu">
                                        <Check className="h-3 w-3" />
                                      </span>
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                      {a.auditor}
                                    </div>
                                  </Link>
                                ) : isExpanded ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-display text-2xl tracking-wider text-ink leading-none">
                                        {zoneCode}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {isCompleted && (
                                          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5">
                                            <Check className="h-3 w-3" /> Auditován
                                          </span>
                                        )}
                                        {isMissed && (
                                          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5">
                                            <X className="h-3 w-3" /> Neproveden
                                          </span>
                                        )}
                                        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                                      </div>
                                    </div>
                                    {zoneName && (
                                      <div className="text-sm font-medium text-ink leading-tight">
                                        {zoneName}
                                      </div>
                                    )}
                                    <div className="text-xs font-medium text-muted-foreground pt-1">
                                      {a.auditor}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
                                        {a.zone}
                                      </div>
                                      {isCompleted && (
                                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 text-white p-0.5" title="Audit uložen v archivu (stejný týden)">
                                          <Check className="h-3 w-3" />
                                        </span>
                                      )}
                                      {isMissed && (
                                        <span className="inline-flex items-center justify-center rounded-full bg-red-600 text-white p-0.5" title="Audit neproveden v daném týdnu">
                                          <X className="h-3 w-3" />
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                      {a.auditor}
                                    </div>
                                  </>
                                )}
                              </li>
                            );
                          })}
                          {d.assignments.length === 0 && (
                            <li className="text-xs text-muted-foreground italic">—</li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="border-2 border-ink bg-secondary text-secondary-foreground p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl tracking-wider">
            Auditor? Najdi své audity.
          </div>
          <div className="font-mono text-xs uppercase tracking-wider text-primary mt-1">
            Zadej jméno → uvidíš den, zónu a týden
          </div>
        </div>
        <Button asChild variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/auditor">Otevřít vyhledávání</Link>
        </Button>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_#000]">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="font-display text-3xl mt-1">{value}</div>
    </div>
  );
}

function LogisticsHome() {
  const tiles = [
    { to: "/checklist", label: "Checklist", desc: "On-line vyplnění 5S auditu (25 položek)", icon: ClipboardCheck },
    { to: "/data-entry", label: "Zápis dat", desc: "Rychlý přepis papírového checklistu", icon: FileSpreadsheet },
    { to: "/evaluation", label: "Vyhodnocení", desc: "Grafy skóre, filtry, tisk A4", icon: BarChart3 },
    { to: "/archive", label: "Archiv", desc: "Všechny uložené audity logistiky", icon: Archive },
  ] as const;
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <section>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Oddělení
        </div>
        <h1 className="font-display text-5xl text-ink mt-1 flex items-center gap-3">
          <Truck className="h-10 w-10 text-primary" />
          Logistika · 5S audity
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Zóny 1/11 – 11/11. Pro logistiku není plánovač auditů — audity zaznamenávejte
          přímo v Checklistu nebo Zápisu dat. Uložené záznamy najdete v Archivu
          a v Vyhodnocení.
        </p>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="stamp bg-card p-6 hover:bg-accent/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center bg-primary text-primary-foreground border-2 border-ink shadow-[2px_2px_0_0_#000]">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-2xl tracking-wider">{t.label}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {t.desc}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}



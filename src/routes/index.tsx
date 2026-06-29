import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  CalendarCheck2,
  Maximize2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MONTH_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";
import { useAuditorsStore } from "@/lib/auditors-store";
import { useZonesStore } from "@/lib/zones-store";


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
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // Plánujeme celý červenec 2026 (KW27 obsahuje 29.–30. 6. jako součást července).
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6); // 0-based → červenec
  const { active: zones } = useZonesStore();
  const { active: auditors } = useAuditorsStore();
  const [expanded, setExpanded] = useState<string | null>(null);


  const plan = useMemo(
    () => generatePlan({ year, month, zones, auditors }),
    [year, month, zones, auditors],
  );

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
  // Skryj uplynulé týdny, pokud aktuální datum spadá do tohoto plánu.
  const visibleWeeks = showTodayHighlight
    ? plan.weeks.filter((w) => w.end >= todayIso)
    : plan.weeks;

  // Počítadlo provedených auditů = audity s datem před dneškem.
  const completedAudits = plan.assignments.filter((a) => a.date < todayIso).length;


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
        <KpiCard icon={CalendarCheck2} label="Provedených auditů" value={`${completedAudits}/${totalAudits}`} />
        <KpiCard icon={MapPin} label="Zón v plánu" value={`${zonesCovered}/${zones.length}`} />
        <KpiCard icon={Users} label="Auditorů nasazeno" value={`${auditorsUsed}/${auditors.length}`} />
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
                            const [zoneCode, zoneName] = a.zone.includes(" — ")
                              ? a.zone.split(" — ")
                              : [a.zone, ""];
                            return (
                              <li
                                key={i}
                                onClick={() => setExpanded(isExpanded ? null : key)}
                                className={`border-l-4 px-2 py-1.5 cursor-pointer transition-all ${isToday ? "border-ink bg-primary/50" : "border-primary bg-accent/40"} ${isExpanded ? "py-3" : ""}`}
                                title="Klikni pro zvětšení zóny"
                              >
                                {isExpanded ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-display text-2xl tracking-wider text-ink leading-none">
                                        {zoneCode}
                                      </span>
                                      <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
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
                                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
                                      {a.zone}
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


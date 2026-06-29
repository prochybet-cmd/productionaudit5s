import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, CalendarDays } from "lucide-react";
import {
  DEFAULT_ZONES,
  MONTH_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Zóny — 5S Audit Planner" },
      {
        name: "description",
        content:
          "Přehled všech 12 výrobních zón s plánovanými 5S audity v aktuálním měsíci.",
      },
      { property: "og:title", content: "Přehled zón — 5S audity" },
      { property: "og:description", content: "Pokrytí výrobních zón v měsíčním plánu." },
    ],
  }),
  component: ZonesPage,
});

function ZonesPage() {
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month] = useState(today.getMonth());
  const plan = useMemo(() => generatePlan({ year, month }), [year, month]);

  const byZone = useMemo(() => {
    const map = new Map<string, typeof plan.assignments>();
    for (const z of DEFAULT_ZONES) map.set(z, []);
    for (const a of plan.assignments) {
      if (!map.has(a.zone)) map.set(a.zone, []);
      map.get(a.zone)!.push(a);
    }
    return map;
  }, [plan]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Pokrytí zón
        </div>
        <h1 className="font-display text-5xl mt-1">
          Zóny · {MONTH_NAMES_CS[month]} {year}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Kolik auditů a od koho proběhne v každé zóně tento měsíc.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from(byZone.entries()).map(([zone, items]) => (
          <div key={zone} className="stamp bg-card overflow-hidden">
            <div className="bg-secondary text-secondary-foreground px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-display tracking-wider">{zone}</span>
              </div>
              <span className="font-mono text-xs text-primary">
                {items.length}×
              </span>
            </div>
            <ul className="divide-y divide-border">
              {items.map((a, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">{formatDateCs(a.date)}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {a.weekday}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{a.auditor}</div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted-foreground italic">
                  Nenaplánováno
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

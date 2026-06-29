import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, CalendarDays, Factory, Cog } from "lucide-react";
import {
  DEFAULT_ZONES,
  MONTH_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MACHINES, Z_GROUP_ORDER, LINE_ORDER, groupMachines } from "@/lib/machines";

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

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="bg-card border-2 border-ink rounded-none p-0 h-auto">
          <TabsTrigger
            value="plan"
            className="rounded-none border-r-2 border-ink px-5 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CalendarDays className="h-4 w-4 mr-2" /> Plán auditů
          </TabsTrigger>
          <TabsTrigger
            value="stroje"
            className="rounded-none px-5 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Factory className="h-4 w-4 mr-2" /> Stroje
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from(byZone.entries()).map(([zone, items]) => (
              <div key={zone} className="stamp bg-card overflow-hidden">
                <div className="bg-secondary text-secondary-foreground px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-display tracking-wider">{zone}</span>
                  </div>
                  <span className="font-mono text-xs text-primary">{items.length}×</span>
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
        </TabsContent>

        <TabsContent value="stroje" className="mt-6">
          <MachinesByZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MachinesByZone() {
  const grouped = useMemo(() => groupMachines(MACHINES), []);
  const zones = Z_GROUP_ORDER.filter((z) => grouped.has(z));
  const total = MACHINES.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        <span className="border-2 border-ink bg-card px-3 py-1">
          Celkem strojů: <strong className="text-ink">{total}</strong>
        </span>
        <span className="border-2 border-ink bg-card px-3 py-1">
          Zón: <strong className="text-ink">{zones.length}</strong>
        </span>
        <span className="border-2 border-ink bg-card px-3 py-1">
          Linek: <strong className="text-ink">{new Set(MACHINES.map((m) => m.line)).size}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {zones.map((zone) => {
          const byLine = grouped.get(zone)!;
          const lines = LINE_ORDER.filter((l) => byLine.has(l));
          const zoneTotal = Array.from(byLine.values()).reduce((s, r) => s + r.length, 0);
          return (
            <div key={zone} className="stamp bg-card overflow-hidden">
              <div className="bg-ink text-primary px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-display text-lg tracking-wider">{zone}</span>
                </div>
                <span className="font-mono text-xs">{zoneTotal} strojů</span>
              </div>
              <div className="divide-y divide-border">
                {lines.map((line) => {
                  const rows = byLine.get(line)!;
                  return (
                    <div key={line} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary text-primary-foreground font-display px-2 py-0.5 text-sm tracking-wider">
                            {line}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {rows.length} strojů
                          </span>
                        </div>
                      </div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="py-1 pr-2 w-1/2">Projekt</th>
                            <th className="py-1">Stroj</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i} className="border-b border-border/40 last:border-0">
                              <td className="py-1 pr-2">{r.project}</td>
                              <td className="py-1 font-mono text-xs flex items-center gap-1.5">
                                <Cog className="h-3 w-3 text-muted-foreground" />
                                {r.machine}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

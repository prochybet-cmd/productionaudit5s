import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, CalendarDays, Factory, Cog, Settings2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  MONTH_NAMES_CS,
  MONTH_SHORT_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MACHINES, Z_GROUP_ORDER, LINE_ORDER, groupMachines } from "@/lib/machines";
import { useZonesStore } from "@/lib/zones-store";
import { AdminLockSection } from "@/components/admin-gate";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Zóny — 5S Audit Planner" },
      {
        name: "description",
        content:
          "Přehled všech výrobních zón a strojů, plánované 5S audity a správa seznamu zón.",
      },
      { property: "og:title", content: "Přehled zón — 5S audity" },
      { property: "og:description", content: "Stroje a pokrytí výrobních zón." },
    ],
  }),
  component: ZonesPage,
});

function ZonesPage() {
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month] = useState(today.getMonth());
  const { active: zones } = useZonesStore();
  const plan = useMemo(
    () => generatePlan({ year, month, zones }),
    [year, month, zones],
  );

  const byZone = useMemo(() => {
    const map = new Map<string, typeof plan.assignments>();
    for (const z of zones) map.set(z, []);
    for (const a of plan.assignments) {
      if (!map.has(a.zone)) map.set(a.zone, []);
      map.get(a.zone)!.push(a);
    }
    return map;
  }, [plan, zones]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Pokrytí zón
        </div>
        <h1 className="font-display text-5xl mt-1">
          Zóny · stroje
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Stroje podle zón, plán auditů pro {MONTH_NAMES_CS[month]} {year} a správa seznamu zón.
        </p>
      </div>

      <Tabs defaultValue="stroje" className="w-full">
        <TabsList className="bg-card border-2 border-ink rounded-none p-0 h-auto">
          <TabsTrigger
            value="stroje"
            className="rounded-none border-r-2 border-ink px-5 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Factory className="h-4 w-4 mr-2" /> Stroje
          </TabsTrigger>
          <TabsTrigger
            value="plan"
            className="rounded-none border-r-2 border-ink px-5 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CalendarDays className="h-4 w-4 mr-2" /> Plán auditů
          </TabsTrigger>
          <TabsTrigger
            value="nastaveni"
            className="rounded-none px-5 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Settings2 className="h-4 w-4 mr-2" /> Nastavení
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stroje" className="mt-6">
          <MachinesByZone />
        </TabsContent>

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

        <TabsContent value="nastaveni" className="mt-6">
          <AdminLockSection
            title="Správa zón"
            description="Změny v seznamu zón (přidání, smazání, deaktivace) jsou chráněné heslem. Zadej heslo pro odemknutí úprav."
          >
            <ZonesSettings />
          </AdminLockSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ZonesSettings() {
  const { all, active, save } = useZonesStore();
  const [newZone, setNewZone] = useState("");

  const toggle = (name: string, checked: boolean) => {
    const next = checked
      ? [...active, name].filter((n, i, arr) => arr.indexOf(n) === i)
      : active.filter((n) => n !== name);
    save({ all, active: next });
  };

  const addZone = () => {
    const name = newZone.trim();
    if (!name || all.includes(name)) return;
    save({ all: [...all, name], active: [...active, name] });
    setNewZone("");
  };

  const removeZone = (name: string) => {
    save({ all: all.filter((n) => n !== name), active: active.filter((n) => n !== name) });
  };

  return (
    <section className="border-2 border-ink bg-card p-6 shadow-[6px_6px_0_0_#000] space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <h2 className="font-display text-2xl tracking-wider">Správa zón</h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {active.length}/{all.length} aktivních
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Odškrtni zónu — dočasně se vyjme z plánování. Tlačítkem koše ji úplně smažeš.
        Změny se ihned promítnou do karty <strong>Plán</strong>.
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {all.map((name) => {
          const checked = active.includes(name);
          return (
            <li
              key={name}
              className={`flex items-center justify-between gap-2 border-2 px-3 py-2 ${checked ? "border-ink bg-background" : "border-dashed border-muted-foreground/40 bg-muted/30 opacity-70"}`}
            >
              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(name, Boolean(v))}
                />
                <span className="font-mono text-sm">{name}</span>
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeZone(name)}
                title="Smazat zónu"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2 pt-2 border-t-2 border-dashed border-border">
        <Input
          placeholder='Nová zóna, např. "L 13 - nová linka"'
          value={newZone}
          onChange={(e) => setNewZone(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addZone();
          }}
          className="border-2 font-mono"
        />
        <Button onClick={addZone} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
          <Plus className="h-4 w-4" />
          Přidat
        </Button>
      </div>
    </section>
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

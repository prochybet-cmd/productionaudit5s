import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  CalendarCheck2,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DEFAULT_AUDITORS,
  DEFAULT_ZONES,
  MONTH_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";

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
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [zones, setZones] = useState<string[]>(DEFAULT_ZONES);
  const [auditors, setAuditors] = useState<string[]>(DEFAULT_AUDITORS);

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
  const todaysAudits = plan.assignments.filter((a) => a.date === todayIso);

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
          <ConfigDialog
            zones={zones}
            auditors={auditors}
            onSave={(z, a) => {
              setZones(z);
              setAuditors(a);
            }}
          />
        </div>
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={CalendarCheck2} label="Auditů celkem" value={totalAudits} />
        <KpiCard icon={MapPin} label="Zón v plánu" value={`${zonesCovered}/${zones.length}`} />
        <KpiCard icon={Users} label="Auditorů nasazeno" value={`${auditorsUsed}/${auditors.length}`} />
        <KpiCard icon={CalendarCheck2} label="Pracovních týdnů" value={plan.weeks.length} />
      </section>

      {/* Weekly plan */}
      <section className="space-y-6">
        {plan.weeks.map((w) => (
          <div key={w.weekNumber} className="stamp bg-card">
            <div className="flex items-center justify-between bg-secondary text-secondary-foreground px-4 py-2">
              <div className="font-display text-xl tracking-wider">
                Týden {w.weekIndexInMonth}
              </div>
              <div className="font-mono text-xs uppercase tracking-wider text-primary">
                KW {w.weekNumber} · {formatDateCs(w.start)} – {formatDateCs(w.end)} · {w.days.reduce((n, d) => n + d.assignments.length, 0)} auditů
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5">
              {w.days.map((d) => (
                <div
                  key={d.date}
                  className="border-l border-border first:border-l-0 border-t md:border-t-0 p-3 min-h-[140px]"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-display text-lg">{d.weekday}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {formatDateCs(d.date)}
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {d.assignments.map((a, i) => (
                      <li
                        key={i}
                        className="border-l-4 border-primary bg-accent/40 px-2 py-1.5"
                      >
                        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
                          {a.zone}
                        </div>
                        <div className="text-sm font-medium truncate">
                          {a.auditor}
                        </div>
                      </li>
                    ))}
                    {d.assignments.length === 0 && (
                      <li className="text-xs text-muted-foreground italic">—</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
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

function ConfigDialog({
  zones,
  auditors,
  onSave,
}: {
  zones: string[];
  auditors: string[];
  onSave: (z: string[], a: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [zonesText, setZonesText] = useState(zones.join("\n"));
  const [auditorsText, setAuditorsText] = useState(auditors.join("\n"));

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setZonesText(zones.join("\n"));
        setAuditorsText(auditors.join("\n"));
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Nastavení
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-2xl">
            Zóny a auditoři
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Zóny ({zonesText.split("\n").filter(Boolean).length})
            </Label>
            <textarea
              value={zonesText}
              onChange={(e) => setZonesText(e.target.value)}
              rows={14}
              className="w-full font-mono text-sm border-2 border-input p-2 bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Auditoři ({auditorsText.split("\n").filter(Boolean).length})
            </Label>
            <textarea
              value={auditorsText}
              onChange={(e) => setAuditorsText(e.target.value)}
              rows={14}
              className="w-full font-mono text-sm border-2 border-input p-2 bg-background"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Jedna položka na řádek. Aplikace přepočte plán okamžitě po uložení.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button
            onClick={() => {
              const z = zonesText.split("\n").map((s) => s.trim()).filter(Boolean);
              const a = auditorsText.split("\n").map((s) => s.trim()).filter(Boolean);
              if (z.length === 0 || a.length === 0) return;
              onSave(z, a);
              setOpen(false);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Uložit a přepočítat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

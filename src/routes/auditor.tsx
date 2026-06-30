import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MONTH_NAMES_CS,
  MONTH_SHORT_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";
import { useAuditorsStore } from "@/lib/auditors-store";
import { AdminLockSection } from "@/components/admin-gate";

export const Route = createFileRoute("/auditor")({
  head: () => ({
    meta: [
      { title: "Najít auditora — 5S Audit Planner" },
      {
        name: "description",
        content:
          "Zadej své jméno a uvidíš všechny své 5S audity v aktuálním měsíci: kdy a do jaké zóny.",
      },
      { property: "og:title", content: "Najít auditora" },
      { property: "og:description", content: "Vyhledávání plánu auditora podle jména." },
    ],
  }),
  component: AuditorPage,
});

function AuditorPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const { all, active, save } = useAuditorsStore();
  const [newName, setNewName] = useState("");

  const goto = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const plan = useMemo(
    () => generatePlan({ year, month, auditors: active }),
    [year, month, active],
  );

  const mine = useMemo(() => {
    if (!confirmed) return [];
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return plan.assignments.filter((a) => a.auditor === confirmed && a.date >= todayIso);
  }, [confirmed, plan, today]);

  const toggle = (name: string, checked: boolean) => {
    const next = checked
      ? [...active, name].filter((n, i, arr) => arr.indexOf(n) === i)
      : active.filter((n) => n !== name);
    save({ all, active: next });
  };

  const addAuditor = () => {
    const name = newName.trim();
    if (!name || all.includes(name)) return;
    save({ all: [...all, name], active: [...active, name] });
    setNewName("");
  };

  const removeAuditor = (name: string) => {
    save({ all: all.filter((n) => n !== name), active: active.filter((n) => n !== name) });
    if (confirmed === name) setConfirmed(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Auditor lookup
          </div>
          <h1 className="font-display text-5xl text-ink mt-1">Kam mám jít?</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vyber své jméno a zobrazí se ti následujících 5 naplánovaných 5S auditů: kdy a do jaké zóny.
          </p>
        </div>
      </div>

      <div className="border-2 border-ink bg-card p-6 shadow-[6px_6px_0_0_#000]">
        <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Jméno auditora
        </label>
        <div className="mt-2 flex gap-2">
          <Select
            value={confirmed ?? ""}
            onValueChange={(value) => {
              setConfirmed(value);
            }}
          >
            <SelectTrigger className="h-12 flex-1 border-2 text-base">
              <SelectValue placeholder="Vyber auditora" />
            </SelectTrigger>
            <SelectContent>
              {active.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {confirmed && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl tracking-wider">
              {confirmed} — {mine.length} {mine.length === 1 ? "audit" : mine.length < 5 ? "audity" : "auditů"}
            </h2>
            <Link
              to="/"
              className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              ← Celý plán
            </Link>
          </div>

          {mine.length === 0 ? (
            <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              V tomto měsíci nemá tento auditor žádné audity v plánu.
            </div>
          ) : (
            <ul className="space-y-3">
              {mine.map((a, i) => (
                <li
                  key={i}
                  className="stamp bg-card p-4 flex flex-wrap items-center gap-4 justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground px-3 py-2 text-center min-w-[64px]">
                      <div className="font-mono text-[10px] uppercase tracking-wider">
                        {a.weekday}
                      </div>
                      <div className="font-display text-2xl leading-none">
                        {a.date.split("-")[2]}
                      </div>
                      <div className="font-mono text-[10px]">
                        {MONTH_SHORT_NAMES_CS[Number(a.date.split("-")[1]) - 1]}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Zóna
                      </div>
                      <div className="font-medium text-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {a.zone}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      KW {a.weekNumber}
                    </div>
                    <div className="font-mono text-xs">
                      {formatDateCs(a.date)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Správa auditorů — chráněno heslem pro změny */}
      <AdminLockSection
        title="Správa auditorů"
        description='Změny v seznamu auditorů (přidání, smazání, deaktivace) jsou chráněné heslem. Zadej heslo pro odemknutí úprav.'
      >
        <section className="border-2 border-ink bg-card p-6 shadow-[6px_6px_0_0_#000] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h2 className="font-display text-2xl tracking-wider">Správa auditorů</h2>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {active.length}/{all.length} aktivních
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Odškrtni auditora (např. dlouhodobá nemoc) — vyjme se z plánování. Změny se ihned
            promítnou do karty <strong>Plán</strong>.
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
                    onClick={() => removeAuditor(name)}
                    title="Smazat auditora"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="flex gap-2 pt-2 border-t-2 border-dashed border-border">
            <Input
              placeholder='Nový auditor, např. "J Novák (JNO)"'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addAuditor();
              }}
              className="border-2 font-mono"
            />
            <Button onClick={addAuditor} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
              <Plus className="h-4 w-4" />
              Přidat
            </Button>
          </div>
        </section>
      </AdminLockSection>
    </div>
  );
}

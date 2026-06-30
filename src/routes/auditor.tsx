import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, RotateCcw, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

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
  ALL_ZONE_GROUPS,
  MONTH_SHORT_NAMES_CS,
  formatDateCs,
  generatePlan,
  type ZoneGroup,
} from "@/lib/scheduler";
import { useAuditorsStore, type AuditorRecord } from "@/lib/auditors-store";
import { AdminLockSection } from "@/components/admin-gate";

export const Route = createFileRoute("/auditor")({
  head: () => ({
    meta: [
      { title: "Najít auditora — 5S Audit Planner" },
      {
        name: "description",
        content:
          "Vyber své jméno a zobrazí se ti následujících 5 naplánovaných 5S auditů: kdy a do jaké zóny.",
      },
      { property: "og:title", content: "Najít auditora" },
      { property: "og:description", content: "Vyhledávání plánu auditora podle jména." },
    ],
  }),
  component: AuditorPage,
});

const GROUP_LABELS: Record<ZoneGroup, string> = {
  Z1A: "1A",
  Z1B: "1B",
  Z2: "2",
  Z3: "3",
};

function AuditorPage() {
  const [today] = useState(() => new Date());
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const { records, active, activeInfos, save } = useAuditorsStore();
  const [newName, setNewName] = useState("");

  const rollingAssignments = useMemo(() => {
    const out: ReturnType<typeof generatePlan>["assignments"] = [];
    const seenWeeks = new Set<string>();
    const startMonth = today.getMonth();
    const startYear = today.getFullYear();
    for (let i = 0; i < 4; i++) {
      const d = new Date(startYear, startMonth + i, 1);
      const plan = generatePlan({
        year: d.getFullYear(),
        month: d.getMonth(),
        auditors: active,
        auditorInfos: activeInfos,
      });
      for (const week of plan.weeks) {
        const weekKey = `${week.start}|${week.end}`;
        if (seenWeeks.has(weekKey)) continue;
        seenWeeks.add(weekKey);
        out.push(...week.days.flatMap((day) => day.assignments));
      }
    }
    return out;
  }, [active, activeInfos, today]);

  const todayIso = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    [today],
  );

  const mine = useMemo(() => {
    if (!confirmed) return [];
    return rollingAssignments
      .filter((a) => a.auditor === confirmed && a.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [confirmed, rollingAssignments, todayIso]);

  // Draft buffer — changes apply only on "Uložit".
  const [draft, setDraft] = useState<AuditorRecord[]>(records);
  useEffect(() => {
    setDraft(records);
  }, [records]);

  const recordsKey = (r: AuditorRecord[]) =>
    r.map((x) => `${x.name}|${x.active}|${x.supervisor}|${x.groups.slice().sort().join(",")}`).join("§");
  const isDirty = recordsKey(draft) !== recordsKey(records);

  const updateRecord = (name: string, patch: Partial<AuditorRecord>) => {
    setDraft((prev) => prev.map((r) => (r.name === name ? { ...r, ...patch } : r)));
  };

  const toggleGroup = (name: string, group: ZoneGroup, checked: boolean) => {
    setDraft((prev) =>
      prev.map((r) =>
        r.name === name
          ? {
              ...r,
              groups: checked
                ? Array.from(new Set([...r.groups, group]))
                : r.groups.filter((g) => g !== group),
            }
          : r,
      ),
    );
  };

  const addAuditor = () => {
    const name = newName.trim();
    if (!name || draft.some((r) => r.name === name)) return;
    setDraft((prev) => [
      ...prev,
      { name, active: true, supervisor: false, groups: [...ALL_ZONE_GROUPS] },
    ]);
    setNewName("");
  };

  const removeAuditor = (name: string) => {
    setDraft((prev) => prev.filter((r) => r.name !== name));
    if (confirmed === name) setConfirmed(null);
  };

  const handleSave = () => {
    save({ records: draft });
    toast.success("Nastavení auditorů uloženo");
  };

  const handleReset = () => setDraft(records);

  const activeCount = draft.filter((r) => r.active).length;

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
          <Select value={confirmed ?? ""} onValueChange={(value) => setConfirmed(value)}>
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
              Pro tohoto auditora nejsou naplánovány žádné nadcházející audity.
            </div>
          ) : (
            <ul className="space-y-3">
              {mine.map((a, i) => (
                <li key={i} className="stamp bg-card p-4 flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground px-3 py-2 text-center min-w-[64px]">
                      <div className="font-mono text-[10px] uppercase tracking-wider">{a.weekday}</div>
                      <div className="font-display text-2xl leading-none">{a.date.split("-")[2]}</div>
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
                    <div className="font-mono text-xs">{formatDateCs(a.date)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <AdminLockSection
        title="Správa auditorů"
        description="Změny v seznamu auditorů (přidání, smazání, deaktivace, nastavení zón) jsou chráněné heslem."
      >
        <section className="border-2 border-ink bg-card p-6 shadow-[6px_6px_0_0_#000] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h2 className="font-display text-2xl tracking-wider">Správa auditorů</h2>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {activeCount}/{draft.length} aktivních
              {isDirty && <span className="ml-2 text-primary">• neuložené změny</span>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            U každého auditora nastav, do kterých zón může být nasazen. <strong>SUP</strong> = supervizor
            (může auditovat všude). Změny se projeví <strong>až po kliknutí na Uložit</strong>.
          </p>

          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <div>Auditor</div>
            <div className="w-10 text-center">akt.</div>
            <div className="w-10 text-center">SUP</div>
            <div className="w-10 text-center">1A</div>
            <div className="w-10 text-center">1B</div>
            <div className="w-10 text-center">2</div>
            <div className="w-10 text-center">3</div>
            <div className="w-8" />
          </div>

          <ul className="space-y-2">
            {draft.map((r) => (
              <li
                key={r.name}
                className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] items-center gap-2 border-2 px-3 py-2 ${r.active ? "border-ink bg-background" : "border-dashed border-muted-foreground/40 bg-muted/30 opacity-70"}`}
              >
                <span className="font-mono text-sm truncate">{r.name}</span>
                <div className="w-10 flex justify-center">
                  <Checkbox
                    checked={r.active}
                    onCheckedChange={(v) => updateRecord(r.name, { active: Boolean(v) })}
                  />
                </div>
                <div className="w-10 flex justify-center">
                  <Checkbox
                    checked={r.supervisor}
                    onCheckedChange={(v) => updateRecord(r.name, { supervisor: Boolean(v) })}
                  />
                </div>
                {ALL_ZONE_GROUPS.map((g) => (
                  <div key={g} className="w-10 flex justify-center">
                    <Checkbox
                      checked={r.supervisor || r.groups.includes(g)}
                      disabled={r.supervisor}
                      onCheckedChange={(v) => toggleGroup(r.name, g, Boolean(v))}
                      title={GROUP_LABELS[g]}
                    />
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAuditor(r.name)}
                  title="Smazat auditora"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
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
            <Button onClick={addAuditor} variant="outline" className="gap-1 border-2">
              <Plus className="h-4 w-4" />
              Přidat
            </Button>
          </div>

          <div className="flex gap-2 pt-3 border-t-2 border-ink">
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 flex-1 h-11 font-display tracking-wider"
            >
              <Save className="h-4 w-4" />
              Uložit nastavení
            </Button>
            <Button
              onClick={handleReset}
              disabled={!isDirty}
              variant="outline"
              className="border-2 gap-2 h-11"
            >
              <RotateCcw className="h-4 w-4" />
              Zahodit
            </Button>
          </div>
        </section>
      </AdminLockSection>
    </div>
  );
}

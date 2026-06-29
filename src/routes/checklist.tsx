import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardCheck, Printer, RotateCcw, CheckCircle2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CHECKLIST,
  MAX_TOTAL,
  SCORE_OPTIONS,
  scoreLabel,
} from "@/lib/checklist";
import { DEFAULT_AUDITORS, DEFAULT_ZONES } from "@/lib/scheduler";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [
      { title: "5S Checklist — Audit Planner" },
      {
        name: "description",
        content:
          "Interaktivní 5S checklist pro audit ve výrobě: 25 položek (Seiri, Seiton, Seiso, Seiketsu, Shitsuke), skóre 0–5.",
      },
      { property: "og:title", content: "5S Checklist — záznam auditu" },
      {
        property: "og:description",
        content:
          "Vyplň 5S audit on-line: zóna, datum, auditor a 25 kontrolních otázek.",
      },
    ],
  }),
  component: ChecklistPage,
});

type Scores = Record<number, number | null>;

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ChecklistPage() {
  const navigate = useNavigate();
  const [zone, setZone] = useState<string>(DEFAULT_ZONES[0]);
  const [auditor, setAuditor] = useState<string>(DEFAULT_AUDITORS[0]);
  const [date, setDate] = useState<string>(todayIso());
  const [overallNote, setOverallNote] = useState<string>("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<Scores>(() => {
    const init: Scores = {};
    for (const cat of CHECKLIST) for (const it of cat.items) init[it.id] = null;
    return init;
  });

  const subtotals = useMemo(
    () =>
      CHECKLIST.map((cat) => {
        const sum = cat.items.reduce(
          (acc, it) => acc + (scores[it.id] ?? 0),
          0,
        );
        const filled = cat.items.every((it) => scores[it.id] !== null);
        return { key: cat.key, code: cat.code, cs: cat.cs, sum, filled, max: cat.items.length * 5 };
      }),
    [scores],
  );

  const total = subtotals.reduce((a, s) => a + s.sum, 0);
  const filledCount = Object.values(scores).filter((v) => v !== null).length;
  const completion = Math.round((filledCount / (5 * 5)) * 100);
  const totalPct = Math.round((total / MAX_TOTAL) * 100);
  const allFilled = filledCount === 25;

  const reset = () => {
    const init: Scores = {};
    for (const cat of CHECKLIST) for (const it of cat.items) init[it.id] = null;
    setScores(init);
    setNotes({});
    setOverallNote("");
  };

  const saveToArchive = async () => {
    if (!allFilled) {
      toast.error("Vyplňte všech 25 položek před uložením.");
      return;
    }
    setSaving(true);
    try {
      const { data: audit, error: e1 } = await supabase
        .from("audits")
        .insert({
          zone, auditor, audit_date: date,
          total_score: total, max_score: MAX_TOTAL,
          note: overallNote || null,
        })
        .select()
        .single();
      if (e1 || !audit) throw e1 ?? new Error("Insert failed");

      const rows = CHECKLIST.flatMap((cat) =>
        cat.items.map((it) => ({
          audit_id: audit.id,
          item_id: it.id,
          category: cat.key,
          score: scores[it.id] ?? 0,
          note: notes[it.id] || null,
        })),
      );
      const { error: e2 } = await supabase.from("audit_scores").insert(rows);
      if (e2) throw e2;

      toast.success("Audit byl uložen do archivu.");
      navigate({ to: "/archive" });
    } catch (err) {
      console.error(err);
      toast.error("Uložení selhalo. Zkuste to znovu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8 print:py-2">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Záznam auditu
          </div>
          <h1 className="font-display text-5xl text-ink mt-1 flex items-center gap-3">
            <ClipboardCheck className="h-10 w-10 text-primary" />
            5S Checklist
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            25 kontrolních položek v 5 kategoriích. Stupnice 0–5 (celá čísla).
            Vyplňte záhlaví, ohodnoťte každou otázku a uložte / vytiskněte.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Vyčistit
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Tisk / PDF
          </Button>
          <Button
            onClick={saveToArchive}
            disabled={saving || !allFilled}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Uložit do archivu
          </Button>
        </div>
      </section>

      {/* Header form */}
      <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000] grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Zóna</Label>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="w-full border-2 border-input bg-background px-3 py-2 font-mono text-sm"
          >
            {DEFAULT_ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Auditor</Label>
          <select
            value={auditor}
            onChange={(e) => setAuditor(e.target.value)}
            className="w-full border-2 border-input bg-background px-3 py-2 font-mono text-sm"
          >
            {DEFAULT_AUDITORS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Datum</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_#000]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Celkové skóre</div>
          <div className="font-display text-3xl mt-1">
            {scoreLabel(total)}<span className="text-muted-foreground text-xl">/{MAX_TOTAL}</span>
          </div>
          <div className="mt-2 h-2 w-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${totalPct}%` }} />
          </div>
        </div>
        <div className="border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_#000]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Vyplněno</div>
          <div className="font-display text-3xl mt-1">{filledCount}/25</div>
          <div className="mt-2 h-2 w-full bg-muted">
            <div className="h-full bg-secondary" style={{ width: `${completion}%` }} />
          </div>
        </div>
        <div className="border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_#000] md:col-span-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Mezisoučty kategorií</div>
          <div className="grid grid-cols-5 gap-1.5">
            {subtotals.map((s) => (
              <div key={s.key} className="text-center">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{s.cs}</div>
                <div className="font-display text-lg">{scoreLabel(s.sum)}<span className="text-muted-foreground text-xs">/{s.max}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {CHECKLIST.map((cat) => {
        const sub = subtotals.find((s) => s.key === cat.key)!;
        return (
          <section key={cat.key} className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
            <header className="flex items-center justify-between bg-secondary text-secondary-foreground px-5 py-3">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center text-ink font-display text-lg ${cat.color}`}>
                  {cat.code.charAt(0)}
                </div>
                <div>
                  <div className="font-display text-xl tracking-wider">{cat.code} — {cat.cs}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{cat.en}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Mezisoučet</div>
                <div className="font-display text-2xl flex items-center gap-2">
                  {sub.filled && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  {scoreLabel(sub.sum)}<span className="text-muted-foreground text-sm">/{sub.max}</span>
                </div>
              </div>
            </header>
            <ul className="divide-y divide-border">
              {cat.items.map((it) => {
                const v = scores[it.id];
                return (
                  <li key={it.id} className="p-4 grid grid-cols-1 md:grid-cols-[2.5rem_1fr_auto] gap-4 items-start">
                    <div className="font-display text-2xl text-muted-foreground">{it.id}</div>
                    <div>
                      <div className="font-medium text-sm">{it.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">{it.question}</div>
                      <Textarea
                        placeholder="Poznámka / důkaz (volitelné)"
                        value={notes[it.id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                        className="mt-2 text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-wrap md:flex-col gap-1 print:hidden">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Skóre</div>
                      <div className="flex flex-wrap gap-1">
                        {SCORE_OPTIONS.map((opt) => {
                          const active = v === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setScores((s) => ({ ...s, [it.id]: opt }))}
                              className={`min-w-[2.25rem] h-9 px-2 font-mono text-xs border-2 border-ink transition-colors ${active ? "bg-primary text-primary-foreground shadow-[2px_2px_0_0_#000]" : "bg-card hover:bg-accent/40"}`}
                              aria-label={`Skóre ${opt}`}
                            >
                              {opt.toString().replace(".", ",")}
                            </button>
                          );
                        })}
                      </div>
                      <div className="hidden md:block font-display text-2xl mt-1 text-center">
                        {scoreLabel(v)}<span className="text-muted-foreground text-xs">/5</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="border-2 border-ink bg-secondary text-secondary-foreground p-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="font-display text-xl tracking-wider">Podpisy</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mt-1">
            Auditor: {auditor} · Zóna: {zone} · Datum: {date}
          </div>
        </div>
        <div className="font-display text-2xl">
          Skóre {scoreLabel(total)}/{MAX_TOTAL} · {totalPct} %
        </div>
      </section>
    </div>
  );
}

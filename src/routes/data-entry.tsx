import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet, Save, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CHECKLIST, MAX_TOTAL, SCORE_LEGEND, scoreLabel } from "@/lib/checklist";
import { DEFAULT_AUDITORS, DEFAULT_ZONES } from "@/lib/scheduler";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/data-entry")({
  head: () => ({
    meta: [
      { title: "Zápis dat — 5S Audit" },
      {
        name: "description",
        content:
          "Rychlý přepis výsledků z papírového 5S checklistu do tabulky. Skóre 0–5 pro 25 položek, uloží se do archivu.",
      },
    ],
  }),
  component: DataEntryPage,
});

type Scores = Record<number, number | null>;

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function DataEntryPage() {
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

  const flat = useMemo(
    () => CHECKLIST.flatMap((cat) => cat.items.map((it) => ({ cat, it }))),
    [],
  );

  const subtotals = useMemo(
    () =>
      CHECKLIST.map((cat) => {
        const sum = cat.items.reduce((acc, it) => acc + (scores[it.id] ?? 0), 0);
        const filled = cat.items.every((it) => scores[it.id] !== null);
        return { key: cat.key, cs: cat.cs, code: cat.code, sum, filled, max: cat.items.length * 5 };
      }),
    [scores],
  );

  const total = subtotals.reduce((a, s) => a + s.sum, 0);
  const filledCount = Object.values(scores).filter((v) => v !== null).length;
  const allFilled = filledCount === 25;
  const totalPct = Math.round((total / MAX_TOTAL) * 100);

  const setScore = (id: number, raw: string) => {
    if (raw === "") return setScores((s) => ({ ...s, [id]: null }));
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 5) return;
    setScores((s) => ({ ...s, [id]: n }));
  };

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
          zone,
          auditor,
          audit_date: date,
          total_score: total,
          max_score: MAX_TOTAL,
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
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Přepis z papírového checklistu
          </div>
          <h1 className="font-display text-5xl text-ink mt-1 flex items-center gap-3">
            <FileSpreadsheet className="h-10 w-10 text-primary" />
            Zápis dat
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Rychlý formulář pro přepis bodů 0–5 z vytisklého auditu. Po uložení
            jdou data do stejného archivu i grafů jako on-line vyplněný checklist.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Vyčistit
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
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Datum auditu</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </section>

      {/* Quick legend */}
      <section className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
        <header className="bg-ink text-primary px-5 py-2 font-mono text-[10px] uppercase tracking-[0.3em]">
          Stupnice 0–5
        </header>
        <div className="grid grid-cols-3 md:grid-cols-6">
          {SCORE_LEGEND.map((s, i) => (
            <div key={s.value} className={`p-2 ${s.bg} ${s.fg} ${i > 0 ? "border-l-2 border-ink" : ""}`}>
              <div className="font-display text-xl leading-none">{s.value}</div>
              <div className="font-mono text-[9px] uppercase tracking-wider mt-1 opacity-90">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Data entry table */}
      <section className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="w-12 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">#</th>
              <th className="w-28 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Kategorie</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Otázka</th>
              <th className="w-24 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wider">Body (0–5)</th>
              <th className="w-64 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {flat.map(({ cat, it }, idx) => {
              const prev = idx > 0 ? flat[idx - 1].cat.key : null;
              const isNewCat = prev !== cat.key;
              const v = scores[it.id];
              const invalid = v === null;
              return (
                <tr
                  key={it.id}
                  className={`border-t border-border ${isNewCat ? "border-t-2 border-t-ink" : ""}`}
                >
                  <td className="px-3 py-2 font-display text-lg text-muted-foreground align-top">{it.id}</td>
                  <td className="px-3 py-2 align-top">
                    {isNewCat ? (
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-3 w-3 ${cat.color} border border-ink`} />
                        <span className="font-mono text-[10px] uppercase tracking-wider">{cat.code}</span>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-sm">{it.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{it.question}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={5}
                      step={1}
                      value={v ?? ""}
                      onChange={(e) => setScore(it.id, e.target.value)}
                      className={`h-10 text-center font-display text-xl border-2 ${invalid ? "border-input" : "border-ink"}`}
                      placeholder="–"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Input
                      value={notes[it.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                      placeholder="volitelné"
                      className="h-10 text-sm"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/40">
            <tr className="border-t-2 border-ink">
              <td colSpan={2} className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider">
                Mezisoučty
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-3">
                  {subtotals.map((s) => (
                    <div key={s.key} className="font-mono text-xs">
                      <span className="text-muted-foreground">{s.cs}: </span>
                      <span className="font-display text-base">
                        {scoreLabel(s.sum)}<span className="text-muted-foreground">/{s.max}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-3 py-3 text-center font-display text-2xl">
                {scoreLabel(total)}<span className="text-muted-foreground text-sm">/{MAX_TOTAL}</span>
                <div className="text-xs text-muted-foreground font-mono">{totalPct} %</div>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                Vyplněno {filledCount}/25
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000] space-y-2">
        <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Celková poznámka k auditu (volitelné)</Label>
        <Textarea
          value={overallNote}
          onChange={(e) => setOverallNote(e.target.value)}
          rows={3}
          placeholder="Souhrnné připomínky, opatření, follow-up..."
        />
      </section>

      <section className="border-2 border-ink bg-secondary text-secondary-foreground p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display text-xl tracking-wider">Připraveno k uložení</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mt-1">
            Auditor: {auditor} · Zóna: {zone} · Datum: {date}
          </div>
        </div>
        <Button
          onClick={saveToArchive}
          disabled={saving || !allFilled}
          size="lg"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Uložit do archivu ({scoreLabel(total)}/{MAX_TOTAL})
        </Button>
      </section>
    </div>
  );
}

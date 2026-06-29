import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Loader2, Filter } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST } from "@/lib/checklist";
import { DEFAULT_AUDITORS, DEFAULT_ZONES } from "@/lib/scheduler";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Vyhodnocení 5S — pavučinové grafy" },
      { name: "description", content: "Souhrnné vyhodnocení 5S auditů: radar grafy podle zón, auditorů a měsíců s filtry." },
    ],
  }),
  component: EvaluationPage,
});

const CATEGORIES = CHECKLIST.map((c) => ({ key: c.key, code: c.code, cs: c.cs, max: c.items.length * 5 }));
const RADAR_COLORS = ["hsl(48 98% 52%)", "hsl(28 95% 55%)", "hsl(200 80% 50%)", "hsl(340 75% 55%)", "hsl(150 60% 45%)", "hsl(270 70% 60%)"];

type GroupBy = "zone" | "auditor" | "month";

function EvaluationPage() {
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [auditorFilter, setAuditorFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupBy>("zone");

  const { data, isLoading } = useQuery({
    queryKey: ["evaluation"],
    queryFn: async () => {
      const [a, s] = await Promise.all([
        supabase.from("audits").select("*"),
        supabase.from("audit_scores").select("*"),
      ]);
      if (a.error) throw a.error;
      if (s.error) throw s.error;
      return { audits: a.data, scores: s.data };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    let audits = data.audits;
    if (zoneFilter) audits = audits.filter((a) => a.zone === zoneFilter);
    if (auditorFilter) audits = audits.filter((a) => a.auditor === auditorFilter);
    if (monthFilter) audits = audits.filter((a) => a.audit_date.startsWith(monthFilter));
    const auditIds = new Set(audits.map((a) => a.id));
    const scores = data.scores.filter((s) => auditIds.has(s.audit_id));
    return { audits, scores };
  }, [data, zoneFilter, auditorFilter, monthFilter]);

  // Group audits by zone/auditor/month and compute % per category for radar
  const radarData = useMemo(() => {
    if (!filtered) return { series: [] as string[], data: [] };
    const auditMap = new Map(filtered.audits.map((a) => [a.id, a]));
    const groups = new Map<string, { sumByCat: Record<string, number>; countByCat: Record<string, number> }>();

    for (const s of filtered.scores) {
      const a = auditMap.get(s.audit_id);
      if (!a) continue;
      const key =
        groupBy === "zone" ? a.zone :
        groupBy === "auditor" ? a.auditor :
        a.audit_date.slice(0, 7);
      if (!groups.has(key)) {
        groups.set(key, { sumByCat: {}, countByCat: {} });
      }
      const g = groups.get(key)!;
      g.sumByCat[s.category] = (g.sumByCat[s.category] ?? 0) + s.score;
      g.countByCat[s.category] = (g.countByCat[s.category] ?? 0) + 1;
    }

    const series = Array.from(groups.keys()).sort();
    const chartData = CATEGORIES.map((c) => {
      const row: Record<string, string | number> = { category: `${c.code}` };
      for (const key of series) {
        const g = groups.get(key)!;
        const sum = g.sumByCat[c.key] ?? 0;
        const cnt = g.countByCat[c.key] ?? 0;
        // průměrné skóre na položku → procenta z 5
        row[key] = cnt > 0 ? Math.round((sum / cnt / 5) * 100) : 0;
      }
      return row;
    });
    return { series, data: chartData };
  }, [filtered, groupBy]);

  const trendData = useMemo(() => {
    if (!filtered) return [];
    const byMonth = new Map<string, { sum: number; max: number }>();
    for (const a of filtered.audits) {
      const m = a.audit_date.slice(0, 7);
      const cur = byMonth.get(m) ?? { sum: 0, max: 0 };
      cur.sum += Number(a.total_score);
      cur.max += a.max_score;
      byMonth.set(m, cur);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, pct: v.max > 0 ? Math.round((v.sum / v.max) * 100) : 0 }));
  }, [filtered]);

  const months = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.audits.map((a) => a.audit_date.slice(0, 7)))).sort();
  }, [data]);

  const totalAudits = filtered?.audits.length ?? 0;
  const avgPct = filtered && filtered.audits.length > 0
    ? Math.round(filtered.audits.reduce((acc, a) => acc + (Number(a.total_score) / a.max_score), 0) / filtered.audits.length * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <section>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Souhrn
        </div>
        <h1 className="font-display text-5xl text-ink mt-1 flex items-center gap-3">
          <BarChart3 className="h-10 w-10 text-primary" />
          Vyhodnocení 5S auditů
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Pavučinové grafy průměrného skóre v 5 kategoriích Seiri / Seiton / Seiso / Seiketsu / Shitsuke. Filtruj podle zóny, auditora, měsíce a vyber, jak data seskupit.
        </p>
      </section>

      {/* Filters */}
      <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000] grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1">
            <Filter className="h-3 w-3" /> Zóna
          </Label>
          <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-full border-2 border-input bg-background px-3 py-2 font-mono text-sm">
            <option value="">Všechny zóny</option>
            {DEFAULT_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Auditor</Label>
          <select value={auditorFilter} onChange={(e) => setAuditorFilter(e.target.value)} className="w-full border-2 border-input bg-background px-3 py-2 font-mono text-sm">
            <option value="">Všichni auditoři</option>
            {DEFAULT_AUDITORS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Měsíc</Label>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full border-2 border-input bg-background px-3 py-2 font-mono text-sm">
            <option value="">Všechny měsíce</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Porovnat dle</Label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="w-full border-2 border-input bg-background px-3 py-2 font-mono text-sm">
            <option value="zone">Zóny</option>
            <option value="auditor">Auditora</option>
            <option value="month">Měsíce</option>
          </select>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_#000]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Počet auditů</div>
          <div className="font-display text-3xl mt-1">{totalAudits}</div>
        </div>
        <div className="border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_#000]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Průměrné skóre</div>
          <div className="font-display text-3xl mt-1">{avgPct} %</div>
        </div>
        <div className="border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_#000]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Skupin v grafu</div>
          <div className="font-display text-3xl mt-1">{radarData.series.length}</div>
        </div>
      </section>

      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Načítám…
        </div>
      ) : totalAudits === 0 ? (
        <div className="border-2 border-ink bg-card p-10 shadow-[3px_3px_0_0_#000] text-center text-muted-foreground">
          Pro zvolené filtry nejsou žádná data. Vyplňte audit v sekci Checklist.
        </div>
      ) : (
        <>
          <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000]">
            <div className="font-display text-2xl tracking-wider mb-2">
              Pavučinový graf — {groupBy === "zone" ? "podle zón" : groupBy === "auditor" ? "podle auditorů" : "podle měsíců"}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
              Průměr % v 5 kategoriích · škála 0–100
            </div>
            <div className="h-[480px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData.data} outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fontFamily: "monospace" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {radarData.series.map((key, i) => (
                    <Radar
                      key={key}
                      name={key}
                      dataKey={key}
                      stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fillOpacity={radarData.series.length === 1 ? 0.35 : 0.15}
                    />
                  ))}
                  <Tooltip />
                  <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000]">
            <div className="font-display text-2xl tracking-wider mb-2">Trend skóre v čase</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
              Průměrné % za měsíc (po aplikaci filtrů)
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "monospace" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Tooltip />
                  <Bar dataKey="pct" fill="hsl(48 98% 52%)" stroke="#000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

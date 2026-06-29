import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Loader2, Filter, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST } from "@/lib/checklist";
import { DEFAULT_AUDITORS } from "@/lib/scheduler";

// Mapping of Z-groups (reporting zones) to underlying L-zones (audit zones)
const Z_GROUPS: Record<string, string[]> = {
  Z1A: ["L9", "L10"],
  Z1B: ["L7", "L8"],
  Z2: ["L1", "L2", "L3", "L4"],
  Z3: ["L5", "L6", "L11", "L12"],
};
const Z_GROUP_KEYS = Object.keys(Z_GROUPS);
// Map L-zone -> Z-group. Zone names in DB start with "L1 — ...", "L9 — ..." etc.
function lZoneCode(zoneName: string): string | null {
  const m = zoneName.match(/^(L\d{1,2})/);
  return m ? m[1] : null;
}
function zoneToGroup(zoneName: string): string | null {
  const code = lZoneCode(zoneName);
  if (!code) return null;
  for (const [g, list] of Object.entries(Z_GROUPS)) {
    if (list.includes(code)) return g;
  }
  return null;
}

const CZECH_MONTHS = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];

function formatPeriodLabel(monthFilter: string): string {
  if (!monthFilter) return "VŠECHNA OBDOBÍ";
  const [year, month] = monthFilter.split("-");
  const name = CZECH_MONTHS[Number(month) - 1] ?? monthFilter;
  return `${name} ${year}`;
}

function formatZoneLabel(zoneFilter: string): string {
  if (!zoneFilter) return "VŠECHNY ZÓNY";
  return `ZÓNA ${zoneFilter.replace(/^Z/, "")}`;
}

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




function EvaluationPage() {
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [auditorFilter, setAuditorFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  

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
    if (zoneFilter) audits = audits.filter((a) => zoneToGroup(a.zone) === zoneFilter);
    if (auditorFilter) audits = audits.filter((a) => a.auditor === auditorFilter);
    if (monthFilter) audits = audits.filter((a) => a.audit_date.startsWith(monthFilter));
    const auditIds = new Set(audits.map((a) => a.id));
    const scores = data.scores.filter((s) => auditIds.has(s.audit_id));
    return { audits, scores };
  }, [data, zoneFilter, auditorFilter, monthFilter]);

  // Single aggregated series — always one black line driven by current filters
  const radarData = useMemo(() => {
    if (!filtered) return { series: [] as string[], data: [] };
    const sumByCat: Record<string, number> = {};
    const cntByCat: Record<string, number> = {};
    for (const s of filtered.scores) {
      sumByCat[s.category] = (sumByCat[s.category] ?? 0) + s.score;
      cntByCat[s.category] = (cntByCat[s.category] ?? 0) + 1;
    }
    const SERIES_KEY = "Celkem";
    const chartData = CATEGORIES.map((c) => {
      const sum = sumByCat[c.key] ?? 0;
      const cnt = cntByCat[c.key] ?? 0;
      return {
        category: c.cs,
        band5: 5, band4: 4, band3: 3, band2: 2, band1: 1,
        [SERIES_KEY]: cnt > 0 ? Number((sum / cnt).toFixed(2)) : 0,
      };
    });
    return { series: [SERIES_KEY], data: chartData };
  }, [filtered]);


  // Per-checklist breakdown — souhrn za všechny audity ve filtru.
  // Max = 25 b/sekce × počet auditů; Získané = součet všech bodů v sekci.
  const breakdown = useMemo(() => {
    if (!filtered) return [];
    const auditCount = filtered.audits.length;
    return CATEGORIES.map((c) => {
      const maxScore = c.max * auditCount; // 25 b × počet auditů
      const scoresInCat = filtered.scores.filter((s) => s.category === c.key);
      const gained = scoresInCat.reduce((acc, s) => acc + s.score, 0);
      const avg = scoresInCat.length > 0 ? gained / scoresInCat.length : 0; // 0–5 na položku
      const pct = maxScore > 0 ? Math.round((gained / maxScore) * 100) : 0;
      return { cs: c.cs, maxScore, gained, avg, pct };
    });
  }, [filtered]);



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

  const printMeta = (() => {
    const z = formatZoneLabel(zoneFilter);
    const m = formatPeriodLabel(monthFilter);
    if (zoneFilter && monthFilter) return `${z}, ${m}`;
    if (zoneFilter) return z;
    if (monthFilter) return m;
    return `${z}, ${m}`;
  })();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* A4 print stylesheet — hides everything except the radar panel */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 6mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .print-radar, .print-radar * { visibility: visible !important; }
          .no-print { display: none !important; }
          /* Force browsers to print background colors (legend bands, breakdown headers) */
          .print-radar, .print-radar * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-radar {
            position: fixed !important;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 5mm !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: #fff !important;
            overflow: hidden !important;
            page-break-inside: avoid;
          }
          .print-radar .print-grid {
            display: grid !important;
            grid-template-columns: 1fr 70mm !important;
            gap: 3mm !important;
            align-items: stretch !important;
          }
          .print-radar .print-radar-chart { height: 185mm !important; width: 100% !important; }
          .print-radar .print-legend { margin-top: 3mm !important; }
          .print-radar .recharts-wrapper,
          .print-radar .recharts-surface { overflow: visible !important; }
          /* Highlight total score block */
          .print-radar .print-total {
            border-width: 3px !important;
          }
          .print-radar .print-total .print-total-title { font-size: 13px !important; padding: 3px 0 !important; }
          .print-radar .print-total .print-total-row { font-size: 13px !important; }
          .print-radar .print-total .print-total-result { font-size: 18px !important; font-weight: 900 !important; }
        }
      `}</style>

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
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
        </div>
        <Button onClick={() => window.print()} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 no-print">
          <Printer className="h-4 w-4" /> Tisk grafu (A4)
        </Button>
      </section>

      {/* Filters */}
      <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000] grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1">
            <Filter className="h-3 w-3" /> Zóna (Z)
          </Label>
          <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-full border-2 border-input bg-background px-3 py-2 font-mono text-sm">
            <option value="">Všechny zóny</option>
            {Z_GROUP_KEYS.map((z) => (
              <option key={z} value={z}>{z} ({Z_GROUPS[z].join(", ")})</option>
            ))}
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
          <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000] print-radar">
            {/* Print-only header: zone + period */}
            <div className="hidden print:flex print:justify-between print:items-end print:mb-3 print:pb-2 print:border-b-2 print:border-ink">
              <div className="font-display text-3xl tracking-wider">VYHODNOCENÍ 5S</div>
              <div className="font-mono text-sm font-bold uppercase tracking-wider">{printMeta}</div>
            </div>

            <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
              <div className="font-display text-2xl tracking-wider">
                Pavučinový graf 5S
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                celkové průměrné skóre · škála 0–5
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start print-grid">
              {/* Radar */}
              <div className="h-[620px] w-full print-radar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData.data} outerRadius="92%" margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#000" strokeOpacity={0.35} />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, fill: "#000" }}
                    />
                    {/* Background colored bands: outermost first so inner colors overlay */}
                    <Radar dataKey="band5" stroke="#000" strokeOpacity={0.4} fill="#2196f3" fillOpacity={1} isAnimationActive={false} legendType="none" />
                    <Radar dataKey="band4" stroke="#000" strokeOpacity={0.4} fill="#8bc34a" fillOpacity={1} isAnimationActive={false} legendType="none" />
                    <Radar dataKey="band3" stroke="#000" strokeOpacity={0.4} fill="#ffeb3b" fillOpacity={1} isAnimationActive={false} legendType="none" />
                    <Radar dataKey="band2" stroke="#000" strokeOpacity={0.4} fill="#ff9800" fillOpacity={1} isAnimationActive={false} legendType="none" />
                    <Radar dataKey="band1" stroke="#000" strokeOpacity={0.4} fill="#f44336" fillOpacity={1} isAnimationActive={false} legendType="none" />
                    {/* 0–5 scale ticks rendered after bands so labels stay visible */}
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 5]}
                      tickCount={6}
                      stroke="#000"
                      tick={(props: { x: number; y: number; payload: { value: number } }) => (
                        <g>
                          <rect x={props.x - 8} y={props.y - 7} width={16} height={14} fill="#fff" stroke="#000" strokeWidth={1} />
                          <text x={props.x} y={props.y} dy={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#000">
                            {props.payload.value}
                          </text>
                        </g>
                      )}
                    />

                    {/* Real data on top */}
                    {radarData.series.map((key, i) => (
                      <Radar
                        key={key}
                        name={key}
                        dataKey={key}
                        stroke={radarData.series.length === 1 ? "#000" : RADAR_COLORS[i % RADAR_COLORS.length]}
                        strokeWidth={radarData.series.length === 1 ? 3 : 2.5}
                        fill="transparent"
                        fillOpacity={0}
                        isAnimationActive={false}
                      />
                    ))}
                    <Tooltip
                      contentStyle={{ fontFamily: "monospace", fontSize: 12, border: "2px solid #000" }}
                      formatter={(v: number, name: string) =>
                        typeof name === "string" && name.startsWith("band") ? [null, null] : [v, name]
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }}
                      payload={radarData.series.map((key, i) => ({
                        value: key,
                        type: "line",
                        color: radarData.series.length === 1 ? "#000" : RADAR_COLORS[i % RADAR_COLORS.length],
                      }))}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Side breakdown panel */}
              <div className="space-y-2">
                {breakdown.map((b) => (
                  <div key={b.cs} className="border-2 border-ink">
                    <div className="bg-primary text-ink text-center font-mono text-xs font-bold py-1 border-b-2 border-ink">
                      {b.cs}
                    </div>
                    <div className="grid grid-cols-2 text-[11px] font-mono">
                      <div className="px-2 py-0.5 border-b border-ink/30">Maximální skóre</div>
                      <div className="px-2 py-0.5 border-b border-ink/30 text-right">{b.maxScore}</div>
                      <div className="px-2 py-0.5 border-b border-ink/30">Získané skóre</div>
                      <div className="px-2 py-0.5 border-b border-ink/30 text-right">{b.gained}</div>
                      <div className="px-2 py-0.5 border-b border-ink/30">Hodnocení (Ø)</div>
                      <div className="px-2 py-0.5 border-b border-ink/30 text-right">{b.avg.toFixed(1)}</div>
                      <div className="px-2 py-0.5 font-bold">Výsledek</div>
                      <div className="px-2 py-0.5 text-right font-bold">{b.pct} %</div>
                    </div>
                  </div>
                ))}
                <div className="border-2 border-ink bg-ink text-white print-total mt-1">
                  <div className="text-center font-mono text-sm font-extrabold py-1.5 border-b-2 border-white/40 tracking-wider print-total-title">
                    CELKOVÉ SKÓRE
                  </div>
                  <div className="grid grid-cols-2 text-xs font-mono">
                    <div className="px-2 py-1 print-total-row">Maximální skóre</div>
                    <div className="px-2 py-1 text-right print-total-row">{breakdown.reduce((a, b) => a + b.maxScore, 0)}</div>
                    <div className="px-2 py-1 print-total-row">Získané skóre</div>
                    <div className="px-2 py-1 text-right print-total-row">{breakdown.reduce((a, b) => a + b.gained, 0).toFixed(1)}</div>
                    <div className="px-2 py-1.5 font-extrabold border-t-2 border-white/40 print-total-result">Výsledek</div>
                    <div className="px-2 py-1.5 text-right font-extrabold border-t-2 border-white/40 print-total-result">{avgPct} %</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score legend (0–5 bands) */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mt-5 text-[10px] font-mono print-legend">
              {[
                { n: 0, color: "#f44336", label: "Nebylo zahájeno" },
                { n: 1, color: "#f44336", label: "Aktivita zahájena" },
                { n: 2, color: "#ff9800", label: "Rozšířená aktivita" },
                { n: 3, color: "#ffeb3b", label: "Min. přijatelná úroveň" },
                { n: 4, color: "#8bc34a", label: "Best in class" },
                { n: 5, color: "#2196f3", label: "Best Practice / World Class" },
              ].map((l) => (
                <div key={l.n} className="border-2 border-ink p-1.5 text-center" style={{ background: l.color }}>
                  <div className="text-base font-bold leading-tight">{l.n}</div>
                  <div className="leading-tight">{l.label}</div>
                </div>
              ))}
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

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST, scoreLabel } from "@/lib/checklist";

export const Route = createFileRoute("/archive/$id")({
  head: () => ({
    meta: [
      { title: "Detail auditu — 5S Audit" },
      { name: "description", content: "Detailní přehled jednoho auditu se všemi skóre a poznámkami." },
    ],
  }),
  component: ArchiveDetailPage,
});

function ArchiveDetailPage() {
  const { id } = useParams({ from: "/archive/$id" });

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ["audit_scores", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_scores")
        .select("*")
        .eq("audit_id", id);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = auditLoading || scoresLoading;

  // Group scores by category
  const groupedScores = CHECKLIST.map((cat) => {
    const catScores = scores?.filter((s) => s.category === cat.key) ?? [];
    const sum = catScores.reduce((acc, s) => acc + s.score, 0);
    const max = cat.items.length * 5;
    return {
      key: cat.key,
      cs: cat.cs,
      code: cat.code,
      color: cat.color,
      items: cat.items.map((it) => {
        const score = catScores.find((s) => s.item_id === it.id);
        return {
          id: it.id,
          title: it.title,
          question: it.question,
          score: score?.score ?? null,
          note: score?.note ?? null,
        };
      }),
      sum,
      max,
    };
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Načítám…
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="border-2 border-ink bg-card p-10 shadow-[3px_3px_0_0_#000] text-center text-muted-foreground">
          Audit nenalezen.
        </div>
        <Link to="/archive">
          <Button className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Zpět do archivu
          </Button>
        </Link>
      </div>
    );
  }

  const pct = Math.round((audit.total_score / audit.max_score) * 100);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <Link to="/archive">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Zpět do archivu
        </Button>
      </Link>

      {/* Header */}
      <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Datum auditu</div>
            <div className="font-display text-2xl mt-1">{audit.audit_date}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Zóna</div>
            <div className="font-display text-2xl mt-1">{audit.zone}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Auditor</div>
            <div className="font-display text-2xl mt-1">{audit.auditor}</div>
          </div>
          <div className="border-2 border-ink p-3 bg-primary/10">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Celkové skóre</div>
            <div className="font-display text-3xl mt-1">{scoreLabel(audit.total_score)}</div>
            <div className="font-mono text-sm text-muted-foreground mt-1">{pct} %</div>
          </div>
        </div>
      </section>

      {/* Overall note */}
      {audit.note && (
        <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Poznámka k auditu</div>
          <p className="text-sm whitespace-pre-wrap">{audit.note}</p>
        </section>
      )}

      {/* Detailed breakdown by category */}
      <div className="space-y-6">
        {groupedScores.map((cat) => (
          <section key={cat.key} className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
            <header className={`${cat.color} text-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.3em] flex items-center gap-2`}>
              <span className="inline-block h-4 w-4 border border-ink" />
              {cat.code} · {cat.cs}
            </header>
            <table className="w-full border-collapse">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="w-12 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Otázka</th>
                  <th className="w-24 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wider">Body</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Poznámka</th>
                </tr>
              </thead>
              <tbody>
                {cat.items.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2 font-display text-lg text-muted-foreground">{item.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.question}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="font-display text-2xl font-bold">
                        {item.score !== null ? scoreLabel(item.score) : "–"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {item.note || "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 border-t-2 border-ink">
                <tr>
                  <td colSpan={2} className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider">
                    Mezisoučet: {cat.cs}
                  </td>
                  <td className="px-3 py-3 text-center font-display text-lg font-bold">
                    {scoreLabel(cat.sum)}<span className="text-muted-foreground text-sm">/{cat.max}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">
                    {cat.max > 0 ? Math.round((cat.sum / cat.max) * 100) : 0} %
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}

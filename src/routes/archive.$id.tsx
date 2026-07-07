import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getAuditWithScores } from "@/lib/audits.functions";
import { CHECKLIST } from "@/lib/checklist";

export const Route = createFileRoute("/archive/$id")({
  head: () => ({ meta: [{ title: "Detail auditu — Archiv" }] }),
  component: AuditDetailPage,
});

function AuditDetailPage() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => getAuditWithScores({ data: { id } }),
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Načítám…
      </div>
    );
  }
  if (error || !data) {
    return <div className="p-10 text-center text-destructive">Záznam nenalezen.</div>;
  }

  const { audit, scores } = data;
  const scoreByItem = new Map(scores.map((s) => [s.item_id, s]));
  const pct = Math.round((Number(audit.total_score) / audit.max_score) * 100);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <Link to="/archive" className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Zpět na archiv
      </Link>

      <section className="border-2 border-ink bg-card p-5 shadow-[3px_3px_0_0_#000]">
        <div className="mb-3 inline-flex items-center gap-2 border-2 border-ink bg-primary text-primary-foreground px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
          Oddělení: {audit.department === "logistika" ? "Logistika" : "Výroba"}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Datum</div>
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
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Skóre</div>
            <div className="font-display text-2xl mt-1">
              {Number(audit.total_score)}/{audit.max_score} · {pct} %
            </div>
          </div>
        </div>
        {audit.note && (
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Poznámka: </span>
            {audit.note}
          </div>
        )}
      </section>

      {CHECKLIST.map((cat) => {
        const sum = cat.items.reduce((acc, it) => acc + (scoreByItem.get(it.id)?.score ?? 0), 0);
        return (
          <section key={cat.key} className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
            <header className="flex items-center justify-between bg-secondary text-secondary-foreground px-5 py-3">
              <div className="font-display text-xl tracking-wider">{cat.code} — {cat.cs}</div>
              <div className="font-display text-xl">{sum}<span className="text-muted-foreground text-sm">/{cat.items.length * 5}</span></div>
            </header>
            <ul className="divide-y divide-border">
              {cat.items.map((it) => {
                const row = scoreByItem.get(it.id);
                return (
                  <li key={it.id} className="p-4 grid grid-cols-[2rem_1fr_auto] gap-4 items-start">
                    <div className="font-display text-xl text-muted-foreground">{it.id}</div>
                    <div>
                      <div className="font-medium text-sm">{it.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{it.question}</div>
                      {row?.note && (
                        <div className="text-xs mt-2 border-l-2 border-primary pl-2 text-muted-foreground italic">{row.note}</div>
                      )}
                    </div>
                    <div className="font-display text-2xl min-w-[2.5rem] text-center">
                      {row?.score ?? "—"}<span className="text-muted-foreground text-xs">/5</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

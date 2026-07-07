import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Archive, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { scoreLabel } from "@/lib/checklist";

export const Route = createFileRoute("/archive/")({
  head: () => ({
    meta: [
      { title: "Archiv auditů — 5S Audit" },
      { name: "description", content: "Přehled všech dosavadních 5S auditů, seřazených podle data." },
    ],
  }),
  component: ArchiveIndexPage,
});

function ArchiveIndexPage() {
  const { data: audits, isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .order("audit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Historický záznam
          </div>
          <h1 className="font-display text-5xl text-ink mt-1 flex items-center gap-3">
            <Archive className="h-10 w-10 text-primary" />
            Archiv auditů
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Všechny dosavadní audity seřazené podle data. Klikni na audit pro detaily a nalezeného skóre.
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Načítám…
        </div>
      ) : !audits || audits.length === 0 ? (
        <div className="border-2 border-ink bg-card p-10 shadow-[3px_3px_0_0_#000] text-center text-muted-foreground">
          Zatím žádné audity v archivu. Začni vyplňováním auditu v sekci Checklist nebo Zápis dat.
        </div>
      ) : (
        <section className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider">Datum</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider">Zóna</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider">Auditor</th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider">Skóre</th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider">Akcí</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit, idx) => {
                const pct = Math.round((audit.total_score / audit.max_score) * 100);
                return (
                  <tr
                    key={audit.id}
                    className={`border-t border-border ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  >
                    <td className="px-4 py-3 font-mono text-sm">{audit.audit_date}</td>
                    <td className="px-4 py-3 font-medium text-sm">{audit.zone}</td>
                    <td className="px-4 py-3 text-sm">{audit.auditor}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-display text-lg font-bold">{scoreLabel(audit.total_score)}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{pct} %</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/archive/$id`} params={{ id: audit.id }}>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="h-4 w-4" /> Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Archive, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archiv 5S auditů — záznamy" },
      { name: "description", content: "Archiv všech provedených 5S auditů s detailem skóre." },
    ],
  }),
  component: ArchivePage,
});

type AuditRow = {
  id: string;
  zone: string;
  auditor: string;
  audit_date: string;
  total_score: number;
  max_score: number;
  note: string | null;
  created_at: string;
};

function ArchivePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .order("audit_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AuditRow[];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <section>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Archiv
        </div>
        <h1 className="font-display text-5xl text-ink mt-1 flex items-center gap-3">
          <Archive className="h-10 w-10 text-primary" />
          Archiv auditů
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Všechny uložené 5S audity. Pro grafy a porovnání použijte sekci <Link to="/evaluation" className="underline">Vyhodnocení</Link>.
        </p>
      </section>

      <section className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Načítám…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-destructive">Chyba načítání archivu.</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            Zatím žádné záznamy. Vyplňte první audit v sekci <Link to="/checklist" className="underline">Checklist</Link>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.2em]">
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Zóna</th>
                <th className="px-4 py-3">Auditor</th>
                <th className="px-4 py-3">Skóre</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Poznámka</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((a) => {
                const pct = Math.round((Number(a.total_score) / a.max_score) * 100);
                return (
                  <tr key={a.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3 font-mono">{a.audit_date}</td>
                    <td className="px-4 py-3 font-medium">{a.zone}</td>
                    <td className="px-4 py-3 font-mono">{a.auditor}</td>
                    <td className="px-4 py-3 font-display text-lg">
                      {Number(a.total_score)}
                      <span className="text-muted-foreground text-xs">/{a.max_score}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 font-mono text-xs border-2 border-ink ${pct >= 80 ? "bg-primary text-primary-foreground" : pct >= 60 ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                        {pct} %
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-md truncate">{a.note ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        to="/archive/$id"
                        params={{ id: a.id }}
                        className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-primary hover:underline"
                      >
                        <Eye className="h-3 w-3" /> Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

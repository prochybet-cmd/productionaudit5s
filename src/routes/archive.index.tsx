import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Archive, Eye, Loader2, Factory, Truck, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/archive/")({
  head: () => ({
    meta: [
      { title: "Archiv 5S auditů — záznamy" },
      { name: "description", content: "Archiv všech provedených 5S auditů rozdělený na Výrobu a Logistiku, po měsících." },
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
  department: "vyroba" | "logistika";
};

const MONTHS_CS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS_CS[Number(m) - 1] ?? m} ${y}`;
}

function ArchivePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audits-archive"],
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
          Rozděleno podle oddělení a měsíců. Pro grafy a porovnání použijte sekci{" "}
          <Link to="/evaluation" className="underline">Vyhodnocení</Link>.
        </p>
      </section>

      {isLoading ? (
        <div className="border-2 border-ink bg-card p-10 text-center text-muted-foreground flex items-center justify-center gap-2 shadow-[3px_3px_0_0_#000]">
          <Loader2 className="h-5 w-5 animate-spin" /> Načítám…
        </div>
      ) : error ? (
        <div className="border-2 border-ink bg-card p-10 text-center text-destructive shadow-[3px_3px_0_0_#000]">
          Chyba načítání archivu.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepartmentSection
            title="Výroba"
            icon={Factory}
            audits={(data ?? []).filter((a) => a.department !== "logistika")}
          />
          <DepartmentSection
            title="Logistika"
            icon={Truck}
            audits={(data ?? []).filter((a) => a.department === "logistika")}
          />
        </div>
      )}
    </div>
  );
}

function DepartmentSection({
  title,
  icon: Icon,
  audits,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  audits: AuditRow[];
}) {
  const byMonth = useMemo(() => {
    const groups = new Map<string, AuditRow[]>();
    for (const a of audits) {
      const ym = a.audit_date.slice(0, 7);
      const arr = groups.get(ym) ?? [];
      arr.push(a);
      groups.set(ym, arr);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [audits]);

  return (
    <section className="border-2 border-ink bg-card shadow-[3px_3px_0_0_#000] overflow-hidden">
      <header className="flex items-center justify-between bg-secondary text-secondary-foreground px-4 py-3">
        <div className="flex items-center gap-2 font-display text-xl tracking-wider">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
          {audits.length} {audits.length === 1 ? "audit" : "auditů"}
        </div>
      </header>
      {audits.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Zatím žádné záznamy.
        </div>
      ) : (
        <div className="divide-y-2 divide-ink">
          {byMonth.map(([ym, rows], idx) => (
            <MonthFolder key={ym} label={monthLabel(ym)} rows={rows} defaultOpen={idx === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function MonthFolder({
  label,
  rows,
  defaultOpen,
}: {
  label: string;
  rows: AuditRow[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const avgPct = Math.round(
    (rows.reduce((acc, a) => acc + Number(a.total_score) / a.max_score, 0) / rows.length) * 100,
  );
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-accent/20 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {label}
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-muted-foreground">{rows.length}×</span>
          <span className="border-2 border-ink bg-primary text-primary-foreground px-1.5 py-0.5">
            Ø {avgPct} %
          </span>
        </div>
      </button>
      {open && (
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.2em]">
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Zóna</th>
              <th className="px-3 py-2">Auditor</th>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => {
              const pct = Math.round((Number(a.total_score) / a.max_score) * 100);
              return (
                <tr key={a.id} className="hover:bg-accent/20">
                  <td className="px-3 py-2 font-mono">{a.audit_date}</td>
                  <td className="px-3 py-2 font-medium truncate max-w-[10rem]">{a.zone}</td>
                  <td className="px-3 py-2 font-mono truncate max-w-[10rem]">{a.auditor}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 font-mono text-[11px] border-2 border-ink ${
                        pct >= 80
                          ? "bg-primary text-primary-foreground"
                          : pct >= 60
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-destructive text-destructive-foreground"
                      }`}
                    >
                      {pct} %
                    </span>
                  </td>
                  <td className="px-3 py-2">
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
    </div>
  );
}

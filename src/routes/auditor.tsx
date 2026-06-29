import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, MapPin, CalendarDays, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_AUDITORS,
  DEFAULT_ZONES,
  MONTH_NAMES_CS,
  formatDateCs,
  generatePlan,
} from "@/lib/scheduler";

export const Route = createFileRoute("/auditor")({
  head: () => ({
    meta: [
      { title: "Najít auditora — 5S Audit Planner" },
      {
        name: "description",
        content:
          "Zadej své jméno a uvidíš všechny své 5S audity v aktuálním měsíci: kdy a do jaké zóny.",
      },
      { property: "og:title", content: "Najít auditora" },
      { property: "og:description", content: "Vyhledávání plánu auditora podle jména." },
    ],
  }),
  component: AuditorPage,
});

function AuditorPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [query, setQuery] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const plan = useMemo(
    () => generatePlan({ year, month }),
    [year, month],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DEFAULT_AUDITORS.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const mine = useMemo(() => {
    if (!confirmed) return [];
    return plan.assignments.filter((a) => a.auditor === confirmed);
  }, [confirmed, plan]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Auditor lookup
        </div>
        <h1 className="font-display text-5xl text-ink mt-1">Kam mám jít?</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Zadej své jméno a potvrď. Uvidíš všechny své 5S audity v měsíci{" "}
          <strong>{MONTH_NAMES_CS[month]} {year}</strong>.
        </p>
      </div>

      <div className="border-2 border-ink bg-card p-6 shadow-[6px_6px_0_0_#000]">
        <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Jméno auditora
        </label>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setConfirmed(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) {
                  setConfirmed(suggestions[0]);
                  setQuery(suggestions[0]);
                }
              }}
              placeholder="např. Jan Novák"
              className="pl-9 h-12 text-base border-2"
            />
          </div>
          <Button
            disabled={suggestions.length === 0}
            onClick={() => {
              const pick = suggestions[0];
              if (pick) {
                setConfirmed(pick);
                setQuery(pick);
              }
            }}
            className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider"
          >
            Potvrdit
          </Button>
        </div>

        {suggestions.length > 0 && !confirmed && (
          <ul className="mt-3 border border-border divide-y divide-border bg-background">
            {suggestions.map((n) => (
              <li key={n}>
                <button
                  onClick={() => {
                    setConfirmed(n);
                    setQuery(n);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between group"
                >
                  <span>{n}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        )}
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
              V tomto měsíci nemá tento auditor žádné audity v plánu.
            </div>
          ) : (
            <ul className="space-y-3">
              {mine.map((a, i) => (
                <li
                  key={i}
                  className="stamp bg-card p-4 flex flex-wrap items-center gap-4 justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground px-3 py-2 text-center min-w-[64px]">
                      <div className="font-mono text-[10px] uppercase tracking-wider">
                        {a.weekday}
                      </div>
                      <div className="font-display text-2xl leading-none">
                        {a.date.split("-")[2]}
                      </div>
                      <div className="font-mono text-[10px]">
                        {MONTH_NAMES_CS[Number(a.date.split("-")[1]) - 1].slice(0, 3)}
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
                    <div className="font-mono text-xs">
                      {formatDateCs(a.date)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

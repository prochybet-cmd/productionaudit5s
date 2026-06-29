import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarRange, UserSearch, ClipboardList, ClipboardCheck, FileSpreadsheet, Archive, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Plán", icon: CalendarRange },
  { to: "/auditor", label: "Auditor", icon: UserSearch },
  { to: "/zones", label: "Zóny", icon: ClipboardList },
  { to: "/checklist", label: "Checklist", icon: ClipboardCheck },
  { to: "/data-entry", label: "Zápis dat", icon: FileSpreadsheet },
  { to: "/archive", label: "Archiv", icon: Archive },
  { to: "/evaluation", label: "Vyhodnocení", icon: BarChart3 },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="border-b-2 border-ink bg-secondary text-secondary-foreground">
      <div className="hazard-stripe h-2 w-full" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground font-display text-xl shadow-[3px_3px_0_0_#000]">
            5S
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wider">AUDIT PLANNER</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              Shop-floor / Automotive
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary-foreground/80 hover:bg-secondary-foreground/10",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

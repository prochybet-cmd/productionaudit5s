import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarRange, UserSearch, ClipboardList, ClipboardCheck, FileSpreadsheet, Archive, BarChart3, Factory, Truck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDepartment, type Department } from "@/lib/department-store";
import { lockSite } from "@/lib/gate.functions";
import { useQueryClient } from "@tanstack/react-query";

const NAV_VYROBA = [
  { to: "/", label: "Plán", icon: CalendarRange },
  { to: "/checklist", label: "Checklist", icon: ClipboardCheck },
  { to: "/data-entry", label: "Zápis dat", icon: FileSpreadsheet },
  { to: "/evaluation", label: "Vyhodnocení", icon: BarChart3 },
  { to: "/auditor", label: "Auditor", icon: UserSearch },
  { to: "/zones", label: "Zóny", icon: ClipboardList },
  { to: "/archive", label: "Archiv", icon: Archive },
] as const;

const NAV_LOGISTIKA = [
  { to: "/", label: "Přehled", icon: CalendarRange },
  { to: "/checklist", label: "Checklist", icon: ClipboardCheck },
  { to: "/data-entry", label: "Zápis dat", icon: FileSpreadsheet },
  { to: "/evaluation", label: "Vyhodnocení", icon: BarChart3 },
  { to: "/archive", label: "Archiv", icon: Archive },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { department, setDepartment } = useDepartment();
  const nav = department === "logistika" ? NAV_LOGISTIKA : NAV_VYROBA;
  const router = useRouter();
  const queryClient = useQueryClient();
  const lock = useServerFn(lockSite);

  const toggle = (v: Department) => () => setDepartment(v);

  const handleLock = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await lock();
    await router.invalidate();
    await router.navigate({ to: "/unlock" });
  };

  if (pathname === "/unlock") return null;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-secondary text-secondary-foreground">
      <div className="hazard-stripe h-2 w-full" />
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-6 md:py-4">
        <div className="flex shrink-0 items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center bg-primary text-primary-foreground font-display text-xl shadow-[3px_3px_0_0_#000]">
              5S
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-xl tracking-wider">AUDIT PLANNER</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                SHOPFLOOR
              </div>
            </div>
          </Link>
          {/* Department toggle */}
          <div className="ml-1 flex border-2 border-ink bg-card text-ink shadow-[2px_2px_0_0_#000]">
            <button
              type="button"
              onClick={toggle("vyroba")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                department === "vyroba" ? "bg-primary text-primary-foreground" : "hover:bg-accent/40",
              )}
              aria-pressed={department === "vyroba"}
              title="Přepnout na Výrobu"
            >
              <Factory className="h-3.5 w-3.5" /> Výroba
            </button>
            <button
              type="button"
              onClick={toggle("logistika")}
              className={cn(
                "flex items-center gap-1.5 border-l-2 border-ink px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                department === "logistika" ? "bg-primary text-primary-foreground" : "hover:bg-accent/40",
              )}
              aria-pressed={department === "logistika"}
              title="Přepnout na Logistiku"
            >
              <Truck className="h-3.5 w-3.5" /> Logistika
            </button>
          </div>
        </div>
        <nav className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary-foreground/80 hover:bg-secondary-foreground/10",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLock}
            title="Odhlásit / zamknout"
            className="ml-1 flex shrink-0 items-center gap-2 border-2 border-ink bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink shadow-[2px_2px_0_0_#000] transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Zamknout
          </button>
        </nav>
      </div>
    </header>
  );
}

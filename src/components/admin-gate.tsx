import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "5s-admin-unlocked";
const PASSWORD = "magna";

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function lockAdmin() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("admin-lock-change"));
}

export function AdminGate({ children, title }: { children: ReactNode; title: string }) {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUnlocked(isAdminUnlocked());
    const handler = () => setUnlocked(isAdminUnlocked());
    window.addEventListener("admin-lock-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("admin-lock-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  if (!mounted) return null;
  if (unlocked) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      window.dispatchEvent(new Event("admin-lock-change"));
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <div className="w-full border-2 border-ink bg-background p-6 shadow-[6px_6px_0_0_#000]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl tracking-wider">{title}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Chráněná sekce
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Heslo
            </span>
            <Input
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              autoFocus
              className="mt-1"
            />
          </label>
          {error && (
            <div className="border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Nesprávné heslo.
            </div>
          )}
          <Button type="submit" className="w-full">
            Odemknout
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminLockSection({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUnlocked(isAdminUnlocked());
    const handler = () => setUnlocked(isAdminUnlocked());
    window.addEventListener("admin-lock-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("admin-lock-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  if (!mounted) return null;

  if (unlocked) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => lockAdmin()}
            className="font-mono text-[10px] uppercase tracking-wider"
          >
            <Lock className="mr-1 h-3 w-3" /> Zamknout
          </Button>
        </div>
        {children}
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      window.dispatchEvent(new Event("admin-lock-change"));
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <div className="border-2 border-dashed border-ink bg-card p-6 shadow-[6px_6px_0_0_#000]">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-xl tracking-wider">{title}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Pro úpravy zadej heslo
          </div>
        </div>
      </div>
      {description && (
        <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      )}
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[200px]">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Heslo
          </span>
          <Input
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            className="mt-1"
          />
        </label>
        <Button type="submit">Odemknout úpravy</Button>
      </form>
      {error && (
        <div className="mt-3 border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Nesprávné heslo.
        </div>
      )}
    </div>
  );
}

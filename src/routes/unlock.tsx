import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGateStatus, unlockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Přístup — 5S Audit" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Zadejte přístupové heslo." },
    ],
  }),
  beforeLoad: async () => {
    const { unlocked } = await getGateStatus();
    if (unlocked) throw redirect({ to: "/" });
  },
  component: UnlockPage,
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await unlock({ data: { password } });
      if (res.ok) {
        await router.invalidate();
        await router.navigate({ to: "/" });
      } else {
        setError(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6 py-16">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border-2 border-ink bg-card p-6 shadow-[3px_3px_0_0_#000] space-y-4"
      >
        <div className="flex items-center gap-2 font-display text-2xl">
          <Lock className="h-6 w-6 text-primary" />
          Chráněný přístup
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Zadejte sdílené heslo pro přístup k auditům.
        </p>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Heslo</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>
        {error && (
          <div className="text-sm text-destructive font-mono">Nesprávné heslo.</div>
        )}
        <Button
          type="submit"
          disabled={busy || !password}
          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Odemknout
        </Button>
      </form>
    </div>
  );
}

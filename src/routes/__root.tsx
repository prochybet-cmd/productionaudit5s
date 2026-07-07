import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { getGateStatus } from "@/lib/gate.functions";

import "@fontsource/bebas-neue/400.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site-header";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tato stránka neexistuje.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Zpět na plán
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl tracking-wider">Něco se pokazilo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Zkuste obnovit stránku nebo se vraťte na plán.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Zkusit znovu
          </button>
          <a
            href="/"
            className="border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Domů
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "5S Audit Planner — automotive shop-floor" },
      {
        name: "description",
        content:
          "Interaktivní plánovač 5S auditů ve výrobě kovových konstrukcí autosedaček. Měsíční plán, vyhledávání auditora, rotace zón.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "5S Audit Planner — automotive shop-floor" },
      {
        property: "og:description",
        content: "Měsíční plán 5S auditů pro automotive výrobu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "5S Audit Planner — automotive shop-floor" },
      { name: "description", content: "AuditFlow Pro is an interactive 5S audit planner for manufacturing environments." },
      { property: "og:description", content: "AuditFlow Pro is an interactive 5S audit planner for manufacturing environments." },
      { name: "twitter:description", content: "AuditFlow Pro is an interactive 5S audit planner for manufacturing environments." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd169167-7a23-4ad1-a01f-c9ccfd472a73/id-preview-38dbc425--a0a399fd-9db9-4e1a-ad1c-306f137db23a.lovable.app-1782727367344.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd169167-7a23-4ad1-a01f-c9ccfd472a73/id-preview-38dbc425--a0a399fd-9db9-4e1a-ad1c-306f137db23a.lovable.app-1782727367344.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/favicon.png" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/unlock") return;
    const { unlocked } = await getGateStatus();
    if (!unlocked) throw redirect({ to: "/unlock" });
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border bg-secondary text-secondary-foreground/70 py-4 text-center font-mono text-[10px] uppercase tracking-[0.25em]">
          Lean Manufacturing · IATF mindset · 5S
        </footer>
      </div>
    </QueryClientProvider>
  );
}

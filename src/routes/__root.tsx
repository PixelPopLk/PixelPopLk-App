import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "PixelPopLK — Sinhala Subtitles" },
      { name: "description", content: "Premium Sinhala subtitles for movies and TV series. Curated, fast, and secure downloads." },
      { name: "keywords", content: "Sinhala Subtitles, Download Movie Subtitles, PixelPopLK, Sinhala Subitiles TV Series, Sinhala Subtitles TV Series, subtitle download, sri lanka subtitles" },
      { name: "author", content: "PixelPopLK" },
      { property: "og:title", content: "PixelPopLK — Sinhala Subtitles" },
      { property: "og:description", content: "Premium Sinhala subtitles for movies and TV series. Curated, fast, and secure downloads." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PixelPopLK" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PixelPopLK — Sinhala Subtitles" },
      { name: "twitter:description", content: "Premium Sinhala subtitles for movies and TV series." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PixelPopLK",
  "url": "https://pixelpoplk.pages.dev",
  "description": "Premium Sinhala subtitles for movies and TV series. Curated, fast, and secure downloads.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://pixelpoplk.pages.dev/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        
        {/* 1. 🌓 DARK/LIGHT MODE ඔටෝ ඩිටෙක්ට් කරන SCRIPT එක (Flicker එක නැති කරන්න) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />

        {/* Google Search Console Verification Meta Tag */}
        <meta name="google-site-verification" content="VoErL02EHeHtDv46aBcjIEm5DpUTnJRhPF89ewoK-M4" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Monetag සහ Adsterra Popunder URLs
const MONETAG_POPUNDER_URL = "https://omg10.com/4/11202064";
const ADSTERRA_POPUNDER_URL = "https://omg10.com/4/11172288";

function MonetagPopunder() {
  useEffect(() => {
    let fired = false;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 2. 🛡️ 'ad-trigger' කියන class එක තියෙන බටන් වලට විතරක් ඇඩ් පෙන්වයි
      const triggerBtn = target ? target.closest(".ad-trigger") : null;
      if (!triggerBtn) {
        return; // ad-trigger එකක් නොවේ නම් ඇඩ් ඕපන් කරන්නේ නැත
      }

      if (fired) return;
      fired = true;
      window.removeEventListener("click", handler, true);
      try {
        const targetUrl = Math.random() < 0.5 ? MONETAG_POPUNDER_URL : ADSTERRA_POPUNDER_URL;
        const w = window.open(targetUrl, "_blank", "noopener,noreferrer");
        if (w) w.opener = null;
      } catch {
        /* noop */
      }
    };
    
    // Use capture to ensure we catch clicks on specified elements before other redirections
    window.addEventListener("click", handler, true);
    return () => window.removeEventListener("click", handler, true);
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();

  // '/manage-admin' පිටුවේ නොමැති විට පමණක් Monetag Popunder පෙන්වීමට අවසර දේ
  const isNotAdmin = !location.pathname.startsWith("/manage-admin");

  return (
    <QueryClientProvider client={queryClient}>
      {isNotAdmin && <MonetagPopunder />}
      <Outlet />
    </QueryClientProvider>
  );
}
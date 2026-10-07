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
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";

const AD_URL = "https://acorntar.com/mavhdyhj78?key=dc67dd9ce96dd9a20b59e14a01a6a093";
const COOLDOWN_TIME = 3000;

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

function ErrorComponent({ error }: { error: Error; reset: () => void }) {
  console.error(error);
  useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    if (
      error?.message?.includes("dynamically imported module") ||
      error?.message?.includes("Unexpected token")
    ) {
      const lastReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("last_chunk_reload", String(now));
        window.location.reload();
      }
    }
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
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Refresh Page
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
  // Cache public SSR HTML at the edge. Private/admin/search/API responses are
  // explicitly excluded so user-specific data is never shared.
  headers: ({ matches }) => {
    const pathname = matches.at(-1)?.pathname ?? "/";
    const isPrivateOrDynamic =
      pathname.startsWith("/manage-admin") ||
      pathname.startsWith("/search") ||
      pathname.startsWith("/api/");

    if (isPrivateOrDynamic) {
      return {
        "Cache-Control": "no-store",
        "CDN-Cache-Control": "no-store",
      };
    }

    return {
      "Cache-Control":
        "public, max-age=60, stale-while-revalidate=86400, stale-if-error=86400",
      "CDN-Cache-Control":
        "public, max-age=600, stale-while-revalidate=86400, stale-if-error=86400",
    };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PixelPopLK — Sinhala Subtitles for Movies & TV Series" },
      { name: "theme-color", content: "#0e0e12" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "icon", href: "/logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "stylesheet", href: appCss },
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
  "inLanguage": ["en", "si"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://pixelpoplk.pages.dev/?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

function RootShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/manage-admin");

  return (
    <html lang="si" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        <HeadContent />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('vite:preloadError', function() {
                var lastReload = sessionStorage.getItem('last_chunk_reload');
                var now = Date.now();
                if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                  sessionStorage.setItem('last_chunk_reload', String(now));
                  window.location.reload();
                }
              });
              window.addEventListener('error', function(e) {
                if (e.message && (e.message.includes('dynamically imported module') || e.message.includes('Unexpected token'))) {
                  var lastReload = sessionStorage.getItem('last_chunk_reload');
                  var now = Date.now();
                  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                    sessionStorage.setItem('last_chunk_reload', String(now));
                    window.location.reload();
                  }
                }
              });
            `,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
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
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/manage-admin");

  useEffect(() => {
    if (isAdminPage) return;

    const handleGlobalClick = (event: MouseEvent) => {
      if (window.location.pathname.startsWith("/manage-admin")) return;

      const target = event.target as HTMLElement;
      if (!target) return;

      const isInsidePopup = target.closest(
        '[role="dialog"], [role="alertdialog"], [aria-modal="true"], ' +
        '.modal, .dialog, .popup, [data-radix-dialog-content], ' +
        '[data-sonner-toast], [data-toast], .toast, [role="alert"], ' +
        '[class*="overlay"], [class*="backdrop"], [data-no-ad="true"]'
      );
      if (isInsidePopup) return;

      const clickable = target.closest("a, button, [role='button'], [data-clickable='true']") as HTMLElement | null;
      if (!clickable) return;

      const linkElement = clickable.closest("a") as HTMLAnchorElement | null;
      const targetUrl = linkElement ? linkElement.href : null;

      const isDownloadButton =
        clickable.hasAttribute("download") ||
        Boolean(clickable.closest("[download], [data-download], [data-no-ad]")) ||
        (typeof clickable.className === "string" && /download/i.test(clickable.className)) ||
        (clickable.id && /download/i.test(clickable.id)) ||
        (clickable.textContent && /download|බාගන්න/i.test(clickable.textContent)) ||
        (targetUrl && (/\.(srt|zip|rar|7z|sub)($|\?)/i.test(targetUrl) || /download/i.test(targetUrl)));

      const isTelegramButton =
        Boolean(targetUrl && /(t\.me|telegram\.me|telegram\.dog)/i.test(targetUrl)) ||
        Boolean(clickable.textContent && /telegram|ටෙලිග්‍රෑම්/i.test(clickable.textContent)) ||
        (typeof clickable.className === "string" && /telegram/i.test(clickable.className)) ||
        (clickable.id && /telegram/i.test(clickable.id));

      if (isDownloadButton || isTelegramButton) return;

      const now = Date.now();
      const lastGlobalAdTime = Number(sessionStorage.getItem("last_global_ad_time") || 0);
      if (now - lastGlobalAdTime < COOLDOWN_TIME) return;

      sessionStorage.setItem("last_global_ad_time", String(now));

      try {
        const adWindow = window.open(AD_URL, "_blank");
        if (adWindow) {
          adWindow.blur();
          window.focus();
        }
      } catch (e) {
        const a = document.createElement("a");
        a.href = AD_URL;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [isAdminPage]);

  return (
    <QueryClientProvider client={queryClient}>
      <PwaInstallPrompt />
      <Outlet />
    </QueryClientProvider>
  );
}

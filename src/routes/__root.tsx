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
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";

const MONETAG_CLICK_AD_URL = "https://directyp.org/4/dc67dd9ce96dd9a20b59e14a01a6a093";
const ADSTERRA_CLICK_AD_URL = "https://acorntar.com/b795sywmp?key=20b07ce2b76b7238eae7acf49dd3a534";
const CLICK_AD_COOLDOWN_MS = 5_000;
// Shared with Sidebar.tsx so one click cannot open two sponsor tabs.
const LAST_CLICK_AD_STORAGE_KEY = "pxl_sidebar_last_ad_time";

function getClickAdUrl() {
  return Math.random() < 0.5 ? MONETAG_CLICK_AD_URL : ADSTERRA_CLICK_AD_URL;
}

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
  return (
    <html lang="si">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.classList.toggle(
                  'dark',
                  theme === 'dark' || (!theme && prefersDark)
                );
              } catch (e) {
                document.documentElement.classList.remove('dark');
              }
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
  const isAdminPage =
    location.pathname === "/manage-admin" ||
    location.pathname.startsWith("/manage-admin/");
  const [adBlockDetected, setAdBlockDetected] = useState(false);

  useEffect(() => {
    if (isAdminPage) {
      setAdBlockDetected(false);
      return;
    }

    // Several common CSS bait selectors improve coverage across blocker lists.
    // No ad-network request is used as a signal, so a simple network outage
    // alone will not incorrectly lock a visitor out.
    const baitClasses = [
      "adsbox",
      "ad-placement",
      "ad-banner",
      "adsbygoogle",
      "text-ad",
      "ad-unit",
      "ad-slot",
      "advertisement",
      "sponsored-content",
    ];
    const baits = baitClasses.map((className) => {
      const bait = document.createElement("div");
      bait.className = className;
      bait.setAttribute("aria-hidden", "true");
      bait.style.cssText =
        "position:absolute;top:-10000px;left:-10000px;width:10px;height:10px;pointer-events:none;";
      document.body.appendChild(bait);
      return bait;
    });

    const detectAdBlocker = () => {
      // A single matching selector is not enough to block a visitor: some
      // privacy tools or site-specific filters may hide one generic bait.
      // Require multiple independent bait elements to be hidden.
      const hiddenBaitCount = baits.filter((bait) => {
        const style = window.getComputedStyle(bait);
        const rect = bait.getBoundingClientRect();
        return (
          bait.offsetHeight === 0 ||
          bait.offsetWidth === 0 ||
          rect.width === 0 ||
          rect.height === 0 ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse"
        );
      }).length;

      // Two or more blocked selectors indicate an ad-blocking filter with
      // much lower false-positive risk than treating one selector as proof.
      setAdBlockDetected(hiddenBaitCount >= 2);
      baits.forEach((bait) => bait.remove());
    };

    // Give browser extensions enough time to apply cosmetic filter rules.
    const timer = window.setTimeout(detectAdBlocker, 500);
    return () => {
      window.clearTimeout(timer);
      baits.forEach((bait) => bait.remove());
    };
  }, [isAdminPage, location.pathname]);

  // Open a smartlink for eligible site clicks, with a shared five-second
  // cooldown. Sidebar.tsx uses the same storage key to prevent duplicate opens.
  useEffect(() => {
    if (isAdminPage || adBlockDetected) return;

    const handleGlobalClick = (event: MouseEvent) => {
      if (
        window.location.pathname === "/manage-admin" ||
        window.location.pathname.startsWith("/manage-admin/")
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      // Download buttons have their own ad flow. Exclude them from the
      // site-wide smartlink popup, including clicks on nested button content.
      if (
        target.closest(
          '[data-download="true"], [data-download], [data-download-zone="true"], [data-no-ad="true"], a[download]',
        )
      ) {
        return;
      }

      const isInsidePopup = target.closest(
        '[role="dialog"], [role="alertdialog"], [aria-modal="true"], ' +
          ".modal, .dialog, .popup, [data-radix-dialog-content], " +
          "[data-sonner-toast], [data-toast], .toast, [role='alert'], " +
          '[class*="overlay"], [class*="backdrop"], [data-no-ad="true"]',
      );
      if (isInsidePopup) return;

      const clickable = target.closest(
        "a, button, [role='button'], [data-clickable='true']",
      ) as HTMLElement | null;
      if (!clickable) return;

      const linkElement = clickable.closest("a") as HTMLAnchorElement | null;
      const targetUrl = linkElement?.href ?? null;

      if (targetUrl) {
        try {
          const targetPath = new URL(targetUrl, window.location.href).pathname;
          if (
            targetPath === "/manage-admin" ||
            targetPath.startsWith("/manage-admin/")
          ) {
            return;
          }
        } catch {
          // Ignore malformed link targets and continue with the normal checks.
        }
      }

      const now = Date.now();
      try {
        const lastAdTime = Number(localStorage.getItem(LAST_CLICK_AD_STORAGE_KEY) || 0);
        if (Number.isFinite(lastAdTime) && now - lastAdTime < CLICK_AD_COOLDOWN_MS) {
          return;
        }
        localStorage.setItem(LAST_CLICK_AD_STORAGE_KEY, String(now));
      } catch {
        // If storage is disabled, the popup is still only attempted on a click.
      }

      // The real click keeps this user-initiated. Do not disguise or proxy the
      // destination: extensions may still block this URL, which is expected.
      window.open(getClickAdUrl(), "_blank", "noopener,noreferrer");
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [isAdminPage, adBlockDetected]);

  const retryAfterDisablingAdBlocker = () => {
    // Do not clear a stored bypass flag: detection is re-run on every route load.
    window.location.reload();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PwaInstallPrompt />
      <Outlet />
      {adBlockDetected && !isAdminPage && (
        <div
          className="fixed inset-0 z-[100000] flex min-h-screen items-center justify-center overflow-y-auto bg-background/95 px-4 py-8 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="adblock-gate-title"
          aria-describedby="adblock-gate-description"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <h2 id="adblock-gate-title" className="text-xl font-bold text-foreground">
              Adblocker Detected!
            </h2>
            <p id="adblock-gate-description" className="mt-3 text-sm leading-6 text-muted-foreground">
              Adblocker ඕෆ් කර නැවත උත්සාහ කරන්න.
            </p>
            <button
              type="button"
              onClick={retryAfterDisablingAdBlocker}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              නැවත උත්සාහ කරන්න
            </button>
          </div>
        </div>
      )}
    </QueryClientProvider>
  );
}

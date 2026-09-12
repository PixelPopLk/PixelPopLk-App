import { createFileRoute } from "@tanstack/react-router";
import { supabase, SUBTITLES_TABLE } from "@/integrations/supabase/client";

export const Route = createFileRoute("/api/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        let title = "PixelPopLK — Sinhala Subtitles";
        let year = "2026";
        let rating = "8.5";
        let kind = "Movie";
        let poster = "https://pixelpoplk.pages.dev/logo.png";

        if (id) {
          try {
            const { data } = await supabase
              .from(SUBTITLES_TABLE)
              .select("title, year, rating, image_url, season, episode, created_at")
              .eq("id", Number(id) as any)
              .maybeSingle();

            if (data) {
              title = data.title || title;
              year = data.year ? String(data.year) : new Date(data.created_at).getFullYear().toString();
              rating = data.rating ? String(data.rating) : rating;
              kind = data.season != null && data.episode != null ? "TV Series" : "Movie";
              poster = data.image_url || poster;
            }
          } catch {
            /* fallback to defaults */
          }
        }

        // XML-escape special characters
        const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeYear = year.replace(/&/g, "&amp;");
        const safeRating = rating.replace(/&/g, "&amp;");

        // 1200x630 OpenGraph SVG Banner
        const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e0e14" />
      <stop offset="50%" stop-color="#161626" />
      <stop offset="100%" stop-color="#0a0a10" />
    </linearGradient>
    <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Top Brand Glow Line -->
  <rect width="1200" height="6" fill="url(#brand)" />

  <!-- Ambient Light Circle -->
  <circle cx="250" cy="315" r="220" fill="#ef4444" opacity="0.15" filter="url(#glow)" />

  <!-- Poster Frame -->
  <rect x="70" y="65" width="340" height="500" rx="24" fill="#181824" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
  <image href="${poster}" x="70" y="65" width="340" height="500" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 24px)" />

  <!-- Content Group -->
  <g transform="translate(460, 0)">
    <!-- Brand Badge -->
    <text x="0" y="110" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="bold" fill="#ef4444" letter-spacing="2">
      PIXELPOPLK • OFFICIAL SINHALA SUBTITLES
    </text>

    <!-- Title -->
    <text x="0" y="190" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="46" font-weight="900" fill="#ffffff">
      ${safeTitle.length > 25 ? safeTitle.slice(0, 24) + "..." : safeTitle}
    </text>

    <!-- Meta Details (Year, Rating, Type) -->
    <text x="0" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="24" font-weight="600" fill="#a1a1aa">
      📅 ${safeYear}    ⭐ ${safeRating}/10 IMDb    🎬 ${kind}
    </text>

    <!-- Sinhala Subtitle Box -->
    <rect x="0" y="300" width="670" height="85" rx="16" fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.4)" stroke-width="2" />
    <text x="30" y="352" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="28" font-weight="bold" fill="#ffffff">
      🇱🇰  සිංහල උපසිරැසි (Sinhala Subtitles)
    </text>

    <!-- Direct Download Highlight -->
    <text x="0" y="470" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="bold" fill="#10b981">
      ⚡ Direct .ZIP Fast Download Available
    </text>

    <!-- Site URL -->
    <text x="0" y="525" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="20" font-weight="500" fill="#71717a">
      https://pixelpoplk.pages.dev
    </text>
  </g>
</svg>
        `.trim();

        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      },
    },
  },
});

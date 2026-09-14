import { createFileRoute } from "@tanstack/react-router";
import { supabase, SUBTITLES_TABLE } from "@/integrations/supabase/client";
import { parseTitle, cleanShowName } from "@/lib/subtitles";

const BASE_URL = "https://pixelpoplk.pages.dev";

function isSeriesRow(sub: any) {
  if (sub.season != null && sub.episode != null) return true;
  const g = (sub.genre ?? "").toLowerCase();
  if (g.split(/[,/|]/).map((x: string) => x.trim()).includes("movie")) return false;
  return parseTitle(sub.title ?? "").episode != null;
}

const escapeXml = (str: string | null | undefined) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const CORE_GENRES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "drama",
  "horror",
  "mystery",
  "romance",
  "sci-fi",
  "thriller",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data: subtitles, error } = await supabase
          .from(SUBTITLES_TABLE)
          .select("id, created_at, updated_at, season, episode, genre, image_url, title")
          .order("created_at", { ascending: false });

        // Always return a valid sitemap for crawlers. Dynamic subtitle URLs are
        // omitted temporarily if Supabase is unavailable; static and genre URLs
        // remain indexable instead of receiving a 500 response.
        if (error) {
          console.error("Sitemap subtitle fetch failed:", error.message);
        }

        const today = new Date().toISOString().split("T")[0];

        const showLatestMap = new Map<string, any>();
        const episodeEntries: any[] = [];
        const movieEntries: any[] = [];

        for (const sub of subtitles ?? []) {
          const isEp = isSeriesRow(sub);
          const date = sub.updated_at
            ? new Date(sub.updated_at).toISOString().split("T")[0]
            : sub.created_at
            ? new Date(sub.created_at).toISOString().split("T")[0]
            : today;

          if (isEp) {
            episodeEntries.push({
              url: `${BASE_URL}/episode/${sub.id}`,
              date,
              changefreq: "monthly",
              priority: "0.7",
              title: escapeXml(sub.title || "Episode Subtitle"),
              image_url: sub.image_url,
            });

            const showKey = cleanShowName(parseTitle(sub.title || "").showName).toLowerCase() || `id:${sub.id}`;
            const existing = showLatestMap.get(showKey);
            if (!existing || new Date(sub.created_at) > new Date(existing.created_at)) {
              showLatestMap.set(showKey, sub);
            }
          } else {
            movieEntries.push({
              url: `${BASE_URL}/content/${sub.id}`,
              date,
              changefreq: "weekly",
              priority: "0.9",
              title: escapeXml(sub.title || "Movie Subtitle"),
              image_url: sub.image_url,
            });
          }
        }

        const seriesHubEntries: any[] = [];
        for (const latestSub of showLatestMap.values()) {
          const showName = cleanShowName(parseTitle(latestSub.title || "").showName);
          const date = latestSub.updated_at
            ? new Date(latestSub.updated_at).toISOString().split("T")[0]
            : latestSub.created_at
            ? new Date(latestSub.created_at).toISOString().split("T")[0]
            : today;

          seriesHubEntries.push({
            url: `${BASE_URL}/content/${latestSub.id}`,
            date,
            changefreq: "weekly",
            priority: "0.9",
            title: escapeXml(`${showName} Sinhala Subtitles`),
            image_url: latestSub.image_url,
          });
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
        xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

        // 1. Core Top-Level Pages
        const staticPages = [
          { url: `${BASE_URL}/`, priority: "1.0", changefreq: "daily", title: "PixelPopLK — Sinhala Subtitles for Movies & TV Series", image: `${BASE_URL}/og-banner.png` },
          { url: `${BASE_URL}/movies`, priority: "0.9", changefreq: "daily", title: "Sinhala Subtitles for Movies — PixelPopLK", image: `${BASE_URL}/og-banner.png` },
          { url: `${BASE_URL}/tv-series`, priority: "0.9", changefreq: "daily", title: "Sinhala Subtitles for TV Series — PixelPopLK", image: `${BASE_URL}/og-banner.png` },
          { url: `${BASE_URL}/latest`, priority: "0.9", changefreq: "daily", title: "Latest Sinhala Subtitles — PixelPopLK", image: `${BASE_URL}/og-banner.png` },
        ];

        for (const p of staticPages) {
          xml += `  <url>\n`;
          xml += `    <loc>${p.url}</loc>\n`;
          xml += `    <lastmod>${today}</lastmod>\n`;
          xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
          xml += `    <priority>${p.priority}</priority>\n`;
          if (p.image) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${p.image}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(p.title)}</image:title>\n`;
            xml += `    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }

        // 2. Genre Pages
        for (const g of CORE_GENRES) {
          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/genres/${g}</loc>\n`;
          xml += `    <lastmod>${today}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        }

        // 3. Dynamic Entries
        const allItems = [...seriesHubEntries, ...movieEntries, ...episodeEntries];

        for (const item of allItems) {
          xml += `  <url>\n`;
          xml += `    <loc>${item.url}</loc>\n`;
          xml += `    <lastmod>${item.date}</lastmod>\n`;
          xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
          xml += `    <priority>${item.priority}</priority>\n`;
          if (item.image_url) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(item.image_url)}</image:loc>\n`;
            xml += `      <image:title>${item.title} — PixelPopLK</image:title>\n`;
            xml += `    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }

        xml += `</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});

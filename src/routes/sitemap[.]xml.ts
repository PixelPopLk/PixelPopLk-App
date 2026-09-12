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

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data: subtitles, error } = await supabase
          .from(SUBTITLES_TABLE)
          .select("id, created_at, updated_at, season, episode, genre, image_url, title")
          .order("created_at", { ascending: false });

        if (error) {
          return new Response("Error generating sitemap", { status: 500 });
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

        const allItems = [...seriesHubEntries, ...movieEntries, ...episodeEntries];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
        xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

        // Home Page
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>1.0</priority>\n`;
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${BASE_URL}/og-banner.png</image:loc>\n`;
        xml += `      <image:title>PixelPopLK — Sinhala Subtitles for Movies &amp; TV Series</image:title>\n`;
        xml += `    </image:image>\n`;
        xml += `  </url>\n`;

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

import { createFileRoute } from "@tanstack/react-router";
import { supabase, SUBTITLES_TABLE } from "@/integrations/supabase/client";
import { parseTitle, cleanShowName } from "@/lib/subtitles";

const BASE_URL = "https://pixelpoplk.pages.dev";

let lastKnownGoodSitemap: string | null = null;

function isSeriesRow(sub: any) {
  if (sub.season != null && sub.episode != null) return true;
  const g = (sub.genre ?? "").toLowerCase();
  if (
    g
      .split(/[,/|]/)
      .map((x: string) => x.trim())
      .includes("movie")
  )
    return false;
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

function sitemapDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now())
    return undefined;

  return date.toISOString().slice(0, 10);
}

/**
 * Pick one stable canonical URL for each TV show.
 * Prefer S01E01 because using the latest episode made the series URL change
 * every time a new episode was added, which is a poor canonical signal.
 * If S01E01 is unavailable, fall back to the oldest episode.
 */
function pickCanonicalSeriesRow(episodes: any[]) {
  return (
    episodes.find(
      (episode) =>
        Number(episode.season) === 1 && Number(episode.episode) === 1,
    ) ??
    [...episodes].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )[0]
  );
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Supabase/PostgREST commonly caps a single REST response at 1,000 rows.
        // Page through the catalog so the sitemap keeps all subtitle URLs as the
        // library grows instead of silently dropping older entries.
        const SITEMAP_PAGE_SIZE = 1000;
        const subtitles: any[] = [];
        let offset = 0;

        while (true) {
          const { data, error } = await supabase
            .from(SUBTITLES_TABLE)
            .select(
              "id, created_at, updated_at, season, episode, genre, image_url, title",
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + SITEMAP_PAGE_SIZE - 1);

          if (error) {
            console.error("Sitemap subtitle fetch failed:", error.message);
            catalogFetchFailed = true;
            break;
          }

          subtitles.push(...(data ?? []));
          if (!data || data.length < SITEMAP_PAGE_SIZE) break;
          offset += SITEMAP_PAGE_SIZE;
        }
        // Do not publish or cache a partial sitemap. A transient catalog failure must
        // fall back to a safe minimal sitemap instead.
        let catalogFetchFailed = false;

        const showEpisodesMap = new Map<string, any[]>();
        const episodeEntries: any[] = [];
        const movieEntries: any[] = [];

        for (const sub of subtitles ?? []) {
          const isEp = isSeriesRow(sub);
          const date =
            sitemapDate(sub.updated_at) ?? sitemapDate(sub.created_at);

          if (isEp) {
            episodeEntries.push({
              url: `${BASE_URL}/episode/${sub.id}`,
              date,
              changefreq: "monthly",
              priority: "0.7",
              title: escapeXml(sub.title || "Episode Subtitle"),
              image_url: sub.image_url,
            });

            const showKey =
              cleanShowName(parseTitle(sub.title || "").showName).toLowerCase() ||
              `id:${sub.id}`;
            const group = showEpisodesMap.get(showKey) ?? [];
            group.push(sub);
            showEpisodesMap.set(showKey, group);
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
        for (const episodes of showEpisodesMap.values()) {
          const canonicalRow = pickCanonicalSeriesRow(episodes);
          if (!canonicalRow) continue;

          const showName = cleanShowName(
            parseTitle(canonicalRow.title || "").showName,
          );
          // The series hub represents the whole show, so its lastmod must reflect
          // the newest episode change—not just the S01E01 canonical row.
          const latestEpisodeDate = episodes.reduce<string | undefined>(
            (latest, episode) => {
              const candidate =
                sitemapDate(episode.updated_at) ??
                sitemapDate(episode.created_at);
              if (!candidate) return latest;
              if (!latest) return candidate;
              return candidate > latest ? candidate : latest;
            },
            undefined,
          );
          const date = latestEpisodeDate;

          seriesHubEntries.push({
            url: `${BASE_URL}/content/${canonicalRow.id}`,
            date,
            changefreq: "weekly",
            priority: "0.9",
            title: escapeXml(`${showName} Sinhala Subtitles`),
            image_url: canonicalRow.image_url,
          });
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
        xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

        const staticPages = [
          {
            url: `${BASE_URL}/`,
            priority: "1.0",
            changefreq: "daily",
            title: "PixelPopLK — Sinhala Subtitles for Movies & TV Series",
            image: `${BASE_URL}/og-banner.png`,
          },
          {
            url: `${BASE_URL}/movies`,
            priority: "0.9",
            changefreq: "daily",
            title: "Sinhala Subtitles for Movies — PixelPopLK",
            image: `${BASE_URL}/og-banner.png`,
          },
          {
            url: `${BASE_URL}/tv-series`,
            priority: "0.9",
            changefreq: "daily",
            title: "Sinhala Subtitles for TV Series — PixelPopLK",
            image: `${BASE_URL}/og-banner.png`,
          },
          {
            url: `${BASE_URL}/latest`,
            priority: "0.8",
            changefreq: "daily",
            title: "Latest Sinhala Subtitles — PixelPopLK",
            image: `${BASE_URL}/og-banner.png`,
          },
        ];

        for (const p of staticPages) {
          xml += `  <url>\n`;
          xml += `    <loc>${p.url}</loc>\n`;
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

        for (const g of CORE_GENRES) {
          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/genres/${g}</loc>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        }

        // Sitemap contains only canonical landing URLs plus unique episode URLs.
        const seenUrls = new Set<string>();
        const allItems = [
          ...seriesHubEntries,
          ...movieEntries,
          ...episodeEntries,
        ];

        for (const item of allItems) {
          if (seenUrls.has(item.url)) continue;
          seenUrls.add(item.url);

          xml += `  <url>\n`;
          xml += `    <loc>${item.url}</loc>\n`;
          if (item.date) xml += `    <lastmod>${item.date}</lastmod>\n`;
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

        if (catalogFetchFailed) {
          console.warn(
            "Sitemap catalog fetch was incomplete; serving a safe non-cacheable fallback.",
          );
          return new Response(
            lastKnownGoodSitemap ??
              `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${BASE_URL}/</loc></url></urlset>`,
            {
              status: 200,
              headers: {
                "Content-Type": "application/xml; charset=utf-8",
                "Cache-Control": "no-store, max-age=0",
              },
            },
          );
        }

        lastKnownGoodSitemap = xml;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});

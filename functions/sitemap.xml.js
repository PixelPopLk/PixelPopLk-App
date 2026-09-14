// 🟢 Cloudflare Pages Serverless Sitemap Function
// Mirrors build-time sitemap generator so runtime requests always get accurate indexable URLs
function cleanShowName(raw) {
  return (raw || "")
    .replace(/[._]+/g, " ")
    .replace(/\s+-\s+$/, "")
    .replace(/[\s\-:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTitle(title) {
  if (!title) return { showName: "" };

  let m = title.match(/^(.*?)[\s._-]*[Ss](\d{1,2})[\s._-]*[Ee](\d{1,3})(?:[\s._-]+(.+))?$/);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: +m[2], episode: +m[3] } };

  m = title.match(/^(.*?)[\s._-]+Season[\s._-]?(\d{1,2})[\s._-]+Episode[\s._-]?(\d{1,3})(?:[\s._-]+(.+))?$/i);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: +m[2], episode: +m[3] } };

  m = title.match(/^(.*?)[\s._-]+(\d{1,2})x(\d{1,3})(?:[\s._-]+(.+))?$/);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: +m[2], episode: +m[3] } };

  m = title.match(/^(.*?)[\s._-]+(?:Episode|Epi|Ep)[\s._-]?(\d{1,3})(?:[\s._-]+(.+))?$/i);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: 1, episode: +m[2] } };

  return { showName: title.trim() };
}

function num(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function isSeriesRow(row) {
  const sNum = num(row.season);
  const eNum = num(row.episode);
  if (sNum != null && eNum != null) return true;

  const g = (row.genre ?? "").toLowerCase();
  if (g.split(/[,/|]/).map((x) => x.trim()).includes("movie")) return false;

  return parseTitle(row.title ?? "").episode != null;
}

function safeDate(value, fallback) {
  if (!value) return fallback;
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return fallback;
  }
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

export async function onRequest(context) {
  const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL || "https://gilnzvsnkwrnfbwhobow.supabase.co";
  const SUPABASE_ANON_KEY = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY || "sb_publishable_ZWL-aXdaOXfnYKKaTJO58w_FIya45KL";
  const BASE_URL = context.env.VITE_SITE_URL || "https://pixelpoplk.pages.dev";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subtitles?select=id,created_at,updated_at,title,genre,season,episode,image_url&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) {
      return new Response(`Failed to fetch: ${res.status}`, { status: 502 });
    }

    const subtitles = await res.json();
    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Static Core Landing Pages
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

    // 2. Genre Landing Pages
    for (const g of CORE_GENRES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/genres/${g}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // 3. Dynamic Subtitle Pages
    const showLatestMap = new Map();
    const episodeEntries = [];
    const movieEntries = [];

    for (const sub of subtitles) {
      const isEp = isSeriesRow(sub);
      const date = safeDate(sub.updated_at || sub.created_at, today);

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

    const seriesHubEntries = [];
    for (const latestSub of showLatestMap.values()) {
      const showName = cleanShowName(parseTitle(latestSub.title || "").showName);
      const date = safeDate(latestSub.updated_at || latestSub.created_at, today);
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
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}

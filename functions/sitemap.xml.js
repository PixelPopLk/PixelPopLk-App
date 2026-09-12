// 🟢 Mirrors src/lib/subtitles.ts (parseTitle / isSeriesRow / buildGridItems)
// just enough to group rows the same way the app does, so the sitemap lists
// canonical URLs: one per movie, one per TV series "hub" page, plus one per individual episode.
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

export async function onRequest(context) {
  // Cloudflare Environment Variables වලින් Keys අදිනවා
  const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL || "https://gilnzvsnkwrnfbwhobow.supabase.co";
  const SUPABASE_ANON_KEY = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY || "sb_publishable_ZWL-aXdaOXfnYKKaTJO58w_FIya45KL";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  try {
    // Supabase REST API එකෙන් Subtitles වල Data අදිනවා
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subtitles?select=id,created_at,updated_at,title,genre,season,episode,image_url&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Range: "0-99999",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Supabase error: ${res.status}`);
    }

    const subtitles = await res.json();
    const baseUrl = "https://pixelpoplk.pages.dev";
    const today = new Date().toISOString().split("T")[0];

    const showLatestMap = new Map();
    const episodeEntries = [];
    const movieEntries = [];

    for (const sub of subtitles) {
      const isEp = isSeriesRow(sub);
      const date = safeDate(sub.updated_at || sub.created_at, today);

      if (isEp) {
        episodeEntries.push({
          url: `${baseUrl}/episode/${sub.id}`,
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
          url: `${baseUrl}/content/${sub.id}`,
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
        url: `${baseUrl}/content/${latestSub.id}`,
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

    // 1. Home Page
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `    <image:image>\n`;
    xml += `      <image:loc>${baseUrl}/og-banner.png</image:loc>\n`;
    xml += `      <image:title>PixelPopLK — Sinhala Subtitles for Movies &amp; TV Series</image:title>\n`;
    xml += `    </image:image>\n`;
    xml += `  </url>\n`;

    // 2. Dynamic Items
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
  } catch (err) {
    return new Response("Failed to generate sitemap", { status: 500 });
  }
}

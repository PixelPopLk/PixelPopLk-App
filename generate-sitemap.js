import fs from 'fs';

// Environment Variables කියවා ගැනීම
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://gilnzvsnkwrnfbwhobow.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_ZWL-aXdaOXfnYKKaTJO58w_FIya45KL";
const BASE_URL = process.env.VITE_SITE_URL || "https://pixelpoplk.pages.dev";

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

const escapeXml = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const safeDate = (value, fallback) => {
  if (!value) return fallback;
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return fallback;
  }
};

async function generateSitemap() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in environment!");
    console.warn("Skipping sitemap generation for this build.");
    return;
  }

  try {
    console.log("Fetching latest subtitles from Supabase...");

    // Supabase REST API එකෙන් සියලුම සබ්ටයිටල් ලබා ගැනීම (Range 0-99999 දමා 1000 Limit එක Bypass කර ඇත)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subtitles?select=id,title,created_at,updated_at,season,episode,genre,image_url&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Range: "0-99999",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Supabase returned status: ${res.status}`);
    }

    const subtitles = await res.json();
    console.log(`Found ${subtitles.length} subtitles in database.`);

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Home Page එක සිතියමට එකතු කිරීම
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

    // 2. Subtitles වර්ගීකරණය: Movies, Series Hubs සහ Episodes
    const showLatestMap = new Map();
    const episodeEntries = [];
    const movieEntries = [];

    for (const sub of subtitles) {
      const isEp = isSeriesRow(sub);
      const date = safeDate(sub.updated_at || sub.created_at, today);

      if (isEp) {
        // Individual Episode entry
        episodeEntries.push({
          url: `${BASE_URL}/episode/${sub.id}`,
          date,
          changefreq: "monthly",
          priority: "0.7",
          title: escapeXml(sub.title || "Episode Subtitle"),
          image_url: sub.image_url,
        });

        // TV Series Hub එක සඳහා Show name අනුව latest row එක track කිරීම
        const showKey = cleanShowName(parseTitle(sub.title || "").showName).toLowerCase() || `id:${sub.id}`;
        const existing = showLatestMap.get(showKey);
        if (!existing || new Date(sub.created_at) > new Date(existing.created_at)) {
          showLatestMap.set(showKey, sub);
        }
      } else {
        // Movie entry
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

    // 3. Series Hub Pages (/content/:id)
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

    console.log(
      `Sitemap Breakdown: Movies: ${movieEntries.length}, Series Hubs: ${seriesHubEntries.length}, Episodes: ${episodeEntries.length}`
    );

    // XML එකට සියලු entries එක් කිරීම
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

    const outDir = "./public";
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(`${outDir}/sitemap.xml`, xml);
    console.log("✅ Sitemap generated successfully at ./public/sitemap.xml!");
  } catch (err) {
    console.error("Failed to generate sitemap:", err);
    process.exit(1);
  }
}

generateSitemap();

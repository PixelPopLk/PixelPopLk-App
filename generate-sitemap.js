import fs from 'fs';

// Environment Variables කියවා ගැනීම
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://gilnzvsnkwrnfbwhobow.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_ZWL-aXdaOXfnYKKaTJO58w_FIya45KL";
const BASE_URL = process.env.VITE_SITE_URL || "https://pixelpoplk.pages.dev";

async function generateSitemap() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in environment!");
    console.warn("Skipping sitemap generation for this build.");
    return;
  }

  try {
    console.log("Fetching latest subtitles from Supabase...");
    
    // Supabase REST API එකෙන් සියලුම සබ්ටයිටල් ලබා ගැනීම (Range 0-99999 දමා 1000 Limit එක Bypass කර ඇත)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subtitles?select=id,created_at&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Range': '0-99999' // Row limit 1000 පැනලා යන සබ්ටයිටල් ප්‍රමාණයද ලබාගැනීමට
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase returned status: ${res.status}`);
    }

    const subtitles = await res.json();
    console.log(`Found ${subtitles.length} subtitles in database.`);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Home Page එක සිතියමට එකතු කිරීම
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 2. සියලුම උපසිරැසි පිටු (Movie/Series) සිතියමට එකතු කිරීම
    subtitles.forEach((sub) => {
      // Safe Date Formatting
      let date = new Date().toISOString().split('T')[0];
      if (sub.created_at) {
        try {
          date = new Date(sub.created_at).toISOString().split('T')[0];
        } catch {
          /* fallback to today */
        }
      }

      // 🎬 Main Content/Movie Page (/content/id)
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/content/${sub.id}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    // 📂 './public' ෆෝල්ඩරය සෑදී නොමැති නම් එය ස්වයංක්‍රීයවම සාදයි (ENOENT Error වැළැක්වීම)
    const outDir = './public';
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

export async function onRequest(context) {
  // Cloudflare Environment Variables වලින් Keys අදිනවා
  const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  try {
    // Supabase REST API එකෙන් Subtitles වල Data අදිනවා
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subtitles?select=id,created_at&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase error: ${res.status}`);
    }

    const subtitles = await res.json();
    const baseUrl = "https://pixelpoplk.pages.dev";

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Home Page
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 2. Movie / Series Pages (Auto update වෙන කොටස)
    subtitles.forEach((sub) => {
      const date = new Date(sub.created_at).toISOString().split('T')[0];
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/content/${sub.id}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (err) {
    return new Response("Failed to generate sitemap", { status: 500 });
  }
}

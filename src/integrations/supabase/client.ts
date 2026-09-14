import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gilnzvsnkwrnfbwhobow.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZWL-aXdaOXfnYKKaTJO58w_FIya45KL";

export type Subtitle = {
  id: number | string;
  created_at: string;
  updated_at?: string | null;
  title: string;
  download_link: string;
  telegram_link?: string | null;
  image_url: string;
  genre?: string | null;
  description?: string | null;
  rating?: number | string | null;
  year?: number | string | null;
  season?: number | string | null;
  episode?: number | string | null;
  download_count?: number | null;
  direct_downloads?: number | null;
  telegram_downloads?: number | null;
  metatags?: string | null;
  has_telegram?: boolean | null;
  // SEO fields (populated after the SEO migration is applied)
  slug?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  content_type?: "movie" | "series" | string | null;
  language?: string | null;
  release_date?: string | null;
  imdb_id?: string | null;
  indexable?: boolean | null;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const SUBTITLES_TABLE = "subtitles";

export const SUBTITLE_COLUMNS =
  "id, created_at, updated_at, title, download_link, telegram_link, image_url, genre, description, rating, year, season, episode, download_count, direct_downloads, telegram_downloads, slug, seo_title, seo_description, canonical_url, content_type, language, release_date, imdb_id, indexable";

export const SAFE_SUBTITLE_COLUMNS =
  "id, created_at, updated_at, title, image_url, genre, description, rating, year, season, episode, download_count, direct_downloads, telegram_downloads, slug, seo_title, seo_description, canonical_url, content_type, language, release_date, imdb_id, indexable";

export function logDownload(subtitleId: number | string | null | undefined, variant: string = "direct") {
  if (subtitleId == null) return;
  const idNum = typeof subtitleId === "number" ? subtitleId : Number(subtitleId);
  if (Number.isNaN(idNum)) return;

  const normalizedVariant = variant === "telegram" ? "telegram" : "direct";

  supabase
    .rpc("log_subtitle_download", { p_subtitle_id: idNum, p_variant: normalizedVariant })
    .then(({ error }) => {
      if (error) console.warn("logDownload failed:", error.message);
    });
}

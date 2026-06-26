import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gilnzvsnkwrnfbwhobow.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZWL-aXdaOXfnYKKaTJO58w_FIya45KL";

export type Subtitle = {
  id: number | string;
  created_at: string;
  title: string;
  download_link: string;
  image_url: string;
  genre?: string | null;
  description?: string | null;
  rating?: number | string | null;
  year?: number | string | null;
  season?: number | string | null;
  episode?: number | string | null;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const SUBTITLES_TABLE = "subtitles";
export const SUBTITLE_COLUMNS =
  "id, created_at, title, download_link, image_url, genre, description, rating, year, season, episode";

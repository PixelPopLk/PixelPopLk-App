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
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }, // 🟢 Admin Dashboard එකෙන් Logout නොවී රැඳී සිටීමට persistSession සක්‍රීය කර ඇත
});

export const SUBTITLES_TABLE = "subtitles";

// 🟢 අලුත් direct_downloads සහ telegram_downloads columns මෙයට ඇතුළත් කර ඇත
export const SUBTITLE_COLUMNS =
  "id, created_at, updated_at, title, download_link, telegram_link, image_url, genre, description, rating, year, season, episode, download_count, direct_downloads, telegram_downloads";

// 🟢 Build Error එක විසඳීමට SAFE_SUBTITLE_COLUMNS මෙහි Export කර ඇත
export const SAFE_SUBTITLE_COLUMNS = SUBTITLE_COLUMNS;

// 🟢 Download analytics — logs one event + bumps direct vs telegram counters via atomic RPC
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

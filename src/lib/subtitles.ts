import type { Subtitle } from "@/integrations/supabase/client";

export type EpisodeInfo = { season: number; episode: number; episodeTitle?: string };
export type ParsedTitle = { showName: string; episode?: EpisodeInfo };

export function cleanShowName(raw: string) {
  return raw
    .replace(/[._]+/g, " ")
    .replace(/\s+-\s+$/, "")
    .replace(/[\s\-:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTitle(title: string): ParsedTitle {
  if (!title) return { showName: "" };
  let m = title.match(/^(.*?)[\s._\-]*[Ss](\d{1,2})[\s._\-]*[Ee](\d{1,3})(?:[\s._\-]+(.+))?$/);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: +m[2], episode: +m[3], episodeTitle: m[4]?.trim() } };
  m = title.match(/^(.*?)[\s._\-]+Season[\s._\-]?(\d{1,2})[\s._\-]+Episode[\s._\-]?(\d{1,3})(?:[\s._\-]+(.+))?$/i);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: +m[2], episode: +m[3], episodeTitle: m[4]?.trim() } };
  m = title.match(/^(.*?)[\s._\-]+(\d{1,2})x(\d{1,3})(?:[\s._\-]+(.+))?$/);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: +m[2], episode: +m[3], episodeTitle: m[4]?.trim() } };
  
  // 🔥 අලුත් Pattern එක: "Title Episode 1" හෝ "Title Ep 2" වැනි දෑ සාර්ථකව TV Series ලෙස හඳුනාගනී
  m = title.match(/^(.*?)[\s._\-]+(?:Episode|Epi|Ep)[\s._\-]?(\d{1,3})(?:[\s._\-]+(.+))?$/i);
  if (m) return { showName: cleanShowName(m[1]), episode: { season: 1, episode: +m[2], episodeTitle: m[3]?.trim() } };
  
  return { showName: title.trim() };
}

export type SeriesEpisode = Subtitle & { season: number; episode: number; epTitle?: string };
export type GridItem =
  | { kind: "movie"; key: string; id: Subtitle["id"]; sub: Subtitle }
  | {
      kind: "series";
      key: string;
      id: Subtitle["id"]; // representative id (latest episode) used for routing
      showName: string;
      poster: string;
      latestDate: string;
      episodes: SeriesEpisode[];
    };

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

/** Series row if explicit season/episode cols present, OR title parses S/E AND genre is not "Movie". */
function isSeriesRow(s: Subtitle): EpisodeInfo | null {
  const sNum = num(s.season);
  const eNum = num(s.episode);
  if (sNum != null && eNum != null) return { season: sNum, episode: eNum };
  const g = (s.genre ?? "").toLowerCase();
  if (g.split(/[,/|]/).map((x) => x.trim()).includes("movie")) return null;
  const p = parseTitle(s.title ?? "");
  return p.episode ?? null;
}

export function buildGridItems(subs: Subtitle[]): GridItem[] {
  const groups = new Map<string, SeriesEpisode[]>();
  const movies: Subtitle[] = [];

  for (const s of subs) {
    const ep = isSeriesRow(s);
    if (ep) {
      const key = parseTitle(s.title).showName.toLowerCase();
      const list = groups.get(key) ?? [];
      list.push({ ...s, season: ep.season, episode: ep.episode, epTitle: ep.episodeTitle });
      groups.set(key, list);
    } else {
      movies.push(s);
    }
  }

  const seriesItems: GridItem[] = Array.from(groups.entries()).map(([key, eps]) => {
    const sorted = [...eps].sort((a, b) => a.season - b.season || a.episode - b.episode);
    const latest = [...eps].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
    const showName = cleanShowName(parseTitle(latest.title).showName);
    return {
      kind: "series",
      key: `series:${key}`,
      id: latest.id,
      showName,
      poster: latest.image_url,
      latestDate: latest.created_at,
      episodes: sorted,
    };
  });

  const movieItems: GridItem[] = movies.map((s) => ({
    kind: "movie",
    key: `movie:${s.id}`,
    id: s.id,
    sub: s,
  }));

  return [...seriesItems, ...movieItems].sort((a, b) => {
    const da = a.kind === "movie" ? a.sub.created_at : a.latestDate;
    const db = b.kind === "movie" ? b.sub.created_at : b.latestDate;
    return +new Date(db) - +new Date(da);
  });
}

export function itemTitle(it: GridItem) {
  return it.kind === "movie" ? it.sub.title : it.showName;
}
export function itemPoster(it: GridItem) {
  return it.kind === "movie" ? it.sub.image_url : it.poster;
}
export function itemDate(it: GridItem) {
  return it.kind === "movie" ? it.sub.created_at : it.latestDate;
}

export function splitGenres(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[,/|]/).map((g) => g.trim()).filter(Boolean);
}

// 🔥 Genres ඩබල් වීම් (Duplicates) 100% ක්ම වළක්වාලන පරිදි සකසන ලද ශ්‍රිතය (Case-Insensitive Deduplication)
export function itemGenres(it: GridItem): string[] {
  const raw = it.kind === "movie" ? [it.sub.genre] : it.episodes.map((e) => e.genre);
  const allGenres = raw.flatMap((g) => splitGenres(g)).map((g) => g.trim());
  
  const uniqueSet = new Set<string>();
  allGenres.forEach(g => {
    if (g) {
      uniqueSet.add(g.toUpperCase()); // සියල්ලම සමානව Uppercase ලෙස සේව් කර ගනී
    }
  });
  return Array.from(uniqueSet);
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function formatRating(r: number | string | null | undefined) {
  if (r == null || r === "") return null;
  const n = typeof r === "number" ? r : parseFloat(String(r));
  if (Number.isNaN(n)) return String(r);
  return n.toFixed(1);
}

// Deterministic color badge per genre
const GENRE_PALETTE = [
  "bg-red-500/15 text-red-300 border-red-500/30",
  "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "bg-lime-500/15 text-lime-300 border-lime-500/30",
];
export function genreBadgeClass(g: string) {
  let h = 0;
  for (let i = 0; i < g.length; i++) h = (h * 31 + g.charCodeAt(i)) >>> 0;
  return GENRE_PALETTE[h % GENRE_PALETTE.length];
}

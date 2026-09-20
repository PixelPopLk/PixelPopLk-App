type SeoDescriptionInput = {
  metatags?: string | null;
  description?: string | null;
  title: string;
  year?: string | number | null;
  genres?: string[];
  kind: "movie" | "series" | "episode";
  showName?: string;
  season?: string | number | null;
  episode?: string | number | null;
  episodeTitle?: string;
};

const MAX_DESCRIPTION_LENGTH = 160;

type MetadataQueryResult<T> = {
  data: T;
  error: { code?: string } | null;
};

/**
 * Old deployments can have column-level anonymous SELECT grants that omit
 * `metatags`. Keep content pages available while the accompanying SQL grant
 * is being applied, then automatically use the editor metadata afterwards.
 */
export async function queryWithMetaFallback<T>(
  request: (columns: string) => PromiseLike<MetadataQueryResult<T>>,
  metadataColumns: string,
  fallbackColumns: string,
) {
  const metadataResult = await request(metadataColumns);
  if (metadataResult.error?.code !== "42501") return metadataResult;

  return request(fallbackColumns);
}

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateDescription(value: string) {
  if (value.length <= MAX_DESCRIPTION_LENGTH) return value;

  const truncated = value.slice(0, MAX_DESCRIPTION_LENGTH - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated).trim()}…`;
}

/** Uses the editor-controlled Supabase `metatags` field before fallbacks. */
export function buildSeoDescription(input: SeoDescriptionInput) {
  const editorDescription = cleanText(input.metatags);
  if (editorDescription) return truncateDescription(editorDescription);

  const contentDescription = cleanText(input.description);
  if (contentDescription) return truncateDescription(contentDescription);

  const genreText = input.genres?.filter(Boolean).slice(0, 2).join(" and ");
  const yearText = input.year ? ` (${input.year})` : "";

  if (input.kind === "episode") {
    const episodeCode = `Season ${input.season} Episode ${input.episode}`;
    const episodeName = input.episodeTitle ? `, ${input.episodeTitle}` : "";
    return truncateDescription(
      `Download the Sinhala subtitle for ${input.showName} ${episodeCode}${episodeName}. Synced subtitle file for this episode on PixelPopLK.`,
    );
  }

  if (input.kind === "series") {
    return truncateDescription(
      `Browse Sinhala subtitles for ${input.title}${yearText}, including available seasons and episodes${genreText ? ` in ${genreText}` : ""}, on PixelPopLK.`,
    );
  }

  return truncateDescription(
    `Download the Sinhala subtitle for ${input.title}${yearText}${genreText ? `, a ${genreText} movie` : ""}. Find a synced subtitle file on PixelPopLK.`,
  );
}

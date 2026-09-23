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

const MIN_DESCRIPTION_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 160;

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

function addContext(value: string, context: string) {
  const withContext = `${value} ${context}`.trim();
  if (withContext.length >= MIN_DESCRIPTION_LENGTH) return withContext;
  return `${withContext} නවතම චිත්‍රපට සහ TV series උපසිරැසි සඳහා PixelPopLK වෙත අදම පිවිසෙන්න.`;
}

/** Uses the editor-controlled Supabase `metatags` field before fallbacks. */
export function buildSeoDescription(input: SeoDescriptionInput) {
  const editorDescription = cleanText(input.metatags);
  const contentDescription = cleanText(input.description);
  const genreText = input.genres?.filter(Boolean).slice(0, 2).join(" and ");
  const yearText = input.year ? ` (${input.year})` : "";

  const seoContext =
    "PixelPopLK වෙතින් Sinhala subtitles සහ Telegram download link ලබාගන්න.";
  const sourceDescription = editorDescription || contentDescription;

  // Preserve the editor's story summary from Supabase, then add a short
  // Sinhala SEO context when it needs more detail for a search snippet.
  if (sourceDescription) {
    return truncateDescription(addContext(sourceDescription, seoContext));
  }

  if (input.kind === "episode") {
    const episodeCode = `Season ${input.season} Episode ${input.episode}`;
    const episodeName = input.episodeTitle ? `, ${input.episodeTitle}` : "";
    return truncateDescription(
      `${input.showName} ${episodeCode}${episodeName} සඳහා සිංහල උපසිරැසි ලබාගන්න. මෙම episode එකට ගැළපෙන Sinhala subtitle සහ Telegram download link PixelPopLK වෙතින් ලබාගත හැක.`,
    );
  }

  if (input.kind === "series") {
    return truncateDescription(
      `${input.title}${yearText} TV Series සඳහා සිංහල උපසිරැසි බලන්න. සියලු seasons සහ episodes${genreText ? ` (${genreText})` : ""} සඳහා Sinhala subtitles සහ Telegram download links PixelPopLK වෙතින් ලබාගන්න.`,
    );
  }

  return truncateDescription(
    `${input.title}${yearText}${genreText ? ` ${genreText} චිත්‍රපටය සඳහා` : " සඳහා"} සිංහල උපසිරැසි ලබාගන්න. ගැළපෙන Sinhala subtitle සහ Telegram download link PixelPopLK වෙතින් පහසුවෙන් බාගත කරන්න, නවතම updates සමඟ.`,
  );
}

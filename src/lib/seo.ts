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

function truncateDescription(value: string) {
  if (value.length <= MAX_DESCRIPTION_LENGTH) return value;

  const truncated = value.slice(0, MAX_DESCRIPTION_LENGTH - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated).trim()}…`;
}

/** Builds consistent, page-type-specific SEO descriptions for PixelPopLK. */
export function buildSeoDescription(input: SeoDescriptionInput) {
  const name = input.kind === "episode" ? (input.showName || input.title) : input.title;

  if (input.kind === "episode") {
    const code = `S${String(input.season ?? 1).padStart(2, "0")}E${String(input.episode ?? 1).padStart(2, "0")}`;
    return truncateDescription(
      `${name} ${code} සිංහල උපසිරැසි සමඟ බලන්න. Free Download with Sinhala Subtitles. Download ${name} ${code} Sinhala Subtitles on PixelPopLK.`,
    );
  }

  if (input.kind === "series") {
    return truncateDescription(
      `${name} සිංහල උපසිරැසි සමඟ බලන්න. All Seasons Free Download with Sinhala Subtitles. Download ${name} Sinhala Subtitles on PixelPopLK.`,
    );
  }

  return truncateDescription(
    `${name} සිංහල උපසිරැසි සමඟ බලන්න. Free Download with Sinhala Subtitles. Download ${name} Sinhala Subtitles on PixelPopLK.`,
  );
}

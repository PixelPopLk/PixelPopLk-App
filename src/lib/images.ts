const SUPABASE_STORAGE_RE = /^(https?:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+)$/i;
const TMDB_IMAGE_RE = /^(https?:\/\/image\.tmdb\.org\/t\/p\/)([^/]+)\/(.+)$/i;

export type ResponsiveImageConfig = {
  widths: number[];
  sizes: string;
  quality?: number;
};

export function optimizeImageUrl(
  sourceUrl: string | null | undefined,
  width: number,
  quality = 72,
): string | undefined {
  if (!sourceUrl?.trim()) return undefined;

  const raw = sourceUrl.trim();

  try {
    const supabaseMatch = raw.match(SUPABASE_STORAGE_RE);
    if (supabaseMatch) {
      const url = new URL(
        supabaseMatch[1] + "/storage/v1/render/image/public/" + supabaseMatch[2],
      );
      url.searchParams.set("width", String(width));
      url.searchParams.set("quality", String(quality));
      url.searchParams.set("format", "webp");
      url.searchParams.set("resize", "contain");
      return url.toString();
    }

    const tmdbMatch = raw.match(TMDB_IMAGE_RE);
    if (tmdbMatch) {
      return raw.replace(
        TMDB_IMAGE_RE,
        (_match, prefix: string, _currentSize: string, path: string) =>
          prefix + "w" + width + "/" + path,
      );
    }
  } catch {
    // Fall back to the original URL for malformed or unsupported image hosts.
  }

  return raw;
}

export function getResponsiveImageProps(
  sourceUrl: string | null | undefined,
  config: ResponsiveImageConfig,
) {
  const source = sourceUrl?.trim();
  if (!source) {
    return { src: undefined, srcSet: undefined, sizes: config.sizes };
  }

  const urls = config.widths
    .map((width) => optimizeImageUrl(source, width, config.quality))
    .filter((value): value is string => Boolean(value));

  const canTransform = urls.some((url) => url !== source);
  return {
    src: canTransform
      ? optimizeImageUrl(source, config.widths[0], config.quality)
      : source,
    srcSet: canTransform
      ? config.widths
          .map((width, index) => {
            const url = urls[index];
            return url ? url + " " + width + "w" : null;
          })
          .filter((value): value is string => Boolean(value))
          .join(", "),
      : undefined,
    sizes: config.sizes,
  };
}
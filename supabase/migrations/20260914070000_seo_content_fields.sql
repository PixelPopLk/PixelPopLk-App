-- SEO content model for subtitle pages.
-- Additive migration: preserves all existing rows and does not remove existing columns.

ALTER TABLE public.subtitles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS release_date date,
  ADD COLUMN IF NOT EXISTS imdb_id text,
  ADD COLUMN IF NOT EXISTS indexable boolean NOT NULL DEFAULT true;

-- Normalize the new classification fields for existing rows without inventing release dates.
UPDATE public.subtitles
SET
  content_type = CASE
    WHEN season IS NOT NULL OR episode IS NOT NULL THEN 'series'
    ELSE 'movie'
  END
WHERE content_type IS NULL OR content_type = '';

UPDATE public.subtitles
SET language = 'si'
WHERE language IS NULL OR language = '';

-- Stable, collision-safe fallback slugs for existing rows.
-- Editors can later replace these with cleaner slugs without changing the source title.
UPDATE public.subtitles
SET slug = regexp_replace(
  lower(trim(regexp_replace(coalesce(title, 'subtitle'), '[^a-zA-Z0-9]+', '-', 'g'))),
  '(^-+|-+$)', '', 'g'
) || '-' || id::text
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS subtitles_slug_key
  ON public.subtitles (slug);

CREATE INDEX IF NOT EXISTS subtitles_content_type_index
  ON public.subtitles (content_type);

CREATE INDEX IF NOT EXISTS subtitles_indexable_created_at_index
  ON public.subtitles (indexable, created_at DESC);

CREATE INDEX IF NOT EXISTS subtitles_language_index
  ON public.subtitles (language);

CREATE INDEX IF NOT EXISTS subtitles_imdb_id_index
  ON public.subtitles (imdb_id)
  WHERE imdb_id IS NOT NULL;

-- Keep canonical_url optional: the application can generate the site's canonical URL
-- from slug until a custom canonical URL is explicitly stored.

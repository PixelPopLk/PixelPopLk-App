-- =====================================================================================
-- PixelPopLK — SEO Database Optimization & Slug Support Migration
-- =====================================================================================
-- උපදෙස් (Instructions):
-- මෙම SQL script එක ඔබේ Supabase Dashboard එකේ SQL Editor එකට copy-paste කර "RUN" කරන්න.
-- කිසිදු පැරණි දත්තයක් මකා නොදමනු ලබයි (Non-destructive, safe update).
-- =====================================================================================

-- 1. Subtitles වගුවට SEO-friendly 'slug' column එක එකතු කිරීම
ALTER TABLE IF EXISTS subtitles
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Slugify Function එකක් සෑදීම (Title එකෙන් URL-friendly slug එකක් සාදා ගැනීමට)
CREATE OR REPLACE FUNCTION generate_seo_slug(title_text TEXT, year_val INT DEFAULT NULL, item_id BIGINT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  clean_slug TEXT;
BEGIN
  IF title_text IS NULL OR TRIM(title_text) = '' THEN
    RETURN 'subtitle-' || COALESCE(item_id::TEXT, floor(random()*10000)::TEXT);
  END IF;

  -- Remove special characters, lowercase, replace spaces with hyphen
  clean_slug := lower(regexp_replace(trim(title_text), '[^a-zA-Z0-9\s-]', '', 'g'));
  clean_slug := regexp_replace(clean_slug, '[\s_-]+', '-', 'g');
  clean_slug := trim(both '-' from clean_slug);

  IF year_val IS NOT NULL AND year_val > 1900 AND year_val < 2100 THEN
    IF clean_slug NOT LIKE '%' || year_val::TEXT THEN
      clean_slug := clean_slug || '-' || year_val::TEXT;
    END IF;
  END IF;

  RETURN clean_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. දැනට තිබෙන සියලුම පේළි වලට (Existing Subtitles) slug generate කිරීම
-- Duplicates ඇතිවීම වැළැක්වීමට id අගය අවශ්‍ය තැන් වලදී භාවිතා කරයි
UPDATE subtitles
SET slug = generate_seo_slug(title, CASE WHEN year ~ '^[0-9]+$' THEN year::INT ELSE NULL END, id)
WHERE slug IS NULL OR slug = '';

-- Duplicate slugs තිබේ නම් id එක එකතු කර unique කිරීම
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rnum
  FROM subtitles
  WHERE slug IS NOT NULL
)
UPDATE subtitles s
SET slug = s.slug || '-' || s.id
FROM duplicates d
WHERE s.id = d.id AND d.rnum > 1;

-- 4. Fast Querying සඳහා Index සෑදීම (Google Search Crawlers වේගවත් කිරීමට)
CREATE INDEX IF NOT EXISTS idx_subtitles_slug ON subtitles (slug);
CREATE INDEX IF NOT EXISTS idx_subtitles_genre ON subtitles (genre);
CREATE INDEX IF NOT EXISTS idx_subtitles_created_at_desc ON subtitles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subtitles_season_ep ON subtitles (season, episode);
-- Homepage search indexes: supports fast partial title/genre filtering without loading the catalog.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_subtitles_title_trgm ON subtitles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_subtitles_genre_trgm ON subtitles USING GIN (genre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_subtitles_year ON subtitles (year);
CREATE INDEX IF NOT EXISTS idx_subtitles_rating ON subtitles (rating);

-- 5. අනාගතයේදී අලුතින් Subtitle එකක් Insert වන විට ස්වයංක්‍රීයව Slug එක හැදෙන Trigger එක
CREATE OR REPLACE FUNCTION trg_subtitles_auto_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR TRIM(NEW.slug) = '' THEN
    NEW.slug := generate_seo_slug(
      NEW.title, 
      CASE WHEN NEW.year IS NOT NULL AND NEW.year::TEXT ~ '^[0-9]+$' THEN NEW.year::INT ELSE NULL END, 
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_slug_before_insert ON subtitles;
CREATE TRIGGER trg_auto_slug_before_insert
BEFORE INSERT OR UPDATE OF title, year ON subtitles
FOR EACH ROW
EXECUTE FUNCTION trg_subtitles_auto_slug();

-- =====================================================================================
-- Verification Query:
-- ඔබගේ Slugs සාර්ථකව සැකසී ඇත්දැයි බැලීමට පහත query එක run කරන්න:
-- SELECT id, title, year, slug FROM subtitles ORDER BY created_at DESC LIMIT 20;
-- =====================================================================================


-- 6. Fast homepage search/filter RPC.
-- Remove the previous 6-argument overload so PostgREST has one unambiguous
-- function signature for homepage search.
DROP FUNCTION IF EXISTS public.search_homepage_subtitles(TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER);

-- Returns raw subtitle rows, but selection happens at the series/movie level:
-- movie cards are individually limited, while each selected TV series is returned
-- with its complete episode group. This keeps buildGridItems() authoritative.
CREATE OR REPLACE FUNCTION public.search_homepage_subtitles(
  p_query TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'all',
  p_genre TEXT DEFAULT NULL,
  p_year TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_movie_limit INTEGER DEFAULT 48,
  p_series_limit INTEGER DEFAULT 24
)
RETURNS SETOF JSONB
LANGUAGE sql
STABLE
SET pg_trgm.similarity_threshold = 0.12
SET pg_trgm.word_similarity_threshold = 0.20
AS $$
  WITH normalized AS (
    SELECT
      s.id,
      s.created_at,
      s.title,
      s.image_url,
      s.genre,
      s.description,
      s.rating,
      s.year,
      s.season,
      s.episode,
      CASE
        WHEN (
          s.season IS NOT NULL
          AND s.episode IS NOT NULL
        ) THEN true
        WHEN LOWER(COALESCE(s.genre, '')) LIKE '%movie%' THEN false
        WHEN s.title ~* '^.*[[:space:]._-]*[Ss][0-9]{1,2}[[:space:]._-]*[Ee][0-9]{1,3}([[:space:]._-]+.*)?$' THEN true
        WHEN s.title ~* '^.*[[:space:]._-]+Season[[:space:]._-]?[0-9]{1,2}[[:space:]._-]+Episode[[:space:]._-]?[0-9]{1,3}([[:space:]._-]+.*)?$' THEN true
        WHEN s.title ~* '^.*[[:space:]._-]+[0-9]{1,2}x[0-9]{1,3}([[:space:]._-]+.*)?$' THEN true
        WHEN s.title ~* '^.*[[:space:]._-]+(Episode|Epi|Ep)[[:space:]._-]?[0-9]{1,3}([[:space:]._-]+.*)?$' THEN true
        ELSE false
      END AS is_series,
      CASE
        WHEN NULLIF(TRIM(p_query), '') IS NULL
          OR LOWER(TRIM(p_query)) IN ('sub', 'subs', 'subtitle', 'subtitles', 'sinhala', 'film', 'movie')
          THEN 0::REAL
        ELSE GREATEST(
          similarity(s.title, TRIM(p_query)),
          word_similarity(TRIM(p_query), s.title)
        )
      END AS search_score,
      TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                LOWER(COALESCE(s.title, '')),
                '[[:space:]._-]*[Ss][0-9]{1,2}[[:space:]._-]*[Ee][0-9]{1,3}([[:space:]._-]+.*)?$',
                '',
                1, 0, 'i'
              ),
              '[[:space:]._-]+Season[[:space:]._-]?[0-9]{1,2}[[:space:]._-]+Episode[[:space:]._-]?[0-9]{1,3}([[:space:]._-]+.*)?$',
              '',
              1, 0, 'i'
            ),
            '[[:space:]._-]+[0-9]{1,2}x[0-9]{1,3}([[:space:]._-]+.*)?$',
            '',
            1, 0, 'i'
          ),
          '[[:space:]._-]+(Episode|Epi|Ep)[[:space:]._-]?[0-9]{1,3}([[:space:]._-]+.*)?$',
          '',
          1, 0, 'i'
        )
      ) AS show_key
    FROM public.subtitles s
  ),
  classified AS (
    SELECT
      n.*,
      LOWER(
        TRIM(
          REGEXP_REPLACE(
            REGEXP_REPLACE(n.show_key, '[._]+', ' ', 'g'),
            '[[:space:]]+',
            ' ',
            'g'
          )
        )
      ) AS normalized_show_key
    FROM normalized n
  ),
  filtered AS (
    SELECT *
    FROM classified
    WHERE
      (
        NULLIF(TRIM(p_query), '') IS NULL
        OR LOWER(TRIM(p_query)) IN ('sub', 'subs', 'subtitle', 'subtitles', 'sinhala', 'film', 'movie')
        OR title ILIKE '%' || TRIM(p_query) || '%'
        OR title % TRIM(p_query)
        OR TRIM(p_query) <% title
      )
      AND (
        NULLIF(TRIM(p_genre), '') IS NULL
        OR (
          LOWER(TRIM(p_genre)) IN ('sci-fi', 'sci fi', 'scifi', 'science fiction')
          AND (
            genre ILIKE '%sci-fi%'
            OR genre ILIKE '%scifi%'
            OR genre ILIKE '%sci fi%'
            OR genre ILIKE '%science fiction%'
          )
        )
        OR (
          LOWER(TRIM(p_genre)) <> 'sci-fi'
          AND genre ILIKE '%' || TRIM(p_genre) || '%'
        )
      )
      AND (
        NULLIF(TRIM(p_year), '') IS NULL
        OR (
          TRIM(p_year) = 'Older'
          AND CASE
            WHEN year::TEXT ~ '^[0-9]{4}$' THEN year::INT <= 2022
            ELSE false
          END
        )
        OR (
          TRIM(p_year) <> 'Older'
          AND year::TEXT = TRIM(p_year)
        )
      )
      AND (
        p_rating IS NULL
        OR CASE
          WHEN rating::TEXT ~ '^[0-9]+(\.[0-9]+)?$' THEN rating::NUMERIC >= p_rating
          ELSE false
        END
      )
      AND (
        p_type = 'all'
        OR (p_type = 'series' AND is_series)
        OR (p_type = 'movie' AND NOT is_series)
      )
  ),
  selected_movies AS (
    SELECT id
    FROM filtered
    WHERE NOT is_series
      AND p_type IN ('all', 'movie')
    ORDER BY search_score DESC, created_at DESC
    LIMIT GREATEST(0, LEAST(COALESCE(p_movie_limit, 48), 48))
  ),
  selected_series AS (
    SELECT normalized_show_key
    FROM filtered
    WHERE is_series
      AND NULLIF(normalized_show_key, '') IS NOT NULL
      AND p_type IN ('all', 'series')
    GROUP BY normalized_show_key
    ORDER BY MAX(search_score) DESC, MAX(created_at) DESC
    LIMIT GREATEST(0, LEAST(COALESCE(p_series_limit, 24), 24))
  ),
  selected_rows AS (
    SELECT c.*
    FROM classified c
    INNER JOIN selected_series ss
      ON ss.normalized_show_key = c.normalized_show_key

    UNION ALL

    SELECT c.*
    FROM classified c
    INNER JOIN selected_movies sm
      ON sm.id = c.id
  )
  SELECT jsonb_build_object(
    'id', id,
    'created_at', created_at,
    'title', title,
    'image_url', image_url,
    'genre', genre,
    'description', description,
    'rating', rating,
    'year', year,
    'season', season,
    'episode', episode
  )
  FROM selected_rows
  ORDER BY search_score DESC, created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.search_homepage_subtitles(TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER, INTEGER)
  TO anon, authenticated;
,
            '',
            'g'
          )
        )
      ) AS normalized_show_key
    FROM normalized n
  ),
  filtered AS (
    SELECT *
    FROM classified
    WHERE
      (
        NULLIF(TRIM(p_query), '') IS NULL
        OR LOWER(TRIM(p_query)) IN ('sub', 'subs', 'subtitle', 'subtitles', 'sinhala', 'film', 'movie')
        OR title ILIKE '%' || TRIM(p_query) || '%'
        OR title % TRIM(p_query)
        OR TRIM(p_query) <% title
      )
      AND (
        NULLIF(TRIM(p_genre), '') IS NULL
        OR (
          LOWER(TRIM(p_genre)) IN ('sci-fi', 'sci fi', 'scifi', 'science fiction')
          AND (
            genre ILIKE '%sci-fi%'
            OR genre ILIKE '%scifi%'
            OR genre ILIKE '%sci fi%'
            OR genre ILIKE '%science fiction%'
          )
        )
        OR (
          LOWER(TRIM(p_genre)) <> 'sci-fi'
          AND genre ILIKE '%' || TRIM(p_genre) || '%'
        )
      )
      AND (
        NULLIF(TRIM(p_year), '') IS NULL
        OR (
          TRIM(p_year) = 'Older'
          AND CASE
            WHEN year::TEXT ~ '^[0-9]{4}$' THEN year::INT <= 2022
            ELSE false
          END
        )
        OR (
          TRIM(p_year) <> 'Older'
          AND year::TEXT = TRIM(p_year)
        )
      )
      AND (
        p_rating IS NULL
        OR CASE
          WHEN rating::TEXT ~ '^[0-9]+(\.[0-9]+)?$' THEN rating::NUMERIC >= p_rating
          ELSE false
        END
      )
      AND (
        p_type = 'all'
        OR (p_type = 'series' AND is_series)
        OR (p_type = 'movie' AND NOT is_series)
      )
  ),
  selected_movies AS (
    SELECT id
    FROM filtered
    WHERE NOT is_series
      AND p_type IN ('all', 'movie')
    ORDER BY search_score DESC, created_at DESC
    LIMIT GREATEST(0, LEAST(COALESCE(p_movie_limit, 48), 48))
  ),
  selected_series AS (
    SELECT normalized_show_key
    FROM filtered
    WHERE is_series
      AND NULLIF(normalized_show_key, '') IS NOT NULL
      AND p_type IN ('all', 'series')
    GROUP BY normalized_show_key
    ORDER BY MAX(search_score) DESC, MAX(created_at) DESC
    LIMIT GREATEST(0, LEAST(COALESCE(p_series_limit, 24), 24))
  ),
  selected_rows AS (
    SELECT c.*
    FROM classified c
    INNER JOIN selected_series ss
      ON ss.normalized_show_key = c.normalized_show_key

    UNION ALL

    SELECT c.*
    FROM classified c
    INNER JOIN selected_movies sm
      ON sm.id = c.id
  )
  SELECT jsonb_build_object(
    'id', id,
    'created_at', created_at,
    'title', title,
    'image_url', image_url,
    'genre', genre,
    'description', description,
    'rating', rating,
    'year', year,
    'season', season,
    'episode', episode
  )
  FROM selected_rows
  ORDER BY search_score DESC, created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.search_homepage_subtitles(TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER, INTEGER)
  TO anon, authenticated;

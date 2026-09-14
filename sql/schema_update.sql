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

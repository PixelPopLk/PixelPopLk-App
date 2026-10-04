-- PixelPopLK SEO metadata permission repair
-- Safe to run independently after download_security.sql and safe to re-run.
-- It grants anonymous visitors access only to the editor-provided SEO field;
-- download_link and telegram_link remain private.

GRANT SELECT (metatags) ON TABLE public.subtitles TO anon;

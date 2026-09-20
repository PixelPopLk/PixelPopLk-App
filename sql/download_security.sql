-- PixelPopLK server-side download-link security migration
-- Run this once in Supabase SQL Editor before deploying the frontend.
-- Take a database backup first.

ALTER TABLE public.subtitles ENABLE ROW LEVEL SECURITY;

-- This safe flag lets the UI show the Telegram button without exposing or
-- filtering on telegram_link itself.
ALTER TABLE public.subtitles
  ADD COLUMN IF NOT EXISTS has_telegram boolean
  GENERATED ALWAYS AS (
    telegram_link IS NOT NULL AND btrim(telegram_link) <> ''
  ) STORED;

-- The public catalogue may expose metadata only. Raw download URLs are never
-- readable by anonymous browser requests.
REVOKE ALL ON TABLE public.subtitles FROM anon;
GRANT SELECT (
  id, created_at, updated_at, title, image_url, genre, description, rating,
  year, season, episode, download_count, direct_downloads, telegram_downloads,
  metatags, has_telegram
) ON TABLE public.subtitles TO anon;

-- Repairs deployments that applied the older column-level grant before
-- `metatags` became available for public SEO metadata.
GRANT SELECT (metatags) ON TABLE public.subtitles TO anon;

DROP POLICY IF EXISTS "public subtitle catalogue" ON public.subtitles;
CREATE POLICY "public subtitle catalogue"
  ON public.subtitles FOR SELECT TO anon USING (true);

-- Disable the old browser-callable RPC. The new RPC below can be called only
-- by the server using SUPABASE_SERVICE_ROLE_KEY.
DROP FUNCTION IF EXISTS public.get_single_download_link(bigint);

CREATE TABLE IF NOT EXISTS public.download_rate_limits (
  client_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  last_requested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.download_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.download_rate_limits FROM PUBLIC;

-- One server request can return one link. The row-level lock makes the limit
-- safe under concurrent requests: 15 links per client IP per rolling minute.
CREATE OR REPLACE FUNCTION public.claim_download_link(
  p_target_id bigint,
  p_variant text,
  p_client_key text
)
RETURNS TABLE(link text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit public.download_rate_limits%ROWTYPE;
  v_link text;
BEGIN
  IF p_target_id IS NULL OR p_target_id < 1
    OR p_variant NOT IN ('direct', 'telegram')
    OR p_client_key IS NULL OR length(p_client_key) = 0 THEN
    RAISE EXCEPTION 'invalid download request' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.download_rate_limits AS limits
    (client_key, window_started_at, request_count, last_requested_at)
  VALUES (left(p_client_key, 128), now(), 1, now())
  ON CONFLICT (client_key) DO UPDATE
  SET window_started_at = CASE
        WHEN limits.window_started_at <= now() - interval '1 minute' THEN now()
        ELSE limits.window_started_at
      END,
      request_count = CASE
        WHEN limits.window_started_at <= now() - interval '1 minute' THEN 1
        ELSE limits.request_count + 1
      END,
      last_requested_at = now()
  RETURNING * INTO v_limit;

  IF v_limit.request_count > 15 THEN
    RAISE EXCEPTION 'download request limit reached' USING ERRCODE = 'P0001';
  END IF;

  SELECT CASE WHEN p_variant = 'telegram' THEN s.telegram_link ELSE s.download_link END
  INTO v_link
  FROM public.subtitles AS s
  WHERE s.id = p_target_id
  LIMIT 1;

  IF v_link IS NULL OR btrim(v_link) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT btrim(v_link);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_download_link(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_download_link(bigint, text, text) TO service_role;

-- Required deployment secret (server-only; do NOT prefix this with VITE_):
-- SUPABASE_SERVICE_ROLE_KEY=<your Supabase service_role key>
--
-- Stronger next step: private Storage + Edge Function/this server route creating
-- 60–120 second signed URLs. External/public URLs remain usable after a user
-- receives one, so they cannot be made revocable by frontend code alone.

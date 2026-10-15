-- PixelPopLK: server-side one-time download ad-session gate
-- Run after sql/download_security.sql in the Supabase SQL editor.
-- This closes direct requests to /api/download-link without a server-issued,
-- one-use session and enforces a minimum 5-second server-side wait.
-- It does NOT prove a third-party ad was actually rendered. For that, the ad
-- provider must supply a trusted server-to-server impression/postback.

CREATE TABLE IF NOT EXISTS public.download_ad_sessions (
  session_token text PRIMARY KEY,
  client_key text NOT NULL,
  subtitle_id bigint NOT NULL REFERENCES public.subtitles(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('direct', 'telegram')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 minutes'),
  consumed_at timestamptz
);

ALTER TABLE public.download_ad_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.download_ad_sessions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_download_link_after_ad_wait(
  p_target_id bigint,
  p_variant text,
  p_client_key text,
  p_session_token text
)
RETURNS TABLE(link text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed_token text;
BEGIN
  IF p_target_id IS NULL OR p_target_id < 1
    OR p_variant NOT IN ('direct', 'telegram')
    OR p_client_key IS NULL OR length(p_client_key) = 0
    OR p_session_token IS NULL OR length(p_session_token) < 30 THEN
    RAISE EXCEPTION 'invalid download session' USING ERRCODE = '22023';
  END IF;

  -- Atomic claim: the token is valid for the matching IP, subtitle and variant,
  -- has aged at least 5 seconds on the server, has not expired and is single-use.
  UPDATE public.download_ad_sessions AS s
  SET consumed_at = now()
  WHERE s.session_token = p_session_token
    AND s.client_key = left(p_client_key, 128)
    AND s.subtitle_id = p_target_id
    AND s.variant = p_variant
    AND s.consumed_at IS NULL
    AND s.started_at <= now() - interval '5 seconds'
    AND s.expires_at > now()
  RETURNING s.session_token INTO v_claimed_token;

  IF v_claimed_token IS NULL THEN
    RAISE EXCEPTION 'ad session is invalid, incomplete, expired, or already used'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    SELECT claimed.link
    FROM public.claim_download_link(p_target_id, p_variant, p_client_key) AS claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_download_link_after_ad_wait(bigint, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_download_link_after_ad_wait(bigint, text, text, text) TO service_role;

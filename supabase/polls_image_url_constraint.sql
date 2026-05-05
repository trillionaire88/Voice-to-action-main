-- Restrict polls.image_url to Supabase-hosted asset URLs (storage/CDN).
ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_image_url_domain;

ALTER TABLE public.polls
  ADD CONSTRAINT polls_image_url_domain CHECK (
    image_url IS NULL
    OR image_url LIKE '%supabase.co%'
    OR image_url LIKE '%supabase.in%'
  );

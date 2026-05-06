-- Narrow exposure for anonymous visitors: safe profile subset via view + RLS.
-- Run after profiles table exists. Requires PostgreSQL 15+ (view security_invoker).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public_figure BOOLEAN DEFAULT FALSE;

DROP VIEW IF EXISTS public.admin_contact_directory CASCADE;
DROP VIEW IF EXISTS public.public_profiles_view CASCADE;

-- Definer-style read so underlying profiles RLS does not block the projected rows.
CREATE VIEW public.public_profiles_view
WITH (security_invoker = false)
AS
SELECT
  p.id,
  COALESCE(p.display_name, p.full_name) AS display_name,
  p.full_name,
  COALESCE(p.profile_avatar_url, p.avatar_url) AS avatar_url,
  COALESCE(p.profile_avatar_url, p.avatar_url) AS profile_avatar_url,
  p.is_blue_verified,
  p.is_blue_verified AS is_verified,
  p.bio,
  p.follower_count,
  p.following_count,
  p.is_public,
  p.location,
  p.country_code,
  p.created_date AS created_at,
  CASE
    WHEN p.role::text IN ('verified', 'political_figure', 'news_outlet') THEN p.role::text
    ELSE 'user'
  END AS public_role,
  COALESCE(p.is_public_figure, (p.role::text = 'political_figure')) AS is_public_figure
FROM public.profiles p;

COMMENT ON VIEW public.public_profiles_view IS 'Public-safe profile fields only; use for anon and cross-user discovery.';

CREATE VIEW public.admin_contact_directory
WITH (security_invoker = false)
AS
SELECT p.id, p.email, p.display_name, p.full_name
FROM public.profiles p
WHERE p.role::text IN ('admin', 'owner_admin');

COMMENT ON VIEW public.admin_contact_directory IS 'Minimal admin contact rows for authenticated flows (e.g. report alerts).';

GRANT SELECT ON public.public_profiles_view TO anon, authenticated, service_role;
GRANT SELECT ON public.admin_contact_directory TO authenticated, service_role;

-- View RLS (PG15+)
ALTER VIEW public.public_profiles_view ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_profiles_view_select_all ON public.public_profiles_view;
CREATE POLICY public_profiles_view_select_all ON public.public_profiles_view
FOR SELECT TO anon, authenticated
USING (true);

ALTER VIEW public.admin_contact_directory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_contact_directory_authenticated ON public.admin_contact_directory;
CREATE POLICY admin_contact_directory_authenticated ON public.admin_contact_directory
FOR SELECT TO authenticated
USING (true);

-- Restrict direct profiles access: own row + admins only (no broad anon read).
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_select_admin ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role::text IN ('admin', 'owner_admin')
  )
);

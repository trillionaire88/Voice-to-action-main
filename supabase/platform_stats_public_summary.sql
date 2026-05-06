-- Aggregated public dashboard metrics (no row payloads). Run in Supabase SQL Editor after deployment.
-- Optional: REFRESH MATERIALIZED VIEW CONCURRENTLY platform_stats_mv; on a schedule via pg_cron — see comment below.

CREATE OR REPLACE FUNCTION public.platform_stats_public_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*)::bigint FROM public.public_profiles_view),
    'verified_users', (SELECT count(*)::bigint FROM public.public_profiles_view WHERE COALESCE(is_blue_verified, false)),
    'unique_countries', (
      SELECT count(DISTINCT country_code)::bigint
      FROM public.public_profiles_view
      WHERE country_code IS NOT NULL AND trim(country_code) <> ''
    ),
    'total_polls', (SELECT count(*)::bigint FROM public.polls),
    'active_polls', (SELECT count(*)::bigint FROM public.polls WHERE status = 'open'),
    'polls_24h', (
      SELECT count(*)::bigint FROM public.polls
      WHERE COALESCE(created_date, created_at, start_time) > NOW() - INTERVAL '24 hours'
    ),
    'polls_7d', (
      SELECT count(*)::bigint FROM public.polls
      WHERE COALESCE(created_date, created_at, start_time) > NOW() - INTERVAL '7 days'
    ),
    'total_votes', (SELECT count(*)::bigint FROM public.votes),
    'votes_24h', (
      SELECT count(*)::bigint FROM public.votes
      WHERE COALESCE(created_at, created_date) > NOW() - INTERVAL '24 hours'
    ),
    'total_communities', (SELECT count(*)::bigint FROM public.communities)
  );
$$;

GRANT EXECUTE ON FUNCTION public.platform_stats_public_summary() TO anon, authenticated;

COMMENT ON FUNCTION public.platform_stats_public_summary IS
  'Cheap aggregate counts for the public Platform Statistics page. For very high traffic, wrap results in a MATERIALIZED VIEW platform_stats_mv and REFRESH every 5 minutes via pg_cron.';

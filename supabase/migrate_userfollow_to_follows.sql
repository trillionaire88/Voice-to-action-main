-- One-time migration: legacy user_follows → canonical follows + community_follows.
-- Safe to re-run: uses ON CONFLICT DO NOTHING where unique constraints exist.

-- ─── Community follows (user ↔ community), separate from profile-to-profile follows ───
CREATE TABLE IF NOT EXISTS community_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_community ON community_follows(community_id);

ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_follows_select ON community_follows;
CREATE POLICY community_follows_select ON community_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS community_follows_insert ON community_follows;
CREATE POLICY community_follows_insert ON community_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS community_follows_delete ON community_follows;
CREATE POLICY community_follows_delete ON community_follows FOR DELETE USING (auth.uid() = follower_id);

-- ─── Copy rows from user_follows when that table exists (column sets vary by deployment) ───
DO $$
BEGIN
  IF to_regclass('public.user_follows') IS NULL THEN
    RAISE NOTICE 'migrate_userfollow_to_follows: public.user_follows not found; skipping data copy';
    RETURN;
  END IF;

  BEGIN
    EXECUTE $u$
      INSERT INTO follows (follower_id, following_id)
      SELECT DISTINCT follower_id, target_id
      FROM public.user_follows
      WHERE COALESCE(target_type, 'user') = 'user'
        AND follower_id IS NOT NULL
        AND target_id IS NOT NULL
        AND follower_id <> target_id
      ON CONFLICT (follower_id, following_id) DO NOTHING
    $u$;
  EXCEPTION
    WHEN undefined_column THEN
      BEGIN
        EXECUTE $v$
          INSERT INTO follows (follower_id, following_id)
          SELECT DISTINCT follower_user_id, following_user_id
          FROM public.user_follows
          WHERE follower_user_id IS NOT NULL
            AND following_user_id IS NOT NULL
            AND follower_user_id <> following_user_id
          ON CONFLICT (follower_id, following_id) DO NOTHING
        $v$;
      EXCEPTION
        WHEN undefined_column THEN
          RAISE NOTICE 'migrate_userfollow_to_follows: could not map user follows (unexpected user_follows columns)';
      END;
  END;

  BEGIN
    EXECUTE $c$
      INSERT INTO community_follows (follower_id, community_id)
      SELECT DISTINCT follower_id, target_id
      FROM public.user_follows
      WHERE target_type = 'community'
        AND follower_id IS NOT NULL
        AND target_id IS NOT NULL
      ON CONFLICT (follower_id, community_id) DO NOTHING
    $c$;
  EXCEPTION
    WHEN undefined_column THEN
      BEGIN
        EXECUTE $d$
          INSERT INTO community_follows (follower_id, community_id)
          SELECT DISTINCT follower_user_id, target_id
          FROM public.user_follows
          WHERE target_type = 'community'
            AND follower_user_id IS NOT NULL
            AND target_id IS NOT NULL
          ON CONFLICT (follower_id, community_id) DO NOTHING
        $d$;
      EXCEPTION
        WHEN undefined_column THEN
          RAISE NOTICE 'migrate_userfollow_to_follows: could not map community follows (unexpected columns)';
      END;
  END;
END $$;

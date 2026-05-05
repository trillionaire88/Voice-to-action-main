-- Keeps profiles.follower_count / following_count in sync with the `follows` table.
-- Safe to run if trigger already exists (idempotent).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count = COALESCE(follower_count, 0) + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count = GREATEST(0, COALESCE(follower_count, 0) - 1) WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_follow_counts ON follows;
CREATE TRIGGER trigger_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Backfill from current follows rows (run once)
UPDATE profiles p
SET follower_count = (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = p.id);

UPDATE profiles p
SET following_count = (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = p.id);

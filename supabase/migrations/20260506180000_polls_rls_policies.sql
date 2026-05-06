-- Polls table RLS (mirrors supabase/complete_schema.sql POLLS section).
-- Apply via Supabase SQL Editor or supabase db push if using migrations.

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS polls_insert_own ON polls;
CREATE POLICY polls_insert_own ON polls
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_user_id);

DROP POLICY IF EXISTS polls_select_public ON polls;
CREATE POLICY polls_select_public ON polls
FOR SELECT USING (true);

DROP POLICY IF EXISTS polls_update_own ON polls;
CREATE POLICY polls_update_own ON polls
FOR UPDATE TO authenticated
USING (auth.uid() = creator_user_id)
WITH CHECK (auth.uid() = creator_user_id);

DROP POLICY IF EXISTS polls_delete_own ON polls;
CREATE POLICY polls_delete_own ON polls
FOR DELETE TO authenticated
USING (auth.uid() = creator_user_id);

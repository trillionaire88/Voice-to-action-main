-- Optional performance indexes for civic tables (run only if these tables exist).
CREATE INDEX IF NOT EXISTS idx_petitions_status_sigs ON petitions(status, signature_count_total DESC);
CREATE INDEX IF NOT EXISTS idx_petitions_creator ON petitions(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_sigs_petition ON petition_signatures(petition_id);
CREATE INDEX IF NOT EXISTS idx_sigs_user ON petition_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);

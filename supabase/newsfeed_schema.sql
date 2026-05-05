-- ── USER INTERESTS & ALGORITHM WEIGHTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  categories TEXT[] DEFAULT '{}',
  followed_user_ids UUID[] DEFAULT '{}',
  followed_community_ids UUID[] DEFAULT '{}',
  topic_weights JSONB DEFAULT '{}'::jsonb,
  country_code TEXT,
  region_code TEXT,
  feed_preference TEXT DEFAULT 'for_you' CHECK (feed_preference IN ('for_you', 'local', 'global', 'following')),
  show_petitions BOOLEAN DEFAULT TRUE,
  show_polls BOOLEAN DEFAULT TRUE,
  show_discussions BOOLEAN DEFAULT TRUE,
  show_scorecards BOOLEAN DEFAULT TRUE,
  show_communities BOOLEAN DEFAULT TRUE,
  show_public_figures BOOLEAN DEFAULT TRUE,
  show_news BOOLEAN DEFAULT TRUE,
  hidden_categories TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS interests_own ON user_interests;
CREATE POLICY interests_own ON user_interests FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_interests_user ON user_interests(user_id);

-- ── FEED INTERACTION EVENTS (TikTok-style learning) ────────────────────────
CREATE TABLE IF NOT EXISTS feed_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('petition', 'poll', 'discussion', 'scorecard', 'community', 'figure', 'news')),
  content_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'sign', 'vote', 'share', 'follow', 'skip', 'hide')),
  category TEXT,
  country_code TEXT,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS interactions_own ON feed_interactions;
CREATE POLICY interactions_own ON feed_interactions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON feed_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_content ON feed_interactions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON feed_interactions(interaction_type, created_at DESC);

-- ── NEWSFEED CACHE (pre-computed feeds per user) ────────────────────────────
CREATE TABLE IF NOT EXISTS newsfeed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('for_you', 'local', 'global', 'following', 'breaking')),
  feed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes',
  UNIQUE(user_id, feed_type)
);

ALTER TABLE newsfeed_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cache_own ON newsfeed_cache;
CREATE POLICY cache_own ON newsfeed_cache FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
CREATE INDEX IF NOT EXISTS idx_cache_user_type ON newsfeed_cache(user_id, feed_type);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON newsfeed_cache(expires_at);

-- ── FOLLOWS TABLE (if not already exists) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follows_own ON follows;
CREATE POLICY follows_own ON follows FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ── TRENDING SCORES (updated by cron) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS trending_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  velocity NUMERIC DEFAULT 0,
  country_code TEXT,
  category TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_id, country_code)
);

ALTER TABLE trending_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trending_public_read ON trending_scores;
CREATE POLICY trending_public_read ON trending_scores FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_scores(score DESC, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_country ON trending_scores(country_code, score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_type ON trending_scores(content_type, score DESC);

-- ── SAVED / BOOKMARKED ITEMS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saved_own ON saved_items;
CREATE POLICY saved_own ON saved_items FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_items(user_id, saved_at DESC);

-- ── CIVIC NEWS CACHE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS civic_news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL UNIQUE,
  image_url TEXT,
  source_name TEXT,
  published_at TIMESTAMPTZ,
  country_code TEXT,
  category TEXT DEFAULT 'civic',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE civic_news_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS news_public_read ON civic_news_cache;
CREATE POLICY news_public_read ON civic_news_cache FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_news_published ON civic_news_cache(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_country ON civic_news_cache(country_code, published_at DESC);

-- ── CLEAN EXPIRED CACHE ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION clean_expired_feed_cache()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM newsfeed_cache WHERE expires_at < NOW();
END;
$$;

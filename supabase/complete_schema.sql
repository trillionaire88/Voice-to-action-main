-- =====================================================================
-- VOICE TO ACTION — COMPLETE SCHEMA
-- Run this in Supabase SQL Editor to ensure every column every write
-- path touches actually exists in the database.
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so this
-- file is safe to re-run at any time without data loss.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- POLLS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE polls ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES profiles(id);
ALTER TABLE polls ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS poll_type TEXT DEFAULT 'single_choice';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS intent_type TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS intent_custom TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS secondary_categories TEXT[] DEFAULT '{}';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_anonymous_display BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_option_suggestions BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE polls ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS location_scope TEXT DEFAULT 'global';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'global';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS audience_country_code TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS location_country_code TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS enable_discussion BOOLEAN DEFAULT TRUE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS enable_evidence BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS result_visibility TEXT DEFAULT 'always';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS require_comment BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS verified_only BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS citizens_only BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS min_voting_age INTEGER;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS hide_vote_count BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS show_map BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS show_timeline BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS media_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS linked_petition_id UUID;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_anonymous BOOLEAN DEFAULT TRUE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS min_reputation INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS congress_tracked BOOLEAN DEFAULT FALSE;

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

-- ─────────────────────────────────────────────────────────────────────
-- POLL OPTIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL CHECK (char_length(option_text) BETWEEN 1 AND 500),
  order_index INTEGER NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS poll_options_public_read ON poll_options;
CREATE POLICY poll_options_public_read ON poll_options FOR SELECT USING (true);
DROP POLICY IF EXISTS poll_options_creator_insert ON poll_options;
CREATE POLICY poll_options_creator_insert ON poll_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND p.creator_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id, order_index);

-- ─────────────────────────────────────────────────────────────────────
-- PETITIONS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS creator_relationship TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS allow_public_withdrawal BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'undelivered';
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS sub_goals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS target_email TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 0;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS congress_tracked BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS advocacy_stage TEXT DEFAULT 'gathering';
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS short_url TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS embed_count INTEGER DEFAULT 0;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS milestone_celebrated INTEGER DEFAULT 0;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS withdrawal_count INTEGER DEFAULT 0;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS delivery_method TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- SIGNATURES
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS is_email_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS messages_from_followers_only BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_read_receipts BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crisis_alerts_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_follow BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_referral_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_signatures INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_petitions_created INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_polls_created INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS polls_created_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_poll_created_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unsubscribed_from_emails BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS opted_in_updates BOOLEAN DEFAULT TRUE;
-- OTP / verification columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_otp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_otp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blue_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_kyc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paid_identity_verification_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_identity_session_id TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- COMMUNITIES
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE communities ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_org_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS allow_petitions BOOLEAN DEFAULT TRUE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS allow_polls BOOLEAN DEFAULT TRUE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS subscription_required BOOLEAN DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS priority_search BOOLEAN DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC(10,2) DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────
-- COMMUNITY MEMBERS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE community_members ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id);
ALTER TABLE community_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ─────────────────────────────────────────────────────────────────────
-- VOTES
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE votes ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1.0;

-- ─────────────────────────────────────────────────────────────────────
-- SCORECARDS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────
-- VERIFICATION REQUESTS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS stripe_identity_session_id TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS organisation_name TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS organisation_type TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────
-- CONVERSATIONS (reconcile both schema variants)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'direct';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_text TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_sender_id UUID REFERENCES profiles(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_one INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_two INTEGER DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────
-- MESSAGES (add rich-message columns)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────
-- CONVERSATION PARTICIPANTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  show_read_receipts BOOLEAN DEFAULT TRUE,
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cp_own ON conversation_participants;
CREATE POLICY cp_own ON conversation_participants FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cp_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cp_user ON conversation_participants(user_id);

-- ─────────────────────────────────────────────────────────────────────
-- MESSAGE REACTIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reactions_own ON message_reactions;
CREATE POLICY reactions_own ON message_reactions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- ─────────────────────────────────────────────────────────────────────
-- TYPING INDICATORS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS typing_own ON typing_indicators;
CREATE POLICY typing_own ON typing_indicators FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_typing_conv ON typing_indicators(conversation_id);

-- ─────────────────────────────────────────────────────────────────────
-- ORG VERIFICATION REQUESTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('business', 'organisation', 'government', 'council')),
  org_name TEXT NOT NULL,
  org_website TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  payment_completed BOOLEAN DEFAULT FALSE,
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE org_verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ovr_own_select ON org_verification_requests;
CREATE POLICY ovr_own_select ON org_verification_requests FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));
DROP POLICY IF EXISTS ovr_own_insert ON org_verification_requests;
CREATE POLICY ovr_own_insert ON org_verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS ovr_admin_update ON org_verification_requests;
CREATE POLICY ovr_admin_update ON org_verification_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));

CREATE INDEX IF NOT EXISTS idx_ovr_user ON org_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ovr_status ON org_verification_requests(status);

-- ─────────────────────────────────────────────────────────────────────
-- CONTENT WATERMARKS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_watermarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  watermark_hash TEXT NOT NULL,
  platform TEXT DEFAULT 'voicetoaction.com',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_id)
);

ALTER TABLE content_watermarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS watermarks_admin_select ON content_watermarks;
CREATE POLICY watermarks_admin_select ON content_watermarks FOR SELECT
  USING (auth.uid() = creator_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));
DROP POLICY IF EXISTS watermarks_creator_insert ON content_watermarks;
CREATE POLICY watermarks_creator_insert ON content_watermarks FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_watermarks_content ON content_watermarks(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_watermarks_creator ON content_watermarks(creator_id);

-- ─────────────────────────────────────────────────────────────────────
-- PUSH TOKENS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_tokens_own ON push_tokens;
CREATE POLICY push_tokens_own ON push_tokens FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- TERMS ACCEPTANCES
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS terms_acceptances_insert_anyone ON terms_acceptances;
CREATE POLICY terms_acceptances_insert_anyone ON terms_acceptances
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS terms_acceptances_user_read_own ON terms_acceptances;
CREATE POLICY terms_acceptances_user_read_own ON terms_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- PRIVACY CONSENTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies', 'marketing', 'analytics', 'data_processing')),
  consented BOOLEAN NOT NULL,
  ip_address TEXT,
  country_code TEXT,
  legal_basis TEXT DEFAULT 'consent',
  consented_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE privacy_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consents_own ON privacy_consents;
CREATE POLICY consents_own ON privacy_consents FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_consents_user ON privacy_consents(user_id);

-- ─────────────────────────────────────────────────────────────────────
-- USER INTERESTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  categories TEXT[] DEFAULT '{}',
  followed_user_ids UUID[] DEFAULT '{}',
  followed_community_ids UUID[] DEFAULT '{}',
  topic_weights JSONB DEFAULT '{}'::jsonb,
  country_code TEXT,
  region_code TEXT,
  feed_preference TEXT DEFAULT 'for_you',
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

-- ─────────────────────────────────────────────────────────────────────
-- SAVED ITEMS
-- ─────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────
-- FOLLOWS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follows_select ON follows;
CREATE POLICY follows_select ON follows FOR SELECT USING (true);
DROP POLICY IF EXISTS follows_insert ON follows;
CREATE POLICY follows_insert ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS follows_delete ON follows;
CREATE POLICY follows_delete ON follows FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ─────────────────────────────────────────────────────────────────────
-- USER ACTIVITY
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  title TEXT,
  summary TEXT,
  url_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_select ON user_activity;
CREATE POLICY activity_select ON user_activity FOR SELECT USING (true);
DROP POLICY IF EXISTS activity_insert ON user_activity;
CREATE POLICY activity_insert ON user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- PETITION DELIVERIES
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS petition_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id UUID NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
  delivered_by UUID NOT NULL REFERENCES profiles(id),
  institution_name TEXT NOT NULL,
  institution_email TEXT,
  delivery_method TEXT NOT NULL DEFAULT 'email',
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'acknowledged', 'responded', 'rejected', 'closed')),
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  response_deadline TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  response_received_at TIMESTAMPTZ,
  response_text TEXT,
  is_public BOOLEAN DEFAULT TRUE
);

ALTER TABLE petition_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deliveries_public_read ON petition_deliveries;
CREATE POLICY deliveries_public_read ON petition_deliveries FOR SELECT USING (is_public = TRUE);
DROP POLICY IF EXISTS deliveries_own_insert ON petition_deliveries;
CREATE POLICY deliveries_own_insert ON petition_deliveries FOR INSERT WITH CHECK (auth.uid() = delivered_by);

CREATE INDEX IF NOT EXISTS idx_deliveries_petition ON petition_deliveries(petition_id);

-- ─────────────────────────────────────────────────────────────────────
-- PETITION WITHDRAWALS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS petition_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id UUID NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_reference TEXT,
  payment_amount NUMERIC(10,2) DEFAULT 1.99,
  stripe_session_id TEXT,
  email_sent_to TEXT,
  status TEXT DEFAULT 'paid',
  withdrawn_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(petition_id, user_id)
);

ALTER TABLE petition_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS withdrawal_own ON petition_withdrawals;
CREATE POLICY withdrawal_own ON petition_withdrawals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS withdrawal_insert ON petition_withdrawals;
CREATE POLICY withdrawal_insert ON petition_withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_petition ON petition_withdrawals(petition_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON petition_withdrawals(user_id);

-- ─────────────────────────────────────────────────────────────────────
-- REFERRAL CODES
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referral_codes_read_all ON referral_codes;
CREATE POLICY referral_codes_read_all ON referral_codes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS referral_codes_owner_write ON referral_codes;
CREATE POLICY referral_codes_owner_write ON referral_codes FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- SECURITY AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','high','critical')),
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT,
  payload_hash TEXT,
  details JSONB DEFAULT '{}',
  chain_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_admin_only ON security_audit_log;
CREATE POLICY audit_log_admin_only ON security_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));
DROP POLICY IF EXISTS audit_own_read ON security_audit_log;
CREATE POLICY audit_own_read ON security_audit_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS audit_log_no_update ON security_audit_log;
CREATE POLICY audit_log_no_update ON security_audit_log FOR UPDATE USING (false);
DROP POLICY IF EXISTS audit_log_no_delete ON security_audit_log;
CREATE POLICY audit_log_no_delete ON security_audit_log FOR DELETE USING (false);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON security_audit_log(event_type);

-- ─────────────────────────────────────────────────────────────────────
-- FRAUD REPORTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content_type TEXT,
  content_id TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

ALTER TABLE fraud_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fraud_reports_admin ON fraud_reports;
CREATE POLICY fraud_reports_admin ON fraud_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));

CREATE INDEX IF NOT EXISTS idx_fraud_reports_status ON fraud_reports(status);
CREATE INDEX IF NOT EXISTS idx_fraud_reports_target ON fraud_reports(target_id);

-- ─────────────────────────────────────────────────────────────────────
-- MODERATION QUEUE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS moderation_queue_admin ON moderation_queue;
CREATE POLICY moderation_queue_admin ON moderation_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin', 'moderator')));

CREATE INDEX IF NOT EXISTS idx_mod_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_mod_queue_content ON moderation_queue(content_type, content_id);

-- ─────────────────────────────────────────────────────────────────────
-- PETITION INTEGRITY
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS petition_integrity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id UUID NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
  admin_reviewed BOOLEAN DEFAULT FALSE,
  integrity_score NUMERIC DEFAULT 100,
  flags JSONB DEFAULT '[]'::jsonb,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(petition_id)
);

ALTER TABLE petition_integrity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS petition_integrity_admin ON petition_integrity;
CREATE POLICY petition_integrity_admin ON petition_integrity FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin', 'moderator')));

CREATE INDEX IF NOT EXISTS idx_petition_integrity_petition ON petition_integrity(petition_id);

-- ─────────────────────────────────────────────────────────────────────
-- ACCOUNTS (for SecurityDashboard blocking)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounts_admin ON accounts;
CREATE POLICY accounts_admin ON accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));

-- ─────────────────────────────────────────────────────────────────────
-- FUNCTION: handle_new_user (create profile on signup)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- FUNCTION: get_or_create_direct_conversation
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Find existing direct conversation between both users
  SELECT c.id INTO v_conv_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  INSERT INTO conversations (type, created_by)
  VALUES ('direct', v_user_id)
  RETURNING id INTO v_conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
  VALUES (v_conv_id, v_user_id, TRUE), (v_conv_id, other_user_id, FALSE);

  RETURN v_conv_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_communities_hidden ON communities(is_hidden, plan);
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON user_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_communities_plan ON communities(plan, plan_status);
CREATE INDEX IF NOT EXISTS idx_communities_invite ON communities(invite_code);

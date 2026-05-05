-- =====================================================================
-- VOICE TO ACTION — SCHEMA AUDIT FIX
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/excfsjeuiigvbzosamqf/sql/new
-- This adds all missing columns safely (IF NOT EXISTS = no data loss)
-- =====================================================================

-- ── PETITIONS ─────────────────────────────────────────────────────────────
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

-- ── POLLS ─────────────────────────────────────────────────────────────────
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS result_visibility TEXT DEFAULT 'always';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_anonymous BOOLEAN DEFAULT TRUE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS min_reputation INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS congress_tracked BOOLEAN DEFAULT FALSE;

-- ── PROFILES ──────────────────────────────────────────────────────────────
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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_signatures INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_petitions_created INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_polls_created INTEGER DEFAULT 0;
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

-- ── COMMUNITIES ───────────────────────────────────────────────────────────
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

-- ── SIGNATURES ────────────────────────────────────────────────────────────
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

-- ── VOTES ─────────────────────────────────────────────────────────────────
ALTER TABLE votes ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1.0;

-- ── SCORECARDS ────────────────────────────────────────────────────────────
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ── VERIFICATION REQUESTS ─────────────────────────────────────────────────
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS organisation_name TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS organisation_type TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- ── TRANSACTIONS ──────────────────────────────────────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

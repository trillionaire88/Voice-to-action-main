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

CREATE TABLE IF NOT EXISTS promoted_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('petition', 'poll', 'community')),
  content_id UUID NOT NULL,
  promoted_by UUID NOT NULL REFERENCES profiles(id),
  budget_aud NUMERIC NOT NULL,
  spent_aud NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS active_crises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'high' CHECK (urgency_level IN ('medium', 'high', 'critical')),
  related_petition_ids UUID[] DEFAULT '{}',
  related_poll_ids UUID[] DEFAULT '{}',
  related_tags TEXT[] DEFAULT '{}',
  country_codes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  activated_by UUID REFERENCES profiles(id),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE petitions ADD COLUMN IF NOT EXISTS allow_public_withdrawal BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'undelivered';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS messages_from_followers_only BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crisis_alerts_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_org_verified BOOLEAN DEFAULT FALSE;

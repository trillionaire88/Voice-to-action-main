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
CREATE POLICY consents_own ON privacy_consents FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_consents_user ON privacy_consents(user_id);

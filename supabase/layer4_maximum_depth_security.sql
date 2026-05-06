-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 4 — maximum depth security (run in Supabase SQL Editor after Layers 2–3)
-- Requires: public.profiles, public.petitions, public.polls, public.petition_signatures,
--           public.messages, public.user_devices (Layer 2), public.ip_reputation,
--           public.suspicious_logins, public.petition_integrity (Layers 2–3)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;

-- ══════════════════════════════════════════════════════════════
-- TOTP / 2FA SECRETS TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_totp (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  encrypted_secret TEXT NOT NULL,
  backup_codes    TEXT[] NOT NULL DEFAULT '{}',
  is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_at      TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_totp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS totp_own_read ON user_totp;
CREATE POLICY totp_own_read ON user_totp
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_totp_user ON user_totp(user_id);

-- ══════════════════════════════════════════════════════════════
-- ACTIVE SESSIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS active_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token   TEXT NOT NULL UNIQUE,
  device_label    TEXT,
  device_fingerprint TEXT,
  ip_address      TEXT,
  country_code    TEXT,
  city            TEXT,
  is_current      BOOLEAN DEFAULT FALSE,
  last_active_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  revoked         BOOLEAN DEFAULT FALSE,
  revoked_at      TIMESTAMPTZ,
  revoke_reason   TEXT
);

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_own_read ON active_sessions;
CREATE POLICY sessions_own_read ON active_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON active_sessions(user_id, revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON active_sessions(last_active_at DESC)
  WHERE revoked = FALSE;

CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE active_sessions
    SET revoked = TRUE, revoked_at = NOW(), revoke_reason = 'expired'
    WHERE expires_at < NOW() AND revoked = FALSE;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- BEHAVIOURAL BASELINE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_behaviour_baseline (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  avg_session_duration_mins NUMERIC(8,2) DEFAULT 0,
  avg_actions_per_hour  NUMERIC(8,2) DEFAULT 0,
  typical_login_hours   INTEGER[] DEFAULT '{}',
  known_countries       TEXT[] DEFAULT '{}',
  primary_country       TEXT,
  avg_petitions_per_day NUMERIC(6,2) DEFAULT 0,
  avg_votes_per_day     NUMERIC(6,2) DEFAULT 0,
  avg_messages_per_day  NUMERIC(6,2) DEFAULT 0,
  anomaly_score         INTEGER DEFAULT 0 CHECK (anomaly_score BETWEEN 0 AND 100),
  last_anomaly_reason   TEXT,
  sample_days           INTEGER DEFAULT 0,
  last_updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_behaviour_baseline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS baseline_own_read ON user_behaviour_baseline;
CREATE POLICY baseline_own_read ON user_behaviour_baseline
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS baseline_admin_read ON user_behaviour_baseline;
CREATE POLICY baseline_admin_read ON user_behaviour_baseline
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')
    )
  );
CREATE INDEX IF NOT EXISTS idx_baseline_user ON user_behaviour_baseline(user_id);
CREATE INDEX IF NOT EXISTS idx_baseline_anomaly ON user_behaviour_baseline(anomaly_score DESC);

-- ══════════════════════════════════════════════════════════════
-- DUPLICATE IDENTITY FLAGS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS duplicate_identity_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_a_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_b_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  similarity_score INTEGER NOT NULL CHECK (similarity_score BETWEEN 0 AND 100),
  match_signals   JSONB DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed_duplicate', 'false_positive', 'under_review')),
  detected_at     TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  action_taken    TEXT,
  UNIQUE(account_a_id, account_b_id)
);

ALTER TABLE duplicate_identity_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dupes_no_client ON duplicate_identity_flags;
CREATE POLICY dupes_no_client ON duplicate_identity_flags FOR ALL USING (false);
DROP POLICY IF EXISTS dupes_admin_all ON duplicate_identity_flags;
CREATE POLICY dupes_admin_all ON duplicate_identity_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')
    )
  );
CREATE INDEX IF NOT EXISTS idx_dupes_a ON duplicate_identity_flags(account_a_id);
CREATE INDEX IF NOT EXISTS idx_dupes_b ON duplicate_identity_flags(account_b_id);
CREATE INDEX IF NOT EXISTS idx_dupes_score ON duplicate_identity_flags(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_dupes_status ON duplicate_identity_flags(status);

-- ══════════════════════════════════════════════════════════════
-- EMERGENCY ACCESS CODES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS emergency_access_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash       TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  used_at         TIMESTAMPTZ,
  is_used         BOOLEAN DEFAULT FALSE,
  replaced_at     TIMESTAMPTZ
);

ALTER TABLE emergency_access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emergency_own_count ON emergency_access_codes;
CREATE POLICY emergency_own_count ON emergency_access_codes
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_user ON emergency_access_codes(user_id, is_used);

-- ══════════════════════════════════════════════════════════════
-- LEGAL HOLDS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS legal_holds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_type       TEXT NOT NULL CHECK (hold_type IN ('account', 'petition', 'poll', 'community', 'messages')),
  target_id       UUID NOT NULL,
  reason          TEXT NOT NULL,
  legal_reference TEXT,
  placed_by       UUID REFERENCES profiles(id),
  placed_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  lifted_at       TIMESTAMPTZ,
  lifted_by       UUID REFERENCES profiles(id),
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT
);

ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS legal_holds_no_client ON legal_holds;
CREATE POLICY legal_holds_no_client ON legal_holds FOR ALL USING (false);
CREATE INDEX IF NOT EXISTS idx_holds_target ON legal_holds(target_id, is_active);
CREATE INDEX IF NOT EXISTS idx_holds_type ON legal_holds(hold_type, is_active);

-- ══════════════════════════════════════════════════════════════
-- PETITION DELIVERY PROOFS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS petition_delivery_proofs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id       UUID NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
  delivered_to      TEXT NOT NULL,
  delivered_to_email TEXT,
  delivery_method   TEXT NOT NULL CHECK (delivery_method IN ('email', 'certified_mail', 'hand_delivery', 'api', 'portal')),
  signature_count   INTEGER NOT NULL,
  content_hash      TEXT NOT NULL,
  delivered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_by      UUID REFERENCES profiles(id),
  confirmation_code TEXT UNIQUE,
  acknowledgement_received BOOLEAN DEFAULT FALSE,
  acknowledgement_at TIMESTAMPTZ,
  notes             TEXT
);

ALTER TABLE petition_delivery_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_public_read ON petition_delivery_proofs;
CREATE POLICY delivery_public_read ON petition_delivery_proofs FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_delivery_petition ON petition_delivery_proofs(petition_id);

-- ══════════════════════════════════════════════════════════════
-- MODERATION PIPELINE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS moderation_pipeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type    TEXT NOT NULL,
  content_id      UUID NOT NULL,
  creator_id      UUID REFERENCES profiles(id),
  stage           INTEGER NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 4),
  ai_scan_result  JSONB DEFAULT '{}',
  ai_risk_score   INTEGER,
  ai_scanned_at   TIMESTAMPTZ,
  report_count    INTEGER DEFAULT 0,
  report_weight   NUMERIC(8,2) DEFAULT 0,
  assigned_to     UUID REFERENCES profiles(id),
  moderator_decision TEXT CHECK (moderator_decision IN ('approved', 'warned', 'removed', 'escalated', 'pending')),
  moderator_note  TEXT,
  moderated_at    TIMESTAMPTZ,
  legal_flag      BOOLEAN DEFAULT FALSE,
  legal_note      TEXT,
  legal_reviewed_at TIMESTAMPTZ,
  final_status    TEXT NOT NULL DEFAULT 'active'
    CHECK (final_status IN ('active', 'under_review', 'warned', 'hidden', 'removed', 'legal_hold')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE moderation_pipeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modpipe_creator_read ON moderation_pipeline;
CREATE POLICY modpipe_creator_read ON moderation_pipeline
  FOR SELECT USING (auth.uid() = creator_id);
CREATE INDEX IF NOT EXISTS idx_modpipe_content ON moderation_pipeline(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_modpipe_stage ON moderation_pipeline(stage, final_status);
CREATE INDEX IF NOT EXISTS idx_modpipe_assigned ON moderation_pipeline(assigned_to);

-- ══════════════════════════════════════════════════════════════
-- LEGAL HOLD ENFORCEMENT
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION enforce_legal_hold()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hold_count INTEGER;
  v_table_name TEXT;
  v_content_type TEXT;
BEGIN
  v_table_name := TG_TABLE_NAME;
  v_content_type := CASE
    WHEN v_table_name = 'petitions'   THEN 'petition'
    WHEN v_table_name = 'polls'       THEN 'poll'
    WHEN v_table_name = 'communities' THEN 'community'
    ELSE v_table_name
  END;

  SELECT COUNT(*) INTO v_hold_count
  FROM legal_holds
  WHERE target_id = OLD.id
    AND hold_type = v_content_type
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_hold_count > 0 THEN
    RAISE EXCEPTION 'Content ID % is under a legal hold and cannot be modified or deleted', OLD.id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_hold_petitions ON petitions;
CREATE TRIGGER legal_hold_petitions
  BEFORE UPDATE OR DELETE ON petitions
  FOR EACH ROW EXECUTE FUNCTION enforce_legal_hold();

DROP TRIGGER IF EXISTS legal_hold_polls ON polls;
CREATE TRIGGER legal_hold_polls
  BEFORE UPDATE OR DELETE ON polls
  FOR EACH ROW EXECUTE FUNCTION enforce_legal_hold();

-- ══════════════════════════════════════════════════════════════
-- BEHAVIOURAL BASELINE UPDATE (daily / cron)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_user_behaviour_baseline(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vote_count      INTEGER := 0;
  v_sig_count       INTEGER := 0;
  v_msg_count       INTEGER := 0;
  v_anomaly_score   INTEGER := 0;
  v_anomaly_reason  TEXT := '';
  v_avg_votes       NUMERIC;
  v_avg_sigs        NUMERIC;
  v_existing        RECORD;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO v_vote_count FROM votes
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '24 hours';
  EXCEPTION
    WHEN undefined_table THEN v_vote_count := 0;
    WHEN undefined_column THEN
      BEGIN
        SELECT COUNT(*) INTO v_vote_count FROM votes
        WHERE user_id = p_user_id
          AND created_date > NOW() - INTERVAL '24 hours';
      EXCEPTION WHEN OTHERS THEN v_vote_count := 0;
      END;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_sig_count FROM petition_signatures
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '24 hours';
  EXCEPTION
    WHEN undefined_table THEN v_sig_count := 0;
    WHEN undefined_column THEN
      BEGIN
        SELECT COUNT(*) INTO v_sig_count FROM petition_signatures
        WHERE user_id = p_user_id
          AND signed_at > NOW() - INTERVAL '24 hours';
      EXCEPTION WHEN OTHERS THEN v_sig_count := 0;
      END;
  END;

  SELECT COUNT(*) INTO v_msg_count FROM messages
    WHERE sender_id = p_user_id
      AND created_at > NOW() - INTERVAL '24 hours';

  SELECT * INTO v_existing FROM user_behaviour_baseline WHERE user_id = p_user_id;
  IF FOUND AND COALESCE(v_existing.sample_days, 0) > 7 THEN
    v_avg_votes := v_existing.avg_votes_per_day;
    v_avg_sigs  := v_existing.avg_petitions_per_day;

    IF v_avg_votes > 0 AND v_vote_count > v_avg_votes * 5 AND v_vote_count > 10 THEN
      v_anomaly_score := v_anomaly_score + 40;
      v_anomaly_reason := v_anomaly_reason || 'vote_spike;';
    END IF;

    IF v_avg_sigs > 0 AND v_sig_count > v_avg_sigs * 10 AND v_sig_count > 5 THEN
      v_anomaly_score := v_anomaly_score + 30;
      v_anomaly_reason := v_anomaly_reason || 'signature_spike;';
    END IF;

    IF v_msg_count > 100 THEN
      v_anomaly_score := v_anomaly_score + 30;
      v_anomaly_reason := v_anomaly_reason || 'message_flood;';
    END IF;
  END IF;

  INSERT INTO user_behaviour_baseline (
    user_id, avg_votes_per_day, avg_petitions_per_day, avg_messages_per_day,
    anomaly_score, last_anomaly_reason, sample_days, last_updated_at
  ) VALUES (
    p_user_id,
    v_vote_count,
    v_sig_count,
    v_msg_count,
    LEAST(100, v_anomaly_score),
    NULLIF(v_anomaly_reason, ''),
    1,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    avg_votes_per_day = (
      (user_behaviour_baseline.avg_votes_per_day * LEAST(user_behaviour_baseline.sample_days, 30) + v_vote_count)
      / (LEAST(user_behaviour_baseline.sample_days, 30) + 1)
    ),
    avg_petitions_per_day = (
      (user_behaviour_baseline.avg_petitions_per_day * LEAST(user_behaviour_baseline.sample_days, 30) + v_sig_count)
      / (LEAST(user_behaviour_baseline.sample_days, 30) + 1)
    ),
    avg_messages_per_day = (
      (user_behaviour_baseline.avg_messages_per_day * LEAST(user_behaviour_baseline.sample_days, 30) + v_msg_count)
      / (LEAST(user_behaviour_baseline.sample_days, 30) + 1)
    ),
    anomaly_score = LEAST(100, GREATEST(user_behaviour_baseline.anomaly_score, v_anomaly_score)),
    last_anomaly_reason = COALESCE(NULLIF(v_anomaly_reason, ''), user_behaviour_baseline.last_anomaly_reason),
    sample_days = user_behaviour_baseline.sample_days + 1,
    last_updated_at = NOW();
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- DUPLICATE IDENTITY DETECTION
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION detect_duplicate_identities()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO duplicate_identity_flags (account_a_id, account_b_id, similarity_score, match_signals)
  SELECT DISTINCT
    d1.user_id AS account_a_id,
    d2.user_id AS account_b_id,
    70 AS similarity_score,
    '["same_device_fingerprint"]'::JSONB AS match_signals
  FROM user_devices d1
  JOIN user_devices d2
    ON d1.device_fingerprint = d2.device_fingerprint
    AND d1.user_id < d2.user_id
    AND d1.device_fingerprint IS NOT NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM duplicate_identity_flags f
    WHERE f.account_a_id = d1.user_id AND f.account_b_id = d2.user_id
  )
  ON CONFLICT (account_a_id, account_b_id) DO UPDATE
    SET similarity_score = GREATEST(duplicate_identity_flags.similarity_score, EXCLUDED.similarity_score);

  INSERT INTO duplicate_identity_flags (account_a_id, account_b_id, similarity_score, match_signals)
  SELECT DISTINCT
    d1.user_id AS account_a_id,
    d2.user_id AS account_b_id,
    40 AS similarity_score,
    '["same_ip_address"]'::JSONB AS match_signals
  FROM user_devices d1
  JOIN user_devices d2
    ON d1.ip_address = d2.ip_address
    AND d1.user_id < d2.user_id
    AND d1.ip_address IS NOT NULL
    AND d1.ip_address NOT IN ('127.0.0.1', '::1')
  WHERE NOT EXISTS (
    SELECT 1 FROM duplicate_identity_flags f
    WHERE f.account_a_id = d1.user_id AND f.account_b_id = d2.user_id
  )
  ON CONFLICT (account_a_id, account_b_id) DO UPDATE
    SET similarity_score = LEAST(100,
      duplicate_identity_flags.similarity_score + EXCLUDED.similarity_score
    ),
    match_signals = duplicate_identity_flags.match_signals || EXCLUDED.match_signals;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- Layer 3: admin read/update on ip_reputation (dashboard + unblock)
-- Permissive RLS ORs with ip_rep_no_client — add explicit admin policies.
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS ip_rep_admin_select ON ip_reputation;
CREATE POLICY ip_rep_admin_select ON ip_reputation
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')
    )
  );

DROP POLICY IF EXISTS ip_rep_admin_update ON ip_reputation;
CREATE POLICY ip_rep_admin_update ON ip_reputation
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')
    )
  )
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
-- Suspicious logins: admin read for security dashboard
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS sus_login_admin_read ON suspicious_logins;
CREATE POLICY sus_login_admin_read ON suspicious_logins
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')
    )
  );

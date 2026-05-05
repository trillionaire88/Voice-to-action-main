-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 2 advanced security — run in Supabase SQL Editor after core tables exist.
-- Requires: public.profiles, public.messages, public.petitions, public.petition_signatures,
-- ═══════════════════════════════════════════════════════════════════════════

-- ── DEVICE REGISTRY ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_label TEXT,
  ip_address TEXT,
  country_code TEXT,
  city TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_trusted BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS devices_own_read ON user_devices;
CREATE POLICY devices_own_read ON user_devices FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS devices_own_update ON user_devices;
CREATE POLICY devices_own_update ON user_devices FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fp ON user_devices(device_fingerprint);

-- ── SUSPICIOUS LOGIN LOG ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suspicious_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  country_code TEXT,
  device_fingerprint TEXT,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  was_notified BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suspicious_logins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sus_login_own_read ON suspicious_logins;
CREATE POLICY sus_login_own_read ON suspicious_logins FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sus_login_user ON suspicious_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_sus_login_created ON suspicious_logins(created_at DESC);

-- ── PETITION INTEGRITY ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS petition_integrity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id UUID NOT NULL REFERENCES petitions(id) ON DELETE CASCADE UNIQUE,
  integrity_score INTEGER DEFAULT 100 CHECK (integrity_score BETWEEN 0 AND 100),
  flags JSONB DEFAULT '[]'::jsonb,
  signatures_per_hour_peak INTEGER DEFAULT 0,
  new_account_ratio NUMERIC(5,2) DEFAULT 0,
  single_country_ratio NUMERIC(5,2) DEFAULT 0,
  last_assessed_at TIMESTAMPTZ DEFAULT NOW(),
  is_flagged BOOLEAN DEFAULT FALSE,
  admin_reviewed BOOLEAN DEFAULT FALSE
);

ALTER TABLE petition_integrity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integrity_public_read ON petition_integrity;
CREATE POLICY integrity_public_read ON petition_integrity FOR SELECT USING (true);
DROP POLICY IF EXISTS integrity_admin_update ON petition_integrity;
CREATE POLICY integrity_admin_update ON petition_integrity FOR UPDATE
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
CREATE INDEX IF NOT EXISTS idx_integrity_petition ON petition_integrity(petition_id);
CREATE INDEX IF NOT EXISTS idx_integrity_flagged ON petition_integrity(is_flagged);

-- ── ACCOUNT SUSPENSIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suspended_by UUID REFERENCES profiles(id),
  reason TEXT NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb,
  suspended_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE account_suspensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suspensions_own_read ON account_suspensions;
CREATE POLICY suspensions_own_read ON account_suspensions FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_user ON account_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_active ON account_suspensions(is_active);

-- ── DATA DELETION REQUESTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'full_erasure'
    CHECK (request_type IN ('full_erasure', 'data_export', 'partial_erasure')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  completion_notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deletion_one_pending_per_user
  ON data_deletion_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deletion_own_read ON data_deletion_requests;
CREATE POLICY deletion_own_read ON data_deletion_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS deletion_own_insert ON data_deletion_requests;
CREATE POLICY deletion_own_insert ON data_deletion_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── ADMIN AUDIT LOG (append-only for admins) ───────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_log_insert_only ON admin_audit_log;
CREATE POLICY admin_log_insert_only ON admin_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'owner_admin')
    )
  );
-- No SELECT policy: append-only from clients; full log reads use service_role (bypasses RLS).
CREATE INDEX IF NOT EXISTS idx_admin_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created ON admin_audit_log(created_at DESC);

-- ── MESSAGES abuse columns ─────────────────────────────────────────────────

-- ── HONEYPOT TRIGGERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS honeypot_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  user_agent TEXT,
  form_type TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE honeypot_triggers DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_honeypot_ip ON honeypot_triggers(ip_address, triggered_at DESC);

-- ── PROFILE SUSPENSION FLAGS ────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- ── assess_petition_integrity ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION assess_petition_integrity(p_petition_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_sigs INTEGER;
  v_new_account_count INTEGER;
  v_new_account_ratio NUMERIC;
  v_score INTEGER := 100;
  v_flags JSONB := '[]'::jsonb;
  v_peak_hour INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_sigs
  FROM petition_signatures WHERE petition_id = p_petition_id;

  IF v_total_sigs < 5 THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_new_account_count
  FROM petition_signatures ps
  JOIN profiles p ON p.id = ps.user_id
  WHERE ps.petition_id = p_petition_id
    AND ps.user_id IS NOT NULL
    AND p.created_date > NOW() - INTERVAL '7 days';

  v_new_account_ratio := (v_new_account_count::NUMERIC / NULLIF(v_total_sigs, 0)) * 100;

  IF v_new_account_ratio > 40 THEN
    v_score := v_score - 30;
    v_flags := v_flags || jsonb_build_array('new_account_surge');
  END IF;

  SELECT MAX(hourly_count) INTO v_peak_hour FROM (
    SELECT COUNT(*) AS hourly_count
    FROM petition_signatures
    WHERE petition_id = p_petition_id
    GROUP BY date_trunc('hour', created_at)
  ) sub;

  IF COALESCE(v_peak_hour, 0) > 500 THEN
    v_score := v_score - 25;
    v_flags := v_flags || jsonb_build_array('velocity_spike');
  END IF;

  INSERT INTO petition_integrity (
    petition_id, integrity_score, flags,
    signatures_per_hour_peak, new_account_ratio,
    last_assessed_at, is_flagged
  ) VALUES (
    p_petition_id, GREATEST(0, v_score), v_flags,
    COALESCE(v_peak_hour, 0), COALESCE(v_new_account_ratio, 0),
    NOW(), v_score < 60
  )
  ON CONFLICT (petition_id) DO UPDATE SET
    integrity_score = EXCLUDED.integrity_score,
    flags = EXCLUDED.flags,
    signatures_per_hour_peak = EXCLUDED.signatures_per_hour_peak,
    new_account_ratio = EXCLUDED.new_account_ratio,
    last_assessed_at = EXCLUDED.last_assessed_at,
    is_flagged = EXCLUDED.is_flagged;
END;
$$;

CREATE OR REPLACE FUNCTION check_auto_suspend()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target uuid;
  v_report_count INTEGER;
  v_user_role TEXT;
BEGIN
  v_target := NEW.target_author_id;
  IF v_target IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_report_count
  WHERE r.target_author_id = v_target
    AND r.created_date > NOW() - INTERVAL '7 days'
    AND r.status = 'open';

  SELECT role INTO v_user_role FROM profiles WHERE id = v_target;
  IF v_user_role IN ('admin', 'owner_admin') THEN
    RETURN NEW;
  END IF;

  IF v_report_count >= 10 THEN
    IF NOT EXISTS (
      SELECT 1 FROM account_suspensions s
      WHERE s.user_id = v_target AND s.is_active = TRUE AND (s.expires_at IS NULL OR s.expires_at > NOW())
    ) THEN
      INSERT INTO account_suspensions (
        user_id, reason, evidence, expires_at, is_active
      ) VALUES (
        v_target,
        jsonb_build_object('report_count', v_report_count, 'window', '7 days'),
        NOW() + INTERVAL '48 hours',
        TRUE
      );
    END IF;

    UPDATE profiles
      SET is_suspended = TRUE, suspended_until = NOW() + INTERVAL '48 hours'
      WHERE id = v_target
        AND role NOT IN ('admin', 'owner_admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_suspend
  FOR EACH ROW EXECUTE FUNCTION check_auto_suspend();

-- ── Integrity assessment every 50 signatures ──────────────────────────────
CREATE OR REPLACE FUNCTION trigger_integrity_assessment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM petition_signatures WHERE petition_id = NEW.petition_id;
  IF cnt > 0 AND cnt % 50 = 0 THEN
    PERFORM assess_petition_integrity(NEW.petition_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_petition_integrity ON petition_signatures;
CREATE TRIGGER trigger_petition_integrity
  AFTER INSERT ON petition_signatures
  FOR EACH ROW EXECUTE FUNCTION trigger_integrity_assessment();

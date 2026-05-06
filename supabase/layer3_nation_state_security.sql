-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 3 — nation-state / advanced threats (run in Supabase SQL Editor)
-- Requires: public.petitions, public.profiles, public.honeypot_triggers (Layer 2)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── IMMUTABLE EVENT CHAIN ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_chain (
  id            BIGSERIAL PRIMARY KEY,
  sequence_num  BIGINT NOT NULL UNIQUE,
  event_type    TEXT NOT NULL,
  actor_id      UUID,
  subject_id    UUID,
  subject_type  TEXT,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address    TEXT,
  prev_hash     TEXT NOT NULL,
  row_hash      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE event_chain ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_chain_no_access ON event_chain;
CREATE POLICY event_chain_no_access ON event_chain FOR ALL USING (false);
CREATE INDEX IF NOT EXISTS idx_event_chain_seq ON event_chain(sequence_num DESC);
CREATE INDEX IF NOT EXISTS idx_event_chain_actor ON event_chain(actor_id);
CREATE INDEX IF NOT EXISTS idx_event_chain_subject ON event_chain(subject_id);

-- ── PETITION RECEIPTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS petition_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id     UUID NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receipt_hash    TEXT NOT NULL UNIQUE,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  petition_title  TEXT,
  signer_name     TEXT,
  is_anonymous    BOOLEAN DEFAULT FALSE,
  verified        BOOLEAN DEFAULT FALSE,
  UNIQUE(petition_id, user_id)
);

ALTER TABLE petition_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS receipts_own_read ON petition_receipts;
CREATE POLICY receipts_own_read ON petition_receipts
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_hash ON petition_receipts(receipt_hash);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON petition_receipts(user_id);

-- ── IP REPUTATION ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ip_reputation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address      TEXT NOT NULL UNIQUE,
  risk_score      INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  is_blocked      BOOLEAN DEFAULT FALSE,
  block_reason    TEXT,
  is_tor          BOOLEAN DEFAULT FALSE,
  is_vpn          BOOLEAN DEFAULT FALSE,
  is_datacenter   BOOLEAN DEFAULT FALSE,
  country_code    TEXT,
  honeypot_hits   INTEGER DEFAULT 0,
  rate_limit_hits INTEGER DEFAULT 0,
  failed_auth     INTEGER DEFAULT 0,
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  blocked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ip_reputation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ip_rep_no_client ON ip_reputation;
CREATE POLICY ip_rep_no_client ON ip_reputation FOR ALL USING (false);
CREATE INDEX IF NOT EXISTS idx_ip_rep_addr ON ip_reputation(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_rep_blocked ON ip_reputation(is_blocked);
CREATE INDEX IF NOT EXISTS idx_ip_rep_score ON ip_reputation(risk_score DESC);

-- ── BRUTE FORCE LOG ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brute_force_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address  TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  was_blocked BOOLEAN DEFAULT FALSE
);

ALTER TABLE brute_force_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bf_no_client ON brute_force_log;
CREATE POLICY bf_no_client ON brute_force_log FOR ALL USING (false);
CREATE INDEX IF NOT EXISTS idx_bf_ip_time ON brute_force_log(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bf_endpoint ON brute_force_log(endpoint, attempted_at DESC);

CREATE OR REPLACE FUNCTION clean_brute_force_log()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM brute_force_log WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- ── PLATFORM STATUS (singleton) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_status (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  panic_mode      BOOLEAN DEFAULT FALSE,
  panic_reason    TEXT,
  panic_activated_at TIMESTAMPTZ,
  panic_activated_by UUID REFERENCES profiles(id),
  maintenance_mode BOOLEAN DEFAULT FALSE,
  read_only_mode  BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_status (id, panic_mode, maintenance_mode, read_only_mode)
  VALUES (1, FALSE, FALSE, FALSE)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS status_public_read ON platform_status;
CREATE POLICY status_public_read ON platform_status FOR SELECT USING (true);
DROP POLICY IF EXISTS status_no_client_write ON platform_status;
CREATE POLICY status_no_client_write ON platform_status
  FOR UPDATE USING (false);

-- ── CONTENT WATERMARKS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_watermarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type    TEXT NOT NULL,
  content_id      UUID NOT NULL,
  creator_id      UUID REFERENCES profiles(id),
  watermark_hash  TEXT NOT NULL UNIQUE,
  platform        TEXT DEFAULT 'voicetoaction.com',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_id)
);

ALTER TABLE content_watermarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS watermarks_public_read ON content_watermarks;
CREATE POLICY watermarks_public_read ON content_watermarks FOR SELECT USING (true);
DROP POLICY IF EXISTS watermarks_insert_own ON content_watermarks;
CREATE POLICY watermarks_insert_own ON content_watermarks FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- ── OWNER HEARTBEAT ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owner_heartbeat (
  id            INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_active   TIMESTAMPTZ DEFAULT NOW(),
  alert_sent_at TIMESTAMPTZ,
  alert_count   INTEGER DEFAULT 0
);

INSERT INTO owner_heartbeat (id, last_active)
  VALUES (1, NOW())
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE owner_heartbeat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS heartbeat_no_client ON owner_heartbeat;
CREATE POLICY heartbeat_no_client ON owner_heartbeat FOR ALL USING (false);

-- ── HARDENED SEARCH (parameterised) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION search_petitions(search_term TEXT, status_filter TEXT DEFAULT 'active')
RETURNS TABLE(
  id UUID, title TEXT, short_summary TEXT, category TEXT,
  signature_count_total INTEGER, created_at TIMESTAMPTZ
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(search_term) > 200 THEN
    RAISE EXCEPTION 'Search term too long';
  END IF;
  IF position(E'\0' IN search_term) > 0 THEN
    RAISE EXCEPTION 'Invalid characters in search term';
  END IF;

  RETURN QUERY
  SELECT p.id, p.title, p.short_summary, p.category,
         p.signature_count_total,
         COALESCE(p.created_at, p.created_date)::timestamptz
  FROM petitions p
  WHERE p.status = status_filter
    AND (
      p.title ILIKE '%' || search_term || '%'
      OR p.short_summary ILIKE '%' || search_term || '%'
    )
  ORDER BY p.signature_count_total DESC NULLS LAST
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION search_profiles(search_term TEXT)
RETURNS TABLE(id UUID, full_name TEXT, role TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(search_term) > 100 THEN
    RAISE EXCEPTION 'Search term too long';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.role, p.created_date::timestamptz
  FROM profiles p
  WHERE p.full_name IS NOT NULL
    AND p.full_name ILIKE '%' || search_term || '%'
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION verify_event_chain_integrity(start_seq BIGINT DEFAULT 1)
RETURNS TABLE(is_intact BOOLEAN, broken_at_sequence BIGINT, total_checked BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prev_hash_val TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
  chain_broken BOOLEAN := FALSE;
  broken_seq BIGINT := NULL;
  checked BIGINT := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT sequence_num, row_hash, prev_hash
    FROM event_chain
    WHERE sequence_num >= start_seq
    ORDER BY sequence_num ASC
  LOOP
    checked := checked + 1;
    IF rec.prev_hash IS DISTINCT FROM prev_hash_val THEN
      chain_broken := TRUE;
      broken_seq := rec.sequence_num;
      EXIT;
    END IF;
    prev_hash_val := rec.row_hash;
  END LOOP;

  RETURN QUERY SELECT NOT chain_broken, broken_seq, checked;
END;
$$;

-- Verification OTP support columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_otp TEXT,
  ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_otp TEXT,
  ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_blue_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_kyc_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid_identity_verification_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_identity_session_id TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
INSERT INTO public.profiles (id, email, full_name, role, created_date)
VALUES (
new.id,
new.email,
COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
'user',
now()
);
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user_roles()
RETURNS trigger AS $$
DECLARE
  target_user_id uuid;
  highest_role text;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  SELECT ur.role
  INTO highest_role
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id
  ORDER BY CASE ur.role
    WHEN 'owner_admin' THEN 100
    WHEN 'admin' THEN 80
    WHEN 'moderator' THEN 60
    WHEN 'verified' THEN 40
    WHEN 'user' THEN 20
    ELSE 0
  END DESC
  LIMIT 1;

  UPDATE public.profiles
  SET role = COALESCE(highest_role, 'user')
  WHERE id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_role_from_user_roles ON public.user_roles;
CREATE TRIGGER trg_sync_profile_role_from_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_user_roles();

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AUD',
  payment_type text NOT NULL,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  discount_percent numeric(5,2) NOT NULL DEFAULT 10,
  commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  uses_count integer NOT NULL DEFAULT 0,
  created_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_date timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS stripe_identity_session_id TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.petition_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'pending',
  created_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type text NOT NULL,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  current_period_end timestamptz,
  created_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_user_read_own ON public.transactions;
CREATE POLICY transactions_user_read_own ON public.transactions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS referral_codes_read_all ON public.referral_codes;
CREATE POLICY referral_codes_read_all ON public.referral_codes
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS referral_codes_owner_write ON public.referral_codes;
CREATE POLICY referral_codes_owner_write ON public.referral_codes
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS referral_transactions_user_read_own ON public.referral_transactions;
CREATE POLICY referral_transactions_user_read_own ON public.referral_transactions
FOR SELECT TO authenticated
USING (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS referral_transactions_referrer_read ON public.referral_transactions;
CREATE POLICY referral_transactions_referrer_read ON public.referral_transactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.referral_codes rc
    WHERE rc.id = referral_transactions.referral_code_id
    AND rc.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS verification_requests_user_read_own ON public.verification_requests;
CREATE POLICY verification_requests_user_read_own ON public.verification_requests
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS verification_requests_user_create_own ON public.verification_requests;
CREATE POLICY verification_requests_user_create_own ON public.verification_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS petition_withdrawals_user_read_own ON public.petition_withdrawals;
CREATE POLICY petition_withdrawals_user_read_own ON public.petition_withdrawals
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS petition_withdrawals_user_create_own ON public.petition_withdrawals;
CREATE POLICY petition_withdrawals_user_create_own ON public.petition_withdrawals
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS subscriptions_user_read_own ON public.subscriptions;
CREATE POLICY subscriptions_user_read_own ON public.subscriptions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_select_admin ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role::text IN ('admin', 'owner_admin')
  )
);

-- Note: anonymous discovery uses public.public_profiles_view (see supabase/public_profile_view.sql).

DROP POLICY IF EXISTS profiles_user_update_own ON public.profiles;
CREATE POLICY profiles_user_update_own ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_role_updates_by_users()
RETURNS trigger AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Users cannot update role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_updates_by_users ON public.profiles;
CREATE TRIGGER trg_prevent_role_updates_by_users
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_updates_by_users();

DROP POLICY IF EXISTS terms_acceptances_insert_anyone ON public.terms_acceptances;
CREATE POLICY terms_acceptances_insert_anyone ON public.terms_acceptances
FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS terms_acceptances_user_read_own ON public.terms_acceptances;
CREATE POLICY terms_acceptances_user_read_own ON public.terms_acceptances
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Security infrastructure tables and policies
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

CREATE TABLE IF NOT EXISTS rate_limit_store (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  threat_type TEXT NOT NULL,
  confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMPTZ,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_admin_only ON security_audit_log;
CREATE POLICY audit_log_admin_only ON security_audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin'))
);
DROP POLICY IF EXISTS audit_log_no_update ON security_audit_log;
CREATE POLICY audit_log_no_update ON security_audit_log FOR UPDATE USING (false);
DROP POLICY IF EXISTS audit_log_no_delete ON security_audit_log;
CREATE POLICY audit_log_no_delete ON security_audit_log FOR DELETE USING (false);

DROP POLICY IF EXISTS rate_limit_no_user_access ON rate_limit_store;
CREATE POLICY rate_limit_no_user_access ON rate_limit_store FOR ALL USING (false);

DROP POLICY IF EXISTS threat_intel_no_user_access ON threat_intelligence;
CREATE POLICY threat_intel_no_user_access ON threat_intelligence FOR ALL USING (false);

DROP POLICY IF EXISTS session_own ON session_registry;
CREATE POLICY session_own ON session_registry FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS session_admin ON session_registry;
CREATE POLICY session_admin ON session_registry FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_threat_intel_ip ON threat_intelligence(ip_address);
CREATE INDEX IF NOT EXISTS idx_threat_intel_user ON threat_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_session_user ON session_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_key ON rate_limit_store(key);

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM rate_limit_store
  WHERE window_start < NOW() - INTERVAL '1 hour'
    AND (blocked_until IS NULL OR blocked_until < NOW());
END;
$$;

-- Social graph, following feed, and messaging system
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

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_follow_counts ON follows;
CREATE TRIGGER trigger_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

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
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity(activity_type);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_one, participant_two),
  CHECK (participant_one != participant_two)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversations_select ON conversations;
CREATE POLICY conversations_select ON conversations FOR SELECT
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);
DROP POLICY IF EXISTS conversations_insert ON conversations;
CREATE POLICY conversations_insert ON conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);
DROP POLICY IF EXISTS conversations_update ON conversations;
CREATE POLICY conversations_update ON conversations FOR UPDATE
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE INDEX IF NOT EXISTS idx_conv_p1 ON conversations(participant_one);
CREATE INDEX IF NOT EXISTS idx_conv_p2 ON conversations(participant_two);
CREATE INDEX IF NOT EXISTS idx_conv_last ON conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_select ON messages;
CREATE POLICY messages_select ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );
DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS unread_count_one INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_count_two INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- COMMUNITIES: plan tiers, Stripe billing, discovery flags
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority_search BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC(10,2) DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_invite_unique ON communities(invite_code) WHERE invite_code IS NOT NULL;

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM communities WHERE invite_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Legacy-compatible member rows (app uses status + founder role)
ALTER TABLE community_members
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id);

ALTER TABLE community_members
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_members_select ON community_members;
CREATE POLICY community_members_select ON community_members FOR SELECT USING (true);

DROP POLICY IF EXISTS community_members_insert ON community_members;
CREATE POLICY community_members_insert ON community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_members_delete ON community_members;
CREATE POLICY community_members_delete ON community_members FOR DELETE
  USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin', 'founder')
    )
  );

CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = COALESCE(member_count, 0) + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(0, COALESCE(member_count, 0) - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_community_member_count ON community_members;
CREATE TRIGGER trigger_community_member_count
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

CREATE OR REPLACE FUNCTION update_community_post_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET post_count = COALESCE(post_count, 0) + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET post_count = GREATEST(0, COALESCE(post_count, 0) - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 300),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 50000),
  post_type TEXT NOT NULL DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'announcement', 'poll_link', 'petition_link')),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_internal BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_community_post_count ON community_posts;
CREATE TRIGGER trigger_community_post_count
  AFTER INSERT OR DELETE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_community_post_count();

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_posts_select ON community_posts;
CREATE POLICY community_posts_select ON community_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_posts.community_id
      AND (
        (COALESCE(c.plan, 'free') != 'private' AND COALESCE(c.is_hidden, false) = false)
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
        )
        OR c.founder_user_id = auth.uid()
        OR c.community_owner = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS community_posts_insert ON community_posts;
CREATE POLICY community_posts_insert ON community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_posts.community_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS community_posts_update ON community_posts;
CREATE POLICY community_posts_update ON community_posts FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS community_posts_delete ON community_posts;
CREATE POLICY community_posts_delete ON community_posts FOR DELETE
  USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_posts.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin', 'moderator', 'founder')
    )
  );

CREATE TABLE IF NOT EXISTS community_subscription_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2),
  stripe_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_subscription_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sub_log_admin_select ON community_subscription_log;
CREATE POLICY sub_log_admin_select ON community_subscription_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));

DROP POLICY IF EXISTS sub_log_admin_insert ON community_subscription_log;
CREATE POLICY sub_log_admin_insert ON community_subscription_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));

CREATE INDEX IF NOT EXISTS idx_community_posts_community ON community_posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_communities_plan ON communities(plan, plan_status);
CREATE INDEX IF NOT EXISTS idx_communities_invite ON communities(invite_code);

-- Petition withdrawal support
ALTER TABLE petitions
  ADD COLUMN IF NOT EXISTS allow_public_withdrawal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS withdrawal_count INTEGER DEFAULT 0;

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE petition_withdrawals
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2) DEFAULT 1.99,
  ADD COLUMN IF NOT EXISTS email_sent_to TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE petition_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS withdrawal_own ON petition_withdrawals;
CREATE POLICY withdrawal_own ON petition_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS withdrawal_insert ON petition_withdrawals;
CREATE POLICY withdrawal_insert ON petition_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawals_unique_user_petition
  ON petition_withdrawals(petition_id, user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_petition ON petition_withdrawals(petition_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON petition_withdrawals(user_id);

-- Saved creator referral code on user profile (auto-apply at checkout in app)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_referral_code TEXT;

-- ── Security hardening: users may read their own audit rows (admins still use existing policy) ──
DROP POLICY IF EXISTS audit_own_read ON security_audit_log;
CREATE POLICY audit_own_read ON security_audit_log FOR SELECT USING (auth.uid() = user_id);

-- Performance indexes for tables defined in this schema
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_communities_hidden ON communities(is_hidden, plan);
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON user_activity(user_id, created_at DESC);

-- Layer 2 advanced security (devices, suspicious logins, integrity, deletion requests, etc.):
-- Run supabase/layer2_advanced_security.sql in the SQL Editor when core tables exist.

-- Layer 3 (event chain, receipts, IP reputation, panic mode, watermarks, hardened search):
-- Run supabase/layer3_nation_state_security.sql in the SQL Editor after Layer 2.

-- Layer 4 (TOTP metadata, sessions, behaviour baseline, duplicate detection, legal holds, delivery proofs, moderation pipeline, admin RLS for dashboard):
-- Run supabase/layer4_maximum_depth_security.sql in the SQL Editor after Layers 2–3.

-- ── CONVERSATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES profiles(id),
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_sender_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ── CONVERSATION PARTICIPANTS ──────────────────────────────────────────────
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

DROP POLICY IF EXISTS conv_participant_select ON conversations;
CREATE POLICY conv_participant_select ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS conv_participant_insert ON conversations;
CREATE POLICY conv_participant_insert ON conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS conv_participant_update ON conversations;
CREATE POLICY conv_participant_update ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
      AND cp.is_admin = TRUE
    )
  );

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

-- ── MESSAGES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to_id UUID REFERENCES messages(id),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_participant_select ON messages;
CREATE POLICY messages_participant_select ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_own_insert ON messages;
CREATE POLICY messages_own_insert ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_own_update ON messages;
CREATE POLICY messages_own_update ON messages FOR UPDATE USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ── MESSAGE REACTIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reactions_participant ON message_reactions;
CREATE POLICY reactions_participant ON message_reactions FOR ALL
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- ── TYPING INDICATORS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS typing_participant ON typing_indicators;
CREATE POLICY typing_participant ON typing_indicators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = typing_indicators.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_typing_conv ON typing_indicators(conversation_id);

-- ── profile messaging settings ─────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS messages_from_followers_only BOOLEAN DEFAULT FALSE;

-- ── FUNCTION: get or create direct conversation ────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
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

-- ── UPDATE last_message on new message ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_text = CASE WHEN NEW.content_type = 'text' THEN LEFT(NEW.content, 100) ELSE '📎 Attachment' END,
    last_message_at = NEW.created_at,
    last_message_sender_id = NEW.sender_id
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_last_message ON messages;
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ── CLEAN STALE TYPING INDICATORS ────────────────────────────────────────
CREATE OR REPLACE FUNCTION clean_stale_typing()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$;

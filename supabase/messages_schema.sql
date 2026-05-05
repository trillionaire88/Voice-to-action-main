CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  iv TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted_by_sender BOOLEAN DEFAULT FALSE,
  is_deleted_by_recipient BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_one, participant_two)
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_own ON messages;
CREATE POLICY messages_own ON messages FOR ALL
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversations_own ON conversations;
CREATE POLICY conversations_own ON conversations FOR ALL
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_one);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_two);

-- Fix missing columns causing petition create to fail
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS allow_public_withdrawal BOOLEAN DEFAULT FALSE;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN DEFAULT FALSE;

-- Fix missing columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS messages_from_followers_only BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_read_receipts BOOLEAN DEFAULT TRUE;

-- Fix missing columns on polls
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Fix communities query issues
ALTER TABLE communities ADD COLUMN IF NOT EXISTS country_code TEXT;

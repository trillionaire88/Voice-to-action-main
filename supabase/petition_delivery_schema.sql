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

ALTER TABLE petition_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY deliveries_public_read ON petition_deliveries FOR SELECT USING (is_public = TRUE);
CREATE POLICY deliveries_own_insert ON petition_deliveries FOR INSERT WITH CHECK (auth.uid() = delivered_by);
CREATE INDEX IF NOT EXISTS idx_deliveries_petition ON petition_deliveries(petition_id);

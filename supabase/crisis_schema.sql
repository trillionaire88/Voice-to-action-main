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

ALTER TABLE active_crises ENABLE ROW LEVEL SECURITY;
CREATE POLICY crises_public_read ON active_crises FOR SELECT USING (is_active = TRUE);
CREATE POLICY crises_admin_all ON active_crises FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner_admin')));

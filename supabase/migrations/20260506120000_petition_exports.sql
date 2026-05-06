-- Idempotency for petition export emails (Stripe webhook retries)
CREATE TABLE IF NOT EXISTS public.petition_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  petition_id uuid REFERENCES public.petitions (id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  sent_to text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.petition_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.petition_exports;
CREATE POLICY "Service role only" ON public.petition_exports FOR ALL USING (false);

COMMENT ON TABLE public.petition_exports IS 'Tracks fulfilled petition_export Stripe checkouts to prevent duplicate Resend emails on webhook retry.';

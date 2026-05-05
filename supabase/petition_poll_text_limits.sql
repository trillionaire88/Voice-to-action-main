-- Run in Supabase SQL editor. Safe to re-run (drops constraints before re-adding).

ALTER TABLE public.petition_signatures
  DROP CONSTRAINT IF EXISTS petition_signatures_petition_user_unique;

CREATE UNIQUE INDEX IF NOT EXISTS petition_signatures_petition_user_unique
  ON public.petition_signatures (petition_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.block_signature_if_account_too_new()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.user_id
      AND NOW() < COALESCE(p.created_date::timestamptz, p.created_at, NOW() - INTERVAL '1 day') + INTERVAL '60 seconds'
  ) THEN
    RAISE EXCEPTION 'Signing blocked for 60 seconds after account creation.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_petition_signatures_account_age ON public.petition_signatures;
CREATE TRIGGER trg_petition_signatures_account_age
  BEFORE INSERT ON public.petition_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.block_signature_if_account_too_new();

ALTER TABLE public.petitions DROP CONSTRAINT IF EXISTS petitions_full_description_len;
ALTER TABLE public.petitions
  ADD CONSTRAINT petitions_full_description_len
  CHECK (full_description IS NULL OR char_length(full_description) <= 20000);

ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_description_len;
ALTER TABLE public.polls
  ADD CONSTRAINT polls_description_len
  CHECK (description IS NULL OR char_length(description) <= 20000);

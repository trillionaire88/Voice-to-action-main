-- Atomically maintain petition signature counts from public.signatures.
-- Requires: public.petitions, public.signatures with petition_id, is_verified_user

CREATE OR REPLACE FUNCTION public.increment_petition_signature_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE petitions
  SET
    signature_count_total = GREATEST(0, COALESCE(signature_count_total, 0) + 1),
    signature_count_verified = GREATEST(
      0,
      COALESCE(signature_count_verified, 0) + CASE WHEN COALESCE(NEW.is_verified_user, false) THEN 1 ELSE 0 END
    )
  WHERE id = NEW.petition_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_petition_signature_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE petitions
  SET
    signature_count_total = GREATEST(0, COALESCE(signature_count_total, 0) - 1),
    signature_count_verified = GREATEST(
      0,
      COALESCE(signature_count_verified, 0) - CASE WHEN COALESCE(OLD.is_verified_user, false) THEN 1 ELSE 0 END
    )
  WHERE id = OLD.petition_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_signatures_increment_petition_counts ON public.signatures;
CREATE TRIGGER trg_signatures_increment_petition_counts
  AFTER INSERT ON public.signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_petition_signature_counts();

DROP TRIGGER IF EXISTS trg_signatures_decrement_petition_counts ON public.signatures;
CREATE TRIGGER trg_signatures_decrement_petition_counts
  AFTER DELETE ON public.signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_petition_signature_counts();

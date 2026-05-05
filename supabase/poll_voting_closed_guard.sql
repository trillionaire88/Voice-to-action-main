-- Reject votes when the poll is closed or not open (client-side checks can be bypassed).

CREATE OR REPLACE FUNCTION public.enforce_poll_accepts_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_end timestamptz;
  p_status text;
BEGIN
  SELECT end_time, status INTO p_end, p_status
  FROM public.polls
  WHERE id = NEW.poll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF p_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'This poll is not accepting votes';
  END IF;

  IF p_end IS NOT NULL AND p_end < NOW() THEN
    RAISE EXCEPTION 'This poll has closed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_votes_poll_must_be_open ON public.votes;
CREATE TRIGGER trg_votes_poll_must_be_open
  BEFORE INSERT OR UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_poll_accepts_votes();

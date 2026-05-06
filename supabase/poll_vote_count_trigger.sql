-- Maintain polls.total_votes_cached, poll_option aggregates, and profiles.polls_voted_count from public.votes.
-- Safe against malicious client-side counter updates.

ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS total_votes_cached INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_votes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_vote_cast_at TIMESTAMPTZ;

ALTER TABLE public.poll_options
  ADD COLUMN IF NOT EXISTS votes_count_cached INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_votes_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS polls_voted_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS is_verified_user BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.apply_vote_counts_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ver BOOLEAN := COALESCE(NEW.is_verified_user, false);
BEGIN
  UPDATE public.polls
  SET
    total_votes_cached = COALESCE(total_votes_cached, 0) + 1,
    verified_votes_count = COALESCE(verified_votes_count, 0) + CASE WHEN v_ver THEN 1 ELSE 0 END,
    first_vote_cast_at = COALESCE(first_vote_cast_at, NOW())
  WHERE id = NEW.poll_id;

  UPDATE public.poll_options
  SET
    votes_count_cached = COALESCE(votes_count_cached, 0) + 1,
    verified_votes_count = COALESCE(verified_votes_count, 0) + CASE WHEN v_ver THEN 1 ELSE 0 END
  WHERE id = NEW.option_id;

  UPDATE public.profiles
  SET polls_voted_count = COALESCE(polls_voted_count, 0) + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_vote_counts_after_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_ver BOOLEAN := COALESCE(OLD.is_verified_user, false);
  v_new_ver BOOLEAN := COALESCE(NEW.is_verified_user, false);
BEGIN
  IF OLD.option_id IS DISTINCT FROM NEW.option_id THEN
    UPDATE public.polls
    SET verified_votes_count = GREATEST(
      0,
      COALESCE(verified_votes_count, 0)
        - CASE WHEN v_old_ver THEN 1 ELSE 0 END
        + CASE WHEN v_new_ver THEN 1 ELSE 0 END
    )
    WHERE id = NEW.poll_id;

    UPDATE public.poll_options
    SET
      votes_count_cached = GREATEST(0, COALESCE(votes_count_cached, 0) - 1),
      verified_votes_count = GREATEST(0, COALESCE(verified_votes_count, 0) - CASE WHEN v_old_ver THEN 1 ELSE 0 END)
    WHERE id = OLD.option_id;

    UPDATE public.poll_options
    SET
      votes_count_cached = COALESCE(votes_count_cached, 0) + 1,
      verified_votes_count = COALESCE(verified_votes_count, 0) + CASE WHEN v_new_ver THEN 1 ELSE 0 END
    WHERE id = NEW.option_id;
  END IF;

  IF OLD.option_id IS NOT DISTINCT FROM NEW.option_id AND v_old_ver IS DISTINCT FROM v_new_ver THEN
    UPDATE public.polls
    SET verified_votes_count = GREATEST(
      0,
      COALESCE(verified_votes_count, 0) + CASE WHEN v_new_ver THEN 1 ELSE -1 END
    )
    WHERE id = NEW.poll_id;

    UPDATE public.poll_options
    SET verified_votes_count = GREATEST(
      0,
      COALESCE(verified_votes_count, 0) + CASE WHEN v_new_ver THEN 1 ELSE -1 END
    )
    WHERE id = NEW.option_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_vote_counts_after_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ver BOOLEAN := COALESCE(OLD.is_verified_user, false);
BEGIN
  UPDATE public.polls
  SET
    total_votes_cached = GREATEST(0, COALESCE(total_votes_cached, 0) - 1),
    verified_votes_count = GREATEST(0, COALESCE(verified_votes_count, 0) - CASE WHEN v_ver THEN 1 ELSE 0 END)
  WHERE id = OLD.poll_id;

  UPDATE public.poll_options
  SET
    votes_count_cached = GREATEST(0, COALESCE(votes_count_cached, 0) - 1),
    verified_votes_count = GREATEST(0, COALESCE(verified_votes_count, 0) - CASE WHEN v_ver THEN 1 ELSE 0 END)
  WHERE id = OLD.option_id;

  UPDATE public.profiles
  SET polls_voted_count = GREATEST(0, COALESCE(polls_voted_count, 0) - 1)
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_votes_apply_counts_insert ON public.votes;
CREATE TRIGGER trg_votes_apply_counts_insert
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_vote_counts_after_insert();

DROP TRIGGER IF EXISTS trg_votes_apply_counts_update ON public.votes;
CREATE TRIGGER trg_votes_apply_counts_update
  AFTER UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_vote_counts_after_update();

DROP TRIGGER IF EXISTS trg_votes_apply_counts_delete ON public.votes;
CREATE TRIGGER trg_votes_apply_counts_delete
  AFTER DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_vote_counts_after_delete();

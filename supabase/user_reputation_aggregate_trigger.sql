-- Recompute profile reputation subscores from user_reputation_ratings (server-side).
-- Duplicate of user_rating_aggregate_trigger.sql — deploy only one file to avoid redundant ALTERs.
-- Requires: public.profiles, public.user_reputation_ratings

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score_overall double precision DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score_constructive double precision DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score_respectful double precision DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score_well_reasoned double precision DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_last_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.recalc_profile_reputation_from_user_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  v_con double precision;
  v_res double precision;
  v_well double precision;
BEGIN
  tid := COALESCE(NEW.target_user_id, OLD.target_user_id);
  IF tid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(AVG(value::double precision), 0) INTO v_con
  FROM user_reputation_ratings WHERE target_user_id = tid AND category = 'constructive';

  SELECT COALESCE(AVG(value::double precision), 0) INTO v_res
  FROM user_reputation_ratings WHERE target_user_id = tid AND category = 'respectful';

  SELECT COALESCE(AVG(value::double precision), 0) INTO v_well
  FROM user_reputation_ratings WHERE target_user_id = tid AND category = 'well_reasoned';

  UPDATE profiles
  SET
    reputation_score_constructive = v_con,
    reputation_score_respectful = v_res,
    reputation_score_well_reasoned = v_well,
    reputation_score_overall = (v_con + v_res + v_well) / 3.0,
    reputation_last_updated_at = now()
  WHERE id = tid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_user_reputation_ratings_recalc ON public.user_reputation_ratings;
CREATE TRIGGER trg_user_reputation_ratings_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.user_reputation_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_profile_reputation_from_user_ratings();

-- Server-side aggregates for public figure ratings (SECURITY DEFINER).
-- Requires: public.public_figures, public.figure_ratings

CREATE OR REPLACE FUNCTION public.recalc_public_figure_rating_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fid uuid;
BEGIN
  fid := COALESCE(NEW.figure_id, OLD.figure_id);
  IF fid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public_figures
  SET
    trustworthiness_rating = COALESCE((
      SELECT AVG(trustworthiness::numeric) FROM figure_ratings WHERE figure_id = fid
    ), 0),
    ethical_conduct_rating = COALESCE((
      SELECT AVG(ethical_conduct::numeric) FROM figure_ratings WHERE figure_id = fid
    ), 0),
    transparency_rating = COALESCE((
      SELECT AVG(transparency::numeric) FROM figure_ratings WHERE figure_id = fid
    ), 0)
  WHERE id = fid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_figure_ratings_recalc ON public.figure_ratings;
CREATE TRIGGER trg_figure_ratings_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.figure_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_public_figure_rating_aggregates();

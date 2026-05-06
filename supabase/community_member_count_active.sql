-- Adjust cached member_count only for active memberships (and when status changes).
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE communities SET member_count = COALESCE(member_count, 0) + 1 WHERE id = NEW.community_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE communities SET member_count = GREATEST(0, COALESCE(member_count, 0) - 1) WHERE id = OLD.community_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status IS DISTINCT FROM 'active') AND NEW.status = 'active' THEN
      UPDATE communities SET member_count = COALESCE(member_count, 0) + 1 WHERE id = NEW.community_id;
    ELSIF OLD.status = 'active' AND (NEW.status IS DISTINCT FROM 'active') THEN
      UPDATE communities SET member_count = GREATEST(0, COALESCE(member_count, 0) - 1) WHERE id = NEW.community_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_community_member_count ON community_members;
CREATE TRIGGER trigger_community_member_count
  AFTER INSERT OR DELETE OR UPDATE OF status ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

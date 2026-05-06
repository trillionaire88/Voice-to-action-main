import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * communityAccess — server-side enforcement of private community access codes
 */
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, community_id, access_code } = body;

    if (!community_id) return Response.json({ error: 'community_id required' }, { status: 400 });

    const communities = await adminEntities.Community.filter({ id: community_id });
    const community = communities[0];
    if (!community) return Response.json({ error: 'Community not found' }, { status: 404 });

    const isPrivate = community.privacy === 'private' || community.community_type === 'private_community';

    if (action === 'join') {
      const currentMembers = Array.isArray(community.member_ids) ? community.member_ids : [];

      if (currentMembers.includes(user.id) || community.owner_user_id === user.id) {
        return Response.json({ success: true, already_member: true });
      }

      if (isPrivate) {
        if (!access_code) {
          return Response.json({ error: 'Access code required for private communities', requires_code: true }, { status: 403 });
        }
        if (!community.access_code || access_code.trim() !== community.access_code.trim()) {
          return Response.json({ error: 'Invalid access code', requires_code: true }, { status: 403 });
        }
      }

      await adminEntities.Community.update(community_id, {
        member_ids: [...currentMembers, user.id],
      });

      console.log(`[CommunityAccess] User ${user.id} joined community ${community_id} (private: ${isPrivate})`);
      return Response.json({ success: true, joined: true });
    }

    if (action === 'leave') {
      if (community.owner_user_id === user.id) {
        return Response.json({ error: 'Community owner cannot leave. Transfer ownership or delete the community.' }, { status: 400 });
      }
      const currentMembers = Array.isArray(community.member_ids) ? community.member_ids : [];
      await adminEntities.Community.update(community_id, {
        member_ids: currentMembers.filter(id => id !== user.id),
      });
      console.log(`[CommunityAccess] User ${user.id} left community ${community_id}`);
      return Response.json({ success: true, left: true });
    }

    if (action === 'check') {
      const currentMembers = Array.isArray(community.member_ids) ? community.member_ids : [];
      const isMember = currentMembers.includes(user.id) || community.owner_user_id === user.id;
      return Response.json({
        is_member: isMember,
        is_owner: community.owner_user_id === user.id,
        is_private: isPrivate,
        requires_code: isPrivate && !isMember,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[CommunityAccess] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
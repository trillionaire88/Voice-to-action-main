import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * validateAction — server-side deduplication guard
 */
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { action, petition_id, poll_id, community_id } = body;

    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    if (action === 'check_petition_signature' && petition_id) {
      const existing = await adminEntities.PetitionSignature.filter({
        petition_id,
        user_id: user.id,
      });
      const valid = existing.filter(s => !s.is_invalidated && !s.has_withdrawn);
      return Response.json({ already_done: valid.length > 0, action: 'sign_petition', petition_id });
    }

    if (action === 'check_poll_vote' && poll_id) {
      const existing = await adminEntities.Vote.filter({ poll_id, user_id: user.id });
      return Response.json({ already_done: existing.length > 0, existing_vote: existing[0] || null, action: 'vote_poll', poll_id });
    }

    if (action === 'check_community_membership' && community_id) {
      const communities = await adminEntities.Community.filter({ id: community_id });
      const community = communities[0];
      if (!community) return Response.json({ error: 'Community not found' }, { status: 404 });
      const isMember = (community.member_ids || []).includes(user.id);
      return Response.json({ already_done: isMember, is_owner: community.owner_user_id === user.id, action: 'join_community', community_id });
    }

    if (action === 'record_action') {
      const { action_type, subject_id, metadata = {} } = body;
      if (!action_type || !subject_id) return Response.json({ error: 'action_type and subject_id required' }, { status: 400 });
      await adminEntities.UserActionLog.create({
        user_id: user.id,
        action_type,
        subject_id,
        metadata,
        performed_at: new Date().toISOString(),
      }).catch(() => {});
      return Response.json({ recorded: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[ValidateAction] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
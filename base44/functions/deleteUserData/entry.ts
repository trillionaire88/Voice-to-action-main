import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * deleteUserData — processes account deletion requests
 */
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const caller = await getUser().catch(() => null);
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, immediate = false } = body;

    const isAdmin = caller.role === 'owner_admin' || caller.role === 'admin';

    // Only admins can delete other users' data or use immediate mode
    if (user_id && user_id !== caller.id && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (immediate && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetId = user_id || caller.id;
    if (!targetId) return Response.json({ error: 'user_id required' }, { status: 400 });

    const results = {};

    await adminEntities.User.update(targetId, {
      full_name: '[Deleted User]',
      display_name: '[Deleted User]',
      email: `deleted_${targetId}@deleted.invalid`,
      profile_avatar_url: null,
      bio: null,
      website_url: null,
      phone_number: null,
      country_code: null,
      account_status: 'deleted',
      account_deletion_completed_at: new Date().toISOString(),
      is_kyc_verified: false,
      paid_identity_verification_completed: false,
      has_community_subscription: false,
    }).catch(e => console.error('[DeleteUserData] User anonymise error:', e.message));

    const votes = await adminEntities.Vote.filter({ user_id: targetId });
    let voteCount = 0;
    for (const v of votes) {
      await adminEntities.Vote.delete(v.id).catch(() => {});
      voteCount++;
    }
    results.votes_deleted = voteCount;

    const signatures = await adminEntities.PetitionSignature.filter({ user_id: targetId });
    let sigCount = 0;
    for (const s of signatures) {
      await adminEntities.PetitionSignature.update(s.id, {
        signer_name: '[Deleted User]',
        signer_email: `deleted_${targetId}@deleted.invalid`,
        user_id: null,
        city: null,
        region_code: null,
      }).catch(() => {});
      const pets = await adminEntities.Petition.filter({ id: s.petition_id });
      const p = pets[0];
      if (p && s.petition_id) {
        const verifiedDelta = s.is_verified_user ? 1 : 0;
        await adminEntities.Petition.update(s.petition_id, {
          signature_count_total: Math.max(0, (p.signature_count_total || 0) - 1),
          signature_count_verified: Math.max(0, (p.signature_count_verified || 0) - verifiedDelta),
        }).catch(() => {});
      }
      sigCount++;
    }
    results.signatures_anonymised = sigCount;

    const polls = await adminEntities.Poll.filter({ creator_user_id: targetId });
    for (const p of polls) {
      await adminEntities.Poll.update(p.id, { creator_user_id: null, creator_name: '[Deleted User]' }).catch(() => {});
    }
    results.polls_anonymised = polls.length;

    const petitions = await adminEntities.Petition.filter({ creator_user_id: targetId });
    for (const p of petitions) {
      await adminEntities.Petition.update(p.id, { creator_user_id: null, creator_name: '[Deleted User]', creator_email: null }).catch(() => {});
    }
    results.petitions_anonymised = petitions.length;

    const comments = await adminEntities.Comment.filter({ user_id: targetId });
    for (const c of comments) {
      await adminEntities.Comment.update(c.id, { content: '[This comment was deleted]', user_id: null, author_name: '[Deleted User]' }).catch(() => {});
    }
    results.comments_anonymised = comments.length;

    const notifications = await adminEntities.Notification.filter({ user_id: targetId });
    let notifCount = 0;
    for (const n of notifications.slice(0, 500)) {
      await adminEntities.Notification.delete(n.id).catch(() => {});
      notifCount++;
    }
    results.notifications_deleted = notifCount;

    const subs = await adminEntities.Subscription.filter({ user_id: targetId });
    for (const s of subs) {
      await adminEntities.Subscription.update(s.id, { status: 'cancelled', cancelled_at: new Date().toISOString() }).catch(() => {});
    }
    results.subscriptions_cancelled = subs.length;

    await adminEntities.ComplianceLog.create({
      event_type: 'account_deletion',
      action_detail: `Account deletion completed for user ${targetId}`,
      metadata: { user_id: targetId, results, immediate },
      severity: 'info',
    }).catch(() => {});

    console.log(`[DeleteUserData] Deletion complete for user ${targetId}:`, results);
    return Response.json({ success: true, user_id: targetId, results });

  } catch (error) {
    console.error('[DeleteUserData] Fatal error:', error.message);
    return Response.json({ error: 'An internal error occurred' }, { status: 500 });
  }
});
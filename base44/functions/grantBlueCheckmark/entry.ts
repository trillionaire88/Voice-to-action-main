import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (user?.role !== 'admin' && user?.role !== 'owner_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { user_id } = body;
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 });

    // Fetch existing user data first
    const users = await adminEntities.User.filter({ id: user_id });
    if (!users.length) return Response.json({ error: 'User not found' }, { status: 404 });

    const target = users[0];
    const existingData = target.data || {};

    await adminEntities.User.update(user_id, {
      data: {
        ...existingData,
        paid_identity_verification_completed: true,
        is_kyc_verified: true,
      }
    });

    // Also mark VerificationRequest as approved
    const reqs = await adminEntities.VerificationRequest.filter({ user_id });
    for (const r of reqs) {
      if (r.payment_status === 'completed') {
        await adminEntities.VerificationRequest.update(r.id, {
          status: 'approved',
          approved_at: new Date().toISOString(),
        });
      }
    }

    console.log(`[grantBlueCheckmark] Granted blue checkmark to user ${user_id}`);
    return Response.json({ success: true, user_id });
  } catch (error) {
    console.error('[grantBlueCheckmark] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
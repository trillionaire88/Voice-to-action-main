import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await entities.User.filter({ id: user.id });
    if (!userData.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const commissionBalance = userData[0].commission_balance || 0;
    const stripeConnectId = userData[0].stripe_connect_id;

    if (!stripeConnectId) {
      return Response.json({
        error: 'Stripe Connect not configured',
        balance: commissionBalance,
        status: 'pending'
      }, { status: 400 });
    }

    if (commissionBalance < 5000) {
      return Response.json({
        error: 'Minimum balance not reached ($50)',
        balance: commissionBalance,
        status: 'pending_balance'
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      balance: commissionBalance,
      stripeConnectId,
      status: 'ready',
      message: 'Payout ready for admin approval'
    });
  } catch (error) {
    console.error('createReferralPayout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
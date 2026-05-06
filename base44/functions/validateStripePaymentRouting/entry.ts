import { createSupabaseContext } from '../lib/supabaseContext.ts';

const PAYMENT_ROUTING: Record<string, string> = {
  'identity_verification': Deno.env.get('STRIPE_ACCOUNT_VERIFICATION') || 'acct_verification',
  'petition_export': Deno.env.get('STRIPE_ACCOUNT_PETITION') || 'acct_petition',
  'community_boost': Deno.env.get('STRIPE_ACCOUNT_COMMUNITY') || 'acct_community',
  'donation': Deno.env.get('STRIPE_ACCOUNT_DONATION') || 'acct_donation',
  'referral_payout': Deno.env.get('STRIPE_ACCOUNT_PAYOUT') || 'acct_payout',
  'subscription': Deno.env.get('STRIPE_ACCOUNT_SUBSCRIPTION') || 'acct_subscription'
};

Deno.serve(async (req) => {
  try {
    const { getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentType, stripeAccountId } = await req.json();

    if (!paymentType || !stripeAccountId) {
      return Response.json({ error: 'Missing paymentType or stripeAccountId' }, { status: 400 });
    }

    const expectedAccountId = PAYMENT_ROUTING[paymentType];
    
    if (!expectedAccountId) {
      return Response.json({ error: 'Unknown payment type' }, { status: 400 });
    }

    if (stripeAccountId !== expectedAccountId) {
      console.error(`Payment routing mismatch: ${paymentType} routed to ${stripeAccountId}, expected ${expectedAccountId}`);
      return Response.json({
        success: false,
        error: 'Payment account mismatch',
      }, { status: 400 });
    }

    return Response.json({ success: true, validated: true });
  } catch (error) {
    console.error('validateStripePaymentRouting error:', error);
    return Response.json({ error: 'An internal error occurred' }, { status: 500 });
  }
});

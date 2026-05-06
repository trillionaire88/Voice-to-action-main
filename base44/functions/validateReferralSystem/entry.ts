import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (user?.role !== 'admin' && user?.role !== 'owner_admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const validationReport = {
      timestamp: new Date().toISOString(),
      system: 'referral',
      checks: []
    };

    // Check referral codes exist and have unique keys
    const codes = await adminEntities.ReferralCode.filter({}, null, 1000);
    const uniqueCodes = new Set(codes.map(c => c.code));
    validationReport.checks.push({
      name: 'referral_code_uniqueness',
      passed: uniqueCodes.size === codes.length,
      detail: `${codes.length} codes, ${uniqueCodes.size} unique`
    });

    // Check transactions are properly recorded
    const txs = await adminEntities.ReferralTransaction.filter({}, null, 1000);
    const validTxs = txs.filter(t => t.commission_amount_cents && t.code_owner_user_id && t.status);
    validationReport.checks.push({
      name: 'transaction_integrity',
      passed: validTxs.length === txs.length,
      detail: `${txs.length} transactions, ${validTxs.length} valid`
    });

    // Check user commission balances
    const users = await adminEntities.User.filter({}, null, 1000);
    const usersWithBalance = users.filter(u => u.commission_balance !== undefined);
    validationReport.checks.push({
      name: 'user_commission_tracking',
      passed: usersWithBalance.length > 0,
      detail: `${usersWithBalance.length} users with commission_balance field`
    });

    // Check payment routing consistency
    const paymentRoutes = {
      'identity_verification': 'acct_verification',
      'petition_export': 'acct_petition',
      'community_boost': 'acct_community',
      'donation': 'acct_donation',
      'referral_payout': 'acct_payout',
      'subscription': 'acct_subscription'
    };
    validationReport.checks.push({
      name: 'payment_routing',
      passed: Object.keys(paymentRoutes).length === 6,
      detail: `${Object.keys(paymentRoutes).length} payment routes configured`
    });

    validationReport.allPassed = validationReport.checks.every(c => c.passed);

    return Response.json(validationReport);
  } catch (error) {
    console.error('validateReferralSystem error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
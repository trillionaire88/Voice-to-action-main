import { createSupabaseContext } from '../lib/supabaseContext.ts';
import Stripe from 'npm:stripe@14.21.0';

/**
 * paymentReconciliation — runs hourly via automation
 * Checks Stripe for completed payments that were never fulfilled on our end.
 * Grants access retroactively so no user is ever left stuck after paying.
 */
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const results = { checked: 0, fulfilled: 0, errors: 0, timestamp: new Date().toISOString() };

    // Look back 48 hours for any sessions we may have missed
    const since = Math.floor(Date.now() / 1000) - (48 * 60 * 60);

    // Fetch completed checkout sessions from Stripe
    let sessions = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const params = { limit: 100, created: { gte: since }, status: 'complete' };
      if (startingAfter) params.starting_after = startingAfter;
      const page = await stripe.checkout.sessions.list(params);
      sessions = sessions.concat(page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    console.log(`[PaymentReconciliation] Found ${sessions.length} completed sessions in last 48h`);

    for (const session of sessions) {
      results.checked++;
      const meta = session.metadata || {};
      const userId = meta.user_id;
      const paymentType = meta.payment_type;

      if (!userId || !paymentType) continue;

      try {
        // identity_verification: ensure VerificationRequest exists + user flagged
        if (paymentType === 'identity_verification') {
          const existing = await adminEntities.VerificationRequest.filter({ user_id: userId });
          const alreadyFulfilled = existing.some(r => r.payment_status === 'completed');

          if (!alreadyFulfilled) {
            const users = await adminEntities.User.filter({ id: userId });
            const targetUser = users[0];

            await adminEntities.VerificationRequest.create({
              user_id: userId,
              verification_type: 'identity',
              full_name: targetUser?.full_name || targetUser?.display_name || '',
              status: 'pending',
              payment_status: 'completed',
              payment_amount: 12.99,
              payment_reference: session.id,
              reconciled: true,
            });

            await adminEntities.User.update(userId, {
              paid_identity_verification_completed: true,
            }).catch(() => {});

            results.fulfilled++;
            console.log(`[PaymentReconciliation] FULFILLED identity_verification for user ${userId} session ${session.id}`);
          }
        }

        // petition_withdrawal: ensure PetitionWithdrawal record exists
        if (paymentType === 'petition_withdrawal' && meta.petition_id) {
          const existing = await adminEntities.PetitionWithdrawal.filter({
            petition_id: meta.petition_id,
            user_id: userId,
          });
          if (existing.length === 0) {
            await adminEntities.PetitionWithdrawal.create({
              petition_id: meta.petition_id,
              user_id: userId,
              status: 'paid',
              payment_reference: session.id,
              payment_amount: (session.amount_total || 0) / 100,
              reconciled: true,
            });
            results.fulfilled++;
            console.log(`[PaymentReconciliation] FULFILLED petition_withdrawal for user ${userId} petition ${meta.petition_id}`);
          }
        }

        // owner_gift / platform_donation: just ensure transaction is logged
        if (paymentType === 'owner_gift' || paymentType === 'platform_donation') {
          const existing = await adminEntities.Transaction.filter({
            transaction_id: session.id,
          });
          if (existing.length === 0) {
            await adminEntities.Transaction.create({
              transaction_id: session.id,
              user_id: userId,
              user_email: session.customer_email || '',
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || 'aud').toUpperCase(),
              payment_type: paymentType,
              reason: paymentType,
              reference: session.id,
              status: 'confirmed',
              period_month: new Date().toISOString().slice(0, 7),
              reconciled: true,
            });
            results.fulfilled++;
            console.log(`[PaymentReconciliation] Logged missed ${paymentType} for user ${userId}`);
          }
        }

      } catch (innerErr) {
        results.errors++;
        console.error(`[PaymentReconciliation] Error processing session ${session.id}:`, innerErr.message);
      }
    }

    // Also check active subscriptions for community access
    try {
      const activeSubs = await adminEntities.Subscription.filter({
        subscription_type: 'community',
        status: 'active',
      });
      for (const sub of activeSubs) {
        if (!sub.user_id) continue;
        const users = await adminEntities.User.filter({ id: sub.user_id });
        const u = users[0];
        if (u && !u.has_community_subscription) {
          await adminEntities.User.update(sub.user_id, {
            has_community_subscription: true,
            community_subscription_status: 'active',
          }).catch(() => {});
          results.fulfilled++;
          console.log(`[PaymentReconciliation] Restored community subscription access for user ${sub.user_id}`);
        }
      }
    } catch (subErr) {
      console.error('[PaymentReconciliation] Subscription check error:', subErr.message);
    }

    console.log(`[PaymentReconciliation] Done. Checked: ${results.checked}, Fulfilled: ${results.fulfilled}, Errors: ${results.errors}`);
    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('[PaymentReconciliation] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
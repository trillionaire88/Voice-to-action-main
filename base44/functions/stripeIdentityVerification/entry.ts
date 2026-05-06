import { createSupabaseContext } from '../lib/supabaseContext.ts';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const body = await req.json().catch(() => ({}));
    const { action, return_url, session_id } = body;

    // ── CHECK STATUS of an existing session ──────────────────────────────────
    if (action === 'check_status') {
      if (!session_id) return Response.json({ error: 'session_id required' }, { status: 400 });

      const session = await stripe.identity.verificationSessions.retrieve(session_id);
      console.log(`[StripeIdentity] Status check: ${session_id} | status: ${session.status} | user: ${user.email}`);

      // Auto-grant blue checkmark and update VerificationRequest when Stripe confirms identity
      if (session.status === 'verified') {
        // Only grant verification after Stripe has actually verified this identity session.
        const { data: profileRow, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, paid_identity_verification_completed, is_kyc_verified')
          .eq('id', user.id)
          .single();
        if (profileError) {
          console.error('[StripeIdentity] Failed to load profile:', profileError.message);
          throw profileError;
        }

        if (!(profileRow?.paid_identity_verification_completed && profileRow?.is_kyc_verified)) {
          const { error: verifyUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
              paid_identity_verification_completed: true,
              is_kyc_verified: true,
            })
            .eq('id', user.id);
          if (verifyUpdateError) {
            console.error('[StripeIdentity] Failed to persist verified flags:', verifyUpdateError.message);
            throw verifyUpdateError;
          }
          console.log(`[StripeIdentity] Blue checkmark permanently linked to user ${user.id}`);
        }

        // Update or create VerificationRequest record
        const requests = await entities.VerificationRequest.filter(
          { user_id: user.id }, '-created_date', 1
        );
        const latest = requests[0];
        if (latest) {
          await entities.VerificationRequest.update(latest.id, {
            status: 'approved',
            payment_status: 'completed',
          });
          console.log(`[StripeIdentity] VerificationRequest ${latest.id} → approved`);
        } else {
          // Create a record if none exists (e.g. webhook may have missed)
          await adminEntities.VerificationRequest.create({
            user_id: user.id,
            verification_type: 'identity',
            full_name: user.full_name || '',
            status: 'approved',
            payment_status: 'completed',
            payment_amount: 12.99,
            payment_reference: `STRIPE-IDENTITY-${session_id}`,
          });
        }
      }

      return Response.json({
        status: session.status,
        verified: session.status === 'verified',
      });
    }

    // ── CREATE new verification session ─────────────────────────────────────
    if (!return_url) return Response.json({ error: 'return_url is required' }, { status: 400 });

    // User must have completed payment first, and already-verified users should not create a new session.
    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, paid_identity_verification_completed, is_kyc_verified')
      .eq('id', user.id)
      .single();
    if (profileError) return Response.json({ error: profileError.message }, { status: 500 });
    if (profileRow?.is_kyc_verified && profileRow?.paid_identity_verification_completed) {
      return Response.json({ error: 'User is already verified.' }, { status: 400 });
    }

    const requests = await entities.VerificationRequest.filter({ user_id: user.id }, '-created_date', 1);
    const latestRequest = requests[0];
    const hasCompletedPayment = !!(
      latestRequest?.payment_status === 'completed' ||
      profileRow?.paid_identity_verification_completed
    );
    if (!hasCompletedPayment) {
      return Response.json({ error: 'Payment is required before identity verification.' }, { status: 400 });
    }

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        user_id: user.id,
        user_email: user.email,
        application_id: Deno.env.get('APPLICATION_ID'),
        supabase_url: Deno.env.get('SUPABASE_URL'),
      },
      return_url,
    });

    console.log(`[StripeIdentity] Session created: ${verificationSession.id} | user: ${user.email}`);

    return Response.json({
      success: true,
      verification_url: verificationSession.url,
      session_id: verificationSession.id,
    });

  } catch (error) {
    console.error('[StripeIdentity] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
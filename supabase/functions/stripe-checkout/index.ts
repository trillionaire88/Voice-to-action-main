import { createClient } from 'npm:@supabase/supabase-js@2.99.3';
import Stripe from 'npm:stripe@14.21.0';
import { validateCheckoutRedirectPair } from '../_shared/checkoutRedirect.ts';

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
    });
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { payment_type, amount, success_url, cancel_url, metadata = {}, referral_code } = body;

    if (!success_url || !cancel_url) {
      return Response.json({ error: 'success_url and cancel_url are required' }, { status: 400 });
    }

    const redirectErr = validateCheckoutRedirectPair(String(success_url), String(cancel_url));
    if (redirectErr) {
      return Response.json({ error: redirectErr }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const PAYMENT_CONFIGS = {
      platform_donation: {
        name: 'Voice to Action – Platform Support Donation',
        description: 'Voluntary donation to support platform development. Non-refundable.',
        amount_cents: amount ? Math.round(amount * 100) : 2500,
        mode: 'payment',
      },
      owner_gift: {
        name: 'Voice to Action – Voluntary Personal Gift to Voice to Action Pty Ltd',
        description: 'This is a voluntary personal gift to Voice to Action Pty Ltd. No goods, services, or platform benefits are provided in exchange. Non-refundable.',
        amount_cents: amount ? Math.round(amount * 100) : 2500,
        mode: 'payment',
      },
      verification_fee: {
        name: 'Identity Verification Fee',
        description: 'One-time fee for Stripe Identity government-grade automated document verification. Non-refundable.',
        amount_cents: 1299, // $12.99 AUD
        mode: 'payment',
      },
      petition_export: {
        name: 'Petition Export & Delivery Package',
        description: 'Processing fee for full petition data export package. Non-refundable.',
        amount_cents: 2500, // $25.00 AUD
        mode: 'payment',
      },
      community_subscription: {
        name: 'Voice to Action – Community Creator Subscription',
        description: 'Monthly community hosting subscription. Grants you the ability to create and manage a community on the platform. Your community remains active and accessible to members only while this subscription is active. Cancelling will make your community inaccessible. Billed monthly.',
        amount_cents: 1999, // $19.99 AUD/month
        mode: 'subscription',
      },
      identity_verification: {
        name: 'Blue Checkmark Verification',
        description: 'Identity verification for blue checkmark badge on Voice to Action. One-time payment.',
        amount_cents: 1299, // $12.99 AUD
        mode: 'payment',
      },
      creator_subscription: {
        name: 'Voice to Action Creator Referral Program',
        description: 'Monthly subscription for your personal referral code. Your followers get 10% off paid services on Voice to Action.',
        amount_cents: 2000, // $20.00 AUD/month
        mode: 'subscription',
      },
      gold_checkmark: {
        name: 'Voice to Action Gold ★ Checkmark Application Fee',
        description: 'Non-refundable application fee for Gold Public Figure verification. Manual review by Voice to Action Pty Ltd. Review takes 1–10 business days.',
        amount_cents: 10000, // $100.00 AUD
        mode: 'payment',
      },
      petition_withdrawal: {
        name: 'Petition Withdrawal & Summary Package',
        description: 'Processing fee for petition withdrawal and full data summary export. Includes all signatures, verified count, and delivery history. Emailed to creator. Non-refundable.',
        amount_cents: 199, // $1.99 AUD
        mode: 'payment',
      },
      org_verification: {
        name: 'Organisation / Business Verification Fee',
        description: 'One-time verification fee for organisation, business, government, or council verification on Voice to Action. Reviewed by platform admins. Non-refundable.',
        amount_cents: 1999, // $19.99 AUD
        mode: 'payment',
      },
    };

    const config = PAYMENT_CONFIGS[payment_type];
    if (!config) {
      return Response.json({ error: `Unknown payment_type: ${payment_type}` }, { status: 400 });
    }

    // Prevent duplicate blue-check purchases for accounts already permanently verified.
    if (payment_type === 'identity_verification') {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, paid_identity_verification_completed, is_kyc_verified')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      if (profile?.paid_identity_verification_completed && profile?.is_kyc_verified) {
        return Response.json(
          { error: 'This account is already verified and has a permanent blue checkmark.' },
          { status: 400 },
        );
      }
    }

    // ── Amount bounds validation ──────────────────────────────────────────
    // For dynamic amounts (donations/gifts), enforce min $1 AUD, max $10,000 AUD
    if (payment_type === 'platform_donation' || payment_type === 'owner_gift') {
      const requestedCents = amount ? Math.round(amount * 100) : config.amount_cents;
      if (requestedCents < 100 || requestedCents > 1000000) {
        console.warn(`[Stripe] Amount out of bounds: ${requestedCents}c for ${payment_type} by ${user.email}`);
        return Response.json({ error: 'Amount must be between $1.00 and $10,000.00 AUD' }, { status: 400 });
      }
    }

    // ── Apply referral code discount (one-time payments only) ─────────────
    let finalAmount = config.amount_cents;
    if (referral_code && config.mode === 'payment') {
      const { data: codes = [], error: codesError } = await supabaseAdmin
        .from('referral_codes')
        .select('*')
        .match({ code: referral_code.toUpperCase(), active: true });
      if (codesError) throw codesError;
      if (codes.length > 0) {
        const codeRecord = codes[0];
        // Security: enforce discount is exactly 10% — reject tampered values
        const safeDiscount = 10;
        if (codeRecord.discount_percent !== safeDiscount) {
          console.warn(`[Stripe] Referral code ${codeRecord.code} has invalid discount_percent: ${codeRecord.discount_percent}. Auto-correcting.`);
          await supabaseAdmin
            .from('referral_codes')
            .update({ discount_percent: safeDiscount })
            .eq('id', codeRecord.id)
            .catch(() => {});
          codeRecord.discount_percent = safeDiscount;
        }
        const discountFraction = safeDiscount / 100;
        finalAmount = Math.round(config.amount_cents * (1 - discountFraction));
        metadata.referral_code = codeRecord.code;
        metadata.referral_creator_id = codeRecord.owner_user_id;
        // Track usage
        await supabaseAdmin
          .from('referral_codes')
          .update({ uses_count: (codeRecord.uses_count || 0) + 1 })
          .eq('id', codeRecord.id)
          .catch(() => {});
        console.log(`[Stripe] Referral ${codeRecord.code} applied | ${codeRecord.discount_percent}% off | final: ${finalAmount}c`);

        // Record commission transaction
        const commissionPercent = codeRecord.commission_percent || 0;
        const commissionCents = Math.round(finalAmount * commissionPercent / 100);
        await supabaseAdmin.from('referral_transactions').insert({
          referral_code_id: codeRecord.id,
          buyer_user_id: user.id,
          amount: finalAmount / 100,
          commission_amount: commissionCents / 100,
        }).catch((e) => console.error('[Stripe] Failed to record referral transaction:', e.message));

        // Email notification
        const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? '';
        console.log(`[Stripe] Referral used | notify=${adminEmail} | code=${codeRecord.code} | user=${user.email}`);
      }
    }

    // ── Build price data ──────────────────────────────────────────────────
    const priceData = {
      currency: 'aud',
      product_data: {
        name: config.name,
        description: config.description,
      },
      unit_amount: finalAmount,
    };
    if (config.mode === 'subscription') {
      priceData.recurring = { interval: 'month' };
    }

    // ── Build session params ──────────────────────────────────────────────
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{ price_data: priceData, quantity: 1 }],
      mode: config.mode,
      success_url,
      cancel_url,
      customer_email: user.email,
      metadata: {
        application_id: Deno.env.get('APPLICATION_ID'),
        supabase_url: Deno.env.get('SUPABASE_URL'),
        user_id: user.id,
        user_email: user.email,
        payment_type,
        ...metadata,
      },
    };

    if (config.mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          application_id: Deno.env.get('APPLICATION_ID'),
          supabase_url: Deno.env.get('SUPABASE_URL'),
          user_id: user.id,
          payment_type,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[Stripe] Session: ${session.id} | type: ${payment_type} | mode: ${config.mode} | amount: ${finalAmount}c | user: ${user.email}`);

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });

  } catch (error) {
    console.error('[Stripe] Checkout error:', error.message);
    return Response.json({ error: 'An error occurred processing your payment request' }, { status: 500 });
  }
});
import { createClient } from 'npm:@supabase/supabase-js@2.99.3';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // MUST validate signature before any other auth
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('[StripeWebhook] Signature verification failed:', err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Missing Supabase env vars', { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log(`[StripeWebhook] Event: ${event.type}`);

  try {
    // ── Checkout session completed ────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};
      const userId = meta.user_id;
      const paymentType = meta.payment_type;

      console.log(`[StripeWebhook] Checkout completed | type: ${paymentType} | user: ${userId} | session: ${session.id}`);

      // Log to Transaction entity
      if (userId) {
        const { error } = await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'aud').toUpperCase(),
          payment_type: paymentType,
          stripe_session_id: session.id,
          status: 'confirmed',
          metadata: meta,
        });
        if (error) console.error('[StripeWebhook] Transaction log error:', error.message);
      }

      // ── identity_verification: create VerificationRequest ──────────────
      if (paymentType === 'identity_verification' && userId) {
        const { data: existing = [], error: existingError } = await supabaseAdmin
          .from('verification_requests')
          .select('*')
          .eq('user_id', userId);
        if (existingError) throw existingError;

        const alreadyPaid = existing.some((r) => r.status === 'approved');

        if (!alreadyPaid) {
          const { data: targetUser, error: userFetchError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (userFetchError) throw userFetchError;

          const { error: vrInsertError } = await supabaseAdmin.from('verification_requests').insert({
            user_id: userId,
            verification_type: 'identity',
            status: 'pending',
            stripe_session_id: session.id,
          });
          if (vrInsertError) throw vrInsertError;

          // FULFILLMENT: Flag user so they can immediately proceed to the identity step
          const { error: userFlagError } = await supabaseAdmin
            .from('profiles')
            .update({ paid_identity_verification_completed: true })
            .eq('id', userId);
          if (userFlagError) console.error('[StripeWebhook] User flag error:', userFlagError.message);

          console.log(`[StripeWebhook] VerificationRequest created + user flagged for user ${userId}`);
        } else {
          console.log(`[StripeWebhook] VerificationRequest already exists for user ${userId} — skipping`);
        }
      }

      // ── gold_checkmark: confirm payment on pending request ──────────────
      if (paymentType === 'gold_checkmark' && userId) {
        const { data: reqs = [], error: reqsError } = await supabaseAdmin
          .from('verification_requests')
          .select('*')
          .match({ user_id: userId, verification_type: 'public_figure' });
        if (reqsError) throw reqsError;

        if (reqs.length > 0) {
          const latest = reqs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
          if (latest.status !== 'approved') {
            const { error: vrUpdateError } = await supabaseAdmin
              .from('verification_requests')
              .update({
                status: 'pending',
                stripe_session_id: session.id,
              })
              .eq('id', latest.id);
            if (vrUpdateError) throw vrUpdateError;

            console.log(`[StripeWebhook] Gold checkmark payment confirmed for user ${userId} | request: ${latest.id}`);
          }
        }
      }

      // ── petition_withdrawal: record payment so user gets free future downloads ──
      if (paymentType === 'petition_withdrawal' && userId && meta.petition_id) {
        const { data: existing = [], error: existingError } = await supabaseAdmin
          .from('petition_withdrawals')
          .select('*')
          .match({ petition_id: meta.petition_id, user_id: userId });
        if (existingError) throw existingError;

        if (existing.length === 0) {
          const { error: insertError } = await supabaseAdmin.from('petition_withdrawals').insert({
            petition_id: meta.petition_id,
            user_id: userId,
            stripe_session_id: session.id,
            status: 'paid',
          });
          if (insertError) console.error('[StripeWebhook] PetitionWithdrawal create error:', insertError.message);

          console.log(`[StripeWebhook] PetitionWithdrawal record created for petition ${meta.petition_id} user ${userId}`);
        }
      }

      // ── petition_export: email recipients after successful payment ───────
      if (paymentType === 'petition_export' && userId && meta.petition_id) {
        const exportEmails = String(meta.export_emails || '')
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);
        if (exportEmails.length === 0) {
          throw new Error('petition_export missing export_emails metadata');
        }

        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (!resendKey) throw new Error('RESEND_API_KEY not configured');

        const { data: petition, error: petErr } = await supabaseAdmin
          .from('petitions')
          .select(
            'id,title,short_summary,creator_name,signature_count_total,signature_count_verified,status,country_code,category,target_name,target_type,created_date',
          )
          .eq('id', meta.petition_id)
          .single();
        if (petErr || !petition) throw petErr || new Error('Petition not found');

        const fromAddr = Deno.env.get('EMAIL_FROM_NOREPLY') ?? 'noreply@voicetoaction.io';
        const fromHeader = `Voice to Action <${fromAddr}>`;
        const esc = (s: string) =>
          String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1e293b;">
<h2 style="color:#1e40af;">Petition export</h2>
<p>This summary was sent after your petition export purchase on Voice to Action.</p>
<table style="border-collapse:collapse;max-width:640px;">
<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Title</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${esc(petition.title)}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Signatures (total)</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${petition.signature_count_total ?? 0}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Verified</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${petition.signature_count_verified ?? 0}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Creator</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${esc(petition.creator_name)}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Summary</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${esc(petition.short_summary)}</td></tr>
</table>
<p style="font-size:12px;color:#64748b;">Personal signer identifiers are not included in this automated summary.</p>
</body></html>`;

        const primary = exportEmails[0];
        const bcc = exportEmails.length > 1 ? exportEmails.slice(1) : undefined;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromHeader,
            to: primary,
            ...(bcc && bcc.length ? { bcc } : {}),
            subject: `Petition export: ${String(petition.title).slice(0, 200)}`,
            html,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Resend failed: ${res.status} ${t}`);
        }
        console.log(`[StripeWebhook] Petition export emailed | petition ${meta.petition_id}`);
      }
    }

    // ── Subscription events ───────────────────────────────────────────────
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const meta = sub.metadata || {};
      const userId = meta.user_id;
      const paymentType = meta.payment_type;

      console.log(`[StripeWebhook] ${event.type} | type: ${paymentType} | user: ${userId} | status: ${sub.status}`);

      // ── community_subscription ──────────────────────────────────────────
      if (userId && paymentType === 'community_subscription') {
        const { data: existing = [], error: existingError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .match({ user_id: userId, subscription_type: 'community' });
        if (existingError) throw existingError;

        const subData = {
          user_id: userId,
          subscription_type: 'community',
          plan: 'community_creator',
          price: 19.99,
          currency: 'AUD',
          billing_period: 'monthly',
          status: sub.status === 'active' ? 'active' : sub.status,
          stripe_subscription_id: sub.id,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        };

        if (existing.length > 0) {
          const { error: updErr } = await supabaseAdmin.from('subscriptions').update(subData).eq('id', existing[0].id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabaseAdmin
            .from('subscriptions')
            .insert(subData);
          if (insErr) throw insErr;
        }

        // FULFILLMENT: Grant user access to paid community features
        const { error: userUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({
            has_community_subscription: true,
            community_subscription_status: 'active',
          })
          .eq('id', userId);
        if (userUpdateError) console.error('[StripeWebhook] Community sub user update error:', userUpdateError.message);

        console.log(`[StripeWebhook] Community subscription ${event.type} for user ${userId}`);
      }

      // ── creator_subscription ────────────────────────────────────────────
      if (userId && paymentType === 'creator_subscription') {
        const { data: codes = [], error: codesError } = await supabaseAdmin
          .from('referral_codes')
          .select('*')
          .eq('owner_user_id', userId);
        if (codesError) throw codesError;

        if (codes.length > 0) {
          const { error: codeUpdateError } = await supabaseAdmin
            .from('referral_codes')
            .update({
              active: sub.status === 'active',
            })
            .eq('id', codes[0].id);
          if (codeUpdateError) throw codeUpdateError;

          console.log(`[StripeWebhook] Creator referral subscription updated for user ${userId}`);
        }
      }
    }

    // ── Subscription cancelled ────────────────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const meta = sub.metadata || {};
      const userId = meta.user_id;
      const paymentType = meta.payment_type;

      console.log(`[StripeWebhook] Subscription deleted | type: ${paymentType} | user: ${userId}`);

      if (userId && paymentType === 'community_subscription') {
        const { data: subs = [], error: subsError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .match({ user_id: userId, subscription_type: 'community' });
        if (subsError) throw subsError;

        for (const s of subs) {
          const { error: subUpdateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'cancelled',
            })
            .eq('id', s.id);
          if (subUpdateError) throw subUpdateError;
        }

        // REVOKE: Remove community access when subscription is cancelled
        const { error: userRevokeError } = await supabaseAdmin
          .from('profiles')
          .update({
            has_community_subscription: false,
            community_subscription_status: 'cancelled',
          })
          .eq('id', userId);
        if (userRevokeError) console.error('[StripeWebhook] Community sub revoke error:', userRevokeError.message);
      }

      if (userId && paymentType === 'creator_subscription') {
        const { data: codes = [], error: codesError } = await supabaseAdmin
          .from('referral_codes')
          .select('*')
          .eq('owner_user_id', userId);
        if (codesError) throw codesError;

        if (codes.length > 0) {
          const { error: codeUpdateError } = await supabaseAdmin
            .from('referral_codes')
            .update({
              active: false,
            })
            .eq('id', codes[0].id);
          if (codeUpdateError) throw codeUpdateError;
        }
      }
    }

    // ── Invoice paid (recurring subscription billing) ─────────────────────
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (subId) {
        const { data: subs = [], error: subsError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subId);
        if (subsError) throw subsError;

        if (subs.length > 0) {
          const { error: subUpdateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
            })
            .eq('id', subs[0].id);
          if (subUpdateError) throw subUpdateError;

          console.log(`[StripeWebhook] Invoice paid — subscription renewed: ${subId}`);
        }
      }
    }

    // ── INVOICE PAYMENT FAILED — mark subscription past_due ──────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (subId) {
        const { data: subs = [], error: subsError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subId);
        if (subsError) throw subsError;

        if (subs.length > 0) {
          const { error: subUpdateError } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', subs[0].id);
          if (subUpdateError) throw subUpdateError;

          console.log(`[StripeWebhook] Payment failed — subscription past_due: ${subId}`);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    const msg = String(error?.message ?? error);
    console.error('[StripeWebhook] Processing error:', msg);
    const isTransient =
      /timeout|connection|ECONNRESET|ETIMEDOUT|529|503|502|temporar/i.test(msg);
    if (isTransient) {
      return Response.json({ error: 'Transient error — retry' }, { status: 500 });
    }
    return Response.json({ received: true, warning: msg });
  }
});
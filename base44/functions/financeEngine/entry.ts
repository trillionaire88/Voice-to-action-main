import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── Submit a payment ────────────────────────────────────────────────
    if (action === 'submit_payment') {
      const { amount, currency, payment_type, reason, reference, proof_file_url, proof_notes, related_entity_type, related_entity_id } = body;

      // Fraud check: duplicate reference in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 2592000000).toISOString();
      if (reference) {
        const existing = await adminEntities.Transaction.filter({ reference });
        const recent = existing.filter(t => t.created_date > thirtyDaysAgo && t.user_id === user.id);
        if (recent.length > 0) {
          // Flag as suspicious but still allow submission
          const txn = await adminEntities.Transaction.create({
            transaction_id: `TXN-${Date.now()}`,
            user_id: user.id,
            user_email: user.email,
            amount, currency: currency || 'AUD',
            payment_type, reason, reference, proof_file_url, proof_notes,
            status: 'pending',
            related_entity_type, related_entity_id,
            is_flagged: true,
            flag_reason: 'Duplicate reference detected',
            period_month: new Date().toISOString().slice(0, 7),
          });
          await _finLog(adminEntities, { event_type: 'payment_created', transaction_id: txn.id, user_id: user.id, amount, detail: `FLAGGED: Duplicate reference. Payment submitted.` });
          await _complianceLog(adminEntities, { user_id: user.id, action_detail: `Payment submitted (flagged duplicate ref): ${amount} ${currency || 'AUD'}`, severity: 'warning' });
          return Response.json({ success: true, transaction: txn, flagged: true });
        }
      }

      const txn = await adminEntities.Transaction.create({
        transaction_id: `TXN-${Date.now()}`,
        user_id: user.id,
        user_email: user.email,
        amount, currency: currency || 'AUD',
        payment_type, reason, reference, proof_file_url, proof_notes,
        status: 'pending',
        related_entity_type, related_entity_id,
        period_month: new Date().toISOString().slice(0, 7),
      });
      await _finLog(adminEntities, { event_type: 'payment_created', transaction_id: txn.id, user_id: user.id, amount, detail: `Payment submitted: ${payment_type} ${amount} ${currency || 'AUD'}` });
      await _complianceLog(adminEntities, { user_id: user.id, action_detail: `Payment submitted: ${payment_type} ${amount} ${currency || 'AUD'}`, severity: 'info' });
      return Response.json({ success: true, transaction: txn });
    }

    // ── Review a payment (admin only) ───────────────────────────────────
    if (action === 'review_payment') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { transaction_id, status, admin_notes } = body;

      const txns = await adminEntities.Transaction.filter({ id: transaction_id });
      const txn = txns[0] || await adminEntities.Transaction.filter({}).then(all => all.find(t => t.id === transaction_id));
      if (!txn) return Response.json({ error: 'Transaction not found' }, { status: 404 });
      if (txn.is_locked) return Response.json({ error: 'Transaction is locked' }, { status: 400 });

      await adminEntities.Transaction.update(transaction_id, {
        status, admin_notes,
        reviewed_by_admin_id: user.id,
        reviewed_at: new Date().toISOString(),
      });

      const eventType = status === 'confirmed' ? 'payment_approved' : status === 'rejected' ? 'payment_rejected' : 'payment_cancelled';
      await _finLog(adminEntities, { event_type: eventType, transaction_id, user_id: txn.user_id, actor_id: user.id, amount: txn.amount, detail: `Payment ${status} by admin. ${admin_notes || ''}` });
      await _complianceLog(adminEntities, { user_id: txn.user_id, actor_id: user.id, action_detail: `Payment ${status}: ${txn.amount} ${txn.currency}. ${admin_notes || ''}`, severity: status === 'confirmed' ? 'info' : 'warning' });
      return Response.json({ success: true });
    }

    // ── Lock/unlock transaction (admin) ─────────────────────────────────
    if (action === 'lock_transaction') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { transaction_id, locked } = body;
      await adminEntities.Transaction.update(transaction_id, { is_locked: locked });
      await _finLog(adminEntities, { event_type: 'lock_applied', transaction_id, actor_id: user.id, detail: `Transaction ${locked ? 'locked' : 'unlocked'}` });
      return Response.json({ success: true });
    }

    // ── Create subscription (admin) ─────────────────────────────────────
    if (action === 'create_subscription') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { target_user_id, subscription_type, plan, price, currency, billing_period, starts_at, ends_at, renewal_date, organisation_id, linked_transaction_id } = body;

      const sub = await adminEntities.Subscription.create({
        user_id: target_user_id, organisation_id,
        subscription_type: subscription_type || 'individual',
        plan, price, currency: currency || 'AUD',
        billing_period: billing_period || 'monthly',
        status: 'active',
        starts_at: starts_at || new Date().toISOString(),
        ends_at, renewal_date, linked_transaction_id,
      });
      await _finLog(adminEntities, { event_type: 'subscription_started', subscription_id: sub.id, user_id: target_user_id, actor_id: user.id, amount: price, detail: `Subscription started: ${plan}` });
      await _complianceLog(adminEntities, { user_id: target_user_id, actor_id: user.id, action_detail: `Subscription started: ${plan} ${price} ${currency || 'AUD'}`, severity: 'info' });
      return Response.json({ success: true, subscription: sub });
    }

    // ── Cancel subscription (admin) ─────────────────────────────────────
    if (action === 'cancel_subscription') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { subscription_id, cancel_reason } = body;
      await adminEntities.Subscription.update(subscription_id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason,
      });
      await _finLog(adminEntities, { event_type: 'subscription_cancelled', subscription_id, actor_id: user.id, detail: cancel_reason || 'Cancelled by admin' });
      return Response.json({ success: true });
    }

    // ── Get user's own payment history ─────────────────────────────────
    if (action === 'my_payments') {
      const transactions = await entities.Transaction.filter({ user_id: user.id }, '-created_date', 50);
      const subscriptions = await entities.Subscription.filter({ user_id: user.id }, '-created_date', 20);
      return Response.json({ transactions, subscriptions });
    }

    // ── Finance summary (admin) ─────────────────────────────────────────
    if (action === 'finance_summary') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const transactions = await adminEntities.Transaction.list('-created_date', 500);
      const subscriptions = await adminEntities.Subscription.list('-created_date', 200);

      const confirmed = transactions.filter(t => t.status === 'confirmed');
      const pending = transactions.filter(t => t.status === 'pending');
      const flagged = transactions.filter(t => t.is_flagged);
      const totalIncome = confirmed.reduce((s, t) => s + (t.amount || 0), 0);
      const activeSubs = subscriptions.filter(s => s.status === 'active');

      // Monthly breakdown (last 12 months)
      const monthlyMap = {};
      confirmed.forEach(t => {
        const m = t.period_month || t.created_date?.slice(0, 7);
        if (m) monthlyMap[m] = (monthlyMap[m] || 0) + (t.amount || 0);
      });

      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyIncome = monthlyMap[currentMonth] || 0;

      return Response.json({
        total_income: totalIncome,
        monthly_income: monthlyIncome,
        total_transactions: transactions.length,
        confirmed_count: confirmed.length,
        pending_count: pending.length,
        flagged_count: flagged.length,
        active_subscriptions: activeSubs.length,
        monthly_breakdown: monthlyMap,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function _finLog(adminEntities, { event_type, transaction_id, subscription_id, user_id, actor_id, amount, detail, metadata }) {
  await adminEntities.FinanceLog.create({
    event_type, transaction_id, subscription_id,
    user_id, actor_id, amount, detail, metadata,
  });
}

async function _complianceLog(adminEntities, { user_id, actor_id, action_detail, severity }) {
  try {
    await adminEntities.ComplianceLog.create({
      event_type: 'payment_action',
      user_id, actor_id, action_detail, severity: severity || 'info',
    });
  } catch (_) { /* compliance log is best-effort */ }
}
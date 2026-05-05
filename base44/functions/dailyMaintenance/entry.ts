import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);

    const cronSecret = req.headers.get('x-cron-secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');
    const hasCronAuth = !!(expectedCronSecret && cronSecret === expectedCronSecret);

    if (!hasCronAuth) {
      try {
        const user = await getUser();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'owner_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      } catch {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const results = { cleaned: {}, timestamp: new Date().toISOString() };

    // ── 1. Clean up old RateLimitTracker records (older than 24h) ─────────
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oldRateLimits = await adminEntities.RateLimitTracker.filter({
        is_blocked: false,
      });
      const stale = oldRateLimits.filter(r => r.window_end && r.window_end < cutoff);
      const ids = stale.map((r) => r.id);
      let rateClean = 0;
      if (ids.length > 0) {
        const { error: delErr } = await supabaseAdmin.from('rate_limit_trackers').delete().in('id', ids);
        if (delErr) throw delErr;
        rateClean = ids.length;
      }
      results.cleaned.rate_limit_records = rateClean;
      console.log(`[Maintenance] Cleaned ${rateClean} expired rate limit records`);
    } catch (e) {
      console.error('[Maintenance] RateLimitTracker cleanup failed:', e.message);
    }

    // ── 2. Disable referral codes that have been inactive for 90+ days ────
    try {
      const ninety_days_ago = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const activeCodes = await adminEntities.ReferralCode.filter({ active: true });
      let inactiveDisabled = 0;
      for (const code of activeCodes) {
        // Only disable free_tier codes with 0 uses that are 90+ days old
        if (
          code.subscription_status === 'free_tier' &&
          (code.uses_count || 0) === 0 &&
          code.created_date < ninety_days_ago
        ) {
          await adminEntities.ReferralCode.update(code.id, { active: false }).catch(() => {});
          inactiveDisabled++;
        }
      }
      results.cleaned.inactive_referral_codes = inactiveDisabled;
      console.log(`[Maintenance] Disabled ${inactiveDisabled} long-inactive free-tier referral codes`);
    } catch (e) {
      console.error('[Maintenance] Referral code cleanup failed:', e.message);
    }

    // ── 3. Clean up old SecurityLog entries older than 90 days ───────────
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const oldLogs = await adminEntities.SecurityLog.filter({ severity: 'info' });
      const stale = oldLogs.filter(l => l.created_date < cutoff).slice(0, 200);
      const logIds = stale.map((l) => l.id);
      let logsCleaned = 0;
      if (logIds.length > 0) {
        const { error: delErr } = await supabaseAdmin.from('security_logs').delete().in('id', logIds);
        if (delErr) throw delErr;
        logsCleaned = logIds.length;
      }
      results.cleaned.old_security_logs = logsCleaned;
      console.log(`[Maintenance] Cleaned ${logsCleaned} old info-level security logs`);
    } catch (e) {
      console.error('[Maintenance] SecurityLog cleanup failed:', e.message);
    }

    // ── 4. Clean up old PollOptionSuggestions that are rejected 30+ days ago ──
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const rejected = await adminEntities.PollOptionSuggestion.filter({ status: 'rejected' });
      const stale = rejected.filter(s => s.decided_at && s.decided_at < cutoff).slice(0, 100);
      const suggIds = stale.map((s) => s.id);
      let suggCleaned = 0;
      if (suggIds.length > 0) {
        const { error: delErr } = await supabaseAdmin.from('poll_option_suggestions').delete().in('id', suggIds);
        if (delErr) throw delErr;
        suggCleaned = suggIds.length;
      }
      results.cleaned.old_rejected_suggestions = suggCleaned;
      console.log(`[Maintenance] Cleaned ${suggCleaned} old rejected poll suggestions`);
    } catch (e) {
      console.error('[Maintenance] PollOptionSuggestion cleanup failed:', e.message);
    }

    // ── 5. Process pending account deletions (accounts flagged > 30 days ago) ──
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const pendingDeletions = await adminEntities.User.filter({ account_status: 'pending_deletion' });
      const readyToDelete = pendingDeletions.filter(u => u.account_deletion_requested_at && u.account_deletion_requested_at < thirtyDaysAgo);
      let deletionCount = 0;
      for (const u of readyToDelete.slice(0, 20)) {
        const { error: delError } = await supabaseAdmin.functions.invoke('deleteUserData', {
          body: { user_id: u.id, immediate: true },
        });
        if (delError) {
          console.error(`[Maintenance] Deletion failed for user ${u.id}:`, delError.message);
        } else {
          deletionCount++;
        }
      }
      results.cleaned.account_deletions_processed = deletionCount;
      console.log(`[Maintenance] Processed ${deletionCount} account deletions`);
    } catch (e) { console.error('[Maintenance] Account deletion processing failed:', e.message); }

    // ── 6. Expire community subscriptions past their renewal date ─────────
    try {
      const now = new Date().toISOString();
      const activeSubs = await adminEntities.Subscription.filter({ subscription_type: 'community', status: 'active' });
      const expired = activeSubs.filter(s => s.renewal_date && s.renewal_date < now);
      let expiredCount = 0;
      for (const sub of expired) {
        await adminEntities.Subscription.update(sub.id, { status: 'expired' });
        if (sub.user_id) {
          await adminEntities.User.update(sub.user_id, { has_community_subscription: false, community_subscription_status: 'expired' }).catch(() => {});
        }
        expiredCount++;
      }
      results.cleaned.subscriptions_expired = expiredCount;
    } catch (e) { console.error('[Maintenance] Subscription expiry failed:', e.message); }

    // ── 7. Run payment reconciliation ─────────────────────────────────────
    try {
      const { data: reconData, error: reconErr } = await supabaseAdmin.functions.invoke('paymentReconciliation', { body: {} });
      if (reconErr) throw reconErr;
      results.cleaned.payment_reconciliation = reconData?.fulfilled ?? 0;
      console.log(`[Maintenance] Payment reconciliation ran: ${reconData?.fulfilled ?? 0} fulfilled`);
    } catch (e) { console.error('[Maintenance] Payment reconciliation trigger failed:', e.message); }

    // ── 8. Flag stuck identity verifications (paid but no identity step > 7 days) ──
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const pendingVerifications = await adminEntities.VerificationRequest.filter({ status: 'pending', payment_status: 'completed', verification_type: 'identity' });
      const stuckVerifications = pendingVerifications.filter(v => v.created_date < sevenDaysAgo);
      let stuckCount = 0;
      for (const v of stuckVerifications) {
        if (v.status === 'pending') {
          await adminEntities.VerificationRequest.update(v.id, {
            status: 'needs_more_info',
            admin_note: 'Auto-flagged: Payment completed but identity verification not started within 7 days.',
          }).catch(() => {});
          stuckCount++;
        }
      }
      results.cleaned.stuck_verifications_flagged = stuckCount;
    } catch (e) { console.error('[Maintenance] Stuck verification check failed:', e.message); }

    // ── 9. Refresh search index for all active content ────────────────────
    try {
      const [petitions, polls, communities] = await Promise.all([
        adminEntities.Petition.filter({ status: 'active', moderation_status: 'approved' }),
        adminEntities.Poll.filter({ status: 'open' }),
        adminEntities.Community.filter({ status: 'active' }),
      ]);
      const allContent = [
        ...petitions.map(p => ({ type: 'petition', id: p.id })),
        ...polls.map(p => ({ type: 'poll', id: p.id })),
        ...communities.map(c => ({ type: 'community', id: c.id })),
      ];
      let reIndexed = 0;
      for (const item of allContent.slice(0, 100)) {
        const { error: idxErr } = await supabaseAdmin.functions.invoke('indexContent', {
          body: { content_type: item.type, content_id: item.id },
        });
        if (!idxErr) reIndexed++;
      }
      results.cleaned.search_index_refreshed = reIndexed;
      console.log(`[Maintenance] Re-indexed ${reIndexed} items in search`);
    } catch (e) { console.error('[Maintenance] Search re-index failed:', e.message); }

    // ── 10. Check petition deliveries for escalation ──────────────────────
    try {
      const { data: escalationResult, error: escErr } = await supabaseAdmin.functions.invoke('petitionDeliveryTracker', {
        body: { action: 'check_escalations' },
      });
      if (escErr) {
        results.cleaned.petition_escalations = 0;
        console.error('[Maintenance] petitionDeliveryTracker:', escErr.message);
      } else {
        results.cleaned.petition_escalations = escalationResult?.escalated || 0;
        console.log(`[Maintenance] Petition escalation check: ${escalationResult?.escalated || 0} escalated`);
      }
    } catch (e) { console.error('[Maintenance] Petition escalation check failed:', e.message); }

    // ── 11. Log maintenance run ───────────────────────────────────────────
    await adminEntities.SecurityLog.create({
      event_type: 'suspicious_activity',
      details: {
        scan_type: 'daily_maintenance',
        results,
        timestamp: results.timestamp,
      },
      severity: 'info',
    }).catch(() => {});

    const totalCleaned = Object.values(results.cleaned).reduce((a, b) => a + b, 0);
    console.log(`[Maintenance] Daily maintenance complete. Total cleaned: ${totalCleaned} records.`);

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('[Maintenance] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
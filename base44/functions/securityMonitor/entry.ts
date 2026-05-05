import { createSupabaseContext } from '../lib/supabaseContext.ts';

const OWNER_EMAIL = 'voicetoaction@outlook.com';
const VALID_ROLES = ['user', 'admin', 'moderator', 'owner_admin', 'creator', 'verified_creator'];
const VALID_DISCOUNT = 10;

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);

    // Allow scheduled automations (no user) or owner_admin
    let isScheduled = false;
    try {
      const user = await getUser();
      const isOwner = user?.role === 'owner_admin' || (user?.role === 'admin' && user?.email === OWNER_EMAIL);
      if (!isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 });
    } catch {
      isScheduled = true; // No user = scheduled automation context
    }

    const issues = [];
    const now = new Date().toISOString();

    // ── 1. Referral code integrity check ──────────────────────────────────
    const codes = await adminEntities.ReferralCode.list('-created_date', 500);
    const invalidDiscountCodes = codes.filter(c => c.active && c.discount_percent !== VALID_DISCOUNT);
    if (invalidDiscountCodes.length > 0) {
      issues.push(`REFERRAL DISCOUNT MISMATCH: ${invalidDiscountCodes.length} active code(s) have discount_percent != ${VALID_DISCOUNT}: ${invalidDiscountCodes.map(c => c.code).join(', ')}`);
      // Auto-fix: enforce correct discount
      for (const c of invalidDiscountCodes) {
        await adminEntities.ReferralCode.update(c.id, { discount_percent: VALID_DISCOUNT });
        console.warn(`[Security] Fixed discount_percent for code ${c.code}`);
      }
    }

    // Commission must be 0 (free_tier) or 10 (paid) — no other values
    const invalidCommissionCodes = codes.filter(c => c.active && ![0, 5, 10].includes(c.commission_percent));
    if (invalidCommissionCodes.length > 0) {
      issues.push(`REFERRAL COMMISSION INVALID: ${invalidCommissionCodes.length} code(s) have unexpected commission_percent: ${invalidCommissionCodes.map(c => `${c.code}=${c.commission_percent}%`).join(', ')}`);
    }

    // ── 2. ReferralTransaction integrity check ────────────────────────────
    const txs = await adminEntities.ReferralTransaction.list('-created_date', 500);
    const negativeTxs = txs.filter(t => t.commission_amount_cents < 0 || t.final_amount_cents <= 0);
    if (negativeTxs.length > 0) {
      issues.push(`PAYMENT INTEGRITY: ${negativeTxs.length} ReferralTransaction(s) have invalid amounts.`);
    }

    // ── 3. Check for referral codes with no valid owner ───────────────────
    const allUsers = await adminEntities.User.list();
    const userIds = new Set(allUsers.map(u => u.id));
    const orphanCodes = codes.filter(c => c.active && c.owner_user_id && !userIds.has(c.owner_user_id));
    if (orphanCodes.length > 0) {
      issues.push(`ORPHAN CODES: ${orphanCodes.length} active referral code(s) have no valid owner. Auto-disabling.`);
      for (const c of orphanCodes) {
        await adminEntities.ReferralCode.update(c.id, { active: false });
      }
    }

    // ── 4. Owner account protection check ────────────────────────────────
    const ownerAccounts = allUsers.filter(u => u.email === OWNER_EMAIL);
    if (ownerAccounts.length === 0) {
      issues.push(`CRITICAL: Owner account ${OWNER_EMAIL} not found in user database!`);
    } else {
      const owner = ownerAccounts[0];
      if (owner.role !== 'owner_admin' && owner.role !== 'admin') {
        issues.push(`CRITICAL: Owner account ${OWNER_EMAIL} has unexpected role: ${owner.role}. Should be owner_admin or admin.`);
      }
    }

    // ── 5. Invalid role check ─────────────────────────────────────────────
    const invalidRoleUsers = allUsers.filter(u => u.role && !VALID_ROLES.includes(u.role));
    if (invalidRoleUsers.length > 0) {
      issues.push(`INVALID ROLES: ${invalidRoleUsers.length} user(s) have unrecognized roles: ${invalidRoleUsers.slice(0, 5).map(u => `${u.email}=${u.role}`).join(', ')}`);
    }

    // ── 6. Verification request check ────────────────────────────────────
    const verRequests = await adminEntities.VerificationRequest.filter({ status: 'pending' });
    if (verRequests.length > 20) {
      issues.push(`VERIFICATION BACKLOG: ${verRequests.length} pending verification requests need admin review.`);
    }

    // ── 7. Log security scan to SecurityLog ──────────────────────────────
    await adminEntities.SecurityLog.create({
      event_type: 'suspicious_activity',
      details: {
        scan_type: 'daily_security_scan',
        issues_found: issues.length,
        issues: issues,
        timestamp: now,
        triggered_by: isScheduled ? 'automation' : 'manual',
      },
      severity: issues.length > 0 ? (issues.some(i => i.startsWith('CRITICAL')) ? 'critical' : 'warning') : 'info',
    }).catch(e => console.error('[SecMon] Failed to log scan:', e.message));

    // ── 8. Email alert if issues found ───────────────────────────────────
    if (issues.length > 0) {
      const severity = issues.some(i => i.startsWith('CRITICAL')) ? '🚨 CRITICAL' : '⚠️ WARNING';
      await integrations.Core.SendEmail({
        to: OWNER_EMAIL,
        subject: `${severity} — Voice to Action Security Scan: ${issues.length} issue(s) found`,
        body: `Daily security scan completed at ${now}\n\n${issues.length} issue(s) detected:\n\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n\n')}\n\nPlease review at: https://app.vta.com`,
      }).catch(e => console.error('[SecMon] Failed to send alert email:', e.message));
      console.warn(`[SecMon] ${issues.length} security issue(s) found. Alert email sent.`);
    } else {
      console.log('[SecMon] Security scan passed. No issues found.');
    }

    return Response.json({
      success: true,
      scanned_at: now,
      issues_found: issues.length,
      issues,
      users_scanned: allUsers.length,
      codes_scanned: codes.length,
      transactions_scanned: txs.length,
    });

  } catch (error) {
    console.error('[SecMon] Fatal error:', error.message);
    // Try to send alert for fatal errors
    try {
      const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
      await integrations.Core.SendEmail({
        to: OWNER_EMAIL,
        subject: '🚨 CRITICAL — Security Monitor Failed',
        body: `The daily security monitor failed with an error:\n\n${error.message}\n\nTime: ${new Date().toISOString()}`,
      });
    } catch { /* ignore secondary failures */ }
    return Response.json({ error: 'An internal error occurred' }, { status: 500 });
  }
});
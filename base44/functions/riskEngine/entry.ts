import { createSupabaseContext } from '../lib/supabaseContext.ts';

// Normalise leetspeak and common evasion patterns before scanning
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/\s+/g, ' ')
    .trim();
}

// Word-boundary aware threat patterns — "kill" won't flag "skill"
const THREAT_PATTERNS = [
  /\bkill\b/, /\bbomb\b/, /\bexplo(?:de|sion)\b/,
  /\bmurder\b/, /\bassassinat/, /\bstab\b/, /\bshoot\b/,
  /\bthreaten\b/, /\bterror(?:ist|ism)?\b/,
];

// Illegal content — context-aware, not simple substring
const ILLEGAL_PATTERNS = [
  /\bcsam\b/, /child.{0,10}(?:porn|exploit|abuse|sex)/,
  /\bhitman\b/, /\bhire.{0,10}kill/, /\bdarknet.{0,10}market/,
  /\bdrug.{0,10}deal/, /\bhuman.{0,10}traffickin/, /\bsex.{0,10}traffickin/,
];

// Defamation — requires sentence structure, not just keywords
const DEFAM_PATTERNS = [
  /\bis\s+(?:a\s+)?(?:criminal|pedophile|terrorist|sex offender|rapist)\b/,
  /\bis\s+guilty\s+of\b/,
  /\bcommitted\s+(?:murder|rape|fraud|treason)\b/,
];

interface ScanResult { threats: string[]; illegal: string[]; defamation: string[]; }

function scanText(rawText: string): ScanResult {
  if (!rawText) return { threats: [], illegal: [], defamation: [] };
  const text = normalise(rawText);
  return {
    threats: THREAT_PATTERNS.filter(p => p.test(text)).map(p => p.source),
    illegal: ILLEGAL_PATTERNS.filter(p => p.test(text)).map(p => p.source),
    defamation: DEFAM_PATTERNS.filter(p => p.test(text)).map(p => p.source),
  };
}

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── Scan a piece of content for risk ────────────────────────────────
    if (action === 'scan_content') {
      const { content_type, content_id, text, creator_user_id } = body;
      const scan = scanText(text);
      const risks = [];

      if (scan.threats.length > 0) {
        risks.push({ type: 'threat_language', severity: 'high', evidence: { words: scan.threats } });
      }
      if (scan.illegal.length > 0) {
        risks.push({ type: 'illegal_content', severity: 'critical', evidence: { words: scan.illegal } });
      }
      if (scan.defamation.length > 0) {
        risks.push({ type: 'defamation_risk', severity: 'high', evidence: { patterns: scan.defamation } });
      }

      for (const r of risks) {
        await adminEntities.RiskAlert.create({
          risk_type: r.type, severity: r.severity, status: 'open',
          subject_user_id: creator_user_id,
          subject_content_type: content_type,
          subject_content_id: content_id,
          description: `Language scan flagged ${r.type} in ${content_type}`,
          evidence: r.evidence,
        });
        await _complianceLog(adminEntities, { action_detail: `Risk: ${r.type} in ${content_type} ${content_id}`, severity: r.severity === 'critical' ? 'critical' : 'warning' });
      }

      return Response.json({ risks, flagged: risks.length > 0 });
    }

    // ── Assess user risk ─────────────────────────────────────────────────
    if (action === 'assess_user') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { target_user_id } = body;

      const alerts = await adminEntities.RiskAlert.filter({ subject_user_id: target_user_id });
      const reports = await adminEntities.Report.filter({ target_author_id: target_user_id });
      const modLogs = await adminEntities.ModerationLog.filter({ affected_user_id: target_user_id });

      let risk_score = 0;
      const flags = [];

      const critAlerts = alerts.filter(a => a.severity === 'critical').length;
      const highAlerts = alerts.filter(a => a.severity === 'high').length;
      risk_score += critAlerts * 25 + highAlerts * 10;
      if (critAlerts > 0) flags.push('critical_content_flags');

      const openReports = reports.filter(r => r.status !== 'dismissed').length;
      risk_score += openReports * 5;
      if (openReports > 3) flags.push('multiple_reports');

      const bans = modLogs.filter(m => m.action_type === 'user_banned' || m.action_type === 'user_suspended').length;
      risk_score += bans * 20;
      if (bans > 0) flags.push('moderation_history');

      const overall = risk_score >= 70 ? 'critical' : risk_score >= 40 ? 'high' : risk_score >= 20 ? 'medium' : 'low';

      const existing = await adminEntities.UserRiskScore.filter({ user_id: target_user_id });
      const data = {
        user_id: target_user_id, risk_score: Math.min(100, risk_score),
        overall_risk: overall, flags,
        alert_count: alerts.length,
        last_assessed_at: new Date().toISOString(),
      };
      if (existing[0]) { await adminEntities.UserRiskScore.update(existing[0].id, data); }
      else { await adminEntities.UserRiskScore.create(data); }

      return Response.json({ user_id: target_user_id, risk_score: Math.min(100, risk_score), overall_risk: overall, flags });
    }

    // ── Run full platform risk scan (admin/scheduled) ────────────────────
    if (action === 'full_scan') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 604800000).toISOString();

      // Fetch all data in parallel to avoid CPU timeout
      const [recentPayments, recentReports, modifiedLedger, recentAccess, staleTakedowns] = await Promise.all([
        adminEntities.Transaction.filter({ status: 'pending' }, '-created_date', 100),
        adminEntities.Report.filter({ status: 'open' }, '-created_date', 100),
        adminEntities.LedgerEntry.filter({ verification_status: 'modified' }),
        adminEntities.DataAccessLog.list('-accessed_at', 50),
        adminEntities.TakedownRequest.filter({ status: 'pending' }),
      ]);

      const newAlerts = [];
      const alertsToCreate = [];

      // 1. Payment fraud check
      const refMap = {};
      for (const p of recentPayments) {
        if (p.reference) {
          if (!refMap[p.reference]) refMap[p.reference] = [];
          refMap[p.reference].push(p);
        }
      }
      for (const [ref, txns] of Object.entries(refMap)) {
        if (txns.length > 1) {
          alertsToCreate.push({ risk_type: 'payment_fraud', severity: 'high', status: 'open', description: `Duplicate payment reference "${ref}" used ${txns.length} times`, evidence: { reference: ref, transaction_ids: txns.map(t => t.id) } });
        }
      }

      // 2. Report brigading check
      const reportTargetMap = {};
      for (const r of recentReports) {
        if (r.created_date > yesterday) {
          if (!reportTargetMap[r.target_id]) reportTargetMap[r.target_id] = [];
          reportTargetMap[r.target_id].push(r);
        }
      }
      for (const [targetId, rpts] of Object.entries(reportTargetMap)) {
        if (rpts.length >= 5) {
          alertsToCreate.push({ risk_type: 'mass_report_abuse', severity: 'high', status: 'open', subject_content_id: targetId, description: `${rpts.length} reports filed against content ${targetId} in 24h — possible brigading`, evidence: { report_count: rpts.length, target_id: targetId } });
        }
      }

      // 3. Ledger tampering
      if (modifiedLedger.length > 0) {
        alertsToCreate.push({ risk_type: 'ledger_mismatch', severity: 'critical', status: 'open', description: `${modifiedLedger.length} ledger entries show modification — possible tampering`, evidence: { entry_ids: modifiedLedger.map(e => e.id) } });
      }

      // 4. Data access spike
      const todayAccess = recentAccess.filter(a => a.accessed_at > yesterday);
      if (todayAccess.length > 15) {
        alertsToCreate.push({ risk_type: 'data_access_spike', severity: 'medium', status: 'open', description: `${todayAccess.length} admin data access events in 24h`, evidence: { count: todayAccess.length } });
      }

      // 5. Takedown overdue
      const overdue = staleTakedowns.filter(t => t.created_date < sevenDaysAgo);
      if (overdue.length > 0) {
        alertsToCreate.push({ risk_type: 'policy_mismatch', severity: 'medium', status: 'open', description: `${overdue.length} takedown requests pending >7 days`, evidence: { count: overdue.length } });
      }

      // Create all alerts in parallel
      const created = await Promise.all(alertsToCreate.map(a => adminEntities.RiskAlert.create(a)));
      newAlerts.push(...created);

      await _complianceLog(adminEntities, {
        action_detail: `Risk engine full scan: ${newAlerts.length} new alert(s)`,
        severity: newAlerts.some(a => a.severity === 'critical') ? 'critical' : newAlerts.length > 0 ? 'warning' : 'info',
      });

      return Response.json({ success: true, new_alerts: newAlerts.length, scanned_at: new Date().toISOString() });
    }

    // ── Review an alert (admin) ──────────────────────────────────────────
    if (action === 'review_alert') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { alert_id, status, admin_notes, is_false_positive } = body;
      await adminEntities.RiskAlert.update(alert_id, {
        status, admin_notes, is_false_positive: is_false_positive || false,
        reviewed_by_admin_id: user.id, reviewed_at: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    // ── Apply limit to a user (admin) ───────────────────────────────────
    if (action === 'apply_limit') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { target_user_id, limits } = body;
      const existing = await adminEntities.UserRiskScore.filter({ user_id: target_user_id });
      if (existing[0]) {
        await adminEntities.UserRiskScore.update(existing[0].id, { active_limits: limits });
      } else {
        await adminEntities.UserRiskScore.create({ user_id: target_user_id, active_limits: limits });
      }
      await _complianceLog(adminEntities, { user_id: target_user_id, actor_id: user.id, action_detail: `Risk limits applied: ${limits.join(', ')}`, severity: 'warning' });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function _complianceLog(adminEntities, { user_id, actor_id, action_detail, severity }) {
  try {
    await adminEntities.ComplianceLog.create({
      event_type: 'moderation_action', user_id, actor_id, action_detail, severity: severity || 'info',
    });
  } catch (_) {}
}
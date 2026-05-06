import { createSupabaseContext } from '../lib/supabaseContext.ts';

// Scheduled daily compliance check — called by automation
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);

    const alerts = [];
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    // 1. Data access spike check
    const recentAccess = await adminEntities.DataAccessLog.list('-accessed_at', 100);
    const spike = recentAccess.filter(d => d.accessed_at > yesterday);
    if (spike.length > 20) {
      alerts.push({ type: 'data_access_spike', message: `${spike.length} data access events in 24h`, severity: 'warning' });
    }

    // 2. Pending data requests older than 48h
    const allRequests = await adminEntities.DataRequest.filter({ status: 'pending' });
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
    const stale = allRequests.filter(r => r.created_date < twoDaysAgo);
    if (stale.length > 0) {
      alerts.push({ type: 'stale_data_requests', message: `${stale.length} data requests pending >48h`, severity: 'warning' });
    }

    // 3. Critical open complaints
    const criticalReports = await adminEntities.Report.filter({ status: 'open', priority: 'critical' });
    if (criticalReports.length > 0) {
      alerts.push({ type: 'critical_reports', message: `${criticalReports.length} critical reports unresolved`, severity: 'critical' });
    }

    // 4. Ledger modified entries
    const modified = await adminEntities.LedgerEntry.filter({ verification_status: 'modified' });
    if (modified.length > 0) {
      alerts.push({ type: 'ledger_tampering', message: `${modified.length} ledger entries show modification`, severity: 'critical' });
    }

    // 5. Takedown requests pending >7 days
    const allTakedowns = await adminEntities.TakedownRequest.filter({ status: 'pending' });
    const sevenDaysAgo = new Date(Date.now() - 604800000).toISOString();
    const staleTakedowns = allTakedowns.filter(t => t.created_date < sevenDaysAgo);
    if (staleTakedowns.length > 0) {
      alerts.push({ type: 'stale_takedowns', message: `${staleTakedowns.length} takedown requests pending >7 days`, severity: 'warning' });
    }

    const overallSeverity = alerts.some(a => a.severity === 'critical') ? 'critical'
      : alerts.some(a => a.severity === 'warning') ? 'warning' : 'info';

    // Log result
    await adminEntities.ComplianceLog.create({
      event_type: 'system_check',
      action_detail: `Automated daily compliance check: ${alerts.length} alert(s)`,
      metadata: { alerts, alert_count: alerts.length },
      severity: overallSeverity,
    });

    return Response.json({ success: true, alerts, severity: overallSeverity, checked_at: new Date().toISOString() });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
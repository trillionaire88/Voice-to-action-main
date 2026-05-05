import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── Run daily snapshot ────────────────────────────────────────────────
    if (action === 'daily_snapshot') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      // Fetch counts
      const [petitions, votes, polls, signatures, communities, scorecards,
             modLogs, riskAlerts, payments, subscriptions, complianceLogs] = await Promise.all([
        adminEntities.Petition.list('-created_date', 500),
        adminEntities.Vote.list('-created_date', 1000),
        adminEntities.Poll.list('-created_date', 500),
        adminEntities.PetitionSignature.list('-created_date', 1000),
        adminEntities.Community.list('-created_date', 200),
        adminEntities.Scorecard.list('-created_date', 200),
        adminEntities.ModerationLog.list('-created_date', 500),
        adminEntities.RiskAlert.list('-created_date', 200),
        adminEntities.Transaction.filter({ status: 'confirmed' }, '-created_date', 200),
        adminEntities.Subscription.list('-created_date', 200),
        adminEntities.ComplianceLog.list('-created_date', 500),
      ]);

      const inPeriod = (items) => items.filter(i => i.created_date >= startIso && i.created_date <= endIso);
      const revenue = inPeriod(payments).reduce((s, p) => s + (p.amount || 0), 0);

      const snapshot = {
        snapshot_type: 'daily',
        period_label: today,
        period_start: startIso,
        period_end: endIso,
        new_petitions: inPeriod(petitions).length,
        new_votes: inPeriod(votes).length,
        new_polls: inPeriod(polls).length,
        total_signatures: inPeriod(signatures).length,
        new_communities: inPeriod(communities).length,
        new_scorecards: inPeriod(scorecards).length,
        moderation_actions: inPeriod(modLogs).length,
        risk_alerts: inPeriod(riskAlerts).length,
        revenue_total: revenue,
        new_subscriptions: inPeriod(subscriptions).filter(s => s.status === 'active').length,
        cancelled_subscriptions: inPeriod(subscriptions).filter(s => s.status === 'cancelled').length,
        compliance_events: inPeriod(complianceLogs).length,
        total_users: 0,
        active_users: inPeriod(votes).length + inPeriod(signatures).length > 0 ? Math.floor((inPeriod(votes).length + inPeriod(signatures).length) / 2) : 0,
      };

      // Upsert
      const existing = await adminEntities.WarehouseSnapshot.filter({ snapshot_type: 'daily', period_label: today });
      if (existing[0]) {
        await adminEntities.WarehouseSnapshot.update(existing[0].id, snapshot);
      } else {
        await adminEntities.WarehouseSnapshot.create(snapshot);
      }

      return Response.json({ success: true, period: today, snapshot });
    }

    // ── Run monthly snapshot ─────────────────────────────────────────────
    if (action === 'monthly_snapshot') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const now = new Date();
      const month = now.toISOString().slice(0, 7);
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = now.toISOString();

      // Aggregate daily snapshots for this month
      const dailies = await adminEntities.WarehouseSnapshot.filter({ snapshot_type: 'daily' });
      const thisMonth = dailies.filter(d => d.period_label && d.period_label.startsWith(month));

      const sum = (key) => thisMonth.reduce((s, d) => s + (d[key] || 0), 0);

      const snapshot = {
        snapshot_type: 'monthly',
        period_label: month,
        period_start: start,
        period_end: end,
        new_petitions: sum('new_petitions'),
        new_votes: sum('new_votes'),
        new_polls: sum('new_polls'),
        total_signatures: sum('total_signatures'),
        new_communities: sum('new_communities'),
        new_scorecards: sum('new_scorecards'),
        moderation_actions: sum('moderation_actions'),
        risk_alerts: sum('risk_alerts'),
        revenue_total: sum('revenue_total'),
        new_subscriptions: sum('new_subscriptions'),
        cancelled_subscriptions: sum('cancelled_subscriptions'),
        compliance_events: sum('compliance_events'),
        active_users: sum('active_users'),
      };

      const existing = await adminEntities.WarehouseSnapshot.filter({ snapshot_type: 'monthly', period_label: month });
      if (existing[0]) {
        await adminEntities.WarehouseSnapshot.update(existing[0].id, snapshot);
      } else {
        await adminEntities.WarehouseSnapshot.create(snapshot);
      }

      return Response.json({ success: true, period: month, snapshot });
    }

    // ── Generate report ──────────────────────────────────────────────────
    if (action === 'generate_report') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { report_type = 'activity', period = 'monthly', limit = 12 } = body;

      const snapshots = await adminEntities.WarehouseSnapshot.filter({ snapshot_type: period }, '-period_label', limit);

      let reportData = {};

      if (report_type === 'activity') {
        reportData = {
          title: 'Activity Report',
          series: snapshots.map(s => ({
            period: s.period_label,
            petitions: s.new_petitions || 0,
            votes: s.new_votes || 0,
            signatures: s.total_signatures || 0,
            communities: s.new_communities || 0,
            active_users: s.active_users || 0,
          })),
        };
      } else if (report_type === 'finance') {
        reportData = {
          title: 'Finance Report',
          series: snapshots.map(s => ({
            period: s.period_label,
            revenue: s.revenue_total || 0,
            new_subscriptions: s.new_subscriptions || 0,
            cancelled: s.cancelled_subscriptions || 0,
          })),
          totals: {
            total_revenue: snapshots.reduce((s, d) => s + (d.revenue_total || 0), 0),
            total_subscriptions: snapshots.reduce((s, d) => s + (d.new_subscriptions || 0), 0),
          },
        };
      } else if (report_type === 'risk') {
        reportData = {
          title: 'Risk Report',
          series: snapshots.map(s => ({
            period: s.period_label,
            risk_alerts: s.risk_alerts || 0,
            moderation_actions: s.moderation_actions || 0,
            compliance_events: s.compliance_events || 0,
          })),
        };
      } else if (report_type === 'petition') {
        reportData = {
          title: 'Petition Report',
          series: snapshots.map(s => ({
            period: s.period_label,
            new_petitions: s.new_petitions || 0,
            total_signatures: s.total_signatures || 0,
          })),
        };
      } else {
        reportData = { title: `${report_type} Report`, series: snapshots };
      }

      reportData.generated_at = new Date().toISOString();
      reportData.period_type = period;
      reportData.record_count = snapshots.length;

      return Response.json({ report: reportData });
    }

    // ── Get historical series ────────────────────────────────────────────
    if (action === 'get_series') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { snapshot_type = 'daily', limit = 30 } = body;
      const series = await adminEntities.WarehouseSnapshot.filter({ snapshot_type }, '-period_label', limit);
      return Response.json({ series: series.reverse() }); // oldest first for charts
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
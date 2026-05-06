import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── Log a compliance event ──────────────────────────────────────────
    if (action === 'log_event') {
      const { event_type, user_id, actor_id, action_detail, metadata,
              ip_address, device_info, country_code, severity,
              related_entity_type, related_entity_id } = body;

      const entry = await adminEntities.ComplianceLog.create({
        event_type, user_id, actor_id, action_detail, metadata,
        ip_address, device_info, country_code,
        severity: severity || 'info',
        related_entity_type, related_entity_id,
      });
      return Response.json({ success: true, entry });
    }

    // ── Record consent ──────────────────────────────────────────────────
    if (action === 'record_consent') {
      const { policy_type, policy_version, ip_address, device_info, country_code } = body;

      // Mark previous consents for this policy as not current
      const existing = await adminEntities.ConsentRecord.filter({
        user_id: user.id, policy_type, is_current: true
      });
      for (const c of existing) {
        await adminEntities.ConsentRecord.update(c.id, { is_current: false });
      }

      const record = await adminEntities.ConsentRecord.create({
        user_id: user.id, policy_type, policy_version,
        accepted_at: new Date().toISOString(),
        ip_address, device_info, country_code, is_current: true,
      });

      // Also log to compliance log
      await adminEntities.ComplianceLog.create({
        event_type: 'policy_acceptance',
        user_id: user.id,
        action_detail: `User accepted ${policy_type} ${policy_version}`,
        metadata: { policy_type, policy_version },
        ip_address, device_info, country_code, severity: 'info',
      });

      return Response.json({ success: true, record });
    }

    // ── Check consent status ────────────────────────────────────────────
    if (action === 'check_consent') {
      const { policy_type } = body;

      // Get active policy version
      const policies = await adminEntities.PolicyVersion.filter({
        policy_type, is_active: true
      });
      const activePolicy = policies[0];
      if (!activePolicy) return Response.json({ has_consent: true, reason: 'no_active_policy' });

      const consents = await adminEntities.ConsentRecord.filter({
        user_id: user.id, policy_type, is_current: true
      });
      const latest = consents[0];

      const has_consent = latest?.policy_version === activePolicy.version;
      return Response.json({
        has_consent,
        required_version: activePolicy.version,
        accepted_version: latest?.policy_version || null,
        policy_title: activePolicy.title,
        policy_summary: activePolicy.summary,
      });
    }

    // ── Get all pending consent requirements ────────────────────────────
    if (action === 'get_pending_consents') {
      const allPolicyTypes = ['terms_of_use', 'privacy_policy', 'payment_policy', 'no_refund_policy', 'community_rules'];
      const pending = [];

      for (const pt of allPolicyTypes) {
        const policies = await adminEntities.PolicyVersion.filter({ policy_type: pt, is_active: true });
        const activePolicy = policies[0];
        if (!activePolicy || !activePolicy.requires_re_acceptance) continue;

        const consents = await adminEntities.ConsentRecord.filter({
          user_id: user.id, policy_type: pt, is_current: true
        });
        const latest = consents[0];
        if (!latest || latest.policy_version !== activePolicy.version) {
          pending.push({
            policy_type: pt,
            version: activePolicy.version,
            title: activePolicy.title,
            summary: activePolicy.summary,
            content: activePolicy.content,
          });
        }
      }

      return Response.json({ pending });
    }

    // ── Log data access (admin only) ────────────────────────────────────
    if (action === 'log_data_access') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { subject_user_id, access_type, data_type, reason, ip_address } = body;

      const entry = await adminEntities.DataAccessLog.create({
        admin_id: user.id,
        subject_user_id, access_type, data_type, reason, ip_address,
        accessed_at: new Date().toISOString(),
      });

      await adminEntities.ComplianceLog.create({
        event_type: 'data_access',
        user_id: subject_user_id,
        actor_id: user.id,
        action_detail: `Admin ${access_type} on ${data_type}`,
        metadata: { access_type, data_type, reason },
        severity: access_type === 'export' ? 'warning' : 'info',
      });

      return Response.json({ success: true, entry });
    }

    // ── Submit data request (user) ──────────────────────────────────────
    if (action === 'submit_data_request') {
      const { request_type, reason } = body;

      const existing = await adminEntities.DataRequest.filter({
        user_id: user.id, request_type, status: 'pending'
      });
      if (existing.length > 0) return Response.json({ error: 'Request already pending' }, { status: 400 });

      const request = await adminEntities.DataRequest.create({
        user_id: user.id, request_type, reason, status: 'pending',
      });

      await adminEntities.ComplianceLog.create({
        event_type: 'deletion_request',
        user_id: user.id,
        action_detail: `User submitted ${request_type} request`,
        metadata: { request_type, reason }, severity: 'warning',
      });

      return Response.json({ success: true, request });
    }

    // ── Record payment (admin confirm) ─────────────────────────────────
    if (action === 'record_payment') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { user_id, amount, currency, reason, reference, payment_method, status, related_entity_type, related_entity_id } = body;

      const record = await adminEntities.PaymentRecord.create({
        user_id, amount, currency: currency || 'AUD', reason, reference,
        payment_method, status: status || 'confirmed',
        related_entity_type, related_entity_id,
        processed_at: new Date().toISOString(),
      });

      await adminEntities.ComplianceLog.create({
        event_type: 'payment_action',
        user_id, actor_id: user.id,
        action_detail: `Payment ${status || 'confirmed'}: ${amount} ${currency || 'AUD'} for ${reason}`,
        metadata: { amount, currency, reason, reference }, severity: 'info',
      });

      return Response.json({ success: true, record });
    }

    // ── Daily compliance check (admin/system) ──────────────────────────
    if (action === 'daily_check') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const alerts = [];

      // Check for high-volume data access in last 24h
      const allDataAccess = await adminEntities.DataAccessLog.list('-accessed_at', 100);
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const recentAccess = allDataAccess.filter(d => d.accessed_at > yesterday);
      if (recentAccess.length > 20) {
        alerts.push({ type: 'data_access_spike', message: `${recentAccess.length} data access events in last 24h`, severity: 'warning' });
      }

      // Check for pending data requests
      const pendingRequests = await adminEntities.DataRequest.filter({ status: 'pending' });
      if (pendingRequests.length > 5) {
        alerts.push({ type: 'pending_requests', message: `${pendingRequests.length} pending data requests`, severity: 'warning' });
      }

      // Check for open critical complaints
      const reports = await adminEntities.Report.filter({ status: 'open', priority: 'critical' });
      if (reports.length > 0) {
        alerts.push({ type: 'critical_reports', message: `${reports.length} critical unresolved reports`, severity: 'critical' });
      }

      // Log the check
      await adminEntities.ComplianceLog.create({
        event_type: 'system_check',
        actor_id: user.id,
        action_detail: `Daily compliance check: ${alerts.length} alerts`,
        metadata: { alert_count: alerts.length, alerts },
        severity: alerts.some(a => a.severity === 'critical') ? 'critical' : alerts.length > 0 ? 'warning' : 'info',
      });

      return Response.json({ success: true, alerts, checked_at: new Date().toISOString() });
    }

    // ── Publish a new policy version (admin) ────────────────────────────
    if (action === 'publish_policy') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { policy_type, version, title, content, summary, change_summary, requires_re_acceptance, jurisdiction_scope } = body;

      // Deactivate old versions
      const old = await adminEntities.PolicyVersion.filter({ policy_type, is_active: true });
      for (const p of old) {
        await adminEntities.PolicyVersion.update(p.id, { is_active: false });
      }

      const policy = await adminEntities.PolicyVersion.create({
        policy_type, version, title, content, summary, change_summary,
        requires_re_acceptance: requires_re_acceptance !== false,
        jurisdiction_scope: jurisdiction_scope || 'global',
        is_active: true,
        effective_date: new Date().toISOString().split('T')[0],
        published_by_user_id: user.id,
      });

      await adminEntities.ComplianceLog.create({
        event_type: 'policy_change',
        actor_id: user.id,
        action_detail: `Published ${policy_type} ${version}`,
        metadata: { policy_type, version, change_summary },
        severity: 'warning',
      });

      return Response.json({ success: true, policy });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
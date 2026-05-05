import { createSupabaseContext } from '../lib/supabaseContext.ts';
import { format } from 'npm:date-fns@3.6.0';
import { siteUrl } from '../_shared/siteUrl.ts';

/** Signatory lines omit PII (names, emails, city, trust_level); aligns with Supabase withdrawal email. */

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { petitionId, emailAddresses } = await req.json();

    if (!petitionId) {
      return Response.json({ error: 'Missing petitionId' }, { status: 400 });
    }

    const { data: petitionAuth, error: petitionAuthErr } = await supabaseAdmin
      .from('petitions')
      .select('creator_user_id')
      .eq('id', petitionId)
      .single();

    if (petitionAuthErr || !petitionAuth) {
      return Response.json({ error: 'Petition not found' }, { status: 404 });
    }

    const { data: profileAuth } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profileAuth?.role ?? 'user';
    const isElevated = role === 'admin' || role === 'owner_admin';
    if (petitionAuth.creator_user_id !== user.id && !isElevated) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch petition and related data
    const [petitions, freshSignatures, deliveries, analytics] = await Promise.all([
      entities.Petition.filter({ id: petitionId }),
      entities.PetitionSignature.filter({ petition_id: petitionId }).catch(() => []),
      entities.PetitionDelivery.filter({ petition_id: petitionId }).catch(() => []),
      entities.PetitionAnalytics.filter({ petition_id: petitionId }).catch(() => []),
    ]);

    const petition = petitions[0];
    if (!petition) {
      return Response.json({ error: 'Petition not found' }, { status: 404 });
    }

    const credibility = analytics[0];
    const isCreator = user.id === petition.creator_user_id;

    // Build anonymised signatory list (no names, emails, or internal trust fields)
    const sigList = freshSignatures.map((s, i) =>
      `${i + 1}. Country: ${s.country_code || "Unknown"} | Verified: ${s.is_verified_user ? "Yes" : "No"} | Signed: ${s.created_date ? format(new Date(s.created_date), "PPP") : "Unknown"}`
    ).join("\n");

    // Build delivery section
    const deliverySection = deliveries.length === 0
      ? "No deliveries recorded yet."
      : deliveries.map((d, i) =>
          `${i + 1}. Method: ${d.delivery_method || "N/A"} | Status: ${d.status || "N/A"} | Delivered: ${d.delivered_at ? format(new Date(d.delivered_at), "PPP") : "Pending"} | Recipient: ${d.recipient_name || "N/A"} (${d.recipient_title || ""}) | Notes: ${d.notes || "None"}`
        ).join("\n");

    // Calculate goal progress
    const goalProgress = petition.signature_goal
      ? `${Math.round(((petition.signature_count_total || 0) / petition.signature_goal) * 100)}%`
      : "N/A";

    // Build email body
    const emailBody = `
PETITION WITHDRAWAL REPORT
============================
Generated: ${format(new Date(), "PPP 'at' h:mm a")}
Report requested by: ${user.full_name} (${user.email})
Role: ${isCreator ? "Petition Creator" : "Public User"}

PETITION DETAILS
----------------
Title:            ${petition.title}
Category:         ${(petition.category || "").replace(/_/g, " ")}
Status:           ${(petition.status || "active").toUpperCase()} (remains live — continues collecting signatures)
Urgency Level:    ${petition.urgency_level || "N/A"}
Created:          ${petition.created_date ? format(new Date(petition.created_date), "PPP") : "N/A"}
Petition URL:     ${siteUrl(`/PetitionDetail?id=${petitionId}`)}

TARGET
------
Name:             ${petition.target_name || "N/A"}
Type:             ${(petition.target_type || "N/A").replace(/_/g, " ")}
Country:          ${petition.country_code || "N/A"}
Region:           ${petition.region_code || "N/A"}

DESCRIPTION
-----------
Summary:
${petition.short_summary || "N/A"}

Full Description:
${petition.full_description || "N/A"}

Requested Action:
${petition.requested_action || "N/A"}

SIGNATURE STATISTICS
--------------------
Total Signatures:      ${(petition.signature_count_total || 0).toLocaleString()}
Verified Signatures:   ${(petition.signature_count_verified || 0).toLocaleString()}
Signature Goal:        ${(petition.signature_goal || 0).toLocaleString()}
Goal Progress:         ${goalProgress}
Goal Reached:          ${(petition.signature_count_total || 0) >= (petition.signature_goal || 0) ? "YES ✓" : "Not yet"}

CREDIBILITY & ANALYTICS
------------------------
Verified Score:        ${credibility?.verified_score ?? "N/A"} / 100
Countries Represented: ${credibility?.countries_count ?? "N/A"}
Growth Rate (7 days):  ${credibility?.growth_rate_7d ?? "N/A"}%
Peak Single Day:       ${credibility?.peak_day_count ?? "N/A"} signatures

DELIVERY HISTORY
----------------
${deliverySection}

ALL SIGNATORIES (${freshSignatures.length} total)
${"=".repeat(60)}
${sigList || "No signatures recorded"}

---
This report was automatically generated by Voice to Action.
Your petition remains ACTIVE and will continue collecting signatures.
    `.trim();

    // Parse email addresses (support comma-separated list or array)
    let recipients = [];
    if (Array.isArray(emailAddresses)) {
      recipients = emailAddresses;
    } else if (typeof emailAddresses === 'string') {
      recipients = emailAddresses.split(',').map(e => e.trim()).filter(Boolean);
    } else {
      recipients = [user.email];
    }

    // Validate recipients
    if (!recipients.length) {
      return Response.json({ error: 'No valid email addresses provided' }, { status: 400 });
    }

    // Build HTML email content
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { margin: 0; color: #1e40af; font-size: 24px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
    .stat { display: inline-block; margin-right: 20px; margin-bottom: 10px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .signatories { background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 13px; max-height: 300px; overflow-y: auto; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Petition Withdrawal Report</h1>
      <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Generated ${format(new Date(), "PPP 'at' h:mm a")}</p>
    </div>

    <div class="section">
      <div class="section-title">Petition Details</div>
      <h2 style="margin: 0 0 12px 0; font-size: 18px;">${petition.title}</h2>
      <p style="margin: 8px 0; color: #666;">${petition.short_summary}</p>
      <div>
        <div class="stat">
          <div class="stat-value">${(petition.signature_count_total || 0).toLocaleString()}</div>
          <div class="stat-label">Total Signatures</div>
        </div>
        <div class="stat">
          <div class="stat-value">${(petition.signature_count_verified || 0).toLocaleString()}</div>
          <div class="stat-label">Verified</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Math.round(((petition.signature_count_total || 0) / (petition.signature_goal || 1)) * 100)}%</div>
          <div class="stat-label">Goal Progress</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Target Information</div>
      <p><strong>Name:</strong> ${petition.target_name || 'N/A'}</p>
      <p><strong>Type:</strong> ${(petition.target_type || 'N/A').replace(/_/g, ' ')}</p>
      <p><strong>Country:</strong> ${petition.country_code || 'N/A'}</p>
    </div>

    <div class="section">
      <div class="section-title">Credentials</div>
      <p><strong>Verified Score:</strong> ${credibility?.verified_score ?? 'N/A'} / 100</p>
      <p><strong>Countries Represented:</strong> ${credibility?.countries_count ?? 'N/A'}</p>
      <p><strong>Status:</strong> ${(petition.status || 'active').toUpperCase()} (remains active)</p>
    </div>

    <div class="section">
      <div class="section-title">Delivery History</div>
      <p>${deliveries.length === 0 ? 'No deliveries recorded yet.' : deliveries.map((d, i) => `${i + 1}. ${d.delivery_method} to ${d.recipient_name} on ${d.delivered_at ? format(new Date(d.delivered_at), 'PPP') : 'Pending'}`).join('<br>')}</p>
    </div>

    <div class="section">
      <div class="section-title">All Signatories (${freshSignatures.length} total)</div>
      <div class="signatories">
        ${freshSignatures.map((s, i) => `${i + 1}. ${s.signer_name || 'Anonymous'} (${s.country_code || 'Unknown'}) — ${s.is_verified_user ? '✓ Verified' : 'Unverified'}`).join('<br>')}
      </div>
    </div>

    <div class="footer">
      <p>This report was automatically generated by Voice to Action. Your petition remains <strong>ACTIVE</strong> and continues collecting signatures.</p>
      <p>Requested by: ${user.full_name} (${user.email})</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send emails via platform integration to all recipients
    const emailResults = await Promise.allSettled(
      recipients.map(email =>
        integrations.Core.SendEmail({
          to: email,
          subject: `Petition Withdrawal Report: ${petition.title}`,
          body: emailBody,
          from_name: 'Voice to Action',
        })
      )
    );

    // Check if any emails failed
    const failed = emailResults.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error('Email failures:', failed.map(r => r.reason));
      return Response.json({ 
        error: `Failed to send to ${failed.length} recipient(s)`,
        details: failed.map(r => r.reason?.message || 'Unknown error')
      }, { status: 500 });
    }

    // Send notification to team (async, don't block on failure)
    const teamTo = Deno.env.get("OWNER_NOTIFY_EMAIL") ?? Deno.env.get("ADMIN_EMAIL") ?? "";
    if (teamTo.trim()) {
      integrations.Core.SendEmail({
        to: teamTo.trim(),
        subject: `[Withdrawal] ${petition.title} — requested by ${user.full_name}`,
        body: `Withdrawal report requested.\n\nPetition: "${petition.title}" (ID: ${petitionId})\nRequested by: ${user.full_name} (${user.email})\nSent to: ${recipients.join(', ')}\nIs Creator: ${isCreator}\nTotal signatures: ${petition.signature_count_total || 0}\nDate: ${new Date().toISOString()}`,
        from_name: 'Voice to Action',
      }).catch(err => console.error("Team email failed:", err));
    }

    // Create withdrawal record
    await adminEntities.PetitionWithdrawal.create({
      petition_id: petitionId,
      user_id: user.id,
      withdrawn_at: new Date().toISOString(),
      is_owner_bypass: false,
    }).catch(err => console.error("Withdrawal record failed:", err));

    return Response.json({ 
      success: true, 
      message: `Email sent successfully to ${recipients.length} recipient(s)`,
      sentTo: recipients
    });
  } catch (error) {
    console.error("Withdrawal email error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
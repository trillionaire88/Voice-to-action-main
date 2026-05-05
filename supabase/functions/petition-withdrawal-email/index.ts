import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { petition_id, stripe_session_id } = await req.json();
    if (!petition_id) {
      return new Response(JSON.stringify({ error: "petition_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: petition } = await supabase.from("petitions").select("*").eq("id", petition_id).single();
    if (!petition) {
      return new Response(JSON.stringify({ error: "Petition not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signatures, count: signatureCount } = await supabase
      .from("petition_signatures")
      .select("country_code, is_verified_user, created_at", { count: "exact" })
      .eq("petition_id", petition_id)
      .order("created_at", { ascending: false })
      .limit(500);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const userName = profile?.full_name || profile?.display_name || user.email;
    const totalSignatures = petition.signature_count_total || signatureCount || 0;
    const verifiedSignatures =
      petition.signature_count_verified || (signatures || []).filter((s) => s.is_verified_user).length;
    const generatedAt = new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      dateStyle: "full",
      timeStyle: "short",
    });

    const countries = [...new Set((signatures || []).map((s) => s.country_code).filter(Boolean))];

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e40af, #2563eb); padding: 32px; color: white; }
    .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.85; font-size: 13px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-size: 12px; margin-top: 12px; }
    .body { padding: 32px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat { background: #f1f5f9; border-radius: 10px; padding: 14px; }
    .stat-value { font-size: 24px; font-weight: 800; color: #1e40af; line-height: 1; }
    .stat-label { font-size: 11px; color: #64748b; margin-top: 4px; }
    .field { margin-bottom: 10px; }
    .field-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-value { font-size: 14px; color: #1e293b; margin-top: 2px; line-height: 1.5; }
    .countries { background: #f8fafc; border-radius: 8px; padding: 12px; font-size: 13px; color: #475569; line-height: 1.8; }
    .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .active-badge { display: inline-block; background: #dcfce7; color: #166534; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; }
    .disclaimer { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400e; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Petition Withdrawal Report</h1>
      <p>Voice to Action - Every Voice Pty Ltd</p>
      <div class="badge">Generated ${generatedAt} AEST</div>
    </div>

    <div class="body">
      <div class="section">
        <div class="section-title">Petition Details</div>
        <div class="field"><div class="field-label">Title</div><div class="field-value"><strong>${petition.title}</strong></div></div>
        <div class="field"><div class="field-label">Summary</div><div class="field-value">${petition.short_summary || petition.description || "-"}</div></div>
        <div class="field"><div class="field-label">Category</div><div class="field-value">${(petition.category || "").replace(/_/g, " ")}</div></div>
        <div class="field"><div class="field-label">Target</div><div class="field-value">${petition.target_name || "-"} (${(petition.target_type || "").replace(/_/g, " ")})</div></div>
        <div class="field"><div class="field-label">Country</div><div class="field-value">${petition.country_code || "-"}</div></div>
        <div class="field"><div class="field-label">Status</div><div class="field-value"><span class="active-badge">${(petition.status || "active").toUpperCase()}</span></div></div>
        <div class="field"><div class="field-label">Created</div><div class="field-value">${petition.created_at ? new Date(petition.created_at).toLocaleDateString("en-AU") : "-"}</div></div>
      </div>

      <div class="section">
        <div class="section-title">Signature Statistics</div>
        <div class="stat-grid">
          <div class="stat"><div class="stat-value">${totalSignatures.toLocaleString()}</div><div class="stat-label">Total Signatures</div></div>
          <div class="stat"><div class="stat-value">${petition.signature_goal ? petition.signature_goal.toLocaleString() : "-"}</div><div class="stat-label">Signature Goal</div></div>
          <div class="stat"><div class="stat-value">${verifiedSignatures.toLocaleString()}</div><div class="stat-label">Verified Signatures</div></div>
          <div class="stat"><div class="stat-value">${petition.signature_goal ? Math.round((totalSignatures / petition.signature_goal) * 100) : "-"}${petition.signature_goal ? "%" : ""}</div><div class="stat-label">Goal Progress</div></div>
        </div>
      </div>

      ${
        countries.length > 0
          ? `<div class="section"><div class="section-title">Countries Represented (${countries.length})</div><div class="countries">${countries.join(" - ")}</div></div>`
          : ""
      }

      <div class="disclaimer">
        <strong>Important:</strong> This is an official petition summary report from Voice to Action. This report does not include personal signer data (names, emails, or phone numbers) to protect user privacy in accordance with the Australian Privacy Act 1988. Your petition remains <strong>ACTIVE</strong> and will continue collecting signatures after this withdrawal.
      </div>
    </div>

    <div class="footer">
      <p><strong>Requested by:</strong> ${userName} (${user.email})</p>
      <p><strong>Generated:</strong> ${generatedAt} AEST</p>
      <p><strong>Petition ID:</strong> ${petition_id}</p>
      <p style="margin-top:8px;">Voice to Action - Every Voice Pty Ltd - ACN 696 098 218 - voicetoaction@outlook.com</p>
    </div>
  </div>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Voice to Action <noreply@voicetoaction.io>",
        to: user.email,
        subject: `Petition Withdrawal Report - ${petition.title}`,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error("[petition-withdrawal-email] Resend error:", err);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("petition_withdrawals")
      .upsert(
        {
          petition_id,
          user_id: user.id,
          payment_reference: stripe_session_id || "direct",
          payment_amount: 1.99,
          stripe_session_id: stripe_session_id || null,
          email_sent_to: user.email,
          status: "paid",
          withdrawn_at: new Date().toISOString(),
        },
        { onConflict: "petition_id,user_id" },
      );

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Voice to Action <noreply@voicetoaction.io>",
        to: "voicetoaction@outlook.com",
        subject: `[Petition Withdrawal] $1.99 - "${petition.title}"`,
        html: `<p>Petition withdrawal completed.<br><br>User: ${userName} (${user.email})<br>Petition: ${petition.title}<br>ID: ${petition_id}<br>Time: ${generatedAt}</p>`,
      }),
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, email_sent_to: user.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[petition-withdrawal-email]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

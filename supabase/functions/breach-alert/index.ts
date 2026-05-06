import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";
import { siteUrl, siteOrigin } from "../_shared/siteUrl.ts";
import { FROM_SECURITY } from "../_shared/email.ts";

const CORS = {
  "Access-Control-Allow-Origin": siteOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimit(ip, "breach-alert", 2, 3600);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  const { data: actor } = await supabase.from("profiles").select("role,email").eq("id", user.id).single();
  if (!["admin", "owner_admin"].includes(actor?.role || "")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.affectedUserIds) ? body.affectedUserIds : [];
  const description = String(body.breachDescription || "").slice(0, 5000);
  const severity = ["low", "medium", "high", "critical"].includes(body.severity) ? body.severity : "medium";

  const { data: users } = await supabase.from("profiles").select("id,email").in("id", ids);
  for (const u of users || []) {
    if (Deno.env.get("RESEND_API_KEY") && u.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_SECURITY,
          to: u.email,
          subject: "Important security notice regarding your Voice to Action account",
          text: `${description}\n\nRecommended actions:\n- Change your password\n- Enable 2FA\n- Review active sessions\n\n${siteUrl("/SecuritySettings")}`,
        }),
      }).catch(() => {});
    }
    await supabase.from("security_audit_log").insert({
      user_id: u.id,
      event_type: "breach_alert_sent",
      severity,
      details: { description, sent_by: user.id },
    });
  }

  await supabase.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "breach_alert_batch",
    target_type: "user",
    details: { count: users?.length || 0, severity },
  });

  return new Response(JSON.stringify({ success: true, sent: users?.length || 0 }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});

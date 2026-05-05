import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date().toISOString();
  const issues: string[] = [];

  const adminProbe = await supabase.from("admin_audit_log").select("id").limit(1);
  if (adminProbe.error) issues.push(`admin_audit_log: ${adminProbe.error.message}`);

  const platformProbe = await supabase.from("platform_status").select("id, panic_mode, maintenance_mode").eq("id", 1).maybeSingle();
  if (platformProbe.error || !platformProbe.data) issues.push("platform_status singleton missing/unreachable");

  const ok = issues.length === 0;
  await supabase.from("security_audit_log").insert({
    event_type: "backup_health_check",
    severity: ok ? "info" : "high",
    details: { ok, issues, checked_at: now },
    created_at: now,
  });

  if (!ok && Deno.env.get("RESEND_API_KEY")) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Voice to Action Security <noreply@voicetoaction.io>",
        to: "jeremywhisson@gmail.com",
        subject: "Backup health check warning",
        text: `Backup health check failed at ${now}\n\n${issues.join("\n")}`,
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok, issues, checked_at: now }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});

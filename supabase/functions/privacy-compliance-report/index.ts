import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (actor?.role !== "owner_admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });
  }

  const [users, verified, pendingDeletion, completedDeletion] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_kyc_verified", true),
    supabase.from("data_deletion_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("data_deletion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("processed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const report = {
    generated_at: new Date().toISOString(),
    total_registered_users: users.count || 0,
    users_with_verified_identity: verified.count || 0,
    pending_data_deletion_requests: pendingDeletion.count || 0,
    completed_data_deletions_last_30_days: completedDeletion.count || 0,
    data_retention_summary: {
      security_logs: "12 months",
      moderation_records: "24 months",
      payment_records: "7 years",
      deletion_requests: "7 years",
    },
    third_party_processors: ["Stripe", "Resend", "Supabase"],
    legal_basis: "Australian Privacy Act 1988 and GDPR readiness controls",
  };

  await supabase.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "privacy_compliance_report_generated",
    target_type: "compliance",
    details: report,
  });

  return new Response(JSON.stringify(report), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});

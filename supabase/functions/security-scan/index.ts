import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { auditLog, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";

const OWNER_EMAIL = "jeremywhisson@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });

  const cronHeader = req.headers.get("x-supabase-cron-trigger");
  const authHeader = req.headers.get("authorization");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!cronHeader && authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!["admin", "owner_admin"].includes(profile?.role || "")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
  }

  const now = new Date();
  const issues: string[] = [];
  const oneDayAgo = new Date(now.getTime() - 86_400_000).toISOString();

  try {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("role, is_blue_verified, email")
      .eq("email", OWNER_EMAIL)
      .maybeSingle();

    if (!ownerProfile) {
      issues.push("CRITICAL: Owner account not found in profiles table");
    } else if (!["admin", "owner_admin"].includes(ownerProfile.role)) {
      issues.push(`CRITICAL: Owner account has wrong role: ${ownerProfile.role}`);
      await supabase.from("profiles").update({ role: "owner_admin" }).eq("email", OWNER_EMAIL);
    }

    const { data: recentRoleChanges } = await supabase
      .from("security_audit_log")
      .select("user_id, details, created_at")
      .eq("event_type", "role_change")
      .gte("created_at", oneDayAgo);

    if (recentRoleChanges?.length) {
      const unauthorised = recentRoleChanges.filter((r) => !r.details?.changed_by_admin);
      if (unauthorised.length > 0) issues.push(`CRITICAL: ${unauthorised.length} unauthorised role change(s) detected in last 24h`);
    }

    const { count: criticalCount } = await supabase
      .from("security_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("severity", "critical")
      .gte("created_at", oneDayAgo);
    if ((criticalCount || 0) > 10) issues.push(`WARNING: ${criticalCount} critical security events in last 24 hours`);

    const { count: blockedIPCount } = await supabase
      .from("threat_intelligence")
      .select("id", { count: "exact", head: true })
      .eq("blocked", true)
      .gte("created_at", oneDayAgo);
    if ((blockedIPCount || 0) > 50) issues.push(`WARNING: ${blockedIPCount} IPs blocked in last 24h`);

    const { data: adminAccounts } = await supabase.from("profiles").select("id, email, role").in("role", ["admin", "owner_admin"]);
    const AUTHORISED_ADMINS = [OWNER_EMAIL];
    if (adminAccounts) {
      const unexpectedAdmins = adminAccounts.filter((a) => !AUTHORISED_ADMINS.includes(a.email || ""));
      if (unexpectedAdmins.length > 0) issues.push(`CRITICAL: unexpected admin account(s): ${unexpectedAdmins.map((a) => a.email).join(", ")}`);
    }

    const { count: pendingVerifications } = await supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if ((pendingVerifications || 0) > 50) issues.push(`INFO: ${pendingVerifications} pending verification requests need review`);

    const { data: payments } = await supabase
      .from("verification_requests")
      .select("payment_reference")
      .eq("payment_status", "completed")
      .gte("created_at", oneDayAgo);
    if (payments) {
      const refCount: Record<string, number> = {};
      for (const p of payments) if (p.payment_reference) refCount[p.payment_reference] = (refCount[p.payment_reference] || 0) + 1;
      const duplicates = Object.entries(refCount).filter(([, c]) => c > 1);
      if (duplicates.length > 0) issues.push(`CRITICAL: duplicate payment reference(s) detected`);
    }

    const severity = issues.some((i) => i.startsWith("CRITICAL")) ? "critical" : issues.some((i) => i.startsWith("WARNING")) ? "high" : "info";
    await auditLog(supabase, {
      event_type: "automated_security_scan",
      severity,
      details: { issues_found: issues.length, issues, scanned_at: now.toISOString() },
    });

    if (issues.length > 0) {
      const criticalIssues = issues.filter((i) => i.startsWith("CRITICAL"));
      const alertLevel = criticalIssues.length > 0 ? "CRITICAL" : "WARNING";
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Security Monitor <security@voicetoaction.io>",
          to: OWNER_EMAIL,
          subject: `${alertLevel} — Security Scan — ${issues.length} issue(s)`,
          html: `<p>${issues.join("<br>")}</p>`,
        }),
      }).catch((e) => console.error("[SecurityScan] Alert email failed:", e));
    }

    return new Response(
      JSON.stringify({ success: true, issues_found: issues.length, issues, scanned_at: now.toISOString() }),
      { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[SecurityScan] Fatal error:", err);
    return new Response(JSON.stringify({ error: "Scanner error" }), { status: 500 });
  }
});

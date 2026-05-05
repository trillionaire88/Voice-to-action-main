import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SECURITY_HEADERS, getAuthenticatedUser, auditLog, secureErrorResponse,
} from "../_shared/securityMiddleware.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { user, error: authError } = await getAuthenticatedUser(req, supabase);
  if (authError) return secureErrorResponse(401, authError);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "owner_admin"].includes(profile?.role)) return secureErrorResponse(403, "Forbidden");

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "full_scan") {
    const threats: any[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86_400_000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 3_600_000).toISOString();

    const { data: failedAuths } = await supabase
      .from("security_audit_log")
      .select("ip_address, user_id")
      .eq("event_type", "auth_failed")
      .gte("created_at", oneHourAgo);

    if (failedAuths) {
      const ipCounts: Record<string, number> = {};
      for (const log of failedAuths) if (log.ip_address) ipCounts[log.ip_address] = (ipCounts[log.ip_address] || 0) + 1;
      for (const [ip, count] of Object.entries(ipCounts)) {
        if (count >= 10) {
          threats.push({ type: "brute_force", ip, count, severity: count >= 30 ? "critical" : "high" });
          await supabase.from("threat_intelligence").upsert({
            ip_address: ip,
            threat_type: "brute_force",
            confidence: Math.min(100, count * 3),
            blocked: count >= 20,
            blocked_until: count >= 20 ? new Date(now.getTime() + 86_400_000).toISOString() : null,
            evidence: { failed_count: count, window: "1_hour" },
            updated_at: now.toISOString(),
          }, { onConflict: "ip_address" });
        }
      }
    }

    const { data: userLookups } = await supabase
      .from("security_audit_log")
      .select("ip_address, details")
      .eq("event_type", "user_lookup")
      .gte("created_at", oneHourAgo);

    if (userLookups) {
      const ipEmailCounts: Record<string, Set<string>> = {};
      for (const log of userLookups) {
        const ip = log.ip_address;
        if (!ip) continue;
        if (!ipEmailCounts[ip]) ipEmailCounts[ip] = new Set();
        if (log.details?.email) ipEmailCounts[ip].add(log.details.email);
      }
      for (const [ip, emails] of Object.entries(ipEmailCounts)) {
        if (emails.size >= 10) threats.push({ type: "account_enumeration", ip, count: emails.size, severity: "high" });
      }
    }

    const { data: roleChanges } = await supabase
      .from("security_audit_log")
      .select("user_id, details, created_at")
      .eq("event_type", "role_change")
      .gte("created_at", oneDayAgo);
    if (roleChanges) {
      for (const change of roleChanges) {
        if (!change.details?.changed_by_admin) {
          threats.push({ type: "privilege_escalation", user_id: change.user_id, severity: "critical" });
          await auditLog(supabase, {
            event_type: "privilege_escalation_detected",
            severity: "critical",
            user_id: change.user_id,
            details: { role_change: change.details },
          });
        }
      }
    }

    const { data: massAccess } = await supabase
      .from("security_audit_log")
      .select("user_id, details")
      .eq("event_type", "bulk_data_access")
      .gte("created_at", oneHourAgo);
    if (massAccess) {
      const userAccessCounts: Record<string, number> = {};
      for (const log of massAccess) if (log.user_id) userAccessCounts[log.user_id] = (userAccessCounts[log.user_id] || 0) + (log.details?.record_count || 1);
      for (const [uid, count] of Object.entries(userAccessCounts)) {
        if (count >= 500) threats.push({ type: "data_exfiltration", user_id: uid, count, severity: "critical" });
      }
    }

    const tenMinAgo = new Date(now.getTime() - 600_000).toISOString();
    const { data: recentLogins } = await supabase
      .from("security_audit_log")
      .select("user_id, ip_address")
      .eq("event_type", "auth_success")
      .gte("created_at", tenMinAgo);
    if (recentLogins) {
      const userIPs: Record<string, Set<string>> = {};
      for (const log of recentLogins) {
        if (!log.user_id || !log.ip_address) continue;
        if (!userIPs[log.user_id]) userIPs[log.user_id] = new Set();
        userIPs[log.user_id].add(log.ip_address);
      }
      for (const [uid, ips] of Object.entries(userIPs)) {
        if (ips.size >= 3) threats.push({ type: "impossible_travel", user_id: uid, ip_count: ips.size, severity: "high" });
      }
    }

    const criticalThreats = threats.filter((t) => t.severity === "critical");
    if (criticalThreats.length > 0) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Security Alert <security@voicetoaction.io>",
          to: "jeremywhisson@gmail.com",
          subject: `CRITICAL SECURITY ALERT — ${criticalThreats.length} threat(s) detected`,
          html: `<p>${criticalThreats.length} critical threat(s) detected. Check admin panel immediately.</p>`,
        }),
      }).catch((e) => console.error("[ThreatDetection] Alert email failed:", e));
    }

    return new Response(
      JSON.stringify({ threats_found: threats.length, critical: criticalThreats.length, threats }),
      { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (action === "block_ip") {
    const { ip, duration_hours = 24 } = body;
    if (!ip) return secureErrorResponse(400, "ip required");
    await supabase.from("threat_intelligence").upsert({
      ip_address: ip,
      threat_type: "manual_block",
      confidence: 100,
      blocked: true,
      blocked_until: new Date(Date.now() + duration_hours * 3_600_000).toISOString(),
      evidence: { blocked_by: user.id },
      updated_at: new Date().toISOString(),
    }, { onConflict: "ip_address" });

    await auditLog(supabase, {
      user_id: user.id, event_type: "ip_blocked", severity: "warning", details: { ip, duration_hours },
    });
    return new Response(JSON.stringify({ success: true }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  }

  return secureErrorResponse(400, "Unknown action");
});

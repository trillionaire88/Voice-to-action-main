import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeResponse } from "../_shared/timingProtection.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";
import { siteUrl } from "../_shared/siteUrl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimit(ip, "detect-suspicious-login", 10, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const t0 = Date.now();
  const done = async (r: Response) => {
    await constantTimeResponse(t0, 300);
    return r;
  };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return await done(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return await done(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      );
    }

    const body = await req.json().catch(() => ({}));
    const { device_fingerprint, device_label, ip_address, country_code, city } = body;
    const incomingCountry = req.headers.get("cf-ipcountry") || country_code || null;

    if (!device_fingerprint || typeof device_fingerprint !== "string") {
      return await done(
        new Response(JSON.stringify({ error: "device_fingerprint required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      );
    }

    const reasons: string[] = [];
    let severity = "low";

    const { data: knownDevice } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", user.id)
      .eq("device_fingerprint", device_fingerprint)
      .maybeSingle();

    if (!knownDevice) {
      const { data: allDevices } = await supabase
        .from("user_devices")
        .select("country_code, last_seen_at")
        .eq("user_id", user.id)
        .order("last_seen_at", { ascending: false })
        .limit(5);

      reasons.push("new_device");
      severity = "medium";

      if (allDevices && allDevices.length > 0) {
        const lastDevice = allDevices[0];
        const lastSeenAgo = Date.now() - new Date(lastDevice.last_seen_at).getTime();
        const twoHours = 2 * 60 * 60 * 1000;

        const knownCountries = Array.from(new Set((allDevices || []).map((d) => d.country_code).filter(Boolean)));
        const isNewCountry = !!incomingCountry && !knownCountries.includes(incomingCountry);
        if (lastDevice.country_code && incomingCountry && lastDevice.country_code !== incomingCountry && lastSeenAgo < twoHours) {
          reasons.push("impossible_travel");
          severity = "critical";
        } else if (isNewCountry) {
          reasons.push("new_country");
          const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
          const tz = profile?.timezone || "Australia/Sydney";
          const h = Number(new Intl.DateTimeFormat("en-AU", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
          if (h < 6 || h > 23) {
            reasons.push("off_hours_new_country");
            severity = "high";
          } else {
            severity = "medium";
          }
        }
      }

      await supabase.from("user_devices").insert({
        user_id: user.id,
        device_fingerprint,
        device_label: device_label || "Unknown device",
        ip_address,
        country_code: incomingCountry,
        city,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("user_devices")
        .update({ last_seen_at: new Date().toISOString(), ip_address })
        .eq("id", knownDevice.id);

      if (knownDevice.is_blocked) {
        return await done(
          new Response(
            JSON.stringify({
              suspicious: true,
              blocked: true,
              reasons: ["blocked_device"],
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          ),
        );
      }
    }

    if (reasons.length > 0 && severity !== "low") {
      const emailAlert = severity === "critical" || severity === "high";
      await supabase.from("suspicious_logins").insert({
        user_id: user.id,
        ip_address,
        country_code,
        device_fingerprint,
        reason: reasons.join(", "),
        severity,
        was_notified: emailAlert,
        action_taken: emailAlert ? "email_alert" : "none",
      });

      if (emailAlert) {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const supportEmail = Deno.env.get("SUPPORT_EMAIL") ?? "support@voicetoaction.io";
        const ownerInbox =
          Deno.env.get("OWNER_NOTIFY_EMAIL")?.trim() || supportEmail;
        const alertBody =
          severity === "critical"
            ? `🚨 CRITICAL SECURITY ALERT\n\nA login to your Voice to Action account was detected from a new device AND a different country within 2 hours of your last login. This may indicate your account has been compromised.\n\nDevice: ${device_label || "Unknown"}\nLocation: ${city || "Unknown"}, ${country_code || "Unknown"}\nIP: ${ip_address || "Unknown"}\nTime: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}\n\nIf this was not you, immediately:\n1. Open Security Settings: ${siteUrl("/SecuritySettings")}\n2. Sign out of all devices\n3. Change your password\n4. Contact support at ${supportEmail}`
            : `New login to your Voice to Action account\n\nTime: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}\nCountry: ${incomingCountry || "Unknown"}\nDevice: ${device_label || "Unknown"}\nIP: ${ip_address || "Unknown"}\n\nIf this was not you, go to Security Settings and revoke all sessions immediately:\n${siteUrl("/SecuritySettings")}`;

        if (resendKey && user.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Voice to Action Security <noreply@voicetoaction.io>",
              to: user.email,
              subject:
                severity === "critical"
                  ? "🚨 CRITICAL: Suspicious login detected on your account"
                  : "⚠️ New sign-in to your Voice to Action account",
              text: alertBody,
            }),
          }).catch(() => {});

          if (severity === "critical") {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Voice to Action Security <noreply@voicetoaction.io>",
                to: ownerInbox,
                subject: `[SECURITY] Impossible travel detected — ${user.email}`,
                text: `Impossible travel detected for user ${user.email} (${user.id})\n\nCountries: ${country_code}\nDevice: ${device_fingerprint}\nIP: ${ip_address}\nTime: ${new Date().toISOString()}`,
              }),
            }).catch(() => {});
          }
        }
      }
    }

    const failedAttempts = await supabase
      .from("brute_force_log")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip_address || "unknown")
      .gte("attempted_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((failedAttempts.count || 0) >= 5) {
      await supabase.from("account_suspensions").insert({
        user_id: user.id,
        reason: "brute_force_detected",
        suspended_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        is_active: true,
      }).catch(() => {});
    }

    return await done(
      new Response(
        JSON.stringify({
          suspicious: reasons.length > 0,
          severity,
          reasons,
          is_new_device: !knownDevice,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    );
  } catch (err) {
    console.error("[detect-suspicious-login]", err);
    return await done(
      new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    );
  }
});

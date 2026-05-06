import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getClientIP } from "../_shared/securityMiddleware.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ELEVATED_RISK_COUNTRIES = new Set(["CN", "RU", "KP", "IR", "BY", "SY"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const { action, ip_address: bodyIp, endpoint, country_code } = body as Record<string, string | undefined>;
  const ip_address = (bodyIp && String(bodyIp).trim()) || getClientIP(req);

  if (action === "check_ip") {
    if (!ip_address || ip_address === "unknown") {
      return new Response(JSON.stringify({ allowed: true, risk_score: 0 }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: rep } = await supabase
      .from("ip_reputation")
      .select("*")
      .eq("ip_address", ip_address)
      .maybeSingle();

    if (rep?.is_blocked) {
      return new Response(
        JSON.stringify({ allowed: false, reason: rep.block_reason || "IP blocked" }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("brute_force_log")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip_address)
      .gte("attempted_at", windowStart);

    if ((recentAttempts ?? 0) >= 100) {
      await supabase.from("ip_reputation").upsert(
        {
          ip_address,
          is_blocked: true,
          block_reason: "Distributed brute force: 100+ attempts in 60 minutes",
          risk_score: 100,
          blocked_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "ip_address" },
      );

      return new Response(
        JSON.stringify({ allowed: false, reason: "Too many requests from this IP" }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    let riskScore = rep?.risk_score ?? 0;
    const cc = country_code || rep?.country_code;
    if (cc && ELEVATED_RISK_COUNTRIES.has(cc)) riskScore = Math.max(riskScore, 30);
    if (rep?.is_tor) riskScore = Math.max(riskScore, 60);
    if (rep?.is_datacenter) riskScore = Math.max(riskScore, 40);
    if ((rep?.honeypot_hits ?? 0) > 0) {
      riskScore = Math.min(100, riskScore + (rep!.honeypot_hits as number) * 20);
    }
    if ((rep?.failed_auth ?? 0) > 10) riskScore = Math.min(100, riskScore + 20);

    await supabase.from("ip_reputation").upsert(
      {
        ip_address,
        risk_score: riskScore,
        country_code: country_code || rep?.country_code,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "ip_address" },
    );

    return new Response(
      JSON.stringify({
        allowed: true,
        risk_score: riskScore,
        high_risk: riskScore >= 70,
        country_code: cc,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  if (action === "record_attempt") {
    if (!ip_address || ip_address === "unknown") {
      return new Response(JSON.stringify({ recorded: false }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    await supabase.from("brute_force_log").insert({
      ip_address,
      endpoint: endpoint || "unknown",
      attempted_at: new Date().toISOString(),
    });

    const { data: existing } = await supabase
      .from("ip_reputation")
      .select("id, failed_auth")
      .eq("ip_address", ip_address)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ip_reputation")
        .update({
          failed_auth: (existing.failed_auth || 0) + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq("ip_address", ip_address);
    } else {
      await supabase.from("ip_reputation").insert({
        ip_address,
        failed_auth: 1,
        country_code: country_code ?? null,
        last_seen_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ recorded: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (action === "honeypot_hit") {
    const ua = req.headers.get("user-agent") || "";
    await supabase.from("honeypot_triggers").insert({
      ip_address: ip_address || null,
      user_agent: ua,
      form_type: endpoint || "unknown",
      triggered_at: new Date().toISOString(),
    });

    if (!ip_address || ip_address === "unknown") {
      return new Response(JSON.stringify({ recorded: true, blocked: false }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("ip_reputation")
      .select("id, honeypot_hits, risk_score")
      .eq("ip_address", ip_address)
      .maybeSingle();

    const newHits = (existing?.honeypot_hits ?? 0) + 1;
    const newScore = Math.min(100, (existing?.risk_score ?? 0) + 25);
    const shouldBlock = newHits >= 3;

    await supabase.from("ip_reputation").upsert(
      {
        ip_address,
        honeypot_hits: newHits,
        risk_score: newScore,
        is_blocked: shouldBlock,
        block_reason: shouldBlock ? "Repeated honeypot triggers — confirmed bot" : null,
        blocked_at: shouldBlock ? new Date().toISOString() : null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "ip_address" },
    );

    return new Response(JSON.stringify({ recorded: true, blocked: shouldBlock }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});

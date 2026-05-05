import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";
import { siteOrigin } from "../_shared/siteUrl.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": siteOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ipAddr = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimit(ipAddr, "session-manager", 30, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const { action } = body as {
    action?: string;
    device_label?: string;
    device_fingerprint?: string;
    country_code?: string;
    city?: string;
    session_id?: string;
  };
  const tokenHash = await sha256hex(token);
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (action === "register") {
    const { device_label, device_fingerprint, country_code, city } = body;

    await supabase.from("active_sessions").upsert(
      {
        user_id: user.id,
        session_token: tokenHash,
        device_label: device_label || "Unknown device",
        device_fingerprint,
        ip_address: ip,
        country_code,
        city,
        is_current: true,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: false,
        revoked_at: null,
        revoke_reason: null,
      },
      { onConflict: "session_token" },
    );

    await supabase
      .from("active_sessions")
      .update({ is_current: false })
      .eq("user_id", user.id)
      .neq("session_token", tokenHash);

    await supabase
      .from("active_sessions")
      .update({ is_current: true, last_active_at: new Date().toISOString() })
      .eq("session_token", tokenHash);

    return jsonResponse({ registered: true });
  }

  if (action === "list") {
    const { data: sessions } = await supabase
      .from("active_sessions")
      .select(
        "id, device_label, ip_address, country_code, city, last_active_at, created_at, is_current, session_token",
      )
      .eq("user_id", user.id)
      .eq("revoked", false)
      .order("last_active_at", { ascending: false });

    const sessionsWithCurrent = (sessions || []).map((s) => {
      const { session_token: st, ...rest } = s as Record<string, unknown>;
      return {
        ...rest,
        is_current: st === tokenHash,
      };
    });

    return jsonResponse({ sessions: sessionsWithCurrent });
  }

  if (action === "revoke") {
    const session_id = body.session_id as string | undefined;
    if (!session_id) return jsonResponse({ error: "session_id required" }, 400);

    const { data: target } = await supabase
      .from("active_sessions")
      .select("user_id, session_token")
      .eq("id", session_id)
      .single();

    if (!target || target.user_id !== user.id) {
      return jsonResponse({ error: "Session not found" }, 404);
    }

    if (target.session_token === tokenHash) {
      return jsonResponse(
        { error: "Cannot revoke your current session. Sign out instead." },
        400,
      );
    }

    await supabase
      .from("active_sessions")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoke_reason: "user_logout",
      })
      .eq("id", session_id);

    return jsonResponse({ success: true });
  }

  if (action === "revoke_all") {
    await supabase
      .from("active_sessions")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoke_reason: "user_logout",
      })
      .eq("user_id", user.id)
      .eq("revoked", false)
      .neq("session_token", tokenHash);

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
});

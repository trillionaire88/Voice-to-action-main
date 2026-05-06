import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FROM_SECURITY } from "../_shared/email.ts";
import { siteOrigin } from "../_shared/siteUrl.ts";

function cors(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": siteOrigin(),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  const panicOwnerEmail = Deno.env.get("OWNER_PANIC_EMAIL")?.trim();
  if (!panicOwnerEmail) {
    return new Response(JSON.stringify({ error: "Panic mode not configured" }), {
      status: 503,
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const canPanic = profile?.role === "owner_admin" || user.email === panicOwnerEmail;
  if (!canPanic) {
    return new Response(JSON.stringify({ error: "Owner only" }), {
      status: 403,
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const { action, reason } = body as { action?: string; reason?: string };

  if (action === "activate") {
    await supabase
      .from("platform_status")
      .update({
        panic_mode: true,
        panic_reason: reason || "Manual activation by owner",
        panic_activated_at: new Date().toISOString(),
        panic_activated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_SECURITY,
          to: panicOwnerEmail,
          subject: "🚨 PANIC MODE ACTIVATED — Voice to Action",
          text: `PANIC MODE has been activated on Voice to Action.\n\nReason: ${reason || "Manual"}\nTime: ${new Date().toISOString()}\nActivated by: ${user.email}\n\nAll write operations are now blocked. Only read access is available.\n\nTo deactivate, call this endpoint with action: "deactivate".`,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, status: "panic_mode_active" }), {
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  if (action === "deactivate") {
    await supabase
      .from("platform_status")
      .update({
        panic_mode: false,
        panic_reason: null,
        panic_activated_at: null,
        panic_activated_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return new Response(JSON.stringify({ success: true, status: "normal" }), {
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  if (action === "status") {
    const { data } = await supabase.from("platform_status").select("*").eq("id", 1).single();
    return new Response(JSON.stringify(data), {
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...cors(), "Content-Type": "application/json" },
  });
});

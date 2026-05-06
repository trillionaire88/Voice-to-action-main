import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, sanitiseInput, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";

function isCommunityOwnerRole(role: string | null | undefined) {
  return role === "owner" || role === "founder";
}

function communityOwnerId(row: { founder_user_id?: string | null; community_owner?: string | null }) {
  return row.founder_user_id || row.community_owner || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const gateResponse = await runSecurityGate(req, supabase, {
      endpointName: "community-cancel",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return gateResponse;

    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabase, `community-cancel:${ip}`, "api-write");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const rawBody = await req.json().catch(() => ({}));
    const body = sanitiseInput(rawBody) as Record<string, unknown>;
    const community_id = String(body.community_id ?? "").trim();

    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !isCommunityOwnerRole(membership.role)) {
      return new Response(JSON.stringify({ error: "Only the community owner can cancel" }), { status: 403, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const { data: community } = await supabase
      .from("communities")
      .select("stripe_subscription_id, plan, name, founder_user_id, community_owner")
      .eq("id", community_id)
      .single();

    if (!community?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    await stripe.subscriptions.update(community.stripe_subscription_id, { cancel_at_period_end: true });

    await supabase.from("communities").update({ plan_status: "cancelled" }).eq("id", community_id);

    await supabase.from("community_subscription_log").insert({
      community_id,
      owner_id: communityOwnerId(community) || user.id,
      event_type: "cancelled",
      plan: community.plan ?? "paid",
      amount: 0,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Subscription cancelled. Your community will remain on the current plan until the end of the billing period, then automatically downgrade to Free.",
    }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[community-cancel]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, sanitiseInput, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";
import {
  COMMUNITY_SUBSCRIPTION_PRICE_AUD,
  COMMUNITY_SUBSCRIPTION_UNIT_AMOUNT_CENTS,
} from "../_shared/communitySubscriptionPricing.ts";

function isCommunityOwnerRole(role: string | null | undefined) {
  return role === "owner" || role === "founder";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const gateResponse = await runSecurityGate(req, supabase, {
      endpointName: "community-subscribe",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return gateResponse;

    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabase, `community-subscribe:${ip}`, "api-write");
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
    const community_id = String(body.community_id || "");
    const plan = String(body.plan || "");
    const success_url = String(body.success_url || "");
    const cancel_url = String(body.cancel_url || "");

    if (!community_id || !plan || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    if (!["paid", "private"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !isCommunityOwnerRole(membership.role)) {
      return new Response(JSON.stringify({ error: "Only the community owner can manage subscriptions" }), { status: 403, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const { data: community } = await supabase
      .from("communities")
      .select("name, stripe_subscription_id, plan")
      .eq("id", community_id)
      .single();

    const effectivePlan = community?.plan ?? "free";
    if (community?.stripe_subscription_id && effectivePlan !== "free") {
      return new Response(JSON.stringify({ error: "Community already has an active subscription" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const planLabel = plan === "private" ? "Private Community" : "Paid Community";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      currency: "aud",
      line_items: [{
        price_data: {
          currency: "aud",
          product_data: {
            name: `Voice to Action — ${planLabel} Plan`,
            description: `${planLabel} plan for ${community?.name || "your community"}. $${COMMUNITY_SUBSCRIPTION_PRICE_AUD.toFixed(2)} AUD/month. Cancel anytime.`,
          },
          unit_amount: COMMUNITY_SUBSCRIPTION_UNIT_AMOUNT_CENTS,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      success_url,
      cancel_url,
      metadata: {
        user_id: user.id,
        community_id,
        plan,
        payment_type: "community_subscription",
      },
    });

    return new Response(JSON.stringify({ checkout_url: session.url }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[community-subscribe]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  }
});

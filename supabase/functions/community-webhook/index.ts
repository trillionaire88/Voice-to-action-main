import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";

function subscriptionIdFromSession(session: Stripe.Checkout.Session): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return (sub as Stripe.Subscription).id;
  return null;
}

function communityOwnerId(row: { founder_user_id?: string | null; community_owner?: string | null }) {
  return row.founder_user_id || row.community_owner || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const gateResponse = await runSecurityGate(req, supabase, {
    endpointName: "community-webhook",
    requireAuth: false,
    blockBots: false,
    checkIPBlock: true,
  });
  if (gateResponse) return gateResponse;

  const ip = getClientIP(req);
  const { allowed, retryAfter } = await checkRateLimit(supabase, `community-webhook:${ip}`, "api-write");
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
  const whSecret = Deno.env.get("STRIPE_COMMUNITY_WEBHOOK_SECRET");
  if (!whSecret) {
    console.error("[community-webhook] STRIPE_COMMUNITY_WEBHOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: SECURITY_HEADERS });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, whSecret);
  } catch (err) {
    console.error("[community-webhook] Signature failed:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: SECURITY_HEADERS });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const community_id = session.metadata?.community_id;
    const plan = session.metadata?.plan;
    const user_id = session.metadata?.user_id;

    if (session.metadata?.payment_type === "community_subscription" && community_id && plan && user_id) {
      let inviteCode: string | null = null;
      if (plan === "private") {
        const { data: code, error: rpcErr } = await supabase.rpc("generate_invite_code");
        if (rpcErr) console.error("[community-webhook] invite code rpc:", rpcErr.message);
        inviteCode = typeof code === "string" ? code : null;
      }

      const subId = subscriptionIdFromSession(session);
      const cust = session.customer;
      const customerId = typeof cust === "string" ? cust : cust?.id ?? null;

      await supabase.from("communities").update({
        plan,
        plan_status: "active",
        stripe_subscription_id: subId,
        stripe_customer_id: customerId,
        subscription_started_at: new Date().toISOString(),
        is_hidden: plan === "private",
        verified_badge: plan === "paid" || plan === "private",
        priority_search: plan === "paid" || plan === "private",
        invite_code: inviteCode,
        verified_community: true,
        community_verified: true,
      }).eq("id", community_id);

      await supabase.from("community_subscription_log").insert({
        community_id,
        owner_id: user_id,
        event_type: "subscribed",
        plan,
        amount: 10.99,
        stripe_event_id: event.id,
      });

      console.log(`[community-webhook] Community ${community_id} upgraded to ${plan}`);
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

    if (subscriptionId) {
      const { data: community } = await supabase
        .from("communities")
        .select("id, plan, founder_user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      if (community) {
        const ownerId = communityOwnerId(community);
        const aud = Number(invoice.amount_paid ?? 0) / 100;
        if (ownerId) {
          await supabase.from("community_subscription_log").insert({
            community_id: community.id,
            owner_id: ownerId,
            event_type: "renewed",
            plan: community.plan ?? "paid",
            amount: aud > 0 ? aud : 10.99,
            stripe_event_id: event.id,
          });
        }
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    const { data: community } = await supabase
      .from("communities")
      .select("id, plan, name")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (community) {
      const wasPrivate = community.plan === "private";

      await supabase.from("communities").update({
        plan: "free",
        plan_status: wasPrivate ? "paused" : "active",
        stripe_subscription_id: null,
        stripe_customer_id: null,
        verified_badge: false,
        priority_search: false,
        is_hidden: wasPrivate,
        invite_code: null,
        verified_community: false,
        community_verified: false,
      }).eq("id", community.id);

      console.log(`[community-webhook] Community ${community.id} downgraded to free${wasPrivate ? " (paused)" : ""}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
});

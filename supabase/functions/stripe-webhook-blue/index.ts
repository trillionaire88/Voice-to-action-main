import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const gateResponse = await runSecurityGate(req, supabase, {
    endpointName: "stripe-webhook-blue",
    requireAuth: false,
    blockBots: false,
    checkIPBlock: true,
  });
  if (gateResponse) return gateResponse;
  const ip = getClientIP(req);
  const { allowed, retryAfter } = await checkRateLimit(supabase, `stripe-webhook-blue:${ip}`, "api-write");
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

  let event: Stripe.Event;
  try {
    const webhookSecret =
      Deno.env.get("STRIPE_WEBHOOK_SECRET_BLUE") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[stripe-webhook-blue] No STRIPE_WEBHOOK_SECRET_BLUE or STRIPE_WEBHOOK_SECRET");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
      });
    }
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook-blue] Signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const paymentType = session.metadata?.payment_type;

    if (paymentType === "identity_verification" && userId) {
      await supabase.from("verification_requests").update({
        payment_status: "completed",
        payment_reference: session.id,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("stripe_session_id", session.id);

      console.log(`[stripe-webhook-blue] Payment confirmed for user ${userId}`);
    }
  }

  if (event.type === "identity.verification_session.verified") {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const userId = session.metadata?.user_id;

    if (userId) {
      await supabase.from("profiles").update({
        is_blue_verified: true,
        is_kyc_verified: true,
        paid_identity_verification_completed: true,
        identity_verified_at: new Date().toISOString(),
      }).eq("id", userId);

      await supabase.from("verification_requests").update({
        status: "approved",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("verification_type", "identity");

      console.log(`[stripe-webhook-blue] WEBHOOK: Blue checkmark granted for user ${userId}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
});

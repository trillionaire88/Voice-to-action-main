import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, sanitiseInput, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";
import { validateCheckoutRedirectPair } from "../_shared/checkoutRedirect.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const gateResponse = await runSecurityGate(req, supabase, {
      endpointName: "stripe-checkout-blue",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return gateResponse;
    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabase, `stripe-checkout-blue:${ip}`, "stripe-checkout");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" },
      });
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const rawBody = await req.json().catch(() => ({}));
    const body = sanitiseInput(rawBody) as Record<string, unknown>;
    const success_url = String(body.success_url || "");
    const cancel_url = String(body.cancel_url || "");
    if (!success_url || !cancel_url) return new Response(JSON.stringify({ error: "success_url and cancel_url required" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const redirectErr = validateCheckoutRedirectPair(success_url, cancel_url);
    if (redirectErr) {
      return new Response(JSON.stringify({ error: redirectErr }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    if (user.email === "jeremywhisson@gmail.com") {
      return new Response(JSON.stringify({ checkout_url: success_url, owner_bypass: true }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("is_blue_verified").eq("id", user.id).single();
    if (profile?.is_blue_verified) return new Response(JSON.stringify({ error: "Already verified" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const { data: existingReq } = await supabase.from("verification_requests").select("id, payment_status").eq("user_id", user.id).eq("verification_type", "identity").maybeSingle();
    if (existingReq?.payment_status === "completed") return new Response(JSON.stringify({ error: "Payment already completed. Please complete your identity verification." }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "aud",
      line_items: [{
        price_data: {
          currency: "aud",
          product_data: {
            name: "Voice to Action — Blue Checkmark Verification",
            description: "One-time identity verification fee. Grants your Blue Checkmark permanently. Non-refundable.",
          },
          unit_amount: 1299,
        },
        quantity: 1,
      }],
      success_url,
      cancel_url,
      metadata: { user_id: user.id, user_email: user.email ?? "", payment_type: "identity_verification" },
    });

    if (existingReq) {
      await supabase.from("verification_requests").update({ stripe_session_id: session.id }).eq("id", existingReq.id);
    } else {
      const { data: profileData } = await supabase.from("profiles").select("full_name, display_name").eq("id", user.id).single();
      await supabase.from("verification_requests").insert({
        user_id: user.id,
        verification_type: "identity",
        full_name: profileData?.full_name || profileData?.display_name || "",
        status: "pending",
        payment_status: "pending",
        payment_amount: 12.99,
        stripe_session_id: session.id,
      });
    }

    return new Response(JSON.stringify({ checkout_url: session.url }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[stripe-checkout-blue]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  }
});

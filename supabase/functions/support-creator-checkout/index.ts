/**
 * DEPRECATED: creator_subscription, owner_gift, and platform_donation are handled by the main
 * `stripe-checkout` Edge Function. Frontend uses `initiateStripeCheckout` / paymentsApi.
 * Remove this function from Supabase after confirming no legacy callers.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { validateCheckoutRedirectPair } from "../_shared/checkoutRedirect.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, payment_type, success_url, cancel_url } = await req.json();
    if (!success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "success_url and cancel_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectErr = validateCheckoutRedirectPair(String(success_url), String(cancel_url));
    if (redirectErr) {
      return new Response(JSON.stringify({ error: redirectErr }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isGift = payment_type === "owner_gift";
    const isPlatform = payment_type === "platform_donation";
    const isCreatorSub = payment_type === "creator_subscription";

    if (!isGift && !isPlatform && !isCreatorSub) {
      return new Response(JSON.stringify({ error: "Invalid payment_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let amountCents: number;
    if (isCreatorSub) {
      amountCents = 2000;
    } else {
      amountCents = amount ? Math.round(amount * 100) : 2500;
      if (amountCents < 100 || amountCents > 1000000) {
        return new Response(JSON.stringify({ error: "Amount must be between $1.00 and $10,000.00 AUD" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const metaType = isCreatorSub ? "creator_subscription" : isGift ? "owner_gift" : "platform_donation";
    const productName = isCreatorSub
      ? "Creator Referral Program — Voice to Action"
      : isGift
        ? "Voluntary Gift - Voice to Action Creator"
        : "Platform Support Donation - Voice to Action";
    const productDescription = isCreatorSub
      ? "$20 AUD per month. Access to the creator referral program, referral code, and commissions per program terms. Non-refundable."
      : isGift
        ? "This is a voluntary personal gift to the creator of Voice to Action. No goods, services, or platform benefits are provided in exchange. Non-refundable."
        : "Voluntary donation to support the Voice to Action platform. Non-refundable.";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "aud",
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
      metadata: {
        user_id: user.id,
        user_email: user.email ?? "",
        payment_type: metaType,
        amount_aud: (amountCents / 100).toFixed(2),
      },
    });

    return new Response(JSON.stringify({ checkout_url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[support-creator-checkout]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

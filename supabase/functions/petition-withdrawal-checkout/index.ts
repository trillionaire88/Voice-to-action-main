import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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

    const { petition_id, success_url, cancel_url } = await req.json();
    if (!petition_id || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "petition_id, success_url and cancel_url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: petition } = await supabase
      .from("petitions")
      .select("id, title, allow_public_withdrawal, creator_user_id")
      .eq("id", petition_id)
      .single();

    if (!petition) {
      return new Response(JSON.stringify({ error: "Petition not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCreator = petition.creator_user_id === user.id;
    const isPublicAllowed = petition.allow_public_withdrawal === true;
    if (!isCreator && !isPublicAllowed) {
      return new Response(JSON.stringify({ error: "Withdrawal not enabled for this petition" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("petition_withdrawals")
      .select("id")
      .eq("petition_id", petition_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ already_paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user.email === "jeremywhisson@gmail.com") {
      return new Response(JSON.stringify({ checkout_url: success_url, owner_bypass: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
              name: "Petition Withdrawal - Voice to Action",
              description: `Petition data export and PDF summary for: "${petition.title}". Emailed to you after payment. Non-refundable.`,
            },
            unit_amount: 199,
          },
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
      metadata: {
        user_id: user.id,
        user_email: user.email ?? "",
        petition_id,
        petition_title: petition.title.substring(0, 100),
        payment_type: "petition_withdrawal",
      },
    });

    return new Response(JSON.stringify({ checkout_url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[petition-withdrawal-checkout]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

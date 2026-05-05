import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, sanitiseInput, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const gateResponse = await runSecurityGate(req, supabase, {
      endpointName: "stripe-identity-start",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return gateResponse;
    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabase, `stripe-identity-start:${ip}`, "stripe-identity");
    if (!allowed) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const { data: verReq } = await supabase.from("verification_requests").select("id, payment_status").eq("user_id", user.id).eq("verification_type", "identity").maybeSingle();
    if (!verReq || verReq.payment_status !== "completed") {
      return new Response(JSON.stringify({ error: "Payment must be completed before starting identity verification." }), { status: 403, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    const rawBody = await req.json().catch(() => ({}));
    const body = sanitiseInput(rawBody) as Record<string, unknown>;
    const return_url = String(body.return_url || "");
    if (!return_url) return new Response(JSON.stringify({ error: "return_url required" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { user_id: user.id, user_email: user.email ?? "" },
      options: {
        document: {
          allowed_types: ["driving_license", "passport", "id_card"],
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url,
    });

    await supabase.from("verification_requests").update({ stripe_identity_session_id: verificationSession.id }).eq("id", verReq.id);
    await supabase.from("profiles").update({ stripe_identity_session_id: verificationSession.id }).eq("id", user.id);

    return new Response(JSON.stringify({ verification_url: verificationSession.url }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[stripe-identity-start]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  }
});

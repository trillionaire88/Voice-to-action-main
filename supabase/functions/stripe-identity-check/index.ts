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
      endpointName: "stripe-identity-check",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return gateResponse;
    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabase, `stripe-identity-check:${ip}`, "stripe-identity");
    if (!allowed) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const rawBody = await req.json().catch(() => ({}));
    const body = sanitiseInput(rawBody) as Record<string, unknown>;
    const session_id = String(body.session_id || "");
    if (!session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const session = await stripe.identity.verificationSessions.retrieve(session_id);

    console.log(`[stripe-identity-check] session ${session_id} status: ${session.status} for user ${user.id}`);

    if (session.status === "verified") {
      await supabase.from("profiles").update({
        is_blue_verified: true,
        is_kyc_verified: true,
        paid_identity_verification_completed: true,
        identity_verified_at: new Date().toISOString(),
      }).eq("id", user.id);

      await supabase.from("verification_requests").update({
        status: "approved",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).eq("verification_type", "identity");

      console.log(`[stripe-identity-check] Blue checkmark GRANTED for user ${user.id}`);
      return new Response(JSON.stringify({ verified: true, status: "verified" }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ verified: false, status: session.status }), { headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[stripe-identity-check]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } });
  }
});

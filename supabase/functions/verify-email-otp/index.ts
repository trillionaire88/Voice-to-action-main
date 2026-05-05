import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, sanitiseInput, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";
import { constantTimeEqual, constantTimeResponse } from "../_shared/timingProtection.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: SECURITY_HEADERS });
  }

  const t0 = Date.now();
  const timed = async (r: Response) => {
    await constantTimeResponse(t0, 300);
    return r;
  };

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const gateResponse = await runSecurityGate(req, supabaseClient, {
      endpointName: "verify-email-otp",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return await timed(gateResponse);
    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabaseClient, `verify-email-otp:${ip}`, "otp-verify");
    if (!allowed) {
      return await timed(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" },
        }),
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return await timed(
        new Response(JSON.stringify({ error: "No auth header" }), {
          status: 401,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return await timed(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const body = sanitiseInput(rawBody) as Record<string, unknown>;
    const code = String(body.code || "");

    // Fetch stored OTP from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email_otp, email_otp_expires_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return await timed(
        new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
      );
    }

    if (!profile.email_otp) {
      return await timed(
        new Response(JSON.stringify({ error: "No verification code found. Please request a new one." }), {
          status: 400,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
      );
    }

    if (new Date(profile.email_otp_expires_at) < new Date()) {
      return await timed(
        new Response(JSON.stringify({ error: "Verification code has expired. Please request a new one." }), {
          status: 400,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
      );
    }

    const normOtp = (s: string) => s.replace(/\D/g, "").padStart(6, "0").slice(-6);
    const submitted = normOtp(String(code).trim());
    const stored = normOtp(String(profile.email_otp).trim());
    if (!constantTimeEqual(submitted, stored)) {
      return await timed(
        new Response(JSON.stringify({ error: "Incorrect code. Please try again." }), {
          status: 400,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
      );
    }

    // Mark email as verified and clear OTP
    await supabaseClient
      .from("profiles")
      .update({
        is_email_verified: true,
        email_otp: null,
        email_otp_expires_at: null,
      })
      .eq("id", user.id);

    return await timed(
      new Response(JSON.stringify({ success: true }), {
        headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
      }),
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return await timed(
      new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
      }),
    );
  }
});

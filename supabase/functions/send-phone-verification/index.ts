import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, sanitiseInput, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";
import { constantTimeResponse } from "../_shared/timingProtection.ts";

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
      endpointName: "send-phone-verification",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return await timed(gateResponse);
    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabaseClient, `send-phone-verification:${ip}`, "otp-send");
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
    const phone_number = String(body.phone_number || "");

    if (!phone_number || !String(phone_number).startsWith("+")) {
      return await timed(
        new Response(
          JSON.stringify({
            error: "Invalid phone number. Must include country code (e.g. +61412345678)",
          }),
          { status: 400, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } },
        ),
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP and phone number
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        phone_number: phone_number,
        phone_otp: otpCode,
        phone_otp_expires_at: expiresAt,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("DB update error:", updateError);
      return await timed(
        new Response(JSON.stringify({ error: "Failed to store OTP" }), {
          status: 500,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
      );
    }

    // Send SMS via Twilio
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioFrom!,
          To: phone_number,
          Body: `Your Voice to Action verification code is: ${otpCode}. It expires in 10 minutes. Do not share this code.`,
        }),
      }
    );

    if (!twilioResponse.ok) {
      const err = await twilioResponse.text();
      console.error("Twilio error:", err);
      return await timed(
        new Response(
          JSON.stringify({ error: "Failed to send SMS. Check your phone number and try again." }),
          { status: 500, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" } },
        ),
      );
    }

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runSecurityGate } from "../_shared/securityGate.ts";
import { checkRateLimit, getClientIP, SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";
import { constantTimeResponse } from "../_shared/timingProtection.ts";
import { FROM_NOREPLY } from "../_shared/email.ts";

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
      endpointName: "send-email-verification",
      requireAuth: true,
      blockBots: true,
      checkIPBlock: true,
    });
    if (gateResponse) return await timed(gateResponse);
    const ip = getClientIP(req);
    const { allowed, retryAfter } = await checkRateLimit(supabaseClient, `send-email-verification:${ip}`, "otp-send");
    if (!allowed) {
      return await timed(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter || 60), "Content-Type": "application/json" },
        }),
      );
    }

    // Get authenticated user from JWT
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

    // Generate a secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store the OTP in the profiles table
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        email_otp: otpCode,
        email_otp_expires_at: expiresAt,
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

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_NOREPLY,
        to: user.email,
        subject: "Your Email Verification Code — Voice to Action",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1e3a5f; margin-bottom: 8px;">Verify Your Email</h2>
            <p style="color: #555; margin-bottom: 24px;">Enter this code in the app to verify your email address. It expires in 10 minutes.</p>
            <div style="background: #f0f4ff; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #2563eb;">${otpCode}</span>
            </div>
            <p style="color: #888; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #aaa; font-size: 12px;">Voice to Action — Every Voice Proprietary Limited</p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      console.error("Resend error:", err);
      return await timed(
        new Response(JSON.stringify({ error: "Failed to send email" }), {
          status: 500,
          headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
        }),
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

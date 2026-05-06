import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FROM_NOREPLY } from "../_shared/email.ts";
import { SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";

/**
 * Internal email relay — call only with the Supabase service role JWT from other Edge Functions / base44.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") || "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 503,
      headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  const payload = await req.json().catch(() => ({}));
  const to = typeof payload.to === "string" ? payload.to.trim() : "";
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const text =
    typeof payload.body === "string"
      ? payload.body
      : typeof payload.text === "string"
        ? payload.text
        : "";
  const html = typeof payload.html === "string" ? payload.html : undefined;
  if (!to || !subject || (!text && !html)) {
    return new Response(JSON.stringify({ error: "to, subject, and body or html required" }), {
      status: 400,
      headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_NOREPLY, to, subject, text: text || undefined, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 502,
      headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }
  const out = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ success: true, ...out }), {
    headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
  });
});

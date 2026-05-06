import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const country = req.headers.get("cf-ipcountry") || "AU";
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    await supabase.from("privacy_consents").insert({
      user_id: body.user_id || null,
      session_id: body.session_id || null,
      consent_type: body.consent_type || "cookies",
      consented: !!body.consented,
      country_code: country,
      ip_address: req.headers.get("x-forwarded-for") || "",
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ is_eu: ["DE", "FR", "ES", "IT", "NL", "BE", "SE", "PL", "IE", "PT", "RO", "GR", "AT", "FI", "DK"].includes(country) }), { headers: { "content-type": "application/json" } });
});

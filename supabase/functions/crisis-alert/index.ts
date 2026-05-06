import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  const body = await req.json().catch(() => ({}));
  const { data, error } = await supabase.from("active_crises").insert({
    title: body.title,
    description: body.description,
    urgency_level: body.urgency_level || "high",
    related_tags: body.related_tags || [],
    country_codes: body.country_codes || [],
    activated_by: body.activated_by || null,
  }).select("*").single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ crisis: data, notified: true }), { headers: { "content-type": "application/json" } });
});

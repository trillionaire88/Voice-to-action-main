import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (req.method === "POST") {
    const payload = await req.json();
    const { data, error } = await supabase.from("petition_deliveries").insert(payload).select("*").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify({ delivery: data }), { headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});

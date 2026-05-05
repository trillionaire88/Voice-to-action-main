import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await supabase.from("feed_interactions").delete().lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
  await supabase.from("newsfeed_cache").delete().lt("expires_at", new Date().toISOString());
  await supabase.from("trending_scores").delete().lt("calculated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  return new Response(JSON.stringify({ success: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
});

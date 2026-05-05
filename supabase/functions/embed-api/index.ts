import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { siteUrl } from "../_shared/siteUrl.ts";

serve(async (req) => {
  const headers = { "content-type": "application/json", "access-control-allow-origin": "*" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const url = new URL(req.url);
  const petitionId = url.searchParams.get("petition_id");
  if (!petitionId) return new Response(JSON.stringify({ error: "petition_id required" }), { status: 400, headers });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const { data } = await supabase.from("petitions").select("*").eq("id", petitionId).single();
  if (!data) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });
  const signatureCount = data.signature_count_total || 0;
  const goal = data.signature_goal || 1;
  return new Response(JSON.stringify({
    id: data.id,
    title: data.title,
    signature_count: signatureCount,
    goal,
    percentage: Math.round((signatureCount / goal) * 100),
    status: data.status,
    created_at: data.created_at || data.created_date,
    category: data.category,
    url: siteUrl(`/PetitionDetail?id=${data.id}`),
    embed_url: siteUrl(`/EmbedWidget?id=${data.id}`),
    share_image: siteUrl(`/og/petition/${data.id}.png`),
  }), { headers });
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

  const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const rl = await supabase
    .from("feed_interactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", minuteAgo);
  if ((rl.count || 0) > 60) {
    return new Response(JSON.stringify({ error: "Too many interactions" }), { status: 429, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const content_type = String(body.content_type || "");
  const content_id = String(body.content_id || "");
  const interaction_type = String(body.interaction_type || "view");
  const category = body.category ? String(body.category) : null;
  const country_code = body.country_code ? String(body.country_code) : null;
  const time_spent_seconds = Number(body.time_spent_seconds || 0);

  await supabase.from("feed_interactions").insert({
    user_id: user.id,
    content_type,
    content_id,
    interaction_type,
    category,
    country_code,
    time_spent_seconds,
  });

  const { data: interests } = await supabase.from("user_interests").select("topic_weights,hidden_categories").eq("user_id", user.id).maybeSingle();
  const weights = { ...(interests?.topic_weights || {}) } as Record<string, number>;
  const hidden = new Set<string>(interests?.hidden_categories || []);
  if (category) {
    const current = Number(weights[category] || 0);
    const deltaMap: Record<string, number> = { click: 10, sign: 10, vote: 10, share: 15, follow: 20, skip: -5, hide: -20 };
    const next = Math.max(0, Math.min(100, current + (deltaMap[interaction_type] || 0)));
    weights[category] = next;
    if (interaction_type === "hide") hidden.add(category);
  }

  await supabase.from("user_interests").upsert({
    user_id: user.id,
    topic_weights: weights,
    hidden_categories: Array.from(hidden),
    last_updated: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (interaction_type === "hide") {
    await supabase.from("newsfeed_cache").delete().eq("user_id", user.id).eq("feed_type", "for_you");
  }

  return new Response(JSON.stringify({ success: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
});

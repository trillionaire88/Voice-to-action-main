import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: interactions } = await supabase
    .from("feed_interactions")
    .select("user_id,category,interaction_type")
    .gte("created_at", since);

  const perUser = new Map<string, Record<string, number>>();
  const deltaMap: Record<string, number> = { click: 1, sign: 2, vote: 2, share: 2, follow: 3, skip: -1, hide: -3, view: 0.2 };
  for (const i of interactions || []) {
    if (!i.user_id || !i.category) continue;
    const m = perUser.get(i.user_id) || {};
    m[i.category] = (m[i.category] || 0) + (deltaMap[i.interaction_type] || 0);
    perUser.set(i.user_id, m);
  }

  for (const [userId, signals] of perUser.entries()) {
    const { data: interests } = await supabase.from("user_interests").select("topic_weights").eq("user_id", userId).maybeSingle();
    const oldW = (interests?.topic_weights || {}) as Record<string, number>;
    const next = { ...oldW };
    for (const [cat, signal] of Object.entries(signals)) {
      const oldVal = Number(oldW[cat] || 0);
      const normSignal = Math.max(0, Math.min(100, (signal + 10) * 5));
      next[cat] = Math.max(0, Math.min(100, oldVal * 0.7 + normSignal * 0.3));
    }
    await supabase.from("user_interests").upsert({
      user_id: userId,
      topic_weights: next,
      last_updated: new Date().toISOString(),
    }, { onConflict: "user_id" });
    await supabase.from("newsfeed_cache").delete().eq("user_id", userId);
  }

  return new Response(JSON.stringify({ success: true, users_updated: perUser.size }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});

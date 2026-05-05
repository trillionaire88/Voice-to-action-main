import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calcScore(h1: number, h24: number, d7: number, share = 0, comments = 0) {
  return h1 * 10 + h24 * 3 + d7 * 0.5 + share * 5 + comments * 2;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();
  const h1 = new Date(now - 60 * 60 * 1000).toISOString();
  const h24 = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [petitions, polls, communities] = await Promise.all([
    supabase.from("petitions").select("id,country_code,category,created_date"),
    supabase.from("polls").select("id,country_code,category,created_date"),
    supabase.from("communities").select("id,country_code,category,created_at"),
  ]);

  for (const p of petitions.data || []) {
    const [c1, c24, c7] = await Promise.all([
      supabase.from("signatures").select("id", { count: "exact", head: true }).eq("petition_id", p.id).gte("created_at", h1),
      supabase.from("signatures").select("id", { count: "exact", head: true }).eq("petition_id", p.id).gte("created_at", h24),
      supabase.from("signatures").select("id", { count: "exact", head: true }).eq("petition_id", p.id).gte("created_at", d7),
    ]);
    const score = calcScore(c1.count || 0, c24.count || 0, c7.count || 0);
    const ageHours = Math.max(1, (now - new Date(p.created_date || now).getTime()) / (1000 * 60 * 60));
    const velocity = (c1.count || 0) / ageHours;
    await supabase.from("trending_scores").upsert({
      content_type: "petition",
      content_id: p.id,
      score,
      velocity,
      country_code: p.country_code || null,
      category: p.category || null,
      calculated_at: new Date().toISOString(),
    }, { onConflict: "content_type,content_id,country_code" });
  }

  for (const p of polls.data || []) {
    const [c1, c24, c7] = await Promise.all([
      supabase.from("votes").select("id", { count: "exact", head: true }).eq("poll_id", p.id).gte("created_at", h1),
      supabase.from("votes").select("id", { count: "exact", head: true }).eq("poll_id", p.id).gte("created_at", h24),
      supabase.from("votes").select("id", { count: "exact", head: true }).eq("poll_id", p.id).gte("created_at", d7),
    ]);
    const score = calcScore(c1.count || 0, c24.count || 0, c7.count || 0);
    const ageHours = Math.max(1, (now - new Date(p.created_date || now).getTime()) / (1000 * 60 * 60));
    const velocity = (c1.count || 0) / ageHours;
    await supabase.from("trending_scores").upsert({
      content_type: "poll",
      content_id: p.id,
      score,
      velocity,
      country_code: p.country_code || null,
      category: p.category || null,
      calculated_at: new Date().toISOString(),
    }, { onConflict: "content_type,content_id,country_code" });
  }

  for (const c of communities.data || []) {
    const [m24, d24] = await Promise.all([
      supabase.from("community_members").select("id", { count: "exact", head: true }).eq("community_id", c.id).gte("created_at", h24),
      supabase.from("policy_discussions").select("id", { count: "exact", head: true }).eq("community_id", c.id).gte("created_at", h24),
    ]);
    const score = calcScore(m24.count || 0, (m24.count || 0) + (d24.count || 0), d24.count || 0);
    const ageHours = Math.max(1, (now - new Date(c.created_at || now).getTime()) / (1000 * 60 * 60));
    const velocity = ((m24.count || 0) + (d24.count || 0)) / ageHours;
    await supabase.from("trending_scores").upsert({
      content_type: "community",
      content_id: c.id,
      score,
      velocity,
      country_code: c.country_code || null,
      category: c.category || null,
      calculated_at: new Date().toISOString(),
    }, { onConflict: "content_type,content_id,country_code" });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
});

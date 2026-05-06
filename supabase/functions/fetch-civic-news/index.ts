import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchNews(apiKey: string, country?: string) {
  const q = encodeURIComponent("petition OR parliament OR government accountability OR civic rights OR council decision");
  const params = new URLSearchParams({ q, lang: "en", max: "20", token: apiKey });
  if (country) params.set("country", country.toLowerCase());
  const res = await fetch(`https://gnews.io/api/v4/search?${params.toString()}`);
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({ articles: [] }));
  return Array.isArray(body.articles) ? body.articles : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("NEWS_API_KEY");
  if (!key) return new Response(JSON.stringify({ success: true, skipped: "NEWS_API_KEY_missing" }), { headers: { ...CORS, "Content-Type": "application/json" } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [au, global] = await Promise.all([fetchNews(key, "au"), fetchNews(key)]);
  const rows = [...au.map((a: any) => ({ ...a, country_code: "AU" })), ...global.map((a: any) => ({ ...a, country_code: "GLOBAL" }))];

  for (const a of rows) {
    await supabase.from("civic_news_cache").upsert({
      title: String(a.title || "").slice(0, 500),
      description: a.description ? String(a.description).slice(0, 2000) : null,
      url: a.url,
      image_url: a.image || null,
      source_name: a.source?.name || null,
      published_at: a.publishedAt || new Date().toISOString(),
      country_code: a.country_code,
      category: "civic",
      fetched_at: new Date().toISOString(),
    }, { onConflict: "url" });
  }

  await supabase.from("civic_news_cache").delete().lt("published_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
  return new Response(JSON.stringify({ success: true, stored: rows.length }), { headers: { ...CORS, "Content-Type": "application/json" } });
});

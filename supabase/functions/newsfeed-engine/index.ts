import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FeedType = "for_you" | "local" | "global" | "following" | "breaking";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function toFeedItem(row: any, content_type: string, score: number, reason: string, engagementLabel: string, engagementCount: number, velocity = 0) {
  return {
    id: row.id,
    feed_id: `${content_type}:${row.id}:${Date.now()}`,
    content_type,
    content: row,
    score,
    reason,
    country_code: row.country_code || null,
    category: row.category || null,
    created_at: row.created_date || row.created_at || new Date().toISOString(),
    engagement: {
      count: engagementCount || 0,
      label: engagementLabel,
      velocity,
    },
    creator: {
      id: row.creator_user_id || row.owner_id || null,
      name: row.creator_name || row.subject_name || "Voice to Action",
      is_verified: !!row.creator_verified,
      is_following: false,
    },
  };
}

function mixByType(items: any[]): any[] {
  const byType = new Map<string, any[]>();
  for (const item of items) {
    const arr = byType.get(item.content_type) || [];
    arr.push(item);
    byType.set(item.content_type, arr);
  }
  const types = Array.from(byType.keys());
  const mixed: any[] = [];
  let i = 0;
  while (types.some((t) => (byType.get(t) || []).length > 0)) {
    const t = types[i % types.length];
    const arr = byType.get(t) || [];
    if (arr.length > 0) mixed.push(arr.shift());
    i++;
  }
  return mixed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const feed_type = (body.feed_type || "for_you") as FeedType;
  const page = Number(body.page || 0);
  const page_size = Math.max(1, Math.min(50, Number(body.page_size || 20)));
  const refresh = !!body.refresh;
  const requestedCountry = body.country_code || req.headers.get("cf-ipcountry") || "AU";

  const { data: profile } = await supabase.from("profiles").select("id,country_code").eq("id", user.id).maybeSingle();
  const countryCode = requestedCountry || profile?.country_code || "AU";

  if (!refresh) {
    const { data: cache } = await supabase
      .from("newsfeed_cache")
      .select("feed_items,generated_at,expires_at")
      .eq("user_id", user.id)
      .eq("feed_type", feed_type)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cache?.feed_items) {
      const items = cache.feed_items.slice(page * page_size, page * page_size + page_size);
      return jsonResponse({
        items,
        feed_type,
        page,
        has_more: cache.feed_items.length > (page + 1) * page_size,
        generated_at: cache.generated_at,
        from_cache: true,
      });
    }
  }

  const [{ data: interests }, { data: interactions }] = await Promise.all([
    supabase
      .from("user_interests")
      .select("categories,topic_weights,followed_user_ids,feed_preference,hidden_categories")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("feed_interactions")
      .select("content_type,content_id,interaction_type,category")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const interacted = new Set((interactions || []).map((i: any) => `${i.content_type}:${i.content_id}`));
  const categories = new Set((interests?.categories || []).map((c: string) => c.toLowerCase()));
  const hiddenCategories = new Set((interests?.hidden_categories || []).map((c: string) => c.toLowerCase()));
  const topicWeights = interests?.topic_weights || {};
  const followedUsers = new Set((interests?.followed_user_ids || []).map((id: string) => id));

  const [petitionsRes, pollsRes, communitiesRes, scorecardsRes, followsRes, trendingRes, breakingNewsRes] = await Promise.all([
    supabase.from("petitions").select("id,title,short_summary,category,status,signature_count_total,created_date,country_code,location_scope,creator_user_id").eq("status", "active").limit(200),
    supabase.from("polls").select("id,question,description,category,status,total_votes_cached,created_date,location_scope,audience_type,creator_user_id,country_code").in("status", ["open", "active"]).limit(200),
    supabase.from("communities").select("id,name,description,category,member_count,is_hidden,plan,created_at,country_code,owner_id").eq("is_hidden", false).limit(120),
    supabase.from("scorecards").select("id,subject_name,subject_type,category,overall_score,rating_count,created_date,country_code,creator_user_id").limit(120),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase.from("trending_scores").select("content_type,content_id,score,velocity,country_code").order("score", { ascending: false }).limit(500),
    supabase.from("civic_news_cache").select("id,title,description,url,image_url,source_name,published_at,country_code").order("published_at", { ascending: false }).limit(30),
  ]);

  const followingIds = new Set((followsRes.data || []).map((f: any) => f.following_id));
  const trendMap = new Map<string, { score: number; velocity: number; country_code?: string }>();
  for (const t of trendingRes.data || []) trendMap.set(`${t.content_type}:${t.content_id}`, { score: Number(t.score || 0), velocity: Number(t.velocity || 0), country_code: t.country_code });

  const baseItems: any[] = [];
  for (const p of petitionsRes.data || []) baseItems.push(toFeedItem(p, "petition", 0, "", "signatures", Number(p.signature_count_total || 0), trendMap.get(`petition:${p.id}`)?.velocity || 0));
  for (const p of pollsRes.data || []) baseItems.push(toFeedItem(p, "poll", 0, "", "votes", Number(p.total_votes_cached || 0), trendMap.get(`poll:${p.id}`)?.velocity || 0));
  for (const c of communitiesRes.data || []) baseItems.push(toFeedItem(c, "community", 0, "", "members", Number(c.member_count || 0), trendMap.get(`community:${c.id}`)?.velocity || 0));
  for (const s of scorecardsRes.data || []) baseItems.push(toFeedItem(s, "scorecard", 0, "", "ratings", Number(s.rating_count || 0), trendMap.get(`scorecard:${s.id}`)?.velocity || 0));

  const now = Date.now();
  let scored = baseItems.map((item) => {
    const row = item.content;
    const category = String(row.category || "").toLowerCase();
    const created = new Date(row.created_date || row.created_at || now).getTime();
    const ageHours = Math.max(1, (now - created) / (1000 * 60 * 60));
    const trend = trendMap.get(`${item.content_type}:${item.id}`);
    let score = 0;
    let reason = "Trending";

    if (categories.has(category)) { score += 30; reason = "Matches your interests"; }
    if (Number(topicWeights[category] || 0) > 60) score += 20;
    if (followingIds.has(row.creator_user_id) || followedUsers.has(row.creator_user_id)) { score += 25; reason = "From someone you follow"; item.creator.is_following = true; }
    if ((row.country_code || "") === countryCode) { score += 15; reason = `Trending in ${countryCode}`; }
    if ((trend?.velocity || 0) > 0) score += 20;
    if (interacted.has(`${item.content_type}:${item.id}`)) score -= 50;
    if (hiddenCategories.has(category)) score -= 100;
    if (ageHours > 24 * 7 && (trend?.score || 0) < 10) score -= 20;
    score += Number(trend?.score || 0) * 0.3;

    return { ...item, score, reason };
  });

  if (feed_type === "local") {
    scored = scored.filter((i) => (i.country_code || "").toUpperCase() === String(countryCode).toUpperCase() || String(i.content.location_scope || "").toUpperCase().includes(String(countryCode).toUpperCase()));
    scored.sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (feed_type === "global") {
    scored.sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (feed_type === "following") {
    scored = scored.filter((i) => followingIds.has(i.content.creator_user_id) || followingIds.has(i.content.owner_id));
    scored.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (scored.length === 0) {
      return jsonResponse({ items: [], feed_type, page, has_more: false, generated_at: new Date().toISOString(), from_cache: false, empty: true, reason: "not_following_anyone" });
    }
  } else if (feed_type === "breaking") {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const breakingPlatform = scored.filter((i) => i.created_at > twoHoursAgo && ((i.content_type === "petition" && (i.engagement.count || 0) > 50) || (i.content_type === "poll" && (i.engagement.count || 0) > 100))).map((i) => ({ ...i, reason: "Breaking" }));
    const news = (breakingNewsRes.data || []).map((n: any) => ({
      id: n.id,
      feed_id: `news:${n.id}:${Date.now()}`,
      content_type: "news",
      content: n,
      score: 90,
      reason: "Breaking",
      country_code: n.country_code || null,
      category: "civic",
      created_at: n.published_at || new Date().toISOString(),
      engagement: { count: 0, label: "articles", velocity: 0 },
      creator: { id: null, name: n.source_name || "External Source", is_verified: false, is_following: false },
    }));
    scored = [...breakingPlatform, ...news].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    scored.sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    scored = mixByType(scored);
    const news = (breakingNewsRes.data || []).slice(0, 8).map((n: any) => ({
      id: n.id,
      feed_id: `news:${n.id}:${Date.now()}`,
      content_type: "news",
      content: n,
      score: 50,
      reason: "Breaking",
      country_code: n.country_code || null,
      category: "civic",
      created_at: n.published_at || new Date().toISOString(),
      engagement: { count: 0, label: "articles", velocity: 0 },
      creator: { id: null, name: n.source_name || "External Source", is_verified: false, is_following: false },
    }));
    const injected: any[] = [];
    for (let i = 0; i < scored.length; i++) {
      injected.push(scored[i]);
      if ((i + 1) % 8 === 0 && news.length) injected.push(news.shift());
    }
    scored = injected;
  }

  const expiresMinutes = feed_type === "breaking" ? 5 : 15;
  await supabase
    .from("newsfeed_cache")
    .upsert({
      user_id: user.id,
      feed_type,
      feed_items: scored,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString(),
    }, { onConflict: "user_id,feed_type" });

  const items = scored.slice(page * page_size, page * page_size + page_size);
  return jsonResponse({
    items,
    feed_type,
    page,
    has_more: scored.length > (page + 1) * page_size,
    generated_at: new Date().toISOString(),
    from_cache: false,
    ...(feed_type === "local" && items.length < 5 ? { notice: "Nothing local yet — showing regional content" } : {}),
  });
});

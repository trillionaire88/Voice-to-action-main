import { supabase } from "@/lib/supabase";

export async function callNewsfeedEngine(feedType, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const canUseAnonymous = feedType === "global" || feedType === "breaking";
  if (!session?.access_token && !canUseAnonymous) {
    return { items: [], page: opts.page ?? 0, page_size: opts.pageSize ?? 20 };
  }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/newsfeed-engine`, {
    method: "POST",
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feed_type: feedType,
      page: opts.page ?? 0,
      page_size: opts.pageSize ?? 20,
      country_code: opts.countryCode,
      refresh: !!opts.refresh,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to load feed");
  return body;
}

export async function recordFeedInteraction(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;
  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-feed-interaction`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

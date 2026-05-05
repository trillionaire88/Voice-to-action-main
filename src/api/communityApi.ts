import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

export async function startCommunitySubscription(communityId: string, plan: "paid" | "private"): Promise<string> {
  const headers = await getAuthHeaders();
  const successUrl = `${window.location.origin}/Communities?community=${communityId}&subscribed=1`;
  const cancelUrl = window.location.href;
  const res = await fetch(`${FUNCTIONS_BASE}/community-subscribe`, {
    method: "POST",
    headers,
    body: JSON.stringify({ community_id: communityId, plan, success_url: successUrl, cancel_url: cancelUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start subscription");
  return data.checkout_url as string;
}

export async function cancelCommunitySubscription(communityId: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/community-cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({ community_id: communityId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to cancel subscription");
  return data.message as string;
}

export async function joinCommunityWithCode(inviteCode: string): Promise<{ communityId: string; communityName: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: community, error: findErr } = await supabase
    .from("communities")
    .select("id, name")
    .eq("invite_code", inviteCode.toUpperCase().trim())
    .maybeSingle();

  if (findErr || !community) throw new Error("Invalid invite code");

  const { error } = await supabase.from("community_members").insert(cleanForDB({
    community_id: community.id,
    user_id: user.id,
    role: "member",
    status: "active",
  }));

  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    throw new Error(error.message || "Failed to join community");
  }

  return { communityId: community.id, communityName: community.name as string };
}

/** Visible communities for directory (not hidden). */
export async function getCommunitiesVisible(filter: "all" | "free" | "paid" = "all") {
  let q = supabase    .from("communities")
    .select("*")
    .or("is_hidden.is.null,is_hidden.eq.false");

  if (filter === "paid") q = q.eq("plan", "paid");
  else if (filter === "free") q = q.or("plan.eq.free,plan.is.null");

  const { data, error } = await q
    .order("priority_search", { ascending: false })
    .order("member_count", { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Communities the current user belongs to. */
export async function getMyCommunities() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("communities")
    .select("*, community_members!inner(user_id, role)")
    .eq("community_members.user_id", user.id)
    .order("priority_search", { ascending: false })
    .order("member_count", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMyPrivateCommunities() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("communities")
    .select("*, community_members!inner(user_id)")
    .eq("community_members.user_id", user.id)
    .eq("plan", "private")
    .order("member_count", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAdminCommunityStats() {
  const { data: communities, error: cErr } = await supabase
    .from("communities")
    .select("id, name, plan, plan_status, member_count, subscription_started_at, stripe_subscription_id, founder_user_id, community_owner")
    .in("plan", ["paid", "private"])
    .eq("plan_status", "active");

  if (cErr) throw cErr;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs, error: lErr } = await supabase
    .from("community_subscription_log")
    .select("amount, created_at, event_type")
    .eq("event_type", "renewed")
    .gte("created_at", since);

  if (lErr) throw lErr;

  const monthlyRevenue = (logs || []).reduce((sum, l) => sum + Number(l.amount || 0), 0);

  return {
    paying_communities: communities || [],
    total_paying: (communities || []).length,
    monthly_revenue: monthlyRevenue,
  };
}

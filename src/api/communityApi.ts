// @ts-nocheck
/// <reference types="vite/client" />
/**
 * Communities entity — canonical Supabase columns are documented in `src/lib/communityFields.ts`.
 * Read helpers that handle legacy duplicate fields are re-exported at the bottom of this file.
 */

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

  const sanitisedCode = inviteCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  if (!sanitisedCode) throw new Error("Invalid invite code");

  // Look up by legacy invite_code field (used on Communities page) or by access-code table.
  const { data: community, error: findErr } = await supabase
    .from("communities")
    .select("id, name, plan, status, join_policy")
    .or(`invite_code.eq.${sanitisedCode}`)
    .maybeSingle();

  if (findErr || !community) throw new Error("Invalid invite code");
  if (community.status !== "active") throw new Error("This community is not currently active");

  // Verify the community is actually joinable via code.
  const allowedJoinPolicy = community.plan === "private" || community.join_policy === "invite_only";
  if (!allowedJoinPolicy) throw new Error("This community does not use invite codes");

  // Prevent duplicate membership.
  const { data: existing } = await supabase
    .from("community_members")
    .select("id, status")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "active") throw new Error("You are already a member of this community");
  if (existing?.status === "pending_approval") throw new Error("Your request is already pending approval");

  if (existing) {
    // Reactivate a previously removed membership.
    await supabase.from("community_members").update({ status: "active" }).eq("id", existing.id);
  } else {
    const { error } = await supabase.from("community_members").insert(cleanForDB({
      community_id: community.id,
      user_id: user.id,
      role: "member",
      status: "active",
    }));
    if (error) throw new Error(error.message || "Failed to join community");
  }

  return { communityId: community.id, communityName: community.name as string };
}

/** Join a community via a CommunityAccessCode record (used from CommunityDetail code input). */
export async function joinCommunityWithAccessCode(
  communityId: string,
  code: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const sanitisedCode = code.toUpperCase().trim().replace(/[^A-Z0-9]/g, "").slice(0, 16);

  // Verify the access code exists and is active for this community.
  const { data: accessCode, error: codeErr } = await supabase
    .from("community_access_codes")
    .select("id, uses_count, active")
    .eq("community_id", communityId)
    .eq("code", sanitisedCode)
    .eq("active", true)
    .maybeSingle();

  if (codeErr || !accessCode) throw new Error("Invalid or inactive access code");

  // Prevent duplicate membership.
  const { data: existing } = await supabase
    .from("community_members")
    .select("id, status")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "active") throw new Error("You are already a member of this community");

  if (existing) {
    await supabase.from("community_members").update({ status: "active" }).eq("id", existing.id);
  } else {
    const { error: insertErr } = await supabase.from("community_members").insert(cleanForDB({
      community_id: communityId,
      user_id: user.id,
      role: "member",
      status: "active",
    }));
    if (insertErr) throw new Error(insertErr.message || "Failed to join community");
  }

  // Increment use count.
  await supabase
    .from("community_access_codes")
    .update({ uses_count: (accessCode.uses_count || 0) + 1 })
    .eq("id", accessCode.id);
}

/** Approve a pending join request. */
export async function approveMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .update({ status: "active" })
    .eq("id", memberId)
    .eq("status", "pending_approval");
  if (error) throw new Error(error.message);
}

/** Reject / remove a pending join request. */
export async function rejectMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("id", memberId)
    .eq("status", "pending_approval");
  if (error) throw new Error(error.message);
}

/** Visible communities for directory (not hidden, never private). */
export async function getCommunitiesVisible(filter: "all" | "free" | "paid" = "all") {
  // Private-plan communities are never shown in the public directory.
  let q = supabase
    .from("communities")
    .select("*")
    .or("is_hidden.is.null,is_hidden.eq.false")
    .neq("plan", "private")
    .or("visibility.eq.public,visibility.is.null");

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

  if (error) throw error;
  return data || [];
}

export async function getAdminCommunityStats() {
  const { data: communities, error: cErr } = await supabase
    .from("communities")
    .select("id, name, plan, plan_status, member_count, subscription_started_at, stripe_subscription_id, founder_user_id")
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

export {
  communityName,
  communityDescriptionPublic,
  communityVisibilityValue,
  communityLogoUrl,
  communityBannerUrl,
  communityPlanTier,
  communityOwnerId,
  communityTagsList,
} from "@/lib/communityFields";

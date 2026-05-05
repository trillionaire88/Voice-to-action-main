import { supabase } from "@/lib/supabase";
import { sanitiseText } from "@/lib/sanitise";
import { cleanForDB } from "@/lib/dbHelpers";

export async function followUser(targetUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("follows").insert(cleanForDB({
    follower_id: user.id,
    following_id: targetUserId,
  }));
  if (error) throw new Error(error.message);
}

export async function unfollowUser(targetUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);
  if (error) throw new Error(error.message);
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();
  return !!data;
}

export async function getFollowers(userId: string) {
  const { data } = await supabase
    .from("follows")
    .select("follower_id, profiles!follows_follower_id_fkey(id, display_name, profile_avatar_url, is_blue_verified, follower_count)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getFollowing(userId: string) {
  const { data } = await supabase
    .from("follows")
    .select("following_id, profiles!follows_following_id_fkey(id, display_name, profile_avatar_url, is_blue_verified, follower_count)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function logActivity(activity: {
  activity_type: string;
  reference_id?: string;
  reference_type?: string;
  title?: string;
  summary?: string;
  url_path?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_activity").insert(cleanForDB({ user_id: user.id, ...activity }));
}

export async function getFollowingFeed(page: number = 0, limit: number = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: followingData } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  if (!followingData || followingData.length === 0) return [];
  const followingIds = followingData.map((f) => f.following_id);
  const { data } = await supabase
    .from("user_activity")
    .select("*, profiles!user_activity_user_id_fkey(id, display_name, profile_avatar_url, is_blue_verified)")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  return data || [];
}

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const p1 = user.id < otherUserId ? user.id : otherUserId;
  const p2 = user.id < otherUserId ? otherUserId : user.id;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_one", p1)
    .eq("participant_two", p2)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert(cleanForDB({ participant_one: p1, participant_two: p2 }))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return newConv.id;
}

export async function getConversations() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("conversations")
    .select("*, profile_one:profiles!conversations_participant_one_fkey(id, display_name, profile_avatar_url, is_blue_verified), profile_two:profiles!conversations_participant_two_fkey(id, display_name, profile_avatar_url, is_blue_verified)")
    .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
    .order("last_message_at", { ascending: false });
  return (data || []).map((conv) => ({
    ...conv,
    other_user: conv.participant_one === user.id ? conv.profile_two : conv.profile_one,
    unread_count: conv.participant_one === user.id ? conv.unread_count_one : conv.unread_count_two,
  }));
}

export async function getMessages(conversationId: string, page: number = 0) {
  const { data } = await supabase
    .from("messages")
    .select("*, profiles!messages_sender_id_fkey(id, display_name, profile_avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .range(page * 50, (page + 1) * 50 - 1);
  return (data || []).reverse();
}

export async function sendMessage(conversationId: string, content: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const safe = sanitiseText(content, 5000);
  if (!safe.trim()) throw new Error("Message cannot be empty");
  const { error } = await supabase.from("messages").insert(cleanForDB({
    conversation_id: conversationId,
    sender_id: user.id,
    content: safe,
  }));
  if (error) throw new Error(error.message);
  await supabase.from("conversations").update(cleanForDB({
    last_message_at: new Date().toISOString(),
    last_message_preview: safe.substring(0, 100),
  })).eq("id", conversationId);
}

export async function markMessagesAsRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("is_read", false);
}

export async function getTotalUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("conversations")
    .select("unread_count_one, unread_count_two, participant_one")
    .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`);
  if (!data) return 0;
  return data.reduce((total, conv) => total + (conv.participant_one === user.id ? conv.unread_count_one : conv.unread_count_two), 0);
}

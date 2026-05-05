import React, { useState, useEffect } from "react";
import { fetchPublicProfileById } from "@/lib/publicProfile";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search } from "lucide-react";
import FollowButton from "@/components/social/FollowButton";

function UserRow({ userId, currentUserId }) {
  const { data: userData } = useQuery({
    queryKey: ["user-basic", userId],
    queryFn: () => fetchPublicProfileById(userId),
    enabled: !!userId,
    staleTime: 60000,
  });
  if (!userData) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:shadow-sm transition">
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
        {userData.profile_avatar_url ? (
          <img src={userData.profile_avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-semibold text-slate-600 text-sm">{(userData.full_name || "U")[0].toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900">{userData.full_name || "User"}</p>
        <p className="text-xs text-slate-400 capitalize">{userData.public_role || ""}</p>
      </div>
      <FollowButton targetType="user" targetId={userId} currentUserId={currentUserId} compact />
    </div>
  );
}

export default function FollowList() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("following");

  const params = new URLSearchParams(window.location.search);
  const viewUserId = params.get("user_id");

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const targetId = viewUserId || user?.id;

  const { data: following = [] } = useQuery({
    queryKey: ["following", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", targetId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!targetId,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", targetId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!targetId,
  });

  const { data: communityFollowRows = [] } = useQuery({
    queryKey: ["community-follows", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_follows")
        .select("community_id")
        .eq("follower_id", targetId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!targetId,
  });

  const communityIds = communityFollowRows.map((r) => r.community_id).filter(Boolean);

  const { data: communityDetails = [] } = useQuery({
    queryKey: ["community-follow-details", communityIds],
    queryFn: async () => {
      if (communityIds.length === 0) return [];
      const { data, error } = await supabase.from("communities").select("id, name").in("id", communityIds);
      if (error) throw error;
      const map = Object.fromEntries((data || []).map((c) => [c.id, c]));
      return communityIds.map((id) => map[id]).filter(Boolean);
    },
    enabled: communityIds.length > 0,
  });

  if (!user)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Users className="w-7 h-7" /> Connections
      </h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="following" className="flex-1">
            Following ({following.length})
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex-1">
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="communities" className="flex-1">
            Communities ({communityFollowRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4 space-y-2">
          {following.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Not following anyone yet</p>
          ) : (
            following.map((f) => <UserRow key={f.following_id} userId={f.following_id} currentUserId={user.id} />)
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-4 space-y-2">
          {followers.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No followers yet</p>
          ) : (
            followers.map((f) => <UserRow key={f.follower_id} userId={f.follower_id} currentUserId={user.id} />)
          )}
        </TabsContent>

        <TabsContent value="communities" className="mt-4 space-y-2">
          {communityFollowRows.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Not following any communities</p>
          ) : (
            communityDetails.map((c) => (
              <div key={c.id} className="p-3 rounded-xl border border-slate-100 bg-white flex justify-between items-center">
                <p className="text-sm font-semibold text-slate-700">{c.name || `Community ${c.id}`}</p>
                <FollowButton targetType="community" targetId={c.id} currentUserId={user.id} compact />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

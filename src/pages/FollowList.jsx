import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, UserPlus } from "lucide-react";
import FollowButton from "@/components/social/FollowButton";

function UserRow({ userId, currentUserId }) {
  const { data: userData } = useQuery({
    queryKey: ["user-basic", userId],
    queryFn: () => api.entities.User.filter({ id: userId }).then(r => r[0]),
    enabled: !!userId,
    staleTime: 60000,
  });
  if (!userData) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:shadow-sm transition">
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
        {userData.profile_avatar_url
          ? <img src={userData.profile_avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="font-semibold text-slate-600 text-sm">{(userData.full_name||"U")[0].toUpperCase()}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900">{userData.full_name || "User"}</p>
        <p className="text-xs text-slate-400">{userData.email}</p>
      </div>
      <FollowButton targetType="user" targetId={userId} currentUserId={currentUserId} compact />
    </div>
  );
}

export default function FollowList() {
  const [user, setUser]     = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab]       = useState("following");

  const params = new URLSearchParams(window.location.search);
  const viewUserId = params.get("user_id");

  useEffect(() => { api.auth.me().then(setUser).catch(() => {}); }, []);

  const targetId = viewUserId || user?.id;

  const { data: following = [] } = useQuery({
    queryKey: ["following", targetId],
    queryFn: () => api.entities.UserFollow.filter({ follower_id: targetId, target_type: "user" }, "-created_date", 200),
    enabled: !!targetId,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", targetId],
    queryFn: () => api.entities.UserFollow.filter({ target_type: "user", target_id: targetId }, "-created_date", 200),
    enabled: !!targetId,
  });

  const { data: communityFollows = [] } = useQuery({
    queryKey: ["community-follows", targetId],
    queryFn: () => api.entities.UserFollow.filter({ follower_id: targetId, target_type: "community" }, "-created_date", 200),
    enabled: !!targetId,
  });

  if (!user) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Users className="w-7 h-7" /> Connections
      </h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="following" className="flex-1">Following ({following.length})</TabsTrigger>
          <TabsTrigger value="followers" className="flex-1">Followers ({followers.length})</TabsTrigger>
          <TabsTrigger value="communities" className="flex-1">Communities ({communityFollows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4 space-y-2">
          {following.length === 0
            ? <p className="text-center text-slate-400 py-8">Not following anyone yet</p>
            : following.map(f => <UserRow key={f.id} userId={f.target_id} currentUserId={user.id} />)}
        </TabsContent>

        <TabsContent value="followers" className="mt-4 space-y-2">
          {followers.length === 0
            ? <p className="text-center text-slate-400 py-8">No followers yet</p>
            : followers.map(f => <UserRow key={f.id} userId={f.follower_id} currentUserId={user.id} />)}
        </TabsContent>

        <TabsContent value="communities" className="mt-4 space-y-2">
          {communityFollows.length === 0
            ? <p className="text-center text-slate-400 py-8">Not following any communities</p>
            : communityFollows.map(f => (
              <div key={f.id} className="p-3 rounded-xl border border-slate-100 bg-white">
                <p className="text-sm font-semibold text-slate-700">Community ID: {f.target_id}</p>
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
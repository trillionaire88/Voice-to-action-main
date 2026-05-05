import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import FeedStoriesBar from "@/components/newsfeed/FeedStoriesBar";
import ForYouFeed from "@/components/newsfeed/ForYouFeed";
import LocalFeed from "@/components/newsfeed/LocalFeed";
import GlobalFeed from "@/components/newsfeed/GlobalFeed";
import FollowingFeed from "@/components/newsfeed/FollowingFeed";
import BreakingFeed from "@/components/newsfeed/BreakingFeed";
import { Button } from "@/components/ui/button";

export default function Newsfeed() {
  const { user } = useAuth();
  const [tab, setTab] = useState(() => localStorage.getItem("newsfeed_tab") || "for_you");
  const setActive = (v) => { setTab(v); localStorage.setItem("newsfeed_tab", v); };

  const { data: whoToFollow = [] } = useQuery({
    queryKey: ["newsfeed-who-to-follow"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,is_verified").eq("is_verified", true).limit(5);
      return data || [];
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["newsfeed-topics"],
    queryFn: async () => {
      const { data } = await supabase.from("trending_scores").select("category,score").not("category", "is", null).order("score", { ascending: false }).limit(20);
      const m = new Map();
      for (const r of data || []) m.set(r.category, (m.get(r.category) || 0) + Number(r.score || 0));
      return Array.from(m.entries()).slice(0, 5);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["newsfeed-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [sigs, votes, comms] = await Promise.all([
        supabase.from("signatures").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since),
        supabase.from("votes").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since),
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since),
      ]);
      return { sigs: sigs.count || 0, votes: votes.count || 0, comms: comms.count || 0 };
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <FeedStoriesBar />
          <Tabs value={tab} onValueChange={setActive}>
            <div className="sticky top-14 z-20 bg-white/95 backdrop-blur border-b">
              <TabsList className="w-full overflow-x-auto flex justify-start">
                <TabsTrigger value="for_you">For You</TabsTrigger>
                <TabsTrigger value="local">Local</TabsTrigger>
                <TabsTrigger value="global">Global</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
                <TabsTrigger value="breaking">Breaking</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="for_you"><ForYouFeed /></TabsContent>
            <TabsContent value="local"><LocalFeed /></TabsContent>
            <TabsContent value="global"><GlobalFeed /></TabsContent>
            <TabsContent value="following"><FollowingFeed /></TabsContent>
            <TabsContent value="breaking"><BreakingFeed /></TabsContent>
          </Tabs>
        </div>

        <aside className="hidden lg:block space-y-4">
          <div className="border rounded-lg p-3">
            <h4 className="font-semibold mb-2">Who to Follow</h4>
            {whoToFollow.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                <span>{p.full_name}</span>
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!user?.id) return;
                  await supabase.from("follows").upsert(cleanForDB({ follower_id: user.id, following_id: p.id }), { onConflict: "follower_id,following_id" });
                }}>Follow</Button>
              </div>
            ))}
          </div>
          <div className="border rounded-lg p-3">
            <h4 className="font-semibold mb-2">Trending Topics</h4>
            {topics.map(([k, v]) => <div key={k} className="text-sm py-0.5">{k} <span className="text-slate-500">({Math.round(v)})</span></div>)}
          </div>
          <div className="border rounded-lg p-3">
            <h4 className="font-semibold mb-2">Your Feed Stats</h4>
            <p className="text-sm">Signed this week: {stats?.sigs || 0}</p>
            <p className="text-sm">Voted this week: {stats?.votes || 0}</p>
            <p className="text-sm">Joined communities: {stats?.comms || 0}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

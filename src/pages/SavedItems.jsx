import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeedItemCard from "@/components/newsfeed/FeedItemCard";

export default function SavedItems() {
  const [tab, setTab] = useState("all");
  const { data: items = [], refetch } = useQuery({
    queryKey: ["saved-items"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: saved } = await supabase.from("saved_items").select("*").eq("user_id", user.id).order("saved_at", { ascending: false });
      return saved || [];
    },
  });

  const [hydrated, setHydrated] = useState([]);
  React.useEffect(() => {
    (async () => {
      const out = [];
      for (const s of items) {
        const table = s.content_type === "petition" ? "petitions" : s.content_type === "poll" ? "polls" : s.content_type === "community" ? "communities" : s.content_type === "scorecard" ? "scorecards" : null;
        if (!table) continue;
        const { data } = await supabase.from(table).select("*").eq("id", s.content_id).maybeSingle();
        if (data) out.push({
          id: s.content_id,
          feed_id: `${s.content_type}:${s.content_id}:saved`,
          content_type: s.content_type,
          content: data,
          score: 0,
          reason: "Saved",
          country_code: data.country_code || null,
          category: data.category || null,
          created_at: data.created_date || data.created_at || s.saved_at,
          engagement: { count: data.signature_count_total || data.total_votes_cached || data.member_count || data.rating_count || 0, label: "saved", velocity: 0 },
          creator: { id: data.creator_user_id || data.owner_id || null, name: data.creator_name || data.subject_name || "Voice to Action", is_verified: false, is_following: false },
        });
      }
      setHydrated(out);
    })();
  }, [items]);

  const visible = useMemo(() => tab === "all" ? hydrated : hydrated.filter((i) => i.content_type === tab), [hydrated, tab]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Saved Items</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="petition">Petitions</TabsTrigger>
          <TabsTrigger value="poll">Polls</TabsTrigger>
          <TabsTrigger value="community">Communities</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecards</TabsTrigger>
        </TabsList>
      </Tabs>
      {visible.length === 0 ? (
        <p className="text-slate-500 py-10 text-center">Bookmark content from your feed to save it here.</p>
      ) : (
        visible.map((item) => <FeedItemCard key={item.feed_id} item={item} onHidden={() => refetch()} />)
      )}
    </div>
  );
}

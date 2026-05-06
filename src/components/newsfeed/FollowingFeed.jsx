import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import BaseFeedList from "./BaseFeedList";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import ProfileAvatar from "@/components/profile/ProfileAvatar";

export default function FollowingFeed() {
  const { data: emptyState } = useQuery({
    queryKey: ["following-feed-empty-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { empty: true };
      const { count } = await supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id);
      return { empty: !count };
    },
  });

  const { data: suggested = [] } = useQuery({
    queryKey: ["following-feed-suggested"],
    enabled: !!emptyState?.empty,
    queryFn: async () => {
      const { data } = await supabase.from("public_profiles_view").select("id,full_name,profile_avatar_url,is_blue_verified").eq("is_blue_verified", true).limit(5);
      return data || [];
    },
  });

  if (emptyState?.empty) {
    return (
      <div className="text-center py-10 max-w-xl mx-auto">
        <svg className="mx-auto mb-4" width="140" height="90" viewBox="0 0 140 90" fill="none"><rect x="5" y="10" width="130" height="70" rx="10" fill="#EFF6FF"/><circle cx="46" cy="45" r="12" fill="#BFDBFE"/><circle cx="76" cy="45" r="12" fill="#93C5FD"/><circle cx="106" cy="45" r="12" fill="#60A5FA"/></svg>
        <h3 className="text-xl font-bold text-slate-800">You're not following anyone yet</h3>
        <p className="text-slate-500 mt-2">Follow people and communities to see their activity here.</p>
        <Button className="mt-4" asChild><a href={createPageUrl("Discovery")}>Discover people</a></Button>
        <div className="mt-6 space-y-2">
          {suggested.map((p) => (
            <div key={p.id} className="flex items-center justify-between border rounded-lg p-2">
              <div className="flex items-center gap-2"><ProfileAvatar user={{ display_name: p.full_name, profile_avatar_url: p.profile_avatar_url, is_blue_verified: p.is_blue_verified }} size="sm" />{p.full_name}</div>
              <Button size="sm" variant="outline" onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from("follows").upsert(cleanForDB({ follower_id: user.id, following_id: p.id }), { onConflict: "follower_id,following_id" });
              }}>Follow</Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <BaseFeedList feedType="following" staleTime={120000} />;
}

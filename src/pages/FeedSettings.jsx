import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { useQuery } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_CATS = ["politics_society", "environment", "economy", "health", "technology", "human_rights", "local_government", "corporate_accountability", "education", "climate"];

export default function FeedSettings() {
  const { data: settings, refetch } = useQuery({
    queryKey: ["feed-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("user_interests").select("*").eq("user_id", user.id).maybeSingle();
      return { user, data: data || { topic_weights: {}, feed_preference: "for_you", show_petitions: true, show_polls: true, show_discussions: true, show_scorecards: true, show_news: true, country_code: "AU" } };
    },
  });

  const topicWeights = useMemo(() => ({ ...(settings?.data?.topic_weights || {}) }), [settings]);

  const savePatch = async (patch) => {
    if (!settings?.user?.id) return;
    await supabase.from("user_interests").upsert(cleanForDB({ user_id: settings.user.id, ...settings.data, ...patch, last_updated: new Date().toISOString() }), { onConflict: "user_id" });
    refetch();
  };

  const resetFeed = async () => {
    if (!settings?.user?.id) return;
    await supabase.from("feed_interactions").delete().eq("user_id", settings.user.id);
    await supabase.from("user_interests").delete().eq("user_id", settings.user.id);
    await supabase.from("newsfeed_cache").delete().eq("user_id", settings.user.id);
    refetch();
  };

  const unfollow = async (id) => {
    if (!settings?.user?.id) return;
    await supabase.from("follows").delete().eq("follower_id", settings.user.id).eq("following_id", id);
  };

  const { data: following = [] } = useQuery({
    queryKey: ["feed-settings-following", settings?.user?.id],
    enabled: !!settings?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id, profiles:profiles!follows_following_id_fkey(full_name)")
        .eq("follower_id", settings.user.id);
      return data || [];
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Feed Settings</h1>
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold">Category preferences</h3>
        {DEFAULT_CATS.map((cat) => (
          <div key={cat} className="space-y-1">
            <div className="flex justify-between text-sm"><span>{cat.replace(/_/g, " ")}</span><span>{Math.round(topicWeights[cat] || 0)}</span></div>
            <Slider value={[Number(topicWeights[cat] || 0)]} min={0} max={100} step={1} onValueChange={(v) => savePatch({ topic_weights: { ...topicWeights, [cat]: v[0] } })} />
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Content toggles</h3>
        {["show_petitions", "show_polls", "show_discussions", "show_scorecards", "show_news"].map((k) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <span>{k.replace("show_", "").replace("_", " ")}</span>
            <Switch checked={!!settings?.data?.[k]} onCheckedChange={(v) => savePatch({ [k]: !!v })} />
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Feed defaults</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Select value={settings?.data?.feed_preference || "for_you"} onValueChange={(v) => savePatch({ feed_preference: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="for_you">For You</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="following">Following</SelectItem>
            </SelectContent>
          </Select>
          <Select value={settings?.data?.country_code || "AU"} onValueChange={(v) => savePatch({ country_code: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AU">AU</SelectItem>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="GB">GB</SelectItem>
              <SelectItem value="CA">CA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={resetFeed}>Reset my feed</Button>
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <h3 className="font-semibold">Who I'm following</h3>
        {following.map((f) => (
          <div key={f.following_id} className="flex justify-between text-sm">
            <span>{f.profiles?.full_name || f.following_id}</span>
            <Button size="sm" variant="outline" onClick={() => unfollow(f.following_id)}>Unfollow</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

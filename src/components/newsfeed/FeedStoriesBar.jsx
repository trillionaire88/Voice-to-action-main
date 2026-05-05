import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { createPageUrl } from "@/utils";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/button";

export default function FeedStoriesBar() {
  const navigate = useNavigate();
  const { data: stories = [] } = useQuery({
    queryKey: ["feedStoriesBar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const ids = (follows || []).map((f) => f.following_id);
      if (!ids.length) {
        const { data: suggested } = await supabase.from("profiles").select("id,full_name,profile_avatar_url,is_verified").eq("is_verified", true).limit(8);
        return (suggested || []).map((p) => ({ ...p, is_suggested: true }));
      }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: latest } = await supabase
        .from("user_activity")
        .select("user_id,entity_type,entity_id,created_at,profiles:profiles!user_activity_user_id_fkey(full_name,profile_avatar_url,is_verified)")
        .in("user_id", ids)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30);
      return latest || [];
    },
  });

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-3 min-w-max">
        <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl("CreatePetition"))}>+ Add your story</Button>
        {stories.map((s, idx) => {
          const p = s.profiles || s;
          const ring =
            s.entity_type === "petition" ? "ring-blue-500" :
            s.entity_type === "poll" ? "ring-green-500" :
            s.entity_type === "discussion" ? "ring-purple-500" : "ring-slate-300";
          return (
            <button
              key={`${s.user_id || s.id}-${idx}`}
              onClick={() => s.entity_id ? navigate(`/${s.entity_type === "poll" ? "PollDetail" : "PetitionDetail"}?id=${s.entity_id}`) : navigate(`/Profile?user=${s.id}`)}
              className={`rounded-full ring-2 ${ring} p-0.5 flex-shrink-0`}
              title={p.full_name}
            >
              <ProfileAvatar user={{ display_name: p.full_name, profile_avatar_url: p.profile_avatar_url, is_blue_verified: p.is_verified }} size="md" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

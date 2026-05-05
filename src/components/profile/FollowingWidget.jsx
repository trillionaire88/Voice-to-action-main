import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FollowingWidget({ user }) {
  const navigate = useNavigate();

  const { data: followedUsers = [] } = useQuery({
    queryKey: ["homeFollowing", user?.id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!rows?.length) return [];
      const ids = rows.map((r) => r.following_id);
      const { data: profiles, error: pErr } = await supabase.from("public_profiles_view").select("*").in("id", ids);
      if (pErr) throw pErr;
      const map = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      return ids.map((id) => map[id]).filter(Boolean);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (!user || followedUsers.length === 0) return null;

  return (
    <Card className="border-slate-200 mb-6">
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-blue-600" />
            People You Follow
          </CardTitle>
          <button
            onClick={() => navigate(createPageUrl("Profile"))}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-wrap gap-2">
          {followedUsers.map((followedUser) => (
            <button
              key={followedUser.id}
              onClick={() => navigate(createPageUrl("Profile") + `?userId=${followedUser.id}`)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-full px-3 py-1.5 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(followedUser.display_name || followedUser.full_name || "U")[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">
                {followedUser.display_name || followedUser.full_name || "User"}
              </span>
              {followedUser.is_blue_verified && <span className="text-blue-500 text-xs">✓</span>}
              {followedUser.is_public_figure && <span className="text-yellow-500 text-xs">★</span>}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProfileAvatar from "./ProfileAvatar";
import FollowButton from "./FollowButton";

export default function FollowingList({ userId, currentUser }) {
  const navigate = useNavigate();

  const { data: followingRelations = [], isLoading } = useQuery({
    queryKey: ["followingList", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: followingUsers = [] } = useQuery({
    queryKey: ["followingUsers", followingRelations],
    queryFn: async () => {
      if (followingRelations.length === 0) return [];
      const ids = followingRelations.map((f) => f.following_id);
      const { data: profiles, error } = await supabase.from("public_profiles_view").select("*").in("id", ids);
      if (error) throw error;
      const map = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      return ids.map((id) => map[id]).filter(Boolean);
    },
    enabled: followingRelations.length > 0,
  });

  if (isLoading) {
    return (
      <Card className="border-slate-200 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </Card>
    );
  }

  if (followingUsers.length === 0) {
    return (
      <Card className="border-slate-200 p-12 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Not Following Anyone Yet</h3>
        <p className="text-slate-600">
          {currentUser?.id === userId
            ? "Start following users to see their activity"
            : "This user isn't following anyone yet"}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {followingUsers.map((user) => (
        <Card
          key={user.id}
          className="border-slate-200 p-4 hover:border-blue-300 transition-colors cursor-pointer"
          onClick={() => navigate(createPageUrl("Profile") + `?userId=${user.id}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProfileAvatar user={user} size="md" />
              <div>
                <h4 className="font-semibold text-slate-900">{user.display_name}</h4>
                {user.bio && <p className="text-sm text-slate-600 line-clamp-1">{user.bio}</p>}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <FollowButton targetUserId={user.id} currentUser={currentUser} variant="outline" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

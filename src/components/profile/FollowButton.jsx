import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function FollowButton({ targetUserId, currentUser, variant = "default" }) {
  const queryClient = useQueryClient();

  const { data: isFollowing = false } = useQuery({
    queryKey: ["isFollowing", targetUserId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return false;
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!currentUser && !!targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUser.id,
          following_id: targetUserId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["isFollowing"]);
      queryClient.invalidateQueries(["followers"]);
      queryClient.invalidateQueries(["following"]);
      toast.success(isFollowing ? "Unfollowed" : "Following");
    },
    onError: () => {
      toast.error("Failed to update follow status");
    },
  });

  if (!currentUser || currentUser.id === targetUserId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        followMutation.mutate();
      }}
      disabled={followMutation.isPending}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4 mr-2" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
}

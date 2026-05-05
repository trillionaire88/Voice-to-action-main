import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function FollowButton({ targetUserId, currentUser, variant = "default" }) {
  const queryClient = useQueryClient();

  const { data: isFollowing = false } = useQuery({
    queryKey: ["isFollowing", targetUserId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return false;
      const follows = await api.entities.UserFollow.filter({
        follower_user_id: currentUser.id,
        following_user_id: targetUserId,
      });
      return follows.length > 0;
    },
    enabled: !!currentUser && !!targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follows = await api.entities.UserFollow.filter({
          follower_user_id: currentUser.id,
          following_user_id: targetUserId,
        });
        if (follows[0]) {
          await api.entities.UserFollow.delete(follows[0].id);
        }
      } else {
        await api.entities.UserFollow.create({
          follower_user_id: currentUser.id,
          following_user_id: targetUserId,
        });
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
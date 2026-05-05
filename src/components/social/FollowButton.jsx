import React from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function FollowButton({ targetType, targetId, currentUserId, compact = false }) {
  const queryClient = useQueryClient();

  // Fetch current follow state
  const { data: followRecord, isLoading } = useQuery({
    queryKey: ["follow", currentUserId, targetType, targetId],
    queryFn: async () => {
      const res = await api.entities.UserFollow.filter({
        follower_id: currentUserId,
        target_type: targetType,
        target_id: targetId,
      });
      return res[0] || null;
    },
    enabled: !!currentUserId && !!targetId,
    staleTime: 30_000,
  });

  const isFollowing = !!followRecord;

  const mutation = useMutation({
    mutationFn: async () => {
      if (isFollowing && followRecord?.id) {
        await api.entities.UserFollow.delete(followRecord.id);
        return null;
      } else {
        const rec = await api.entities.UserFollow.create({
          follower_id: currentUserId,
          target_type: targetType,
          target_id: targetId,
        });
        // Side-effects (non-blocking)
        if (targetType === "user" && targetId !== currentUserId) {
          api.entities.Notification.create({
            user_id: targetId,
            type: "follow",
            title: "New follower",
            body: "Someone started following you.",
            related_entity_type: "user",
            related_entity_id: currentUserId,
            action_url: "/Profile?id=" + currentUserId,
          }).catch(() => {});
        }
        api.entities.ActivityEvent.create({
          user_id: currentUserId,
          event_type: targetType === "user" ? "followed_user" : "followed_community",
          entity_type: targetType,
          entity_id: targetId,
        }).catch(() => {});
        return rec;
      }
    },
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["follow", currentUserId, targetType, targetId] });
      const previous = queryClient.getQueryData(["follow", currentUserId, targetType, targetId]);
      // Toggle optimistically
      queryClient.setQueryData(
        ["follow", currentUserId, targetType, targetId],
        isFollowing ? null : { id: "optimistic", follower_id: currentUserId, target_type: targetType, target_id: targetId }
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      // Rollback
      queryClient.setQueryData(["follow", currentUserId, targetType, targetId], context.previous);
      toast.error(err.message || "Action failed");
    },
    onSuccess: (data) => {
      // Replace optimistic record with real one (or null on unfollow)
      queryClient.setQueryData(["follow", currentUserId, targetType, targetId], data);
      toast.success(
        isFollowing
          ? "Unfollowed"
          : targetType === "community"
          ? "Following community"
          : "Following user"
      );
    },
  });

  if (!currentUserId || (targetType === "user" && targetId === currentUserId)) return null;
  if (isLoading) return null;

  const label = isFollowing
    ? "Unfollow"
    : targetType === "community"
    ? "Follow Community"
    : "Follow";
  const Icon = isFollowing ? UserMinus : targetType === "community" ? Users : UserPlus;
  const ariaLabel = isFollowing
    ? `Unfollow this ${targetType}`
    : `Follow this ${targetType}`;

  if (compact) {
    return (
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold border transition-all select-none min-h-[44px] ${
          isFollowing
            ? "border-slate-300 text-slate-600 active:border-red-300 active:text-red-600"
            : "border-blue-500 text-blue-600 active:bg-blue-50"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Icon className="w-3 h-3" /> {label}
      </button>
    );
  }

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-label={ariaLabel}
      className={isFollowing ? "active:border-red-300 active:text-red-600" : "bg-blue-600 active:bg-blue-700"}
    >
      <Icon className="w-4 h-4 mr-1" />
      {mutation.isPending ? "…" : label}
    </Button>
  );
}
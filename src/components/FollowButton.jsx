import React, { useState, useEffect } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { followUser, unfollowUser, isFollowing } from "@/api/socialApi";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import ActionButton from "@/components/ui/ActionButton";

export default function FollowButton({ targetUserId, targetName, size = "sm", className = "" }) {
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user && targetUserId && user.id !== targetUserId) {
        isFollowing(targetUserId).then((result) => {
          setFollowing(result);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [targetUserId]);

  if (!currentUser || currentUser.id === targetUserId) return null;

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setLoading(true);
    try {
      if (wasFollowing) {
        await unfollowUser(targetUserId);
        toast.success(`Unfollowed ${targetName || "user"}`);
      } else {
        await followUser(targetUserId);
        toast.success(`Now following ${targetName || "user"}`);
      }
      queryClient.invalidateQueries({ queryKey: ["profileFollowCounts", targetUserId] });
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["profileFollowCounts", currentUser.id] });
      }
    } catch (err) {
      setFollowing(wasFollowing);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionButton
      size={size}
      variant={following ? "outline" : "default"}
      onClick={handleClick}
      loading={loading}
      loadingText=""
      className={`${following ? "border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-600" : "bg-blue-600 hover:bg-blue-700 text-white"} ${className}`}
    >
      {following ? (
        <><UserMinus className="w-3.5 h-3.5 mr-1.5" />Following</>
      ) : (
        <><UserPlus className="w-3.5 h-3.5 mr-1.5" />Follow</>
      )}
    </ActionButton>
  );
}

import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/AuthContext";

const TYPE_COLORS = {
  follow:           "bg-pink-100 text-pink-800",
  message:          "bg-blue-100 text-blue-800",
  reply:            "bg-orange-100 text-orange-800",
  petition_sign:    "bg-emerald-100 text-emerald-800",
  petition_comment: "bg-green-100 text-green-800",
  community_post:   "bg-purple-100 text-purple-800",
  rating:           "bg-yellow-100 text-yellow-800",
  admin_notice:     "bg-red-100 text-red-800",
  poll_result:      "bg-indigo-100 text-indigo-800",
  comment_reply:    "bg-teal-100 text-teal-800",
};

export default function Notifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      try {
        const rows = await api.entities.Notification.filter({ user_id: user.id }, "-created_date", 100);
        return rows || [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id && !isLoadingAuth,
  });

  const markRead = useMutation({
    mutationFn: (id) => api.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => qc.invalidateQueries(["notifications"]),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = (notifications || []).filter(n => !n.is_read);
      await Promise.all(unread.map(n => api.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => qc.invalidateQueries(["notifications"]),
  });

  const deleteNotif = useMutation({
    mutationFn: (id) => api.entities.Notification.delete(id),
    onSuccess: () => qc.invalidateQueries(["notifications"]),
  });

  const unreadCount = (notifications || []).filter(n => !n.is_read).length;

  if (isLoadingAuth) {
    return (
      <div className="min-h-[400px] py-6">
        <SkeletonList count={8} />
      </div>
    );
  }

  if (!user?.id) {
    return (
      <EmptyState
        icon={Bell}
        title="Sign in to see your notifications"
        text="You'll see follows, replies, petition updates and more here."
        action={{ label: "Sign in", onClick: () => navigate("/?signin=1") }}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-7 h-7 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount}</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <Check className="w-4 h-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="min-h-[400px]"><SkeletonList count={8} /></div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          text="When someone follows you, replies, or interacts with your content, you'll see it here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              onClick={() => { if (!n.is_read) markRead.mutate(n.id); if (n.action_url) navigate(n.action_url); }}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${!n.is_read ? "bg-blue-50/60 border-blue-100" : "bg-white border-slate-100"}`}>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-slate-900">{n.title}</span>
                  <Badge className={`text-xs ${TYPE_COLORS[n.type] || "bg-slate-100 text-slate-600"}`}>{n.type?.replace(/_/g,' ')}</Badge>
                </div>
                {n.body && <p className="text-sm text-slate-600">{n.body}</p>}
                <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteNotif.mutate(n.id); }}
                className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

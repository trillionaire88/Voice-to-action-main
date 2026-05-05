import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MobileBottomSheet from "@/components/ui/MobileBottomSheet";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";

// Shared notification list content
function NotificationList({ notifications, onNotificationClick, onMarkAsRead, onMarkAllRead, onViewAll }) {
  return (
    <>
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
        <Button size="sm" variant="ghost" onClick={onMarkAllRead} className="text-xs">
          Mark all as read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No notifications yet</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              role="button"
              tabIndex={0}
              aria-label={notif.title}
              onClick={() => onNotificationClick(notif)}
              onKeyDown={(e) => { if (e.key === "Enter") onNotificationClick(notif); }}
              className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.is_read ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{notif.title}</p>
                  {notif.body && <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{notif.body}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                  </p>
                </div>
                {!notif.is_read && (
                  <button
                    aria-label="Mark as read"
                    className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors flex-shrink-0"
                    onClick={(e) => onMarkAsRead(e, notif.id)}
                  >
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 p-2">
        <Button variant="ghost" className="w-full justify-center text-xs text-blue-600" onClick={onViewAll}>
          View all notifications
        </Button>
      </div>
    </>
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const queryKey = ["userNotifications", user?.id];

  const { data: notifications = [] } = useQuery({
    queryKey,
    queryFn: () =>
      user
        ? api.entities.Notification.filter({ user_id: user.id }, "-created_date", 10)
        : Promise.resolve([]),
    enabled: !!user,
    refetchInterval: open ? 5000 : 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Optimistic helper — mark one or all as read in cache immediately
  const markReadOptimistic = (idOrAll) => {
    queryClient.setQueryData(queryKey, (old = []) =>
      old.map((n) =>
        idOrAll === "all" || n.id === idOrAll ? { ...n, is_read: true } : n
      )
    );
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      markReadOptimistic(notification.id);
      await api.entities.Notification.update(notification.id, { is_read: true });
    }
    if (notification.action_url) navigate(notification.action_url);
    setOpen(false);
  };

  const handleMarkAsRead = async (e, notificationId) => {
    e.stopPropagation();
    markReadOptimistic(notificationId);
    await api.entities.Notification.update(notificationId, { is_read: true });
  };

  const handleMarkAllRead = async () => {
    markReadOptimistic("all");
    await Promise.all(
      notifications.filter((n) => !n.is_read).map((n) =>
        api.entities.Notification.update(n.id, { is_read: true })
      )
    );
  };

  const handleViewAll = () => {
    navigate(createPageUrl("Notifications"));
    setOpen(false);
  };

  if (!user) return null;

  const bellButton = (
    <button
      aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
      onClick={() => setOpen(true)}
      className="relative h-11 w-11 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
    >
      <Bell className="w-4 h-4 text-slate-700" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs rounded-full">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </button>
  );

  const sharedProps = { notifications, onNotificationClick: handleNotificationClick, onMarkAsRead: handleMarkAsRead, onMarkAllRead: handleMarkAllRead, onViewAll: handleViewAll };

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="md:hidden">
        {bellButton}
        <MobileBottomSheet open={open} onClose={() => setOpen(false)} title="Notifications" maxHeight="80vh">
          <NotificationList {...sharedProps} />
        </MobileBottomSheet>
      </div>

      {/* Desktop: dropdown */}
      <div className="hidden md:block">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
              className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors md:h-9 md:w-9"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-0">
            <NotificationList {...sharedProps} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
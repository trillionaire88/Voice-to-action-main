import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
      } catch {}
    };
    loadUser();
  }, []);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["allNotifications", user?.id],
    queryFn: () =>
      user
        ? api.entities.Notification.filter(
            { user_id: user.id },
            "-created_date",
            100
          )
        : Promise.resolve([]),
    enabled: !!user,
  });

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const handleMarkAsRead = async (notificationId, isRead) => {
    await api.entities.Notification.update(notificationId, {
      is_read: !isRead,
    });
    refetch();
  };

  const handleDelete = async (notificationId) => {
    await api.entities.Notification.delete(notificationId);
    refetch();
  };

  const handleMarkAllAsRead = async () => {
    for (const notif of notifications.filter((n) => !n.is_read)) {
      await api.entities.Notification.update(notif.id, {
        is_read: true,
      });
    }
    refetch();
  };

  const typeIcons = {
    milestone: "🎯",
    poll_update: "📊",
    new_petition_category: "📝",
    system: "⚙️",
    message: "💬",
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            Please log in to view notifications.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={!notifications.some((n) => !n.is_read)}
            >
              <Check className="w-4 h-4 mr-1" />
              Mark all as read
            </Button>
          </div>
        </CardHeader>

        <div className="border-t border-slate-200 px-6 py-3 flex gap-2 bg-slate-50">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({notifications.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => setFilter("unread")}
          >
            Unread ({notifications.filter((n) => !n.is_read).length})
          </Button>
        </div>

        <CardContent className="pt-0">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">
                {filter === "unread"
                  ? "You're all caught up!"
                  : "Start engaging with petitions and polls."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 mt-4">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`py-4 px-0 flex gap-3 transition-colors ${
                    !notif.is_read ? "bg-blue-50/30" : ""
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">
                    {typeIcons[notif.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          {notif.title}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {notif.body}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatDistanceToNow(new Date(notif.created_date), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!notif.is_read && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        handleMarkAsRead(notif.id, notif.is_read)
                      }
                    >
                      <Check
                        className={`w-4 h-4 ${
                          notif.is_read
                            ? "text-slate-300"
                            : "text-blue-600"
                        }`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(notif.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
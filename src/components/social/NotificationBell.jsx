import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter(n => !n.is_read).length;

  const load = () => {
    if (!userId) return;
    api.entities.Notification.filter({ user_id: userId }, "-created_date", 20)
      .then(setNotifications).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const markRead = async (n) => {
    if (!n.is_read) {
      await api.entities.Notification.update(n.id, { is_read: true }).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
  };

  const markAllRead = async () => {
    const unreadOnes = notifications.filter(n => !n.is_read);
    await Promise.all(unreadOnes.map(n => api.entities.Notification.update(n.id, { is_read: true }).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (!userId) return null;

  return (
    <div className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
        <Bell className="w-5 h-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-semibold text-slate-900">Notifications</span>
              {unread > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No notifications</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id}
                    onClick={() => { markRead(n); setOpen(false); }}
                    className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-blue-50/60" : ""}`}>
                    <div className="flex items-start gap-2">
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        {n.body && <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>}
                        <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-slate-100">
              <Link to="/Notifications" onClick={() => setOpen(false)} className="text-xs text-blue-600 hover:underline">View all notifications</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
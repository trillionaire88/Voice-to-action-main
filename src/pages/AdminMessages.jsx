import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminMessages() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me().then(u => {
      if (u?.role !== "admin" && u?.role !== "owner_admin") {
        navigate("/");
        return;
      }
      setCurrentUser(u);
      loadAllMessages();
    });
  }, []);

  const loadAllMessages = async () => {
    setLoading(true);
    const msgs = await api.entities.Message.list("-date_sent", 500);
    setMessages(msgs);
    const ids = [...new Set([...msgs.map(m => m.sender_id), ...msgs.map(m => m.receiver_id)].filter(Boolean))];
    const cache = {};
    await Promise.all(ids.map(async id => {
      const res = await api.entities.User.filter({ id }, "-created_date", 1);
      if (res[0]) cache[id] = res[0];
    }));
    setUserCache(cache);
    setLoading(false);
  };

  const filtered = messages.filter(m => {
    const q = search.toLowerCase();
    if (!q) return true;
    const sender = userCache[m.sender_id];
    const receiver = userCache[m.receiver_id];
    return (
      sender?.full_name?.toLowerCase().includes(q) ||
      receiver?.full_name?.toLowerCase().includes(q) ||
      (m.message_text || m.text || "").toLowerCase().includes(q)
    );
  });

  const getName = (id) => userCache[id]?.full_name || id?.substring(0, 8) || "Unknown";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin: All Messages</h1>
          <p className="text-sm text-slate-500">{messages.length} total messages</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by user name or message content…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-16"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <Card><CardContent className="py-12 text-center text-slate-400">No messages found</CardContent></Card>
          )}
          {filtered.map(msg => (
            <Card key={msg.id} className="border-slate-200">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{getName(msg.sender_id)}</Badge>
                      <span className="text-xs text-slate-400">→</span>
                      <Badge className="bg-slate-100 text-slate-700 text-xs">{getName(msg.receiver_id)}</Badge>
                      <span className="text-xs text-slate-400 ml-auto">
                        {msg.date_sent || msg.created_date
                          ? formatDistanceToNow(new Date(msg.date_sent || msg.created_date), { addSuffix: true })
                          : ""}
                      </span>
                    </div>
                    {(msg.message_text || msg.text) && (
                      <p className="text-sm text-slate-700">{msg.message_text || msg.text}</p>
                    )}
                    {(msg.message_image || msg.image_url) && (
                      <img src={msg.message_image || msg.image_url} alt="img" className="mt-1 h-20 rounded object-cover" />
                    )}
                    {!msg.is_read && <Badge className="mt-1 bg-orange-100 text-orange-700 text-xs">Unread</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
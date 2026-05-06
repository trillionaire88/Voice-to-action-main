import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MessageSettings() {
  const [userId, setUserId] = useState("");
  const [showReceipts, setShowReceipts] = useState(true);
  const [followersOnly, setFollowersOnly] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: cp }, { data: profile }, { data: blockedRows }] = await Promise.all([
      supabase.from("conversation_participants").select("show_read_receipts").eq("user_id", user.id).limit(1),
      supabase.from("profiles").select("messages_from_followers_only").eq("id", user.id).maybeSingle(),
      supabase.from("blocked_users").select("id,blocked_user_id,profiles:profiles!blocked_users_blocked_user_id_fkey(full_name)").eq("user_id", user.id),
    ]);
    if (cp?.[0]) setShowReceipts(!!cp[0].show_read_receipts);
    setFollowersOnly(!!profile?.messages_from_followers_only);
    setBlocked(blockedRows || []);
  };

  useEffect(() => { load(); }, []);

  const updateReadReceipts = async (v) => {
    setShowReceipts(v);
    await supabase.from("conversation_participants").update(cleanForDB({ show_read_receipts: v })).eq("user_id", userId);
    toast.success("Read receipt preference updated.");
  };

  const updateFollowersOnly = async (v) => {
    setFollowersOnly(v);
    await supabase.from("profiles").update(cleanForDB({ messages_from_followers_only: v })).eq("id", userId);
    toast.success("Message request preference updated.");
  };

  const clearConversations = async () => {
    await supabase.from("conversation_participants").delete().eq("user_id", userId);
    setConfirmClearOpen(false);
    toast.success("Conversations cleared for your account.");
  };

  const unblock = async (id) => {
    await supabase.from("blocked_users").delete().eq("id", id);
    setBlocked((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Message Settings</h1>
      <Card>
        <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Show read receipts to everyone</span>
            <Switch checked={showReceipts} onCheckedChange={updateReadReceipts} />
          </div>
          <div className="flex items-center justify-between">
            <span>Only receive messages from people I follow</span>
            <Switch checked={followersOnly} onCheckedChange={updateFollowersOnly} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Block List</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {blocked.length === 0 ? (
            <p className="text-sm text-slate-500">No blocked users.</p>
          ) : blocked.map((b) => (
            <div key={b.id} className="flex items-center justify-between border rounded-md p-2">
              <span>{b.profiles?.full_name || b.blocked_user_id}</span>
              <Button size="sm" variant="outline" onClick={() => unblock(b.id)}>Unblock</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirmClearOpen(true)}>Clear all conversations</Button>
        </CardContent>
      </Card>
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-conv-title"
        >
          <Card className="max-w-md w-full shadow-xl border-slate-200">
            <CardHeader>
              <CardTitle id="clear-conv-title">Clear all conversations?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                This permanently removes your participation from every conversation. Other participants may still see past messages.
              </p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
                <Button type="button" variant="destructive" onClick={() => clearConversations()}>Clear everything</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

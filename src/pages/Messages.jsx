import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Search, Send, Paperclip, Image as ImageIcon, MessageSquare, Plus, Pencil, Phone, Video, MoreHorizontal, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { checkRateLimit } from "@/lib/rateLimit";
import { sanitiseText } from "@/lib/sanitise";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import LazyImage from "@/components/ui/LazyImage";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(searchParams.get("conversation") || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const listRef = useRef(null);
  const typingTimerRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const filteredMessages = useMemo(() => {
    if (!chatSearch.trim()) return messages;
    return messages.filter((m) => (m.content || "").toLowerCase().includes(chatSearch.toLowerCase()));
  }, [messages, chatSearch]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !authUser?.id) {
      setConversations([]);
      setIsLoadingConversations(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id,last_read_at,is_muted,show_read_receipts,conversations:conversations(*)")
        .eq("user_id", authUser.id)
        .order("joined_at", { ascending: false });
      if (error) {
        setConversations([]);
      } else {
        const rows = (data || []).map((r) => ({
          id: r.conversation_id,
          ...r.conversations,
          participant: { last_read_at: r.last_read_at, is_muted: r.is_muted, show_read_receipts: r.show_read_receipts },
        }));
        rows.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
        setConversations(rows);
        if (!activeId && rows[0]) setActiveId(rows[0].id);
      }
    } catch {
      setConversations([]);
    }
    setIsLoadingConversations(false);
  };

  const loadMessages = async (conversationId, append = false) => {
    if (!conversationId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50);
    const next = (data || []).reverse();
    setMessages((prev) => append ? [...next, ...prev] : next);
  };

  const markAsRead = async (conversationId) => {
    if (!authUser || !conversationId) return;
    try {
      await supabase
        .from("conversation_participants")
        .update(cleanForDB({ last_read_at: new Date().toISOString() }))
        .eq("conversation_id", conversationId)
        .eq("user_id", authUser.id);
    } catch {
      // Non-critical — unread badge may be stale but won't crash the page
    }
  };

  useEffect(() => {
    if (!isLoadingAuth && authUser) loadConversations();
    if (!isLoadingAuth && !authUser) {
      setConversations([]);
      setIsLoadingConversations(false);
    }
  }, [isLoadingAuth, authUser?.id]);
  useEffect(() => { if (activeId && authUser?.id) { loadMessages(activeId); markAsRead(activeId); } }, [activeId, authUser?.id]);

  useEffect(() => {
    if (!activeId || !authUser?.id) return;
    const ch1 = supabase.channel(`messages:${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (p) => {
        setMessages((prev) => [...prev, p.new]);
        if (document.hasFocus()) markAsRead(activeId);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (p) => {
        setMessages((prev) => prev.map((m) => m.id === p.new.id ? p.new : m));
      })
      .subscribe();
    const ch2 = supabase.channel(`typing:${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "typing_indicators", filter: `conversation_id=eq.${activeId}` }, (p) => {
        setTypingUsers((prev) => prev.includes(p.new.user_id) ? prev : [...prev, p.new.user_id]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "typing_indicators", filter: `conversation_id=eq.${activeId}` }, (p) => {
        setTypingUsers((prev) => prev.filter((id) => id !== p.old.user_id));
      })
      .subscribe();
    const ch3 = supabase.channel(`conv-list:${authUser?.id || "anon"}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => loadConversations())
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [activeId, authUser?.id]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const onScroll = () => {
      const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
      setShowScrollDown(!atBottom);
      if (node.scrollTop < 30 && messages.length >= 50) loadMessages(activeId, true);
    };
    node.addEventListener("scroll", onScroll);
    return () => node.removeEventListener("scroll", onScroll);
  }, [messages.length, activeId]);

  const send = async () => {
    if (!activeId || (!input.trim() && !file) || !authUser) return;
    const { allowed } = checkRateLimit("send_message", 60, 60 * 1000);
    if (!allowed) {
      toast.error("You're sending messages too quickly. Please slow down.");
      return;
    }
    let contentType = "text";
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    if (file) {
      const path = `${activeId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file, { upsert: true });
      if (error) return toast.error(error.message);
      const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
      fileUrl = data.publicUrl;
      fileName = file.name;
      fileSize = file.size;
      contentType = file.type.startsWith("image/") ? "image" : "file";
    }
    const safeContent = sanitiseText(input.trim(), 5000);
    const { error } = await supabase.from("messages").insert(cleanForDB({
      conversation_id: activeId,
      sender_id: authUser.id,
      content: safeContent || undefined,
      content_type: contentType,
      file_url: fileUrl || undefined,
      file_name: fileName || undefined,
      file_size: fileSize || undefined,
    }));
    if (error) return toast.error(error.message);
    setInput("");
    setFile(null);
  };

  const emitTyping = async () => {
    if (!activeId || !authUser) return;
    await supabase.from("typing_indicators").upsert(cleanForDB({
      conversation_id: activeId,
      user_id: authUser.id,
      started_at: new Date().toISOString(),
    }), { onConflict: "conversation_id,user_id" });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(async () => {
      await supabase.from("typing_indicators").delete().eq("conversation_id", activeId).eq("user_id", authUser.id);
    }, 3000);
  };

  const searchUsers = async (q) => {
    setUserSearch(q);
    if (!q.trim()) return setUsers([]);
    const raw = q.trim();
    const safe = raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const p = `%${safe}%`;
    const { data } = await supabase
      .from("public_profiles_view")
      .select("id,full_name,display_name,avatar_url")
      .or(`full_name.ilike.${p},display_name.ilike.${p}`)
      .limit(15);
    setUsers(data || []);
  };

  const openDirect = async (otherId) => {
    const { data: convId, error } = await supabase.rpc("get_or_create_direct_conversation", { other_user_id: otherId });
    if (error) return toast.error(error.message);
    setNewChatOpen(false);
    await loadConversations();
    setActiveId(convId);
    navigate(`/Messages?conversation=${convId}`);
  };

  const createGroup = async () => {
    if (!groupName.trim() || !selectedMembers.length || !authUser) return toast.error("Set group name and members.");
    const { data: conv, error } = await supabase.from("conversations").insert(cleanForDB({
      type: "group",
      name: sanitiseText(groupName.trim(), 200),
      created_by: authUser.id,
    })).select("id").single();
    if (error) return toast.error(error.message);
    const payload = [
      { conversation_id: conv.id, user_id: authUser.id, is_admin: true },
      ...selectedMembers.map((id) => ({ conversation_id: conv.id, user_id: id, is_admin: false })),
    ];
    await supabase.from("conversation_participants").insert(payload.map(r => cleanForDB(r)));
    setGroupOpen(false);
    setGroupName("");
    setSelectedMembers([]);
    await loadConversations();
    setActiveId(conv.id);
  };

  const addReaction = async (messageId, emoji) => {
    const safeEmoji = sanitiseText(String(emoji || ""), 32);
    if (!safeEmoji) return;
    await supabase.from("message_reactions").upsert(cleanForDB({ message_id: messageId, user_id: authUser.id, emoji: safeEmoji }), { onConflict: "message_id,user_id,emoji" });
  };

  const deleteMsg = async (message) => {
    if (message.sender_id !== authUser.id) return;
    await supabase.from("messages").update(cleanForDB({ is_deleted: true, content: "This message was deleted", deleted_at: new Date().toISOString() })).eq("id", message.id);
  };

  if (isLoadingAuth) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!authUser) {
    return <div className="p-8 text-center text-slate-500">Please sign in to use messages.</div>;
  }

  return (
    <div className="h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] overflow-hidden py-0 -mx-[var(--page-padding-x)] px-0 max-w-none">
      <div className="h-full max-w-[1400px] mx-auto border-x border-slate-200 bg-white flex">
        <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-[350px] border-r border-slate-200 flex-col`}>
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input className="pl-9" placeholder="Search conversations and users" />
              </div>
              <Button size="icon" variant="outline" onClick={() => setNewChatOpen(true)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="outline" onClick={() => setGroupOpen(true)}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 min-h-[400px]">
            {isLoadingConversations ? <SkeletonList count={6} /> : conversations.map((c) => (
              <button key={c.id} className={`w-full text-left p-3 border-b hover:bg-slate-50 ${activeId === c.id ? "bg-blue-50" : ""}`} onClick={() => setActiveId(c.id)}>
                <div className="flex items-center gap-3">
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={c.avatar_url} />
                    <AvatarFallback>{(c.name || "D")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-semibold text-sm truncate">{c.type === "group" ? c.name : c.name || "Direct chat"}</p>
                      <span className="text-[10px] text-slate-400">{c.last_message_at ? (isToday(new Date(c.last_message_at)) ? format(new Date(c.last_message_at), "p") : format(new Date(c.last_message_at), "dd/MM")) : ""}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.last_message_text || "No messages yet"}</p>
                  </div>
                  {c.participant?.is_muted && <span className="text-xs text-slate-400">🔕</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${activeId ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
          {!activeConversation ? (
            <div className="h-full flex items-center justify-center text-slate-400"><MessageSquare className="w-10 h-10 mr-2" />Pick a conversation</div>
          ) : (
            <>
              <header className="h-14 border-b flex items-center justify-between px-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveId("")}><ArrowLeft className="w-4 h-4" /></Button>
                  <Avatar className="w-8 h-8"><AvatarImage src={activeConversation.avatar_url} /><AvatarFallback>{(activeConversation.name || "C")[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{activeConversation.type === "group" ? activeConversation.name : activeConversation.name || "Direct chat"}</p>
                    <p className="text-[11px] text-slate-500">{activeConversation.type === "group" ? "Group chat" : "Direct message"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon"><Phone className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Video className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowChatSearch((v) => !v)}><Search className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
              </header>

              {showChatSearch && (
                <div className="border-b p-2 flex items-center gap-2">
                  <Input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search in conversation..." />
                  <Badge variant="secondary">{filteredMessages.length} results</Badge>
                </div>
              )}

              <div ref={listRef} className="flex-1 overflow-y-auto bg-slate-50 p-3 space-y-2">
                {filteredMessages.map((m) => {
                  const own = m.sender_id === authUser.id;
                  return (
                    <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${own ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border rounded-bl-sm"}`}>
                        {m.reply_to_id && <div className="text-[10px] opacity-70 border-l-2 pl-2 mb-1">Reply</div>}
                        {m.content_type === "image" && m.file_url && <LazyImage src={m.file_url} alt={m.file_name || "image"} className="max-w-[250px] rounded-md mb-1" aspectRatio="4/3" />}
                        {m.content_type === "file" && (
                          <a href={m.file_url} target="_blank" rel="noreferrer" className="block border rounded-md p-2 text-xs mb-1 bg-white/70 text-slate-700">
                            📎 {m.file_name} ({Math.round((m.file_size || 0) / 1024)} KB)
                          </a>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        <div className={`text-[10px] mt-1 ${own ? "text-blue-100" : "text-slate-400"} flex items-center justify-end gap-1`}>
                          {format(new Date(m.created_at), "p")}
                          <span>✓✓</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {REACTIONS.map((r) => (
                            <button key={r} className="text-xs" onClick={() => addReaction(m.id, r)}>{r}</button>
                          ))}
                          {own && <button className="text-xs underline opacity-70 ml-2" onClick={() => deleteMsg(m)}>Delete</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typingUsers.filter((id) => id !== authUser.id).length > 0 && (
                  <div className="text-xs text-slate-500">Someone is typing<span className="animate-pulse">...</span></div>
                )}
              </div>

              {showScrollDown && (
                <button onClick={() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })} className="absolute bottom-24 right-6 bg-white border rounded-full p-2 shadow">
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}

              {file && (
                <div className="border-t px-3 py-2 text-xs flex items-center justify-between">
                  <span>Attachment: {file.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remove</Button>
                </div>
              )}
              <footer className="border-t p-2 flex items-end gap-2">
                <label><input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Button variant="ghost" size="icon" asChild><span><Paperclip className="w-4 h-4" /></span></Button></label>
                <label><input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Button variant="ghost" size="icon" asChild><span><ImageIcon className="w-4 h-4" /></span></Button></label>
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); emitTyping(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  className="flex-1 min-h-[38px] max-h-32 border rounded-md px-3 py-2 text-sm"
                  placeholder="Type a message"
                />
                <Button onClick={send} disabled={!input.trim() && !file} className="bg-blue-600 hover:bg-blue-700"><Send className="w-4 h-4" /></Button>
              </footer>
            </>
          )}
        </section>
      </div>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
          <Input value={userSearch} onChange={(e) => searchUsers(e.target.value)} placeholder="Search users" />
          <div className="max-h-80 overflow-y-auto space-y-1 mt-2">
            {users.map((u) => (
              <button key={u.id} className="w-full text-left p-2 rounded hover:bg-slate-50 flex items-center gap-2" onClick={() => openDirect(u.id)}>
                <Avatar className="w-7 h-7"><AvatarImage src={u.avatar_url} /><AvatarFallback>{((u.display_name || u.full_name) || "U")[0]}</AvatarFallback></Avatar>
                <span className="text-sm">{u.display_name || u.full_name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Group</DialogTitle></DialogHeader>
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" />
          <Input value={userSearch} onChange={(e) => searchUsers(e.target.value)} placeholder="Search members" />
          <div className="max-h-60 overflow-y-auto">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={selectedMembers.includes(u.id)} onChange={(e) => setSelectedMembers((prev) => e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id))} />
                {u.display_name || u.full_name}
              </label>
            ))}
          </div>
          <Button onClick={createGroup}>Create Group</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

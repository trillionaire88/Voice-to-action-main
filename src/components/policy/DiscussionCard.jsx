import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp, MessageCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import VerificationGate from "@/components/auth/VerificationGate";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sanitiseText } from "@/lib/sanitise";

const AREA_COLORS = {
  healthcare: "bg-red-50 text-red-700 border-red-200",
  environment: "bg-green-50 text-green-700 border-green-200",
  economy: "bg-yellow-50 text-yellow-700 border-yellow-200",
  education: "bg-blue-50 text-blue-700 border-blue-200",
  housing: "bg-orange-50 text-orange-700 border-orange-200",
  immigration: "bg-purple-50 text-purple-700 border-purple-200",
  defense: "bg-slate-100 text-slate-700 border-slate-200",
  taxation: "bg-amber-50 text-amber-700 border-amber-200",
  technology: "bg-cyan-50 text-cyan-700 border-cyan-200",
  social_welfare: "bg-pink-50 text-pink-700 border-pink-200",
  justice: "bg-indigo-50 text-indigo-700 border-indigo-200",
  infrastructure: "bg-teal-50 text-teal-700 border-teal-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

async function fetchFromReplyTable(table, discussionId) {
  let { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: false });
  if (error?.code === "42703" || error?.message?.includes("created_at")) {
    const r2 = await supabase
      .from(table)
      .select("*")
      .eq("discussion_id", discussionId)
      .order("created_date", { ascending: false });
    if (r2.error?.code === "42P01" || r2.error?.message?.includes("does not exist")) return { missingTable: true, data: [] };
    return { missingTable: false, data: r2.data || [] };
  }
  if (error?.code === "42P01" || error?.message?.includes("does not exist")) return { missingTable: true, data: [] };
  if (error) return { missingTable: false, data: [] };
  return { missingTable: false, data: data || [] };
}

async function fetchReplies(discussionId) {
  let r = await fetchFromReplyTable("policy_discussion_replies", discussionId);
  if (r.missingTable) r = await fetchFromReplyTable("discussion_replies", discussionId);
  return r.data || [];
}

async function updateDiscussionTable(id, patch) {
  let { error } = await supabase.from("policy_discussions").update(cleanForDB(patch)).eq("id", id);
  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    const r2 = await supabase.from("discussions").update(cleanForDB(patch)).eq("id", id);
    error = r2.error;
  }
  if (error) throw new Error(error.message);
}

async function insertReply(row) {
  let { error } = await supabase.from("policy_discussion_replies").insert(cleanForDB(row));
  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    const r2 = await supabase.from("discussion_replies").insert(cleanForDB(row));
    error = r2.error;
  }
  if (error) throw new Error(error.message);
}

export default function DiscussionCard({ discussion, user }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  const { data: replies = [] } = useQuery({
    queryKey: ["replies", discussion.id],
    queryFn: () => fetchReplies(discussion.id),
    enabled: showReplies,
  });

  const upvoteMutation = useMutation({
    mutationFn: () =>
      updateDiscussionTable(discussion.id, { upvotes: (discussion.upvotes || 0) + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["policyDiscussions"] }),
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Sign in required");
      if (!replyText.trim()) throw new Error("Reply cannot be empty");
      await insertReply({
        discussion_id: discussion.id,
        body: sanitiseText(replyText, 50000),
        author_name: sanitiseText(user?.full_name || user?.display_name || "Anonymous", 200),
        author_user_id: authUser.id,
      });
      await updateDiscussionTable(discussion.id, {
        reply_count: (discussion.reply_count || 0) + 1,
      });
    },
    onSuccess: async () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["replies", discussion.id] });
      queryClient.invalidateQueries({ queryKey: ["policyDiscussions"] });
    },
  });

  const created = discussion.created_date || discussion.created_at;
  const areaLabel = discussion.policy_area?.replace(/_/g, " ");
  const areaColor = AREA_COLORS[discussion.policy_area] || AREA_COLORS.other;

  return (
    <Card className="hover:shadow-md transition-shadow border-slate-200">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
              {(discussion.author_name || "A")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-slate-900">{discussion.author_name || "Anonymous"}</span>
              <span className="text-xs text-slate-400">
                {created ? formatDistanceToNow(new Date(created), { addSuffix: true }) : ""}
              </span>
              {discussion.is_pinned && <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Pinned</Badge>}
            </div>
            <Badge className={`text-xs capitalize ${areaColor}`}>{areaLabel}</Badge>
          </div>
        </div>

        <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">{discussion.title}</h3>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{discussion.body}</p>

        {discussion.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {discussion.tags.map((tag) => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-blue-600 gap-1.5 h-8 px-2"
            onClick={() => upvoteMutation.mutate()}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="text-xs">{discussion.upvotes || 0}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-blue-600 gap-1.5 h-8 px-2"
            onClick={() => setShowReplies(!showReplies)}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-xs">{discussion.reply_count || 0} replies</span>
            {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {showReplies && (
          <div className="mt-4 space-y-3 pl-4 border-l-2 border-blue-100">
            {replies.map((reply) => {
              const rd = reply.created_date || reply.created_at;
              return (
                <div key={reply.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                      {(reply.author_name || "A")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-slate-50 rounded-xl px-3 py-2 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{reply.author_name || "Anonymous"}</span>
                      <span className="text-xs text-slate-400">
                        {rd ? formatDistanceToNow(new Date(rd), { addSuffix: true }) : ""}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{reply.body}</p>
                  </div>
                </div>
              );
            })}

            <VerificationGate user={user} requireFullVerification={!!(discussion.verified_only)} action="reply">
              <div className="flex gap-2.5 mt-3">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                    {(user?.full_name || user?.display_name || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="text-sm min-h-[60px] resize-none bg-white text-slate-900 border-slate-300"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 bg-blue-600 hover:bg-blue-700 flex-shrink-0 self-end"
                    disabled={!replyText.trim() || replyMutation.isPending}
                    onClick={() => replyMutation.mutate()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </VerificationGate>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

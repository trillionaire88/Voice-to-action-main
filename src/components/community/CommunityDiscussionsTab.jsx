import { useState, useCallback } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/ui/PullToRefresh";
import VirtualFeed from "@/components/ui/VirtualFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/ui/MobileSelect";
import { MessageSquare, Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const TYPE_LABELS = {
  complaint: { label: "Complaint", color: "bg-red-100 text-red-700" },
  feedback: { label: "Feedback", color: "bg-blue-100 text-blue-700" },
  question: { label: "Question", color: "bg-yellow-100 text-yellow-700" },
  issue: { label: "Issue", color: "bg-orange-100 text-orange-700" },
  general: { label: "General", color: "bg-slate-100 text-slate-700" },
};

function DiscussionItem({ discussion, currentUser, communityId }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyBox, setShowReplyBox] = useState(false);

  const { data: replies = [] } = useQuery({
    queryKey: ["discussionReplies", discussion.id],
    queryFn: () => api.entities.DiscussionReply.filter({ discussion_id: discussion.id }, "created_date", 50),
    enabled: expanded,
  });

  const addReplyMutation = useMutation({
    mutationFn: () => api.entities.DiscussionReply.create({
      discussion_id: discussion.id,
      author_user_id: currentUser.id,
      body: replyText.trim(),
    }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["communityDiscussions", communityId] });
      const prev = queryClient.getQueryData(["communityDiscussions", communityId]);
      queryClient.setQueryData(["communityDiscussions", communityId], (old = []) =>
        old.map(d => d.id === discussion.id ? { ...d, reply_count: (d.reply_count || 0) + 1 } : d)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["communityDiscussions", communityId], context.prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussionReplies", discussion.id] });
      queryClient.invalidateQueries({ queryKey: ["communityDiscussions", communityId] });
      api.entities.CommunityDiscussion.update(discussion.id, { reply_count: (discussion.reply_count || 0) + 1 });
      setReplyText("");
      setShowReplyBox(false);
      toast.success("Reply posted");
    },
  });

  const typeInfo = TYPE_LABELS[discussion.discussion_type] || TYPE_LABELS.general;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
              <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(discussion.created_date), { addSuffix: true })}</span>
            </div>
            <h4 className="font-semibold text-slate-900">{discussion.title}</h4>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{discussion.body}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {discussion.reply_count || 0} replies
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {currentUser && (
            <button
              onClick={() => { setExpanded(true); setShowReplyBox(true); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Reply
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 pl-3 border-l-2 border-slate-100">
            {replies.map(r => (
              <div key={r.id} className="text-sm">
                <p className="text-xs text-slate-400 mb-0.5">{formatDistanceToNow(new Date(r.created_date), { addSuffix: true })}</p>
                <p className="text-slate-700">{r.body}</p>
              </div>
            ))}
            {showReplyBox && currentUser && (
              <div className="space-y-2 pt-2">
                <Textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addReplyMutation.mutate()} disabled={!replyText.trim() || addReplyMutation.isPending}>
                    Post Reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReplyBox(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunityDiscussionsTab({ communityId, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["communityDiscussions", communityId] });
  }, [queryClient, communityId]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("general");
  const [filter, setFilter] = useState("all");

  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ["communityDiscussions", communityId],
    queryFn: () => api.entities.CommunityDiscussion.filter({ community_id: communityId, is_removed: false }, "-created_date", 50),
    enabled: !!communityId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.entities.CommunityDiscussion.create({
      community_id: communityId,
      author_user_id: user.id,
      title: title.trim(),
      body: body.trim(),
      discussion_type: type,
    }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["communityDiscussions", communityId] });
      const previous = queryClient.getQueryData(["communityDiscussions", communityId]);
      const optimistic = {
        id: "optimistic-" + Date.now(),
        community_id: communityId,
        author_user_id: user.id,
        title: title.trim(),
        body: body.trim(),
        discussion_type: type,
        reply_count: 0,
        like_count: 0,
        is_pinned: false,
        is_removed: false,
        created_date: new Date().toISOString(),
      };
      queryClient.setQueryData(["communityDiscussions", communityId], (old = []) => [optimistic, ...old]);
      setTitle(""); setBody(""); setType("general"); setShowForm(false);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["communityDiscussions", communityId], context.previous);
      toast.error("Failed to post discussion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityDiscussions", communityId] });
      toast.success("Discussion posted!");
    },
  });

  const filtered = filter === "all" ? discussions : discussions.filter(d => d.discussion_type === filter);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "complaint", "feedback", "question", "issue", "general"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {f === "all" ? "All" : TYPE_LABELS[f]?.label}
            </button>
          ))}
        </div>
        {user && (
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> New Discussion
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && user && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Create Discussion</CardTitle>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Type</Label>
              <MobileSelect
                value={type}
                onValueChange={setType}
                options={[
                  { value: "general", label: "General" },
                  { value: "complaint", label: "Complaint" },
                  { value: "feedback", label: "Feedback" },
                  { value: "question", label: "Question" },
                  { value: "issue", label: "Issue" },
                ]}
                placeholder="General"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's this discussion about?" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Details *</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your issue, feedback or question..." rows={4} />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !body.trim() || createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Posting..." : "Post Discussion"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Discussions list */}
      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-sm">Loading discussions...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Discussions Yet</h3>
            <p className="text-slate-500 text-sm mb-4">Be the first to post a complaint, question or feedback</p>
            {user && <Button onClick={() => setShowForm(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> Start Discussion</Button>}
          </CardContent>
        </Card>
      ) : (
        <VirtualFeed
          items={filtered}
          columns={1}
          rowHeight={160}
          threshold={20}
          gridClassName="space-y-3"
          renderItem={({ item: d }) => (
            <DiscussionItem discussion={d} currentUser={user} communityId={communityId} />
          )}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
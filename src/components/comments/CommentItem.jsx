import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CommentItem({ comment }) {
  const displayName = comment?.is_anonymous_display ? "Anonymous" : "Community member";
  return (
    <article className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 bg-gradient-to-br from-slate-400 to-slate-500">
          <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
            {displayName[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-slate-900 text-sm">{displayName}</span>
            <span className="text-xs text-slate-500 ml-auto">
              {comment?.created_date ? formatDistanceToNow(new Date(comment.created_date), { addSuffix: true }) : "now"}
            </span>
          </div>
          <p className="text-slate-700 text-sm whitespace-pre-wrap">
            {comment?.body_text || "Comments coming soon"}
          </p>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Comments coming soon
          </div>
        </div>
      </div>
    </article>
  );
}
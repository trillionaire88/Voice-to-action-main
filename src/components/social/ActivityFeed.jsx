import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from '@/api/client';
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FileText, BarChart2, Users, MessageSquare, PenLine, CheckSquare, Vote, UserPlus } from "lucide-react";

const EVENT_ICONS = {
  created_petition:    { icon: FileText,      color: "text-blue-500",   bg: "bg-blue-50",   label: "created a petition" },
  created_poll:        { icon: BarChart2,     color: "text-purple-500", bg: "bg-purple-50", label: "created a poll" },
  created_discussion:  { icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-50", label: "started a discussion" },
  joined_community:    { icon: Users,         color: "text-green-500",  bg: "bg-green-50",  label: "joined a community" },
  posted_discussion:   { icon: PenLine,       color: "text-teal-500",   bg: "bg-teal-50",   label: "posted in a discussion" },
  signed_petition:     { icon: CheckSquare,   color: "text-emerald-500",bg: "bg-emerald-50",label: "signed a petition" },
  voted_poll:          { icon: Vote,          color: "text-indigo-500", bg: "bg-indigo-50", label: "voted on a poll" },
  followed_user:       { icon: UserPlus,      color: "text-pink-500",   bg: "bg-pink-50",   label: "followed a user" },
  followed_community:  { icon: Users,         color: "text-cyan-500",   bg: "bg-cyan-50",   label: "followed a community" },
  commented:           { icon: MessageSquare, color: "text-slate-500",  bg: "bg-slate-50",  label: "commented" },
};

export default function ActivityFeed({ userId, communityId, limit = 20, compact = false }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["activity-feed", userId, communityId, limit],
    queryFn: () => {
      if (userId) return api.entities.ActivityEvent.filter({ user_id: userId }, "-created_date", limit);
      return api.entities.ActivityEvent.list("-created_date", limit);
    },
  });

  if (isLoading) return <div className="py-4 text-center text-sm text-slate-400">Loading activity...</div>;
  if (!events.length) return <div className="py-4 text-center text-sm text-slate-400">No recent activity</div>;

  return (
    <div className="space-y-3">
      {events.map(ev => {
        const cfg = EVENT_ICONS[ev.event_type] || EVENT_ICONS.commented;
        const Icon = cfg.icon;
        const timeAgo = formatDistanceToNow(new Date(ev.created_date), { addSuffix: true });
        return (
          <div key={ev.id} className={`flex items-start gap-3 ${compact ? "" : "p-3 rounded-xl bg-white border border-slate-100"}`}>
            <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">You</span> {cfg.label}
                {ev.entity_title && <span className="font-medium"> · {ev.entity_title}</span>}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
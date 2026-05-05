import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicProfileById } from "@/lib/publicProfile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe2,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ProfileAvatar from "../profile/ProfileAvatar";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReportButton from "../moderation/ReportButton";
import FollowButton from "@/components/FollowButton";
import MessageButton from "@/components/MessageButton";

const CATEGORY_LABELS = {
  politics_society: "Politics & Society",
  environment: "Environment",
  economy_work: "Economy & Work",
  technology_innovation: "Technology & Innovation",
  health: "Health",
  lifestyle_culture: "Lifestyle & Culture",
  sports: "Sports",
  other: "Other",
};

const CATEGORY_COLORS = {
  politics_society: "bg-red-50 text-red-700 border-red-200",
  environment: "bg-green-50 text-green-700 border-green-200",
  economy_work: "bg-amber-50 text-amber-700 border-amber-200",
  technology_innovation: "bg-purple-50 text-purple-700 border-purple-200",
  health: "bg-blue-50 text-blue-700 border-blue-200",
  lifestyle_culture: "bg-pink-50 text-pink-700 border-pink-200",
  sports: "bg-orange-50 text-orange-700 border-orange-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function PollCard({ poll, hasVoted, onClick, currentUserId }) {
  const navigate = useNavigate();
  
  const { data: creator } = useQuery({
    queryKey: ["user", poll.creator_user_id],
    queryFn: async () => {
      const u = await fetchPublicProfileById(poll.creator_user_id);
      return u;
    },
    enabled: !!poll.creator_user_id && !poll.is_anonymous_display,
  });

  const timeRemaining = poll.end_time
    ? formatDistanceToNow(new Date(poll.end_time), { addSuffix: true })
    : "No end date";

  const isExpiringSoon =
    poll.end_time &&
    new Date(poll.end_time) - new Date() < 24 * 60 * 60 * 1000;

  return (
    <Card
      className="vta-card vta-card-pressable card-pressable cursor-pointer transition-all duration-200 border border-slate-200 bg-white active:scale-[0.99] active:shadow-sm active:border-blue-300 select-none"
      onClick={onClick}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <CardHeader className="space-y-3 pb-4">
        {/* Creator Info */}
        {!poll.is_anonymous_display && creator && (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <div
              className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`View profile of ${creator.display_name || creator.full_name || "creator"}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(createPageUrl("Profile") + `?userId=${creator.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  navigate(createPageUrl("Profile") + `?userId=${creator.id}`);
                }
              }}
            >
              <ProfileAvatar user={creator} size="sm" />
              <span className="font-medium">{creator.display_name || creator.full_name || "User"}</span>
              {creator.is_verified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </div>
            <FollowButton targetUserId={creator.id} targetName={creator.display_name || creator.full_name} size="sm" />
            <MessageButton targetUserId={creator.id} size="sm" />
          </div>
        )}
        
        {/* Category & Audience */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={`border ${
              CATEGORY_COLORS[poll.category] || CATEGORY_COLORS.other
            }`}
          >
            {CATEGORY_LABELS[poll.category] || "Other"}
          </Badge>
          {poll.audience_type === "global" ? (
            <Badge variant="outline" className="border-blue-200 text-blue-700">
              <Globe2 className="w-3 h-3 mr-1" />
              Global
            </Badge>
          ) : (
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              <MapPin className="w-3 h-3 mr-1" />
              {poll.audience_country_code}
            </Badge>
          )}
          {hasVoted && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              You voted
            </Badge>
          )}
        </div>

        {/* Question */}
        <h3 className="text-lg font-semibold text-slate-900 leading-snug line-clamp-2">
          {poll.question}
        </h3>

        {/* Tags */}
        {poll.tags && poll.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {poll.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {poll.tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                +{poll.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-3 border-t border-slate-100">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-600">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="font-medium">
                {poll.total_votes_cached || 0}
              </span>
              <span className="text-slate-500">votes</span>
            </div>
            {poll.verified_votes_count > 0 && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">{poll.verified_votes_count}</span>
                <span className="text-slate-500">verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Report */}
        <div className="flex justify-end">
          <ReportButton
            targetType="poll"
            targetId={poll.id}
            targetPreview={poll.question}
            targetAuthorId={poll.creator_user_id}
            currentUserId={currentUserId}
          />
        </div>

        {/* Time Remaining */}
        <div className="flex items-center gap-2 text-sm">
          {isExpiringSoon ? (
            <>
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-orange-700 font-medium">
                Ends {timeRemaining}
              </span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Ends {timeRemaining}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
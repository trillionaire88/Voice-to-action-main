import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MapPin, Users, CheckCircle2, Target, Clock, Flame, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import FollowButton from "@/components/FollowButton";
import MessageButton from "@/components/MessageButton";

const TARGET_TYPE_LABELS = {
  national_government: "National Government",
  local_council: "Local Council",
  corporation: "Corporation",
  regulatory_body: "Regulatory Body",
  international_org: "International Org",
  other: "Other",
};

const CATEGORY_COLORS = {
  government_policy: "bg-blue-50 text-blue-700 border-blue-200",
  local_council: "bg-purple-50 text-purple-700 border-purple-200",
  corporate_policy: "bg-amber-50 text-amber-700 border-amber-200",
  human_rights: "bg-red-50 text-red-700 border-red-200",
  environment: "bg-green-50 text-green-700 border-green-200",
  health: "bg-pink-50 text-pink-700 border-pink-200",
  economy: "bg-indigo-50 text-indigo-700 border-indigo-200",
  technology: "bg-cyan-50 text-cyan-700 border-cyan-200",
  education: "bg-orange-50 text-orange-700 border-orange-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function PetitionCard({ petition, hasSigned, onClick, isCreator, onDelete }) {
  const total = petition.signature_count_total || 0;
  const goal = petition.signature_goal || 1000;
  const progress = (total / goal) * 100;
  const daysLeft = petition.deadline
    ? Math.ceil((new Date(petition.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card
      onClick={onClick}
      className="vta-card vta-card-pressable card-pressable border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={CATEGORY_COLORS[petition.category] || CATEGORY_COLORS.other}>
              {(petition.category || "other").replace(/_/g, " ")}
            </Badge>
            {petition.risk_flags?.includes("trending") && (
              <Badge className="bg-red-50 text-red-700 border-red-200">
                <Flame className="w-3 h-3 mr-1" />Trending
              </Badge>
            )}
            {hasSigned && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />Signed
              </Badge>
            )}
          </div>
          {isCreator && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
              onClick={onDelete}
              aria-label="Delete this petition"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <h3 className="font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {petition.title}
        </h3>
        {petition.creator_user_id && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-slate-600">
              {petition.creator_display_name || petition.creator_name || "Creator"}
            </span>
            <FollowButton
              targetUserId={petition.creator_user_id}
              targetName={petition.creator_display_name || petition.creator_name}
              size="sm"
            />
            <MessageButton targetUserId={petition.creator_user_id} size="sm" />
          </div>
        )}
        <p className="text-sm text-slate-600 line-clamp-2 mt-1">
          {petition.short_summary}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Target className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{petition.target_name}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>{petition.country_code}</span>
          {petition.region_code && <span>• {petition.region_code}</span>}
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-900 font-semibold flex items-center gap-1">
              <Users className="w-4 h-4" />
              {total.toLocaleString()}
            </span>
            <span className="text-slate-600">
              Goal: {goal.toLocaleString()}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>

        {daysLeft !== null && daysLeft > 0 && (
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <Clock className="w-3 h-3" />
            <span>{daysLeft} days left</span>
          </div>
        )}

        {petition.status === 'delivered' && (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 w-full justify-center">
            Delivered to {petition.target_name}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
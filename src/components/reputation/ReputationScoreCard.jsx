import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Shield, RefreshCw, ChevronDown, ChevronUp, Crown, ShieldCheck, Star, AlertTriangle } from "lucide-react";
import ReputationBadge, { INFLUENCE_LEVELS } from "./ReputationBadge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const FACTOR_LABELS = {
  age_score:           { label: "Account Age",            weight: "15%", color: "bg-blue-500" },
  verification_score:  { label: "Verified Status",        weight: "15%", color: "bg-emerald-500" },
  petition_score:      { label: "Petition Credibility",   weight: "25%", color: "bg-purple-500" },
  participation_score: { label: "Participation Quality",  weight: "15%", color: "bg-amber-500" },
  report_score:        { label: "Report Accuracy",        weight: "15%", color: "bg-cyan-500" },
  moderation_score:    { label: "Moderation History",     weight: "15%", color: "bg-rose-500" },
};

export default function ReputationScoreCard({ userId, isOwnProfile = false }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: scoreRecords = [], isLoading } = useQuery({
    queryKey: ["userInfluenceScore", userId],
    queryFn: () => api.entities.UserInfluenceScore.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const scoreData = scoreRecords[0] || null;

  const recalcMutation = useMutation({
    mutationFn: () => api.functions.invoke('calculateReputation', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["userInfluenceScore", userId]);
      toast.success("Reputation score updated!");
    },
    onError: () => toast.error("Failed to recalculate score"),
  });

  const score = scoreData?.overall_score ?? 50;
  const level = scoreData?.influence_level ?? "standard_user";
  const levelConfig = INFLUENCE_LEVELS[level];

  // Score ring color
  const ringColor = score >= 75 ? "text-emerald-500" : score >= 60 ? "text-blue-500" : score >= 40 ? "text-slate-500" : "text-orange-500";

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Reputation & Influence
          </span>
          {isOwnProfile && (
            <Button
              variant="ghost" size="sm"
              onClick={() => recalcMutation.mutate()}
              disabled={recalcMutation.isPending}
              className="h-7 text-xs text-slate-500"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${recalcMutation.isPending ? "animate-spin" : ""}`} />
              Recalculate
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <>
            {/* Score display */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 163.4} 163.4`}
                    className={ringColor}
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${ringColor}`}>
                  {Math.round(score)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <ReputationBadge influenceLevel={level} showScore={false} />
                <p className="text-xs text-slate-500 mt-1.5">{levelConfig?.label} • Score out of 100</p>
                {scoreData?.flags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scoreData.flags.map((f, i) => (
                      <Badge key={i} className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{f}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Influence levels ladder */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {Object.entries(INFLUENCE_LEVELS).reverse().map(([key, cfg]) => {
                const Icon = cfg.icon;
                const isActive = key === level;
                return (
                  <div key={key} className={`text-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${isActive ? cfg.color + " ring-2 ring-offset-1 ring-current" : "bg-slate-50 text-slate-400"}`}>
                    <Icon className="w-3 h-3 mx-auto mb-0.5" />
                    {cfg.min}+
                  </div>
                );
              })}
            </div>

            {/* Expand breakdown */}
            <button
              className="w-full text-xs text-slate-500 flex items-center justify-center gap-1 hover:text-slate-700 transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> Hide breakdown</> : <><ChevronDown className="w-3 h-3" /> Show score breakdown</>}
            </button>

            {expanded && scoreData && (
              <div className="space-y-2.5 pt-1">
                <Separator />
                {Object.entries(FACTOR_LABELS).map(([key, { label, weight, color }]) => {
                  const val = scoreData[key] ?? 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{label} <span className="text-slate-400">({weight})</span></span>
                        <span className="font-semibold text-slate-800">{Math.round(val)}/100</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${val}%`, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
                {scoreData.last_calculated_at && (
                  <p className="text-[10px] text-slate-400 text-right">
                    Updated {formatDistanceToNow(new Date(scoreData.last_calculated_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
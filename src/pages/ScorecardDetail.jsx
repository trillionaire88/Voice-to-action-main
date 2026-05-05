import React, { useState } from "react";
import { api } from '@/api/client';
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Star, Globe2, MapPin, ExternalLink, CheckCircle2,
  Users, Shield, Flag, Lock, AlertTriangle, ThumbsUp
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ApprovalChart from "@/components/scorecards/ApprovalChart";
import ScorecardCredibilityBadge from "@/components/scorecards/ScorecardCredibilityBadge";
import RatingModal from "@/components/scorecards/RatingModal";
import ReportModal from "@/components/moderation/ReportModal";
import CommentThread from "@/components/comments/CommentThread";
import SocialShareButtons from "@/components/social/SocialShareButtons";

const CATEGORY_CONFIG = {
  politician: { label: "Politician", color: "bg-blue-50 text-blue-700 border-blue-200" },
  company: { label: "Company", color: "bg-amber-50 text-amber-700 border-amber-200" },
  government_body: { label: "Govt Body", color: "bg-purple-50 text-purple-700 border-purple-200" },
  council: { label: "Council", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  public_figure: { label: "Public Figure", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  organisation: { label: "Organisation", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  media_outlet: { label: "Media", color: "bg-pink-50 text-pink-700 border-pink-200" },
  other: { label: "Other", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

function getVoteWeight(user, reputationScore) {
  if (!user) return 0.3;
  let weight = 1.0;
  if (user.is_verified) weight += 0.5;
  const rep = reputationScore || 50;
  if (rep >= 80) weight += 0.5;
  else if (rep >= 60) weight += 0.3;
  else if (rep < 30) weight -= 0.3;
  return Math.max(0.1, Math.round(weight * 10) / 10);
}

function detectSuspicious(user, recentRatings) {
  if (!user) return { suspicious: false };
  const accountAgeMs = Date.now() - new Date(user.created_date || Date.now()).getTime();
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 1) return { suspicious: true, reason: "New account" };
  const recentFromSameIp = recentRatings.filter(r => r.created_date > Date.now() - 3600000).length;
  if (recentFromSameIp > 20) return { suspicious: true, reason: "Rapid voting" };
  return { suspicious: false };
}

export default function ScorecardDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const rawScorecardId = urlParams.get("id");
  const scorecardId = rawScorecardId ? String(rawScorecardId).replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 128) || null : null;

  const { user } = useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { data: scorecard, isLoading } = useQuery({
    queryKey: ["scorecard", scorecardId],
    queryFn: async () => {
      const results = await api.entities.Scorecard.filter({ id: scorecardId });
      if (!results.length) throw new Error("Not found");
      return results[0];
    },
    enabled: !!scorecardId,
    staleTime: 60_000,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["scorecardRatings", scorecardId],
    queryFn: () => api.entities.ScorecardRating.filter({ scorecard_id: scorecardId }, "-created_date", 500),
    enabled: !!scorecardId,
    refetchInterval: 30000,
    staleTime: 30_000,
  });

  const { data: myRating } = useQuery({
    queryKey: ["myRating", scorecardId, user?.id],
    queryFn: async () => {
      const r = await api.entities.ScorecardRating.filter({ scorecard_id: scorecardId, user_id: user.id });
      return r.length > 0 ? r[0] : null;
    },
    enabled: !!scorecardId && !!user,
  });

  const { data: myInfluence } = useQuery({
    queryKey: ["myInfluence", user?.id],
    queryFn: async () => {
      const r = await api.entities.UserInfluenceScore.filter({ user_id: user.id });
      return r.length > 0 ? r[0] : null;
    },
    enabled: !!user,
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      const weight = getVoteWeight(user, myInfluence?.overall_score);
      const { suspicious, reason } = detectSuspicious(user, ratings);
      const now = new Date().toISOString();

      const countries = [...new Set(ratings.map(r => r.user_country_code).filter(Boolean))];
      if (user?.country_code && !countries.includes(user.country_code)) countries.push(user.country_code);

      const ratingData = {
        scorecard_id: scorecardId,
        user_id: user.id,
        rating,
        comment,
        is_verified_user: user.is_verified || false,
        user_country_code: user.country_code || "",
        user_reputation_score: myInfluence?.overall_score || 50,
        vote_weight: weight,
        is_suspicious: suspicious,
        suspicious_reason: reason || "",
        rated_at: now,
      };

      // Compute new counts
      const prevRating = myRating?.rating;
      const decrement = {};
      const increment = {};

      if (prevRating) {
        decrement[`${prevRating}_count`] = Math.max(0, (scorecard[`${prevRating}_count`] || 1) - 1);
        await api.entities.ScorecardRating.update(myRating.id, { ...ratingData, previous_rating: prevRating });
      } else {
        await api.entities.ScorecardRating.create(ratingData);
      }

      // Recompute aggregate counts
      const allRatings = await api.entities.ScorecardRating.filter({ scorecard_id: scorecardId });
      const valid = allRatings.filter(r => !r.is_invalidated && !r.is_suspicious);
      const counts = { strongly_approve: 0, approve: 0, neutral: 0, disapprove: 0, strongly_disapprove: 0 };
      valid.forEach(r => { if (counts[r.rating] !== undefined) counts[r.rating]++; });
      const total = valid.length;
      const approveN = counts.strongly_approve + counts.approve;
      const disapproveN = counts.strongly_disapprove + counts.disapprove;
      const rawApproval = total > 0 ? Math.round((approveN / total) * 100) : 0;

      // Weighted approval
      let weightedApproveSum = 0, weightedTotal = 0;
      const WEIGHTS = { strongly_approve: 1, approve: 0.5, neutral: 0, disapprove: -0.5, strongly_disapprove: -1 };
      valid.forEach(r => {
        const w = r.vote_weight || 1;
        weightedApproveSum += (WEIGHTS[r.rating] || 0) * w;
        weightedTotal += w;
      });
      const weightedApproval = weightedTotal > 0 ? Math.round(((weightedApproveSum / weightedTotal) + 1) / 2 * 100) : 50;

      // Credibility
      const verifiedCount = valid.filter(r => r.is_verified_user).length;
      const countryCount = [...new Set(valid.map(r => r.user_country_code).filter(Boolean))].length;
      const suspiciousCount = allRatings.filter(r => r.is_suspicious).length;
      let credScore = 0;
      credScore += Math.min(30, (verifiedCount / Math.max(total, 1)) * 50);
      credScore += Math.min(20, (countryCount / 8) * 20);
      credScore += Math.min(20, Math.log10(Math.max(total, 1)) * 7);
      credScore += verifiedCount / Math.max(total, 1) >= 0.4 ? 15 : 0;
      credScore -= (suspiciousCount / Math.max(allRatings.length, 1)) * 30;
      credScore = Math.max(0, Math.min(100, Math.round(credScore)));
      let credLabel = "insufficient_data";
      if (credScore >= 75) credLabel = "highly_credible";
      else if (credScore >= 55) credLabel = "credible";
      else if (credScore >= 35) credLabel = "moderate";
      else if (credScore >= 10) credLabel = "low";

      await api.entities.Scorecard.update(scorecardId, {
        ...counts,
        total_ratings: total,
        verified_ratings_count: verifiedCount,
        countries_represented: countryCount,
        raw_approval_score: rawApproval,
        weighted_approval_score: weightedApproval,
        credibility_score: credScore,
        credibility_label: credLabel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["scorecard", scorecardId]);
      queryClient.invalidateQueries(["scorecardRatings", scorecardId]);
      queryClient.invalidateQueries(["myRating", scorecardId, user?.id]);
      setShowRatingModal(false);
      toast.success("Rating saved!");
    },
  });

  if (!scorecardId || isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Skeleton className="h-32 w-full mb-6" />
        <div className="grid lg:grid-cols-3 gap-6"><Skeleton className="lg:col-span-2 h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  if (!scorecard || scorecard.status === "removed") {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-14 h-14 text-orange-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Scorecard Not Found</h2>
        <Button onClick={() => navigate(createPageUrl("Scorecards"))}>Back to Scorecards</Button>
      </div>
    );
  }

  if (scorecard.status === "pending_review") {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Shield className="w-14 h-14 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Under Review</h2>
        <p className="text-slate-600">This scorecard is awaiting admin approval.</p>
      </div>
    );
  }

  const cat = CATEGORY_CONFIG[scorecard.category] || CATEGORY_CONFIG.other;
  const initials = scorecard.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const total = scorecard.total_ratings || 0;
  const approvePct = scorecard.raw_approval_score || 0;
  const weightedPct = scorecard.weighted_approval_score || 0;

  const ratingLabels = { strongly_approve: "Strongly Approves", approve: "Approves", neutral: "Neutral", disapprove: "Disapproves", strongly_disapprove: "Strongly Disapproves" };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Button variant="ghost" onClick={() => navigate(createPageUrl("Scorecards"))} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />Back to Scorecards
      </Button>

      {scorecard.is_locked && (
        <Alert className="border-orange-200 bg-orange-50 mb-5">
          <Lock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">This scorecard is locked and cannot receive new ratings.</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <Card className="border-slate-200 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-5">
            {scorecard.image_url ? (
              <img src={scorecard.image_url} alt={scorecard.name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 flex-shrink-0" />
            ) : (
              <Avatar className="w-20 h-20 flex-shrink-0">
                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-amber-400 to-amber-600 text-white">{initials}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <div className="flex items-start gap-2 flex-wrap mb-2">
                <h1 className="text-3xl font-extrabold text-slate-900">{scorecard.name}</h1>
                {scorecard.suspicious_activity_flag && <Badge className="bg-orange-50 text-orange-700 border-orange-200"><AlertTriangle className="w-3 h-3 mr-1" />Flagged</Badge>}
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge className={cat.color}>{cat.label}</Badge>
                <span className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{scorecard.country_code}{scorecard.region ? ` · ${scorecard.region}` : ""}</span>
                {scorecard.official_website && (
                  <a href={scorecard.official_website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />Website
                  </a>
                )}
              </div>
              {scorecard.description && <p className="text-slate-600 text-sm leading-relaxed mb-3">{scorecard.description}</p>}
              {scorecard.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">{scorecard.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="border-emerald-200 bg-emerald-50 col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">{approvePct}%</div>
            <div className="text-xs text-emerald-700">Raw Approval</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-extrabold text-blue-600">{weightedPct}%</div>
            <div className="text-xs text-blue-700">Weighted Approval</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-extrabold text-slate-900">{total.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Total Ratings</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">{scorecard.verified_ratings_count || 0}</div>
            <div className="text-xs text-slate-500">Verified</div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <ApprovalChart scorecard={scorecard} ratings={ratings} />
        </div>

        <div className="space-y-4">
          {/* CTA */}
          {!scorecard.is_locked && user ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4">
                {myRating ? (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-800">
                      You rated: <strong>{ratingLabels[myRating.rating]}</strong>
                    </p>
                    <Button onClick={() => setShowRatingModal(true)} variant="outline" className="w-full border-amber-300 text-amber-700">
                      Change Rating
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-800 font-medium">Cast your rating</p>
                    <Button onClick={() => setShowRatingModal(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                      <ThumbsUp className="w-4 h-4 mr-2" />Rate This
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : !user ? (
            <Card className="border-slate-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-sm text-slate-600 mb-3">Sign in to rate</p>
                <Button size="sm" onClick={() => api.auth.redirectToLogin(window.location.href)} className="w-full">Sign In</Button>
              </CardContent>
            </Card>
          ) : null}

          <ScorecardCredibilityBadge scorecard={scorecard} ratings={ratings} />

          {/* Actions */}
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4 space-y-2">
              <SocialShareButtons title={scorecard?.name || "Scorecard"} url={window.location.href} />
              {user && (
                <Button variant="outline" className="w-full justify-start text-orange-600 hover:text-orange-700" onClick={() => setShowReportModal(true)}>
                  <Flag className="w-4 h-4 mr-2" />Report Issue
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Linked content */}
          {(scorecard.linked_petition_ids?.length > 0 || scorecard.linked_poll_ids?.length > 0) && (
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">Linked Content</p>
                {scorecard.linked_petition_ids?.map(id => (
                  <Button key={id} variant="ghost" size="sm" className="w-full justify-start text-xs"
                    onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${id}`)}>
                    → View Linked Petition
                  </Button>
                ))}
                {scorecard.linked_poll_ids?.map(id => (
                  <Button key={id} variant="ghost" size="sm" className="w-full justify-start text-xs"
                    onClick={() => navigate(createPageUrl("PollDetail") + `?id=${id}`)}>
                    → View Linked Poll
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="mt-8">
        <CommentThread scorecardId={scorecardId} user={user} />
      </div>

      {showRatingModal && (
        <RatingModal
          scorecard={scorecard}
          currentRating={myRating}
          onSubmit={ratingMutation.mutate}
          onClose={() => setShowRatingModal(false)}
          isLoading={ratingMutation.isPending}
        />
      )}

      {showReportModal && (
        <ReportModal targetType="community" targetId={scorecardId} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
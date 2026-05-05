import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Flame, Globe, Users, MessageSquare, ArrowRight,
  MapPin, Target, Zap, BarChart4, Vote, FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CredibilityBadge from "../components/petitions/CredibilityBadge";

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

function MediaScoreBar({ score }) {
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700">{Math.round(score)}</span>
    </div>
  );
}

export default function TrendingPetitions() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("all");

  const { data: mediaScores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ["trendingMediaScores"],
    queryFn: async () => [],
  });

  const { data: allPetitions = [], isLoading: petitionsLoading } = useQuery({
    queryKey: ["activePetitionsForTrending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("petitions")
        .select("*")
        .eq("status", "active")
        .order("signature_count_total", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: allPolls = [], isLoading: pollsLoading } = useQuery({
    queryKey: ["activePollsForTrending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("polls")
        .select("*")
        .eq("status", "open")
        .order("total_votes_cached", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: credibilityScores = [] } = useQuery({
    queryKey: ["trendingCredibilityScores"],
    queryFn: async () => [],
  });

  const { data: reputationScores = [] } = useQuery({
    queryKey: ["trendingReputationScores"],
    queryFn: async () => [],
  });

  // Merge petition data with media scores, credibility, and creator reputation
  const petitionMap = Object.fromEntries(allPetitions.map(p => [p.id, p]));
  const credMap = Object.fromEntries(credibilityScores.map(c => [c.petition_id, c]));
  const repMap = Object.fromEntries(reputationScores.map(r => [r.user_id, r]));

  // Boost ranking: media_score × credibility × geo diversity × creator reputation
  const trendingWithData = mediaScores
    .map(score => {
      const petition = petitionMap[score.petition_id];
      const cred = credMap[score.petition_id];
      const creatorRep = petition ? repMap[petition.creator_user_id] : null;
      const credBoost = cred ? cred.overall_score / 50 : 1;
      // Geographic diversity bonus: up to +20%
      const geoBonus = 1 + Math.min((score.country_count || 0) / 50, 0.2);
      // Creator reputation bonus: high-rep creators get up to +15%, low-rep get up to -20%
      const repScore = creatorRep?.overall_score ?? 50;
      const repBoost = 0.8 + (repScore / 100) * 0.35; // range: 0.80 → 1.15
      return { 
        type: "petition",
        score, 
        petition, 
        cred, 
        creatorRep, 
        adjustedScore: score.media_score * credBoost * geoBonus * repBoost 
      };
    })
    .filter(({ petition }) => !!petition)
    .sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Score polls by engagement: votes + comments with positive feedback boost
  const trendingPolls = allPolls
    .map(poll => {
      const baseScore = (poll.total_votes_cached || 0) + (poll.comments_count || 0) * 0.5;
      const recencyBonus = 1 + Math.max(0, Math.min(30 - ((Date.now() - new Date(poll.created_date)) / (1000 * 60 * 60 * 24)), 30) / 30 * 0.3);
      const verifiedBonus = 1 + ((poll.verified_votes_count || 0) / Math.max(poll.total_votes_cached || 1, 1)) * 0.2;
      return {
        type: "poll",
        poll,
        adjustedScore: baseScore * recencyBonus * verifiedBonus
      };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Combine and rank all content
  const allTrending = [
    ...trendingWithData.slice(0, 8),
    ...trendingPolls.slice(0, 8)
  ].sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Fallback: top petitions by signatures if no data yet
  const fallbackPetitions = allPetitions.slice(0, 12);
  const showFallback = trendingWithData.length === 0 && trendingPolls.length === 0 && !scoresLoading && !pollsLoading;

  const isLoading = scoresLoading || petitionsLoading || pollsLoading;
  
  const filteredTrending = selectedTab === "all" ? allTrending : 
                           selectedTab === "petitions" ? trendingWithData :
                           selectedTab === "polls" ? trendingPolls : allTrending;

  const goToPetition = (id) => navigate(createPageUrl("PetitionDetail") + `?id=${id}`);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Flame className="w-4 h-4" /> Live Trending
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Trending Now</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          The most engaging petitions and polls across the platform. Ranked by interactions and positive feedback.
        </p>
      </div>

      {/* Tab filters */}
      {!isLoading && (
        <div className="flex gap-2 justify-center mb-8">
          {[
            { value: "all", label: "All Trending", icon: TrendingUp },
            { value: "petitions", label: "Petitions", icon: Target },
            { value: "polls", label: "Polls", icon: BarChart4 }
          ].map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={selectedTab === value ? "default" : "outline"}
              onClick={() => setSelectedTab(value)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" /> {label}
            </Button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Trending Items", value: filteredTrending.length, icon: TrendingUp, color: "text-red-600" },
            { label: "Petitions", value: allPetitions.length, icon: Target, color: "text-blue-600" },
            { label: "Active Polls", value: allPolls.length, icon: Vote, color: "text-purple-600" },
            { label: "Total Interactions", value: (allPetitions.reduce((s, p) => s + (p.signature_count_total || 0), 0) + allPolls.reduce((s, p) => s + (p.total_votes_cached || 0), 0)).toLocaleString(), icon: Users, color: "text-emerald-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-slate-200 text-center">
              <CardContent className="pt-5 pb-5">
                <Icon className={`w-6 h-6 mx-auto mb-1 ${color}`} />
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      )}

      {/* Trending cards - unified across content types */}
      {!isLoading && !showFallback && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrending.map((item, idx) => 
            item.type === "petition" ? (
              <TrendingCard 
                key={item.petition.id} 
                petition={item.petition} 
                score={item.score} 
                cred={item.cred} 
                rank={idx + 1} 
                onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${item.petition.id}`)} 
              />
            ) : (
              <TrendingPollCard
                key={item.poll.id}
                poll={item.poll}
                rank={idx + 1}
                onClick={() => navigate(createPageUrl("PollDetail") + `?id=${item.poll.id}`)}
              />
            )
          )}
        </div>
      )}

      {/* Fallback: top by signatures */}
      {showFallback && (
        <>
          <p className="text-center text-sm text-slate-500 mb-6">Showing top petitions by support. Trending scores are calculated automatically.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fallbackPetitions.map((petition, idx) => (
              <TrendingCard key={petition.id} petition={petition} score={null} rank={idx + 1} onClick={() => goToPetition(petition.id)} />
            ))}
          </div>
        </>
      )}

      {!isLoading && allTrending.length === 0 && fallbackPetitions.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-xl font-semibold">No active content yet</p>
          <div className="flex gap-3 justify-center mt-4">
            <Button onClick={() => navigate(createPageUrl("CreatePetition"))}>Create Petition</Button>
            <Button variant="outline" onClick={() => navigate(createPageUrl("CreatePoll"))}>Create Poll</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingCard({ petition, score, cred, rank, onClick }) {
  const progress = (petition.signature_count_total / petition.signature_goal) * 100;
  const isHot = score?.media_score >= 60;

  return (
    <Card onClick={onClick} className={`cursor-pointer hover:shadow-xl transition-all border-slate-200 group relative overflow-hidden ${isHot ? "border-red-200" : ""}`}>
      {rank <= 3 && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${rank === 1 ? "bg-gradient-to-r from-red-500 to-orange-500" : rank === 2 ? "bg-gradient-to-r from-orange-400 to-amber-400" : "bg-gradient-to-r from-amber-400 to-yellow-400"}`} />
      )}
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400">#{rank}</span>
            <Badge className={CATEGORY_COLORS[petition.category] || CATEGORY_COLORS.other} style={{ fontSize: "11px" }}>
              {petition.category.replace(/_/g, ' ')}
            </Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              <FileText className="w-3 h-3 mr-1" />Petition
            </Badge>
            {score?.is_trending && (
              <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
                <Flame className="w-3 h-3 mr-1" />Trending
              </Badge>
            )}
          </div>
        </div>

        <h3 className="font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {petition.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2">{petition.short_summary}</p>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{petition.country_code}</span>
          <span className="flex items-center gap-1"><Target className="w-3 h-3" />{petition.target_name}</span>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Users className="w-3 h-3" />{petition.signature_count_total.toLocaleString()} signed
            </span>
            <span className="text-slate-500">Goal: {petition.signature_goal.toLocaleString()}</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-1.5" />
        </div>

        {score && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" />Media score</span>
              {score.sigs_last_24h > 0 && (
                <span className="text-emerald-600 font-semibold">+{score.sigs_last_24h.toLocaleString()} today</span>
              )}
            </div>
            <MediaScoreBar score={score.media_score} />
          </div>
        )}

        {cred && (
          <CredibilityBadge badge={cred.badge} score={cred.overall_score} size="sm" />
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(petition.created_date), { addSuffix: true })}</span>
          <span className="text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-1">
            View <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingPollCard({ poll, rank, onClick }) {
  const engagementScore = (poll.total_votes_cached || 0) + (poll.comments_count || 0) * 0.5;
  const verificationRate = poll.total_votes_cached > 0 ? ((poll.verified_votes_count || 0) / poll.total_votes_cached * 100) : 0;

  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-xl transition-all border-slate-200 group relative overflow-hidden">
      {rank <= 3 && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${rank === 1 ? "bg-gradient-to-r from-red-500 to-orange-500" : rank === 2 ? "bg-gradient-to-r from-orange-400 to-amber-400" : "bg-gradient-to-r from-amber-400 to-yellow-400"}`} />
      )}
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400">#{rank}</span>
            <Badge className={`${CATEGORY_COLORS[poll.category] || CATEGORY_COLORS.other}`} style={{ fontSize: "11px" }}>
              {poll.category.replace(/_/g, ' ')}
            </Badge>
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
              <Vote className="w-3 h-3 mr-1" />Poll
            </Badge>
            {poll.is_official && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Official</Badge>
            )}
          </div>
        </div>

        <h3 className="font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {poll.question}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2">{poll.description}</p>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          {poll.location_city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{poll.location_city}</span>}
          {poll.location_country_code && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{poll.location_country_code}</span>}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <BarChart4 className="w-3 h-3" />{poll.total_votes_cached.toLocaleString()} votes
            </span>
            <span className="font-semibold text-slate-600">{Math.round(verificationRate)}% verified</span>
          </div>
          <Progress value={Math.min(verificationRate, 100)} className="h-1.5" />
        </div>

        {poll.comments_count > 0 && (
          <div className="text-xs text-slate-600 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {poll.comments_count} discussion{poll.comments_count !== 1 ? 's' : ''}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(poll.created_date), { addSuffix: true })}</span>
          <span className="text-xs text-purple-600 font-medium group-hover:underline flex items-center gap-1">
            Vote <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
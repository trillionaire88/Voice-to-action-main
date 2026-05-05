import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, Users, Globe2, Flame, Award, Crown, Star,
  CheckCircle2, Shield, FileText, Vote, BarChart3, ArrowRight,
  Zap, Activity, Trophy, Medal, ChevronUp
} from "lucide-react";
import ReputationBadge, { getInfluenceLevel, INFLUENCE_LEVELS } from "@/components/reputation/ReputationBadge";

// ─── Score computation helpers ────────────────────────────────────────────────

function clamp(v, min = 0, max = 100) { return Math.min(max, Math.max(min, v)); }
function log10scale(n, cap = 10000) { return clamp(Math.log10(Math.max(n, 1) + 1) / Math.log10(cap + 1) * 100); }

// Petition influence score (0–100)
function petitionInfluenceScore(p) {
  const sigs = p.signature_count_total || 0;
  const verified = p.signature_count_verified || 0;
  const comments = p.comments_count || 0;
  const geo = p.countries_represented || 1;

  const engagement = clamp(log10scale(sigs, 100000) * 0.7 + log10scale(comments, 5000) * 0.3);
  const credibility = clamp((verified / Math.max(sigs, 1)) * 100 * 0.6 + Math.min(geo * 4, 40));
  const geoReach = clamp(Math.min(geo * 5, 100));
  const growth = clamp(log10scale(sigs, 50000));

  return Math.round(engagement * 0.30 + credibility * 0.25 + geoReach * 0.25 + growth * 0.20);
}

// Poll influence score (0–100)
function pollInfluenceScore(p) {
  const votes = p.total_votes_cached || 0;
  const verified = p.verified_votes_count || 0;
  const comments = p.comments_count || 0;
  const geo = p.countries_represented || 1;

  const engagement = clamp(log10scale(votes, 50000) * 0.7 + log10scale(comments, 2000) * 0.3);
  const credibility = clamp((verified / Math.max(votes, 1)) * 100 * 0.7 + Math.min(geo * 3, 30));
  const geoReach = clamp(Math.min(geo * 6, 100));

  return Math.round(engagement * 0.35 + credibility * 0.30 + geoReach * 0.35);
}

// Scorecard influence score (0–100)
function scorecardInfluenceScore(s) {
  const total = s.total_ratings || 0;
  const verified = s.verified_ratings_count || 0;
  const geo = s.countries_represented || 1;
  const credScore = s.credibility_score || 0;

  const engagement = clamp(log10scale(total, 10000));
  const credibility = clamp(credScore);
  const geoReach = clamp(Math.min(geo * 8, 100));

  return Math.round(engagement * 0.30 + credibility * 0.35 + geoReach * 0.35);
}

// Community influence score (0–100)
function communityInfluenceScore(c) {
  const members = c.member_count || 0;
  const polls = c.poll_count || 0;
  const decisions = c.decision_count || 0;
  const participation = c.participation_rate || 0;

  const engagement = clamp(log10scale(members, 10000) * 0.5 + log10scale(polls + decisions, 500) * 0.5);
  const activity = clamp(Math.min(participation, 100));

  return Math.round(engagement * 0.55 + activity * 0.45);
}

// ─── Badge configs ─────────────────────────────────────────────────────────
function getInfluenceBadges(score, isTrending = false, isVerified = false) {
  const badges = [];
  if (isTrending) badges.push({ label: "Trending Now", color: "bg-orange-50 text-orange-700 border-orange-200", icon: Flame });
  if (score >= 85) badges.push({ label: "Highly Influential", color: "bg-amber-50 text-amber-800 border-amber-300", icon: Crown });
  else if (score >= 70) badges.push({ label: "High Momentum", color: "bg-blue-50 text-blue-800 border-blue-200", icon: TrendingUp });
  else if (score >= 50) badges.push({ label: "Growing Impact", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ChevronUp });
  if (isVerified) badges.push({ label: "High Credibility", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Shield });
  return badges;
}

const RANK_MEDALS = [
  { icon: Trophy, color: "text-amber-500", bg: "bg-amber-50" },
  { icon: Medal, color: "text-slate-400", bg: "bg-slate-50" },
  { icon: Medal, color: "text-amber-700", bg: "bg-amber-50/50" },
];

function RankBadge({ rank }) {
  if (rank > 3) return <span className="w-7 h-7 flex items-center justify-center text-sm font-bold text-slate-500">#{rank}</span>;
  const { icon: Icon, color, bg } = RANK_MEDALS[rank - 1];
  return <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>;
}

function ScoreBar({ score, color = "bg-blue-500" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-7 text-right">{score}</span>
    </div>
  );
}

// ─── Row components ────────────────────────────────────────────────────────

function PetitionRow({ petition, rank, onClick }) {
  const score = petitionInfluenceScore(petition);
  const isTrending = (petition.signature_count_total || 0) > 100 && (petition.countries_represented || 0) > 1;
  const badges = getInfluenceBadges(score, isTrending);
  return (
    <div onClick={onClick} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/70 px-2 rounded-lg transition-colors group">
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{petition.title}</span>
          {badges.slice(0, 1).map(b => (
            <Badge key={b.label} className={`${b.color} text-[10px] hidden sm:flex`}><b.icon className="w-2.5 h-2.5 mr-0.5" />{b.label}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span><strong>{(petition.signature_count_total || 0).toLocaleString()}</strong> sigs</span>
          {petition.countries_represented > 0 && <span><Globe2 className="w-2.5 h-2.5 inline mr-0.5" />{petition.countries_represented} countries</span>}
        </div>
      </div>
      <ScoreBar score={score} color="bg-orange-400" />
    </div>
  );
}

function PollRow({ poll, rank, onClick }) {
  const score = pollInfluenceScore(poll);
  const isTrending = poll.status === "open" && (poll.total_votes_cached || 0) > 50;
  const badges = getInfluenceBadges(score, isTrending, (poll.verified_votes_count || 0) > 50);
  return (
    <div onClick={onClick} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/70 px-2 rounded-lg transition-colors group">
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{poll.question}</span>
          {badges.slice(0, 1).map(b => (
            <Badge key={b.label} className={`${b.color} text-[10px] hidden sm:flex`}><b.icon className="w-2.5 h-2.5 mr-0.5" />{b.label}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span><strong>{(poll.total_votes_cached || 0).toLocaleString()}</strong> votes</span>
          {poll.countries_represented > 0 && <span><Globe2 className="w-2.5 h-2.5 inline mr-0.5" />{poll.countries_represented}</span>}
          {poll.status === "open" && <span className="text-emerald-600">● Live</span>}
        </div>
      </div>
      <ScoreBar score={score} color="bg-blue-500" />
    </div>
  );
}

function ScorecardRow({ scorecard, rank, onClick }) {
  const score = scorecardInfluenceScore(scorecard);
  const isTrending = scorecard.is_trending;
  const badges = getInfluenceBadges(score, isTrending);
  const approvePct = scorecard.raw_approval_score || 0;
  const approveColor = approvePct >= 60 ? "text-emerald-600" : approvePct >= 40 ? "text-amber-600" : "text-red-600";
  return (
    <div onClick={onClick} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/70 px-2 rounded-lg transition-colors group">
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-sm text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">{scorecard.name}</span>
          {badges.slice(0, 1).map(b => (
            <Badge key={b.label} className={`${b.color} text-[10px] hidden sm:flex`}><b.icon className="w-2.5 h-2.5 mr-0.5" />{b.label}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className={`font-bold ${approveColor}`}>{approvePct}% approval</span>
          <span>{(scorecard.total_ratings || 0).toLocaleString()} ratings</span>
          <span className="capitalize">{scorecard.category?.replace(/_/g, " ")}</span>
        </div>
      </div>
      <ScoreBar score={score} color="bg-amber-500" />
    </div>
  );
}

function CommunityRow({ community, rank, onClick }) {
  const score = communityInfluenceScore(community);
  const badges = getInfluenceBadges(score, false, community.verification_status === "verified");
  return (
    <div onClick={onClick} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/70 px-2 rounded-lg transition-colors group">
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-sm text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">{community.name}</span>
          {community.verification_status === "verified" && <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Verified</Badge>}
          {badges.slice(0, 1).map(b => (
            <Badge key={b.label} className={`${b.color} text-[10px] hidden sm:flex`}><b.icon className="w-2.5 h-2.5 mr-0.5" />{b.label}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span><strong>{(community.member_count || 0).toLocaleString()}</strong> members</span>
          <span>{community.poll_count || 0} polls</span>
          <span>{community.country_code || "Global"}</span>
        </div>
      </div>
      <ScoreBar score={score} color="bg-purple-500" />
    </div>
  );
}

function UserRow({ influenceRecord, rank, onClick }) {
  const score = influenceRecord.overall_score || 0;
  const level = influenceRecord.influence_level || getInfluenceLevel(score);
  const cfg = INFLUENCE_LEVELS[level];
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 px-2">
      <RankBadge rank={rank} />
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
          {(influenceRecord.user_display_name || influenceRecord.user_email || "U").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-sm text-slate-900 line-clamp-1">
            {influenceRecord.user_display_name || influenceRecord.user_email?.split("@")[0] || "User"}
          </span>
          <ReputationBadge score={score} influenceLevel={level} size="sm" />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {influenceRecord.flags?.length > 0 && <span className="text-orange-500">{influenceRecord.flags.length} flag(s)</span>}
        </div>
      </div>
      <ScoreBar score={Math.round(score)} color="bg-emerald-500" />
    </div>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────
function RankingCard({ title, icon: Icon, color, children, count, viewAllPage, viewAllLabel }) {
  const navigate = useNavigate();
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />{title}
          <Badge variant="outline" className="text-xs">{count}</Badge>
        </CardTitle>
        {viewAllPage && (
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate(createPageUrl(viewAllPage))}>
            {viewAllLabel || "View All"} <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function InfluenceIndex() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  const { data: petitions = [], isLoading: petLoading } = useQuery({
    queryKey: ["influencePetitions"],
    queryFn: async () => {
      const { data } = await supabase.from("petitions").select("*").eq("status", "active").order("signature_count_total", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: polls = [], isLoading: pollLoading } = useQuery({
    queryKey: ["influencePolls"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("polls").select("*").order("total_votes_cached", { ascending: false }).limit(50);
        if (error) return [];
        return (data || []).filter((p) => !p.status || p.status === "open" || p.status === "active");
      } catch {
        return [];
      }
    },
    refetchInterval: 60000,
  });

  const { data: scorecards = [], isLoading: scLoading } = useQuery({
    queryKey: ["influenceScorecards"],
    queryFn: async () => {
      const { data } = await supabase.from("scorecards").select("*").eq("status", "approved").order("total_ratings", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: communities = [], isLoading: comLoading } = useQuery({
    queryKey: ["influenceCommunities"],
    queryFn: async () => {
      const { data } = await supabase.from("communities").select("*").eq("status", "active").order("member_count", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: userScores = [], isLoading: userLoading } = useQuery({
    queryKey: ["influenceUsers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,email,reputation_score,is_blue_verified")
        .order("reputation_score", { ascending: false })
        .limit(30);
      return (data || []).map((u) => ({
        id: u.id,
        user_display_name: u.display_name,
        user_email: u.email,
        overall_score: u.reputation_score || 0,
        influence_level: undefined,
        is_restricted: false,
        flags: [],
      }));
    },
    refetchInterval: 120000,
  });

  const isLoading = petLoading || pollLoading || scLoading || comLoading || userLoading;

  // Ranked lists
  const rankedPetitions = useMemo(() =>
    [...petitions].sort((a, b) => petitionInfluenceScore(b) - petitionInfluenceScore(a)).slice(0, 10),
    [petitions]
  );
  const rankedPolls = useMemo(() =>
    [...polls].sort((a, b) => pollInfluenceScore(b) - pollInfluenceScore(a)).slice(0, 10),
    [polls]
  );
  const rankedScorecards = useMemo(() =>
    [...scorecards].sort((a, b) => scorecardInfluenceScore(b) - scorecardInfluenceScore(a)).slice(0, 10),
    [scorecards]
  );
  const rankedCommunities = useMemo(() =>
    [...communities].sort((a, b) => communityInfluenceScore(b) - communityInfluenceScore(a)).slice(0, 10),
    [communities]
  );
  const rankedUsers = useMemo(() =>
    [...userScores].filter(u => !u.is_restricted).sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0)).slice(0, 10),
    [userScores]
  );

  // Trending (top score gainers / most active)
  const trendingPetitions = useMemo(() =>
    [...petitions].filter(p => (p.signature_count_total || 0) > 10)
      .sort((a, b) => petitionInfluenceScore(b) - petitionInfluenceScore(a)).slice(0, 5),
    [petitions]
  );
  const trendingPolls = useMemo(() =>
    [...polls].filter(p => (p.total_votes_cached || 0) > 5)
      .sort((a, b) => pollInfluenceScore(b) - pollInfluenceScore(a)).slice(0, 5),
    [polls]
  );

  // Platform stats
  const totalPetitionSigs = petitions.reduce((s, p) => s + (p.signature_count_total || 0), 0);
  const totalPollVotes = polls.reduce((s, p) => s + (p.total_votes_cached || 0), 0);
  const totalRatings = scorecards.reduce((s, c) => s + (c.total_ratings || 0), 0);
  const totalMembers = communities.reduce((s, c) => s + (c.member_count || 0), 0);

  const SkeletonRows = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200 text-amber-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Trophy className="w-4 h-4" />Global Influence Index
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Global Influence Index</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Live rankings of the most influential petitions, votes, organisations, communities, and voices on the platform.
        </p>
      </div>

      {/* Platform-wide stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Active Petitions", value: petitions.length, icon: FileText, color: "text-orange-500" },
            { label: "Petition Signatures", value: totalPetitionSigs.toLocaleString(), icon: Users, color: "text-slate-700" },
            { label: "Active Votes", value: polls.length, icon: Vote, color: "text-blue-600" },
            { label: "Total Poll Votes", value: totalPollVotes.toLocaleString(), icon: BarChart3, color: "text-blue-500" },
            { label: "Scorecard Ratings", value: totalRatings.toLocaleString(), icon: Star, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-slate-200 text-center">
              <CardContent className="pt-3 pb-3">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                <div className="text-xl font-bold text-slate-900">{value}</div>
                <div className="text-[10px] text-slate-500">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full mb-6">
          <TabsTrigger value="overview"><Activity className="w-3 h-3 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="petitions"><FileText className="w-3 h-3 mr-1" />Petitions</TabsTrigger>
          <TabsTrigger value="votes"><Vote className="w-3 h-3 mr-1" />Votes</TabsTrigger>
          <TabsTrigger value="orgs"><Star className="w-3 h-3 mr-1" />Scorecards</TabsTrigger>
          <TabsTrigger value="communities"><Users className="w-3 h-3 mr-1" />Communities</TabsTrigger>
          <TabsTrigger value="users"><Crown className="w-3 h-3 mr-1" />Users</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Trending Now */}
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />Trending Now
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {isLoading ? <SkeletonRows /> : (
                  <>
                    {trendingPetitions.slice(0, 3).map((p, i) => (
                      <div key={p.id} onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}
                        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-orange-50 px-2 rounded-lg transition-colors">
                        <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />
                        <span className="text-sm text-slate-800 line-clamp-1 flex-1 font-medium">{p.title}</span>
                        <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">{petitionInfluenceScore(p)}</Badge>
                      </div>
                    ))}
                    {trendingPolls.slice(0, 2).map((p, i) => (
                      <div key={p.id} onClick={() => navigate(createPageUrl("PollDetail") + `?id=${p.id}`)}
                        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-blue-50 px-2 rounded-lg transition-colors">
                        <Vote className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-slate-800 line-clamp-1 flex-1">{p.question}</span>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">{pollInfluenceScore(p)}</Badge>
                      </div>
                    ))}
                    {trendingPetitions.length === 0 && trendingPolls.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No trending content yet</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top Users preview */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />Top Voices
                </CardTitle>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setTab("users")}>
                  Full List <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? <SkeletonRows /> : rankedUsers.slice(0, 5).map((u, i) => (
                  <UserRow key={u.id} influenceRecord={u} rank={i + 1} />
                ))}
                {!isLoading && rankedUsers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No user scores yet</p>}
              </CardContent>
            </Card>
          </div>

          {/* 4-column mini rankings */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-orange-500" />Top Petitions</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {isLoading ? <SkeletonRows /> : rankedPetitions.slice(0, 5).map((p, i) => (
                  <div key={p.id} onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}
                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1 transition-colors">
                    <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                    <span className="text-xs text-slate-800 line-clamp-1 flex-1">{p.title}</span>
                    <span className="text-[10px] font-bold text-orange-500">{petitionInfluenceScore(p)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-1.5"><Vote className="w-3.5 h-3.5 text-blue-500" />Top Votes</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {isLoading ? <SkeletonRows /> : rankedPolls.slice(0, 5).map((p, i) => (
                  <div key={p.id} onClick={() => navigate(createPageUrl("PollDetail") + `?id=${p.id}`)}
                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1 transition-colors">
                    <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                    <span className="text-xs text-slate-800 line-clamp-1 flex-1">{p.question}</span>
                    <span className="text-[10px] font-bold text-blue-500">{pollInfluenceScore(p)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" />Top Scorecards</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {isLoading ? <SkeletonRows /> : rankedScorecards.slice(0, 5).map((s, i) => (
                  <div key={s.id} onClick={() => navigate(createPageUrl("ScorecardDetail") + `?id=${s.id}`)}
                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1 transition-colors">
                    <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                    <span className="text-xs text-slate-800 line-clamp-1 flex-1">{s.name}</span>
                    <span className="text-[10px] font-bold text-amber-500">{scorecardInfluenceScore(s)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-purple-500" />Top Communities</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {isLoading ? <SkeletonRows /> : rankedCommunities.slice(0, 5).map((c, i) => (
                  <div key={c.id} onClick={() => navigate(createPageUrl("CommunityDetail") + `?id=${c.id}`)}
                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1 transition-colors">
                    <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                    <span className="text-xs text-slate-800 line-clamp-1 flex-1">{c.name}</span>
                    <span className="text-[10px] font-bold text-purple-500">{communityInfluenceScore(c)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PETITIONS ── */}
        <TabsContent value="petitions">
          <RankingCard title="Most Influential Petitions" icon={FileText} color="text-orange-500" count={rankedPetitions.length} viewAllPage="Petitions" viewAllLabel="All Petitions">
            <p className="text-xs text-slate-500 mb-3">Ranked by engagement, signatures, credibility, and geographic reach</p>
            {isLoading ? <SkeletonRows /> : rankedPetitions.length === 0
              ? <p className="text-sm text-slate-500 text-center py-8">No active petitions yet</p>
              : rankedPetitions.map((p, i) => <PetitionRow key={p.id} petition={p} rank={i + 1} onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)} />)
            }
          </RankingCard>
        </TabsContent>

        {/* ── VOTES ── */}
        <TabsContent value="votes">
          <RankingCard title="Most Influential Public Votes" icon={Vote} color="text-blue-600" count={rankedPolls.length} viewAllPage="PublicVoting" viewAllLabel="All Votes">
            <p className="text-xs text-slate-500 mb-3">Ranked by participation, verified voters, and geographic diversity</p>
            {isLoading ? <SkeletonRows /> : rankedPolls.length === 0
              ? <p className="text-sm text-slate-500 text-center py-8">No active votes yet</p>
              : rankedPolls.map((p, i) => <PollRow key={p.id} poll={p} rank={i + 1} onClick={() => navigate(createPageUrl("PollDetail") + `?id=${p.id}`)} />)
            }
          </RankingCard>
        </TabsContent>

        {/* ── SCORECARDS ── */}
        <TabsContent value="orgs">
          <div className="space-y-6">
            <RankingCard title="Most Influential Scorecards" icon={Star} color="text-amber-500" count={rankedScorecards.length} viewAllPage="Scorecards" viewAllLabel="All Scorecards">
              <p className="text-xs text-slate-500 mb-3">Ranked by credibility, total ratings, and geographic diversity</p>
              {isLoading ? <SkeletonRows /> : rankedScorecards.length === 0
                ? <p className="text-sm text-slate-500 text-center py-8">No scorecards yet</p>
                : rankedScorecards.map((s, i) => <ScorecardRow key={s.id} scorecard={s} rank={i + 1} onClick={() => navigate(createPageUrl("ScorecardDetail") + `?id=${s.id}`)} />)
              }
            </RankingCard>

            {/* Sub-rankings */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "Most Approved", data: [...scorecards].sort((a, b) => (b.raw_approval_score || 0) - (a.raw_approval_score || 0)).slice(0, 5), stat: s => `${s.raw_approval_score || 0}% ✓`, color: "text-emerald-600" },
                { label: "Most Disapproved", data: [...scorecards].sort((a, b) => (a.raw_approval_score || 100) - (b.raw_approval_score || 100)).slice(0, 5), stat: s => `${100 - (s.raw_approval_score || 0)}% ✗`, color: "text-red-600" },
                { label: "Most Controversial", data: [...scorecards].sort((a, b) => Math.abs(50 - (a.raw_approval_score || 50)) - Math.abs(50 - (b.raw_approval_score || 50))).slice(0, 5), stat: s => `${s.raw_approval_score || 0}% ↔`, color: "text-amber-600" },
              ].map(({ label, data, stat, color }) => (
                <Card key={label} className="border-slate-200">
                  <CardHeader className="pb-1"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {data.map((s, i) => (
                      <div key={s.id} onClick={() => navigate(createPageUrl("ScorecardDetail") + `?id=${s.id}`)}
                        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1 transition-colors">
                        <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                        <span className="text-xs text-slate-800 flex-1 line-clamp-1">{s.name}</span>
                        <span className={`text-[10px] font-bold ${color}`}>{stat(s)}</span>
                      </div>
                    ))}
                    {data.length === 0 && <p className="text-xs text-slate-400 text-center py-2">None yet</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── COMMUNITIES ── */}
        <TabsContent value="communities">
          <RankingCard title="Most Influential Communities" icon={Users} color="text-purple-500" count={rankedCommunities.length} viewAllPage="Communities" viewAllLabel="All Communities">
            <p className="text-xs text-slate-500 mb-3">Ranked by member activity, polls created, and participation rate</p>
            {isLoading ? <SkeletonRows /> : rankedCommunities.length === 0
              ? <p className="text-sm text-slate-500 text-center py-8">No communities yet</p>
              : rankedCommunities.map((c, i) => <CommunityRow key={c.id} community={c} rank={i + 1} onClick={() => navigate(createPageUrl("CommunityDetail") + `?id=${c.id}`)} />)
            }
          </RankingCard>
        </TabsContent>

        {/* ── USERS ── */}
        <TabsContent value="users">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />User Influence Rankings
                <Badge variant="outline" className="text-xs">{rankedUsers.length}</Badge>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Ranked by verified reputation score. Restricted and bot accounts are excluded.</p>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? <SkeletonRows /> : rankedUsers.length === 0
                ? <p className="text-sm text-slate-500 text-center py-8">No user scores yet. Scores are calculated as users participate.</p>
                : (
                  <>
                    {rankedUsers.map((u, i) => <UserRow key={u.id} influenceRecord={u} rank={i + 1} />)}
                    <div className="pt-4 mt-2 border-t border-slate-100">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(INFLUENCE_LEVELS).map(([key, cfg]) => (
                          <Badge key={key} className={`${cfg.color} text-xs`}>
                            <cfg.icon className="w-3 h-3 mr-1" />{cfg.label} ({cfg.min}+)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
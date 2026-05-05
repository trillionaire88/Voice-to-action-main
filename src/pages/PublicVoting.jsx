import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Vote, Globe2, Search, TrendingUp, Users, CheckCircle2,
  Clock, Filter, PlusCircle, Shield, MapPin, Flame, ArrowRight, Star
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import VoteTrustIndicators from "@/components/polls/VoteTrustIndicators";

const CATEGORIES = [
  { value: "", label: "All Topics" },
  { value: "governance_policy", label: "Governance & Policy" },
  { value: "economy_living", label: "Economy" },
  { value: "health_wellbeing", label: "Health" },
  { value: "environment_climate", label: "Environment" },
  { value: "technology_ai", label: "Technology" },
  { value: "education", label: "Education" },
  { value: "civil_rights_ethics", label: "Civil Rights" },
  { value: "local_community", label: "Local Community" },
  { value: "global_affairs", label: "Global Affairs" },
  // legacy Poll categories
  { value: "politics_society", label: "Politics & Society" },
  { value: "economy_work", label: "Economy & Work" },
  { value: "technology_innovation", label: "Technology & Innovation" },
  { value: "health", label: "Health" },
];

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "most_votes", label: "Most Votes" },
  { value: "ending_soon", label: "Ending Soon" },
  { value: "verified", label: "Verified Majority" },
];

const CATEGORY_COLORS = {
  governance_policy: "bg-blue-50 text-blue-700 border-blue-200",
  politics_society: "bg-blue-50 text-blue-700 border-blue-200",
  economy_living: "bg-amber-50 text-amber-700 border-amber-200",
  economy_work: "bg-amber-50 text-amber-700 border-amber-200",
  health_wellbeing: "bg-pink-50 text-pink-700 border-pink-200",
  health: "bg-pink-50 text-pink-700 border-pink-200",
  environment_climate: "bg-green-50 text-green-700 border-green-200",
  environment: "bg-green-50 text-green-700 border-green-200",
  technology_ai: "bg-cyan-50 text-cyan-700 border-cyan-200",
  technology_innovation: "bg-cyan-50 text-cyan-700 border-cyan-200",
  education: "bg-orange-50 text-orange-700 border-orange-200",
  civil_rights_ethics: "bg-red-50 text-red-700 border-red-200",
  local_community: "bg-purple-50 text-purple-700 border-purple-200",
  global_affairs: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

function getTrustLabel(poll) {
  const total = poll.total_votes_cached || 0;
  const verified = poll.verified_votes_count || 0;
  const countries = poll.countries_represented || 0;
  const verifiedPct = total > 0 ? verified / total : 0;

  if (total >= 10000 && countries >= 10) return { label: "International Vote", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  if (countries >= 5) return { label: "National Support", color: "bg-blue-50 text-blue-700 border-blue-200" };
  if (verifiedPct >= 0.6 && total >= 100) return { label: "Verified Majority", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (total >= 1000) return { label: "High Participation", color: "bg-amber-50 text-amber-700 border-amber-200" };
  if (countries >= 2) return { label: "Regional Majority", color: "bg-purple-50 text-purple-700 border-purple-200" };
  return null;
}

function PollVoteCard({ poll, onClick }) {
  const isOpen = poll.status === "open" && (!poll.end_time || new Date(poll.end_time) > new Date());
  const trustLabel = getTrustLabel(poll);
  const catColor = CATEGORY_COLORS[poll.category] || "bg-slate-50 text-slate-700 border-slate-200";
  const catLabel = CATEGORIES.find(c => c.value === poll.category)?.label || poll.category?.replace(/_/g, " ");

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 group overflow-hidden"
    >
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`${catColor} text-[11px]`}>{catLabel}</Badge>
            {isOpen ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse inline-block" />Live
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 text-[11px]">Closed</Badge>
            )}
            {trustLabel && (
              <Badge className={`${trustLabel.color} text-[11px]`}>
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />{trustLabel.label}
              </Badge>
            )}
          </div>
        </div>

        <h3 className="font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
          {poll.question}
        </h3>

        {poll.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{poll.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <strong>{(poll.total_votes_cached || 0).toLocaleString()}</strong> votes
          </span>
          {poll.verified_votes_count > 0 && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              {poll.verified_votes_count.toLocaleString()} verified
            </span>
          )}
          {poll.countries_represented > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <Globe2 className="w-3 h-3" />{poll.countries_represented} countries
            </span>
          )}
        </div>

        {poll.total_votes_cached > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-1">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
              style={{ width: `${Math.min((poll.verified_votes_count / Math.max(poll.total_votes_cached, 1)) * 100, 100)}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">
            {poll.end_time ? (isOpen ? `Ends ${formatDistanceToNow(new Date(poll.end_time), { addSuffix: true })}` : "Closed") : "No end date"}
          </span>
          <span className="text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-1">
            Vote / View <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicVoting() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("trending");

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["publicVotingPolls"],
    queryFn: async () => {
      const { data } = await supabase.from("polls").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    refetchInterval: 30000, // real-time refresh every 30s
    staleTime: 30_000,
  });

  const { data: closedPolls = [] } = useQuery({
    queryKey: ["publicVotingClosedPolls"],
    queryFn: async () => {
      const { data } = await supabase.from("polls").select("*").eq("status", "closed").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const allPolls = [...polls, ...closedPolls];

  const filtered = allPolls
    .filter(p => {
      if (category && p.category !== category) return false;
      if (search) {
        const s = search.toLowerCase();
        return p.question?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s) || p.tags?.some(t => t.toLowerCase().includes(s));
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "most_votes") return (b.total_votes_cached || 0) - (a.total_votes_cached || 0);
      if (sort === "newest") return new Date(b.created_date) - new Date(a.created_date);
      if (sort === "ending_soon") {
        if (!a.end_time) return 1;
        if (!b.end_time) return -1;
        return new Date(a.end_time) - new Date(b.end_time);
      }
      if (sort === "verified") return (b.verified_votes_count || 0) - (a.verified_votes_count || 0);
      // trending: weighted by recent votes + geo diversity
      const aScore = (a.total_votes_cached || 0) * (1 + Math.min((a.countries_represented || 0) / 10, 0.5));
      const bScore = (b.total_votes_cached || 0) * (1 + Math.min((b.countries_represented || 0) / 10, 0.5));
      return bScore - aScore;
    });

  // Stats
  const totalVotes = polls.reduce((s, p) => s + (p.total_votes_cached || 0), 0);
  const verifiedVotes = polls.reduce((s, p) => s + (p.verified_votes_count || 0), 0);
  const countries = [...new Set(polls.flatMap(p => p.user_country_code_snapshot ? [p.user_country_code_snapshot] : []))].length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Vote className="w-4 h-4" /> Public Voting
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Public Policy Voting</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Vote on real issues that matter. Every vote is verified, weighted by trust, and publicly auditable.
        </p>
        <Button
          className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
          onClick={() => navigate(createPageUrl("CreatePoll"))}
        >
          <PlusCircle className="w-4 h-4 mr-2" />Create a Policy Vote
        </Button>
      </div>

      {/* Platform stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Votes", value: polls.length, icon: Vote, color: "text-blue-600" },
            { label: "Total Votes Cast", value: totalVotes.toLocaleString(), icon: Users, color: "text-slate-700" },
            { label: "Verified Votes", value: verifiedVotes.toLocaleString(), icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Countries Voting", value: countries || polls.filter(p => p.countries_represented > 0).reduce((s, p) => s + p.countries_represented, 0) + "+", icon: Globe2, color: "text-indigo-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-slate-200 text-center">
              <CardContent className="pt-4 pb-4">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trust legend */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <span className="text-xs text-slate-500 font-medium mr-1">Trust labels:</span>
        {[
          { label: "International Vote", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
          { label: "National Support", color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Verified Majority", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "High Participation", color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Regional Majority", color: "bg-purple-50 text-purple-700 border-purple-200" },
        ].map(({ label, color }) => (
          <Badge key={label} className={`${color} text-[10px]`}>{label}</Badge>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search votes by topic, keyword, or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SORT_OPTIONS.map(s => (
            <Button
              key={s.value}
              size="sm"
              variant={sort === s.value ? "default" : "outline"}
              className={sort === s.value ? "bg-blue-600 hover:bg-blue-700 shrink-0" : "shrink-0"}
              onClick={() => setSort(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.slice(0, 10).map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              category === c.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Vote className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-xl font-semibold mb-2">No votes found</p>
          <p className="text-sm mb-6">Be the first to start a vote on this topic.</p>
          <Button onClick={() => navigate(createPageUrl("CreatePoll"))}>
            <PlusCircle className="w-4 h-4 mr-2" />Create a Vote
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(poll => (
            <PollVoteCard
              key={poll.id}
              poll={poll}
              onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
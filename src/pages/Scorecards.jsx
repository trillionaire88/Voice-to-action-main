import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, Search, TrendingUp, TrendingDown, Flame, Users,
  CheckCircle2, Globe2, Plus, Filter, ArrowRight, ThumbsUp, ThumbsDown, Minus, BarChart3
} from "lucide-react";

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

const SORT_OPTIONS = [
  { value: "most_rated", label: "Most Rated" },
  { value: "most_approved", label: "Most Approved" },
  { value: "most_disapproved", label: "Most Disapproved" },
  { value: "controversial", label: "Most Controversial" },
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
];

function ApprovalBar({ scorecard }) {
  const total = scorecard.total_ratings || 0;
  if (total === 0) return <div className="text-xs text-slate-400 italic">No ratings yet</div>;

  const approveN = (scorecard.strongly_approve_count || 0) + (scorecard.approve_count || 0);
  const disapproveN = (scorecard.strongly_disapprove_count || 0) + (scorecard.disapprove_count || 0);
  const neutralN = scorecard.neutral_count || 0;

  const approvePct = Math.round((approveN / total) * 100);
  const disapprovePct = Math.round((disapproveN / total) * 100);
  const neutralPct = Math.round((neutralN / total) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden w-full bg-slate-100">
        <div className="bg-emerald-500 transition-all" style={{ width: `${approvePct}%` }} />
        <div className="bg-slate-300 transition-all" style={{ width: `${neutralPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${disapprovePct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span className="text-emerald-600 font-semibold">{approvePct}% Approve</span>
        <span>{neutralPct}% Neutral</span>
        <span className="text-red-600 font-semibold">{disapprovePct}% Disapprove</span>
      </div>
    </div>
  );
}

function CredibilityBadge({ score, label }) {
  if (!label || label === "insufficient_data") return null;
  const cfg = {
    low: "bg-red-50 text-red-700 border-red-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    credible: "bg-blue-50 text-blue-700 border-blue-200",
    highly_credible: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const lbls = { low: "Low Credibility", moderate: "Moderate", credible: "Credible", highly_credible: "Highly Credible" };
  return (
    <Badge className={`${cfg[label] || ""} text-[10px]`}>
      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />{lbls[label] || label}
    </Badge>
  );
}

function ScorecardCard({ scorecard, onClick }) {
  const cat = CATEGORY_CONFIG[scorecard.category] || CATEGORY_CONFIG.other;
  const initials = scorecard.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const isApproved = (scorecard.raw_approval_score || 0) >= 50;

  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 group">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3 mb-3">
          {scorecard.image_url ? (
            <img src={scorecard.image_url} alt={scorecard.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-slate-200" />
          ) : (
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarFallback className={`text-sm font-bold ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{initials}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap mb-1">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{scorecard.name}</h3>
              {scorecard.is_trending && <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"><Flame className="w-2.5 h-2.5 mr-0.5" />Trending</Badge>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={`${cat.color} text-[10px]`}>{cat.label}</Badge>
              {scorecard.country_code && <span className="text-[11px] text-slate-500">{scorecard.country_code}{scorecard.region ? ` · ${scorecard.region}` : ""}</span>}
              <CredibilityBadge score={scorecard.credibility_score} label={scorecard.credibility_label} />
            </div>
          </div>
        </div>

        {scorecard.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{scorecard.description}</p>
        )}

        <ApprovalBar scorecard={scorecard} />

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-3 h-3" />{(scorecard.total_ratings || 0).toLocaleString()} ratings
            {scorecard.verified_ratings_count > 0 && (
              <span className="text-emerald-600 ml-1">· <CheckCircle2 className="w-2.5 h-2.5 inline" /> {scorecard.verified_ratings_count} verified</span>
            )}
          </span>
          <span className="text-xs text-blue-600 font-medium flex items-center gap-0.5">View <ArrowRight className="w-3 h-3" /></span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Scorecards() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("most_rated");

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["scorecards"] });
  };

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ["scorecards", "approved"],
    queryFn: async () => {
      const { data } = await supabase.from("scorecards").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(300);
      return data || [];
    },
    refetchInterval: 60000,
    staleTime: 2 * 60_000,
  });

  const filtered = scorecards
    .filter(s => {
      if (category && s.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.country_code?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "most_approved") return (b.raw_approval_score || 0) - (a.raw_approval_score || 0);
      if (sort === "most_disapproved") return (a.raw_approval_score || 100) - (b.raw_approval_score || 100);
      if (sort === "controversial") {
        const aControversy = Math.abs(50 - (a.raw_approval_score || 50));
        const bControversy = Math.abs(50 - (b.raw_approval_score || 50));
        return aControversy - bControversy; // closest to 50/50 = most controversial
      }
      if (sort === "trending") return (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0) || (b.total_ratings || 0) - (a.total_ratings || 0);
      if (sort === "newest") return new Date(b.created_date) - new Date(a.created_date);
      return (b.total_ratings || 0) - (a.total_ratings || 0); // most_rated default
    });

  const totalRatings = scorecards.reduce((s, c) => s + (c.total_ratings || 0), 0);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Star className="w-4 h-4" />Public Scorecards
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Public Approval Scorecards</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Rate politicians, companies, governments, and public figures. Track approval trends over time with verified, weighted ratings.
        </p>
        <Button
          className="mt-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md text-white"
          onClick={() => navigate(createPageUrl("CreateScorecard"))}
        >
          <Plus className="w-4 h-4 mr-2" />Submit a Scorecard
        </Button>
      </div>

      {/* Stats bar */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Scorecards", value: scorecards.length, icon: BarChart3, color: "text-amber-600" },
            { label: "Total Ratings", value: totalRatings.toLocaleString(), icon: Users, color: "text-slate-700" },
            { label: "Verified Ratings", value: scorecards.reduce((s, c) => s + (c.verified_ratings_count || 0), 0).toLocaleString(), icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Countries", value: [...new Set(scorecards.map(s => s.country_code).filter(Boolean))].length, icon: Globe2, color: "text-blue-600" },
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

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name, country, tag..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {SORT_OPTIONS.map(s => (
            <Button key={s.value} size="sm" variant={sort === s.value ? "default" : "outline"}
              className={sort === s.value ? "bg-amber-500 hover:bg-amber-600 shrink-0" : "shrink-0"}
              onClick={() => setSort(s.value)}>{s.label}</Button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setCategory("")}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${!category ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"}`}>
          All
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setCategory(key)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${category === key ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"}`}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Star className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-xl font-semibold mb-2">No scorecards found</p>
          <p className="text-sm mb-6">Be the first to submit one.</p>
          <Button onClick={() => navigate(createPageUrl("CreateScorecard"))} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-2" />Submit Scorecard
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(s => (
            <ScorecardCard key={s.id} scorecard={s} onClick={() => navigate(createPageUrl("ScorecardDetail") + `?id=${s.id}`)} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
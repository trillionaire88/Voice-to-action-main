import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame, TrendingUp, BarChart3,
  FileText, Vote, Star, RefreshCw, Brain,
  AlertTriangle, ThumbsUp, ThumbsDown, Minus, ChevronRight,
  Activity, Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TOPIC_COLORS = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
};

const MOMENTUM_CONFIG = {
  hot: { color: "bg-red-50 text-red-700 border-red-200", icon: Flame, label: "Hot" },
  rising: { color: "bg-orange-50 text-orange-700 border-orange-200", icon: TrendingUp, label: "Rising" },
  stable: { color: "bg-slate-50 text-slate-600 border-slate-200", icon: Minus, label: "Stable" },
};

const INTENSITY_CONFIG = {
  extreme: { color: "text-red-600", label: "Extreme Debate" },
  high: { color: "text-orange-600", label: "High Debate" },
  medium: { color: "text-amber-600", label: "Active Debate" },
};

function SentimentBar({ distribution }) {
  const total = (distribution?.positive || 0) + (distribution?.neutral || 0) + (distribution?.negative || 0) + (distribution?.controversial || 0);
  if (!total) return null;
  const pct = (v) => Math.round((v / total) * 100);
  return (
    <div className="w-full flex rounded-full overflow-hidden h-2.5">
      <div className="bg-emerald-400 transition-all" style={{ width: `${pct(distribution.positive)}%` }} title={`Positive ${pct(distribution.positive)}%`} />
      <div className="bg-slate-300 transition-all" style={{ width: `${pct(distribution.neutral)}%` }} title={`Neutral ${pct(distribution.neutral)}%`} />
      <div className="bg-red-400 transition-all" style={{ width: `${pct(distribution.negative)}%` }} title={`Negative ${pct(distribution.negative)}%`} />
      <div className="bg-amber-400 transition-all" style={{ width: `${pct(distribution.controversial)}%` }} title={`Controversial ${pct(distribution.controversial)}%`} />
    </div>
  );
}

export default function CurrentIssues() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: trendData, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["publicTrends", refreshKey],
    queryFn: async () => null,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });

  // Fallback live data in case AI is loading
  const { data: petitions = [] } = useQuery({
    queryKey: ["currentIssuesPetitions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("petitions")
        .select("id,title,signature_count_total,category,country_code")
        .eq("status", "active")
        .order("signature_count_total", { ascending: false })
        .limit(10);
      return data || [];
    },
  });
  const { data: polls = [] } = useQuery({
    queryKey: ["currentIssuesPolls"],
    queryFn: async () => {
      const { data } = await supabase
        .from("polls")
        .select("id,question,total_votes_cached,category")
        .eq("status", "open")
        .order("total_votes_cached", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const topics = trendData?.top_topics || [];
  const trending = trendData?.trending_now || [];
  const debates = trendData?.hot_debates || [];
  const sentDist = trendData?.sentiment_distribution;
  const stats = trendData?.stats || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 text-orange-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Brain className="w-4 h-4" />AI-Powered Issue Intelligence
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Current Issues</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Real-time AI analysis of the most important topics, debates, and trends across the platform.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Analysing..." : "Refresh Analysis"}
          </Button>
          {dataUpdatedAt && (
            <span className="text-xs text-slate-400">
              Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Platform stats bar */}
      {!isLoading && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Active Petitions", value: stats.petitions || petitions.length, icon: FileText, color: "text-orange-500" },
            { label: "Signatures", value: (stats.total_sigs || 0).toLocaleString(), icon: Users, color: "text-slate-700" },
            { label: "Active Votes", value: stats.polls || polls.length, icon: Vote, color: "text-blue-500" },
            { label: "Votes Cast", value: (stats.total_votes || 0).toLocaleString(), icon: BarChart3, color: "text-blue-400" },
            { label: "Scorecards", value: stats.scorecards || 0, icon: Star, color: "text-amber-500" },
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

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !trendData?.top_topics ? (
        /* Fallback: show live data without AI */
        <div className="space-y-6">
          <Card className="border-orange-200 bg-orange-50/30">
            <CardContent className="pt-4 pb-4 flex items-center gap-2 text-sm text-orange-700">
              <Activity className="w-4 h-4" />
              AI analysis is generating — showing live platform data below.
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" />Top Petitions</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {petitions.slice(0, 6).map(p => (
                  <div key={p.id} onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}
                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <span className="text-sm text-slate-800 flex-1 line-clamp-1">{p.title}</span>
                    <span className="text-xs text-orange-600 font-bold">{(p.signature_count_total || 0).toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Vote className="w-4 h-4 text-blue-500" />Top Votes</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {polls.slice(0, 6).map(p => (
                  <div key={p.id} onClick={() => navigate(createPageUrl("PollDetail") + `?id=${p.id}`)}
                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <span className="text-sm text-slate-800 flex-1 line-clamp-1">{p.question}</span>
                    <span className="text-xs text-blue-600 font-bold">{(p.total_votes_cached || 0).toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key insight banner */}
          {trendData.key_insight && (
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-blue-600 mb-1">AI KEY INSIGHT</div>
                  <p className="text-sm text-blue-900">{trendData.key_insight}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Public mood + sentiment */}
          {(trendData.public_mood || sentDist) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {trendData.public_mood && (
                <Card className="border-slate-200">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-xs font-semibold text-slate-500 mb-1">PUBLIC MOOD</div>
                    <p className="text-slate-800 font-medium">{trendData.public_mood}</p>
                  </CardContent>
                </Card>
              )}
              {sentDist && (
                <Card className="border-slate-200">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-xs font-semibold text-slate-500 mb-2">SENTIMENT DISTRIBUTION</div>
                    <SentimentBar distribution={sentDist} />
                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-600"><ThumbsUp className="w-2.5 h-2.5" />{sentDist.positive || 0} Positive</span>
                      <span className="flex items-center gap-1 text-slate-500"><Minus className="w-2.5 h-2.5" />{sentDist.neutral || 0} Neutral</span>
                      <span className="flex items-center gap-1 text-red-500"><ThumbsDown className="w-2.5 h-2.5" />{sentDist.negative || 0} Negative</span>
                      <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="w-2.5 h-2.5" />{sentDist.controversial || 0} Controversial</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {/* Top Topics */}
            <div className="md:col-span-1">
              <Card className="border-slate-200 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />Top Topics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {topics.slice(0, 8).map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge className={`${TOPIC_COLORS[t.color] || TOPIC_COLORS.blue} text-[10px] capitalize flex-shrink-0`}>
                        {t.name || t.label}
                      </Badge>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${Math.min((t.count || 1) * 10, 100)}%` }} />
                      </div>
                      {t.trend === "rising" && <TrendingUp className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                    </div>
                  ))}
                  {topics.length === 0 && <p className="text-xs text-slate-400">No topics detected yet</p>}
                </CardContent>
              </Card>
            </div>

            {/* Trending Now */}
            <div className="md:col-span-2">
              <Card className="border-orange-200 bg-orange-50/20 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />Trending Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {trending.slice(0, 6).map((item, i) => {
                    const cfg = MOMENTUM_CONFIG[item.momentum] || MOMENTUM_CONFIG.stable;
                    const MIcon = cfg.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-orange-100 last:border-0">
                        <MIcon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800 line-clamp-1">{item.title}</span>
                            <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{item.type}</Badge>
                          </div>
                          {item.reason && <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                  {trending.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No trending items detected</p>}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Hot Debates */}
          {debates.length > 0 && (
            <Card className="border-red-200 bg-red-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />Hot Debates
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {debates.map((d, i) => {
                    const cfg = INTENSITY_CONFIG[d.intensity] || INTENSITY_CONFIG.medium;
                    return (
                      <div key={i} className="bg-white border border-red-100 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800">{d.topic}</p>
                        {d.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick links to deeper sections */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "View Petitions", page: "Petitions", icon: FileText, color: "text-orange-500", desc: "Sign & track active campaigns" },
              { label: "Public Voting", page: "PublicVoting", icon: Vote, color: "text-blue-500", desc: "Vote on real policy issues" },
              { label: "Influence Index", page: "InfluenceIndex", icon: TrendingUp, color: "text-amber-500", desc: "See ranked impact scores" },
            ].map(({ label, page, icon: Icon, color, desc }) => (
              <Card key={page} onClick={() => navigate(createPageUrl(page))}
                className="border-slate-200 cursor-pointer hover:shadow-md transition-all group">
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{label}</div>
                    <div className="text-xs text-slate-500">{desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
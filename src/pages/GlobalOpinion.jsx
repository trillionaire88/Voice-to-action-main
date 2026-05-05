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
import { Progress } from "@/components/ui/progress";
import {
  Globe2, Users, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, Brain, RefreshCw, Shield,
  BarChart3, FileText, Vote, Star, Zap, Activity,
  ThumbsUp, ThumbsDown, ArrowRight, ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Shared helpers ────────────────────────────────────────────────────────

const CONSENSUS_LABEL_CONFIG = {
  strong_consensus: { color: "bg-emerald-50 text-emerald-800 border-emerald-300", label: "Strong Consensus" },
  moderate_consensus: { color: "bg-blue-50 text-blue-800 border-blue-200", label: "Moderate Consensus" },
  divided_opinion: { color: "bg-amber-50 text-amber-800 border-amber-200", label: "Divided Opinion" },
  highly_controversial: { color: "bg-red-50 text-red-800 border-red-200", label: "Highly Controversial" },
  no_clear_majority: { color: "bg-slate-50 text-slate-700 border-slate-200", label: "No Clear Majority" },
};

const DIVISION_CONFIG = {
  low: { color: "text-emerald-600", label: "Low Division" },
  moderate: { color: "text-amber-600", label: "Moderate Division" },
  high: { color: "text-orange-600", label: "High Division" },
  extreme: { color: "text-red-600", label: "Extreme Division" },
};

const CONFIDENCE_CONFIG = {
  high: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "High Confidence" },
  medium: { color: "bg-blue-50 text-blue-700 border-blue-200", label: "Medium Confidence" },
  low: { color: "bg-slate-50 text-slate-600 border-slate-200", label: "Low Confidence" },
};

function TrendIcon({ direction }) {
  if (direction === "gaining_support" || direction === "increasing") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (direction === "losing_support" || direction === "decreasing") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  if (direction === "volatile") return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function ConsensusScoreRing({ score, size = 80 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#3b82f6" : score >= 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={size * 0.09} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.09}
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2 + size * 0.07} textAnchor="middle" fontSize={size * 0.22} fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-[10px] text-slate-500 -mt-1">Consensus</span>
    </div>
  );
}

function SupportBar({ support, oppose, neutral }) {
  return (
    <div className="space-y-1">
      <div className="flex rounded-full overflow-hidden h-2.5">
        <div className="bg-emerald-400" style={{ width: `${support}%` }} title={`Support ${support}%`} />
        <div className="bg-slate-200" style={{ width: `${neutral || Math.max(0, 100 - support - oppose)}%` }} />
        <div className="bg-red-400" style={{ width: `${oppose}%` }} title={`Oppose ${oppose}%`} />
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-emerald-600 font-semibold">{support}% Support</span>
        <span className="text-slate-500">{neutral || Math.max(0, 100 - support - oppose)}% Neutral</span>
        <span className="text-red-500 font-semibold">{oppose}% Oppose</span>
      </div>
    </div>
  );
}

function IssueCard({ issue, onClick }) {
  const labelCfg = CONSENSUS_LABEL_CONFIG[issue.consensus_label?.toLowerCase().replace(/ /g, "_")] || CONSENSUS_LABEL_CONFIG.no_clear_majority;
  const divCfg = DIVISION_CONFIG[issue.division_index] || DIVISION_CONFIG.moderate;
  return (
    <div onClick={onClick} className="py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="font-medium text-sm text-slate-900 line-clamp-1">{issue.title}</span>
            <TrendIcon direction={issue.trend_direction} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`${labelCfg.color} text-[10px]`}>{labelCfg.label}</Badge>
            <span className={`text-[10px] font-medium ${divCfg.color}`}>{divCfg.label}</span>
            {issue.confidence && <Badge className={`${CONFIDENCE_CONFIG[issue.confidence]?.color || CONFIDENCE_CONFIG.medium.color} text-[10px]`}>{CONFIDENCE_CONFIG[issue.confidence]?.label}</Badge>}
          </div>
        </div>
        <ConsensusScoreRing score={issue.consensus_score || 50} size={48} />
      </div>
      <SupportBar support={issue.support_pct || 50} oppose={issue.oppose_pct || 30} neutral={issue.neutral_pct || 20} />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function GlobalOpinion() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: consensusData, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["globalConsensus", refreshKey],
    queryFn: async () => null,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Fallback live data
  const { data: petitions = [] } = useQuery({
    queryKey: ["gopPetitions"],
    queryFn: async () => {
      const { data } = await supabase.from("petitions").select("*").eq("status", "active").order("signature_count_total", { ascending: false }).limit(10);
      return data || [];
    },
  });
  const { data: polls = [] } = useQuery({
    queryKey: ["gopPolls"],
    queryFn: async () => {
      const { data } = await supabase.from("polls").select("*").eq("status", "open").order("total_votes_cached", { ascending: false }).limit(10);
      return data || [];
    },
  });
  const { data: scorecards = [] } = useQuery({
    queryKey: ["gopScorecards"],
    queryFn: async () => {
      const { data } = await supabase.from("scorecards").select("*").eq("status", "approved").order("total_ratings", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const c = consensusData?.consensus || {};
  const stats = consensusData?.raw_stats || {};
  const issues = c.issues || [];
  const mostAgreed = c.most_agreed || [];
  const mostControversial = c.most_controversial || [];
  const fastestChanging = c.fastest_changing || [];
  const consensusScore = c.global_consensus_score || 0;
  const consensusLabelKey = c.consensus_label || "no_clear_majority";
  const consensusLabelCfg = CONSENSUS_LABEL_CONFIG[consensusLabelKey] || CONSENSUS_LABEL_CONFIG.no_clear_majority;

  // Compute simple scorecard consensus from live data (fallback)
  const liveScorecardConsensus = useMemo(() => scorecards.map(s => ({
    name: s.name,
    support_pct: s.raw_approval_score || 50,
    oppose_pct: Math.max(0, 100 - (s.raw_approval_score || 50) - 10),
    neutral_pct: 10,
    consensus_score: Math.round(Math.abs((s.raw_approval_score || 50) - 50) * 2),
    total: s.total_ratings || 0,
  })), [scorecards]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Globe2 className="w-4 h-4" />Consensus Engine
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Global Opinion</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Measuring collective opinion across petitions, votes, and scorecards — weighted by credibility and verified participation.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={isFetching}>
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Computing..." : "Refresh Consensus"}
          </Button>
          {dataUpdatedAt && <span className="text-xs text-slate-400">Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}</span>}
        </div>
      </div>

      {/* Global score banner */}
      {!isLoading && consensusData && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 mb-8">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ConsensusScoreRing score={consensusScore} size={100} />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                  <Badge className={`${consensusLabelCfg.color} text-sm px-3 py-1`}>{consensusLabelCfg.label}</Badge>
                </div>
                {c.platform_summary && <p className="text-sm text-slate-700 mt-2 max-w-xl">{c.platform_summary}</p>}
                {c.majority_opinion && <p className="text-xs text-slate-500 mt-1 italic">"{c.majority_opinion}"</p>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {[
                  { label: "Petitions", value: stats.petitions || petitions.length, color: "text-orange-500" },
                  { label: "Total Sigs", value: (stats.total_petition_sigs || 0).toLocaleString(), color: "text-slate-700" },
                  { label: "Countries", value: stats.countries || "–", color: "text-blue-600" },
                  { label: "Verified Rate", value: `${stats.verified_sig_rate || 0}%`, color: "text-emerald-600" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className={`text-xl font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="issues">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full mb-6">
            <TabsTrigger value="issues"><Activity className="w-3 h-3 mr-1" />All Issues</TabsTrigger>
            <TabsTrigger value="agreed"><CheckCircle2 className="w-3 h-3 mr-1" />Most Agreed</TabsTrigger>
            <TabsTrigger value="controversial"><AlertTriangle className="w-3 h-3 mr-1" />Controversial</TabsTrigger>
            <TabsTrigger value="summary"><Brain className="w-3 h-3 mr-1" />AI Summary</TabsTrigger>
            <TabsTrigger value="scorecards"><Star className="w-3 h-3 mr-1" />Scorecards</TabsTrigger>
          </TabsList>

          {/* ── ALL ISSUES ── */}
          <TabsContent value="issues">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-blue-500" />Issue Consensus Rankings
                  {issues.length > 0 && <Badge variant="outline" className="text-xs">{issues.length}</Badge>}
                </CardTitle>
                <p className="text-xs text-slate-500">Support/oppose split weighted by credibility and verified participation</p>
              </CardHeader>
              <CardContent className="pt-0">
                {issues.length > 0 ? (
                  issues.map((issue, i) => (
                    <IssueCard key={i} issue={issue}
                      onClick={() => {
                        if (issue.type === "petition") navigate(createPageUrl("Petitions"));
                        else if (issue.type === "poll") navigate(createPageUrl("PublicVoting"));
                        else navigate(createPageUrl("Scorecards"));
                      }}
                    />
                  ))
                ) : (
                  /* Fallback: show live scorecards */
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Run consensus analysis to see weighted issue breakdown. Live scorecard data below:</p>
                    {liveScorecardConsensus.slice(0, 8).map((s, i) => (
                      <div key={i} className="py-3 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-medium text-sm text-slate-800 flex-1">{s.name}</span>
                          <span className="text-xs text-slate-500">{s.total} ratings</span>
                          <ConsensusScoreRing score={s.consensus_score} size={40} />
                        </div>
                        <SupportBar support={s.support_pct} oppose={s.oppose_pct} neutral={s.neutral_pct} />
                      </div>
                    ))}
                    {liveScorecardConsensus.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No data yet. Add petitions, votes, or scorecards.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MOST AGREED ── */}
          <TabsContent value="agreed">
            <Card className="border-emerald-200 bg-emerald-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Most Agreed Issues</CardTitle>
                <p className="text-xs text-slate-500">Issues with the strongest public consensus</p>
              </CardHeader>
              <CardContent className="pt-0">
                {mostAgreed.length > 0 ? mostAgreed.map((item, i) => (
                  <div key={i} className="py-3 border-b border-emerald-100 last:border-0">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-sm text-slate-800">{item.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{item.type}</Badge>
                          <span className="text-xs text-emerald-600 font-semibold">Score: {item.consensus_score}</span>
                        </div>
                        {item.reason && <p className="text-xs text-slate-500 mt-1">{item.reason}</p>}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 text-center py-8">Run consensus analysis to see results</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CONTROVERSIAL ── */}
          <TabsContent value="controversial">
            <div className="space-y-4">
              <Card className="border-red-200 bg-red-50/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Most Controversial Issues</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {mostControversial.length > 0 ? mostControversial.map((item, i) => (
                    <div key={i} className="py-3 border-b border-red-100 last:border-0">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-sm text-slate-800">{item.title}</span>
                          <Badge variant="outline" className="text-[10px] capitalize ml-1.5">{item.type}</Badge>
                          {item.division_reason && <p className="text-xs text-slate-600 mt-1">{item.division_reason}</p>}
                        </div>
                      </div>
                    </div>
                  )) : (
                    /* Fallback: show most split scorecards */
                    liveScorecardConsensus
                      .filter(s => s.support_pct >= 30 && s.support_pct <= 70)
                      .sort((a, b) => a.consensus_score - b.consensus_score)
                      .slice(0, 6).map((s, i) => (
                        <div key={i} className="py-3 border-b border-slate-100 last:border-0">
                          <span className="font-medium text-sm text-slate-800">{s.name}</span>
                          <div className="mt-1.5"><SupportBar support={s.support_pct} oppose={s.oppose_pct} neutral={s.neutral_pct} /></div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              {fastestChanging.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" />Fastest Changing Opinions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {fastestChanging.map((item, i) => (
                      <div key={i} className="py-2 border-b border-amber-50 last:border-0">
                        <span className="font-medium text-sm text-slate-800">{item.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize ml-1.5">{item.type}</Badge>
                        {item.change_description && <p className="text-xs text-slate-500 mt-0.5">{item.change_description}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── AI SUMMARY ── */}
          <TabsContent value="summary">
            <div className="space-y-4">
              {c.ai_summary ? (
                <>
                  <Card className="border-purple-200 bg-purple-50/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" />AI Consensus Analysis</CardTitle></CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {[
                        { label: "Current Majority Opinion", value: c.ai_summary.current_majority, color: "border-emerald-200 bg-emerald-50/30" },
                        { label: "Where Disagreement Exists", value: c.ai_summary.where_disagreement_exists, color: "border-red-200 bg-red-50/20" },
                        { label: "Where Opinion Is Shifting", value: c.ai_summary.where_opinion_shifting, color: "border-amber-200 bg-amber-50/20" },
                        { label: "Predicted Future Direction", value: c.ai_summary.predicted_future, color: "border-blue-200 bg-blue-50/20" },
                      ].map(({ label, value, color }) => value && (
                        <div key={label} className={`border rounded-lg p-3 ${color}`}>
                          <div className="text-xs font-semibold text-slate-600 mb-1">{label.toUpperCase()}</div>
                          <p className="text-sm text-slate-700">{value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {c.main_divisions?.length > 0 && (
                    <Card className="border-slate-200">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Main Divisions</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        {c.main_divisions.map((d, i) => (
                          <div key={i} className="flex items-start gap-2 py-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-700">{d}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {c.confidence_indicators && (
                    <Card className="border-slate-200">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Data Confidence</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${CONFIDENCE_CONFIG[c.confidence_indicators.overall_confidence]?.color || CONFIDENCE_CONFIG.medium.color}`}>
                            {CONFIDENCE_CONFIG[c.confidence_indicators.overall_confidence]?.label || "Medium Confidence"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">Data Volume: {c.confidence_indicators.data_volume}</Badge>
                          <Badge variant="outline" className="text-xs">Verification: {c.confidence_indicators.verification_rate}%</Badge>
                          <Badge variant="outline" className="text-xs">Geo Diversity: {c.confidence_indicators.geographic_diversity}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {c.regional_notes?.length > 0 && (
                    <Card className="border-slate-200">
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe2 className="w-4 h-4 text-blue-500" />Regional Notes</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        {c.regional_notes.map((r, i) => (
                          <div key={i} className="py-2 border-b border-slate-100 last:border-0">
                            <span className="font-semibold text-sm text-slate-800">{r.region}: </span>
                            <span className="text-sm text-slate-600">{r.dominant_view}</span>
                            {r.notes && <p className="text-xs text-slate-500 mt-0.5">{r.notes}</p>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-slate-200">
                  <CardContent className="pt-8 pb-8 text-center">
                    <Brain className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium mb-1">AI Consensus Analysis</p>
                    <p className="text-sm text-slate-500 mb-4">Click "Refresh Consensus" to generate the AI-powered consensus summary</p>
                    <Button size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={isFetching}>
                      <Brain className="w-3 h-3 mr-1.5" />Generate Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── SCORECARDS ── */}
          <TabsContent value="scorecards">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Scorecard Consensus</CardTitle>
                <p className="text-xs text-slate-500">Approval ratings and public division index for all scorecards</p>
              </CardHeader>
              <CardContent className="pt-0">
                {liveScorecardConsensus.length > 0 ? liveScorecardConsensus.map((s, i) => (
                  <div key={i} className="py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 px-2 rounded-lg"
                    onClick={() => navigate(createPageUrl("Scorecards"))}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium text-sm text-slate-900 flex-1 line-clamp-1">{s.name}</span>
                      <span className="text-xs text-slate-500">{s.total} ratings</span>
                      <ConsensusScoreRing score={s.consensus_score} size={44} />
                    </div>
                    <SupportBar support={s.support_pct} oppose={s.oppose_pct} neutral={s.neutral_pct} />
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 text-center py-8">No scorecards yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
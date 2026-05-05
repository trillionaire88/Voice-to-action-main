import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle2, Globe2, Users, AlertTriangle } from "lucide-react";

export function computeCredibility(scorecard, ratings = []) {
  const total = scorecard.total_ratings || 0;
  if (total < 5) return { score: 0, label: "insufficient_data" };

  const valid = ratings.filter(r => !r.is_invalidated && !r.is_suspicious);
  const verifiedPct = total > 0 ? (scorecard.verified_ratings_count || 0) / total : 0;
  const countries = scorecard.countries_represented || [...new Set(valid.map(r => r.user_country_code).filter(Boolean))].length;
  const suspiciousCount = ratings.filter(r => r.is_suspicious).length;
  const suspiciousPct = total > 0 ? suspiciousCount / total : 0;

  let score = 0;
  score += Math.min(30, verifiedPct * 50);
  score += Math.min(20, (countries / 8) * 20);
  score += Math.min(20, Math.log10(Math.max(total, 1)) * 7);
  score += verifiedPct >= 0.4 ? 15 : 0;
  score -= suspiciousPct * 30;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let label = "insufficient_data";
  if (score >= 75) label = "highly_credible";
  else if (score >= 55) label = "credible";
  else if (score >= 35) label = "moderate";
  else if (score >= 10) label = "low";

  return { score, label };
}

export default function ScorecardCredibilityBadge({ scorecard, ratings = [] }) {
  const { score, label } = useMemo(() => computeCredibility(scorecard, ratings), [scorecard, ratings]);

  const cfg = {
    insufficient_data: { color: "text-slate-400", ring: "text-slate-300", bg: "bg-slate-50 border-slate-200", text: "Insufficient Data" },
    low: { color: "text-red-500", ring: "text-red-300", bg: "bg-red-50 border-red-200", text: "Low Credibility" },
    moderate: { color: "text-amber-500", ring: "text-amber-300", bg: "bg-amber-50 border-amber-200", text: "Moderate Credibility" },
    credible: { color: "text-blue-600", ring: "text-blue-300", bg: "bg-blue-50 border-blue-200", text: "Credible" },
    highly_credible: { color: "text-emerald-600", ring: "text-emerald-300", bg: "bg-emerald-50 border-emerald-200", text: "Highly Credible" },
  };
  const c = cfg[label] || cfg.insufficient_data;
  const total = scorecard.total_ratings || 0;
  const verified = scorecard.verified_ratings_count || 0;
  const countries = scorecard.countries_represented || 0;
  const suspicious = ratings.filter(r => r.is_suspicious).length;

  return (
    <Card className={`border ${c.bg}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />Credibility Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 138.2} 138.2`}
                className={c.color} />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-extrabold ${c.color}`}>{score}</span>
          </div>
          <div>
            <p className={`font-bold ${c.color}`}>{c.text}</p>
            <p className="text-xs text-slate-500">out of 100</p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="flex items-center gap-1 text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500" />Verified</span>
            <span className="font-semibold text-emerald-600">{verified.toLocaleString()} ({total > 0 ? Math.round((verified / total) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1 text-slate-600"><Globe2 className="w-3 h-3 text-blue-500" />Countries</span>
            <span className="font-semibold text-blue-600">{countries}</span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1 text-slate-600"><Users className="w-3 h-3" />Total Ratings</span>
            <span className="font-semibold">{total.toLocaleString()}</span>
          </div>
          {suspicious > 0 && (
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-orange-600"><AlertTriangle className="w-3 h-3" />Flagged</span>
              <span className="font-semibold text-orange-600">{suspicious}</span>
            </div>
          )}
        </div>

        {label !== "insufficient_data" && (
          <Progress value={score} className="h-1.5" />
        )}
      </CardContent>
    </Card>
  );
}
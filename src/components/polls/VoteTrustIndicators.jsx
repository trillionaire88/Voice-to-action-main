import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield, CheckCircle2, Globe2, Users, TrendingUp, AlertTriangle,
  Star, Activity, MapPin
} from "lucide-react";

/**
 * Computes and displays public trust labels + credibility score for a poll.
 * Uses only aggregated/public data — no individual voter info displayed.
 */
export default function VoteTrustIndicators({ poll, votes = [] }) {
  const total = poll?.total_votes_cached || 0;
  const verified = poll?.verified_votes_count || 0;
  const countries = poll?.countries_represented || 0;

  const { credibilityScore, credibilityLabel, credibilityColor, trustLabels, indicators } = useMemo(() => {
    if (total === 0) return { credibilityScore: 0, credibilityLabel: "No Data", credibilityColor: "text-slate-400", trustLabels: [], indicators: [] };

    const verifiedPct = verified / total;
    const countryCounts = {};
    votes.forEach(v => {
      if (v.user_country_code_snapshot) {
        countryCounts[v.user_country_code_snapshot] = (countryCounts[v.user_country_code_snapshot] || 0) + 1;
      }
    });
    const topCountryPct = Object.values(countryCounts).length > 0
      ? Math.max(...Object.values(countryCounts)) / total
      : (votes.length > 0 ? 1 : 0.5);

    // Credibility score (0-100)
    let score = 0;
    score += Math.min(30, verifiedPct * 50);            // up to 30 for verified ratio
    score += Math.min(20, (countries / 10) * 20);       // up to 20 for geo diversity
    score += Math.min(20, Math.log10(Math.max(total, 1)) * 7); // up to 20 for volume
    score += (1 - topCountryPct) * 20;                  // up to 20 for distribution balance
    score += verifiedPct >= 0.5 ? 10 : 0;               // bonus for verified majority
    score = Math.min(100, Math.round(score));

    let credibilityLabel = "Low Credibility";
    let credibilityColor = "text-red-500";
    if (score >= 80) { credibilityLabel = "Highly Credible"; credibilityColor = "text-emerald-600"; }
    else if (score >= 60) { credibilityLabel = "Credible"; credibilityColor = "text-blue-600"; }
    else if (score >= 40) { credibilityLabel = "Moderate"; credibilityColor = "text-amber-600"; }
    else if (score >= 20) { credibilityLabel = "Low Credibility"; credibilityColor = "text-orange-600"; }
    else { credibilityLabel = "Insufficient Data"; credibilityColor = "text-slate-400"; }

    // Auto trust labels
    const trustLabels = [];
    if (total >= 10000 && countries >= 10) trustLabels.push({ label: "International Vote", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Globe2 });
    else if (countries >= 5) trustLabels.push({ label: "National Support", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Globe2 });
    else if (countries >= 2) trustLabels.push({ label: "Regional Majority", color: "bg-purple-50 text-purple-700 border-purple-200", icon: MapPin });
    if (verifiedPct >= 0.6 && total >= 50) trustLabels.push({ label: "Verified Majority", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 });
    if (total >= 10000) trustLabels.push({ label: "High Participation", color: "bg-amber-50 text-amber-700 border-amber-200", icon: TrendingUp });
    else if (total >= 1000) trustLabels.push({ label: "Growing Support", color: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: Activity });

    const indicators = [
      { label: "Total Votes", value: total.toLocaleString(), icon: Users, color: "text-slate-700" },
      { label: "Verified Votes", value: `${verified.toLocaleString()} (${(verifiedPct * 100).toFixed(0)}%)`, icon: CheckCircle2, color: "text-emerald-600" },
      { label: "Countries", value: countries > 0 ? countries : votes.length > 0 ? [...new Set(votes.map(v => v.user_country_code_snapshot).filter(Boolean))].length : "—", icon: Globe2, color: "text-blue-600" },
    ];

    return { credibilityScore: score, credibilityLabel, credibilityColor, trustLabels, indicators };
  }, [poll, votes]);

  if (total === 0) return null;

  const ringColor = credibilityScore >= 80 ? "text-emerald-500"
    : credibilityScore >= 60 ? "text-blue-500"
    : credibilityScore >= 40 ? "text-amber-500"
    : "text-red-400";

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Vote Credibility & Trust
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credibility score ring */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(credibilityScore / 100) * 138.2} 138.2`}
                className={ringColor}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-extrabold ${ringColor}`}>
              {credibilityScore}
            </span>
          </div>
          <div>
            <p className={`font-bold text-base ${credibilityColor}`}>{credibilityLabel}</p>
            <p className="text-xs text-slate-500">Credibility score out of 100</p>
          </div>
        </div>

        {/* Trust labels */}
        {trustLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trustLabels.map(({ label, color, icon: Icon }) => (
              <Badge key={label} className={`${color} text-xs flex items-center gap-1`}>
                <Icon className="w-2.5 h-2.5" />{label}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="space-y-1.5">
          {indicators.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Icon className={`w-3.5 h-3.5 ${color}`} />{label}
              </span>
              <span className={`font-semibold ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Verified ratio bar */}
        {total > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Verified voter ratio</span>
              <span>{((verified / total) * 100).toFixed(0)}%</span>
            </div>
            <Progress value={(verified / total) * 100} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
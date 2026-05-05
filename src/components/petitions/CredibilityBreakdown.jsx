import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronDown, ChevronUp, CheckCircle2, Users, Globe, MessageSquare, TrendingUp } from "lucide-react";
import CredibilityBadge from "./CredibilityBadge";

function ScoreRow({ label, value, max, icon: Icon, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          {label}
        </span>
        <span className="font-bold text-slate-700">{Math.round(value)}<span className="text-slate-400 font-normal">/{max}</span></span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CredibilityBreakdown({ credibility, petition }) {
  const [expanded, setExpanded] = useState(false);

  if (!credibility) return null;

  const verifiedPct = credibility.total_sigs > 0
    ? Math.round((credibility.verified_sigs / credibility.total_sigs) * 100)
    : 0;

  const engagementLevel = credibility.engagement_score >= 70 ? "High" : credibility.engagement_score >= 40 ? "Medium" : "Low";

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Credibility Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Public summary */}
        <CredibilityBadge badge={credibility.badge} score={credibility.overall_score} />

        {/* Simplified public breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <div className="text-slate-500 mb-0.5">Verified Signatures</div>
            <div className="font-bold text-slate-900 text-base">{credibility.verified_sigs?.toLocaleString() || 0}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <div className="text-slate-500 mb-0.5">Verification Rate</div>
            <div className="font-bold text-slate-900 text-base">{verifiedPct}%</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <div className="text-slate-500 mb-0.5">Engagement</div>
            <div className={`font-bold text-base ${engagementLevel === "High" ? "text-emerald-700" : engagementLevel === "Medium" ? "text-amber-700" : "text-slate-700"}`}>
              {engagementLevel}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <div className="text-slate-500 mb-0.5">Countries</div>
            <div className="font-bold text-slate-900 text-base">{credibility.country_count || 0}</div>
          </div>
        </div>

        {/* Expandable score details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 py-1"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Hide breakdown</> : <><ChevronDown className="w-3 h-3" />View score breakdown</>}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <ScoreRow label="Signature Authenticity" value={credibility.auth_score * 30 / 100} max={30} icon={CheckCircle2} color="text-emerald-600" />
            <ScoreRow label="Account Trust" value={credibility.trust_score * 20 / 100} max={20} icon={Users} color="text-blue-600" />
            <ScoreRow label="Engagement Quality" value={credibility.engagement_score * 20 / 100} max={20} icon={MessageSquare} color="text-purple-600" />
            <ScoreRow label="Growth Pattern" value={credibility.growth_score * 15 / 100} max={15} icon={TrendingUp} color="text-amber-600" />
            <ScoreRow label="Geographic Diversity" value={credibility.geo_score * 15 / 100} max={15} icon={Globe} color="text-indigo-600" />

            {credibility.penalty_reasons?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-xs">
                <p className="text-orange-700 font-semibold mb-1">Penalties applied (-{Math.round(credibility.penalty_applied)} pts)</p>
                <ul className="list-disc list-inside text-orange-600 space-y-0.5">
                  {credibility.penalty_reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            <p className="text-xs text-slate-400 italic">
              Scores reflect authenticity signals only. They do not indicate whether the petition's cause is valid.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
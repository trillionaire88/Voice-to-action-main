import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, MapPin, Shield, Calendar, BarChart3 } from "lucide-react";
import { format } from "date-fns";

function StatBox({ icon: Icon, label, value, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-xl p-4 text-center ${colors[color]}`}>
      <Icon className="w-5 h-5 mx-auto mb-1 opacity-70" />
      <div className="text-2xl font-bold">{value ?? "—"}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

export default function PetitionAnalyticsDashboard({ petitionId }) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["petitionAnalytics", petitionId],
    queryFn: async () => {
      const results = await api.entities.PetitionAnalytics.filter({ petition_id: petitionId });
      return results[0] || null;
    },
    enabled: !!petitionId,
  });

  if (isLoading) return (
    <Card className="border-slate-200">
      <CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent>
    </Card>
  );

  if (!analytics) return (
    <Card className="border-slate-200 bg-slate-50">
      <CardContent className="pt-6 pb-4 text-center text-slate-500 text-sm">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        Analytics will appear after the first daily update.
      </CardContent>
    </Card>
  );

  const verifiedPct = analytics.total_signatures > 0
    ? Math.round((analytics.verified_signatures / analytics.total_signatures) * 100)
    : 0;

  return (
    <Card className="border-blue-200 bg-blue-50/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          Petition Analytics
          {analytics.last_updated && (
            <span className="text-xs text-slate-400 font-normal ml-auto">
              Updated {format(new Date(analytics.last_updated), "MMM d, HH:mm")}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Growth stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox icon={Calendar} label="Today" value={analytics.signatures_today} color="blue" />
          <StatBox icon={TrendingUp} label="7 Days" value={analytics.signatures_7_days} color="green" />
          <StatBox icon={Users} label="30 Days" value={analytics.signatures_30_days} color="purple" />
        </div>

        {/* Verified score bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-600" />Verified Score</span>
            <span className="font-bold text-emerald-700">{analytics.verified_score ?? verifiedPct}/100</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.min(analytics.verified_score ?? verifiedPct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{analytics.verified_signatures} verified of {analytics.total_signatures} total</p>
        </div>

        {/* Source breakdown */}
        {(analytics.direct_signatures > 0 || analytics.referral_signatures > 0) && (
          <div className="border-t border-blue-200 pt-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Signature Sources</p>
            {[
              { label: "Direct", value: analytics.direct_signatures, pct: analytics.total_signatures > 0 ? Math.round(analytics.direct_signatures / analytics.total_signatures * 100) : 0 },
              { label: "Referral", value: analytics.referral_signatures, pct: analytics.total_signatures > 0 ? Math.round(analytics.referral_signatures / analytics.total_signatures * 100) : 0 },
              { label: "Community", value: analytics.community_signatures, pct: analytics.total_signatures > 0 ? Math.round(analytics.community_signatures / analytics.total_signatures * 100) : 0 },
            ].filter(s => s.value > 0).map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">{s.label}</span>
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
                <span className="text-xs text-slate-600 w-8 text-right">{s.pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Geo & growth */}
        <div className="flex gap-3 text-xs text-slate-600 border-t border-blue-200 pt-3">
          {analytics.countries_count > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{analytics.countries_count} countries
            </span>
          )}
          {analytics.growth_rate_7d !== 0 && (
            <span className={`flex items-center gap-1 font-medium ${analytics.growth_rate_7d > 0 ? "text-emerald-600" : "text-red-500"}`}>
              <TrendingUp className="w-3 h-3" />{analytics.growth_rate_7d > 0 ? "+" : ""}{analytics.growth_rate_7d.toFixed(1)}% (7d)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
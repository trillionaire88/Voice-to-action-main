import React, { useState } from "react";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Brain, TrendingUp, TrendingDown, Flame, AlertTriangle,
  RefreshCw, Zap, Activity, Download, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

const GROWTH_COLORS = {
  viral: "text-red-600", rapid: "text-orange-600",
  stable: "text-blue-600", slow: "text-slate-500",
};
const CONFIDENCE_COLORS = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};
const TOPIC_STAGE_COLORS = {
  emerging: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rising: "bg-amber-50 text-amber-700 border-amber-200",
  peak: "bg-red-50 text-red-700 border-red-200",
  declining: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function ForecastAdminPanel() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await api.functions.invoke("predictionEngine", {});
      setForecast(res.data);
      toast.success("Forecast generated");
    } catch (e) {
      toast.error("Forecast failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!forecast) return;
    const f = forecast.forecasts || {};
    const lines = [
      "# Platform Forecast Report",
      `Generated: ${new Date(forecast.generated_at).toLocaleString()}`,
      "",
      "## Platform Outlook",
      `Overall growth: ${f.platform_forecast?.overall_growth}`,
      `30-day outlook: ${f.platform_forecast?.["30day_outlook"]}`,
      "",
      "## Petition Forecasts",
      ...(f.petition_forecasts || []).map(p => `- ${p.title}: ${p.trend_direction}, virality: ${p.virality_probability}, 7d est: ${p.predicted_7d}`),
      "",
      "## Viral Alerts",
      ...(f.viral_alerts || []).map(a => `- ${a.title} (${a.probability}): ${a.reason}`),
      "",
      "## Topic Forecasts",
      ...(f.topic_forecasts || []).map(t => `- ${t.topic}: ${t.stage} — ${t.description}`),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `forecast-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const f = forecast?.forecasts || {};
  const pf = f.platform_forecast || {};

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={run} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
          <Brain className={`w-4 h-4 mr-2 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Running Forecast..." : "Run Platform Forecast"}
        </Button>
        {forecast && (
          <Button variant="outline" onClick={download}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
        )}
      </div>

      {loading && <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>}

      {forecast && !loading && (
        <div className="space-y-4">
          {/* Platform overview */}
          <Card className="border-indigo-200 bg-indigo-50/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-600" />Platform Outlook</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Overall Growth:</span>
                <span className={`text-sm font-bold capitalize ${GROWTH_COLORS[pf.overall_growth] || "text-slate-700"}`}>{pf.overall_growth}</span>
              </div>
              {pf["30day_outlook"] && <p className="text-sm text-slate-700">{pf["30day_outlook"]}</p>}
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {pf.key_risks?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-red-600 mb-1">RISKS</div>
                    {pf.key_risks.map((r, i) => <p key={i} className="text-xs text-slate-600">• {r}</p>)}
                  </div>
                )}
                {pf.key_opportunities?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-emerald-600 mb-1">OPPORTUNITIES</div>
                    {pf.key_opportunities.map((o, i) => <p key={i} className="text-xs text-slate-600">• {o}</p>)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Petition forecasts */}
            {f.petition_forecasts?.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Petition Forecasts</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {f.petition_forecasts.slice(0, 5).map((p, i) => (
                    <div key={i} className="border-b border-orange-50 last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-slate-800 flex-1 line-clamp-1">{p.title}</span>
                        <Badge className={`${CONFIDENCE_COLORS[p.confidence] || CONFIDENCE_COLORS.medium} text-[10px]`}>{p.confidence}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className={`font-semibold capitalize ${GROWTH_COLORS[p.growth_rate] || ""}`}>{p.growth_rate}</span>
                        {p.predicted_7d && <span>7d est: <strong>{p.predicted_7d?.toLocaleString()}</strong></span>}
                        {p.virality_probability === "high" || p.virality_probability === "very_likely" ? <Flame className="w-3 h-3 text-orange-500" /> : null}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Viral alerts */}
            {f.viral_alerts?.length > 0 && (
              <Card className="border-red-200 bg-red-50/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Flame className="w-4 h-4 text-red-500" />Viral Alerts</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {f.viral_alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-slate-800">{a.title}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>
                          <span className={`text-[10px] font-semibold ${a.probability === "very_likely" ? "text-red-600" : "text-orange-500"}`}>{a.probability}</span>
                        </div>
                        {a.reason && <p className="text-[10px] text-slate-500 mt-0.5">{a.reason}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Topic forecasts */}
            {f.topic_forecasts?.length > 0 && (
              <Card className="border-slate-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Topic Outlook</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-1.5">
                  {f.topic_forecasts.slice(0, 6).map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Badge className={`${TOPIC_STAGE_COLORS[t.stage] || TOPIC_STAGE_COLORS.rising} text-[10px] flex-shrink-0`}>{t.stage}</Badge>
                      <div className="flex-1">
                        <span className="text-xs font-medium text-slate-800 capitalize">{t.topic}</span>
                        {t.description && <p className="text-[10px] text-slate-500">{t.description}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Manipulation warnings */}
            {f.manipulation_warnings?.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Manipulation Warnings</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {f.manipulation_warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${w.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                      <p className="text-xs text-slate-700">{w.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
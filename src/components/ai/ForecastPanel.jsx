import { useState } from "react";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Minus, Zap, AlertTriangle,
  Brain, RefreshCw, Activity, Flame
} from "lucide-react";
import { toast } from "sonner";

// Reusable panel — can be embedded in PetitionDetail, PollDetail, ScorecardDetail, or admin pages

const GROWTH_CONFIG = {
  viral: { color: "bg-red-50 text-red-700 border-red-200", label: "Viral Growth", icon: Flame },
  rapid: { color: "bg-orange-50 text-orange-700 border-orange-200", label: "Rapid Growth", icon: TrendingUp },
  stable: { color: "bg-blue-50 text-blue-700 border-blue-200", label: "Stable Growth", icon: Activity },
  slow: { color: "bg-slate-50 text-slate-600 border-slate-200", label: "Slow Growth", icon: Minus },
};

const VIRALITY_CONFIG = {
  very_likely: { color: "text-red-600 font-bold", label: "Very Likely Viral" },
  high: { color: "text-orange-600 font-semibold", label: "High Chance" },
  moderate: { color: "text-amber-600", label: "Moderate Chance" },
  low: { color: "text-slate-500", label: "Low Chance" },
};

const CONFIDENCE_CONFIG = {
  high: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "High Confidence" },
  medium: { color: "bg-blue-50 text-blue-700 border-blue-200", label: "Medium Confidence" },
  low: { color: "bg-slate-50 text-slate-600 border-slate-200", label: "Low Confidence" },
};

function TrendArrow({ direction }) {
  if (direction === "increasing") return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (direction === "decreasing") return <TrendingDown className="w-4 h-4 text-red-400" />;
  if (direction === "volatile") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

// Props: target_id, target_type ("petition"|"poll"|"scorecard"), compact (bool)
export default function ForecastPanel({ target_id, target_type, compact = false }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await api.functions.invoke("predictionEngine", { target_id, target_type });
      setForecast(res.data);
    } catch {
      toast.error("Forecast failed");
    } finally {
      setLoading(false);
    }
  };

  const f = forecast?.forecasts || {};

  // Extract the right forecast item
  const itemForecast = target_type === "petition"
    ? f.petition_forecasts?.[0]
    : target_type === "poll"
    ? f.poll_forecasts?.[0]
    : target_type === "scorecard"
    ? f.scorecard_forecasts?.[0]
    : null;

  const platformForecast = f.platform_forecast;
  const viralAlerts = f.viral_alerts || [];
  const topicForecasts = f.topic_forecasts || [];

  if (compact && !forecast) {
    return (
      <Button size="sm" variant="outline" onClick={run} disabled={loading} className="text-xs">
        <Brain className={`w-3 h-3 mr-1.5 ${loading ? "animate-pulse" : ""}`} />
        {loading ? "Forecasting..." : "AI Forecast"}
      </Button>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-white">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-600" />AI Forecast
          {forecast && <span className="text-[10px] text-slate-400 font-normal">
            {new Date(forecast.generated_at).toLocaleTimeString()}
          </span>}
        </CardTitle>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={run} disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "..." : forecast ? "Refresh" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && <Skeleton className="h-24 rounded-lg" />}

        {!loading && !forecast && (
          <p className="text-xs text-slate-500 text-center py-4">Click Generate to run AI prediction for this item</p>
        )}

        {!loading && forecast && (
          <div className="space-y-3">
            {/* Item-specific forecast */}
            {itemForecast && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {itemForecast.growth_rate && (() => {
                    const cfg = GROWTH_CONFIG[itemForecast.growth_rate] || GROWTH_CONFIG.stable;
                    return <Badge className={`${cfg.color} text-[10px]`}><cfg.icon className="w-2.5 h-2.5 mr-0.5" />{cfg.label}</Badge>;
                  })()}
                  {itemForecast.trend_direction && (
                    <div className="flex items-center gap-1">
                      <TrendArrow direction={itemForecast.trend_direction} />
                      <span className="text-xs text-slate-600 capitalize">{itemForecast.trend_direction?.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {itemForecast.confidence && (
                    <Badge className={`${CONFIDENCE_CONFIG[itemForecast.confidence]?.color} text-[10px]`}>
                      {CONFIDENCE_CONFIG[itemForecast.confidence]?.label}
                    </Badge>
                  )}
                </div>

                {itemForecast.virality_probability && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-slate-600">Virality: </span>
                    <span className={`text-xs ${VIRALITY_CONFIG[itemForecast.virality_probability]?.color || "text-slate-600"}`}>
                      {VIRALITY_CONFIG[itemForecast.virality_probability]?.label || itemForecast.virality_probability}
                    </span>
                  </div>
                )}

                {/* Predictions */}
                {(itemForecast.predicted_24h || itemForecast.predicted_7d || itemForecast.predicted_final) && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "24h", value: itemForecast.predicted_24h || itemForecast.predicted_24h_votes },
                      { label: "7 days", value: itemForecast.predicted_7d },
                      { label: "Final est.", value: itemForecast.predicted_final },
                    ].filter(x => x.value).map(({ label, value }) => (
                      <div key={label} className="bg-white border border-purple-100 rounded-lg p-2 text-center">
                        <div className="text-sm font-bold text-purple-700">{typeof value === "number" ? value.toLocaleString() : value}</div>
                        <div className="text-[10px] text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Approval trend for scorecards */}
                {itemForecast.approval_trend && (
                  <div className="flex items-center gap-1.5">
                    <TrendArrow direction={itemForecast.approval_trend === "rising" ? "increasing" : itemForecast.approval_trend === "falling" ? "decreasing" : "stable"} />
                    <span className="text-xs text-slate-700 capitalize">Approval: {itemForecast.approval_trend}</span>
                    {itemForecast.predicted_approval_shift && (
                      <span className={`text-xs font-semibold ${itemForecast.predicted_approval_shift > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {itemForecast.predicted_approval_shift > 0 ? "+" : ""}{itemForecast.predicted_approval_shift}%
                      </span>
                    )}
                  </div>
                )}

                {itemForecast.confidence_reason && (
                  <p className="text-[10px] text-slate-400 italic">{itemForecast.confidence_reason}</p>
                )}
              </div>
            )}

            {/* Platform forecast (when no specific target) */}
            {!target_id && platformForecast && (
              <div className="space-y-2">
                {platformForecast.overall_growth && (() => {
                  const cfg = GROWTH_CONFIG[platformForecast.overall_growth] || GROWTH_CONFIG.stable;
                  return <Badge className={`${cfg.color} text-[10px]`}><cfg.icon className="w-2.5 h-2.5 mr-0.5" />Platform: {cfg.label}</Badge>;
                })()}
                {platformForecast["30day_outlook"] && (
                  <p className="text-xs text-slate-600">{platformForecast["30day_outlook"]}</p>
                )}
              </div>
            )}

            {/* Viral alerts */}
            {viralAlerts.length > 0 && (
              <div className="border-t border-purple-100 pt-2">
                <div className="text-[10px] font-semibold text-slate-500 mb-1">VIRAL ALERTS</div>
                {viralAlerts.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 py-1">
                    <Flame className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-slate-800">{a.title}</span>
                      <span className={`text-[10px] ml-1 ${VIRALITY_CONFIG[a.probability]?.color || "text-slate-500"}`}>
                        — {VIRALITY_CONFIG[a.probability]?.label}
                      </span>
                      {a.reason && <p className="text-[10px] text-slate-500">{a.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Topic forecasts */}
            {topicForecasts.length > 0 && (
              <div className="border-t border-purple-100 pt-2">
                <div className="text-[10px] font-semibold text-slate-500 mb-1.5">TOPIC OUTLOOK</div>
                <div className="flex flex-wrap gap-1.5">
                  {topicForecasts.slice(0, 5).map((t, i) => (
                    <Badge key={i} variant="outline" className={`text-[10px] ${t.stage === "emerging" ? "border-emerald-200 text-emerald-700" : t.stage === "rising" ? "border-amber-200 text-amber-700" : t.stage === "peak" ? "border-red-200 text-red-700" : "border-slate-200 text-slate-500"}`}>
                      {t.topic} ({t.stage})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Settings, TrendingUp, AlertTriangle, CheckCircle2, Activity, Brain, Zap, Shield, Download
} from "lucide-react";
import { toast } from "sonner";

// Default parameter set — the "brain" of the adaptive engine
const DEFAULT_PARAMS = {
  credibility_weight: { value: 0.30, min: 0.10, max: 0.50, label: "Credibility Weight", desc: "How much credibility affects scoring" },
  reputation_weight: { value: 0.25, min: 0.10, max: 0.40, label: "Reputation Weight", desc: "Influence of user reputation" },
  influence_weight: { value: 0.20, min: 0.05, max: 0.35, label: "Influence Weight", desc: "Platform influence scoring weight" },
  fraud_detection_threshold: { value: 0.70, min: 0.50, max: 0.95, label: "Fraud Detection Threshold", desc: "Sensitivity for detecting fake activity" },
  brigading_threshold: { value: 0.65, min: 0.40, max: 0.90, label: "Brigading Threshold", desc: "Report cluster detection sensitivity" },
  trend_detection_limit: { value: 50, min: 10, max: 200, label: "Trend Detection Limit (sigs/hr)", desc: "Minimum activity to flag as trending" },
  consensus_weight_verified: { value: 0.60, min: 0.30, max: 0.80, label: "Consensus Verified Weight", desc: "Weight given to verified user votes in consensus" },
  prediction_smoothing: { value: 0.15, min: 0.05, max: 0.40, label: "Prediction Smoothing", desc: "Smoothing factor for growth predictions" },
};

export default function AdaptiveEnginePanel() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("approval"); // auto | approval
  const [locked, setLocked] = useState(new Set());
  const [log, setLog] = useState([]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const [petitions, reports, scorecards] = await Promise.all([
        api.entities.Petition.filter({ status: "active" }, "-signature_count_total", 20),
        api.entities.Report.filter({ status: "open" }),
        api.entities.Scorecard.filter({ status: "approved" }, "-total_ratings", 10),
      ]);

      const platformContext = `
Petitions: ${petitions.length} active, avg sigs: ${petitions.length > 0 ? Math.round(petitions.reduce((s,p)=>s+(p.signature_count_total||0),0)/petitions.length) : 0}
Bot suspect sigs: ${petitions.reduce((s,p)=>s+(p.bot_suspect_count||0),0)}
Open reports: ${reports.length}
High priority reports: ${reports.filter(r=>r.priority==="high"||r.priority==="critical").length}
Brigade suspects: ${reports.filter(r=>r.is_brigade_suspect).length}
Scorecards: ${scorecards.length}, avg credibility: ${scorecards.length > 0 ? Math.round(scorecards.reduce((s,sc)=>s+(sc.credibility_score||0),0)/scorecards.length) : 0}

Current parameter values:
${Object.entries(params).map(([_k,v]) => `${v.label}: ${v.value}`).join('\n')}`;

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `You are an Adaptive Engine for a civic platform. Analyze platform health data and suggest parameter adjustments.

Platform Data:
${platformContext}

Rules:
- Suggest small adjustments only (max ±0.05 for weights, max ±5 for thresholds)
- Always stay within min/max limits
- Log reason for each change
- If platform seems healthy, suggest no changes

Return JSON:
{
  "platform_health": "good|moderate|concerning|critical",
  "health_summary": string,
  "accuracy_score": number (0-100, current system accuracy estimate),
  "suggested_changes": [
    {
      "parameter": string (key from params),
      "current_value": number,
      "suggested_value": number,
      "reason": string,
      "confidence": "low|medium|high",
      "expected_improvement": string
    }
  ],
  "anomalies_detected": [
    {
      "type": string,
      "description": string,
      "severity": "low|medium|high"
    }
  ],
  "accuracy_metrics": {
    "fraud_detection_accuracy": number (0-100),
    "trend_prediction_accuracy": number (0-100),
    "credibility_reliability": number (0-100)
  },
  "recommendations": [string]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            platform_health: { type: "string" },
            health_summary: { type: "string" },
            accuracy_score: { type: "number" },
            suggested_changes: { type: "array", items: { type: "object" } },
            anomalies_detected: { type: "array", items: { type: "object" } },
            accuracy_metrics: { type: "object" },
            recommendations: { type: "array", items: { type: "string" } },
          },
        },
      });

      setAnalysis(result);
      toast.success("Adaptive analysis complete");
    } catch (e) {
      toast.error("Analysis failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyChange = (change) => {
    if (locked.has(change.parameter)) { toast.error("Parameter is locked"); return; }
    const param = params[change.parameter];
    if (!param) return;
    const newVal = Math.min(param.max, Math.max(param.min, change.suggested_value));
    setParams(p => ({ ...p, [change.parameter]: { ...p[change.parameter], value: newVal } }));
    setLog(l => [...l, {
      parameter: change.parameter,
      label: param.label,
      old: param.value,
      new: newVal,
      reason: change.reason,
      at: new Date().toLocaleString(),
    }]);
    toast.success(`Applied: ${param.label}`);
  };

  const applyAll = () => {
    (analysis?.suggested_changes || []).forEach(applyChange);
  };

  const resetParam = (key) => {
    setParams(p => ({ ...p, [key]: { ...p[key], value: DEFAULT_PARAMS[key].value } }));
    toast.success("Parameter reset");
  };

  const toggleLock = (key) => {
    setLocked(l => { const n = new Set(l); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const downloadLog = () => {
    const content = log.map(e => `[${e.at}] ${e.label}: ${e.old} → ${e.new} (${e.reason})`).join("\n");
    const blob = new Blob([content || "No changes yet"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "adaptive-log.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const healthColor = analysis?.platform_health === "good" ? "text-emerald-600"
    : analysis?.platform_health === "moderate" ? "text-amber-600"
    : analysis?.platform_health === "concerning" ? "text-orange-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={runAnalysis} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
          <Brain className={`w-4 h-4 mr-2 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Analysing..." : "Run Adaptive Analysis"}
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Mode:</span>
          <Button size="sm" variant={mode === "approval" ? "default" : "outline"} onClick={() => setMode("approval")} className="h-7 text-xs">
            Approval Required
          </Button>
          <Button size="sm" variant={mode === "auto" ? "default" : "outline"} onClick={() => setMode("auto")} className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white border-0">
            Auto Apply
          </Button>
        </div>
        {log.length > 0 && (
          <Button variant="outline" size="sm" onClick={downloadLog}>
            <Download className="w-3.5 h-3.5 mr-1.5" />Export Log ({log.length})
          </Button>
        )}
      </div>

      {/* Platform health */}
      {analysis && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" />Platform Health Report</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-2xl font-bold capitalize ${healthColor}`}>{analysis.platform_health}</span>
              {analysis.accuracy_score !== undefined && (
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                    <span>System Accuracy</span><span className="font-bold text-slate-700">{analysis.accuracy_score}%</span>
                  </div>
                  <Progress value={analysis.accuracy_score} className="h-1.5" />
                </div>
              )}
            </div>
            {analysis.health_summary && <p className="text-sm text-slate-700 mb-3">{analysis.health_summary}</p>}
            {analysis.accuracy_metrics && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Fraud Detection", val: analysis.accuracy_metrics.fraud_detection_accuracy },
                  { label: "Trend Prediction", val: analysis.accuracy_metrics.trend_prediction_accuracy },
                  { label: "Credibility", val: analysis.accuracy_metrics.credibility_reliability },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-slate-800">{val ?? "–"}%</div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggested changes */}
      {analysis?.suggested_changes?.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Suggested Adjustments</CardTitle>
            {mode === "approval" && (
              <Button size="sm" onClick={applyAll} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                Apply All
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {analysis.suggested_changes.map((c, i) => {
              const param = params[c.parameter];
              return (
                <div key={i} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-slate-800">{param?.label || c.parameter}</span>
                        <Badge className={`text-[10px] ${c.confidence === "high" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : c.confidence === "medium" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          {c.confidence} confidence
                        </Badge>
                        {locked.has(c.parameter) && <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">Locked</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="text-slate-500">Current: <strong>{c.current_value}</strong></span>
                        <span className="text-blue-600">→</span>
                        <span className="text-blue-700 font-semibold">{c.suggested_value}</span>
                      </div>
                      <p className="text-xs text-slate-600">{c.reason}</p>
                      {c.expected_improvement && <p className="text-[10px] text-emerald-600 mt-0.5">Expected: {c.expected_improvement}</p>}
                    </div>
                    {mode === "approval" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={() => applyChange(c)} disabled={locked.has(c.parameter)}>
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {analysis?.anomalies_detected?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Anomalies Detected</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {analysis.anomalies_detected.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${a.severity === "high" ? "text-red-500" : "text-amber-400"}`} />
                <div>
                  <span className="text-xs font-semibold text-slate-700 capitalize">{a.type?.replace(/_/g, " ")}</span>
                  <p className="text-xs text-slate-600">{a.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Parameters */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-slate-500" />Current Parameters</CardTitle>
          <span className="text-xs text-slate-400">Click lock icon to protect a parameter from changes</span>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {Object.entries(params).map(([key, p]) => (
            <div key={key} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{p.label}</span>
                  {locked.has(key) && <Shield className="w-3 h-3 text-red-500" />}
                </div>
                <p className="text-[10px] text-slate-400">{p.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-700 w-10 text-right">{typeof p.value === "number" && p.value < 1 ? p.value.toFixed(2) : p.value}</span>
                <div className="w-20 h-1.5 bg-slate-100 rounded-full">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${((p.value - p.min) / (p.max - p.min)) * 100}%` }} />
                </div>
                <button onClick={() => toggleLock(key)} className={`text-xs ${locked.has(key) ? "text-red-500" : "text-slate-300 hover:text-slate-500"}`}>
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => resetParam(key)} className="text-[10px] text-slate-400 hover:text-slate-600">↺</button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Change log */}
      {log.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Change Log</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {[...log].reverse().map((entry, i) => (
                <div key={i} className="text-xs text-slate-600 py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 mr-1">[{entry.at}]</span>
                  <span className="font-semibold">{entry.label}</span>: {entry.old} → <span className="text-blue-600 font-semibold">{entry.new}</span>
                  <span className="text-slate-400 ml-1">— {entry.reason}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis?.recommendations?.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Recommendations</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            {analysis.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{r}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
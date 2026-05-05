import { useState } from "react";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Zap, TrendingUp, AlertTriangle, CheckCircle2, FileText, BarChart3, Download,
  ThumbsUp, ThumbsDown, Flame, Activity, Shield
} from "lucide-react";
import { toast } from "sonner";

const SENTIMENT_CONFIG = {
  positive: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ThumbsUp },
  negative: { color: "bg-red-50 text-red-700 border-red-200", icon: ThumbsDown },
  neutral: { color: "bg-slate-50 text-slate-600 border-slate-200", icon: Activity },
  mixed: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Activity },
  highly_controversial: { color: "bg-red-50 text-red-800 border-red-300", icon: AlertTriangle },
};

export default function InsightDashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [topicFilter, setTopicFilter] = useState("");

  const runFullAnalysis = async () => {
    setLoading(true);
    try {
      const res = await api.functions.invoke("aiInsightEngine", { action: "full_analysis" });
      setAnalysis(res.data);
      toast.success("Analysis complete");
    } catch (e) {
      toast.error("Analysis failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await api.functions.invoke("generateInsightReport", {
        topic_filter: topicFilter || undefined,
      });
      setReport(res.data?.report);
      toast.success("Report generated");
    } catch (e) {
      toast.error("Report generation failed");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const content = [
      `# ${report.report_title}`,
      `Date: ${report.report_date || new Date().toLocaleDateString()}`,
      "",
      "## Executive Summary",
      report.executive_summary,
      "",
      "## Key Findings",
      ...(report.key_findings || []).map(f => `- ${f}`),
      "",
      "## Most Discussed Topics",
      ...(report.most_discussed_topics || []).map(t => `- ${t.topic}: ${t.description}`),
      "",
      "## Most Supported Issues",
      ...(report.most_supported_issues || []).map(i => `- ${i.issue} (${i.support_level}): ${i.notes}`),
      "",
      "## Most Controversial Issues",
      ...(report.most_controversial_issues || []).map(i => `- ${i.issue}: ${i.controversy_reason}`),
      "",
      "## Fastest Growing Issues",
      ...(report.fastest_growing_issues || []).map(i => `- ${i.issue}: ${i.growth_reason}`),
      "",
      "## Recommendations",
      ...(report.recommendations || []).map(r => `- ${r}`),
      "",
      `Data Note: ${report.data_integrity_note || ""}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-insight-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const a = analysis?.analysis || {};
  const stats = analysis?.stats || {};

  return (
    <div className="space-y-6">
      {/* Control panel */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={runFullAnalysis} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
          <Brain className={`w-4 h-4 mr-2 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Analysing Platform..." : "Run AI Analysis"}
        </Button>
        <Button variant="outline" onClick={generateReport} disabled={reportLoading}>
          <FileText className={`w-4 h-4 mr-2 ${reportLoading ? "animate-pulse" : ""}`} />
          {reportLoading ? "Generating..." : "Generate Insight Report"}
        </Button>
        {report && (
          <Button variant="outline" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-2" />Download Report
          </Button>
        )}
      </div>

      {/* Analysis results */}
      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Petitions Analysed", value: stats.petitions_analyzed || 0 },
              { label: "Polls Analysed", value: stats.polls_analyzed || 0 },
              { label: "Scorecards", value: stats.scorecards_analyzed || 0 },
              { label: "Open Reports", value: stats.open_reports || 0, alert: stats.open_reports > 5 },
            ].map(({ label, value, alert }) => (
              <Card key={label} className={`border ${alert ? "border-orange-200 bg-orange-50" : "border-slate-200"}`}>
                <CardContent className="pt-3 pb-3 text-center">
                  <div className={`text-2xl font-bold ${alert ? "text-orange-600" : "text-slate-900"}`}>{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Executive summary */}
          {a.executive_summary && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" />Executive Summary</CardTitle></CardHeader>
              <CardContent className="pt-0 text-sm text-slate-700">{a.executive_summary}</CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top topics */}
            {a.top_topics?.length > 0 && (
              <Card className="border-slate-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" />Top Topics</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {a.top_topics.slice(0, 6).map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 flex-1 capitalize">{t.topic}</span>
                      <Badge variant="outline" className="text-[10px]">{t.count || 0}</Badge>
                      {t.momentum === "rising" && <TrendingUp className="w-3 h-3 text-orange-500" />}
                      <span className="text-xs text-slate-500 capitalize">{t.sentiment}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Trending issues */}
            {a.trending_issues?.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" />Trending Issues</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {a.trending_issues.slice(0, 5).map((t, i) => (
                    <div key={i} className="border-b border-orange-100 last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="text-sm font-medium text-slate-800">{t.title}</span>
                        {t.category && <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>}
                      </div>
                      {t.reason && <p className="text-xs text-slate-500 mt-0.5 ml-4">{t.reason}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Sentiment overview */}
            {a.sentiment_overview && (
              <Card className="border-slate-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" />Sentiment Overview</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Positive", val: a.sentiment_overview.positive_pct, color: "text-emerald-600" },
                      { label: "Neutral", val: a.sentiment_overview.neutral_pct, color: "text-slate-600" },
                      { label: "Negative", val: a.sentiment_overview.negative_pct, color: "text-red-600" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="text-center">
                        <div className={`text-xl font-bold ${color}`}>{val || 0}%</div>
                        <div className="text-xs text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                  {a.sentiment_overview.most_positive_topic && (
                    <div className="text-xs text-slate-600">
                      <span className="text-emerald-600 font-semibold">Most positive:</span> {a.sentiment_overview.most_positive_topic}
                    </div>
                  )}
                  {a.sentiment_overview.most_negative_topic && (
                    <div className="text-xs text-slate-600 mt-1">
                      <span className="text-red-600 font-semibold">Most negative:</span> {a.sentiment_overview.most_negative_topic}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Manipulation alerts */}
            {a.manipulation_alerts?.length > 0 && (
              <Card className="border-red-200 bg-red-50/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-red-500" />Manipulation Alerts</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {a.manipulation_alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${alert.severity === "high" ? "text-red-500" : alert.severity === "medium" ? "text-amber-500" : "text-slate-400"}`} />
                      <div>
                        <span className="text-xs font-semibold text-slate-700 capitalize">{alert.type?.replace(/_/g, " ")}</span>
                        <p className="text-xs text-slate-600">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Rising debates */}
          {a.rising_debates?.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" />Rising Debates</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {a.rising_debates.map((d, i) => (
                    <div key={i} className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge className={`text-[10px] ${d.urgency === "high" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{d.urgency}</Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{d.topic}</p>
                      {d.description && <p className="text-xs text-slate-500 mt-1">{d.description}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Insight Report */}
      {report && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />{report.report_title}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={downloadReport}>
              <Download className="w-3 h-3 mr-1" />Export
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {report.executive_summary && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">EXECUTIVE SUMMARY</div>
                <p className="text-sm text-slate-700">{report.executive_summary}</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {report.key_findings?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">KEY FINDINGS</div>
                  <ul className="space-y-1">
                    {report.key_findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.recommendations?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">RECOMMENDATIONS</div>
                  <ul className="space-y-1">
                    {report.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                        <Zap className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topic filter for report */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Focused Report Generator</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-2">
          <p className="text-xs text-slate-500">Optionally enter a topic to focus the report (e.g. "climate", "housing", "immigration")</p>
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Topic filter (optional)..."
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value)}
            />
            <Button size="sm" onClick={generateReport} disabled={reportLoading}>
              {reportLoading ? "..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
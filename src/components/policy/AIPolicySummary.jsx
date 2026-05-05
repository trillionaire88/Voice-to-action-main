import React, { useState } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

export default function AIPolicySummary({ discussions, selectedArea }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const generateSummary = async () => {
    if (!discussions || discussions.length === 0) return;
    setLoading(true);
    try {
      const topDiscussions = discussions.slice(0, 10).map(d => ({
        title: d.title,
        body: d.body?.slice(0, 300),
        area: d.policy_area,
        upvotes: d.upvotes || 0,
      }));

      const areaLabel = selectedArea !== "all" ? selectedArea.replace(/_/g, " ") : "all policy areas";

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `You are a non-partisan civic AI advisor. Analyze the following public discussions about ${areaLabel} policy changes and provide:
1. A clear 2-3 sentence summary of the main concerns citizens are raising
2. The top 3 best-supported policy recommendations based on public sentiment and sound governance principles
3. Any key trade-offs or risks to consider

Keep the tone balanced, evidence-based, and constructive. Avoid partisan framing.

Discussions:
${JSON.stringify(topDiscussions, null, 2)}`,
        response_json_schema: {
          type: "object",
          properties: {
            citizen_concerns: { type: "string" },
            top_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            key_tradeoffs: { type: "string" }
          }
        }
      });
      setSummary(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 mb-8">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">AI Policy Advisor</span>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Non-partisan</Badge>
          </div>
          <div className="flex items-center gap-2">
            {!summary && (
              <Button
                size="sm"
                onClick={generateSummary}
                disabled={loading || discussions.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {loading ? "Analysing..." : "Generate AI Summary"}
              </Button>
            )}
            {summary && (
              <>
                <Button size="sm" variant="ghost" onClick={generateSummary} disabled={loading} className="text-blue-600 gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="text-slate-500">
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {!summary && !loading && (
          <p className="text-sm text-slate-500 italic">
            Click "Generate AI Summary" to get a non-partisan analysis of current discussions and the best policy paths forward based on public sentiment.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <p className="text-sm text-blue-700">Analysing {discussions.length} public discussions...</p>
          </div>
        )}

        {summary && expanded && (
          <div className="space-y-4 mt-2">
            <div className="bg-white/70 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">What Citizens Are Saying</p>
              <p className="text-sm text-slate-800 leading-relaxed">{summary.citizen_concerns}</p>
            </div>

            {summary.top_recommendations?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Recommended Paths Forward</p>
                <div className="space-y-2">
                  {summary.top_recommendations.map((rec, i) => (
                    <div key={i} className="bg-white/70 rounded-xl p-3.5 border border-blue-100 flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{rec.recommendation}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{rec.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.key_tradeoffs && (
              <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Key Trade-offs to Consider</p>
                <p className="text-sm text-slate-700 leading-relaxed">{summary.key_tradeoffs}</p>
              </div>
            )}

            <p className="text-xs text-slate-400 italic">AI analysis is non-partisan and based on public discussion data. Always consult primary sources.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
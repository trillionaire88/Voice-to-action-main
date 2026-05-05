import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scale, RefreshCw, Brain, AlertTriangle, CheckCircle2,
  Plus, Activity, Minus, Info,
  FileText, X, Flag
} from "lucide-react";
import { toast } from "sonner";

// ─── Config ────────────────────────────────────────────────────────────────

const AGREEMENT_CONFIG = {
  agreement: { color: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Agreement", bar: "bg-emerald-400" },
  partial_agreement: { color: "bg-blue-50 text-blue-800 border-blue-200", label: "Partial Agreement", bar: "bg-blue-400" },
  disagreement: { color: "bg-amber-50 text-amber-800 border-amber-200", label: "Disagreement", bar: "bg-amber-400" },
  strong_disagreement: { color: "bg-red-50 text-red-800 border-red-200", label: "Strong Disagreement", bar: "bg-red-500" },
};

const NARRATIVE_TYPE_COLORS = {
  media: "bg-blue-50 text-blue-700 border-blue-200",
  government: "bg-purple-50 text-purple-700 border-purple-200",
  community: "bg-emerald-50 text-emerald-700 border-emerald-200",
  platform: "bg-slate-50 text-slate-700 border-slate-200",
  regional: "bg-amber-50 text-amber-700 border-amber-200",
  expert: "bg-indigo-50 text-indigo-700 border-indigo-200",
  official_document: "bg-gray-50 text-gray-700 border-gray-200",
  other: "bg-slate-50 text-slate-600 border-slate-200",
};

const CONFIDENCE_CONFIG = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  low: "bg-slate-50 text-slate-500 border-slate-200",
};

// ─── Add Narrative Modal ───────────────────────────────────────────────────
function AddNarrativeModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    issue_title: "", source_name: "", narrative_type: "media",
    statement_summary: "", stance: "neutral", published_date: "",
    source_url: "", credibility_score: 70,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Add Narrative</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Issue Title *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="What issue does this relate to?" value={form.issue_title} onChange={e => set("issue_title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Source Name *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="e.g. BBC, Government" value={form.source_name} onChange={e => set("source_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.narrative_type} onChange={e => set("narrative_type", e.target.value)}>
                {["media", "government", "community", "platform", "regional", "official_document", "expert", "other"].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Statement Summary *</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 h-20"
              placeholder="Summarize the statement or narrative..." value={form.statement_summary} onChange={e => set("statement_summary", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Stance</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.stance} onChange={e => set("stance", e.target.value)}>
                {["supportive", "opposing", "neutral", "mixed"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Credibility (0-100)</label>
              <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.credibility_score} onChange={e => set("credibility_score", Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Source URL (optional)</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="https://..." value={form.source_url} onChange={e => set("source_url", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSave(form)} className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={!form.issue_title || !form.source_name || !form.statement_summary}>
            Save Narrative
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Narrative Card ────────────────────────────────────────────────────────
function NarrativeCard({ narrative, canManage, onFlag, onDelete }) {
  const cfg = AGREEMENT_CONFIG[narrative.agreement_with_platform] || AGREEMENT_CONFIG.partial_agreement;
  const typeCfg = NARRATIVE_TYPE_COLORS[narrative.narrative_type] || NARRATIVE_TYPE_COLORS.other;
  const score = narrative.reality_index_score ?? 50;

  return (
    <div className={`border rounded-xl p-4 ${narrative.is_flagged ? "opacity-60 border-red-200 bg-red-50/20" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-slate-800">{narrative.source_name}</span>
          <Badge className={`${typeCfg} text-[10px]`}>{narrative.narrative_type?.replace(/_/g, " ")}</Badge>
          <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
          {narrative.is_flagged && <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]"><Flag className="w-2.5 h-2.5 mr-0.5" />Flagged</Badge>}
        </div>
        {canManage && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onFlag(narrative)} className="text-slate-400 hover:text-amber-500 p-1"><Flag className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(narrative)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-700 mb-3">{narrative.statement_summary}</p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
            <span>Reality Index Score</span><span className="font-bold text-slate-700">{score}/100</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${score}%` }} />
          </div>
        </div>
        {narrative.published_date && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">{narrative.published_date}</span>
        )}
      </div>
    </div>
  );
}

// ─── Issue Analysis Card ───────────────────────────────────────────────────
function IssueAnalysisCard({ issue }) {
  const confCfg = CONFIDENCE_CONFIG[issue.confidence] || CONFIDENCE_CONFIG.medium;
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <CardTitle className="text-sm">{issue.title}</CardTitle>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] capitalize">{issue.category}</Badge>
              <Badge className={`${confCfg} text-[10px]`}>{issue.confidence} confidence</Badge>
            </div>
          </div>
          <div className="text-center flex-shrink-0">
            <div className="text-lg font-bold text-blue-700">{issue.consensus_score || 0}</div>
            <div className="text-[10px] text-slate-500">consensus</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Support bar */}
        <div className="flex rounded-full overflow-hidden h-2">
          <div className="bg-emerald-400" style={{ width: `${issue.platform_support_pct || 0}%` }} />
          <div className="bg-slate-200" style={{ width: `${100 - (issue.platform_support_pct || 0) - (issue.platform_oppose_pct || 0)}%` }} />
          <div className="bg-red-400" style={{ width: `${issue.platform_oppose_pct || 0}%` }} />
        </div>
        <div className="flex text-[10px] gap-3">
          <span className="text-emerald-600 font-semibold">{issue.platform_support_pct || 0}% Support</span>
          <span className="text-slate-500">{Math.max(0, 100 - (issue.platform_support_pct || 0) - (issue.platform_oppose_pct || 0))}% Neutral</span>
          <span className="text-red-500 font-semibold">{issue.platform_oppose_pct || 0}% Oppose</span>
        </div>

        {/* Narratives */}
        {issue.narratives?.length > 0 && (
          <div className="space-y-2">
            {issue.narratives.map((n, i) => {
              const cfg = AGREEMENT_CONFIG[n.agreement_with_platform] || AGREEMENT_CONFIG.partial_agreement;
              const typeCfg = NARRATIVE_TYPE_COLORS[n.type] || NARRATIVE_TYPE_COLORS.other;
              return (
                <div key={i} className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-slate-700">{n.source}</span>
                    <Badge className={`${typeCfg} text-[10px]`}>{n.type}</Badge>
                    <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                    <span className="text-[10px] text-slate-500 ml-auto">RI: {n.reality_index_score ?? "–"}</span>
                  </div>
                  <p className="text-xs text-slate-600">{n.summary}</p>
                </div>
              );
            })}
          </div>
        )}

        {issue.largest_disagreement && (
          <div className="text-xs text-slate-600 border-t border-slate-100 pt-2">
            <span className="text-red-500 font-semibold">Key disagreement: </span>{issue.largest_disagreement}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function RealityIndex() {
  const qc = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: analysisData, isLoading: analysisLoading, isFetching } = useQuery({
    queryKey: ["realityIndex", refreshKey],
    queryFn: () => api.functions.invoke("realityIndexEngine", {}).then(r => r.data),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const { data: narratives = [], isLoading: narrLoading } = useQuery({
    queryKey: ["narratives"],
    queryFn: () => api.entities.Narrative.list("-created_date", 50),
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.entities.Narrative.create({ ...data, added_by_user_id: user?.id }),
    onSuccess: () => { qc.invalidateQueries(["narratives"]); setShowAddModal(false); toast.success("Narrative added"); },
  });

  const flagMutation = useMutation({
    mutationFn: (n) => api.entities.Narrative.update(n.id, { is_flagged: !n.is_flagged, flag_reason: n.is_flagged ? "" : "Flagged by admin" }),
    onSuccess: () => { qc.invalidateQueries(["narratives"]); toast.success("Updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (n) => api.entities.Narrative.delete(n.id),
    onSuccess: () => { qc.invalidateQueries(["narratives"]); toast.success("Removed"); },
  });

  const ri = analysisData?.reality_index || {};
  const issues = ri.issues || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {showAddModal && <AddNarrativeModal onClose={() => setShowAddModal(false)} onSave={d => addMutation.mutate(d)} />}

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Scale className="w-4 h-4" />Reality Index
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Reality Index</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Comparing different narratives with platform opinion — as statistical analysis only, without declaring absolute truth.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={isFetching}>
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Analysing..." : "Refresh Analysis"}
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-3 h-3 mr-1.5" />Add Narrative
            </Button>
          )}
        </div>
      </div>

      {/* Safety note */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-8 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
        <span>All results are presented as <strong>statistical comparisons and user opinion analysis</strong> only. This system does not declare absolute truth.</span>
      </div>

      {/* Global summary */}
      {!analysisLoading && ri.platform_summary && (
        <Card className="border-indigo-200 bg-indigo-50/20 mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Platform Summary</p>
                <p className="text-sm text-slate-700">{ri.platform_summary}</p>
                {ri.data_note && <p className="text-xs text-slate-400 mt-1 italic">{ri.data_note}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {ri.confidence_overall && (
                    <Badge className={`${CONFIDENCE_CONFIG[ri.confidence_overall] || CONFIDENCE_CONFIG.medium} text-[10px]`}>
                      {ri.confidence_overall} confidence
                    </Badge>
                  )}
                  {analysisData?.stats && (
                    <>
                      <Badge variant="outline" className="text-[10px]">{analysisData.stats.petitions} petitions</Badge>
                      <Badge variant="outline" className="text-[10px]">{analysisData.stats.polls} polls</Badge>
                      <Badge variant="outline" className="text-[10px]">{analysisData.stats.narratives} narratives</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="issues">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full mb-6">
          <TabsTrigger value="issues"><Activity className="w-3 h-3 mr-1" />Issue Analysis</TabsTrigger>
          <TabsTrigger value="disagreements"><AlertTriangle className="w-3 h-3 mr-1" />Disagreements</TabsTrigger>
          <TabsTrigger value="narratives"><FileText className="w-3 h-3 mr-1" />Narratives ({narratives.length})</TabsTrigger>
          <TabsTrigger value="summary"><Brain className="w-3 h-3 mr-1" />AI Summary</TabsTrigger>
        </TabsList>

        {/* ── ISSUES ── */}
        <TabsContent value="issues">
          {analysisLoading ? (
            <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : issues.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {issues.map((issue, i) => <IssueAnalysisCard key={i} issue={issue} />)}
            </div>
          ) : (
            <Card className="border-slate-200">
              <CardContent className="pt-8 pb-8 text-center">
                <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium mb-1">No Analysis Yet</p>
                <p className="text-sm text-slate-400 mb-4">Click "Refresh Analysis" to run the Reality Index engine</p>
                <Button size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={isFetching}>
                  <RefreshCw className="w-3 h-3 mr-1.5" />Run Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── DISAGREEMENTS ── */}
        <TabsContent value="disagreements">
          <div className="space-y-4">
            {ri.top_disagreements?.length > 0 && (
              <Card className="border-red-200 bg-red-50/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Largest Disagreements</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {ri.top_disagreements.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-red-100 last:border-0">
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${d.severity === "major" ? "text-red-500" : "text-amber-400"}`} />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-slate-800">{d.issue}</span>
                          <Badge variant="outline" className="text-[10px]">{d.source}</Badge>
                          <Badge className={`text-[10px] ${d.severity === "major" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{d.severity}</Badge>
                        </div>
                        <p className="text-xs text-slate-600">{d.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {ri.top_agreements?.length > 0 && (
              <Card className="border-emerald-200 bg-emerald-50/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Highest Agreements</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {ri.top_agreements.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-emerald-100 last:border-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-slate-800">{a.issue}</span>
                          <Badge variant="outline" className="text-[10px]">{a.source}</Badge>
                        </div>
                        <p className="text-xs text-slate-600">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {!ri.top_disagreements?.length && !ri.top_agreements?.length && (
              <p className="text-center text-slate-500 py-8">Run the analysis to see disagreement comparisons</p>
            )}
          </div>
        </TabsContent>

        {/* ── NARRATIVES ── */}
        <TabsContent value="narratives">
          <div className="space-y-3">
            {isAdmin && (
              <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-3 h-3 mr-1.5" />Add Narrative
              </Button>
            )}
            {narrLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : narratives.length > 0 ? (
              narratives.map(n => (
                <NarrativeCard key={n.id} narrative={n} canManage={isAdmin}
                  onFlag={n => flagMutation.mutate(n)}
                  onDelete={n => deleteMutation.mutate(n)}
                />
              ))
            ) : (
              <Card className="border-slate-200">
                <CardContent className="pt-8 pb-8 text-center">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No narratives yet</p>
                  {isAdmin && <p className="text-sm text-slate-400 mt-1">Add narratives from media, government, or communities to compare with platform opinion</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── AI SUMMARY ── */}
        <TabsContent value="summary">
          {ri.key_divisions?.length > 0 || ri.most_controversial?.length > 0 ? (
            <div className="space-y-4">
              {ri.key_divisions?.length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Key Divisions</CardTitle></CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {ri.key_divisions.map((d, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Minus className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700">{d}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {ri.most_controversial?.length > 0 && (
                <Card className="border-red-200 bg-red-50/10">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Most Controversial Topics</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {ri.most_controversial.map((t, i) => (
                        <Badge key={i} className="bg-red-50 text-red-700 border-red-200">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-slate-200">
              <CardContent className="pt-8 pb-8 text-center">
                <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">Run the analysis to see the AI summary</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
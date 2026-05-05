import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Vote, Plus, X, CheckCircle2, XCircle, Shield,
  AlertTriangle, Users, Clock, History, Scale, Info
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, isPast } from "date-fns";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  rule_change: "Rule Change", feature_setting: "Feature Setting",
  content_dispute: "Content Dispute", user_ban: "User Ban",
  community_rule: "Community Rule", moderation_appeal: "Moderation Appeal",
  ranking_adjustment: "Ranking Adjustment", other: "Other",
};

const STATUS_CONFIG = {
  draft: { color: "bg-slate-50 text-slate-600 border-slate-200", label: "Draft" },
  active: { color: "bg-blue-50 text-blue-700 border-blue-200", label: "Active" },
  passed: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Passed" },
  rejected: { color: "bg-red-50 text-red-700 border-red-200", label: "Rejected" },
  cancelled: { color: "bg-slate-50 text-slate-500 border-slate-200", label: "Cancelled" },
  owner_overridden: { color: "bg-purple-50 text-purple-700 border-purple-200", label: "Owner Override" },
};

function calcWeightedResult(gv) {
  const total = (gv.weighted_for || 0) + (gv.weighted_against || 0);
  if (total === 0) return { forPct: 0, againstPct: 0, passed: false };
  const forPct = Math.round((gv.weighted_for || 0) / total * 100);
  const againstPct = 100 - forPct;
  return { forPct, againstPct, passed: forPct >= (gv.required_majority_pct || 60) };
}

// ─── Create Vote Modal ──────────────────────────────────────────────────────
function CreateVoteModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: "", description: "", action_type: "rule_change",
    required_majority_pct: 60, min_participants: 10, min_reputation_score: 40,
    closes_at: "", is_public: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Create Governance Vote</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Title *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="What is being voted on?" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Explain what this vote will decide..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Action Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.action_type} onChange={e => set("action_type", e.target.value)}>
                {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Closes At</label>
              <input type="datetime-local" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.closes_at} onChange={e => set("closes_at", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Majority %</label>
              <input type="number" min={50} max={100} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.required_majority_pct} onChange={e => set("required_majority_pct", Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Min Voters</label>
              <input type="number" min={1} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.min_participants} onChange={e => set("min_participants", Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Min Rep</label>
              <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.min_reputation_score} onChange={e => set("min_reputation_score", Number(e.target.value))} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSave({ ...form, status: "active" })} disabled={!form.title} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Create Vote
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Vote Card ──────────────────────────────────────────────────────────────
function VoteCard({ gv, user, onCast, onOverride }) {
  const isAdmin = user?.role === "admin";
  const { forPct, againstPct } = calcWeightedResult(gv);
  const statusCfg = STATUS_CONFIG[gv.status] || STATUS_CONFIG.draft;
  const isActive = gv.status === "active" && (!gv.closes_at || !isPast(new Date(gv.closes_at)));

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <CardTitle className="text-sm">{gv.title}</CardTitle>
              <Badge className={`${statusCfg.color} text-[10px]`}>{statusCfg.label}</Badge>
              <Badge variant="outline" className="text-[10px]">{ACTION_LABELS[gv.action_type]}</Badge>
            </div>
            {gv.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{gv.description}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Progress bars */}
        <div className="space-y-1">
          <div className="flex rounded-full overflow-hidden h-3">
            <div className="bg-emerald-400 transition-all" style={{ width: `${forPct}%` }} />
            <div className="bg-red-400 transition-all" style={{ width: `${againstPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-600 font-semibold">{forPct}% For ({gv.votes_for || 0})</span>
            <span className="text-slate-500">{gv.total_participants || 0} participants</span>
            <span className="text-red-500 font-semibold">{againstPct}% Against ({gv.votes_against || 0})</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Required: {gv.required_majority_pct}% majority · Min {gv.min_participants} voters · Min rep {gv.min_reputation_score}
          </div>
        </div>

        {gv.closes_at && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isPast(new Date(gv.closes_at)) ? "Closed" : `Closes ${formatDistanceToNow(new Date(gv.closes_at), { addSuffix: true })}`}
          </p>
        )}

        {gv.result && <p className="text-xs text-slate-600 italic">Result: {gv.result}</p>}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {isActive && user && (
            <>
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onCast(gv, "for")}>
                <CheckCircle2 className="w-3 h-3 mr-1" />Vote For
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => onCast(gv, "against")}>
                <XCircle className="w-3 h-3 mr-1" />Vote Against
              </Button>
            </>
          )}
          {isAdmin && gv.status === "active" && (
            <Button size="sm" variant="outline" className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => onOverride(gv)}>
              <Shield className="w-3 h-3 mr-1" />Owner Override
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function Governance() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { api.auth.me().then(setUser).catch(() => {}); }, []);

  const isAdmin = user?.role === "admin";

  const { data: votes = [], isLoading } = useQuery({
    queryKey: ["governanceVotes"],
    queryFn: () => api.entities.GovernanceVote.filter({ is_public: true }, "-created_date", 50),
    refetchInterval: 30000,
  });

  const { data: myBallots = [] } = useQuery({
    queryKey: ["myBallots", user?.id],
    queryFn: () => api.entities.GovernanceBallot.filter({ voter_user_id: user?.id }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.GovernanceVote.create({ ...data, created_by_user_id: user?.id }),
    onSuccess: () => { qc.invalidateQueries(["governanceVotes"]); setShowCreate(false); toast.success("Vote created"); },
  });

  const castMutation = useMutation({
    mutationFn: async ({ gv, vote }) => {
      const repScore = user?.reputation_score || 50;
      const isVerified = user?.is_verified || false;
      const weight = isVerified ? 1.5 : repScore >= 70 ? 1.2 : repScore >= 40 ? 1.0 : 0.5;

      await api.entities.GovernanceBallot.create({
        governance_vote_id: gv.id,
        voter_user_id: user?.id,
        vote,
        vote_weight: weight,
        voter_reputation_score: repScore,
        voter_is_verified: isVerified,
      });

      const updates = {
        total_participants: (gv.total_participants || 0) + 1,
        votes_for: vote === "for" ? (gv.votes_for || 0) + 1 : gv.votes_for || 0,
        votes_against: vote === "against" ? (gv.votes_against || 0) + 1 : gv.votes_against || 0,
        weighted_for: vote === "for" ? (gv.weighted_for || 0) + weight : gv.weighted_for || 0,
        weighted_against: vote === "against" ? (gv.weighted_against || 0) + weight : gv.weighted_against || 0,
      };
      return api.entities.GovernanceVote.update(gv.id, updates);
    },
    onSuccess: () => { qc.invalidateQueries(["governanceVotes"]); toast.success("Vote cast"); },
    onError: () => toast.error("Failed to cast vote"),
  });

  const overrideMutation = useMutation({
    mutationFn: (gv) => api.entities.GovernanceVote.update(gv.id, {
      status: "owner_overridden",
      owner_override_reason: "Owner cancelled this vote",
      result: "Cancelled by platform owner",
    }),
    onSuccess: () => { qc.invalidateQueries(["governanceVotes"]); toast.success("Vote overridden"); },
  });

  const castVote = (gv, vote) => {
    if (!user) { toast.error("Sign in to vote"); return; }
    const alreadyVoted = myBallots.some(b => b.governance_vote_id === gv.id);
    if (alreadyVoted) { toast.error("You have already voted on this"); return; }
    castMutation.mutate({ gv, vote });
  };

  const activeVotes = votes.filter(v => v.status === "active");
  const closedVotes = votes.filter(v => v.status !== "active" && v.status !== "draft");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {showCreate && <CreateVoteModal onClose={() => setShowCreate(false)} onSave={d => createMutation.mutate(d)} />}

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Scale className="w-4 h-4" />Governance Engine
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Platform Governance</h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Community-led platform decisions. Vote weighted by reputation and verification status.
        </p>
        {isAdmin && (
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />Create Governance Vote
          </Button>
        )}
      </div>

      {/* Safety note */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
        <span>The platform owner retains final override authority on all governance decisions. Security, privacy, and owner permissions cannot be changed through governance voting.</span>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="active"><Vote className="w-3 h-3 mr-1" />Active ({activeVotes.length})</TabsTrigger>
          <TabsTrigger value="history"><History className="w-3 h-3 mr-1" />History ({closedVotes.length})</TabsTrigger>
          <TabsTrigger value="rules"><Shield className="w-3 h-3 mr-1" />Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
          ) : activeVotes.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="pt-8 pb-8 text-center">
                <Vote className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No active governance votes</p>
                {isAdmin && <p className="text-sm text-slate-400 mt-1">Create a governance vote to start community decision making</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeVotes.map(gv => (
                <VoteCard key={gv.id} gv={gv} user={user}
                  onCast={castVote}
                  onOverride={gv => overrideMutation.mutate(gv)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {closedVotes.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No completed votes yet</p>
          ) : (
            <div className="space-y-4">
              {closedVotes.map(gv => <VoteCard key={gv.id} gv={gv} user={user} onCast={() => {}} onOverride={() => {}} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-sm">Governance Rules</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2 text-sm text-slate-700">
              {[
                "Votes are weighted by reputation score and verification status",
                "Verified users receive 1.5× vote weight",
                "Users with reputation ≥70 receive 1.2× weight",
                "New/low-reputation accounts receive 0.5× weight",
                "A minimum number of voters must participate for a result to be valid",
                "The platform owner may override any governance vote at any time",
                "Security, privacy, and infrastructure rules cannot be changed through governance",
                "All votes and decisions are recorded publicly for transparency",
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-blue-500 font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{rule}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
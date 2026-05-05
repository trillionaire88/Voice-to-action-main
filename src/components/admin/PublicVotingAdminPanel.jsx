import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Vote, Search, Users, CheckCircle2, Globe2, Trash2,
  XCircle, RotateCcw, Eye, TrendingUp, AlertTriangle, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import VoteTrustIndicators from "@/components/polls/VoteTrustIndicators";

export default function PublicVotingAdminPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPoll, setSelectedPoll] = useState(null);

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["adminAllPolls"],
    queryFn: () => api.entities.Poll.list("-created_date", 200),
  });

  const { data: selectedVotes = [] } = useQuery({
    queryKey: ["adminPollVotes", selectedPoll?.id],
    queryFn: () => api.entities.Vote.filter({ poll_id: selectedPoll.id }),
    enabled: !!selectedPoll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Poll.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["adminAllPolls"]); toast.success("Poll updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Poll.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(["adminAllPolls"]); setSelectedPoll(null); toast.success("Poll removed"); },
  });

  const filteredPolls = polls.filter(p =>
    !search || p.question?.toLowerCase().includes(search.toLowerCase())
  );

  const openPolls = filteredPolls.filter(p => p.status === "open");
  const closedPolls = filteredPolls.filter(p => p.status === "closed");
  const removedPolls = filteredPolls.filter(p => p.status === "removed");
  const suspiciousPolls = filteredPolls.filter(p => p.risk_level === "high" || p.safety_tag !== "none");

  if (selectedPoll) {
    return (
      <div>
        <button onClick={() => setSelectedPoll(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
          ← Back to all votes
        </button>
        <Card className="border-slate-200 mb-4">
          <CardHeader>
            <CardTitle className="text-lg line-clamp-2">{selectedPoll.question}</CardTitle>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge className={selectedPoll.status === "open" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}>
                {selectedPoll.status}
              </Badge>
              <Badge variant="outline">{selectedPoll.category?.replace(/_/g, " ")}</Badge>
              <Badge variant="outline">{selectedPoll.total_votes_cached || 0} votes</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPoll.status === "open" && (
                <Button size="sm" variant="outline" className="text-orange-600 border-orange-200"
                  onClick={() => updateMutation.mutate({ id: selectedPoll.id, data: { status: "closed" } })}>
                  <XCircle className="w-4 h-4 mr-1" />Close Vote
                </Button>
              )}
              {selectedPoll.status === "closed" && (
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200"
                  onClick={() => updateMutation.mutate({ id: selectedPoll.id, data: { status: "open" } })}>
                  <RotateCcw className="w-4 h-4 mr-1" />Reopen Vote
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-slate-600"
                onClick={() => updateMutation.mutate({ id: selectedPoll.id, data: { total_votes_cached: 0, verified_votes_count: 0 } })}>
                <RotateCcw className="w-4 h-4 mr-1" />Reset Vote Count
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200"
                onClick={() => { if (confirm("Remove this vote?")) deleteMutation.mutate(selectedPoll.id); }}>
                <Trash2 className="w-4 h-4 mr-1" />Remove Vote
              </Button>
            </div>

            <VoteTrustIndicators poll={selectedPoll} votes={selectedVotes} />

            <div className="mt-4 space-y-2">
              <h4 className="font-semibold text-slate-800 text-sm">Vote Analytics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Votes", value: selectedPoll.total_votes_cached || 0, icon: Users, color: "text-slate-700" },
                  { label: "Verified", value: selectedPoll.verified_votes_count || 0, icon: CheckCircle2, color: "text-emerald-600" },
                  { label: "Countries", value: selectedPoll.countries_represented || 0, icon: Globe2, color: "text-blue-600" },
                  { label: "Comments", value: selectedPoll.comments_count || 0, icon: BarChart3, color: "text-purple-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <div className="font-bold text-slate-900">{value}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function PollRow({ poll }) {
    const isHigh = poll.risk_level === "high" || poll.safety_tag !== "none";
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0 ${isHigh ? "bg-orange-50/30" : ""}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-900 line-clamp-1">{poll.question}</span>
            <Badge className={poll.status === "open" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-slate-100 text-slate-600 text-[10px]"}>
              {poll.status}
            </Badge>
            {isHigh && <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Flagged</Badge>}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {(poll.total_votes_cached || 0).toLocaleString()} votes · {poll.countries_represented || 0} countries · {formatDistanceToNow(new Date(poll.created_date), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedPoll(poll)}>
            <Eye className="w-3 h-3 mr-1" />Manage
          </Button>
          {poll.status === "open" && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-orange-600 border-orange-200"
              onClick={() => updateMutation.mutate({ id: poll.id, data: { status: "closed" } })}>
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-blue-600" />Public Voting Admin Panel
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input className="pl-8 h-9" placeholder="Search votes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Active", value: openPolls.length, color: "text-emerald-600" },
            { label: "Closed", value: closedPolls.length, color: "text-slate-500" },
            { label: "Flagged", value: suspiciousPolls.length, color: "text-orange-600" },
            { label: "Removed", value: removedPolls.length, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="active">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="active">Active ({openPolls.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closedPolls.length})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged ({suspiciousPolls.length})</TabsTrigger>
            <TabsTrigger value="all">All ({filteredPolls.length})</TabsTrigger>
          </TabsList>
          {[
            { key: "active", data: openPolls },
            { key: "closed", data: closedPolls },
            { key: "flagged", data: suspiciousPolls },
            { key: "all", data: filteredPolls },
          ].map(({ key, data }) => (
            <TabsContent key={key} value={key}>
              {isLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
              ) : data.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">No votes in this category</p>
              ) : (
                <div>{data.slice(0, 50).map(p => <PollRow key={p.id} poll={p} />)}</div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
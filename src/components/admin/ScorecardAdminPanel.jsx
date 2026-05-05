import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star, Search, Check, X, Eye, Trash2, Lock, RotateCcw,
  AlertTriangle, Users, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ScorecardAdminPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: allScorecards = [], isLoading } = useQuery({
    queryKey: ["adminScorecards"],
    queryFn: () => api.entities.Scorecard.list("-created_date", 300),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Scorecard.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["adminScorecards"]); toast.success("Updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Scorecard.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(["adminScorecards"]); toast.success("Removed"); },
  });

  const filtered = allScorecards.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.category?.includes(search.toLowerCase())
  );

  const pending = filtered.filter(s => s.status === "pending_review");
  const approved = filtered.filter(s => s.status === "approved");
  const rejected = filtered.filter(s => s.status === "rejected");
  const flagged = filtered.filter(s => s.suspicious_activity_flag);

  function ScorecardRow({ sc }) {
    const isExpanded = expandedId === sc.id;
    const statusColor = {
      pending_review: "bg-amber-50 text-amber-700 border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
      locked: "bg-slate-100 text-slate-600",
      removed: "bg-red-100 text-red-800",
    }[sc.status] || "bg-slate-100 text-slate-600";

    return (
      <div className="border-b border-slate-100 last:border-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900">{sc.name}</span>
              <Badge className={`${statusColor} text-[10px]`}>{sc.status.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="text-[10px]">{sc.category?.replace(/_/g, " ")}</Badge>
              {sc.suspicious_activity_flag && <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Flagged</Badge>}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {sc.country_code} · {sc.total_ratings || 0} ratings · {formatDistanceToNow(new Date(sc.created_date), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {sc.status === "pending_review" && (
              <>
                <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => updateMutation.mutate({ id: sc.id, data: { status: "approved", review_notes: reviewNotes, reviewed_at: new Date().toISOString() } })}>
                  <Check className="w-3 h-3 mr-1" />Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200"
                  onClick={() => updateMutation.mutate({ id: sc.id, data: { status: "rejected", review_notes: reviewNotes, reviewed_at: new Date().toISOString() } })}>
                  <X className="w-3 h-3 mr-1" />Reject
                </Button>
              </>
            )}
            {sc.status === "approved" && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-orange-600 border-orange-200"
                onClick={() => updateMutation.mutate({ id: sc.id, data: { is_locked: !sc.is_locked } })}>
                <Lock className="w-3 h-3 mr-1" />{sc.is_locked ? "Unlock" : "Lock"}
              </Button>
            )}
            {sc.status === "approved" && (
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => updateMutation.mutate({ id: sc.id, data: { total_ratings: 0, strongly_approve_count: 0, approve_count: 0, neutral_count: 0, disapprove_count: 0, strongly_disapprove_count: 0, raw_approval_score: 0, weighted_approval_score: 0 } })}>
                <RotateCcw className="w-3 h-3 mr-1" />Reset
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200"
              onClick={() => { if (confirm("Remove?")) deleteMutation.mutate(sc.id); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpandedId(isExpanded ? null : sc.id)}>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="pb-4 space-y-3 px-1">
            {sc.description && <p className="text-sm text-slate-600">{sc.description}</p>}
            <div className="space-y-1.5">
              <Label className="text-xs">Review Notes</Label>
              <Textarea placeholder="Internal notes..." rows={2} className="text-sm"
                defaultValue={sc.review_notes || ""}
                onChange={e => setReviewNotes(e.target.value)} />
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => updateMutation.mutate({ id: sc.id, data: { review_notes: reviewNotes } })}>
                Save Notes
              </Button>
            </div>
            {sc.official_website && (
              <a href={sc.official_website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                {sc.official_website}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />Scorecards Admin Panel
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input className="pl-8 h-9" placeholder="Search scorecards..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Pending", value: pending.length, color: "text-amber-600" },
            { label: "Approved", value: approved.length, color: "text-emerald-600" },
            { label: "Flagged", value: flagged.length, color: "text-orange-600" },
            { label: "Rejected", value: rejected.length, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Live ({approved.length})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged ({flagged.length})</TabsTrigger>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          </TabsList>

          {[
            { key: "pending", data: pending },
            { key: "approved", data: approved },
            { key: "flagged", data: flagged },
            { key: "all", data: filtered },
          ].map(({ key, data }) => (
            <TabsContent key={key} value={key}>
              {isLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
              ) : data.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">None in this category</p>
              ) : (
                <div>{data.slice(0, 100).map(sc => <ScorecardRow key={sc.id} sc={sc} />)}</div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
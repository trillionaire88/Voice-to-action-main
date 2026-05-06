import { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, AlertTriangle, Crown, Users, RefreshCw,
  TrendingDown, Search, RotateCcw, Lock, Star
} from "lucide-react";
import ReputationBadge from "@/components/reputation/ReputationBadge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ReputationAdminPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [adjValue, setAdjValue] = useState(0);
  const [adjReason, setAdjReason] = useState("");

  const { data: allScores = [], isLoading } = useQuery({
    queryKey: ["allInfluenceScores"],
    queryFn: () => api.entities.UserInfluenceScore.list("-overall_score", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.UserInfluenceScore.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["allInfluenceScores"]);
      setEditingId(null);
      toast.success("Score updated");
    },
  });

  const recalcMutation = useMutation({
    mutationFn: (userId) => api.functions.invoke('calculateReputation', { user_id: userId }),
    onSuccess: () => { queryClient.invalidateQueries(["allInfluenceScores"]); toast.success("Recalculated"); },
  });

  const filteredScores = allScores.filter(s =>
    !search ||
    s.user_display_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  const flaggedUsers = filteredScores.filter(s => s.flags?.length > 0 || s.is_restricted);
  const topUsers = filteredScores.filter(s => s.overall_score >= 75).slice(0, 20);
  const lowTrustUsers = filteredScores.filter(s => s.overall_score < 40);

  const handleAdjust = (record) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        manual_adjustment: adjValue,
        manual_adjustment_reason: adjReason,
        admin_notes: adjReason,
      }
    });
  };

  const handleReset = (record) => {
    updateMutation.mutate({
      id: record.id,
      data: { manual_adjustment: 0, manual_adjustment_reason: "Admin reset", is_restricted: false, is_promoted: false }
    });
  };

  const handleRestrict = (record) => {
    updateMutation.mutate({ id: record.id, data: { is_restricted: true, admin_notes: "Restricted by admin" } });
  };

  const handlePromote = (record) => {
    updateMutation.mutate({ id: record.id, data: { is_promoted: true, admin_notes: "Promoted by admin" } });
  };

  function ScoreRow({ record }) {
    const isEditing = editingId === record.id;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-900 truncate">{record.user_display_name || record.user_email}</span>
            <ReputationBadge influenceLevel={record.influence_level} showScore />
            {record.is_restricted && <Badge className="text-[10px] bg-red-50 text-red-700 border-red-200"><Lock className="w-2.5 h-2.5 mr-0.5" />Restricted</Badge>}
            {record.is_promoted && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><Crown className="w-2.5 h-2.5 mr-0.5" />Promoted</Badge>}
          </div>
          {record.flags?.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {record.flags.map((f, i) => (
                <span key={i} className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                  <AlertTriangle className="w-2 h-2 inline mr-0.5" />{f}
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">
            {record.last_calculated_at ? formatDistanceToNow(new Date(record.last_calculated_at), { addSuffix: true }) : "Never calculated"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-slate-900 w-10 text-center">{Math.round(record.overall_score ?? 50)}</span>

          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="number" min="-100" max="100"
                value={adjValue}
                onChange={e => setAdjValue(Number(e.target.value))}
                className="w-20 h-7 text-xs"
                placeholder="±adj"
              />
              <Input
                value={adjReason}
                onChange={e => setAdjReason(e.target.value)}
                className="w-32 h-7 text-xs"
                placeholder="Reason"
              />
              <Button size="sm" className="h-7 text-xs" onClick={() => handleAdjust(record)} disabled={updateMutation.isPending}>Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>✕</Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => { setEditingId(record.id); setAdjValue(record.manual_adjustment || 0); setAdjReason(record.manual_adjustment_reason || ""); }}>
                <Star className="w-3 h-3 mr-1" />Adjust
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => recalcMutation.mutate(record.user_id)} disabled={recalcMutation.isPending}>
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRestrict(record)}>
                <Lock className="w-3 h-3 mr-1" />Restrict
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handlePromote(record)}>
                <Crown className="w-3 h-3 mr-1" />Promote
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-slate-400" onClick={() => handleReset(record)}>
                <RotateCcw className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Reputation Control Panel
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            className="pl-8 h-9"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Scored", value: allScores.length, icon: Users, color: "text-blue-600" },
            { label: "Top Trusted", value: topUsers.length, icon: Crown, color: "text-amber-600" },
            { label: "Flagged Users", value: flaggedUsers.length, icon: AlertTriangle, color: "text-orange-600" },
            { label: "Low Trust", value: lowTrustUsers.length, icon: TrendingDown, color: "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className="text-xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="all">All ({filteredScores.length})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged ({flaggedUsers.length})</TabsTrigger>
            <TabsTrigger value="top">Top Trusted ({topUsers.length})</TabsTrigger>
            <TabsTrigger value="low">Low Trust ({lowTrustUsers.length})</TabsTrigger>
          </TabsList>

          {[
            { key: "all", data: filteredScores },
            { key: "flagged", data: flaggedUsers },
            { key: "top", data: topUsers },
            { key: "low", data: lowTrustUsers },
          ].map(({ key, data }) => (
            <TabsContent key={key} value={key}>
              {isLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />)}</div>
              ) : data.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">No users in this category</p>
              ) : (
                <div>{data.slice(0, 50).map(r => <ScoreRow key={r.id} record={r} />)}</div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
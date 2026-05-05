import { useState, useMemo } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Shield, Users, Clock, CheckCircle2, XCircle,
  TrendingUp, Activity, Flag, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TRUST_COLORS = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-300",
  normal: "bg-blue-100 text-blue-800 border-blue-300",
  low: "bg-amber-100 text-amber-800 border-amber-300",
  very_low: "bg-red-100 text-red-800 border-red-300",
};

export default function BrigadePanel({ adminUser }) {
  const queryClient = useQueryClient();
  const [expandedTarget, setExpandedTarget] = useState(null);

  const { data: allReports = [] } = useQuery({
    queryKey: ["allReports"],
    queryFn: () => api.entities.Report.list("-created_date", 500),
  });

  // Group reports by target_id to find brigade candidates
  const targetGroups = useMemo(() => {
    const groups = {};
    allReports.forEach(r => {
      if (!groups[r.target_id]) groups[r.target_id] = [];
      groups[r.target_id].push(r);
    });

    return Object.entries(groups)
      .map(([targetId, reports]) => {
        const now = new Date();
        const past5min = reports.filter(r => new Date(r.created_date) > new Date(now - 5 * 60 * 1000));
        const past30min = reports.filter(r => new Date(r.created_date) > new Date(now - 30 * 60 * 1000));
        const past2h = reports.filter(r => new Date(r.created_date) > new Date(now - 2 * 60 * 60 * 1000));

        const brigadeReports = reports.filter(r => r.is_brigade_suspect && !r.brigade_cleared);
        const lowTrustCount = reports.filter(r => r.is_low_trust).length;
        const weightedScore = reports.reduce((sum, r) => sum + (r.report_weight || 1), 0);

        // IP/fingerprint clustering
        const fpMap = {};
        reports.forEach(r => {
          if (r.reporter_device_fingerprint) {
            fpMap[r.reporter_device_fingerprint] = (fpMap[r.reporter_device_fingerprint] || 0) + 1;
          }
        });
        const clusterCount = Object.values(fpMap).filter(c => c > 1).length;

        const isBrigadeAlert =
          brigadeReports.length > 0 ||
          past5min.length >= 5 ||
          past30min.length >= 15 ||
          past2h.length >= 25 ||
          clusterCount >= 2;

        return {
          targetId,
          targetType: reports[0]?.target_type,
          targetPreview: reports[0]?.target_preview,
          targetAuthorId: reports[0]?.target_author_id,
          reports,
          brigadeReports,
          lowTrustCount,
          weightedScore,
          clusterCount,
          past5min: past5min.length,
          past30min: past30min.length,
          past2h: past2h.length,
          isBrigadeAlert,
          latestReport: reports[0],
          allCleared: reports.every(r => r.brigade_cleared),
        };
      })
      .filter(g => g.isBrigadeAlert && g.reports.some(r => r.status === "open"))
      .sort((a, b) => b.brigadeReports.length - a.brigadeReports.length);
  }, [allReports]);

  const clearMutation = useMutation({
    mutationFn: async ({ targetId, action }) => {
      const group = targetGroups.find(g => g.targetId === targetId);
      if (!group) return;

      if (action === "clear") {
        // Mark all brigade-suspect reports as cleared
        for (const r of group.brigadeReports) {
          await api.entities.Report.update(r.id, {
            brigade_cleared: true,
            brigade_cleared_by: adminUser.id,
            brigade_cleared_at: new Date().toISOString(),
          });
        }
        toast.success("Brigade flag cleared. Content remains online.");
      } else if (action === "dismiss_low_trust") {
        // Dismiss all low-trust reports
        const lowTrust = group.reports.filter(r => r.is_low_trust && r.status === "open");
        for (const r of lowTrust) {
          await api.entities.Report.update(r.id, { status: "dismissed", resolution_notes: "Dismissed: low trust reporter" });
        }
        toast.success(`Dismissed ${lowTrust.length} low-trust reports.`);
      } else if (action === "remove_content") {
        // Owner override — remove regardless of brigade
        if (group.targetType === "poll") {
          await api.entities.Poll.update(targetId, { status: "removed" });
        } else if (group.targetType === "comment") {
          await api.entities.Comment.update(targetId, { is_removed: true, removal_reason_code: "removed_by_moderator" });
        } else if (group.targetType === "petition") {
          await api.entities.Petition.update(targetId, { status: "rejected" });
        }
        for (const r of group.reports.filter(r => r.status === "open")) {
          await api.entities.Report.update(r.id, { status: "action_taken", handled_by_user_id: adminUser.id, resolved_at: new Date().toISOString() });
        }
        await api.entities.ModerationLog.create({
          moderator_user_id: adminUser.id,
          action_type: "content_removed",
          target_type: group.targetType,
          target_id: targetId,
          affected_user_id: group.targetAuthorId || "",
          reason: "Owner override after brigade review — content found genuinely harmful",
          details: { brigade_reports: group.brigadeReports.length, weighted_score: group.weightedScore },
          user_notified: false,
        });
        toast.success("Content removed. Owner override logged.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries(["allReports"]),
    onError: (err) => toast.error(err.message || "Action failed"),
  });

  // Account abuse tracking — reporters with many dismissed / brigade-flagged reports
  const reporterAbuse = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      if (!map[r.reporter_user_id]) map[r.reporter_user_id] = { id: r.reporter_user_id, total: 0, brigade: 0, dismissed: 0, lowTrust: 0 };
      map[r.reporter_user_id].total++;
      if (r.is_brigade_suspect) map[r.reporter_user_id].brigade++;
      if (r.status === "dismissed") map[r.reporter_user_id].dismissed++;
      if (r.is_low_trust) map[r.reporter_user_id].lowTrust++;
    });
    return Object.values(map).filter(u => u.brigade >= 2 || (u.dismissed >= 3 && u.lowTrust >= 2)).sort((a, b) => b.brigade - a.brigade);
  }, [allReports]);

  const brigadeCount = targetGroups.length;
  const totalBrigadeReports = allReports.filter(r => r.is_brigade_suspect && !r.brigade_cleared).length;
  const totalLowTrust = allReports.filter(r => r.is_low_trust).length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Brigade Alerts", value: brigadeCount, color: "bg-red-50 border-red-200 text-red-700", icon: AlertTriangle },
          { label: "Brigade-Flagged Reports", value: totalBrigadeReports, color: "bg-orange-50 border-orange-200 text-orange-700", icon: Flag },
          { label: "Low Trust Reports", value: totalLowTrust, color: "bg-amber-50 border-amber-200 text-amber-700", icon: Shield },
          { label: "Abuse-Pattern Accounts", value: reporterAbuse.length, color: "bg-purple-50 border-purple-200 text-purple-700", icon: Users },
        ].map(s => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="pt-4 pb-3 flex items-start gap-3">
              <s.icon className="w-5 h-5 mt-0.5 opacity-60 shrink-0" />
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium leading-tight mt-0.5">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Brigade Alerts */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />Brigade Review Queue
          {brigadeCount > 0 && <Badge className="bg-red-500 text-white">{brigadeCount}</Badge>}
        </h3>

        {targetGroups.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
            <p>No active brigade alerts.</p>
          </div>
        ) : targetGroups.map(group => (
          <Card key={group.targetId} className="border-red-200 bg-red-50/20 mb-4">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className="bg-red-600 text-white">🚨 BRIGADE ALERT</Badge>
                    <Badge variant="outline">{group.targetType}</Badge>
                    <Badge variant="outline" className="font-mono text-xs">{group.targetId.slice(0, 12)}...</Badge>
                  </div>
                  {group.targetPreview && (
                    <p className="text-sm text-slate-600 italic line-clamp-2 mb-2">"{group.targetPreview}"</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{group.past5min} in 5min</span>
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{group.past30min} in 30min</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{group.past2h} in 2h</span>
                    <span className="flex items-center gap-1 text-amber-700"><Flag className="w-3 h-3" />{group.lowTrustCount} low-trust</span>
                    <span className="flex items-center gap-1 text-purple-700"><Users className="w-3 h-3" />{group.clusterCount} device clusters</span>
                    <span className="font-semibold text-blue-700">Weighted score: {group.weightedScore.toFixed(1)}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setExpandedTarget(expandedTarget === group.targetId ? null : group.targetId)}>
                  {expandedTarget === group.targetId ? "Collapse" : "Analyse"}
                </Button>
              </div>

              {expandedTarget === group.targetId && (
                <div className="border-t border-red-200 pt-3 space-y-3">
                  {/* Report timeline */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Report Timeline</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {group.reports.slice(0, 20).map(r => (
                        <div key={r.id} className="flex items-center gap-3 text-xs py-1 border-b border-red-100 last:border-0">
                          <span className="text-slate-400 w-28 shrink-0">{format(new Date(r.created_date), "MMM d HH:mm:ss")}</span>
                          <Badge className={`border ${TRUST_COLORS[r.reporter_trust_level] || ""} text-xs shrink-0`}>{r.reporter_trust_level}</Badge>
                          <span className="text-slate-500">w={r.report_weight || 1}</span>
                          {r.is_brigade_suspect && <Badge className="bg-red-100 text-red-700 border-red-300 text-xs shrink-0">brigade</Badge>}
                          {r.brigade_flag_reason && <span className="text-slate-500 truncate">{r.brigade_flag_reason}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Account age distribution */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Reporter Account Ages</p>
                    <div className="flex gap-2 flex-wrap">
                      {["< 1 day", "1–7 days", "7–30 days", "30+ days"].map((label, i) => {
                        const [min, max] = [[0,1],[1,7],[7,30],[30,99999]][i];
                        const count = group.reports.filter(r => (r.reporter_account_age_days || 0) >= min && (r.reporter_account_age_days || 0) < max).length;
                        return (
                          <div key={label} className={`text-xs px-2.5 py-1 rounded-full border ${count > 2 ? "bg-red-100 border-red-300 text-red-800" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
                            {label}: <strong>{count}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => clearMutation.mutate({ targetId: group.targetId, action: "clear" })}
                      disabled={clearMutation.isPending}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Clear Brigade Flag
                    </Button>
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => clearMutation.mutate({ targetId: group.targetId, action: "dismiss_low_trust" })}
                      disabled={clearMutation.isPending}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />Dismiss Low-Trust Reports
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => clearMutation.mutate({ targetId: group.targetId, action: "remove_content" })}
                      disabled={clearMutation.isPending}>
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />Override: Remove Content
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Report Abuse Accounts */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />Accounts with Abuse Patterns
        </h3>
        {reporterAbuse.length === 0 ? (
          <p className="text-sm text-slate-500">No accounts flagged for report abuse.</p>
        ) : (
          <div className="space-y-2">
            {reporterAbuse.map(u => (
              <Card key={u.id} className="border-purple-200 bg-purple-50/20">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <code className="text-xs text-purple-700 font-mono">{u.id}</code>
                      <div className="flex gap-3 text-xs mt-1">
                        <span className="text-slate-600">Total reports: <strong>{u.total}</strong></span>
                        <span className="text-red-600">Brigade flags: <strong>{u.brigade}</strong></span>
                        <span className="text-amber-600">Dismissed: <strong>{u.dismissed}</strong></span>
                        <span className="text-slate-500">Low trust: <strong>{u.lowTrust}</strong></span>
                      </div>
                    </div>
                    <Badge className={
                      u.brigade >= 5 ? "bg-red-600 text-white" :
                      u.brigade >= 3 ? "bg-orange-500 text-white" :
                      "bg-amber-100 text-amber-800"
                    }>
                      {u.brigade >= 5 ? "High Risk" : u.brigade >= 3 ? "Medium Risk" : "Low Risk"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
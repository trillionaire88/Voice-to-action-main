import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw,
  User, X, Lock, Zap
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_CFG = {
  low:      { color: "bg-slate-50 text-slate-600 border-slate-200",     label: "Low" },
  medium:   { color: "bg-amber-50 text-amber-700 border-amber-200",     label: "Medium" },
  high:     { color: "bg-orange-50 text-orange-700 border-orange-200",  label: "High" },
  critical: { color: "bg-red-50 text-red-700 border-red-200",           label: "Critical" },
};

const RISK_LABELS = {
  spam_activity: "Spam Activity",   bot_activity: "Bot Activity",
  brigading: "Brigading",           fake_signatures: "Fake Signatures",
  harassment_pattern: "Harassment", defamation_risk: "Defamation Risk",
  threat_language: "Threat Language", illegal_content: "Illegal Content",
  payment_fraud: "Payment Fraud",   account_abuse: "Account Abuse",
  mass_report_abuse: "Report Abuse", api_abuse: "API Abuse",
  data_access_spike: "Data Spike",  ledger_mismatch: "Ledger Mismatch",
  duplicate_account: "Duplicate Account", vote_spike: "Vote Spike",
  policy_mismatch: "Policy Mismatch",
};

export default function RiskMonitor() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);

  useEffect(() => { api.auth.me().then(setUser).catch(() => {}); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "owner_admin";

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["riskAlerts"],
    queryFn: () => api.entities.RiskAlert.list("-created_date", 100),
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const { data: riskScores = [] } = useQuery({
    queryKey: ["userRiskScores"],
    queryFn: () => api.entities.UserRiskScore.list("-risk_score", 50),
    enabled: isAdmin,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, notes, is_false_positive }) =>
      api.functions.invoke("riskEngine", { action: "review_alert", alert_id: id, status, admin_notes: notes, is_false_positive }),
    onSuccess: () => { qc.invalidateQueries(["riskAlerts"]); toast.success("Alert updated"); },
  });

  const limitMutation = useMutation({
    mutationFn: ({ user_id, limits }) =>
      api.functions.invoke("riskEngine", { action: "apply_limit", target_user_id: user_id, limits }),
    onSuccess: () => { qc.invalidateQueries(["userRiskScores"]); toast.success("Limits applied"); },
  });

  const runScan = async () => {
    setScanLoading(true);
    try {
      const res = await api.functions.invoke("riskEngine", { action: "full_scan" });
      toast.success(`Scan complete — ${res.data?.new_alerts || 0} new alert(s)`);
      refetch();
      qc.invalidateQueries(["userRiskScores"]);
    } catch (e) { toast.error("Scan failed: " + e.message); }
    finally { setScanLoading(false); }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const openAlerts = alerts.filter(a => a.status === "open");
  const criticalAlerts = openAlerts.filter(a => a.severity === "critical");
  const highRiskUsers = riskScores.filter(u => u.overall_risk === "high" || u.overall_risk === "critical");

  return (
    <div className="page-container page-enter max-w-5xl">
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-600 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
            <ShieldAlert className="w-4 h-4" />Risk Detection Engine
          </div>
          <h1 className="text-h1 text-slate-900">Risk Monitor</h1>
          <p className="text-body text-slate-500 mt-1">Fraud, abuse, and threat detection — owner access only</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refetch(); qc.invalidateQueries(["userRiskScores"]); }}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          <Button onClick={runScan} disabled={scanLoading} className="bg-red-600 hover:bg-red-700">
            <Zap className={`w-4 h-4 mr-2 ${scanLoading ? "animate-spin" : ""}`} />
            {scanLoading ? "Scanning…" : "Run Full Scan"}
          </Button>
        </div>
      </div>

      {/* Critical banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} require attention</p>
            <p className="text-sm text-red-700">{criticalAlerts.map(a => RISK_LABELS[a.risk_type] || a.risk_type).join(" · ")}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4col mb-8">
        <div className="stat-card border-red-200 bg-red-50/30"><span className="stat-label">Critical</span><span className="stat-value text-red-600">{criticalAlerts.length}</span></div>
        <div className="stat-card border-orange-200 bg-orange-50/30"><span className="stat-label">High</span><span className="stat-value text-orange-600">{openAlerts.filter(a => a.severity === "high").length}</span></div>
        <div className="stat-card border-amber-200 bg-amber-50/30"><span className="stat-label">Open Alerts</span><span className="stat-value text-amber-600">{openAlerts.length}</span></div>
        <div className="stat-card"><span className="stat-label">High Risk Users</span><span className="stat-value text-slate-700">{highRiskUsers.length}</span></div>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="alerts" className="text-xs">Open Alerts ({openAlerts.length})</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Risk Users ({riskScores.length})</TabsTrigger>
        </TabsList>

        {/* ── OPEN ALERTS ─────────────────────── */}
        {["alerts", "all"].map(tabVal => (
          <TabsContent key={tabVal} value={tabVal}>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-2">
                {(tabVal === "alerts" ? openAlerts : alerts).map(alert => {
                  const sev = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.low;
                  return (
                    <Card key={alert.id} className={`border ${alert.severity === "critical" ? "border-red-200 bg-red-50/10" : alert.severity === "high" ? "border-orange-200 bg-orange-50/10" : "border-slate-200"}`}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <Badge className={`${sev.color} text-[10px]`}>{sev.label}</Badge>
                              <Badge variant="outline" className="text-[10px]">{RISK_LABELS[alert.risk_type] || alert.risk_type}</Badge>
                              {alert.status !== "open" && <Badge className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] capitalize">{alert.status}</Badge>}
                              {alert.is_false_positive && <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">False positive</Badge>}
                              <span className="text-[10px] text-slate-400">{alert.created_date ? formatDistanceToNow(new Date(alert.created_date), { addSuffix: true }) : ""}</span>
                            </div>
                            <p className="text-sm text-slate-700">{alert.description}</p>
                            {alert.subject_user_id && <p className="text-[10px] text-slate-400 mt-0.5">User: {alert.subject_user_id}</p>}
                            {alert.admin_notes && <p className="text-xs text-blue-600 italic mt-0.5">{alert.admin_notes}</p>}
                          </div>
                          {alert.status === "open" && (
                            <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                              <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700"
                                onClick={() => reviewMutation.mutate({ id: alert.id, status: "actioned", notes: "Resolved" })}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />Action
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => reviewMutation.mutate({ id: alert.id, status: "ignored", is_false_positive: true })}>
                                <X className="w-3 h-3 mr-1" />Ignore
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {(tabVal === "alerts" ? openAlerts : alerts).length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                    <p className="text-slate-500">{tabVal === "alerts" ? "No open alerts — all clear" : "No alerts yet"}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}

        {/* ── RISK USERS ───────────────────────── */}
        <TabsContent value="users">
          <div className="space-y-2">
            {riskScores.map(rs => (
              <Card key={rs.id} className={`border ${rs.overall_risk === "critical" ? "border-red-200 bg-red-50/10" : rs.overall_risk === "high" ? "border-orange-200 bg-orange-50/10" : "border-slate-200"}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-xs text-slate-600">{rs.user_id}</span>
                        <Badge className={`text-[10px] ${SEVERITY_CFG[rs.overall_risk]?.color || SEVERITY_CFG.low.color}`}>{rs.overall_risk} risk</Badge>
                        <span className="text-xs text-slate-500">Score: {rs.risk_score}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(rs.flags || []).map(f => <Badge key={f} variant="outline" className="text-[10px]">{f.replace(/_/g, " ")}</Badge>)}
                        {(rs.active_limits || []).map(l => <Badge key={l} className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">{l.replace(/_/g, " ")}</Badge>)}
                      </div>
                    </div>
                    {(rs.overall_risk === "high" || rs.overall_risk === "critical") && (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-orange-200 text-orange-700"
                        onClick={() => limitMutation.mutate({ user_id: rs.user_id, limits: ["posting_limited", "voting_limited"] })}>
                        <Lock className="w-3 h-3 mr-1" />Apply Limits
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {riskScores.length === 0 && <p className="text-center text-slate-500 py-8">No user risk assessments yet — run a full scan first</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
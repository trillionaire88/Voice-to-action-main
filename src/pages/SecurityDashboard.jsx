import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navigate } from "react-router-dom";
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  Eye,
  Ban,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

function formatSignals(signals) {
  if (Array.isArray(signals)) return signals.join(", ");
  if (signals && typeof signals === "object") return JSON.stringify(signals);
  return signals ? String(signals) : "";
}

export default function SecurityDashboard() {
  const { user, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const adminOk = user && ["owner_admin", "admin"].includes(user.role);

  const { data: blockedIPs = [], refetch: refetchIPs } = useQuery({
    queryKey: ["blockedIPs"],
    enabled: adminOk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ip_reputation")
        .select("*")
        .eq("is_blocked", true)
        .order("blocked_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: highRiskIPs = [] } = useQuery({
    queryKey: ["highRiskIPs"],
    enabled: adminOk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ip_reputation")
        .select("*")
        .gte("risk_score", 70)
        .eq("is_blocked", false)
        .order("risk_score", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: anomalousUsers = [] } = useQuery({
    queryKey: ["anomalousUsers"],
    enabled: adminOk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_behaviour_baseline")
        .select("*, profiles(full_name, email, role)")
        .gte("anomaly_score", 50)
        .order("anomaly_score", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: duplicates = [], refetch: refetchDupes } = useQuery({
    queryKey: ["duplicateIdentities"],
    enabled: adminOk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("duplicate_identity_flags")
        .select("*")
        .eq("status", "pending")
        .order("similarity_score", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: suspiciousLogins = [] } = useQuery({
    queryKey: ["recentSuspiciousLogins"],
    enabled: adminOk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suspicious_logins")
        .select("*, profiles(full_name, email)")
        .in("severity", ["critical", "high"])
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: flaggedPetitions = [], refetch: refetchIntegrity } = useQuery({
    queryKey: ["securityFlaggedPetitions"],
    enabled: adminOk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petition_integrity")
        .select("*, petitions(title, signature_count_total)")
        .eq("is_flagged", true)
        .eq("admin_reviewed", false)
        .order("integrity_score", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: rateLimits = [] } = useQuery({
    queryKey: ["rateLimitMonitor"],
    enabled: adminOk,
    queryFn: async () => {
      const { data } = await supabase
        .from("rate_limit_store")
        .select("key,count,updated_at")
        .gte("updated_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order("count", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: moderationQueue = [], refetch: refetchModeration } = useQuery({
    queryKey: ["moderationQueue"],
    enabled: adminOk,
    queryFn: async () => {
      const { data } = await supabase
        .from("security_audit_log")
        .select("*")
        .eq("event_type", "auto_moderation_flag")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const { data: bruteForceHeat = [] } = useQuery({
    queryKey: ["failedLoginHeatmap"],
    enabled: adminOk,
    queryFn: async () => {
      const { data } = await supabase
        .from("brute_force_log")
        .select("ip_address,attempted_at")
        .gte("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("attempted_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: deletionQueue = [], refetch: refetchDeletion } = useQuery({
    queryKey: ["securityDeletionQueue"],
    enabled: adminOk,
    queryFn: async () => {
      const { data } = await supabase
        .from("data_deletion_requests")
        .select("*")
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: breachHistory = [] } = useQuery({
    queryKey: ["breachAlertHistoryDashboard"],
    enabled: adminOk,
    queryFn: async () => {
      const { data } = await supabase
        .from("security_audit_log")
        .select("*")
        .eq("event_type", "breach_alert_sent")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: activeSessionCount = 0 } = useQuery({
    queryKey: ["activeSessionCount"],
    enabled: adminOk,
    queryFn: async () => {
      const { count } = await supabase
        .from("active_sessions")
        .select("id", { count: "exact", head: true })
        .eq("revoked", false);
      return count || 0;
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["blockedIPs"] });
    queryClient.invalidateQueries({ queryKey: ["highRiskIPs"] });
    queryClient.invalidateQueries({ queryKey: ["anomalousUsers"] });
    queryClient.invalidateQueries({ queryKey: ["duplicateIdentities"] });
    queryClient.invalidateQueries({ queryKey: ["recentSuspiciousLogins"] });
    queryClient.invalidateQueries({ queryKey: ["securityFlaggedPetitions"] });
  };

  const unblockIP = async (ip) => {
    const { error } = await supabase
      .from("ip_reputation")
      .update({ is_blocked: false, risk_score: 0 })
      .eq("ip_address", ip);
    if (error) {
      toast.error(error.message);
      return;
    }
    refetchIPs();
    toast.success(`IP ${ip} unblocked.`);
  };

  const confirmDuplicate = async (id) => {
    const { error } = await supabase
      .from("duplicate_identity_flags")
      .update({ status: "confirmed_duplicate" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refetchDupes();
    toast.warning("Marked as confirmed duplicate — manual suspension required.");
  };

  const dismissDuplicate = async (id) => {
    const { error } = await supabase
      .from("duplicate_identity_flags")
      .update({ status: "false_positive" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refetchDupes();
    toast.success("Dismissed as false positive.");
  };

  const threatScore = Math.min(
    100,
    blockedIPs.length * 2 +
      highRiskIPs.length * 5 +
      anomalousUsers.filter((u) => u.anomaly_score >= 80).length * 10 +
      suspiciousLogins.filter((l) => l.severity === "critical").length * 15,
  );

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!user || !adminOk) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-600 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
            <Shield className="w-4 h-4" /> Real-Time Security Dashboard
          </div>
          <h1 className="text-3xl font-black text-slate-900">Threat Intelligence</h1>
          <p className="text-slate-500 mt-1">Live platform security status — admin access</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh((r) => !r)}>
            <Activity className={`w-4 h-4 mr-1 ${autoRefresh ? "text-green-500 animate-pulse" : "text-slate-400"}`} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
        </div>
      </div>

      <Card
        className={`border-2 ${
          threatScore >= 60
            ? "border-red-400 bg-red-50"
            : threatScore >= 30
              ? "border-amber-400 bg-amber-50"
              : "border-emerald-400 bg-emerald-50"
        }`}
      >
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-slate-800 text-lg">Platform Threat Level</span>
            <Badge
              className={
                threatScore >= 60
                  ? "bg-red-600 text-white"
                  : threatScore >= 30
                    ? "bg-amber-500 text-white"
                    : "bg-emerald-600 text-white"
              }
            >
              {threatScore >= 60 ? "HIGH" : threatScore >= 30 ? "MEDIUM" : "LOW"} — {threatScore}/100
            </Badge>
          </div>
          <Progress value={threatScore} className="h-3" />
          <p className="text-xs text-slate-500 mt-2">
            Based on: {blockedIPs.length} blocked IPs · {highRiskIPs.length} high-risk IPs ·{" "}
            {anomalousUsers.filter((u) => u.anomaly_score >= 80).length} anomalous users ·{" "}
            {suspiciousLogins.filter((l) => l.severity === "critical").length} critical logins in 24h
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Blocked IPs", value: blockedIPs.length, icon: Ban, color: "text-red-600" },
          { label: "High Risk IPs", value: highRiskIPs.length, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Anomalous Users", value: anomalousUsers.length, icon: Users, color: "text-purple-600" },
          { label: "Duplicate Accounts", value: duplicates.length, icon: Eye, color: "text-blue-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <stat.icon className={`w-6 h-6 ${stat.color} shrink-0`} />
              <div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {suspiciousLogins.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Critical Login Events (Last 24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suspiciousLogins.map((login) => (
              <div
                key={login.id}
                className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {login.profiles?.email || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {login.reason} · {login.country_code} · {login.ip_address}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(login.created_at).toLocaleString("en-AU")}
                  </p>
                </div>
                <Badge
                  className={
                    login.severity === "critical" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                  }
                >
                  {login.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {duplicates.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-purple-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Possible Duplicate Accounts ({duplicates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {duplicates.map((dup) => (
              <div key={dup.id} className="p-2 bg-purple-50 rounded-lg border border-purple-100 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-slate-600">
                    {dup.account_a_id.slice(0, 8)}… ↔ {dup.account_b_id.slice(0, 8)}…
                  </p>
                  <Badge className="bg-purple-600 text-white text-xs">{dup.similarity_score}% match</Badge>
                </div>
                <p className="text-xs text-slate-500">Signals: {formatSignals(dup.match_signals)}</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-6 border-red-300 text-red-700"
                    onClick={() => confirmDuplicate(dup.id)}
                  >
                    Confirm Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-6 text-slate-500"
                    onClick={() => dismissDuplicate(dup.id)}
                  >
                    False Positive
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {blockedIPs.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-600" /> Blocked IPs ({blockedIPs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {blockedIPs.map((ipRow) => (
                <div
                  key={ipRow.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold">{ipRow.ip_address}</span>
                    <span className="text-slate-500 ml-2">
                      {ipRow.country_code} · {ipRow.block_reason}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs text-blue-600"
                    onClick={() => unblockIP(ipRow.ip_address)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {flaggedPetitions.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-700 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Petition Integrity Flags ({flaggedPetitions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flaggedPetitions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.petitions?.title}</p>
                  <p className="text-xs text-slate-500">
                    Score: {p.integrity_score}/100 · {formatSignals(p.flags)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("petition_integrity")
                      .update({ admin_reviewed: true })
                      .eq("id", p.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success("Marked reviewed");
                      refetchIntegrity();
                    }
                  }}
                >
                  Review Done
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Rate Limit Monitor</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {rateLimits.map((r, i) => <div key={`${r.key}-${i}`} className="flex justify-between"><span>{r.key}</span><span>{r.count}</span></div>)}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Content Moderation Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {moderationQueue.map((m) => (
            <div key={m.id} className="border rounded p-2 text-xs flex justify-between items-center">
              <span>{m.details?.contentType || "content"} · {m.details?.contentId || "-"}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => { await supabase.from("security_audit_log").update({ details: { ...(m.details || {}), reviewed: true, decision: "approved" } }).eq("id", m.id); refetchModeration(); }}>Approve</Button>
                <Button size="sm" variant="outline" onClick={async () => { await supabase.from("security_audit_log").update({ details: { ...(m.details || {}), reviewed: true, decision: "remove_content" } }).eq("id", m.id); refetchModeration(); }}>Remove</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Failed Login Heatmap (24h)</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {bruteForceHeat.slice(0, 25).map((b, i) => (
            <div key={`${b.ip_address}-${i}`} className="flex justify-between"><span>{b.ip_address}</span><span>{new Date(b.attempted_at).toLocaleString("en-AU")}</span></div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Data Deletion Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {deletionQueue.map((d) => (
            <div key={d.id} className="border rounded p-2 text-xs flex justify-between items-center">
              <span>{d.user_id}</span>
              <Button size="sm" onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession();
                await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-data-deletion`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "process", request_id: d.id }) });
                refetchDeletion();
              }}>Process</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Breach Alert History</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {breachHistory.map((h) => <div key={h.id}>{new Date(h.created_at).toLocaleString("en-AU")} · {h.user_id}</div>)}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Session Overview</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold">{activeSessionCount}</p><p className="text-xs text-slate-500">Active sessions</p></CardContent>
      </Card>
    </div>
  );
}

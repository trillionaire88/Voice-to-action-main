import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, FileText, Users, AlertTriangle, CheckCircle2, Clock,
  Download, RefreshCw, Eye, Database, Trash2, Globe2, Scale,
  Activity, CreditCard, BookOpen, X, Plus, Flag, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  info: { color: "bg-blue-50 text-blue-700 border-blue-200", label: "Info" },
  warning: { color: "bg-amber-50 text-amber-700 border-amber-200", label: "Warning" },
  critical: { color: "bg-red-50 text-red-700 border-red-200", label: "Critical" },
};

const EVENT_ICONS = {
  account_creation: Users, policy_acceptance: BookOpen, payment_action: CreditCard,
  verification_action: CheckCircle2, moderation_action: Shield, takedown_request: Flag,
  governance_decision: Scale, admin_change: AlertTriangle, data_access: Eye,
  data_export: Download, deletion_request: Trash2, age_confirmation: Users,
  charity_review: CheckCircle2, login_failed: AlertTriangle,
  policy_change: FileText, system_check: Activity,
};

function ExportButton({ data, filename, label }) {
  const exportCSV = () => {
    if (!data?.length) { toast.error("No data to export"); return; }
    const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
    const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`;
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
    toast.success("CSV exported");
  };
  const exportJSON = () => {
    if (!data?.length) { toast.error("No data to export"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.json`;
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
    toast.success("JSON exported");
  };
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCSV}><Download className="w-3 h-3 mr-1" />CSV</Button>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportJSON}><Download className="w-3 h-3 mr-1" />JSON</Button>
    </div>
  );
}

// ─── Add Policy Modal ─────────────────────────────────────────────────────────
function AddPolicyModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    policy_type: "terms_of_use", version: "", title: "", summary: "", content: "", change_summary: "",
    requires_re_acceptance: true, jurisdiction_scope: "global",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Publish Policy Version</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Policy Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.policy_type} onChange={e => set("policy_type", e.target.value)}>
                {["terms_of_use","privacy_policy","payment_policy","no_refund_policy","community_rules"].map(p => (
                  <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Version *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. v2.1" value={form.version} onChange={e => set("version", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Title *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Policy title" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Summary (shown to users)</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-16" placeholder="Plain-language summary..." value={form.summary} onChange={e => set("summary", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Full Content</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24" placeholder="Full policy text..." value={form.content} onChange={e => set("content", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">What Changed</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Brief change summary" value={form.change_summary} onChange={e => set("change_summary", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.requires_re_acceptance} onChange={e => set("requires_re_acceptance", e.target.checked)} id="rea" />
            <label htmlFor="rea" className="text-sm text-slate-700">Require users to re-accept</label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.version || !form.title} className="flex-1 bg-blue-600 hover:bg-blue-700">Publish Policy</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const COMP_PAGE_SIZE = 50;

export default function ComplianceDashboard() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [lastCheckAlerts, setLastCheckAlerts] = useState(null);
  const [logPage, setLogPage] = useState(1);
  const [accessPage, setAccessPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  useEffect(() => { api.auth.me().then(setUser).catch(() => {}); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "owner_admin";

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["complianceLogs", logPage],
    queryFn: () => api.entities.ComplianceLog.list("-created_date", COMP_PAGE_SIZE * logPage),
    enabled: isAdmin,
  });

  const { data: policies = [], refetch: refetchPolicies } = useQuery({
    queryKey: ["policyVersions"],
    queryFn: () => api.entities.PolicyVersion.list("-created_date", 50),
    enabled: isAdmin,
  });

  const { data: dataRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["dataRequests"],
    queryFn: () => api.entities.DataRequest.list("-created_date", 50),
    enabled: isAdmin,
  });

  const { data: paymentRecords = [] } = useQuery({
    queryKey: ["paymentRecords", paymentPage],
    queryFn: () => api.entities.PaymentRecord.list("-created_date", COMP_PAGE_SIZE * paymentPage),
    enabled: isAdmin,
  });

  const { data: dataAccessLogs = [] } = useQuery({
    queryKey: ["dataAccessLogs", accessPage],
    queryFn: () => api.entities.DataAccessLog.list("-created_date", COMP_PAGE_SIZE * accessPage),
    enabled: isAdmin,
  });

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdictionRules"],
    queryFn: () => api.entities.JurisdictionRule.list(),
    enabled: isAdmin,
  });

  const { data: retentionPolicies = [] } = useQuery({
    queryKey: ["retentionPolicies"],
    queryFn: () => api.entities.RetentionPolicy.list(),
    enabled: isAdmin,
  });

  const reviewRequestMutation = useMutation({
    mutationFn: ({ id, status, notes }) => api.entities.DataRequest.update(id, {
      status, admin_notes: notes, reviewed_by_admin_id: user?.id,
      reviewed_at: new Date().toISOString(),
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
    }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["dataRequests"] });
      const prev = qc.getQueryData(["dataRequests"]);
      qc.setQueryData(["dataRequests"], old => (old || []).map(r => r.id === id ? { ...r, status } : r));
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dataRequests"] }); toast.success("Request updated"); },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["dataRequests"], ctx.prev); toast.error("Update failed"); },
  });

  const publishPolicyMutation = useMutation({
    mutationFn: (form) => api.functions.invoke("complianceEngine", { action: "publish_policy", ...form }),
    onSuccess: () => { refetchPolicies(); setShowAddPolicy(false); toast.success("Policy published"); },
    onError: () => toast.error("Failed to publish policy"),
  });

  const runDailyCheck = async () => {
    setCheckLoading(true);
    try {
      const res = await api.functions.invoke("complianceEngine", { action: "daily_check" });
      setLastCheckAlerts(res.data?.alerts || []);
      refetchLogs();
      toast.success(`Check complete — ${res.data?.alerts?.length || 0} alert(s)`);
    } catch (e) {
      toast.error("Check failed: " + e.message);
    } finally {
      setCheckLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Owner Access Only</h2>
        <p className="text-slate-500 mt-2">The Compliance Dashboard is restricted to platform owners.</p>
      </div>
    );
  }

  const criticalLogs = logs.filter(l => l.severity === "critical");
  const warningLogs = logs.filter(l => l.severity === "warning");
  const pendingRequests = dataRequests.filter(r => r.status === "pending");
  const activePolicies = policies.filter(p => p.is_active);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {showAddPolicy && <AddPolicyModal onClose={() => setShowAddPolicy(false)} onSave={f => publishPolicyMutation.mutate(f)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
            <Shield className="w-4 h-4" />Compliance Engine
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Compliance Dashboard</h1>
          <p className="text-slate-500 mt-1">Legal logging, consent tracking, audit records — owner access only</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { refetchLogs(); refetchPolicies(); refetchRequests(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
          <Button onClick={runDailyCheck} disabled={checkLoading} className="bg-slate-900 hover:bg-slate-800">
            <Activity className={`w-4 h-4 mr-2 ${checkLoading ? "animate-spin" : ""}`} />
            {checkLoading ? "Running Check..." : "Run Compliance Check"}
          </Button>
        </div>
      </div>

      {/* Alert strip */}
      {lastCheckAlerts && lastCheckAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 space-y-1">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Compliance Alerts</p>
          {lastCheckAlerts.map((a, i) => (
            <div key={i} className="text-xs text-amber-700 flex items-center gap-2">
              <Badge className={`${SEVERITY_CONFIG[a.severity]?.color} text-[10px]`}>{a.severity}</Badge>
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="border-red-200 bg-red-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{criticalLogs.length}</div>
            <div className="text-xs text-slate-500">Critical Events</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{warningLogs.length}</div>
            <div className="text-xs text-slate-500">Warnings</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-700">{pendingRequests.length}</div>
            <div className="text-xs text-slate-500">Pending Data Requests</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-emerald-700">{activePolicies.length}</div>
            <div className="text-xs text-slate-500">Active Policies</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="logs" className="text-xs">Audit Log ({logs.length})</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs">Policies ({activePolicies.length})</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs">Data Requests ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="access" className="text-xs">Access Log ({dataAccessLogs.length})</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments ({paymentRecords.length})</TabsTrigger>
          <TabsTrigger value="retention" className="text-xs">Retention</TabsTrigger>
          <TabsTrigger value="jurisdictions" className="text-xs">Jurisdictions</TabsTrigger>
        </TabsList>

        {/* ── AUDIT LOG ─────────────────────────────────────── */}
        <TabsContent value="logs">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Compliance Audit Log</CardTitle>
              <ExportButton data={logs} filename="compliance_audit_log" />
            </CardHeader>
            <CardContent className="pt-0">
              {logsLoading ? (
                <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : logs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No audit records yet</p>
              ) : (
                <div className="space-y-1.5">
                  {logs.map(log => {
                    const Icon = EVENT_ICONS[log.event_type] || Activity;
                    const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                    return (
                      <div key={log.id} className={`flex items-start gap-3 p-3 rounded-xl border ${log.severity === "critical" ? "border-red-200 bg-red-50/20" : log.severity === "warning" ? "border-amber-100 bg-amber-50/10" : "border-slate-100"}`}>
                        <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className={`${sev.color} text-[10px]`}>{sev.label}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{log.event_type?.replace(/_/g, " ")}</Badge>
                            <span className="text-[10px] text-slate-400">{log.created_date ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true }) : ""}</span>
                          </div>
                          <p className="text-xs text-slate-700 mt-0.5">{log.action_detail}</p>
                          {log.user_id && <p className="text-[10px] text-slate-400">User: {log.user_id}</p>}
                        </div>
                      </div>
                    );
                  })}
                  {logs.length === COMP_PAGE_SIZE * logPage && (
                    <div className="flex justify-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => setLogPage(p => p + 1)}>
                        <ChevronDown className="w-4 h-4 mr-1" />Load more
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── POLICIES ─────────────────────────────────────── */}
        <TabsContent value="policies">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-slate-500">{policies.length} policy versions stored</p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddPolicy(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Publish New Version
            </Button>
          </div>
          <div className="space-y-2">
            {policies.map(p => (
              <Card key={p.id} className={`border ${p.is_active ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200"}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800">{p.title}</span>
                        <Badge variant="outline" className="text-[10px]">{p.version}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{p.policy_type?.replace(/_/g, " ")}</Badge>
                        {p.is_active && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>}
                        {p.requires_re_acceptance && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Re-acceptance required</Badge>}
                      </div>
                      {p.summary && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.summary}</p>}
                      {p.change_summary && <p className="text-[10px] text-blue-600 mt-0.5">Changes: {p.change_summary}</p>}
                    </div>
                    <div className="text-[10px] text-slate-400">{p.effective_date}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {policies.length === 0 && <p className="text-center text-slate-500 py-8">No policies published yet</p>}
          </div>
        </TabsContent>

        {/* ── DATA REQUESTS ─────────────────────────────────── */}
        <TabsContent value="requests">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">User Data Requests</CardTitle>
              <ExportButton data={dataRequests} filename="data_requests" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {dataRequests.map(req => (
                  <div key={req.id} className={`border rounded-xl p-3 ${req.status === "pending" ? "border-amber-200 bg-amber-50/20" : "border-slate-100"}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] capitalize">{req.request_type?.replace(/_/g, " ")}</Badge>
                          <Badge className={`text-[10px] ${req.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : req.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : req.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{req.status}</Badge>
                          <span className="text-[10px] text-slate-400">{req.created_date ? formatDistanceToNow(new Date(req.created_date), { addSuffix: true }) : ""}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{req.reason || "No reason provided"}</p>
                        <p className="text-[10px] text-slate-400">User: {req.user_id}</p>
                      </div>
                      {req.status === "pending" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => reviewRequestMutation.mutate({ id: req.id, status: "approved" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600"
                            onClick={() => reviewRequestMutation.mutate({ id: req.id, status: "rejected" })}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {dataRequests.length === 0 && <p className="text-center text-slate-500 py-8">No data requests</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DATA ACCESS LOG ───────────────────────────────── */}
        <TabsContent value="access">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Admin Data Access Log</CardTitle>
              <ExportButton data={dataAccessLogs} filename="data_access_log" />
            </CardHeader>
            <CardContent className="pt-0">
              {dataAccessLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No data access records</p>
              ) : (
                <div className="space-y-1.5">
                  {dataAccessLogs.map(log => (
                    <div key={log.id} className="border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                      <Eye className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] capitalize">{log.access_type}</Badge>
                          <span className="text-xs text-slate-700">{log.data_type}</span>
                          <span className="text-[10px] text-slate-400">{log.accessed_at ? formatDistanceToNow(new Date(log.accessed_at), { addSuffix: true }) : ""}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Admin: {log.admin_id} | Subject: {log.subject_user_id}</p>
                        {log.reason && <p className="text-[10px] text-slate-500 italic">{log.reason}</p>}
                      </div>
                    </div>
                  ))}
                  {dataAccessLogs.length === COMP_PAGE_SIZE * accessPage && (
                    <div className="flex justify-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => setAccessPage(p => p + 1)}>
                        <ChevronDown className="w-4 h-4 mr-1" />Load more
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PAYMENTS ─────────────────────────────────────── */}
        <TabsContent value="payments">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Payment Records</CardTitle>
              <ExportButton data={paymentRecords} filename="payment_records" />
            </CardHeader>
            <CardContent className="pt-0">
              {paymentRecords.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No payment records</p>
              ) : (
                <div className="space-y-1.5">
                  {paymentRecords.map(p => (
                    <div key={p.id} className="border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-slate-800">{p.amount} {p.currency}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{p.reason?.replace(/_/g, " ")}</Badge>
                          <Badge className={`text-[10px] ${p.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : p.status === "failed" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{p.status}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-400">Ref: {p.reference || "—"} | User: {p.user_id}</p>
                        {p.processed_at && <p className="text-[10px] text-slate-400">{format(new Date(p.processed_at), "dd MMM yyyy HH:mm")}</p>}
                      </div>
                    </div>
                  ))}
                  {paymentRecords.length === COMP_PAGE_SIZE * paymentPage && (
                    <div className="flex justify-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => setPaymentPage(p => p + 1)}>
                        <ChevronDown className="w-4 h-4 mr-1" />Load more
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RETENTION ─────────────────────────────────────── */}
        <TabsContent value="retention">
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Define how long each data type is retained</p>
            {retentionPolicies.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="pt-8 pb-8 text-center">
                  <Database className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No retention policies configured</p>
                  <p className="text-sm text-slate-400 mt-1">Add retention policies from the entity editor or use default rules.</p>
                </CardContent>
              </Card>
            ) : (
              retentionPolicies.map(rp => (
                <Card key={rp.id} className="border-slate-200">
                  <CardContent className="pt-3 pb-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-sm text-slate-800">{rp.data_type}</span>
                      <p className="text-xs text-slate-500">{rp.legal_basis}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{rp.retention_label || `${rp.retention_period_months}m`}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{rp.jurisdiction}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── JURISDICTIONS ────────────────────────────────── */}
        <TabsContent value="jurisdictions">
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Region-specific compliance rules</p>
            {jurisdictions.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="pt-8 pb-8 text-center">
                  <Globe2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No jurisdiction rules configured</p>
                  <p className="text-sm text-slate-400 mt-1">Add rules for EU GDPR, Australian Privacy Act, US COPPA, etc.</p>
                </CardContent>
              </Card>
            ) : (
              jurisdictions.map(jr => (
                <Card key={jr.id} className="border-slate-200">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-semibold text-sm text-slate-800">{jr.rule_name}</span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] uppercase">{jr.jurisdiction}</Badge>
                          {jr.right_to_erasure && <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Right to Erasure</Badge>}
                          {jr.requires_age_verification && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Age Verification</Badge>}
                          {jr.data_portability_required && <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Data Portability</Badge>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">Min age: {jr.minimum_age}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
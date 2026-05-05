import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  BarChart3, TrendingUp, DollarSign, ShieldAlert, FileText,
  Download, RefreshCw, Zap, Activity, Database
} from "lucide-react";
import { toast } from "sonner";

const STAT_KEYS = [
  { key: "new_petitions", label: "Petitions", color: "#f97316" },
  { key: "new_votes", label: "Votes", color: "#3b82f6" },
  { key: "total_signatures", label: "Signatures", color: "#8b5cf6" },
  { key: "new_communities", label: "Communities", color: "#10b981" },
  { key: "active_users", label: "Active Users", color: "#06b6d4" },
  { key: "revenue_total", label: "Revenue (AUD)", color: "#22c55e" },
  { key: "risk_alerts", label: "Risk Alerts", color: "#ef4444" },
  { key: "moderation_actions", label: "Mod Actions", color: "#f59e0b" },
];

function StatCard({ label, value, color, icon: IconComp }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{typeof value === "number" ? value.toLocaleString() : value}</p>
          </div>
          {IconComp && <IconComp className="w-8 h-8 opacity-10" style={{ color }} />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeepAnalytics() {
  const [user, setUser] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [reportType, setReportType] = useState("activity");
  const [periodType, setPeriodType] = useState("daily");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => { api.auth.me().then(setUser).catch(() => {}); }, []);
  const isAdmin = user?.role === "admin";

  const { data: dailySeries = [], isLoading: loadingDaily, refetch: refetchDaily } = useQuery({
    queryKey: ["wh_daily"],
    queryFn: () => api.functions.invoke("dataWarehouse", { action: "get_series", snapshot_type: "daily", limit: 30 }).then(r => r.data?.series || []),
    enabled: isAdmin,
  });

  const { data: monthlySeries = [], isLoading: loadingMonthly, refetch: refetchMonthly } = useQuery({
    queryKey: ["wh_monthly"],
    queryFn: () => api.functions.invoke("dataWarehouse", { action: "get_series", snapshot_type: "monthly", limit: 12 }).then(r => r.data?.series || []),
    enabled: isAdmin,
  });

  const runSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const [daily, monthly] = await Promise.all([
        api.functions.invoke("dataWarehouse", { action: "daily_snapshot" }),
        api.functions.invoke("dataWarehouse", { action: "monthly_snapshot" }),
      ]);
      toast.success("Snapshots updated");
      refetchDaily(); refetchMonthly();
    } catch (e) { toast.error("Snapshot failed: " + e.message); }
    finally { setSnapshotLoading(false); }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await api.functions.invoke("dataWarehouse", { action: "generate_report", report_type: reportType, period: periodType, limit: 12 });
      setReport(res.data?.report);
    } catch (e) { toast.error("Report failed: " + e.message); }
    finally { setReportLoading(false); }
  };

  const exportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${reportType}_report.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!report?.series?.length) return;
    const keys = Object.keys(report.series[0]);
    const csv = [keys.join(","), ...report.series.map(row => keys.map(k => row[k] ?? "").join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${reportType}_report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const currentSeries = periodType === "daily" ? dailySeries : monthlySeries;
  const latestSnapshot = [...currentSeries].pop();

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Database className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Owner Access Only</h2>
        <p className="text-slate-500 mt-2">Deep Analytics is restricted to platform owners.</p>
      </div>
    );
  }

  return (
    <div className="page-container page-enter max-w-6xl">
      {/* Header */}
      <div className="section-header flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
            <Database className="w-4 h-4" />Data Warehouse
          </div>
          <h1 className="text-h1 text-slate-900">Deep Analytics</h1>
          <p className="text-body text-slate-500 mt-1">Long-term platform data, trends, and reports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 border border-slate-200 rounded-lg p-1">
            {["daily", "monthly"].map(p => (
              <button key={p} onClick={() => setPeriodType(p)} className={`px-3 py-1 rounded text-xs font-medium transition-all capitalize ${periodType === p ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{p}</button>
            ))}
          </div>
          <Button variant="outline" onClick={() => { refetchDaily(); refetchMonthly(); }}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          <Button onClick={runSnapshot} disabled={snapshotLoading} className="bg-indigo-600 hover:bg-indigo-700">
            <Zap className={`w-4 h-4 mr-2 ${snapshotLoading ? "animate-spin" : ""}`} />
            {snapshotLoading ? "Running…" : "Capture Snapshot"}
          </Button>
        </div>
      </div>

      {/* KPI row */}
      {latestSnapshot ? (
        <div className="grid-4col mb-8">
          <StatCard label="Petitions" value={latestSnapshot.new_petitions || 0} color="#f97316" icon={FileText} />
          <StatCard label="Signatures" value={latestSnapshot.total_signatures || 0} color="#8b5cf6" icon={Activity} />
          <StatCard label="Revenue (AUD)" value={`$${(latestSnapshot.revenue_total || 0).toFixed(2)}`} color="#22c55e" icon={DollarSign} />
          <StatCard label="Risk Alerts" value={latestSnapshot.risk_alerts || 0} color="#ef4444" icon={ShieldAlert} />
        </div>
      ) : (
        <div className="grid-4col mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      )}

      <Tabs defaultValue="charts">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="charts" className="text-xs">Charts</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Reports & Export</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Raw History</TabsTrigger>
        </TabsList>

        {/* ── ACTIVITY CHARTS ──────────────────── */}
        <TabsContent value="charts">
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Activity Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDaily ? <Skeleton className="h-48" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={currentSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period_label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="new_petitions" name="Petitions" stroke="#f97316" fill="#fff7ed" />
                      <Area type="monotone" dataKey="new_votes" name="Votes" stroke="#3b82f6" fill="#eff6ff" />
                      <Area type="monotone" dataKey="total_signatures" name="Signatures" stroke="#8b5cf6" fill="#f5f3ff" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={currentSeries.slice(-14)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period_label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="active_users" name="Active Users" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Moderation & Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={currentSeries.slice(-14)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period_label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="moderation_actions" name="Mod Actions" stroke="#f59e0b" dot={false} />
                      <Line type="monotone" dataKey="risk_alerts" name="Risk Alerts" stroke="#ef4444" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── FINANCE ─────────────────────────── */}
        <TabsContent value="finance">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" />Revenue History (AUD)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={currentSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period_label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue_total" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="new_subscriptions" name="New Subs" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled_subscriptions" name="Cancelled" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RISK ────────────────────────────── */}
        <TabsContent value="risk">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" />Risk & Compliance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={currentSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period_label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="risk_alerts" name="Risk Alerts" stroke="#ef4444" fill="#fef2f2" />
                  <Area type="monotone" dataKey="moderation_actions" name="Mod Actions" stroke="#f59e0b" fill="#fffbeb" />
                  <Area type="monotone" dataKey="compliance_events" name="Compliance" stroke="#8b5cf6" fill="#f5f3ff" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REPORTS & EXPORT ────────────────── */}
        <TabsContent value="reports">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Report Type</p>
                <div className="flex gap-1 flex-wrap">
                  {["activity", "finance", "petition", "risk"].map(t => (
                    <button key={t} onClick={() => setReportType(t)} className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-all ${reportType === t ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-4 sm:mt-0 self-end">
                <Button onClick={generateReport} disabled={reportLoading} className="bg-indigo-600 hover:bg-indigo-700 text-sm h-9">
                  <BarChart3 className={`w-4 h-4 mr-2 ${reportLoading ? "animate-spin" : ""}`} />
                  {reportLoading ? "Generating…" : "Generate"}
                </Button>
                {report && (
                  <>
                    <Button variant="outline" className="h-9 text-sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
                    <Button variant="outline" className="h-9 text-sm" onClick={exportJSON}><Download className="w-4 h-4 mr-1" />JSON</Button>
                  </>
                )}
              </div>
            </div>

            {report && (
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{report.title}</CardTitle>
                  <p className="text-xs text-slate-400">{report.record_count} records · Generated {new Date(report.generated_at).toLocaleString()}</p>
                </CardHeader>
                <CardContent>
                  {report.totals && (
                    <div className="flex gap-4 mb-3 flex-wrap">
                      {Object.entries(report.totals).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-slate-500 capitalize">{k.replace(/_/g, " ")}</p>
                          <p className="text-sm font-bold text-slate-800">{typeof v === "number" && k.includes("revenue") ? `$${v.toFixed(2)}` : v.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">{report.series?.[0] && Object.keys(report.series[0]).map(k => <th key={k} className="text-left py-1.5 px-2 text-slate-500 capitalize">{k.replace(/_/g, " ")}</th>)}</tr>
                      </thead>
                      <tbody>
                        {(report.series || []).map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            {Object.values(row).map((v, j) => <td key={j} className="py-1.5 px-2 text-slate-700">{typeof v === "number" ? v.toLocaleString() : String(v ?? "")}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── RAW HISTORY ─────────────────────── */}
        <TabsContent value="history">
          <Card className="border-slate-200">
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Period", "Petitions", "Votes", "Signatures", "Revenue", "Risk", "Mod", "Compliance"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-slate-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...currentSeries].reverse().map((s, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-600">{s.period_label}</td>
                        <td className="py-2 px-3">{s.new_petitions || 0}</td>
                        <td className="py-2 px-3">{s.new_votes || 0}</td>
                        <td className="py-2 px-3">{s.total_signatures || 0}</td>
                        <td className="py-2 px-3">${(s.revenue_total || 0).toFixed(2)}</td>
                        <td className="py-2 px-3">{s.risk_alerts || 0}</td>
                        <td className="py-2 px-3">{s.moderation_actions || 0}</td>
                        <td className="py-2 px-3">{s.compliance_events || 0}</td>
                      </tr>
                    ))}
                    {currentSeries.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-slate-400">No snapshots yet — click "Capture Snapshot" to begin</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
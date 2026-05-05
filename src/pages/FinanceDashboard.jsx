import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Users, Clock, CheckCircle2, XCircle,
  AlertTriangle, Download, RefreshCw, Lock, Unlock, Eye,
  CreditCard, Activity, BarChart3, Filter, Plus, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:   { color: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pending" },
  confirmed: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Confirmed" },
  rejected:  { color: "bg-red-50 text-red-700 border-red-200",         label: "Rejected" },
  cancelled: { color: "bg-slate-50 text-slate-600 border-slate-200",   label: "Cancelled" },
};

const TYPE_LABELS = {
  verification_fee: "Verification Fee",
  subscription_fee: "Subscription Fee",
  support_payment: "Support Payment",
  petition_export_fee: "Petition Export Fee",
  community_fee: "Community Fee",
  manual_payment: "Manual Payment",
  admin_adjustment: "Admin Adjustment",
};

function ExportBtn({ data, filename }) {
  const exportCSV = () => {
    if (!data?.length) { toast.error("No data to export"); return; }
    const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
    const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${filename}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    toast.success("CSV exported");
  };
  const exportJSON = () => {
    if (!data?.length) { toast.error("No data to export"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${filename}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    toast.success("JSON exported");
  };
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCSV}><Download className="w-3 h-3 mr-1" />CSV</Button>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportJSON}><Download className="w-3 h-3 mr-1" />JSON</Button>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ txn, onClose, onSubmit }) {
  const [status, setStatus] = useState("confirmed");
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">Review Payment</h3>
        <div className="space-y-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-semibold">{txn.amount} {txn.currency}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span>{TYPE_LABELS[txn.payment_type] || txn.payment_type}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono text-xs">{txn.reference || "—"}</span></div>
            {txn.reason && <div className="flex justify-between"><span className="text-slate-500">Reason</span><span className="text-xs">{txn.reason}</span></div>}
            {txn.proof_file_url && <a href={txn.proof_file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs flex items-center gap-1"><Eye className="w-3 h-3" />View proof</a>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Decision</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="confirmed">Confirm</option>
              <option value="rejected">Reject</option>
              <option value="cancelled">Cancel</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Admin Notes</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-16" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSubmit(txn.id, status, notes)} className={`flex-1 ${status === "confirmed" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
            {status === "confirmed" ? "Confirm Payment" : status === "rejected" ? "Reject Payment" : "Cancel Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Subscription Modal ───────────────────────────────────────────────────
function AddSubModal({ onClose, onSave }) {
  const [form, setForm] = useState({ target_user_id: "", subscription_type: "individual", plan: "", price: "", currency: "AUD", billing_period: "monthly" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">Create Subscription</h3>
        <div className="space-y-3">
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">User ID *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="User ID" value={form.target_user_id} onChange={e => set("target_user_id", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.subscription_type} onChange={e => set("subscription_type", e.target.value)}>
                {["individual","community","organisation","creator","ngo"].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Plan *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. pro" value={form.plan} onChange={e => set("plan", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Price *</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="0.00" value={form.price} onChange={e => set("price", e.target.value)} /></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Billing</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.billing_period} onChange={e => set("billing_period", e.target.value)}>
                {["monthly","quarterly","annually"].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSave({ ...form, price: Number(form.price) })} disabled={!form.target_user_id || !form.plan || !form.price} className="flex-1 bg-blue-600 hover:bg-blue-700">Create</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const FIN_PAGE_SIZE = 50;

export default function FinanceDashboard() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [reviewTxn, setReviewTxn] = useState(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [txnPage, setTxnPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  useEffect(() => { api.auth.me().then(setUser).catch(() => {}); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "owner_admin";

  const { data: transactions = [], isLoading: txnLoading, refetch: refetchTxn } = useQuery({
    queryKey: ["transactions", txnPage],
    queryFn: () => api.entities.Transaction.list("-created_date", FIN_PAGE_SIZE * txnPage),
    enabled: isAdmin,
  });

  const { data: subscriptions = [], refetch: refetchSubs } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api.entities.Subscription.list("-created_date", 100),
    enabled: isAdmin,
  });

  const { data: finLogs = [] } = useQuery({
    queryKey: ["finLogs", logPage],
    queryFn: () => api.entities.FinanceLog.list("-created_date", FIN_PAGE_SIZE * logPage),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isAdmin) return;
    setSummaryLoading(true);
    api.functions.invoke("financeEngine", { action: "finance_summary" })
      .then(res => setSummary(res.data))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [isAdmin, transactions.length]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, notes }) =>
      api.functions.invoke("financeEngine", { action: "review_payment", transaction_id: id, status, admin_notes: notes }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const prev = qc.getQueryData(["transactions", txnPage]);
      qc.setQueryData(["transactions", txnPage], old => (old || []).map(t => t.id === id ? { ...t, status } : t));
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); setReviewTxn(null); toast.success("Payment updated"); },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["transactions", txnPage], ctx.prev); toast.error("Failed to update payment"); },
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, locked }) => api.functions.invoke("financeEngine", { action: "lock_transaction", transaction_id: id, locked }),
    onMutate: async ({ id, locked }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const prev = qc.getQueryData(["transactions", txnPage]);
      qc.setQueryData(["transactions", txnPage], old => (old || []).map(t => t.id === id ? { ...t, is_locked: locked } : t));
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Transaction updated"); },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["transactions", txnPage], ctx.prev); },
  });

  const createSubMutation = useMutation({
    mutationFn: (data) => api.functions.invoke("financeEngine", { action: "create_subscription", ...data }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); setShowAddSub(false); toast.success("Subscription created"); },
    onError: () => toast.error("Failed to create subscription"),
  });

  const cancelSubMutation = useMutation({
    mutationFn: (id) => api.functions.invoke("financeEngine", { action: "cancel_subscription", subscription_id: id, cancel_reason: "Cancelled by admin" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["subscriptions"] });
      const prev = qc.getQueryData(["subscriptions"]);
      qc.setQueryData(["subscriptions"], old => (old || []).map(s => s.id === id ? { ...s, status: "cancelled" } : s));
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); toast.success("Subscription cancelled"); },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["subscriptions"], ctx.prev); },
  });

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <DollarSign className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Owner Access Only</h2>
        <p className="text-slate-500 mt-2">The Finance Dashboard is restricted to platform owners.</p>
      </div>
    );
  }

  const filtered = statusFilter === "all" ? transactions : transactions.filter(t => t.status === statusFilter);
  const pending = transactions.filter(t => t.status === "pending");
  const flagged = transactions.filter(t => t.is_flagged);
  const activeSubs = subscriptions.filter(s => s.status === "active");

  // Chart data
  const chartData = summary?.monthly_breakdown
    ? Object.entries(summary.monthly_breakdown).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, total]) => ({ month: month.slice(5), total: Math.round(total) }))
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {reviewTxn && <ReviewModal txn={reviewTxn} onClose={() => setReviewTxn(null)} onSubmit={(id, status, notes) => reviewMutation.mutate({ id, status, notes })} />}
      {showAddSub && <AddSubModal onClose={() => setShowAddSub(false)} onSave={d => createSubMutation.mutate(d)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
            <DollarSign className="w-4 h-4" />Finance System
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Finance Dashboard</h1>
          <p className="text-slate-500 mt-1">Payments, subscriptions, audit records — owner access only</p>
        </div>
        <Button variant="outline" onClick={() => { refetchTxn(); refetchSubs(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Fraud alerts */}
      {flagged.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700"><span className="font-semibold">{flagged.length} flagged transaction(s)</span> — possible duplicate reference or fraud. Review below.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Confirmed", value: summaryLoading ? "…" : `$${(summary?.total_income || 0).toFixed(2)}`, color: "text-emerald-700", border: "border-emerald-200 bg-emerald-50/30", icon: DollarSign },
          { label: "This Month", value: summaryLoading ? "…" : `$${(summary?.monthly_income || 0).toFixed(2)}`, color: "text-blue-700", border: "border-blue-200 bg-blue-50/30", icon: TrendingUp },
          { label: "Pending Review", value: pending.length, color: "text-amber-700", border: "border-amber-200 bg-amber-50/30", icon: Clock },
          { label: "Active Subs", value: activeSubs.length, color: "text-purple-700", border: "border-purple-200 bg-purple-50/30", icon: Users },
        ].map(s => (
          <Card key={s.label} className={`${s.border} text-center`}>
            <CardContent className="pt-4 pb-4">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color} opacity-60`} />
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="transactions" className="text-xs">Transactions ({transactions.length})</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs">Subscriptions ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="chart" className="text-xs">Monthly Chart</TabsTrigger>
          <TabsTrigger value="log" className="text-xs">Finance Log</TabsTrigger>
        </TabsList>

        {/* ── TRANSACTIONS ──────────────────────────── */}
        <TabsContent value="transactions">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {["all","pending","confirmed","rejected","cancelled"].map(s => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="h-7 text-xs capitalize" onClick={() => setStatusFilter(s)}>{s}</Button>
              ))}
            </div>
            <ExportBtn data={filtered} filename="transactions" />
          </div>
          {txnLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div> : (
            <div className="space-y-2">
              {filtered.map(txn => {
                const cfg = STATUS_CFG[txn.status] || STATUS_CFG.pending;
                return (
                  <div key={txn.id} className={`border rounded-xl p-3 flex items-center gap-3 ${txn.is_flagged ? "border-red-200 bg-red-50/10" : "border-slate-100"}`}>
                    {txn.is_flagged && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <CreditCard className={`w-4 h-4 flex-shrink-0 ${txn.is_flagged ? "text-red-300" : "text-slate-300"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800">{txn.amount} {txn.currency}</span>
                        <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[txn.payment_type] || txn.payment_type}</Badge>
                        {txn.is_flagged && <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">⚠ Flagged</Badge>}
                        {txn.is_locked && <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]"><Lock className="w-2.5 h-2.5 mr-0.5 inline" />Locked</Badge>}
                      </div>
                      <p className="text-[10px] text-slate-400">Ref: {txn.reference || "—"} | ID: {txn.transaction_id || txn.id} | {txn.created_date ? formatDistanceToNow(new Date(txn.created_date), { addSuffix: true }) : ""}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {txn.status === "pending" && !txn.is_locked && (
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setReviewTxn(txn)}>Review</Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => lockMutation.mutate({ id: txn.id, locked: !txn.is_locked })}>
                        {txn.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-center text-slate-500 py-8">No transactions</p>}
              {transactions.length === FIN_PAGE_SIZE * txnPage && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setTxnPage(p => p + 1)}>
                    <ChevronDown className="w-4 h-4 mr-1" />Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── PENDING ───────────────────────────────── */}
        <TabsContent value="pending">
          <div className="space-y-2">
            {pending.length === 0 ? (
              <Card className="border-slate-200"><CardContent className="pt-8 pb-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                <p className="text-slate-500">No pending payments — all clear</p>
              </CardContent></Card>
            ) : pending.map(txn => (
              <Card key={txn.id} className={`border ${txn.is_flagged ? "border-red-200 bg-red-50/10" : "border-amber-200 bg-amber-50/10"}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800">{txn.amount} {txn.currency}</span>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[txn.payment_type] || txn.payment_type}</Badge>
                        {txn.is_flagged && <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">⚠ Flagged: {txn.flag_reason}</Badge>}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{txn.reason || "No reason"}</p>
                      <p className="text-[10px] text-slate-400">Ref: {txn.reference || "—"} | User: {txn.user_id}</p>
                      {txn.proof_notes && <p className="text-xs text-slate-500 italic mt-0.5">{txn.proof_notes}</p>}
                      {txn.proof_file_url && <a href={txn.proof_file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs flex items-center gap-1 mt-1"><Eye className="w-3 h-3" />View payment proof</a>}
                    </div>
                    <Button className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setReviewTxn(txn)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── SUBSCRIPTIONS ────────────────────────── */}
        <TabsContent value="subscriptions">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-slate-500">{activeSubs.length} active subscriptions</p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddSub(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Create Subscription
            </Button>
          </div>
          <div className="space-y-2">
            {subscriptions.map(sub => (
              <Card key={sub.id} className={`border ${sub.status === "active" ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200"}`}>
                <CardContent className="pt-3 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800">{sub.plan}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{sub.subscription_type}</Badge>
                      <Badge className={`text-[10px] ${sub.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : sub.status === "cancelled" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{sub.status}</Badge>
                      <span className="text-xs text-slate-600 font-semibold">{sub.price} {sub.currency}/{sub.billing_period}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">User: {sub.user_id}</p>
                    {sub.renewal_date && <p className="text-[10px] text-slate-400">Renews: {sub.renewal_date}</p>}
                  </div>
                  {sub.status === "active" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600"
                      onClick={() => cancelSubMutation.mutate(sub.id)}>
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {subscriptions.length === 0 && <p className="text-center text-slate-500 py-8">No subscriptions</p>}
          </div>
        </TabsContent>

        {/* ── CHART ────────────────────────────────── */}
        <TabsContent value="chart">
          <Card className="border-slate-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />Monthly Income (Confirmed)</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`$${v}`, "Income"]} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {summary && (
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="text-center"><div className="font-bold text-emerald-700">${(summary.total_income || 0).toFixed(2)}</div><div className="text-xs text-slate-500">Total Confirmed</div></div>
                  <div className="text-center"><div className="font-bold text-slate-800">{summary.confirmed_count || 0}</div><div className="text-xs text-slate-500">Total Transactions</div></div>
                  <div className="text-center"><div className="font-bold text-purple-700">{summary.active_subscriptions || 0}</div><div className="text-xs text-slate-500">Active Subs</div></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FINANCE LOG ──────────────────────────── */}
        <TabsContent value="log">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Finance Audit Log</CardTitle>
              <ExportBtn data={finLogs} filename="finance_log" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {finLogs.map(log => (
                  <div key={log.id} className="border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <Activity className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">{log.event_type?.replace(/_/g, " ")}</Badge>
                        {log.amount && <span className="text-xs font-semibold text-slate-700">${log.amount}</span>}
                        <span className="text-[10px] text-slate-400">{log.created_date ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true }) : ""}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{log.detail}</p>
                    </div>
                  </div>
                ))}
                {finLogs.length === 0 && <p className="text-center text-slate-500 py-8">No finance log entries yet</p>}
                {finLogs.length === FIN_PAGE_SIZE * logPage && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => setLogPage(p => p + 1)}>
                      <ChevronDown className="w-4 h-4 mr-1" />Load more
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
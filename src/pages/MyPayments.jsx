import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CreditCard, Calendar, Upload, RefreshCw, Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const PAYMENT_LABELS = {
  identity_verification: "Blue ✓ Checkmark Verification",
  community_subscription: "Community Creator Subscription",
  petition_withdrawal: "Petition Data & Signatures Export",
  petition_export: "Petition PDF Report",
  owner_gift: "Voluntary Support Gift",
  gold_checkmark: "Gold ★ Public Figure Badge",
  platform_donation: "Platform Support Donation",
  creator_subscription: "Creator Referral Program Subscription",
  org_verification: "Organisation / Business Verification",
  verification_fee: "Identity Verification Fee",
};

const STATUS_CFG = {
  pending:   { color: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pending Review" },
  confirmed: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Confirmed" },
  rejected:  { color: "bg-red-50 text-red-700 border-red-200",         label: "Rejected" },
  cancelled: { color: "bg-slate-50 text-slate-600 border-slate-200",   label: "Cancelled" },
};

const TYPE_LABELS = {
  verification_fee: "Verification Fee", subscription_fee: "Subscription",
  support_payment: "Platform Support", petition_export_fee: "Petition Export",
  community_fee: "Community Fee", manual_payment: "Manual Payment", admin_adjustment: "Admin Adjustment",
};

function SubmitPaymentModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ payment_type: "support_payment", amount: "", currency: "AUD", reason: "", reference: "", proof_notes: "" });
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `payment-proofs/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);
      setProofUrl(data.publicUrl);
      toast.success("Proof uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Submit Payment</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* No-refund notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <span><strong>No Refund Policy:</strong> All payments are non-refundable. Please ensure you have read the payment policy before submitting.</span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Payment Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.payment_type} onChange={e => set("payment_type", e.target.value)}>
                {Object.entries(TYPE_LABELS).filter(([k]) => k !== "admin_adjustment").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="text-xs font-semibold text-slate-600 block mb-1">Amount *</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} /></div>
          </div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">Payment Reference *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Bank transfer reference number" value={form.reference} onChange={e => set("reference", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">Reason</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Why are you making this payment?" value={form.reason} onChange={e => set("reason", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-slate-600 block mb-1">Notes</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-14" placeholder="Additional notes..." value={form.proof_notes} onChange={e => set("proof_notes", e.target.value)} /></div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Payment Proof (optional)</label>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              <Upload className="w-4 h-4" />{uploading ? "Uploading…" : proofUrl ? "Proof uploaded ✓" : "Upload screenshot"}
              <input type="file" className="hidden" accept="image/*" onChange={uploadProof} disabled={uploading} />
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSubmit({ ...form, amount: Number(form.amount), proof_file_url: proofUrl })}
            disabled={!form.amount || !form.reference} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            Submit Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyPayments() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user || null)).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: payments }, { data: subs }] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_date", { ascending: false }),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setTransactions(payments || []);
      setSubscriptions(subs || []);
    } catch { toast.error("Failed to load payment history"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const submitPayment = async (form) => {
    try {
      const { error } = await supabase.from("transactions").insert(cleanForDB({
        user_id: user.id,
        payment_type: form.payment_type,
        amount: form.amount,
        currency: form.currency || "AUD",
        reference: form.reference,
        reason: form.reason,
        proof_file_url: form.proof_file_url,
        metadata: { notes: form.proof_notes || "" },
        status: "pending",
      }));
      if (error) throw error;
      toast.success("Payment submitted — pending admin review");
      setShowSubmit(false);
      fetchData();
    } catch (e) { toast.error(e.message || "Failed to submit"); }
  };

  const confirmed = transactions.filter(t => t.status === "confirmed");
  const totalPaid = confirmed.reduce((s, t) => s + (t.amount || 0), 0);
  const activeSubs = subscriptions.filter(s => s.status === "active");

  if (!user) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <DollarSign className="w-16 h-16 text-slate-200 mx-auto mb-4" />
      <p className="text-slate-500">Sign in to view your payments</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {showSubmit && <SubmitPaymentModal onClose={() => setShowSubmit(false)} onSubmit={submitPayment} />}

      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Payments</h1>
          <p className="text-slate-500 mt-1 text-sm">Your payment history and subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowSubmit(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Submit Payment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="border-emerald-200 bg-emerald-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl font-bold text-emerald-700">${totalPaid.toFixed(2)}</div>
            <div className="text-xs text-slate-500">Total Confirmed</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl font-bold text-amber-700">{transactions.filter(t => t.status === "pending").length}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl font-bold text-purple-700">{activeSubs.length}</div>
            <div className="text-xs text-slate-500">Active Subs</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions */}
      {activeSubs.length > 0 && (
        <Card className="border-slate-200 mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Active Subscriptions</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {activeSubs.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl">
                <div>
                  <span className="font-semibold text-sm text-slate-800">{sub.plan}</span>
                  <p className="text-xs text-slate-500">{sub.price} {sub.currency}/{sub.billing_period}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Active</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" />Transaction History</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No payment history yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(txn => {
                const cfg = STATUS_CFG[txn.status] || STATUS_CFG.pending;
                return (
                  <div key={txn.id} className="border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800">{txn.amount} {txn.currency}</span>
                        <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{PAYMENT_LABELS[txn.payment_type] || TYPE_LABELS[txn.payment_type] || txn.payment_type || "Payment"}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-400">Ref: {txn.reference || "—"} · {txn.created_date ? formatDistanceToNow(new Date(txn.created_date), { addSuffix: true }) : ""}</p>
                      {txn.admin_notes && <p className="text-xs text-slate-500 italic mt-0.5">Admin: {txn.admin_notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
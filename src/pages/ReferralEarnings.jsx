import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, Lock,
  RefreshCw, AlertCircle, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import PriceDisplay from "@/components/payments/PriceDisplay";

const STATUS_COLORS = {
  pending:   "bg-amber-100 text-amber-800 border-amber-200",
  paid_out:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function ReferralEarnings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) throw new Error("no user");
        setUser(user);
        setLoading(false);
      })
      .catch(() => navigate(createPageUrl("Home")));
  }, []);

  const { data: myCode } = useQuery({
    queryKey: ["myReferralCode", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_codes").select("*").eq("owner_user_id", user.id).maybeSingle();
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return null;
      return data || null;
    },
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ["referralTransactions", user?.id],
    queryFn: async () => {
      const { data: code } = await supabase.from("referral_codes").select("id").eq("owner_user_id", user.id).maybeSingle();
      if (!code?.id) return [];
      const { data, error } = await supabase
        .from("referral_transactions")
        .select("*")
        .eq("referral_code_id", code.id)
        .order("created_at", { ascending: false });
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const handleRequestPayout = async () => {
    toast.info("Payout requests are being migrated. Contact support to request payout.");
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  const totalEarned = transactions.reduce((s, t) => s + (t.commission_amount_cents || 0) / 100, 0);
  const pendingEarned = transactions.filter(t => t.status === "pending").reduce((s, t) => s + (t.commission_amount_cents || 0) / 100, 0);
  const paidOut = transactions.filter(t => t.status === "paid_out").reduce((s, t) => s + (t.commission_amount_cents || 0) / 100, 0);
  const totalUses = transactions.length;

  if (!myCode) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Referral Code Yet</h2>
        <p className="text-slate-600 mb-6">You need an active referral code to view earnings. Subscribe to the Creator Program to get started.</p>
        <Button onClick={() => navigate(createPageUrl("CreatorSubscription"))} className="bg-purple-600 hover:bg-purple-700">
          View Creator Program
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Referral Earnings</h1>
        <p className="text-slate-600">Track commissions from your referral code <span className="font-mono font-bold text-slate-800">{myCode.code}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-5 pb-4 text-center">
            <DollarSign className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-purple-900">${totalEarned.toFixed(2)}</div>
            <div className="text-xs text-purple-700">Total Earned (AUD)</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5 pb-4 text-center">
            <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-amber-900">${pendingEarned.toFixed(2)}</div>
            <div className="text-xs text-amber-700">Pending Payout</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-5 pb-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-900">${paidOut.toFixed(2)}</div>
            <div className="text-xs text-emerald-700">Paid Out</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-5 pb-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-900">{totalUses}</div>
            <div className="text-xs text-blue-700">Total Referrals</div>
          </CardContent>
        </Card>
      </div>

      {/* Payout threshold notice */}
      {pendingEarned > 0 && pendingEarned < 50 && (
        <Alert className="border-amber-200 bg-amber-50 mb-6">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm">
            You have <strong>${pendingEarned.toFixed(2)} AUD</strong> pending. Payouts are processed monthly once you reach the <strong>$50 AUD minimum threshold</strong>.
            ${(50 - pendingEarned).toFixed(2)} more needed.
          </AlertDescription>
        </Alert>
      )}

      {pendingEarned >= 50 && (
        <Alert className="border-emerald-200 bg-emerald-50 mb-6">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-900 text-sm flex items-center justify-between gap-4">
            <span>🎉 You've reached the <strong>$50 AUD payout threshold!</strong> Ready to request payout?</span>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap" onClick={handleRequestPayout}>
              Request Payout
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stripe Connect */}
      {!myCode.stripe_connect_id && (
        <Alert className="border-blue-200 bg-blue-50 mb-6">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>Connect your bank account</strong> to receive commission payouts. Contact <a href="mailto:voicetoaction@outlook.com" className="underline">voicetoaction@outlook.com</a> to set up your Stripe payout account.
          </AlertDescription>
        </Alert>
      )}

      {/* Transaction history */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10">
              <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No referral transactions yet. Share your code to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900 text-sm capitalize">{tx.payment_type?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-500">
                      {tx.buyer_email} · {tx.created_date ? format(new Date(tx.created_date), "dd MMM yyyy") : "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Sale: ${(tx.final_amount_cents / 100).toFixed(2)} AUD · Discount: ${(tx.discount_amount_cents / 100).toFixed(2)} AUD
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-bold text-emerald-700 text-sm">
                      +${(tx.commission_amount_cents / 100).toFixed(2)} AUD
                    </span>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[tx.status] || ""}`}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
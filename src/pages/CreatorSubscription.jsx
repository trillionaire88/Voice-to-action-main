import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Copy, DollarSign, Users, Percent, CheckCircle2,
  ArrowRight, CreditCard, AlertCircle, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";
import { appHostname } from "@/constants/siteUrl";

export default function CreatorSubscription() {
  const [user,           setUser]           = useState(null);
  const [checkingOut,    setCheckingOut]    = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user || null)).catch(() => {});
  }, []);

  const { data: referralCode, refetch: refetchCode } = useQuery({
    queryKey: ["myReferralCode", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("owner_user_id", user.id)
        .eq("active", true)
        .order("created_date", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  // On return from Stripe — auto-generate referral code if none exists
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("creator_subscribed") === "1" && user && referralCode === null) {
      generateReferralCode();
    }
  }, [user, referralCode]);

  const generateReferralCode = async () => {
    setGeneratingCode(true);
    try {
      const base = (user.full_name || user.email || "CREATOR")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 5);
      const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
      const code   = `${base}${suffix}`;

      await supabase.from("referral_codes").insert(cleanForDB({
        owner_user_id:           user.id,
        code,
        discount_percent:        5,
        commission_percent:      10,
        active:                  true,
        subscription_status:     "active",
        uses_count:              0,
        total_commission_earned: 0,
        pending_commission:      0,
      }));

      await refetchCode();
      toast.success("🎉 Your referral code has been generated!");
    } catch {
      toast.error("Failed to generate code. Please contact support.");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.error("Sign in to subscribe."); return; }
    if (window.self !== window.top) {
      toast.error("Checkout only works from the published app, not the preview."); return;
    }
    setCheckingOut(true);
    try {
      await initiateStripeCheckout({
        payment_type: "creator_subscription",
        success_url: `${window.location.origin}/CreatorSubscription?subscribed=1`,
        cancel_url: `${window.location.origin}/CreatorSubscription?payment_cancelled=1`,
        metadata: { user_id: user.id },
      });
    } catch (err) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const copyText = (text, label) =>
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));

  if (generatingCode) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Generating Your Referral Code…</h2>
        <p className="text-slate-500">This will only take a moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20">

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full mb-4 text-sm font-semibold">
          <Sparkles className="w-4 h-4" />
          Creator Referral Program
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Earn with Voice to Action</h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Subscribe to receive your personal referral code. Every time someone uses it, they save —
          and you earn a commission.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <Card className="border-purple-200 bg-purple-50 text-center">
          <CardContent className="pt-6 pb-5">
            <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-900">10%</div>
            <div className="text-sm text-purple-700">Commission on every purchase made with your code</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 text-center">
          <CardContent className="pt-6 pb-5">
            <Percent className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-900">5% Off</div>
            <div className="text-sm text-blue-700">Sitewide discount for anyone who uses your code</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 text-center">
          <CardContent className="pt-6 pb-5">
            <Users className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-emerald-900">Unlimited</div>
            <div className="text-sm text-emerald-700">No cap on referrals or total commission earned</div>
          </CardContent>
        </Card>
      </div>

      {/* ── ACTIVE CODE DASHBOARD ─────────────────────────────── */}
      {referralCode && (
        <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
              Your Referral Code is Active
              <Badge className="ml-auto bg-emerald-600 text-white text-xs">
                {referralCode.subscription_status || "active"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Code display */}
            <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-emerald-200">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Your Referral Code</p>
                <p className="text-3xl font-bold font-mono tracking-widest text-emerald-800">
                  {referralCode.code}
                </p>
              </div>
              <Button
                variant="outline"
                className="border-emerald-300 text-emerald-700"
                onClick={() => copyText(referralCode.code, "Code")}
              >
                <Copy className="w-4 h-4 mr-1.5" /> Copy
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-white rounded-xl p-3 border border-emerald-100">
                <div className="text-xl font-bold text-slate-800">{referralCode.uses_count || 0}</div>
                <div className="text-xs text-slate-500">Times Used</div>
              </div>
              <div className="text-center bg-white rounded-xl p-3 border border-emerald-100">
                <div className="text-xl font-bold text-blue-700">{referralCode.discount_percent}%</div>
                <div className="text-xs text-slate-500">Their Discount</div>
              </div>
              <div className="text-center bg-white rounded-xl p-3 border border-emerald-100">
                <div className="text-xl font-bold text-emerald-700">
                  ${(referralCode.total_commission_earned || 0).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">Earned (AUD)</div>
              </div>
            </div>

            {/* Share text */}
            <div className="bg-white rounded-xl p-4 border border-emerald-100 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Share your code with your audience:</p>
              <p className="text-sm text-slate-600 italic bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                Use code <strong>{referralCode.code}</strong> at {appHostname()} to get 5% off any purchase!
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700"
                onClick={() =>
                  copyText(
                    `Use code ${referralCode.code} at ${appHostname()} to get 5% off any purchase!`,
                    "Share text"
                  )
                }
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Share Text
              </Button>
            </div>

            {referralCode.pending_commission > 0 && (
              <Alert className="border-purple-200 bg-purple-50">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-900 text-sm">
                  <strong>${referralCode.pending_commission.toFixed(2)} AUD</strong> in pending commission will
                  be paid out once the $50 AUD minimum threshold is reached.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SUBSCRIPTION CARD (no code yet) ──────────────────── */}
      {!referralCode && (
        <Card className="border-slate-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Creator Referral Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">$20</span>
              <span className="text-slate-600">AUD / month</span>
            </div>

            <Separator />

            <ul className="space-y-2.5 text-sm">
              {[
                "Your personal unique referral code — instantly generated",
                "10% commission on every referred purchase",
                "5% sitewide discount for your followers",
                "Real-time usage and commission tracking dashboard",
                "Monthly commission payouts (min. $50 AUD threshold)",
                "Cancel anytime — no lock-in contract",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                Commission payouts require a minimum $50 AUD balance and are processed monthly.
                Commissions are calculated on confirmed payments made using your code.
              </AlertDescription>
            </Alert>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
              ⚠️ All payments are non-refundable unless the service is not provided.
            </p>

            <Button
              onClick={handleSubscribe}
              disabled={checkingOut || !user}
              className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-base font-semibold"
            >
              {checkingOut ? (
                "Redirecting to Stripe…"
              ) : (
                <>
                  Subscribe for $20 AUD/month
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {!user && (
              <Button variant="outline" onClick={() => window.location.assign(createPageUrl("Home"))} className="w-full">
                Sign In to Subscribe
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">How the Referral Program Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {[
            ["Subscribe", "Subscribe for $20 AUD/month and your unique referral code is instantly generated and activated."],
            ["Share",     "Share your code with your audience. When they enter it at checkout, they automatically receive 5% off their purchase."],
            ["Earn",      "You earn 10% commission on every successful payment made using your code. Commission is tracked in real-time."],
            ["Get Paid",  "Once your commission balance reaches $50 AUD, it is paid out to you monthly via bank transfer."],
          ].map(([step, desc], i) => (
            <div key={step} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <p><strong className="text-slate-800">{step}:</strong> {desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
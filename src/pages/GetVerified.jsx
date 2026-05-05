import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Shield, CreditCard, Clock, FileText, X, CheckCheck, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { initiateStripeCheckout, initiateStripeIdentityVerification } from "@/lib/stripeCheckout";
import ActionButton from "@/components/ui/ActionButton";

const statusConfig = {
  pending:         { icon: Clock,       color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   text: "Payment received — pending identity verification" },
  under_review:    { icon: FileText,    color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    text: "Under Review (1–3 business days)" },
  approved:        { icon: CheckCheck,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", text: "Approved" },
  rejected:        { icon: X,           color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     text: "Not Approved" },
  needs_more_info: { icon: AlertCircle, color: "text-orange-600",  bg: "bg-orange-50",  border: "border-orange-200",  text: "More Info Needed" },
};

function userHasBlueCheckmark(profile) {
  return !!(profile?.is_blue_verified || profile?.paid_identity_verification_completed || profile?.is_kyc_verified);
}

export default function GetVerified() {
  const navigate = useNavigate();
  const [profile, setProfile]                 = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [step, setStep]                       = useState("info");
  const [checkingOut, setCheckingOut]         = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate(createPageUrl("Home")); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);

      const { data: reqData } = await supabase.from("verification_requests").select("*").eq("user_id", user.id).order("created_date", { ascending: false }).limit(1).maybeSingle();
      setExistingRequest(reqData);

      const params = new URLSearchParams(window.location.search);

      const sid = params.get("stripe_identity_session");
      if (sid) {
        setStep("processing");
        window.history.replaceState({}, "", window.location.pathname);
        try {
          const result = await initiateStripeIdentityVerification({
            action: "check_status",
            session_id: sid,
          });
          if (result.verified) {
            toast.success("Your Blue Checkmark is now active!");
            const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            setProfile(updatedProfile);
            setStep("done");
          } else {
            toast.error("Identity verification was not completed. Please try again.");
            setStep("info");
          }
        } catch (err) {
          toast.error(err.message || "Failed to check verification status.");
          setStep("info");
        }
        return;
      }

      const paid = params.get("blue_paid");
      if (paid === "1") {
        window.history.replaceState({}, "", window.location.pathname);
        const { data: refreshedReq } = await supabase.from("verification_requests").select("*").eq("user_id", user.id).order("created_date", { ascending: false }).limit(1).maybeSingle();
        setExistingRequest(refreshedReq);
        setStep("identity");
      }
    } catch (err) {
      console.error("[GetVerified] Init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setCheckingOut(true);
    try {
      await initiateStripeCheckout({
        payment_type: "identity_verification",
        success_url: `${window.location.origin}/GetVerified?blue_paid=1`,
        cancel_url: `${window.location.origin}/GetVerified?payment_cancelled=1`,
        metadata: { user_id: user.id, user_email: user.email || "" },
      });
    } catch (err) {
      toast.error(err.message || "Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleLaunchIdentity = async () => {
    setCheckingOut(true);
    try {
      const result = await initiateStripeIdentityVerification({
        action: "create_session",
        return_url: `${window.location.origin}/GetVerified?stripe_identity_session={SESSION_ID}`,
      });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      toast.error(err.message || "Failed to start identity verification.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  if (userHasBlueCheckmark(profile)) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-12 h-12 text-blue-600" /></div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">You're Verified!</h1>
      <p className="text-slate-600 mb-8">Your Blue Checkmark is active on your profile.</p>
      <Button onClick={() => navigate(createPageUrl("Profile"))} className="bg-blue-600 hover:bg-blue-700">View My Profile</Button>
    </div>
  );

  if (step === "done") return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-12 h-12 text-emerald-600" /></div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Verification Complete!</h1>
      <p className="text-slate-600 mb-8">Your Blue Checkmark is now active across the platform.</p>
      <Button onClick={() => navigate(createPageUrl("Profile"))} className="bg-blue-600 hover:bg-blue-700">View My Profile</Button>
    </div>
  );

  if (step === "processing") return (
    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      <p className="text-slate-600 font-medium">Checking your verification status…</p>
    </div>
  );

  if (step === "identity" || (existingRequest?.payment_status === "completed" && existingRequest?.status === "pending")) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6"><Shield className="w-10 h-10 text-blue-600" /></div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3">Payment Confirmed</h1>
      <p className="text-slate-600 mb-2">Your $12.99 AUD payment was received. Now complete your identity verification — it only takes a few minutes.</p>
      <p className="text-sm text-slate-500 mb-8">You'll need a valid government-issued ID and camera access for a selfie.</p>
      <ActionButton onClick={handleLaunchIdentity} loading={checkingOut} loadingText="Launching..." className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-base font-semibold w-full sm:w-auto" icon={Shield}>
        Start Identity Verification →
      </ActionButton>
    </div>
  );

  if (existingRequest && existingRequest.payment_status === "completed" && existingRequest.status !== "pending") {
    const cfg = statusConfig[existingRequest.status] || statusConfig.pending;
    const StatusIcon = cfg.icon;
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <Card className={`border ${cfg.border}`}>
          <CardContent className="pt-8 pb-8 text-center">
            <div className={`w-20 h-20 ${cfg.bg} rounded-full flex items-center justify-center mx-auto mb-5`}><StatusIcon className={`w-10 h-10 ${cfg.color}`} /></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification {existingRequest.status === "approved" ? "Approved" : cfg.text}</h2>
            {existingRequest.status === "rejected" && <p className="text-slate-500 text-sm mt-2">Your verification was not approved. Please contact support if you believe this is an error.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-10 h-10 text-white" /></div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Get Your Blue Checkmark</h1>
        <p className="text-slate-600">Verify your identity once and unlock full platform access — permanently.</p>
      </div>

      <Card className="border-slate-200 mb-6">
        <CardContent className="pt-6 pb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-blue-600" /> What your Blue Checkmark unlocks</h3>
          <ul className="space-y-2">
            {[
              "Sign petitions that require verified identity",
              "Vote in polls restricted to verified members",
              "Blue checkmark badge on your profile and all your posts",
              "Higher trust weight on your votes and signatures",
              "Access to verified-only communities and discussions",
              "Rate and hold public figures and corporations accountable",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-slate-200 mb-6">
        <CardContent className="pt-6 pb-6">
          <h3 className="font-semibold text-slate-800 mb-4">How it works</h3>
          <div className="space-y-4">
            {[
              { n: "1", title: "Pay $12.99 AUD — one time, forever", desc: "You will never be charged again." },
              { n: "2", title: "Complete Stripe Identity KYC", desc: "Upload your government ID and take a quick selfie. Stripe processes it in minutes." },
              { n: "3", title: "Get your Blue Checkmark instantly", desc: "Your profile is automatically updated. The badge appears across the platform." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-3 items-start">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">{n}</div>
                <div><p className="font-semibold text-slate-800 text-sm">{title}</p><p className="text-xs text-slate-500">{desc}</p></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <CreditCard className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm"><strong>One-time payment only.</strong> No subscriptions, no recurring charges. Your verification is permanent.</AlertDescription>
      </Alert>

      <Alert className="border-amber-200 bg-amber-50 mb-6">
        <AlertDescription className="text-amber-900 text-sm">All payments are non-refundable unless the service is not provided.</AlertDescription>
      </Alert>

      <ActionButton onClick={handlePay} loading={checkingOut} loadingText="Redirecting to Stripe..." className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200" icon={CreditCard}>
        Pay $12.99 AUD & Get Verified
      </ActionButton>
      <p className="text-center text-xs text-slate-400 mt-3">Secured by Stripe · One-time payment · No subscription</p>

      <div className="mt-6 text-center">
        <button className="text-sm text-slate-500 hover:text-slate-700 underline" onClick={() => navigate(createPageUrl("Profile"))}>Maybe later</button>
      </div>
    </div>
  );
}
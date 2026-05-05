import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { startCreatorReferralCheckout } from "@/api/paymentsApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Copy, Gift, RefreshCw, Power, Lock, CheckCircle2, Pencil, Save, X, CreditCard } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_ROLES = ["owner_admin", "admin", "verified", "political_figure", "news_outlet", "community_owner"];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VTA-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreatorReferral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [myCode, setMyCode] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [programSubscribed, setProgramSubscribed] = useState(false);
  const [referralSetupPending, setReferralSetupPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setReferralSetupPending(false);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setMyCode(null);
        setCommissions([]);
        setProgramSubscribed(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (profileError) console.error(profileError);

      setUser({
        id: authUser.id,
        email: authUser.email,
        ...(profile || {}),
        role: profile?.role,
        full_name: profile?.full_name ?? profile?.display_name,
      });

      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("id,status,subscription_type")
        .eq("user_id", authUser.id)
        .in("subscription_type", ["creator_referral", "creator_subscription"])
        .eq("status", "active")
        .maybeSingle();

      if (subRow) {
        try {
          sessionStorage.removeItem("vta_creator_referral_checkout");
        } catch {
          /* ignore */
        }
      }

      const subscribedFromUrl = searchParams.get("subscribed") === "1";
      let pendingCheckout = false;
      try {
        pendingCheckout = sessionStorage.getItem("vta_creator_referral_checkout") === "1";
      } catch {
        pendingCheckout = false;
      }
      setProgramSubscribed(!!subRow || subscribedFromUrl || pendingCheckout);

      const { data: codeRow, error: codeErr } = await supabase.from("referral_codes").select("*").eq("owner_user_id", authUser.id).maybeSingle();

      if (codeErr && (codeErr.code === "42P01" || codeErr.message?.includes("does not exist"))) {
        setReferralSetupPending(true);
        setMyCode(null);
        setCommissions([]);
        return;
      }
      if (codeErr) {
        console.error(codeErr);
        setMyCode(null);
        setCommissions([]);
        return;
      }

      setMyCode(codeRow || null);

      const codeIds = codeRow?.id ? [codeRow.id] : [];
      if (!codeIds.length) {
        setCommissions([]);
        return;
      }

      const { data: txRows, error: txErr } = await supabase
        .from("referral_transactions")
        .select("*")
        .in("referral_code_id", codeIds)
        .order("created_date", { ascending: false });

      if (txErr && (txErr.code === "42P01" || txErr.message?.includes("does not exist"))) {
        setCommissions([]);
        return;
      }
      if (txErr) {
        console.error(txErr);
        setCommissions([]);
        return;
      }
      setCommissions(txRows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get("subscribed") !== "1") return;
    try {
      sessionStorage.setItem("vta_creator_referral_checkout", "1");
    } catch {
      /* ignore */
    }
    toast.success("Thank you! Your payment was received. Program access will activate shortly.");
    const next = new URLSearchParams(searchParams);
    next.delete("subscribed");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      await startCreatorReferralCheckout();
    } catch (e) {
      toast.error(e.message || "Could not start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleGenerate = async () => {
    setCreating(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Sign in required");

      const code = generateCode();
      const { data: created, error } = await supabase
        .from("referral_codes")
        .insert(cleanForDB({
          code,
          owner_user_id: authUser.id,
          discount_percent: 5,
          commission_percent: 10,
          active: true,
          uses_count: 0,
        }))
        .select()
        .single();

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          setReferralSetupPending(true);
          toast.error("Referral program is being configured. Your subscription will be activated shortly.");
          return;
        }
        throw new Error(error.message);
      }
      setMyCode(created);
      toast.success("Referral code generated!");
    } catch (e) {
      toast.error(e.message || "Failed to generate code");
    } finally {
      setCreating(false);
    }
  };

  const handleCustomize = () => {
    setCustomCode(myCode.code);
    setEditing(true);
  };

  const handleSaveCustomCode = async () => {
    const cleaned = customCode.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
    if (cleaned.length < 4) {
      toast.error("Code must be at least 4 characters");
      return;
    }
    setSaving(true);
    try {
      const { data: existing, error: exErr } = await supabase.from("referral_codes").select("id").eq("code", cleaned).maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (existing && existing.id !== myCode.id) {
        toast.error("That code is already taken. Try another.");
        return;
      }
      const { error } = await supabase.from("referral_codes").update(cleanForDB({ code: cleaned })).eq("id", myCode.id);
      if (error) throw new Error(error.message);
      setMyCode((prev) => ({ ...prev, code: cleaned }));
      setEditing(false);
      toast.success("Referral code updated!");
    } catch (e) {
      toast.error(e.message || "Failed to update code");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const { error } = await supabase.from("referral_codes").update(cleanForDB({ active: !myCode.active })).eq("id", myCode.id);
    if (error) {
      toast.error(error.message || "Could not update code");
      return;
    }
    setMyCode((prev) => ({ ...prev, active: !prev.active }));
    toast.success(myCode.active ? "Code disabled" : "Code re-enabled");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(myCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard!");
  };

  const handleCancelSubscriptionInfo = () => {
    toast.info("To cancel recurring billing for the Creator Referral program, email voicetoaction@outlook.com with your account email.");
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500">Loading...</div>;
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600">Creator referral codes are only available to verified users and approved creators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Creator Referral Program</h1>
        <p className="text-slate-600">
          Subscribe for $20 AUD/month to receive a referral code. Your audience saves 5% on paid platform services; you earn 10% commission on qualifying referral payments.
        </p>
      </div>

      {referralSetupPending && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-900 text-sm">
            Referral program is being configured. Your subscription will be activated shortly.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Program subscription
          </CardTitle>
          <CardDescription>$20 AUD per month — billed via secure checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {programSubscribed ? (
            <>
              <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                You have an active Creator Referral subscription (or a recent successful checkout). Generate or manage your code below.
              </p>
              <Button variant="outline" size="sm" onClick={handleCancelSubscriptionInfo}>
                Cancel subscription
              </Button>
            </>
          ) : (
            <Button onClick={handleSubscribe} disabled={checkoutLoading || referralSetupPending} className="bg-blue-600 hover:bg-blue-700">
              <CreditCard className={`w-4 h-4 mr-2 ${checkoutLoading ? "opacity-50" : ""}`} />
              {checkoutLoading ? "Redirecting…" : "Subscribe — $20 AUD/month"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            When someone uses your code at checkout, they receive 5% off verification, boost, donation, and subscription payments. You earn 10% commission on qualifying referral payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!myCode ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-6">You don&apos;t have a referral code yet. Generate one to start sharing.</p>
              <Button onClick={handleGenerate} disabled={creating || referralSetupPending} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className={`w-4 h-4 mr-2 ${creating ? "animate-spin" : ""}`} />
                {creating ? "Generating..." : "Generate Referral Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {editing ? (
                <div className="space-y-2">
                  <Input
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20))}
                    className="font-mono text-xl font-bold tracking-widest text-center h-14 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                    placeholder="YOUR-CODE"
                    maxLength={20}
                  />
                  <p className="text-xs text-slate-400 text-center">Letters, numbers, and hyphens only. 4–20 characters.</p>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveCustomCode} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save Code"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-1 px-4 py-3 rounded-xl text-center font-mono text-2xl font-bold tracking-widest border-2 ${
                      myCode.active ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-100 text-slate-400 line-through"
                    }`}
                  >
                    {myCode.code}
                  </div>
                  <Button variant="outline" onClick={handleCopy} className="shrink-0 h-14">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" onClick={handleCustomize} className="shrink-0 h-14" title="Customize code">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      myCode.active
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }
                  >
                    {myCode.active ? "Active" : "Disabled"}
                  </Badge>
                  <span className="text-sm text-slate-500">{myCode.uses_count || 0} uses</span>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200">5% discount</Badge>
                  <Badge className="bg-violet-50 text-violet-800 border border-violet-200">10% commission</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggle}>
                  <Power className="w-3.5 h-3.5 mr-1.5" />
                  {myCode.active ? "Disable" : "Enable"}
                </Button>
              </div>

              <Alert className="border-blue-100 bg-blue-50">
                <Gift className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>5% discount</strong> applies to verification, boost, donation, and subscription payments on Voice to Action when your code is used at checkout. Commission is credited per program terms.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {!!commissions.length && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Commission history</CardTitle>
            <CardDescription>Successful referral payments tied to your code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {commissions.map((row) => (
              <div key={row.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">
                  {row.created_date ? new Date(row.created_date).toLocaleDateString() : "—"}
                </span>
                <span className="font-medium text-slate-900">
                  Payment ${Number(row.amount || 0).toFixed(2)} · Commission ${Number(row.commission_amount || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {[
            "Subscribe to the program and generate your unique referral code.",
            "Share your code with your audience.",
            "When someone enters your code at checkout, they save 5% on their eligible payment.",
            "You receive 10% commission on qualifying referral payments, per program terms.",
            "You can disable or re-enable your code at any time.",
          ].map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p>{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

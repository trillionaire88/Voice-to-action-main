import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Building2, Users, Landmark, Shield, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";
import { cleanForDB } from "@/lib/dbHelpers";
import FormErrorHandler from "@/components/ui/FormErrorHandler";
import { communityPlanTier } from "@/lib/communityFields";

const TYPE_CONFIG = {
  business:     { label: "Business",     icon: Building2, color: "text-yellow-600", desc: "Companies, retailers, service providers" },
  organisation: { label: "Organisation", icon: Users,     color: "text-blue-700",   desc: "NGOs, charities, non-profits, clubs" },
  government:   { label: "Government",   icon: Landmark,  color: "text-red-600",    desc: "Government departments, agencies" },
  council:      { label: "Council",      icon: Landmark,  color: "text-orange-600", desc: "Local councils, regional authorities" },
};

export default function RequestVerification() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=type, 2=details, 3=payment

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) throw new Error("not-auth");
      const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", u.id).maybeSingle();
      const merged = { ...u, ...(profile || {}) };
      setUser(merged);
      setContactName(merged.full_name || "");
      setContactEmail(merged.email || "");
    }).catch(() => window.location.assign(`${window.location.origin}/?signin=1`));

    // Check if returning from payment
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      const requestId = params.get("request_id");
      if (requestId) {
        supabase.from("org_verification_requests").update({ payment_completed: true }).eq("id", requestId).then(() => {}).catch(() => {});
        toast.success("Payment confirmed! Your verification request has been submitted.");
        navigate("/Communities");
      }
    }
  }, []);

  const { data: communities = [] } = useQuery({
    queryKey: ["my-communities"],
    queryFn: async () => {
      const { data = [] } = await supabase.from("communities").select("*").eq("founder_user_id", user?.id);
      return data;
    },
    enabled: !!user,
  });

  const paidCommunities = communities.filter(c => communityPlanTier(c) === "paid" || c.subscription_active);

  const handleSubmit = async () => {
    if (!selectedType || !orgName || !contactName || !contactEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: req, error } = await supabase
        .from("org_verification_requests")
        .insert(
          cleanForDB({
            user_id: user.id,
            community_id: selectedCommunity || undefined,
            type: selectedType,
            org_name: orgName,
            org_website: orgWebsite || undefined,
            contact_name: contactName,
            contact_email: contactEmail,
            description: description || undefined,
            status: "pending",
            payment_completed: false,
          })
        )
        .select("id")
        .single();
      if (error) throw error;
      setStep(3);
      // Trigger payment
      await handlePayment(req.id);
    } catch (e) {
      setSubmitError(e);
      toast.error("Failed to submit request: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (requestId) => {
    if (window.self !== window.top) {
      alert("Payment is only available from the published app.");
      return;
    }
    setPaymentLoading(true);
    try {
      const successUrl = window.location.origin + "/RequestVerification?paid=1&request_id=" + requestId;
      const cancelUrl = window.location.origin + "/RequestVerification?payment_cancelled=1";
      await initiateStripeCheckout({
        payment_type: "org_verification",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { request_id: requestId },
      });
    } catch (e) {
      toast.error("Payment error: " + e.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" /> Request Verification
        </h1>
        <p className="text-slate-600">Get your organisation, business, or government entity verified on Voice to Action.</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <CreditCard className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Verification costs <strong>$19.99 AUD</strong> (one-time fee). Requires a paid community. Reviewed by platform admins within 1–5 business days.
        </AlertDescription>
      </Alert>

      <FormErrorHandler error={submitError} />

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Select Verification Type</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key} type="button" onClick={() => setSelectedType(key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedType === key ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <Icon className={`w-5 h-5 mb-2 ${cfg.color}`} />
                    <div className="font-semibold text-sm text-slate-900">{cfg.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{cfg.desc}</div>
                  </button>
                );
              })}
            </div>
            {paidCommunities.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Community (optional)</Label>
                <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                  <SelectTrigger><SelectValue placeholder="Select a paid community" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No community</SelectItem>
                    {paidCommunities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {communities.length > 0 && paidCommunities.length === 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">Community verification requires a paid community plan. Your communities are on the free plan.</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end">
              <Button onClick={() => selectedType ? setStep(2) : toast.error("Please select a type")} className="bg-blue-600 hover:bg-blue-700">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Organisation Details</CardTitle>
            <CardDescription>Provide details about your {TYPE_CONFIG[selectedType]?.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Organisation / Business Name *</Label><Input value={orgName} onChange={e => setOrgName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Website URL</Label><Input value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} placeholder="https://example.com" /></div>
            <div className="space-y-2"><Label>Contact Person Name *</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Contact Email *</Label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of your organisation and why you are requesting verification." rows={3} /></div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? "Submitting..." : "Submit & Pay $19.99"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">Request Submitted</h2>
            <p className="text-slate-600">Redirecting to payment...</p>
            {paymentLoading && <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
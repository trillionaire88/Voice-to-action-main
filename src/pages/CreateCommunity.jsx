import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Globe2, Building2, GraduationCap, Landmark, Users,
  Dumbbell, Briefcase, Settings,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle,
  Lock, CreditCard, ShieldAlert, Info, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";
import { supabase } from "@/lib/supabase";
import ReferralCodeInput from "@/components/payments/ReferralCodeInput";
import { sanitiseText } from "@/lib/sanitise";
import HoneypotField from "@/components/HoneypotField";
import { insertContentWatermark } from "@/lib/watermark";
import { reportHoneypotHit } from "@/lib/threatIntelClient";
import { cleanForDB } from "@/lib/dbHelpers";
import FormErrorHandler from "@/components/ui/FormErrorHandler";
import { COMMUNITY_SUBSCRIPTION_PRICE_LABEL } from "@/constants/communitySubscription";

const COMMUNITY_TYPES = [
  { value: "general",       label: "General",        icon: Globe2,       description: "Open community" },
  { value: "business",      label: "Business",       icon: Briefcase,    description: "Business or brand" },
  { value: "company",       label: "Company",        icon: Building2,    description: "Corporate team" },
  { value: "council",       label: "Council",        icon: Landmark,     description: "Local council" },
  { value: "government",    label: "Government",     icon: Landmark,     description: "Government body" },
  { value: "gym",           label: "Gym / Sport",    icon: Dumbbell,     description: "Fitness or sport" },
  { value: "school",        label: "School",         icon: GraduationCap,description: "School or university" },
  { value: "organisation",  label: "Organisation",   icon: Users,        description: "NGO or non-profit" },
  { value: "service",       label: "Service",        icon: Settings,     description: "Service provider" },
  { value: "private",       label: "Private Group",  icon: Lock,         description: "Invite-only group" },
];

const PLANS = [
  {
    value: "free",
    title: "Free",
    price: "Free",
    color: "emerald",
    description: "Great for getting started",
    features: [
      "Public community page",
      "Unlimited discussions & posts",
      "Polls and petitions",
      "Single admin",
      "Standard search visibility",
    ],
  },
  {
    value: "paid",
    title: "Paid",
    price: COMMUNITY_SUBSCRIPTION_PRICE_LABEL,
    color: "blue",
    description: "Best for active communities",
    features: [
      "Verified badge",
      "Analytics dashboard",
      "Multiple admins",
      "Priority in search",
    ],
    badge: "Popular",
  },
  {
    value: "private",
    title: "Private",
    price: COMMUNITY_SUBSCRIPTION_PRICE_LABEL,
    color: "purple",
    description: "Hidden, invite-only access",
    features: [
      "Hidden from public search",
      "Access by invite code only",
      "All Paid plan features",
      "Internal-only discussions",
    ],
  },
];

const STEPS = ["Plan", "Details", "Settings", "Review"];

export default function CreateCommunity() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);

  // Plan
  const [communityPlan, setCommunityPlan] = useState("");
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  // Payment
  const [fullLegalName, setFullLegalName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [checkMonthlyFee, setCheckMonthlyFee] = useState(false);
  const [checkAccessWarning, setCheckAccessWarning] = useState(false);
  const [checkResponsibility, setCheckResponsibility] = useState(false);
  const [checkTOS, setCheckTOS] = useState(false);
  const [checkAge, setCheckAge] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [appliedReferralCode, setAppliedReferralCode] = useState(null);
  const [savedProfileReferralCode, setSavedProfileReferralCode] = useState(null);

  // Details
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityType, setCommunityType] = useState("");
  const [communityVisibility, setCommunityVisibility] = useState("public");
  const [communityLocation, setCommunityLocation] = useState("");
  const [communityCategory, setCommunityCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [joinPolicy, setJoinPolicy] = useState("open");

  // Errors
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    api.auth.me().then(async (u) => {
      setUser(u);
      setContactEmail(u.email || "");
      setFullLegalName(u.full_name || "");
      if (u?.id) {
        const { data } = await supabase.from("profiles").select("saved_referral_code").eq("id", u.id).maybeSingle();
        if (data?.saved_referral_code) setSavedProfileReferralCode(data.saved_referral_code);
      }
    }).catch(() => {
      toast.error("Please sign in to create a community");
      navigate("/Communities");
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      setSubscriptionActive(true);
      setStep(1);
      const savedPlan = sessionStorage.getItem("community_plan");
      if (savedPlan) setCommunityPlan(savedPlan);
    }
  }, []);

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const validateDetails = () => {
    const e = {};
    if (!communityName.trim())        e.communityName = "Community name is required";
    if (!communityDescription.trim()) e.communityDescription = "Description is required";
    if (!communityType)               e.communityType = "Please select a community type";
    if (!communityVisibility)         e.communityVisibility = "Please select visibility";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePaidForm = () => {
    if (!fullLegalName.trim() || !contactEmail.trim() || !phoneNumber.trim() || !country.trim()) {
      toast.error("Please fill in all personal information fields");
      return false;
    }
    if (!checkMonthlyFee || !checkAccessWarning || !checkResponsibility || !checkTOS || !checkAge) {
      toast.error("You must tick all required checkboxes to proceed");
      return false;
    }
    return true;
  };

  const handlePay = async () => {
    if (!validatePaidForm()) return;
    if (window.self !== window.top) {
      alert("Payment checkout is only available from the published app.");
      return;
    }
    setPaymentLoading(true);
    sessionStorage.setItem("community_plan", communityPlan);
    try {
      const successUrl = window.location.origin + "/CreateCommunity?paid=1";
      const cancelUrl = window.location.origin + "/CreateCommunity?payment_cancelled=1";
      await initiateStripeCheckout({
        payment_type: "community_subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        referral_code: appliedReferralCode || undefined,
        metadata: {
          founder_legal_name: fullLegalName || "",
          founder_phone: phoneNumber || "",
          founder_country: country || "",
        },
      });
    } catch (e) {
      toast.error("Payment error: " + e.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const createMutation = useMutation({
    onMutate: () => setSubmitError(null),
    mutationFn: async () => {
      const isPaid = communityPlan === "paid" || communityPlan === "private" || communityPlan === "premium";
      const slug = slugify(sanitiseText(communityName, 200));
      const tags = tagsInput ? tagsInput.split(',').map(t => sanitiseText(t.trim(), 80)).filter(Boolean) : [];
      const safeName = sanitiseText(communityName, 200);
      const safeDesc = sanitiseText(communityDescription, 10000);
      const safeLoc = sanitiseText(communityLocation, 500);
      const safeCat = sanitiseText(communityCategory, 200);

      const community = await api.entities.Community.create(
        cleanForDB({
          community_type: communityType,
          community_admins: [],
          community_verified: isPaid && subscriptionActive,
          subscription_active: isPaid ? subscriptionActive : false,
          community_category: safeCat || undefined,
          community_location: safeLoc || undefined,
          community_created_date: new Date().toISOString(),
          name: safeName,
          slug,
          description_public: safeDesc,
          visibility: communityPlan === "private" ? "private" : communityVisibility,
          tags,
          verified_community: isPaid && subscriptionActive,
          community_analytics_enabled: isPaid && subscriptionActive,
          founder_user_id: user.id,
          join_policy: communityPlan === "private" ? "invite_only" : joinPolicy,
          governance_model: "founder_led",
          enabled_modules: {
            discussions: true, polls: true, petitions: true,
            announcements: true, documents: true, events: true,
          },
          show_on_world_map: communityVisibility === "public",
          status: "active",
          member_count: 0,
          plan: "free",
          plan_status: "active",
        })
      );

      await api.entities.CommunityMember.create(
        cleanForDB({
          community_id: community.id,
          user_id: user.id,
          role: "founder",
          status: "active",
        })
      );

      // Auto-index for search
      api.functions.invoke("indexContent", {
        content_type: "community",
        content_id: community.id,
      }).catch(() => {});

      return community;
    },
    onSuccess: (community) => {
      toast.success("Community created successfully!");
      sessionStorage.removeItem("community_plan");
      if (user?.id && community?.id) insertContentWatermark("community", community.id, user.id).catch(() => {});
      navigate(`/CommunityDetail?id=${community.id}`);
    },
    onError: (e) => {
      setSubmitError(e);
      toast.error("Failed to create community: " + (e.message || "Unknown error"));
    },
  });

  const handleSubmit = () => {
    if (honeypot) {
      reportHoneypotHit("create_community");
      return;
    }
    const isPaidPlan = communityPlan === "paid" || communityPlan === "private" || communityPlan === "premium";
    if (isPaidPlan && !subscriptionActive) {
      toast.error("Payment is required to create a paid or private community");
      setStep(0);
      return;
    }
    if (!communityName.trim() || !communityDescription.trim() || !communityType || !communityVisibility) {
      toast.error("Please fill in all required fields");
      setStep(1);
      return;
    }
    createMutation.mutate();
  };

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
    </div>
  );

  const isPaidPlan = communityPlan === "paid" || communityPlan === "private" || communityPlan === "premium";
  const needsPayment = isPaidPlan && !subscriptionActive;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create a Community</h1>
        <p className="text-slate-600">Build your space for discussion, polls, and collective action</p>
      </div>

      <FormErrorHandler error={submitError} />

      {/* Step Progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                step > i ? 'bg-blue-600 text-white' : step === i ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs mt-1 text-slate-500 hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded transition-colors ${step > i ? 'bg-blue-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 0: Plan Selection ── */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const colorMap = {
                emerald: { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
                blue:    { border: "border-blue-500",    bg: "bg-blue-50",    text: "text-blue-600",    badge: "bg-blue-100 text-blue-700" },
                purple:  { border: "border-purple-500",  bg: "bg-purple-50",  text: "text-purple-600",  badge: "bg-purple-100 text-purple-700" },
              };
              const c = colorMap[plan.color];
              const selected = communityPlan === plan.value;
              return (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setCommunityPlan(plan.value)}
                  className={`p-5 rounded-xl border-2 text-left transition-all relative ${
                    selected ? `${c.border} ${c.bg}` : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                      {plan.badge}
                    </span>
                  )}
                  <div className="text-xl font-bold text-slate-900 mb-1">{plan.title}</div>
                  <div className={`text-sm font-semibold mb-1 ${c.text}`}>{plan.price}</div>
                  <p className="text-xs text-slate-500 mb-3">{plan.description}</p>
                  <ul className="space-y-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${c.text}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {selected && (
                    <div className={`mt-3 text-xs font-semibold ${c.text} flex items-center gap-1`}>
                      <CheckCircle2 className="w-3 h-3" /> Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!communityPlan && (
            <p className="text-center text-sm text-slate-500">Select a plan to continue</p>
          )}

          {/* Free → continue */}
          {communityPlan === "free" && (
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} className="bg-emerald-600 hover:bg-emerald-700">
                Continue with Free Plan <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Paid / Private and already paid → continue */}
          {isPaidPlan && subscriptionActive && (
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} className="bg-blue-600 hover:bg-blue-700">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Paid / Private payment form */}
          {isPaidPlan && !subscriptionActive && (
            <div className="space-y-5 mt-2">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white flex items-center gap-4">
                <CreditCard className="w-8 h-8 flex-shrink-0" />
                <div>
                  <div className="text-2xl font-bold">$10.99 / month</div>
                  <div className="text-blue-100 text-sm">
                    {communityPlan === "private" ? "Private" : "Paid"} Community Subscription — cancel anytime
                  </div>
                </div>
              </div>

              <Alert className="border-amber-300 bg-amber-50">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-sm">
                  If your subscription lapses, your community becomes inaccessible to members. Data retained 90 days.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4 text-blue-600" />Your Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Full Legal Name *</Label><Input className="mt-1" value={fullLegalName} onChange={e => setFullLegalName(e.target.value)} /></div>
                  <div><Label>Contact Email *</Label><Input className="mt-1" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
                  <div><Label>Phone Number *</Label><Input className="mt-1" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+61 400 000 000" /></div>
                  <div><Label>Country *</Label><Input className="mt-1" value={country} onChange={e => setCountry(e.target.value)} placeholder="Australia" /></div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  {[
                    { id: "fee",   state: checkMonthlyFee,     set: setCheckMonthlyFee,     warn: false, label: "I understand the $10.99/month fee and agree to pay. This is non-refundable." },
                    { id: "acc",   state: checkAccessWarning,  set: setCheckAccessWarning,  warn: true,  label: "I understand my community becomes inaccessible if I stop paying." },
                    { id: "resp",  state: checkResponsibility, set: setCheckResponsibility, warn: false, label: "I accept full responsibility for my community and compliance with Voice to Action's Terms of Service." },
                    { id: "tos",   state: checkTOS,            set: setCheckTOS,            warn: false, label: "I have read and agree to the Terms of Service." },
                    { id: "age",   state: checkAge,            set: setCheckAge,            warn: false, label: "I confirm I am 18 years of age or older." },
                  ].map(c => (
                    <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border ${c.warn ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
                      <Checkbox id={c.id} checked={c.state} onCheckedChange={c.set} className="mt-0.5" />
                      <Label htmlFor={c.id} className="cursor-pointer text-sm leading-relaxed">{c.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <ReferralCodeInput
                autoApplyCode={savedProfileReferralCode}
                onCodeApplied={setAppliedReferralCode}
                onCodeRemoved={() => setAppliedReferralCode(null)}
              />

              <Button onClick={handlePay} disabled={paymentLoading} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">
                <CreditCard className="w-5 h-5 mr-2" />
                {paymentLoading ? "Redirecting to Stripe…" : "Pay $10.99/month & Continue"}
              </Button>
              <p className="text-center text-xs text-slate-500">Secured by Stripe. You will be redirected to complete payment.</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: Details ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Community Details</CardTitle>
            <CardDescription>Name, type, description, and visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div>
              <Label>Community Name *</Label>
              <Input
                className="mt-1"
                value={communityName}
                onChange={e => setCommunityName(e.target.value)}
                placeholder="e.g. Brisbane Cyclists"
              />
              {errors.communityName && <p className="text-xs text-red-500 mt-1">{errors.communityName}</p>}
            </div>

            {/* Description */}
            <div>
              <Label>Description *</Label>
              <Textarea
                className="mt-1"
                value={communityDescription}
                onChange={e => setCommunityDescription(e.target.value)}
                placeholder="What is this community about? Who is it for?"
                rows={3}
              />
              {errors.communityDescription && <p className="text-xs text-red-500 mt-1">{errors.communityDescription}</p>}
            </div>

            {/* Type */}
            <div>
              <Label className="mb-2 block">Community Type *</Label>
              {errors.communityType && <p className="text-xs text-red-500 mb-2">{errors.communityType}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMUNITY_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setCommunityType(type.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        communityType === type.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 ${communityType === type.value ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="text-sm font-semibold text-slate-900">{type.label}</div>
                      <div className="text-xs text-slate-500">{type.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility */}
            {communityPlan !== "private" && (
              <div>
                <Label>Visibility *</Label>
                <Select value={communityVisibility} onValueChange={setCommunityVisibility}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public – discoverable by anyone</SelectItem>
                    <SelectItem value="invite_only">Invite Only – join with code</SelectItem>
                    <SelectItem value="private">Private – hidden from search</SelectItem>
                  </SelectContent>
                </Select>
                {errors.communityVisibility && <p className="text-xs text-red-500 mt-1">{errors.communityVisibility}</p>}
              </div>
            )}

            {communityPlan === "private" && (
              <Alert className="border-purple-200 bg-purple-50">
                <Lock className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-900 text-sm">
                  Private communities are hidden from search and require an invite code to join.
                </AlertDescription>
              </Alert>
            )}

            {/* Optional fields */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Location <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input className="mt-1" value={communityLocation} onChange={e => setCommunityLocation(e.target.value)} placeholder="Brisbane, QLD" />
              </div>
              <div>
                <Label>Category <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input className="mt-1" value={communityCategory} onChange={e => setCommunityCategory(e.target.value)} placeholder="Sport, Health, Politics…" />
              </div>
            </div>

            <div>
              <Label>Tags <span className="text-slate-400 text-xs">(comma-separated, optional)</span></Label>
              <Input className="mt-1" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="cycling, outdoors, health" />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <Button onClick={() => { if (validateDetails()) setStep(2); }}>
                Next: Settings <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Settings ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Community Settings</CardTitle>
            <CardDescription>Configure governance and feature modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Join Policy</Label>
              {communityPlan === "private" ? (
                <div className="mt-1 flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                  <Lock className="w-4 h-4 text-purple-600" />
                  Private communities always require an invite code to join.
                </div>
              ) : (
                <Select
                  value={joinPolicy}
                  onValueChange={setJoinPolicy}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open – anyone can join instantly</SelectItem>
                    <SelectItem value="approval_required">Approval Required – admin reviews requests</SelectItem>
                    <SelectItem value="invite_only">Invite Only – access code required</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {joinPolicy === "open" && "Members join with one click — no approval needed."}
                {joinPolicy === "approval_required" && "Members send a request; you approve or reject from the community settings."}
                {joinPolicy === "invite_only" && "Members must enter a valid access code you share with them."}
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Enabled Modules</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {["Discussions", "Polls", "Petitions", "Announcements", "Documents", "Events"].map(mod => (
                  <div key={mod} className="flex items-center gap-2 p-2 rounded border border-slate-200">
                    <Checkbox id={mod} defaultChecked={true} />
                    <Label htmlFor={mod} className="cursor-pointer text-sm">{mod}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <Button onClick={() => setStep(3)}>
                Next: Review <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Review & Create ── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>Confirm your community details before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 relative">
            <HoneypotField value={honeypot} onChange={(ev) => setHoneypot(ev.target.value)} inputId="community_hp_website" name="website_url_community" />
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Name</span>
                <span className="font-semibold text-slate-900">{communityName || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Type</span>
                <span className="font-semibold text-slate-900 capitalize">{communityType || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Plan</span>
                <Badge className={
                  communityPlan === "free" ? "bg-emerald-100 text-emerald-700" :
                  communityPlan === "private" ? "bg-purple-100 text-purple-700" :
                  "bg-blue-100 text-blue-700"
                }>
                  {communityPlan || "—"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Visibility</span>
                <span className="font-semibold text-slate-900 capitalize">
                  {communityPlan === "private" ? "private" : communityVisibility}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Join Policy</span>
                <span className="font-semibold text-slate-900 capitalize">
                  {communityPlan === "private" ? "invite_only" : joinPolicy.replace(/_/g, " ")}
                </span>
              </div>
              {communityLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Location</span>
                  <span className="font-semibold text-slate-900">{communityLocation}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">{communityDescription || "—"}</p>
            </div>

            {needsPayment && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900 font-semibold">
                  Payment required to create a {communityPlan} community. Please go back to Step 1 to complete payment.
                </AlertDescription>
              </Alert>
            )}

            {!needsPayment && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 text-sm">
                  Everything looks good! Click "Create Community" to launch your community.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || needsPayment}
                className="bg-blue-600 hover:bg-blue-700 min-w-[160px]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {createMutation.isPending ? "Creating…" : "Create Community"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
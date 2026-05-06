import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Shield,
  Lock,
  Database,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Eye,
  Mail,
  Rocket,
  Handshake } from
"lucide-react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";
import { SUPPORT_EMAIL } from "@/constants/siteUrl";

const DONATION_TIERS = [
{ value: "5", label: "$5" },
{ value: "10", label: "$10" },
{ value: "25", label: "$25" },
{ value: "50", label: "$50" },
{ value: "100", label: "$100" },
{ value: "custom", label: "Custom Amount" }];


const ALLOCATION_PREFERENCES = [
{ value: "no_preference", label: "No preference (platform decides)" },
{ value: "platform_development", label: "Platform Development" },
{ value: "security_trust", label: "Security & Trust Systems" },
{ value: "global_expansion", label: "Global Expansion" },
{ value: "research_analytics", label: "Research & Analytics" },
{ value: "accessibility", label: "Accessibility & Inclusion" }];


export default function PlatformFunding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [donationType, setDonationType] = useState("one_time");
  const [selectedTier, setSelectedTier] = useState("25");
  const [customAmount, setCustomAmount] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allocationPreference, setAllocationPreference] = useState("no_preference");
  const [optInUpdates, setOptInUpdates] = useState(false);
  const [donorMessage, setDonorMessage] = useState("");
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser || null);
    } catch {
      setUser(null);
    }
  };

  const { data: totalRaised = 0 } = useQuery({
    queryKey: ["platformDonationsTotal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_donations").select("amount").eq("status", "completed");
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return 0;
      return (data || []).reduce((sum, d) => sum + (d.amount || 0), 0);
    }
  });

  const [checkingOut, setCheckingOut] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to donate");
      return;
    }

    if (!hasConfirmed) {
      toast.error("Please confirm you understand the donation terms");
      return;
    }

    const amount = selectedTier === "custom" ? parseFloat(customAmount) : parseFloat(selectedTier);
    if (!amount || amount < 1) {
      toast.error("Please enter a valid amount");
      return;
    }

    setCheckingOut(true);
    try {
      await initiateStripeCheckout({
        payment_type: "platform_donation",
        amount,
        success_url: `${window.location.origin}/PlatformFunding?donated=1`,
        cancel_url: `${window.location.origin}/PlatformFunding?payment_cancelled=1`,
        metadata: { user_id: user.id },
      });
    } catch (err) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  // Handle return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("donated") === "1") {
      setShowConfirmation(true);
    }
  }, []);

  if (showConfirmation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Thank You for Your Support
        </h1>
        <p className="text-lg text-slate-700 mb-8">
          Your contribution helps maintain and develop Every Voice as a transparent, 
          neutral platform for global civic engagement.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate(createPageUrl("FundingTransparency"))}>
            View Transparency Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            Return Home
          </Button>
        </div>
      </div>);

  }

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 via-indigo-800 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">Support the Infrastructure of Voice To Action

            </h1>
            <p className="text-xl text-blue-100 mb-10">
              Help build and maintain a global civic platform designed for transparency, 
              accountability, and public good.
            </p>

            {/* Trust Indicators */}
            <div className="grid md:grid-cols-4 gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <Shield className="w-8 h-8 text-emerald-300" />
                <div className="text-sm">
                  <div className="font-semibold">No Donor Influence</div>
                  <div className="text-xs text-blue-200">Zero voting power</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <Eye className="w-8 h-8 text-blue-300" />
                <div className="text-sm">
                  <div className="font-semibold">Full Transparency</div>
                  <div className="text-xs text-blue-200">Public reporting</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <Lock className="w-8 h-8 text-purple-300" />
                <div className="text-sm">
                  <div className="font-semibold">Platform Only</div>
                  <div className="text-xs text-blue-200">Infrastructure focus</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <Database className="w-8 h-8 text-amber-300" />
                <div className="text-sm">
                  <div className="font-semibold">Permanent Records</div>
                  <div className="text-xs text-blue-200">Auditable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Funding Use Overview */}
        <Card className="border-blue-200 bg-blue-50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              What Donations Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Platform development and engineering</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Cybersecurity and infrastructure</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Verification and anti-fraud systems</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Moderation and governance tooling</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Legal, compliance, and auditing costs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Global scalability and reliability</span>
            </div>

            <Alert className="border-amber-600 bg-amber-50 mt-4">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 font-semibold">
                Donations do not buy influence, priority, or special status in polls, 
                petitions, or discussions.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Current Support Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-slate-200">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900 mb-1">
                ${totalRaised.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Total Platform Support</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900 mb-1">100%</div>
              <div className="text-sm text-slate-600">Transparent Reporting</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-6 text-center">
              <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900 mb-1">0</div>
              <div className="text-sm text-slate-600">Donor Influence</div>
            </CardContent>
          </Card>
        </div>

        {/* Strategic Partnership Section */}
        <Card className="border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Rocket className="w-6 h-6 text-indigo-600" />
              Strategic Partnerships & Major Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700 leading-relaxed">
              Are you an investor, organization, or individual with connections that could help 
              Every Voice reach worldwide standards? Do you believe in this movement and want to 
              contribute on a larger scale?
            </p>
            
            <div className="bg-white rounded-lg p-6 border border-indigo-200 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-900">
                <Handshake className="w-5 h-5" />
                We're Looking For:
              </h3>
              
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Strategic investors and partners</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Government or institutional connections</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">International scaling expertise</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Media and distribution partners</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Technology infrastructure support</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Philanthropic organizations</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-indigo-900">Contact the Founder Directly</h4>
                <p className="text-sm text-slate-600">
                  If you have connections, resources, or expertise that can help Every Voice 
                  achieve global impact, reach out directly to discuss partnership opportunities.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=Strategic Partnership Inquiry`}
                    className="flex-1">

                    <Button
                      type="button"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2">

                      <Mail className="w-4 h-4" />
                      Contact via Email
                    </Button>
                  </a>
                </div>
              </div>

              <Alert className="border-indigo-300 bg-indigo-50/50">
                <Shield className="h-4 w-4 text-indigo-600" />
                <AlertDescription className="text-indigo-900 text-sm">
                  <strong>Platform Neutrality Maintained:</strong> All partnerships are subject to 
                  Every Voice's core principles of neutrality, transparency, and "one human, one vote." 
                  No investor or partner receives platform influence or voting power.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Support Owner (Gift) */}
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-xl text-rose-900 mb-1 flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-rose-600" />
                  Support the Creator (Gift)
                </h3>
                <p className="text-sm text-rose-800">
                  Send a voluntary personal gift directly to the platform creator via bank transfer.
                  No goods, services, or platform benefits are provided in exchange.
                  This is a completely voluntary act of support.
                </p>
              </div>
              <a href={"/SupportOwner"} className="shrink-0">
                <Button className="bg-rose-600 hover:bg-rose-700 text-white px-6">
                  <Heart className="w-4 h-4 mr-2" />
                  Gift the Creator
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Donation Form */}
        <form onSubmit={handleSubmit}>
          <Card className="border-slate-200 mb-6">
            <CardHeader>
              <CardTitle>Make a Contribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Donation Type */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Donation Type</Label>
                <Select value={donationType} onValueChange={setDonationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time donation</SelectItem>
                    <SelectItem value="monthly">Monthly recurring support</SelectItem>
                    <SelectItem value="annual">Annual supporter contribution</SelectItem>
                    <SelectItem value="institutional">Institutional / organisational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Amount</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {DONATION_TIERS.map((tier) =>
                  <Button
                    key={tier.value}
                    type="button"
                    variant={selectedTier === tier.value ? "default" : "outline"}
                    onClick={() => setSelectedTier(tier.value)}
                    className="w-full">

                      {tier.label}
                    </Button>
                  )}
                </div>

                {selectedTier === "custom" &&
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="1"
                  step="0.01" />

                }
              </div>

              <Separator />

              {/* Allocation Preference */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Allocation Preference (Advisory Only)
                </Label>
                <Select value={allocationPreference} onValueChange={setAllocationPreference}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOCATION_PREFERENCES.map((pref) =>
                    <SelectItem key={pref.value} value={pref.value}>
                        {pref.label}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600">
                  Preferences are advisory only and do not guarantee restricted use
                </p>
              </div>

              {/* Optional Message */}
              <div className="space-y-2">
                <Label>Optional Message</Label>
                <Textarea
                  placeholder="Add a message (optional)"
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                  rows={3}
                  maxLength={500} />

              </div>

              <Separator />

              {/* Privacy & Updates */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous} />

                  <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                    Donate anonymously (publicly anonymous, internally verified)
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="updates"
                    checked={optInUpdates}
                    onCheckedChange={setOptInUpdates} />

                  <Label htmlFor="updates" className="text-sm cursor-pointer">
                    Receive platform development updates (no spam or marketing)
                  </Label>
                </div>
              </div>

              {/* Referral Code — not applicable to platform donations */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Referral Code (optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    disabled
                    readOnly
                    className="flex-1 font-mono uppercase tracking-widest bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                    placeholder="Referral codes not used for donations"
                  />
                  <Button type="button" variant="outline" disabled className="shrink-0">
                    Not applicable for donations
                  </Button>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Referral codes cannot be applied to donations or gifts to the creator.
                </p>
              </div>

              {/* Confirmation */}
              <Alert className="border-slate-300">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-start gap-2 mb-2">
                    <Checkbox
                      id="confirm"
                      checked={hasConfirmed}
                      onCheckedChange={setHasConfirmed} />

                    <Label htmlFor="confirm" className="text-sm cursor-pointer leading-relaxed">
                      I understand that donations are voluntary, non-refundable, and do not 
                      confer ownership, control, or influence over platform decisions, votes, 
                      or content. I support Every Voice's neutrality principles.
                    </Label>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("FundingTransparency"))}>

              View Transparency Report
            </Button>
            <Button
              type="submit"
              disabled={!hasConfirmed || checkingOut || !user}
              className="bg-blue-600 hover:bg-blue-700">

              {checkingOut ? "Redirecting to Stripe..." : <><ExternalLink className="w-4 h-4 mr-1.5" />Pay with Stripe</>}
            </Button>
          </div>
        </form>
      </div>
    </div>);

}
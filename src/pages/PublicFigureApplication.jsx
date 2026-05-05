import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, Shield, CheckCircle2, Clock, AlertCircle, Upload, Link as LinkIcon, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";

export default function PublicFigureApplication() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [existing, setExisting] = useState(null);

  const [figureType, setFigureType] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [proofDocUrl, setProofDocUrl] = useState("");
  const [socialMedia, setSocialMedia] = useState({
    instagram: "",
    twitter_x: "",
    tiktok: "",
    linkedin: "",
    youtube: "",
    other: "",
  });

  useEffect(() => {
    supabase.auth.getUser()
      .then(async ({ data: { user: u } }) => {
        if (!u) throw new Error("not-auth");
        setUser(u);
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle();
        setFullName(profile?.full_name || u.user_metadata?.full_name || "");

        const { data: reqs = [] } = await supabase
          .from("verification_requests")
          .select("*")
          .eq("user_id", u.id)
          .eq("verification_type", "public_figure")
          .order("created_date", { ascending: false });

        // Returning from Stripe payment
        const params = new URLSearchParams(window.location.search);
        if (params.get("paid") === "1" && reqs.length === 0) {
          const saved = localStorage.getItem(`gold_draft_${u.id}`);
          if (saved) {
            const draft = JSON.parse(saved);
            await supabase.from("verification_requests").insert(cleanForDB({
              ...draft,
              status: "pending",
              payment_status: "completed",
              payment_amount: 100,
              payment_reference: "STRIPE-GOLD-100",
            }));
            localStorage.removeItem(`gold_draft_${u.id}`);
            toast.success("✅ Application submitted! Review takes 1–10 business days.");
            const { data: updated = [] } = await supabase
              .from("verification_requests")
              .select("*")
              .eq("user_id", u.id)
              .eq("verification_type", "public_figure")
              .order("created_date", { ascending: false });
            if (updated.length > 0) setExisting(updated[0]);
            return;
          }
        }

        if (reqs.length > 0) setExisting(reqs[0]);
      })
      .catch(() => navigate(createPageUrl("Home")))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploading(true);
    try {
      const path = `verification-docs/${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("profile-documents").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-documents").getPublicUrl(path);
      setProofDocUrl(data.publicUrl);
      toast.success("Document uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!figureType || !fullName.trim() || !role.trim() || !evidenceLinks.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const socialLinks = Object.entries(socialMedia)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k.replace("_x", "/X").replace("_", " ")}: ${v}`)
      .join("\n");

    if (!socialLinks) {
      toast.error("Please provide at least one social media profile link");
      return;
    }

    if (window.self !== window.top) {
      toast.error("Checkout only works from the published app, not the preview.");
      return;
    }

    localStorage.setItem(`gold_draft_${user.id}`, JSON.stringify({
      user_id: user.id,
      verification_type: "public_figure",
      full_name: fullName,
      additional_info: `ROLE: ${role}\n\nFIGURE_TYPE: ${figureType}\n\nEVIDENCE LINKS:\n${evidenceLinks}\n\nSOCIAL MEDIA:\n${socialLinks}\n\nEXTRA INFO:\n${additionalInfo}`,
      document_front_url: proofDocUrl || undefined,
    }));

    setCheckingOut(true);
    try {
      await initiateStripeCheckout({
        payment_type: "gold_checkmark",
        success_url: `${window.location.origin}/PublicFigureApplication?paid=1`,
        cancel_url: `${window.location.origin}/PublicFigureApplication?payment_cancelled=1`,
        metadata: { user_id: user.id },
      });
    } catch (err) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
    </div>
  );

  if (existing) {
    const status = existing.status;
    const statusConfig = {
      pending:         { color: "text-amber-600",   bg: "bg-amber-50",   icon: Clock,         label: "Under Review" },
      under_review:    { color: "text-blue-600",    bg: "bg-blue-50",    icon: Shield,        label: "Being Reviewed" },
      approved:        { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2,  label: "Approved" },
      rejected:        { color: "text-red-600",     bg: "bg-red-50",     icon: AlertCircle,   label: "Not Approved" },
      needs_more_info: { color: "text-orange-600",  bg: "bg-orange-50",  icon: AlertCircle,   label: "More Info Needed" },
    };
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className={`w-20 h-20 ${cfg.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-10 h-10 ${cfg.color}`} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Application {cfg.label}</h1>
        <p className="text-slate-600 text-lg mb-8">
          {status === "approved"
            ? "🎉 Your Gold ★ checkmark has been granted! It will now appear next to your name across the platform."
            : status === "rejected"
            ? "Unfortunately your application was not approved at this time. You may re-apply after 30 days with additional evidence."
            : status === "needs_more_info"
            ? "The review team needs more information. Please contact support at jeremy@everyvoice.com."
            : "Your application has been submitted and is under review. This typically takes 1–10 business days."}
        </p>
        {existing?.review_notes && (
          <Alert className="border-orange-200 bg-orange-50 text-left mb-6">
            <AlertDescription className="text-orange-900">
              <strong>Admin notes:</strong> {existing.review_notes}
            </AlertDescription>
          </Alert>
        )}
        <Button onClick={() => navigate(createPageUrl("Profile"))}>Back to Profile</Button>
      </div>
    );
  }

  const canApply = user?.is_email_verified && user?.is_phone_verified;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
          <Star className="w-8 h-8 text-yellow-500 fill-yellow-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Apply for Gold ★ Checkmark</h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Politicians, public officials, journalists, academics, and prominent public figures can apply
          for the Gold ★ checkmark. All applications are manually reviewed by the EveryVoice team.
        </p>
      </div>

      {/* Fee & Timeline */}
      <Card className="border-yellow-200 bg-yellow-50 mb-8">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <CreditCard className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-900 text-lg mb-1">$100 AUD Application Fee (via Stripe)</h3>
              <p className="text-yellow-800 text-sm leading-relaxed">
                A non-refundable application fee of <strong>$100 AUD</strong> is required when submitting your Gold Checkmark application.
                This fee covers the cost of manual review and identity verification by the EveryVoice team.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-lg px-3 py-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>Review time: 1 to 10 business days after submission. You will be notified by email.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Who qualifies */}
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {[
          ["🏛️", "Political Representatives", "MPs, senators, councillors, ministers"],
          ["📰", "Public Media Figures", "Journalists, commentators, broadcasters"],
          ["🎓", "Academics & Experts", "Researchers, professors, verified experts"],
        ].map(([icon, title, desc]) => (
          <div key={title} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <span className="text-2xl block mb-2">{icon}</span>
            <p className="font-semibold text-slate-800 text-sm">{title}</p>
            <p className="text-xs text-slate-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Verification prerequisite check */}
      {!canApply && (
        <Alert className="border-amber-300 bg-amber-50 mb-6">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            You must have <strong>both email and phone</strong> verified before applying for a Gold checkmark.{" "}
            <button className="underline font-semibold" onClick={() => navigate(createPageUrl("SecuritySettings"))}>
              Verify in Security Settings →
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Gold Checkmark Application</CardTitle>
          <CardDescription>
            All applications are reviewed manually by Every Voice Pty Ltd within 1–10 business days.
            The $100 AUD fee is non-refundable regardless of outcome.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-2">
              <Label>Type of Public Figure *</Label>
              <Select value={figureType} onValueChange={setFigureType}>
                <SelectTrigger><SelectValue placeholder="Select your category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elected_official">Elected Official (MP, Senator, Councillor)</SelectItem>
                  <SelectItem value="government_minister">Government Minister or Cabinet Member</SelectItem>
                  <SelectItem value="political_candidate">Political Candidate</SelectItem>
                  <SelectItem value="journalist">Journalist or Media Commentator</SelectItem>
                  <SelectItem value="academic_expert">Academic or Verified Expert</SelectItem>
                  <SelectItem value="activist_leader">Prominent Activist or Advocacy Leader</SelectItem>
                  <SelectItem value="public_official">Other Public Official</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Full Legal / Public Name *</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As publicly known" required />
            </div>

            <div className="space-y-2">
              <Label>Your Role / Title / Position *</Label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Member of Parliament for Brisbane, ABC News Correspondent" required />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5" /> Evidence Links (one per line) *
              </Label>
              <Textarea
                value={evidenceLinks}
                onChange={e => setEvidenceLinks(e.target.value)}
                placeholder={"https://parliament.gov.au/your-profile\nhttps://abc.net.au/byline\nhttps://en.wikipedia.org/wiki/Your_Name"}
                rows={4}
                required
              />
              <p className="text-xs text-slate-500">Official government sites, news bylines, Wikipedia, etc.</p>
            </div>

            {/* Social Media Profiles */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Social Media Profiles *</Label>
                <p className="text-xs text-slate-500 mt-0.5">At least one is required. These are used to help verify your public identity.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  ["instagram", "Instagram", "https://instagram.com/yourhandle"],
                  ["twitter_x", "Twitter / X", "https://x.com/yourhandle"],
                  ["tiktok", "TikTok", "https://tiktok.com/@yourhandle"],
                  ["linkedin", "LinkedIn", "https://linkedin.com/in/yourprofile"],
                  ["youtube", "YouTube", "https://youtube.com/@yourchannel"],
                  ["other", "Other Platform", "Any other public profile URL"],
                ].map(([key, label, placeholder]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm text-slate-600">{label}</Label>
                    <Input
                      value={socialMedia[key]}
                      onChange={e => setSocialMedia(s => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Supporting document */}
            <div className="space-y-2">
              <Label>Supporting Document (optional)</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center">
                {proofDocUrl ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Document uploaded</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Upload ID, official letterhead, or credential scan (optional)</p>
                  </>
                )}
                <Input type="file" accept="image/*,application/pdf" onChange={handleUpload} disabled={uploading} className="mt-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Information (optional)</Label>
              <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} placeholder="Anything else that supports your application..." rows={3} />
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                Applications are reviewed manually within <strong>1–10 business days</strong>.
                Approval is at Every Voice Pty Ltd's sole discretion. The <strong>$100 AUD fee is non-refundable</strong> regardless of outcome.
                Gold checkmarks may be revoked if the account breaches platform rules.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Profile"))} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={checkingOut || uploading || !canApply}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {checkingOut ? "Redirecting to Stripe..." : "Pay $100 AUD & Submit Application"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
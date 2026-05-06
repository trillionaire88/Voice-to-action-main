import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { sanitiseText } from "@/lib/sanitise";
import HoneypotField from "@/components/HoneypotField";
import { insertContentWatermark } from "@/lib/watermark";
import { reportHoneypotHit } from "@/lib/threatIntelClient";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { checkRateLimit } from "@/lib/rateLimit";
import FormErrorHandler from "@/components/ui/FormErrorHandler";
import { FileText, Target, MapPin, Shield, Globe2, ArrowLeft, ImageIcon, X } from "lucide-react";
import AIPetitionAssistant from "@/components/petitions/AIPetitionAssistant";

const CATEGORIES = [
  { value: "government_policy", label: "Government Policy" },
  { value: "local_council", label: "Local Council" },
  { value: "corporate_policy", label: "Corporate Policy" },
  { value: "human_rights", label: "Human Rights" },
  { value: "environment", label: "Environment" },
  { value: "health", label: "Health" },
  { value: "economy", label: "Economy" },
  { value: "technology", label: "Technology" },
  { value: "education", label: "Education" },
  { value: "housing", label: "Housing" },
  { value: "justice", label: "Justice" },
  { value: "disability", label: "Disability" },
  { value: "indigenous_rights", label: "Indigenous Rights" },
  { value: "immigration", label: "Immigration" },
  { value: "consumer_rights", label: "Consumer Rights" },
  { value: "other", label: "Other" },
];

const TARGET_TYPES = [
  { value: "national_government", label: "National Government" },
  { value: "local_council", label: "Local Council" },
  { value: "corporation", label: "Corporation" },
  { value: "regulatory_body", label: "Regulatory Body" },
  { value: "international_org", label: "International Organisation" },
  { value: "public_institution", label: "Public Institution" },
  { value: "parliament", label: "Parliament" },
  { value: "judiciary", label: "Judiciary" },
  { value: "other", label: "Other" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

const COUNTRIES = [
  { code: "AU", name: "Australia" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "OTHER", name: "Other" },
];

const SIGNATURE_GOAL_PRESETS = [
  { value: 50000, label: "50,000" },
  { value: 100000, label: "100,000" },
  { value: 250000, label: "250,000" },
  { value: 500000, label: "500,000" },
  { value: 1000000, label: "1 million" },
  { value: 2000000, label: "2 million" },
];

export default function CreatePetition() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Required fields
  const [title, setTitle] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [requestedAction, setRequestedAction] = useState("");
  const [category, setCategory] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetName, setTargetName] = useState("");

  // Optional fields
  const [regionCode, setRegionCode] = useState("");
  const [signatureGoal, setSignatureGoal] = useState(50000);
  const [urgencyLevel, setUrgencyLevel] = useState("standard");
  const [deadline, setDeadline] = useState("");
  const [creatorRelationship, setCreatorRelationship] = useState("");
  const [evidenceBasis, setEvidenceBasis] = useState("");
  const [allowPublicWithdrawal, setAllowPublicWithdrawal] = useState(false);
  const [creatorVisible, setCreatorVisible] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !user) navigateToLogin();
  }, [isLoadingAuth, isAuthenticated, user, navigateToLogin]);

  // Pre-fill country from user profile
  useEffect(() => {
    if (user?.country_code && !countryCode) setCountryCode(user.country_code);
  }, [user]);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("petition_draft");
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.title) setTitle(draft.title);
        if (draft.fullDescription) setFullDescription(draft.fullDescription);
        if (draft.requestedAction) setRequestedAction(draft.requestedAction);
        if (draft.shortSummary) setShortSummary(draft.shortSummary);
        if (draft.targetName) setTargetName(draft.targetName);
        if (draft.category) setCategory(draft.category);
        if (draft.countryCode) setCountryCode(draft.countryCode);
        setDraftRestored(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Autosave draft whenever form changes
  useEffect(() => {
    const draft = { title, fullDescription, requestedAction, shortSummary, targetName, category, countryCode };
    localStorage.setItem("petition_draft", JSON.stringify(draft));
  }, [title, fullDescription, requestedAction, shortSummary, targetName, category, countryCode]);

  const MAX_TITLE = 300;
  const MAX_SUMMARY = 1000;
  const MAX_DESCRIPTION = 50000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (honeypot) {
      console.warn("[Security] Honeypot triggered");
      reportHoneypotHit("create_petition");
      return;
    }

    const { allowed } = checkRateLimit("create_petition", 5, 60 * 60 * 1000);
    if (!allowed) {
      toast.error("You've created too many petitions recently. Please wait before trying again.");
      return;
    }

    const safeTitle = sanitiseText(title, MAX_TITLE);
    const safeSummary = sanitiseText(shortSummary, MAX_SUMMARY);
    const safeDescription = sanitiseText(fullDescription, MAX_DESCRIPTION);
    const safeRequested = sanitiseText(requestedAction, MAX_DESCRIPTION);
    const safeTargetName = sanitiseText(targetName, 500);
    const safeRegion = sanitiseText(regionCode, 120);
    const safeCreatorRel = sanitiseText(creatorRelationship, 2000);
    const safeEvidence = sanitiseText(evidenceBasis, 10000);

    if (!safeTitle || safeTitle.trim().length < 10) {
      toast.error("Title must be at least 10 characters.");
      return setError("Title must be at least 10 characters.");
    }
    if (safeTitle.length > MAX_TITLE) return setError("Title is too long.");
    if (safeSummary && safeSummary.length > MAX_SUMMARY) return setError("Summary is too long.");
    if (safeDescription.length > MAX_DESCRIPTION) return setError("Description is too long.");

    if (!safeSummary.trim()) return setError("Please enter a short summary (1–3 sentences).");
    if (!safeDescription.trim()) return setError("Please enter a full description.");
    if (!safeRequested.trim()) return setError("Please describe the specific action you are requesting.");
    if (!category) return setError("Please select a category.");
    if (!countryCode) return setError("Please select a country.");
    if (!targetType) return setError("Please select a target type.");
    if (!safeTargetName.trim()) return setError("Please enter the name of the target (e.g. Minister for Health).");
    if (signatureGoal < 50000) return setError("Signature goal must be at least 50,000.");

    setSubmitting(true);
    try {
      // ── Content moderation scan — runs before anything is saved ──────────
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const scanResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-moderation`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `${safeTitle}\n${safeSummary}\n${safeDescription}\n${safeRequested}`,
            contentType: "petition",
            contentId: "draft",
          }),
        });
        const scanResult = await scanResponse.json().catch(() => ({}));
        if (scanResult.flagged && scanResult.severity === "high") {
          toast.error("Your petition content was flagged by moderation checks. Please revise before submitting.", { duration: 6000 });
          setSubmitting(false);
          return;
        }
      } catch {
        /* non-blocking moderation */
      }

      let image_url = null;
      if (imageFile) {
        setUploadingImage(true);
        const res = await api.integrations.Core.UploadFile({ file: imageFile });
        image_url = res.file_url;
        setUploadingImage(false);
      }
      const petition = await api.entities.Petition.create(
        cleanForDB({
          title: safeTitle,
          short_summary: safeSummary,
          full_description: safeDescription,
          requested_action: safeRequested,
          category,
          country_code: countryCode,
          region_code: safeRegion || undefined,
          target_type: targetType,
          target_name: safeTargetName,
          creator_user_id: user.id,
          creator_relationship: safeCreatorRel || undefined,
          evidence_basis: safeEvidence || undefined,
          urgency_level: urgencyLevel,
          signature_goal: Math.max(50000, parseInt(signatureGoal) || 50000),
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          status: "active",
          moderation_status: "approved",
          signature_count_total: 0,
          signature_count_verified: 0,
          visibility: "public",
          supporting_documents: [],
          supporting_links: [],
          image_url: image_url || undefined,
          media_items: [],
          allow_public_withdrawal: allowPublicWithdrawal,
          creator_visible: creatorVisible,
        })
      );

      // Auto-index for search — fire and forget
      api.functions.invoke("indexContent", {
        content_type: "petition",
        content_id: petition.id,
      }).catch(e => console.warn("[CreatePetition] Index failed:", e.message));

      // Send confirmation emails
      try {
        await api.integrations.Core.SendEmail({
          to: user.email,
          subject: `Your petition is live: ${petition.title}`,
          body: `Hi ${user.full_name},\n\nYour petition "${petition.title}" has been published on Voice to Action.\n\nShare this link to gather signatures:\n${window.location.origin}/petition-detail?id=${petition.id}\n\nSignature goal: ${signatureGoal}\n\nThank you for taking civic action.\n\n— Voice to Action`,
        });
        await api.integrations.Core.SendEmail({
          to: "voicetoaction@outlook.com",
          subject: `New petition created: ${petition.title}`,
          body: `New petition published.\n\nTitle: ${petition.title}\nCreator: ${user.full_name} (${user.email})\nCategory: ${category}\nTarget: ${targetName} (${targetType})\nCountry: ${countryCode}\nGoal: ${signatureGoal}\nID: ${petition.id}\nDate: ${new Date().toISOString()}`,
        });
      } catch {
        // Email errors are non-fatal
      }

      toast.success("Petition published successfully!");
      localStorage.removeItem("petition_draft");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id && petition?.id) {
        insertContentWatermark("petition", petition.id, session.user.id).catch(() => {});
      }
      navigate(createPageUrl("Petitions"));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-28 md:pb-10 pt-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Start a Petition</h1>
        <p className="text-slate-500">Create a petition to demand change. Every signature counts.</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-blue-500" /> Signature privacy protected</span>
          <span className="flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-emerald-500" /> Publicly visible</span>
        </div>
      </div>

      <FormErrorHandler error={error} />

      {draftRestored && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-amber-800 font-medium">📝 Your previous draft has been restored.</p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("petition_draft");
              setTitle(""); setFullDescription(""); setRequestedAction(""); setShortSummary("");
              setTargetName(""); setCategory(""); setCountryCode(""); setDraftRestored(false);
            }}
            className="text-xs text-amber-600 hover:text-amber-800 underline ml-4"
          >
            Clear draft
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative">
        <HoneypotField value={honeypot} onChange={(ev) => setHoneypot(ev.target.value)} />

        {/* Title & Summary */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Petition Details *
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Stop the closure of our local hospital"
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 150))}
                className="text-base"
                maxLength={150}
              />
              <p className="text-xs text-slate-400 text-right">{title.length}/150</p>
            </div>

            <div className="space-y-1">
              <Label>Short Summary <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Summarise the issue in 1–3 sentences. This is the first thing people will read."
                value={shortSummary}
                onChange={e => setShortSummary(e.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-slate-400 text-right">{shortSummary.length}/500</p>
            </div>

            <div className="space-y-1">
              <Label>Full Description <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Explain the problem in detail. Why does this matter? What is the impact? Who is affected?"
                value={fullDescription}
                onChange={e => setFullDescription(e.target.value.slice(0, 20000))}
                rows={8}
                maxLength={20000}
              />
              <p className="text-xs text-slate-400 text-right">{fullDescription.length}/20,000</p>
            </div>

            <div className="space-y-1">
              <Label>Requested Action <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="What specific action are you asking for? Be clear and concrete. e.g. 'We call on the Minister to reverse the decision by 1 May 2026.'"
                value={requestedAction}
                onChange={e => setRequestedAction(e.target.value.slice(0, 2000))}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Category & Urgency */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category & Urgency</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Urgency Level</Label>
              <Select value={urgencyLevel} onValueChange={setUrgencyLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Target */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" /> Who is this petition addressed to? *
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Target Type <span className="text-red-500">*</span></Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue placeholder="e.g. National Government" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Target Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Australian Parliament, Nike Inc."
                  value={targetName}
                  onChange={e => setTargetName(e.target.value)}
                  maxLength={300}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Location
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Country <span className="text-red-500">*</span></Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>State / Region <span className="text-xs text-slate-400">(optional)</span></Label>
              <Input
                placeholder="e.g. Queensland, NSW"
                value={regionCode}
                onChange={e => setRegionCode(e.target.value)}
                maxLength={120}
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature Goal */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Signature Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Target number of signatures <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={50000}
                value={signatureGoal}
                onChange={e => setSignatureGoal(parseInt(e.target.value) || 50000)}
                className="w-full sm:w-40"
              />
              <p className="text-xs text-slate-400">Minimum 50,000. You can always increase this later.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIGNATURE_GOAL_PRESETS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSignatureGoal(value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    signatureGoal === value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Creator Visibility */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Creator Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={creatorVisible}
                onChange={e => setCreatorVisible(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <div>
                <div className="font-medium text-slate-800 text-sm">Show my profile on this petition</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Your name, profile picture, and verification badge will be shown publicly on this petition.
                  If unchecked, you will appear as "Voice to Action user". Admins can always see your identity.
                </div>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Public Withdrawal Setting */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Withdrawal Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPublicWithdrawal}
                onChange={e => setAllowPublicWithdrawal(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <div>
                <div className="font-medium text-slate-800 text-sm">Allow anyone to withdraw this petition</div>
                <div className="text-xs text-slate-500 mt-0.5">Any user worldwide can pay $1.99 to receive a full copy of this petition's data and signatures emailed to them.</div>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Optional extras */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Additional Info <span className="text-xs font-normal text-slate-400">(optional)</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1">
              <Label>Your relationship to this issue</Label>
              <Input
                placeholder="e.g. Affected resident, community advocate, parent of a student..."
                value={creatorRelationship}
                onChange={e => setCreatorRelationship(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="space-y-1">
              <Label>Evidence / Supporting Facts</Label>
              <Textarea
                placeholder="Any statistics, studies, reports or evidence that supports your petition..."
                value={evidenceBasis}
                onChange={e => setEvidenceBasis(e.target.value.slice(0, 3000))}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" /> Petition Image <span className="text-xs font-normal text-slate-400">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-white border border-red-200 text-red-500 rounded-full w-7 h-7 flex items-center justify-center shadow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">Click to upload image</span>
                <span className="text-xs text-slate-400 mt-1">JPG, PNG, WebP</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Submit — desktop inline */}
        <div className="hidden md:flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 min-w-[160px]"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {uploadingImage ? "Uploading image..." : "Publishing..."}
              </span>
            ) : "Publish Petition"}
          </Button>
        </div>
      </form>
      <AIPetitionAssistant
        title={title}
        description={fullDescription}
        onUseGenerated={(raw) => {
          if (!raw) return;
          setTitle((prev) => prev || raw.slice(0, 120));
          setShortSummary((prev) => prev || raw.slice(0, 240));
          setFullDescription((prev) => prev || raw);
        }}
        onUseTitle={(raw) => { if (raw) setTitle(raw.split("\n")[0].slice(0, 280)); }}
        onUseDescription={(raw) => { if (raw) setFullDescription(raw); }}
      />

      {/* Sticky bottom bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 px-4 py-3 safe-area-bottom flex gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 h-12">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-2 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6"
          disabled={submitting}
          style={{ flex: 2 }}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              {uploadingImage ? "Uploading..." : "Publishing..."}
            </span>
          ) : "Publish Petition"}
        </Button>
      </div>
    </div>
  );
}
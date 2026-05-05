import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { sanitiseText } from "@/lib/sanitise";
import HoneypotField from "@/components/HoneypotField";
import { insertContentWatermark } from "@/lib/watermark";
import { reportHoneypotHit } from "@/lib/threatIntelClient";
import { cleanForDB } from "@/lib/dbHelpers";
import { checkRateLimit } from "@/lib/rateLimit";
import FormErrorHandler from "@/components/ui/FormErrorHandler";
import { PlusCircle, X, Globe2, Shield, ChevronDown, ChevronUp, GripVertical, ImageIcon } from "lucide-react";

const CATEGORIES = [
  { value: "governance_policy", label: "Governance & Policy" },
  { value: "politics", label: "Politics" },
  { value: "news_current_events", label: "News & Current Events" },
  { value: "economy_living", label: "Economy & Cost of Living" },
  { value: "health_wellbeing", label: "Health & Wellbeing" },
  { value: "environment_climate", label: "Environment & Climate" },
  { value: "technology_ai", label: "Technology & AI" },
  { value: "education", label: "Education" },
  { value: "corporate_business", label: "Corporate & Business Conduct" },
  { value: "civil_rights_ethics", label: "Civil Rights & Ethics" },
  { value: "food_agriculture", label: "Food & Agriculture Transparency" },
  { value: "community", label: "Community" },
  { value: "sports", label: "Sports" },
  { value: "local_community", label: "Local Community Issues" },
  { value: "global_affairs", label: "Global Affairs" },
  { value: "other", label: "Other" },
];

const POLL_INTENTS = [
  { value: "public_opinion", label: "Public opinion" },
  { value: "policy_insight", label: "Policy insight" },
  { value: "community_decision", label: "Community decision" },
  { value: "survey", label: "Survey" },
  { value: "research", label: "Research" },
  { value: "debate", label: "Debate" },
  { value: "ranking", label: "Ranking" },
  { value: "approval_rating", label: "Approval rating" },
  { value: "comparison", label: "Comparison" },
  { value: "community_feedback", label: "Community feedback" },
  { value: "other", label: "Other" },
];

const LOCATION_SCOPES = [
  { value: "global", label: "Global" },
  { value: "country", label: "Country" },
  { value: "region", label: "Region" },
  { value: "city", label: "City" },
  { value: "community", label: "Community" },
];

const OPTION_COLORS = [
  "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400",
  "bg-purple-400", "bg-cyan-400", "bg-orange-400", "bg-pink-400",
  "bg-teal-400", "bg-indigo-400", "bg-lime-400", "bg-red-400",
  "bg-sky-400", "bg-violet-400", "bg-green-400", "bg-yellow-400",
  "bg-fuchsia-400", "bg-slate-400", "bg-stone-400", "bg-zinc-400",
];

export default function CreatePoll() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [error, setError] = useState("");

  // Poll intent
  const [pollIntent, setPollIntent] = useState("");
  const [pollIntentCustom, setPollIntentCustom] = useState("");

  // Core fields
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [secondaryCategories, setSecondaryCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Options
  const [options, setOptions] = useState(["", ""]);

  // Advanced voting rules (hidden by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowMultipleSelection, setAllowMultipleSelection] = useState(false);
  const [enableRankedChoice, setEnableRankedChoice] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [requireComment, setRequireComment] = useState(false);
  const [includeUnsure, setIncludeUnsure] = useState(false);

  // Location & Audience
  const [locationScope, setLocationScope] = useState("global");
  const [citizensOnly, setCitizensOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minVotingAge, setMinVotingAge] = useState("none");

  // Duration
  const [durationMode, setDurationMode] = useState("none"); // none | 7 | 30 | custom
  const [customEndDate, setCustomEndDate] = useState("");

  // Results
  const [resultVisibility, setResultVisibility] = useState("always_visible");
  const [hideVoteCount, setHideVoteCount] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Discussion
  const [allowComments, setAllowComments] = useState(true);
  const [allowDiscussion, setAllowDiscussion] = useState(true);
  const [allowEvidence, setAllowEvidence] = useState(false);

  // Image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Petition link
  const [linkToPetition, setLinkToPetition] = useState(false);
  const [linkedPetitionId, setLinkedPetitionId] = useState("");

  const [step, setStep] = useState(1); // 1 = Question, 2 = Settings, 3 = Review
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !user) navigateToLogin();
  }, [isLoadingAuth, isAuthenticated, user, navigateToLogin]);

  const createPollMutation = useMutation({
    mutationFn: async (pollData) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("You must be signed in to create a poll.");

      let image_url = null;
      if (imageFile) {
        /* Image upload can be wired to storage later */
      }

      const row = cleanForDB({
        ...pollData,
        image_url: image_url || undefined,
        question: sanitiseText(pollData.question || "", 500),
        description: sanitiseText(pollData.description || "", 5000) || undefined,
        intent_custom: pollData.intent_custom ? sanitiseText(pollData.intent_custom, 200) : undefined,
      });
      const { data: poll, error: pollErr } = await supabase.from("polls").insert(row).select().single();
      if (pollErr) throw new Error(pollErr.message || "Failed to create poll");

      let validOptions = options.filter((o) => o.trim());
      if (includeUnsure && !validOptions.some((o) => o.toLowerCase().includes("unsure"))) {
        validOptions.push("Unsure / No opinion");
      }

      const optionRows = validOptions.map((optionText, index) => ({
        poll_id: poll.id,
        option_text: sanitiseText(optionText.trim(), 500),
        order_index: index,
      }));
      const { error: optErr } = await supabase.from("poll_options").insert(optionRows.map((r) => cleanForDB(r)));
      if (optErr) throw new Error(optErr.message || "Failed to save poll options");

      try {
        await supabase
          .from("profiles")
          .update(
            cleanForDB({
              polls_created_count: (user.polls_created_count || 0) + 1,
              last_poll_created_at: new Date().toISOString(),
            })
          )
          .eq("id", authUser.id);
      } catch {
        /* optional columns */
      }

      return poll;
    },
    onSuccess: (poll) => {
      queryClient.invalidateQueries(["polls"]);
      toast.success("Poll created successfully!");
      const uid = poll?.creator_user_id || user?.id;
      if (uid && poll?.id) insertContentWatermark("poll", poll.id, uid).catch(() => {});
      navigate(createPageUrl("PollDetail") + `?id=${poll.id}`);
    },
    onError: (err) => setError(err?.message || "Failed to create poll. Please try again."),
  });

  const handleAddOption = () => {
    if (options.length < 20) setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e && e.preventDefault && e.preventDefault();
      if (tagInput.trim() && tags.length < 7 && !tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
        setTagInput("");
      }
    }
  };

  const handleAddSecondaryCategory = (val) => {
    if (val && secondaryCategories.length < 2 && !secondaryCategories.includes(val) && val !== category) {
      setSecondaryCategories([...secondaryCategories, val]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (honeypot) {
      reportHoneypotHit("create_poll");
      return;
    }

    const { allowed } = checkRateLimit("create_poll", 10, 60 * 60 * 1000);
    if (!allowed) {
      toast.error("You've created too many polls recently. Please wait before trying again.");
      return;
    }

    if (!pollIntent) return setError("Please select a poll intent");
    if (!question.trim() || question.trim().length < 5) return setError("Question must be at least 5 characters.");
    if (!category) return setError("Please select a primary category");
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) return setError("A poll needs at least 2 options.");
    if (validOptions.length > 10) return setError("Maximum 10 options allowed.");
    if (validOptions.some((o) => o.trim().length < 1)) return setError("All options must have content.");

    let endTime = null;
    if (durationMode === "7") {
      endTime = new Date();
      endTime.setDate(endTime.getDate() + 7);
      endTime.setHours(23, 59, 59, 0);
    } else if (durationMode === "30") {
      endTime = new Date();
      endTime.setDate(endTime.getDate() + 30);
      endTime.setHours(23, 59, 59, 0);
    } else if (durationMode === "custom" && customEndDate) {
      endTime = new Date(customEndDate);
      if (isNaN(endTime.getTime())) {
        setError("Invalid end date — please select a valid date");
        return;
      }
      if (endTime <= new Date()) {
        setError("End date must be in the future");
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const modRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-moderation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `${question}\n${description}\n${validOptions.join("\n")}`,
          contentType: "poll",
          contentId: "draft",
        }),
      });
      const mod = await modRes.json().catch(() => ({}));
      if (mod.flagged && mod.severity === "high") {
        setError("Content was flagged by moderation checks. Please revise and try again.");
        return;
      }
    } catch {
      /* non-blocking moderation */
    }

    createPollMutation.mutate({
      creator_user_id: user.id,
      question: question.trim(),
      description: description.trim() || "",
      category,
      tags: [...tags, ...secondaryCategories],
      poll_type: enableRankedChoice ? "ranked_choice" : allowMultipleSelection ? "multiple_choice" : "single_choice",
      result_visibility: resultVisibility,
      is_anonymous_display: false,
      allow_option_suggestions: false,
      start_time: new Date().toISOString(),
      end_time: endTime ? endTime.toISOString() : null,
      status: "open",
      location_scope: locationScope,
      audience_type: locationScope === "global" ? "global" : "country_specific",
      audience_country_code: locationScope !== "global" ? user?.country_code : null,
      location_country_code: locationScope !== "global" ? user?.country_code : null,
      allow_comments: allowComments,
      enable_discussion: allowDiscussion,
      enable_evidence: allowEvidence,
      intent_type: pollIntent,
      intent_custom: pollIntentCustom.trim() || null,
      randomize_options: randomizeOptions,
      require_comment: requireComment,
      verified_only: verifiedOnly,
      citizens_only: citizensOnly,
      min_voting_age: minVotingAge !== "none" ? parseInt(minVotingAge) : null,
      hide_vote_count: hideVoteCount,
      show_map: showMap,
      show_timeline: showTimeline,
      media_items: [],
      linked_petition_id: linkToPetition && linkedPetitionId.trim() ? linkedPetitionId.trim() : null,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 relative">
      <HoneypotField value={honeypot} onChange={(ev) => setHoneypot(ev.target.value)} inputId="poll_hp_website" name="website_url_poll" />
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create a Poll</h1>
        <p className="text-slate-500">Ask a question and gather verified public opinion.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Question & Options" },
          { n: 2, label: "Audience & Duration" },
          { n: 3, label: "Review & Publish" },
        ].map(({ n, label }) => (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === n ? "bg-blue-600 text-white" :
                step > n ? "bg-emerald-500 text-white" :
                "bg-slate-200 text-slate-500"
              }`}>
                {step > n ? "✓" : n}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step === n ? "text-blue-700" : step > n ? "text-emerald-600" : "text-slate-400"}`}>{label}</span>
            </div>
            {n < 3 && <div className={`flex-1 h-0.5 ${step > n ? "bg-emerald-400" : "bg-slate-200"}`} />}
          </React.Fragment>
        ))}
      </div>

      <FormErrorHandler error={error || createPollMutation.error} />

      {/* STEP 1: Question & Options */}
      {step === 1 && (
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">What kind of poll is this?</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {POLL_INTENTS.map(intent => (
                  <button key={intent.value} type="button" onClick={() => setPollIntent(intent.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${pollIntent === intent.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"}`}>
                    {intent.label}
                  </button>
                ))}
              </div>
              {pollIntent === "other" && (
                <input className="mt-3 w-full border border-slate-200 rounded-lg bg-white px-3 py-2 text-sm text-slate-900" placeholder="Describe the purpose..." value={pollIntentCustom} onChange={e => setPollIntentCustom(e.target.value)} maxLength={100} />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Your Question *</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <textarea
                  className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-base font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="What do you want to ask? e.g. Should the government ban single-use plastics?"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-slate-400 mt-1">{question.length}/500</p>
              </div>
              <div>
                <Label htmlFor="description" className="text-sm text-slate-600 mb-1">Context / Description (optional)</Label>
                <textarea
                  id="description"
                  className="w-full border border-slate-200 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Provide background context for voters..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  maxLength={1000}
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600 mb-1">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Answer Options *</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${OPTION_COLORS[i % OPTION_COLORS.length]}`} />
                  <Input
                    placeholder={`Option ${i + 1}${i === 0 ? " (e.g. Yes)" : i === 1 ? " (e.g. No)" : ""}`}
                    value={opt}
                    onChange={e => handleOptionChange(i, e.target.value)}
                    maxLength={200}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(i)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 20 && (
                <button type="button" onClick={handleAddOption} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2">
                  <PlusCircle className="w-4 h-4" />Add option
                </button>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Checkbox id="includeUnsure" checked={includeUnsure} onCheckedChange={setIncludeUnsure} />
                <label htmlFor="includeUnsure" className="text-sm text-slate-600 cursor-pointer">Add "Unsure / No opinion" option</label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => {
              setError("");
              if (!pollIntent) return setError("Please select a poll intent");
              if (!question.trim()) return setError("Please enter a poll question");
              if (!category) return setError("Please select a category");
              if (options.filter(o => o.trim()).length < 2) return setError("Please provide at least 2 answer options");
              setStep(2);
            }} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              Next: Audience & Duration →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Audience & Duration */}
      {step === 2 && (
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Who can vote?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2">Geographic Scope</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {LOCATION_SCOPES.map(s => (
                    <button key={s.value} type="button" onClick={() => setLocationScope(s.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${locationScope === s.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                  <span className="text-sm text-slate-700">Verified users only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={citizensOnly} onCheckedChange={setCitizensOnly} />
                  <span className="text-sm text-slate-700">Citizens only</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Duration</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[{ value: "none", label: "No end date" }, { value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "custom", label: "Custom date" }].map(d => (
                  <button key={d.value} type="button" onClick={() => setDurationMode(d.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${durationMode === d.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {durationMode === "custom" && (
                <input type="date" className="mt-3 border border-slate-200 rounded-lg bg-white px-3 py-2 text-sm text-slate-900" min={new Date().toISOString().split("T")[0]} value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Results visibility</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[{ value: "always_visible", label: "Always visible" }, { value: "visible_after_voting", label: "After voting" }, { value: "visible_when_closed", label: "After poll closes" }].map(r => (
                  <button key={r.value} type="button" onClick={() => setResultVisibility(r.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${resultVisibility === r.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              Next: Review →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Publish */}
      {step === 3 && (
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Review Your Poll</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Question</p>
                  <p className="font-semibold text-slate-900">{question}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Options</p>
                  <div className="flex flex-wrap gap-2">
                    {options.filter(o => o.trim()).map((o, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">{o}</span>
                    ))}
                    {includeUnsure && <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 italic">Unsure / No opinion</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>📍 {locationScope}</span>
                  <span>🔒 {resultVisibility.replace(/_/g, " ")}</span>
                  <span>⏱ {durationMode === "none" ? "No end date" : durationMode === "custom" ? customEndDate : `${durationMode} days`}</span>
                  {verifiedOnly && <span>✓ Verified only</span>}
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 rounded-lg p-3 border border-blue-100">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p>By publishing, you confirm this poll is genuine, respectful, and complies with community guidelines. Polls are publicly visible.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
            <Button
              onClick={(ev) => {
                ev.preventDefault();
                handleSubmit(ev);
              }}
              disabled={createPollMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10"
            >
              {createPollMutation.isPending ? (
                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />Publishing…</>
              ) : "🚀 Publish Poll"}
            </Button>
          </div>
        </div>
      )}

      {/* Legacy form hidden — kept for form reference only */}
      <form onSubmit={handleSubmit} className="hidden">

        {/* 1. Question */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Question *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Input
                placeholder="Write a clear, neutral question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
                className="text-base"
              />
              <p className="text-xs text-slate-400 text-right">{question.length}/200</p>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-slate-600">Context (optional)</Label>
              <Textarea
                placeholder="Provide background, explain why this matters, or what decision this could influence..."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1500))}
                rows={4}
              />
              <p className="text-xs text-slate-400 text-right">{description.length}/1,500</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Intent */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Poll Intent *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={pollIntent} onValueChange={setPollIntent}>
              <SelectTrigger>
                <SelectValue placeholder="What is the purpose of this poll?" />
              </SelectTrigger>
              <SelectContent>
                {POLL_INTENTS.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pollIntent === "other" && (
              <Input
                placeholder="Describe your intent..."
                value={pollIntentCustom}
                onChange={(e) => setPollIntentCustom(e.target.value)}
              />
            )}
          </CardContent>
        </Card>

        {/* 3. Category & Tags */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category & Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm text-slate-600">Primary category *</Label>
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

            {category && secondaryCategories.length < 2 && (
              <div className="space-y-1">
                <Label className="text-sm text-slate-600">Secondary category (optional, max 2)</Label>
                <Select onValueChange={handleAddSecondaryCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add secondary category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== category && !secondaryCategories.includes(c.value)).map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {secondaryCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {secondaryCategories.map(sc => {
                  const cat = CATEGORIES.find(c => c.value === sc);
                  return (
                    <Badge key={sc} variant="secondary" className="gap-1">
                      {cat?.label}
                      <button type="button" onClick={() => setSecondaryCategories(secondaryCategories.filter(c => c !== sc))}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Tags (optional, max 7)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag(e)}
                  disabled={tags.length >= 7}
                />
                <Button type="button" variant="outline" onClick={handleAddTag} disabled={tags.length >= 7}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      #{tag}
                      <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. Answer Options */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Answer Options * <span className="text-xs font-normal text-slate-400">(min 2, max 20)</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${OPTION_COLORS[index % OPTION_COLORS.length]}`} />
                <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  maxLength={120}
                />
                {options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOption(index)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 20 && (
              <Button type="button" variant="outline" onClick={handleAddOption} className="w-full mt-1">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Option
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 5. Voting Rules */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Voting Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">Standard Poll</p>
                <p className="text-xs text-slate-500">One vote per person, no duplicates</p>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">Default</Badge>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 w-full pt-1"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced voting rules
            </button>

            {showAdvanced && (
              <div className="space-y-2 pl-2 border-l-2 border-slate-100 mt-1">
                {[
                  { id: "multiple", checked: allowMultipleSelection, onChange: setAllowMultipleSelection, label: "Multiple choice" },
                  { id: "ranked", checked: enableRankedChoice, onChange: setEnableRankedChoice, label: "Ranked choice" },
                  { id: "random", checked: randomizeOptions, onChange: setRandomizeOptions, label: "Randomise option order" },
                  { id: "requirecomment", checked: requireComment, onChange: setRequireComment, label: "Require comment when voting" },
                  { id: "unsure", checked: includeUnsure, onChange: setIncludeUnsure, label: 'Include "Unsure / No opinion" option' },
                ].map(rule => (
                  <div key={rule.id} className="flex items-center gap-2">
                    <Checkbox id={rule.id} checked={rule.checked} onCheckedChange={rule.onChange} />
                    <Label htmlFor={rule.id} className="text-sm cursor-pointer">{rule.label}</Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Location Scope */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Location Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={locationScope} onValueChange={setLocationScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_SCOPES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox id="citizens" checked={citizensOnly} onCheckedChange={setCitizensOnly} />
                <Label htmlFor="citizens" className="text-sm cursor-pointer">Citizens only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="verified" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                <Label htmlFor="verified" className="text-sm cursor-pointer">
                  Require full identity verification to vote
                  <span className="ml-1 text-xs text-blue-600 font-normal">(Stripe $12.99 AUD)</span>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600 w-28">Minimum age</Label>
                <Select value={minVotingAge} onValueChange={setMinVotingAge}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No limit</SelectItem>
                    <SelectItem value="18">18+</SelectItem>
                    <SelectItem value="21">21+</SelectItem>
                    <SelectItem value="25">25+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Duration */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Duration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "none", label: "No end date" },
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
                { value: "custom", label: "Custom date" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDurationMode(opt.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    durationMode === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {durationMode === "none" && (
              <p className="text-xs text-slate-400">Poll runs until you close or delete it.</p>
            )}
            {durationMode === "custom" && (
              <Input
                type="datetime-local"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            )}
          </CardContent>
        </Card>

        {/* 8. Results */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Result Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm text-slate-600">Visibility</Label>
              <Select value={resultVisibility} onValueChange={setResultVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always_visible">Always visible</SelectItem>
                  <SelectItem value="visible_after_voting">Visible after voting</SelectItem>
                  <SelectItem value="visible_when_closed">Visible when closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              {[
                { id: "hidevotes", checked: hideVoteCount, onChange: setHideVoteCount, label: "Hide total vote count" },
                { id: "showmap", checked: showMap, onChange: setShowMap, label: "Show geographic map" },
                { id: "timeline", checked: showTimeline, onChange: setShowTimeline, label: "Show vote timeline" },
              ].map(opt => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Checkbox id={opt.id} checked={opt.checked} onCheckedChange={opt.onChange} />
                  <Label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 9. Discussion */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comments & Discussion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { id: "comments", checked: allowComments, onChange: setAllowComments, label: "Allow comments" },
              { id: "discussion", checked: allowDiscussion, onChange: setAllowDiscussion, label: "Allow discussion threads" },
              { id: "evidence", checked: allowEvidence, onChange: setAllowEvidence, label: "Allow evidence uploads" },
            ].map(opt => (
              <div key={opt.id} className="flex items-center gap-2">
                <Checkbox id={opt.id} checked={opt.checked} onCheckedChange={opt.onChange} />
                <Label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 10. Link to Petition */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Link to a Petition (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="linkpetition" checked={linkToPetition} onCheckedChange={setLinkToPetition} />
              <Label htmlFor="linkpetition" className="text-sm cursor-pointer">
                Connect this poll to a public petition
              </Label>
            </div>
            {linkToPetition && (
              <div className="space-y-1">
                <Label className="text-sm text-slate-600">Petition ID or URL</Label>
                <Input
                  placeholder="Paste the petition ID or URL..."
                  value={linkedPetitionId}
                  onChange={e => setLinkedPetitionId(e.target.value)}
                />
                <p className="text-xs text-slate-400">
                  Linking a poll to a petition lets voters see the associated petition and support it directly.
                  You can find the petition ID in the petition's URL.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" /> Poll Image <span className="text-xs font-normal text-slate-400">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="relative inline-block w-full">
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

      </form>
    </div>
  );
}
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cleanForDB } from "@/lib/dbHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe2, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "governance_policy", label: "Governance & Policy", emoji: "🏛️" },
  { value: "environment_climate", label: "Environment & Climate", emoji: "🌍" },
  { value: "economy_living", label: "Economy & Cost of Living", emoji: "💰" },
  { value: "health_wellbeing", label: "Health & Wellbeing", emoji: "❤️" },
  { value: "education", label: "Education", emoji: "📚" },
  { value: "technology_ai", label: "Technology & AI", emoji: "🤖" },
  { value: "civil_rights_ethics", label: "Civil Rights & Ethics", emoji: "⚖️" },
  { value: "politics", label: "Politics", emoji: "🗳️" },
  { value: "global_affairs", label: "Global Affairs", emoji: "🌐" },
  { value: "community", label: "Community", emoji: "🤝" },
  { value: "corporate_business", label: "Corporate Accountability", emoji: "🏢" },
  { value: "news_current_events", label: "News & Current Events", emoji: "📰" },
];

const COUNTRIES = [
  { value: "AU", label: "Australia" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "NZ", label: "New Zealand" },
  { value: "IN", label: "India" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ZA", label: "South Africa" },
  { value: "NG", label: "Nigeria" },
  { value: "BR", label: "Brazil" },
  { value: "OTHER", label: "Other" },
];

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Profile
  const [fullName, setFullName] = useState(user?.full_name || "");

  // Step 2: Interests
  const [selectedInterests, setSelectedInterests] = useState([]);

  // Step 3: Location
  const [countryCode, setCountryCode] = useState(user?.country_code || "AU");

  const toggleInterest = (value) => {
    setSelectedInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const canProceed = () => {
    if (step === 1) return fullName.trim().length >= 2;
    if (step === 2) return selectedInterests.length >= 3;
    if (step === 3) return !!countryCode;
    return true;
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }
    // Step 4: finish
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    if (!user?.id) {
      toast.error("You're not signed in. Please sign in and try again.");
      navigate(createPageUrl("Home"), { replace: true });
      return;
    }

    setSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) {
        toast.error("Your session has expired. Please sign in again.");
        navigate(createPageUrl("Home"), { replace: true });
        return;
      }
      const authedUserId = session.user.id;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          cleanForDB({
            id: authedUserId,
            full_name: fullName.trim(),
            country_code: countryCode,
            onboarding_completed: true,
          }),
          { onConflict: "id" }
        )
        .select("id")
        .single();

      if (profileError) throw profileError;

      const { error: interestsError } = await supabase
        .from("user_interests")
        .upsert(
          cleanForDB({
            user_id: authedUserId,
            categories: selectedInterests,
            last_updated: new Date().toISOString(),
          }),
          { onConflict: "user_id" }
        );

      if (interestsError) {
        console.warn("Failed to save user interests during onboarding:", interestsError);
      }

      await refreshUser();
      toast.success("Welcome to Voice to Action!");
      navigate(createPageUrl("Home"), { replace: true });
    } catch (e) {
      console.error("[Onboarding] completion failed:", e);
      toast.error(e?.message || "Failed to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <Globe2 className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-slate-900 text-xl">Voice to Action</span>
      </div>

      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}% complete</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {/* Step 1: Name */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">What's your name?</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your name is shown on your petitions, comments and profile.
            </p>
            <div>
              <Label htmlFor="ob-name">Full name</Label>
              <Input
                id="ob-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1 text-base"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              What do you care about?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Select at least 3 topics to personalise your feed.{" "}
              <span className="font-medium text-slate-700">
                {selectedInterests.length} selected
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const selected = selectedInterests.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleInterest(cat.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span className="leading-tight">{cat.label}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Country */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Where are you based?</h2>
            <p className="text-slate-500 text-sm mb-6">
              We use this to show you relevant local petitions and issues.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCountryCode(c.value)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    countryCode === c.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {c.label}
                  {countryCode === c.value && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Community guidelines */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Our community values
            </h2>
            <p className="text-slate-500 text-sm mb-5">
              Voice to Action is a space for constructive civic action. By joining, you agree to:
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "Engage respectfully with others, even when you disagree",
                "Share accurate information — no deliberate misinformation",
                "Support petitions and causes you genuinely believe in",
                "Respect the privacy of other community members",
                "Follow our Terms of Service and Community Guidelines",
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400">
              By continuing, you accept our{" "}
              <a href="/TermsOfService" className="text-blue-600 hover:underline" target="_blank">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/PrivacyPolicy" className="text-blue-600 hover:underline" target="_blank">
                Privacy Policy
              </a>.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-md mt-6 flex items-center justify-between">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={handleNext}
          disabled={!canProceed() || saving}
          className="bg-blue-600 hover:bg-blue-700 gap-2 px-6"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : step === TOTAL_STEPS ? (
            <>Let's go! <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Continue <ChevronRight className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

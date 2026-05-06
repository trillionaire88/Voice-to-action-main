import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, FileText, Users, Shield } from "lucide-react";

const ONBOARDING_KEY = "vta_onboarding_dismissed_v1";

export default function OnboardingBanner({ user }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY)) setDismissed(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setDismissed(true);
  };

  if (!user || dismissed) return null;

  const steps = [
    {
      id: "verify_email",
      label: "Verify your email",
      description: "Confirm your email to start signing petitions",
      done: user.is_verified || user.email_verified || user.is_email_verified,
      action: () => navigate(createPageUrl("SecuritySettings")),
      icon: Shield,
    },
    {
      id: "sign_petition",
      label: "Sign your first petition",
      description: "Find a cause you care about and add your voice",
      done: (user.petitions_signed_count || 0) > 0,
      action: () => navigate(createPageUrl("Petitions")),
      icon: FileText,
    },
    {
      id: "join_community",
      label: "Join a community",
      description: "Connect with others who share your values",
      done: false,
      action: () => navigate(createPageUrl("Communities")),
      icon: Users,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  if (completedCount === steps.length) { dismiss(); return null; }
  const nextStep = steps.find(s => !s.done);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 mb-6 text-white relative">
      <button onClick={dismiss} className="absolute top-3 right-3 text-blue-200 hover:text-white transition-colors" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>

      <div className="mb-4">
        <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide mb-1">
          Getting started — {completedCount} of {steps.length} done
        </p>
        <div className="w-full bg-blue-500/50 rounded-full h-1.5">
          <div className="bg-white rounded-full h-1.5 transition-all duration-500" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`rounded-xl p-3 flex items-start gap-2.5 transition-all ${step.done ? "bg-white/10 opacity-60" : "bg-white/15 cursor-pointer hover:bg-white/25"}`}
              onClick={step.done ? undefined : step.action}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-emerald-400" : "bg-white/20"}`}>
                {step.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${step.done ? "line-through text-blue-200" : "text-white"}`}>{step.label}</p>
                <p className="text-xs text-blue-200 mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {nextStep && (
        <Button onClick={nextStep.action} className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm h-9" size="sm">
          Next: {nextStep.label} →
        </Button>
      )}
    </div>
  );
}
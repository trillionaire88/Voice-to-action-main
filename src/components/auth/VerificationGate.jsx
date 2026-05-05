import React from "react";
import { createPageUrl } from "@/utils";
import { Shield, CheckCircle2 } from "lucide-react";

export function userHasBlueCheckmark(user) {
  if (!user) return false;
  return !!(user.is_blue_verified || user.is_kyc_verified || user.paid_identity_verification_completed || user.is_verified || user.identity_verified);
}

export function userPassesGate(user, requireFullVerification) {
  if (!user) return false;
  if (user.is_public_figure) return true;
  if (requireFullVerification) return userHasBlueCheckmark(user);
  return !!(user.is_email_verified || user.is_phone_verified || userHasBlueCheckmark(user));
}

export default function VerificationGate({ user, requireFullVerification = false, action = "interact", children }) {
  if (!user) {
    return (
      <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <Shield className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="font-semibold text-slate-700">Sign in to {action}</p>
        <a href={createPageUrl("Home")} className="inline-block text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors">
          Sign In
        </a>
      </div>
    );
  }

  if (userPassesGate(user, requireFullVerification)) return children;

  if (requireFullVerification) {
    return (
      <div className="text-center py-6 bg-blue-50 rounded-xl border border-blue-200 space-y-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-blue-900 text-base">Blue Checkmark Required</span>
        </div>
        <p className="text-blue-700 text-sm max-w-xs mx-auto">
          To {action}, you need a verified Blue Checkmark. This is a one-time $12.99 AUD identity verification through Stripe.
        </p>
        <a href={createPageUrl("GetVerified")} className="inline-block text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors">
          Get Verified — $12.99 AUD
        </a>
      </div>
    );
  }

  return (
    <div className="text-center py-5 bg-amber-50 rounded-xl border border-amber-200 space-y-2 px-4">
      <p className="font-semibold text-amber-800 text-sm">Verify your email to {action}</p>
      <p className="text-amber-700 text-xs max-w-xs mx-auto">A quick free email verification lets you participate.</p>
      <a href={createPageUrl("SecuritySettings")} className="inline-block text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">Verify Email — Free</a>
    </div>
  );
}
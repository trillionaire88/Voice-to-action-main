import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const CONSENT_KEY = "vta_cookie_consent_v1";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString(), version: "1" }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, essential_only: true, date: new Date().toISOString(), version: "1" }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-slate-200 shadow-2xl px-4 py-4 md:py-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 hidden sm:block" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 mb-0.5">We use cookies & local storage</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Voice to Action uses essential cookies for authentication and security, and optional analytics cookies
            to improve the platform. We never sell your data. By clicking "Accept", you consent to all cookies.
            "Essential Only" uses only what's required for the platform to function.
            Read our{" "}
            <a href="/TermsOfService" className="underline text-blue-600">Terms of Service</a>
            {" "}and{" "}
            <a href="/LegalSettings" className="underline text-blue-600">Privacy Policy</a>.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={decline} className="flex-1 sm:flex-none border-slate-300 text-slate-700 text-xs h-9">
            Essential Only
          </Button>
          <Button size="sm" onClick={accept} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
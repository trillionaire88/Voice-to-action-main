import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";

export default function CookieConsentBanner() {
  const [openPrefs, setOpenPrefs] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });
  const hiddenUntil = Number(localStorage.getItem("cookie-banner-hidden-until") || "0");
  const consent = localStorage.getItem("cookie-consent-v2");
  if (consent || Date.now() < hiddenUntil) return null;

  const save = async (payload) => {
    localStorage.setItem("cookie-consent-v2", JSON.stringify(payload));
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await supabase.from("privacy_consents").insert([
        cleanForDB({ user_id: user.id, consent_type: "cookies", consented: true }),
        cleanForDB({ user_id: user.id, consent_type: "analytics", consented: !!payload.analytics }),
        cleanForDB({ user_id: user.id, consent_type: "marketing", consented: !!payload.marketing }),
      ]);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border shadow-xl rounded-2xl p-4">
        <p className="text-sm text-slate-700">We use cookies to improve performance and comply with privacy laws.</p>
        <div className="flex gap-2 mt-3">
          <Button onClick={() => save({ essential: true, analytics: true, marketing: true })}>Accept All</Button>
          <Button variant="outline" onClick={() => save({ essential: true, analytics: false, marketing: false })}>Reject Non-Essential</Button>
          <Button variant="ghost" onClick={() => setOpenPrefs(true)}>Manage Preferences</Button>
        </div>
      </div>
      <Dialog open={openPrefs} onOpenChange={setOpenPrefs}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cookie Preferences</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span>Essential</span><Switch checked disabled /></div>
            <div className="flex items-center justify-between"><span>Analytics</span><Switch checked={prefs.analytics} onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: !!v }))} /></div>
            <div className="flex items-center justify-between"><span>Marketing</span><Switch checked={prefs.marketing} onCheckedChange={(v) => setPrefs((p) => ({ ...p, marketing: !!v }))} /></div>
          </div>
          <Button onClick={() => save({ essential: true, ...prefs })}>Save Preferences</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

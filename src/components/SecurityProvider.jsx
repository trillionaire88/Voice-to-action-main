import React, { useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { startInactivityTimer, stopInactivityTimer, generateSessionFingerprint, secureSessionStore } from "@/lib/security";
import { toast } from "sonner";

export default function SecurityProvider({ children }) {
  const handleSessionTimeout = useCallback(async () => {
    await supabase.auth.signOut();
    secureSessionStore.clearAll();
    toast.warning("You have been signed out due to inactivity.", { duration: 8000 });
    window.location.href = "/";
  }, []);

  useEffect(() => {
    startInactivityTimer(handleSessionTimeout);
    const fingerprint = generateSessionFingerprint();
    secureSessionStore.set("session_fingerprint", fingerprint, 1440);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") {
        const storedFingerprint = secureSessionStore.get("session_fingerprint");
        const currentFingerprint = generateSessionFingerprint();
        if (storedFingerprint && storedFingerprint !== currentFingerprint) {
          console.warn("[Security] Session fingerprint mismatch detected");
        }
      }
      if (event === "SIGNED_OUT") secureSessionStore.clearAll();
    });

    return () => {
      stopInactivityTimer();
      subscription.unsubscribe();
    };
  }, [handleSessionTimeout]);

  return <>{children}</>;
}

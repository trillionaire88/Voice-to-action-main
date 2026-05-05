import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import ToSAcceptanceModal from "./ToSAcceptanceModal";

const TOS_LOCAL_STORAGE_KEY = "vta-tos-accepted";

export default function ToSGate({ children, user }) {
  const [showToSModal, setShowToSModal] = useState(false);

  const localAccepted = useCallback(() => {
    try {
      return localStorage.getItem(TOS_LOCAL_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Fast path: local cache says already accepted.
    if (localAccepted()) return;

    // Slower path: check Supabase so acceptance carries across devices/reinstalls.
    supabase
      .from("terms_acceptances")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // Cache locally so future loads skip the DB round-trip.
          try {
            localStorage.setItem(TOS_LOCAL_STORAGE_KEY, "1");
          } catch { /* ignore */ }
        } else {
          setShowToSModal(true);
        }
      })
      .catch(() => {
        // If the query fails (e.g. Supabase not configured), fall back to showing the modal.
        setShowToSModal(true);
      });
  }, [user, localAccepted]);

  const saveAcceptanceInBackground = useCallback(() => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      session_id: `tos-${Date.now()}`,
      accepted_at: new Date().toISOString(),
      ip_address: "recorded",
      user_agent: navigator.userAgent,
    };
    supabase.from("terms_acceptances").insert(cleanForDB(payload)).catch(() => {});
  }, [user]);

  const handleAccepted = () => {
    setShowToSModal(false);
    try {
      localStorage.setItem(TOS_LOCAL_STORAGE_KEY, "1");
    } catch { /* ignore */ }
    saveAcceptanceInBackground();
  };

  const handleDecline = () => {
    supabase.auth.signOut();
  };

  return (
    <>
      {children}
      {showToSModal && (
        <ToSAcceptanceModal
          user={user}
          onAccepted={handleAccepted}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}

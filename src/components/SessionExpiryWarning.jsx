import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function SessionExpiryWarning() {
  const { isSessionExpired } = useAuth();
  if (!isSessionExpired) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 flex items-center justify-between">
      <span>Your session is about to expire. Click here to stay logged in.</span>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300"
        onClick={() => supabase.auth.refreshSession()}
      >
        Stay logged in
      </Button>
    </div>
  );
}

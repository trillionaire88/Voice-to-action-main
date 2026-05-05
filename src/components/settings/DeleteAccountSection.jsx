import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useReAuth } from "@/components/ReAuthModal";

export default function DeleteAccountSection() {
  const [deletionConfirmText, setDeletionConfirmText] = useState("");
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const { requireReAuth } = useReAuth();

  const submitDeletion = async () => {
    if (deletionConfirmText !== "DELETE MY ACCOUNT") {
      toast.error('Please type "DELETE MY ACCOUNT" exactly to confirm.');
      return;
    }

    setRequestingDeletion(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const base = import.meta.env.VITE_SUPABASE_URL;
      if (!base) throw new Error("Configuration error");
      const res = await fetch(`${base}/functions/v1/process-data-deletion`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "request" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDeletionRequested(true);
      toast.success("Deletion request submitted. You will be contacted within 30 days.");
    } catch (err) {
      toast.error(err.message || "Failed to submit deletion request");
    } finally {
      setRequestingDeletion(false);
    }
  };

  const handleRequestDeletion = async () => {
    await requireReAuth(submitDeletion);
  };

  if (deletionRequested) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 shadow-sm mb-6">
        <CardContent className="pt-4 pb-4 text-center">
          <p className="text-emerald-800 font-medium">Deletion request received.</p>
          <p className="text-sm text-emerald-600 mt-1">
            We will process it within 30 days and email you confirmation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 shadow-sm mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Delete My Account & Data
        </CardTitle>
        <p className="text-xs text-slate-500">
          Request full erasure of your account and all associated data under the Australian Privacy Act 1988.
          This cannot be undone. Petitions you created will be archived anonymously.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-700">
          Type <strong>DELETE MY ACCOUNT</strong> to confirm:
        </p>
        <Input
          value={deletionConfirmText}
          onChange={(e) => setDeletionConfirmText(e.target.value)}
          placeholder="DELETE MY ACCOUNT"
          className="bg-white text-slate-900 border-red-300 font-mono"
        />
        <Button
          onClick={handleRequestDeletion}
          disabled={requestingDeletion || deletionConfirmText !== "DELETE MY ACCOUNT"}
          className="bg-red-600 hover:bg-red-700 w-full"
        >
          {requestingDeletion ? "Submitting..." : "Submit Deletion Request"}
        </Button>
      </CardContent>
    </Card>
  );
}

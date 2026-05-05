import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Download } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";

export default function PetitionExportModal({ petition, onClose }) {
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email(s): ${invalidEmails.join(", ")}`);
      return;
    }

    const exportEmailsMeta = emails.join(",");
    if (exportEmailsMeta.length > 450) {
      toast.error("Too many recipients — shorten the list (Stripe metadata limit).");
      return;
    }

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      sessionStorage.setItem(
        `petition_export_emails_${petition.id}`,
        JSON.stringify(emails),
      );

      await initiateStripeCheckout({
        payment_type: "petition_export",
        success_url: `${window.location.origin}/PetitionDetail?id=${petition.id}&exported=1`,
        cancel_url: `${window.location.origin}/PetitionDetail?id=${petition.id}&payment_cancelled=1`,
        metadata: {
          user_id: user.id,
          petition_id: petition.id,
          export_emails: exportEmailsMeta,
        },
      });
      // Redirect leaves the page; no further client-side send.
    } catch (e) {
      console.error("Export error:", e);
      toast.error("Failed to start checkout: " + e.message);
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Export Petition Data
          </DialogTitle>
          <DialogDescription>
            Send petition details and signatures to your email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Export includes petition details, all {petition.signature_count_total || 0} signatures, and credibility scores.
                </AlertDescription>
              </Alert>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address(es)
                </label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="user@example.com
user2@example.com
user3@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none h-24"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter one or more email addresses (one per line or comma-separated). After payment, recipients receive the export by email.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={sending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !emailInput.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Redirecting…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-4 w-4" />
                      Pay & send export
                    </span>
                  )}
                </Button>
              </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

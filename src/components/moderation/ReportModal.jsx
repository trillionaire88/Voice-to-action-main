import { useState } from "react";
import { api } from '@/api/client';
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Flag } from "lucide-react";
import { toast } from "sonner";

const REPORT_REASONS = [
  { value: "threats_of_violence", label: "Threats of violence", critical: true },
  { value: "harassment_bullying", label: "Harassment or bullying" },
  { value: "defamation_false_accusations", label: "Defamation or false accusations" },
  { value: "illegal_activity", label: "Illegal activity" },
  { value: "spam_scams", label: "Spam or scams" },
  { value: "other", label: "Other concerns" },
];

const TYPE_LABELS = {
  poll: "Poll", comment: "Comment", petition: "Petition",
  community: "Community", charity: "Charity", user: "User",
};

// Generate a simple browser fingerprint from available signals
function getBrowserFingerprint() {
  const signals = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || "",
  ].join("|");
  // Simple hash
  let hash = 0;
  for (let i = 0; i < signals.length; i++) {
    hash = ((hash << 5) - hash) + signals.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Calculate trust level and weight for a reporter
function calcReporterTrust(user, existingReports) {
  if (!user) return { level: "normal", weight: 1 };

  const accountAgeDays = user.created_date
    ? (Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  if (accountAgeDays < 1) return { level: "very_low", weight: 0.1 };
  if (accountAgeDays < 7) return { level: "low", weight: 0.25 };

  if (user.is_verified && accountAgeDays > 30) return { level: "high", weight: 2 };
  if (accountAgeDays > 30) return { level: "normal", weight: 1 };

  return { level: "low", weight: 0.25 };
}

export default function ReportModal({ targetType, targetId, targetPreview = "", targetAuthorId = "", onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const { user } = useAuth();
  const fingerprint = getBrowserFingerprint();

  if (!user) {
    onClose();
    return null;
  }

  const { data: existingReports = [] } = useQuery({
    queryKey: ["reportsForTarget", targetId],
    queryFn: () => api.entities.Report.filter({ target_id: targetId }),
    enabled: !!targetId,
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to report");
      const now = new Date();
      const past5min = new Date(now - 5 * 60 * 1000);
      const past30min = new Date(now - 30 * 60 * 1000);
      const past2h = new Date(now - 2 * 60 * 60 * 1000);
      const past24h = new Date(now - 24 * 60 * 60 * 1000);

      const reportsIn5min = existingReports.filter(r => new Date(r.created_date) > past5min).length;
      const reportsIn30min = existingReports.filter(r => new Date(r.created_date) > past30min).length;
      const reportsIn2h = existingReports.filter(r => new Date(r.created_date) > past2h).length;
      const recentReports = existingReports.filter(r => new Date(r.created_date) > past24h);
      const totalReports = existingReports.length + 1;

      // Brigade detection
      const brigadeTriggered =
        (reportsIn5min + 1) >= 5 ||
        (reportsIn30min + 1) >= 15 ||
        (reportsIn2h + 1) >= 25;

      // Same IP / fingerprint check
      const sameFingerprint = existingReports.filter(r => r.reporter_device_fingerprint === fingerprint).length;
      const isSuspectReporter = sameFingerprint >= 2;

      // Trust scoring
      const accountAgeDays = user?.created_date
        ? (Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      const { level: trustLevel, weight: reportWeight } = calcReporterTrust(user, existingReports);
      const isLowTrust = trustLevel === "low" || trustLevel === "very_low";

      // Calculate weighted total score for this content
      const weightedScore = existingReports.reduce((sum, r) => sum + (r.report_weight || 1), 0) + reportWeight;

      // Escalation uses weighted score thresholds (raw thresholds × avg weight)
      const isViolence = reason === "threats_of_violence";
      const isHighPriority = isViolence || weightedScore >= 5 || brigadeTriggered;
      const autoHide = weightedScore >= 10 || (isViolence && existingReports.filter(r => r.reason === "threats_of_violence").length >= 1);
      const priority = isViolence ? "critical" : brigadeTriggered ? "high" : isHighPriority ? "high" : "medium";

      // Brigade flag reason text
      let brigadeFlagReason = null;
      if (brigadeTriggered) {
        if ((reportsIn5min + 1) >= 5) brigadeFlagReason = `${reportsIn5min + 1} reports in 5 minutes`;
        else if ((reportsIn30min + 1) >= 15) brigadeFlagReason = `${reportsIn30min + 1} reports in 30 minutes`;
        else brigadeFlagReason = `${reportsIn2h + 1} reports in 2 hours`;
      } else if (isSuspectReporter) {
        brigadeFlagReason = `Same device fingerprint seen ${sameFingerprint + 1} times on this content`;
      }

      const report = await api.entities.Report.create({
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        target_preview: targetPreview?.substring(0, 300) || "",
        target_author_id: targetAuthorId,
        reason,
        comments: details,
        priority,
        is_high_priority: isHighPriority,
        auto_hidden: autoHide,
        report_count_at_submission: totalReports,
        status: "open",
        reporter_device_fingerprint: fingerprint,
        reporter_account_age_days: Math.floor(accountAgeDays),
        reporter_trust_level: trustLevel,
        report_weight: reportWeight,
        is_brigade_suspect: brigadeTriggered || isSuspectReporter,
        brigade_flag_reason: brigadeFlagReason || null,
        is_low_trust: isLowTrust,
        owner_notified: false,
      });

      // Auto-hide content if threshold met (only if NOT a brigade — protect against false removal)
      if (autoHide && !brigadeTriggered) {
        if (targetType === "comment") {
          await api.entities.Comment.update(targetId, { is_removed: true, removal_reason_code: "auto_hidden_reports" });
        } else if (targetType === "poll") {
          await api.entities.Poll.update(targetId, { visibility_limited: true });
        } else if (targetType === "petition") {
          await api.entities.Petition.update(targetId, { moderation_status: "pending_review" });
        }
      }

      // Notify admin — include brigade alert details if triggered
      if (isHighPriority || brigadeTriggered) {
        const { data: admins = [] } = await supabase.from("admin_contact_directory").select("id, email, display_name, full_name").limit(50);
        for (const admin of admins || []) {
          if (admin.email) {
            await api.integrations.Core.SendEmail({
              to: admin.email,
              subject: brigadeTriggered
                ? `🚨 BRIGADE ALERT — Coordinated reporting detected on ${TYPE_LABELS[targetType]}`
                : `🚨 HIGH PRIORITY REPORT — ${TYPE_LABELS[targetType]} reported`,
              body: brigadeTriggered
                ? `A BRIGADE ALERT has been triggered on Voice to Action.\n\n` +
                  `Content Type: ${TYPE_LABELS[targetType]}\n` +
                  `Content ID: ${targetId}\n` +
                  `Content Preview: ${targetPreview?.substring(0, 200) || "N/A"}\n\n` +
                  `REPORT TIMELINE:\n` +
                  `  • Reports in last 5 min: ${reportsIn5min + 1}\n` +
                  `  • Reports in last 30 min: ${reportsIn30min + 1}\n` +
                  `  • Reports in last 2 hours: ${reportsIn2h + 1}\n` +
                  `  • Reports in last 24h: ${recentReports.length + 1}\n\n` +
                  `TRUST ANALYSIS:\n` +
                  `  • Weighted score: ${weightedScore.toFixed(1)}\n` +
                  `  • Low trust reports: ${existingReports.filter(r => r.is_low_trust).length}\n` +
                  `  • Same device reports: ${sameFingerprint}\n\n` +
                  `NOTE: Auto-hide was NOT applied due to brigade suspicion. Review manually.\n\n` +
                  `Review in Master Admin → Moderation → Brigade Review.`
                : `A high priority report has been submitted.\n\n` +
                  `Content Type: ${TYPE_LABELS[targetType]}\n` +
                  `Report Reason: ${reason.replace(/_/g, " ")}\n` +
                  `Weighted Score: ${weightedScore.toFixed(1)}\n` +
                  `Reporter Trust: ${trustLevel}\n` +
                  `Auto-hidden: ${autoHide ? "YES" : "No"}\n\n` +
                  `Review in the Moderation Dashboard.`,
            });
          }
        }
        await api.entities.Report.update(report.id, { owner_notified: true });
      }

      return { report, brigadeTriggered };
    },
    onSuccess: ({ report, brigadeTriggered }) => {
      if (brigadeTriggered) {
        toast.success("Report submitted. Note: unusual report activity detected on this content — it will be manually reviewed.");
      } else if (report.is_high_priority) {
        toast.warning("Report submitted and flagged HIGH PRIORITY. The platform owner has been notified.");
      } else {
        toast.success("Report submitted. Our moderators will review it.");
      }
      onClose();
    },
    onError: () => toast.error("Failed to submit report. Please try again."),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) { toast.error("Please select a reason"); return; }
    reportMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-600" />
            Report {TYPE_LABELS[targetType] || "Content"}
          </DialogTitle>
        </DialogHeader>

        {targetPreview && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border border-slate-200 line-clamp-3 italic">
            "{targetPreview.substring(0, 200)}{targetPreview.length > 200 ? "..." : ""}"
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Report Category *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.critical && "🚨 "}{r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reason === "threats_of_violence" && (
              <p className="text-xs text-red-600 font-medium">⚠️ This category triggers an immediate alert to the platform owner.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional Details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide any additional context..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={reportMutation.isPending || !reason} className="bg-orange-600 hover:bg-orange-700">
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
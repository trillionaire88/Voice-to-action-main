import { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle, Eye, EyeOff, Trash2, AlertTriangle, UserX, Ban, CheckCircle2, Flag, Shield
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const REASON_LABELS = {
  threats_of_violence: "🚨 Threats of Violence",
  harassment_bullying: "Harassment / Bullying",
  defamation_false_accusations: "Defamation / False Accusations",
  illegal_activity: "Illegal Activity",
  spam_scams: "Spam / Scams",
  other: "Other",
  // legacy
  hate_speech: "Hate Speech", harassment: "Harassment", spam: "Spam",
  misinformation: "Misinformation", illegal_content: "Illegal Content",
};

const TYPE_LABELS = {
  poll: "Poll", comment: "Comment", petition: "Petition",
  community: "Community", charity: "Charity", user: "User",
};

const PRIORITY_COLORS = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-slate-100 text-slate-600",
};

export default function ModerationPanel({ adminUser }) {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionNotes, setActionNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("open");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["allReports"],
    queryFn: () => api.entities.Report.list("-created_date", 100),
  });

  const { data: moderationLogs = [] } = useQuery({
    queryKey: ["modLogs"],
    queryFn: () => api.entities.ModerationLog.list("-created_date", 50),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action }) => {
      const report = selectedReport;
      if (!actionNotes.trim()) throw new Error("Notes required");

      // 1. Mark report resolved
      await api.entities.Report.update(report.id, {
        status: "action_taken",
        handled_by_user_id: adminUser.id,
        resolution_notes: actionNotes,
        resolved_at: new Date().toISOString(),
      });

      // 2. Take the action
      let actionType = action;
      if (action === "remove_content") {
        if (report.target_type === "poll") {
          await api.entities.Poll.update(report.target_id, { status: "removed" });
          actionType = "poll_removed";
        } else if (report.target_type === "comment") {
          await api.entities.Comment.update(report.target_id, { is_removed: true, removal_reason_code: "removed_by_moderator", removal_policy_ref: actionNotes });
          actionType = "comment_removed";
        } else if (report.target_type === "petition") {
          await api.entities.Petition.update(report.target_id, { status: "rejected", moderation_notes: actionNotes });
          actionType = "petition_removed";
        }
      } else if (action === "hide_content") {
        if (report.target_type === "poll") {
          await api.entities.Poll.update(report.target_id, { visibility_limited: true });
        } else if (report.target_type === "comment") {
          await api.entities.Comment.update(report.target_id, { is_removed: true });
        }
        actionType = "content_hidden";
      } else if (action === "warn_user" && report.target_author_id) {
        actionType = "user_warned";
        // Send warning email
        const users = await api.entities.User.filter({ id: report.target_author_id });
        if (users[0]?.email) {
          await api.integrations.Core.SendEmail({
            to: users[0].email,
            subject: "⚠️ Content Warning — Voice to Action",
            body: `Your content on Voice to Action has been reviewed by our moderation team.\n\nAction Taken: Warning issued\nReason: ${actionNotes}\n\nPlease review our Community Guidelines. Repeated violations may result in account suspension or permanent ban.\n\nVoice to Action Moderation Team`,
          });
        }
      } else if (action === "suspend_user" && report.target_author_id) {
        const suspendUntil = new Date();
        suspendUntil.setDate(suspendUntil.getDate() + 7);
        await api.entities.User.update(report.target_author_id, {
          is_suspended: true,
          suspension_end_date: suspendUntil.toISOString(),
        });
        actionType = "user_suspended";
        const users = await api.entities.User.filter({ id: report.target_author_id });
        if (users[0]?.email) {
          await api.integrations.Core.SendEmail({
            to: users[0].email,
            subject: "🚫 Account Suspended — Voice to Action",
            body: `Your account has been temporarily suspended for 7 days.\n\nReason: ${actionNotes}\n\nIf you believe this is in error, please contact support.\n\nVoice to Action Moderation Team`,
          });
        }
      } else if (action === "ban_user" && report.target_author_id) {
        await api.entities.User.update(report.target_author_id, {
          is_suspended: true,
          suspension_end_date: new Date("2099-01-01").toISOString(),
        });
        actionType = "user_banned";
        const users = await api.entities.User.filter({ id: report.target_author_id });
        if (users[0]?.email) {
          await api.integrations.Core.SendEmail({
            to: users[0].email,
            subject: "🚫 Account Permanently Banned — Voice to Action",
            body: `Your account has been permanently banned from Voice to Action.\n\nReason: ${actionNotes}\n\nThis decision is final.\n\nVoice to Action Moderation Team`,
          });
        }
      } else if (action === "dismiss") {
        await api.entities.Report.update(report.id, { status: "dismissed" });
        actionType = "report_dismissed";
      }

      // 3. Log the action
      await api.entities.ModerationLog.create({
        moderator_user_id: adminUser.id,
        action_type: actionType,
        target_type: report.target_type,
        target_id: report.target_id,
        affected_user_id: report.target_author_id || "",
        reason: actionNotes,
        details: { report_id: report.id, report_reason: report.reason },
        user_notified: ["warn_user", "suspend_user", "ban_user"].includes(action),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allReports"]);
      queryClient.invalidateQueries(["modLogs"]);
      toast.success("Action completed and logged.");
      setSelectedReport(null);
      setActionNotes("");
    },
    onError: (err) => toast.error(err.message || "Action failed"),
  });

  const filtered = reports.filter(r => filterStatus === "all" ? true : r.status === filterStatus);
  const highPriority = reports.filter(r => r.is_high_priority && r.status === "open");

  return (
    <div className="space-y-6">
      {/* High Priority Alert */}
      {highPriority.length > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-bold text-red-800 text-lg">🚨 {highPriority.length} HIGH PRIORITY Report{highPriority.length > 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {highPriority.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200">
                <div className="text-sm">
                  <span className="font-semibold text-red-800">{REASON_LABELS[r.reason]}</span>
                  <span className="text-slate-500 ml-2">on {TYPE_LABELS[r.target_type]}</span>
                  <span className="text-slate-400 ml-2 text-xs">{formatDistanceToNow(new Date(r.created_date), { addSuffix: true })}</span>
                </div>
                <Button size="sm" onClick={() => setSelectedReport(r)} className="bg-red-600 hover:bg-red-700 text-white">
                  Review Now
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["open", "under_review", "action_taken", "dismissed", "all"].map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"}
            onClick={() => setFilterStatus(s)}
            className={filterStatus === s ? "bg-orange-600 hover:bg-orange-700" : ""}>
            {s.replace(/_/g, " ")}
            <Badge className="ml-1.5 bg-white/20 text-inherit text-xs">{s === "all" ? reports.length : reports.filter(r => r.status === s).length}</Badge>
          </Button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <p>No reports in this category.</p>
          </div>
        ) : filtered.map(report => (
          <Card key={report.id} className={`border-slate-200 ${report.is_high_priority && report.status === "open" ? "border-red-300 bg-red-50/30" : ""}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={PRIORITY_COLORS[report.priority] || ""}>{report.priority?.toUpperCase()}</Badge>
                    <Badge variant="outline">{TYPE_LABELS[report.target_type]}</Badge>
                    <span className="text-sm font-semibold text-slate-800">{REASON_LABELS[report.reason]}</span>
                    {report.auto_hidden && <Badge className="bg-amber-100 text-amber-800 border-amber-300">Auto-hidden</Badge>}
                  </div>
                  {report.target_preview && (
                    <p className="text-xs text-slate-500 italic line-clamp-2 mb-1">"{report.target_preview}"</p>
                  )}
                  {report.comments && (
                    <p className="text-xs text-slate-600 mb-1">Note: {report.comments}</p>
                  )}
                  <p className="text-xs text-slate-400">{format(new Date(report.created_date), "MMM d, yyyy HH:mm")} · Report #{report.id.slice(0, 8)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {report.status === "open" && (
                    <Button size="sm" onClick={() => setSelectedReport(report)} className="bg-orange-600 hover:bg-orange-700 text-white">
                      <Eye className="w-3.5 h-3.5 mr-1" />Review
                    </Button>
                  )}
                  {report.status !== "open" && (
                    <Badge className={report.status === "action_taken" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                      {report.status.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Mod Logs */}
      {moderationLogs.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Recent Moderation Log</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {moderationLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-medium text-slate-700">{log.action_type.replace(/_/g, " ")}</span>
                <span className="text-slate-500">{log.target_type} · {log.target_id.slice(0, 8)}</span>
                <span className="text-slate-400">{format(new Date(log.created_date), "MMM d HH:mm")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      {selectedReport && (
        <Dialog open={true} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-600" />
                Review Report — {TYPE_LABELS[selectedReport.target_type]}
                {selectedReport.is_high_priority && <Badge className="bg-red-600 text-white">HIGH PRIORITY</Badge>}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Report Details */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-red-800">{REASON_LABELS[selectedReport.reason]}</span>
                </div>
                <div><span className="text-slate-500">Content Type:</span> <span className="font-medium">{TYPE_LABELS[selectedReport.target_type]}</span></div>
                <div><span className="text-slate-500">Content ID:</span> <code className="bg-white px-1 rounded text-xs">{selectedReport.target_id}</code></div>
                <div><span className="text-slate-500">Author ID:</span> <code className="bg-white px-1 rounded text-xs">{selectedReport.target_author_id || "Unknown"}</code></div>
                <div><span className="text-slate-500">Reported:</span> {format(new Date(selectedReport.created_date), "PPP p")}</div>
                {selectedReport.target_preview && (
                  <div>
                    <span className="text-slate-500">Content Preview:</span>
                    <blockquote className="mt-1 italic text-slate-700 bg-white border border-slate-200 rounded p-2">"{selectedReport.target_preview}"</blockquote>
                  </div>
                )}
                {selectedReport.comments && (
                  <div><span className="text-slate-500">Reporter Note:</span> <span>{selectedReport.comments}</span></div>
                )}
              </div>

              <Separator />

              <div>
                <Label>Moderation Notes * (will be logged and may be sent to user)</Label>
                <Textarea
                  placeholder="Describe the action taken and reason..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={() => actionMutation.mutate({ action: "dismiss" })} disabled={actionMutation.isPending}>
                Dismiss Report
              </Button>
              <Button variant="outline" onClick={() => actionMutation.mutate({ action: "hide_content" })} disabled={actionMutation.isPending}>
                <EyeOff className="w-4 h-4 mr-1" />Hide Content
              </Button>
              <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => actionMutation.mutate({ action: "remove_content" })} disabled={actionMutation.isPending}>
                <Trash2 className="w-4 h-4 mr-1" />Remove Content
              </Button>
              <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => actionMutation.mutate({ action: "warn_user" })} disabled={actionMutation.isPending || !selectedReport.target_author_id}>
                <AlertTriangle className="w-4 h-4 mr-1" />Warn User
              </Button>
              <Button variant="destructive" className="bg-orange-700" onClick={() => actionMutation.mutate({ action: "suspend_user" })} disabled={actionMutation.isPending || !selectedReport.target_author_id}>
                <UserX className="w-4 h-4 mr-1" />Suspend (7d)
              </Button>
              <Button variant="destructive" onClick={() => actionMutation.mutate({ action: "ban_user" })} disabled={actionMutation.isPending || !selectedReport.target_author_id}>
                <Ban className="w-4 h-4 mr-1" />Permanent Ban
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
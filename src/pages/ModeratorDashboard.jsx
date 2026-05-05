import React, { useState, useEffect, useCallback } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle, Shield, Flag, CheckCircle2, XCircle,
  Eye, Ban, FileText, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const PAGE_SIZE = 25;

const REPORT_REASON_LABELS = {
  hate_speech: "Hate Speech",
  harassment: "Harassment",
  spam: "Spam",
  misinformation: "Misinformation",
  illegal_content: "Illegal Content",
  other: "Other",
};

const STATUS_BADGE = {
  open:          "bg-orange-50 text-orange-700 border-orange-200",
  under_review:  "bg-blue-50 text-blue-700 border-blue-200",
  action_taken:  "bg-red-50 text-red-700 border-red-200",
  dismissed:     "bg-slate-50 text-slate-700 border-slate-200",
};

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  useEffect(() => {
    api.auth.me()
      .then(u => {
        if (u.role !== "moderator" && u.role !== "admin" && u.role !== "owner_admin") {
          navigate(createPageUrl("Home")); return;
        }
        setUser(u);
      })
      .catch(() => navigate(createPageUrl("Home")))
      .finally(() => setLoading(false));
  }, []);

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", reportPage],
    queryFn: () => api.entities.Report.list("-created_date", PAGE_SIZE * reportPage),
    enabled: !!user,
  });

  const { data: moderationLogs = [] } = useQuery({
    queryKey: ["moderationLogs", logPage],
    queryFn: () => api.entities.ModerationLog.list("-created_date", PAGE_SIZE * logPage),
    enabled: !!user,
  });

  const openReports = reports.filter(r => r.status === "open");
  const underReviewReports = reports.filter(r => r.status === "under_review");
  const todayLogs = moderationLogs.filter(
    l => new Date(l.created_date).toDateString() === new Date().toDateString()
  );

  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, status, action }) => {
      await api.entities.Report.update(reportId, {
        status,
        handled_by_user_id: user.id,
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
      });
      await api.entities.ModerationLog.create({
        moderator_user_id: user.id,
        action_type: "report_reviewed",
        target_type: "report",
        target_id: reportId,
        reason: resolutionNotes,
        details: { action, report_reason: selectedReport?.reason },
      });
      if (action === "remove_poll") {
        await api.entities.Poll.update(selectedReport.target_id, { status: "removed" });
        await api.entities.ModerationLog.create({
          moderator_user_id: user.id,
          action_type: "poll_removed",
          target_type: "poll",
          target_id: selectedReport.target_id,
          reason: resolutionNotes,
        });
      } else if (action === "suspend_user") {
        const suspensionEnd = new Date();
        suspensionEnd.setDate(suspensionEnd.getDate() + 7);
        await api.entities.User.update(selectedReport.target_id, {
          is_suspended: true,
          suspension_end_date: suspensionEnd.toISOString(),
        });
        await api.entities.ModerationLog.create({
          moderator_user_id: user.id,
          action_type: "user_suspended",
          target_type: "user",
          target_id: selectedReport.target_id,
          reason: resolutionNotes,
        });
      }
    },
    onMutate: async ({ reportId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["reports"] });
      const prev = queryClient.getQueryData(["reports", reportPage]);
      queryClient.setQueryData(["reports", reportPage], old =>
        (old || []).map(r => r.id === reportId ? { ...r, status } : r)
      );
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["moderationLogs"] });
      toast.success("Report resolved successfully");
      setActionDialogOpen(false);
      setSelectedReport(null);
      setResolutionNotes("");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["reports", reportPage], ctx.prev);
      toast.error("Failed to resolve report");
    },
  });

  const handleReviewReport = useCallback(report => {
    setSelectedReport(report);
    setActionDialogOpen(true);
  }, []);

  const handleResolve = useCallback(action => {
    if (!resolutionNotes.trim()) { toast.error("Please provide resolution notes"); return; }
    resolveReportMutation.mutate({
      reportId: selectedReport.id,
      status: action === "dismiss" ? "dismissed" : "action_taken",
      action,
    });
  }, [resolutionNotes, selectedReport, resolveReportMutation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-2.5 rounded-xl flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Moderator Dashboard</h1>
          <p className="text-slate-600 text-sm">Review reports and manage content</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
        {[
          { label: "Open Reports", value: openReports.length, color: "border-orange-200 bg-orange-50", val: "text-orange-700", head: "text-orange-900" },
          { label: "Under Review", value: underReviewReports.length, color: "border-blue-200 bg-blue-50", val: "text-blue-700", head: "text-blue-900" },
          { label: "Actions Today", value: todayLogs.length, color: "border-green-200 bg-green-50", val: "text-green-700", head: "text-green-900" },
        ].map(s => (
          <Card key={s.label} className={s.color}>
            <CardHeader className="pb-1 pt-4 px-3 sm:px-6">
              <CardTitle className={`text-xs sm:text-sm font-medium ${s.head}`}>{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
              <div className={`text-2xl sm:text-3xl font-bold ${s.val}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports"><Flag className="w-4 h-4 mr-2" />Reports</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="w-4 h-4 mr-2" />Mod Logs</TabsTrigger>
        </TabsList>

        {/* ── Reports tab ─────────────────────────────── */}
        <TabsContent value="reports">
          {reports.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No Reports</h3>
                <p className="text-slate-500 text-sm">All clear! No reports to review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <Card key={report.id} className="border-slate-200 active:scale-[0.995] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Top row: type + status */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <Badge variant="outline" className="text-xs">
                            {report.target_type === "poll" ? "Poll" : "User"}
                          </Badge>
                          <Badge className={`text-xs ${STATUS_BADGE[report.status] || STATUS_BADGE.dismissed}`}>
                            {report.status?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {/* Reason */}
                        <p className="font-semibold text-slate-900 text-sm">
                          {REPORT_REASON_LABELS[report.reason] || report.reason}
                        </p>
                        {report.comments && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{report.comments}</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {format(new Date(report.created_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewReport(report)}
                        disabled={report.status === "action_taken" || report.status === "dismissed"}
                        className="flex-shrink-0 h-9"
                      >
                        <Eye className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Review</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load more */}
              {reports.length === PAGE_SIZE * reportPage && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => setReportPage(p => p + 1)}>
                    <ChevronDown className="w-4 h-4 mr-2" />Load more reports
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Moderation Logs tab ──────────────────────── */}
        <TabsContent value="logs">
          {moderationLogs.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No Actions Yet</h3>
                <p className="text-slate-500 text-sm">Moderation actions will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {moderationLogs.map(log => (
                <Card key={log.id} className="border-slate-100">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {log.action_type?.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {log.target_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>Target: {log.target_id?.substring(0, 8)}…</span>
                      <span>{format(new Date(log.created_date), "MMM d, HH:mm")}</span>
                    </div>
                    {log.reason && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{log.reason}</p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {moderationLogs.length === PAGE_SIZE * logPage && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => setLogPage(p => p + 1)}>
                    <ChevronDown className="w-4 h-4 mr-2" />Load more logs
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      {selectedReport && (
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Report Details</Label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm space-y-2">
                  <div><span className="text-slate-500">Type:</span> <span className="font-medium">{selectedReport.target_type}</span></div>
                  <div><span className="text-slate-500">Reason:</span> <span className="font-medium">{REPORT_REASON_LABELS[selectedReport.reason]}</span></div>
                  {selectedReport.comments && (
                    <div><span className="text-slate-500">Comments:</span><p className="mt-1">{selectedReport.comments}</p></div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Resolution Notes *</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the action taken and reasoning..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => handleResolve("dismiss")} disabled={resolveReportMutation.isPending}>
                <XCircle className="w-4 h-4 mr-2" />Dismiss
              </Button>
              {selectedReport.target_type === "poll" && (
                <Button variant="destructive" onClick={() => handleResolve("remove_poll")} disabled={resolveReportMutation.isPending}>
                  <Ban className="w-4 h-4 mr-2" />Remove Poll
                </Button>
              )}
              {selectedReport.target_type === "user" && (
                <Button variant="destructive" onClick={() => handleResolve("suspend_user")} disabled={resolveReportMutation.isPending}>
                  <Ban className="w-4 h-4 mr-2" />Suspend User (7 days)
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
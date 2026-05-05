import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Scale, Eye, EyeOff, Trash2, AlertTriangle, UserX, Ban,
  CheckCircle2, Clock, ExternalLink, Mail, MoreHorizontal, Search,
  Shield, User, Building2, Globe2, Flag
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const CATEGORY_LABELS = {
  defamation: "Defamation",
  harassment: "Harassment",
  threats_violent_content: "Threats / Violent Content",
  privacy_violation: "Privacy Violation",
  intellectual_property: "IP Infringement",
  other_legal: "Other Legal Concern",
};

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  under_review: "bg-blue-100 text-blue-800 border-blue-300",
  content_removed: "bg-red-100 text-red-800 border-red-300",
  content_hidden: "bg-orange-100 text-orange-800 border-orange-300",
  more_info_requested: "bg-purple-100 text-purple-800 border-purple-300",
  rejected: "bg-slate-100 text-slate-600 border-slate-300",
  warning_issued: "bg-yellow-100 text-yellow-800 border-yellow-300",
  user_suspended: "bg-orange-200 text-orange-900 border-orange-400",
  user_banned: "bg-red-200 text-red-900 border-red-400",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const CONTENT_STATUS_STYLES = {
  online: "bg-emerald-100 text-emerald-700",
  hidden_pending_review: "bg-amber-100 text-amber-700",
  permanently_removed: "bg-red-100 text-red-700",
};

export default function TakedownPanel({ adminUser }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["takedownRequests"],
    queryFn: () => api.entities.TakedownRequest.list("-created_date", 200),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action }) => {
      if (!decisionReason.trim()) throw new Error("Decision reason is required.");
      const req = selected;
      const now = new Date().toISOString();

      const statusMap = {
        remove_content: "content_removed",
        hide_content: "content_hidden",
        request_more_info: "more_info_requested",
        reject: "rejected",
        warn_user: "warning_issued",
        suspend_user: "user_suspended",
        ban_user: "user_banned",
      };

      const contentStatusMap = {
        remove_content: "permanently_removed",
        hide_content: "hidden_pending_review",
      };

      const updates = {
        status: statusMap[action] || "resolved",
        content_status: contentStatusMap[action] || req.content_status,
        decision_reason: decisionReason,
        reviewed_by_admin_id: adminUser.id,
        reviewed_at: now,
      };

      await api.entities.TakedownRequest.update(req.id, updates);

      // Log in ModerationLog
      await api.entities.ModerationLog.create({
        moderator_user_id: adminUser.id,
        action_type: action === "remove_content" ? "content_removed"
          : action === "hide_content" ? "content_hidden"
          : action === "warn_user" ? "user_warned"
          : action === "suspend_user" ? "user_suspended"
          : action === "ban_user" ? "user_banned"
          : "report_reviewed",
        target_type: "report",
        target_id: req.id,
        affected_user_id: req.detected_author_id || "",
        reason: decisionReason,
        details: { complaint_id: req.complaint_id, category: req.complaint_category, content_url: req.content_url },
        user_notified: ["remove_content", "hide_content", "warn_user", "suspend_user", "ban_user"].includes(action),
      });

      // Notify content author if action affects them
      if (["remove_content", "hide_content", "warn_user", "suspend_user", "ban_user"].includes(action) && req.detected_author_id) {
        const users = await api.entities.User.filter({ id: req.detected_author_id });
        if (users[0]?.email) {
          const actionDescriptions = {
            remove_content: "Your content has been permanently removed from Voice to Action.",
            hide_content: "Your content has been temporarily hidden pending further review.",
            warn_user: "You have received a formal warning regarding your content on Voice to Action.",
            suspend_user: "Your account has been temporarily suspended.",
            ban_user: "Your account has been permanently banned from Voice to Action.",
          };
          await api.integrations.Core.SendEmail({
            to: users[0].email,
            subject: "Notice Regarding Your Content — Voice to Action",
            body: `Dear user,\n\n${actionDescriptions[action]}\n\n` +
              `Complaint Reference: ${req.complaint_id}\n` +
              `Reason: ${decisionReason}\n\n` +
              `If you believe this action is incorrect, you may contact us to appeal this decision.\n\n` +
              `Voice to Action\nhttps://voicetoaction.com`,
          });
          await api.entities.TakedownRequest.update(req.id, { content_author_notified: true });
        }
      }

      // If requesting more info — email complainant
      if (action === "request_more_info") {
        await api.integrations.Core.SendEmail({
          to: req.email,
          subject: `Further Information Required [${req.complaint_id}] — Voice to Action`,
          body: `Dear ${req.full_name},\n\n` +
            `Thank you for your complaint [${req.complaint_id}]. Our team has reviewed your submission and requires additional information to proceed.\n\n` +
            `Message from our team:\n${decisionReason}\n\n` +
            `Please reply to this email with the requested information.\n\n` +
            `Voice to Action`,
        });
      }

      // Notify complainant of final decision
      if (["remove_content", "hide_content", "reject"].includes(action)) {
        const outcomeMsg = {
          remove_content: "The reported content has been removed from the platform.",
          hide_content: "The reported content has been temporarily hidden pending further review.",
          reject: "After careful review, we have determined that the content does not violate our policies or applicable law.",
        };
        await api.integrations.Core.SendEmail({
          to: req.email,
          subject: `Complaint Update [${req.complaint_id}] — Voice to Action`,
          body: `Dear ${req.full_name},\n\n` +
            `We have completed our review of your complaint [${req.complaint_id}].\n\n` +
            `Outcome: ${outcomeMsg[action]}\n\n` +
            `Thank you for helping us maintain a safe and lawful platform.\n\n` +
            `Voice to Action`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["takedownRequests"]);
      toast.success("Decision recorded and notifications sent.");
      setSelected(null);
      setDecisionReason("");
    },
    onError: (err) => toast.error(err.message || "Action failed."),
  });

  const filtered = requests.filter(r => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSearch = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.complaint_id?.toLowerCase().includes(search.toLowerCase()) ||
      r.content_url?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pending = requests.filter(r => r.status === "pending").length;
  const underReview = requests.filter(r => r.status === "under_review").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: pending, color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Under Review", count: underReview, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Resolved", count: requests.filter(r => ["content_removed","rejected","resolved","warning_issued"].includes(r.status)).length, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Total", count: requests.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
        ].map(s => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs font-medium mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name, ID, URL..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["pending", "under_review", "content_hidden", "resolved", "rejected", "all"].map(s => (
            <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"}
              onClick={() => setFilterStatus(s)}
              className={filterStatus === s ? "bg-blue-700 hover:bg-blue-800" : ""}>
              {s.replace(/_/g, " ")}
              <Badge className="ml-1 bg-white/20 text-inherit text-xs">{s === "all" ? requests.length : requests.filter(r => r.status === s).length}</Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Scale className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No complaints in this category.</p>
          </div>
        ) : filtered.map(req => (
          <Card key={req.id} className="border-slate-200 hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-slate-500">{req.complaint_id}</span>
                    <Badge className={`border ${STATUS_STYLES[req.status] || ""}`}>{req.status?.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">{CATEGORY_LABELS[req.complaint_category]}</Badge>
                    <Badge className={CONTENT_STATUS_STYLES[req.content_status]}>Content: {req.content_status?.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">{req.full_name}</span>
                    {req.organisation && <span className="text-slate-500">· {req.organisation}</span>}
                    <span className="text-slate-400">({req.country})</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <a href={req.content_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs" onClick={e => e.stopPropagation()}>
                      {req.content_url}
                    </a>
                  </div>
                  <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(req.created_date), { addSuffix: true })}</p>
                </div>
                {req.status === "pending" || req.status === "under_review" ? (
                  <Button size="sm" onClick={() => { setSelected(req); setDecisionReason(""); }}
                    className="bg-blue-700 hover:bg-blue-800 text-white shrink-0">
                    <Eye className="w-3.5 h-3.5 mr-1" />Review
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setSelected(req); setDecisionReason(""); }} className="shrink-0">
                    View
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Review Dialog */}
      {selected && (
        <Dialog open={true} onOpenChange={() => { setSelected(null); setDecisionReason(""); }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-700" />
                Legal Complaint — {selected.complaint_id}
                <Badge className={`border ${STATUS_STYLES[selected.status] || ""}`}>{selected.status?.replace(/_/g, " ")}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Complainant */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><User className="w-4 h-4" />Complainant</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-4">
                  <div><span className="text-slate-500">Name:</span> <span className="font-medium">{selected.full_name}</span></div>
                  <div><span className="text-slate-500">Email:</span> <span className="font-medium">{selected.email}</span></div>
                  <div><span className="text-slate-500">Phone:</span> <span>{selected.phone || "—"}</span></div>
                  <div><span className="text-slate-500">Country:</span> <span>{selected.country}</span></div>
                  {selected.organisation && <div className="sm:col-span-2"><span className="text-slate-500">Organisation:</span> <span>{selected.organisation}</span></div>}
                </div>
              </div>

              <Separator />

              {/* Complaint Details */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Flag className="w-4 h-4" />Complaint Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="font-medium">{CATEGORY_LABELS[selected.complaint_category]}</Badge>
                    <Badge className={CONTENT_STATUS_STYLES[selected.content_status]}>Content: {selected.content_status?.replace(/_/g, " ")}</Badge>
                  </div>
                  <div>
                    <span className="text-slate-500">Content URL: </span>
                    <a href={selected.content_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{selected.content_url}</a>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Description:</span>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selected.content_description}
                    </div>
                  </div>
                  <div><span className="text-slate-500">Submitted:</span> {format(new Date(selected.created_date), "PPP p")}</div>
                  {selected.reviewed_at && (
                    <div><span className="text-slate-500">Last reviewed:</span> {format(new Date(selected.reviewed_at), "PPP p")}</div>
                  )}
                  {selected.decision_reason && (
                    <div>
                      <span className="text-slate-500 block mb-1">Previous decision reason:</span>
                      <div className="bg-slate-50 border rounded-lg p-3 text-slate-700 text-sm">{selected.decision_reason}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous complaints on same URL */}
              <PreviousComplaints currentId={selected.id} contentUrl={selected.content_url} />

              <Separator />

              {/* Decision */}
              <div>
                <Label>Decision Reason / Notes <span className="text-red-500">*</span></Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder="Describe the action being taken and reason. This will be logged and may be sent to relevant parties."
                  value={decisionReason}
                  onChange={e => setDecisionReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => actionMutation.mutate({ action: "reject" })} disabled={actionMutation.isPending}>
                Reject Complaint
              </Button>
              <Button variant="outline" onClick={() => actionMutation.mutate({ action: "request_more_info" })} disabled={actionMutation.isPending} className="border-purple-300 text-purple-700 hover:bg-purple-50">
                Request More Info
              </Button>
              <Button variant="outline" onClick={() => actionMutation.mutate({ action: "hide_content" })} disabled={actionMutation.isPending} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                <EyeOff className="w-4 h-4 mr-1" />Hide Content
              </Button>
              <Button variant="outline" onClick={() => actionMutation.mutate({ action: "remove_content" })} disabled={actionMutation.isPending} className="border-red-300 text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1" />Remove Content
              </Button>
              <Button variant="outline" onClick={() => actionMutation.mutate({ action: "warn_user" })} disabled={actionMutation.isPending} className="border-yellow-400 text-yellow-700 hover:bg-yellow-50">
                <AlertTriangle className="w-4 h-4 mr-1" />Warn User
              </Button>
              <Button onClick={() => actionMutation.mutate({ action: "suspend_user" })} disabled={actionMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
                <UserX className="w-4 h-4 mr-1" />Suspend
              </Button>
              <Button onClick={() => actionMutation.mutate({ action: "ban_user" })} disabled={actionMutation.isPending} variant="destructive">
                <Ban className="w-4 h-4 mr-1" />Permanent Ban
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PreviousComplaints({ currentId, contentUrl }) {
  const { data: all = [] } = useQuery({
    queryKey: ["takedownRequests"],
    queryFn: () => api.entities.TakedownRequest.list("-created_date", 200),
  });

  const related = all.filter(r => r.id !== currentId && r.content_url === contentUrl);
  if (related.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4" />Previous Complaints on This Content ({related.length})
      </h3>
      <div className="space-y-2">
        {related.map(r => (
          <div key={r.id} className="text-xs flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <span className="font-mono text-orange-700">{r.complaint_id}</span>
            <span className="text-slate-600">{CATEGORY_LABELS[r.complaint_category]}</span>
            <span className="text-slate-500">{format(new Date(r.created_date), "MMM d, yyyy")}</span>
            <Badge className={`border ${STATUS_STYLES[r.status] || ""} text-xs`}>{r.status?.replace(/_/g, " ")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
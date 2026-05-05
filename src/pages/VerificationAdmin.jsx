import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, Shield, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS = {
  pending:  "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const TYPE_COLORS = {
  business:     "text-yellow-600",
  organisation: "text-blue-700",
  government:   "text-red-600",
  council:      "text-orange-600",
};

export default function VerificationAdmin() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("pending");
  const [notes, setNotes] = useState({});

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => api.auth.me() });
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["org-verification-requests", filterStatus],
    queryFn: () => filterStatus === "all"
      ? api.entities.OrgVerificationRequest.list("-created_date", 100)
      : api.entities.OrgVerificationRequest.filter({ status: filterStatus }, "-created_date", 100),
    enabled: user?.role === "admin" || user?.role === "owner_admin",
  });

  const approveMutation = useMutation({
    mutationFn: async ({ req, reviewNotes }) => {
      // Update request
      await api.entities.OrgVerificationRequest.update(req.id, {
        status: "approved",
        reviewed_by: user.id,
        review_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      });
      // Update user verification_type
      await api.entities.User.update(req.user_id, {
        verification_type: req.type,
        verification_status: "verified",
      });
      // Update community if linked
      if (req.community_id) {
        await api.entities.Community.update(req.community_id, {
          community_verification: req.type,
          verified_community: true,
        });
      }
      // Log
      await api.entities.VerificationLog.create({
        user_id: req.user_id,
        admin_id: user.id,
        action: "approved",
        verification_type: req.type,
        community_id: req.community_id || undefined,
        notes: reviewNotes,
      });
    },
    onSuccess: () => { toast.success("Approved!"); qc.invalidateQueries(["org-verification-requests"]); },
    onError: e => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ req, reviewNotes }) => {
      await api.entities.OrgVerificationRequest.update(req.id, {
        status: "rejected",
        reviewed_by: user.id,
        review_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      });
      await api.entities.VerificationLog.create({
        user_id: req.user_id,
        admin_id: user.id,
        action: "rejected",
        verification_type: req.type,
        notes: reviewNotes,
      });
    },
    onSuccess: () => { toast.success("Rejected."); qc.invalidateQueries(["org-verification-requests"]); },
    onError: e => toast.error(e.message),
  });

  const removeVerificationMutation = useMutation({
    mutationFn: async (targetUserId) => {
      await api.entities.User.update(targetUserId, { verification_type: "none", verification_status: "unverified" });
      await api.entities.VerificationLog.create({ user_id: targetUserId, admin_id: user.id, action: "removed", verification_type: "none" });
    },
    onSuccess: () => { toast.success("Verification removed."); qc.invalidateQueries(["org-verification-requests"]); },
  });

  if (!user || (user.role !== "admin" && user.role !== "owner_admin")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" /> Verification Admin
        </h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No {filterStatus} requests.</div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req.id} className="border border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{req.org_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-sm font-semibold capitalize ${TYPE_COLORS[req.type] || "text-slate-600"}`}>{req.type}</span>
                      <Badge className={STATUS_COLORS[req.status]}>{req.status}</Badge>
                      {req.payment_completed && <Badge className="bg-green-100 text-green-800">Paid</Badge>}
                      {!req.payment_completed && <Badge className="bg-red-100 text-red-800">Unpaid</Badge>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(req.created_date), "dd MMM yyyy")}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Contact:</span> {req.contact_name} · {req.contact_email}</div>
                  <div><span className="text-slate-500">User ID:</span> <span className="font-mono text-xs">{req.user_id}</span></div>
                  {req.org_website && <div><span className="text-slate-500">Website:</span> <a href={req.org_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{req.org_website}</a></div>}
                  {req.community_id && <div><span className="text-slate-500">Community:</span> <span className="font-mono text-xs">{req.community_id}</span></div>}
                </div>
                {req.description && <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{req.description}</p>}
                {req.status === "pending" && (
                  <div className="space-y-2 pt-2">
                    <Textarea
                      placeholder="Review notes (optional)"
                      value={notes[req.id] || ""}
                      onChange={e => setNotes(n => ({ ...n, [req.id]: e.target.value }))}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveMutation.mutate({ req, reviewNotes: notes[req.id] || "" })}
                        className="bg-green-600 hover:bg-green-700 gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate({ req, reviewNotes: notes[req.id] || "" })}
                        className="gap-1">
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
                {req.status === "approved" && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm text-slate-500">Approved{req.review_notes ? ` · ${req.review_notes}` : ""}</span>
                    <Button size="sm" variant="outline" onClick={() => removeVerificationMutation.mutate(req.user_id)} className="ml-auto">
                      Remove Verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
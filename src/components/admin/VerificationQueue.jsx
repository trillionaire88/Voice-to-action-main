import { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Eye, AlertCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function VerificationQueue() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["verificationRequests"],
    queryFn: () => api.entities.VerificationRequest.list("-created_date")
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, userId, action }) => {
      const adminUser = await api.auth.me();
      await api.entities.VerificationRequest.update(requestId, {
        status: action,
        review_notes: notes,
        rejection_reason: action === "rejected" ? rejectionReason : undefined,
        reviewed_by_admin_id: adminUser.id,
        approved_at: action === "approved" ? new Date().toISOString() : undefined,
        payment_status: "completed",
      });
      if (action === "approved") {
        if (selected?.verification_type === "public_figure") {
          await api.entities.User.update(userId, { is_public_figure: true });
        } else {
          await api.entities.User.update(userId, { is_verified: true, identity_verified: true });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["verificationRequests"]);
      toast.success("Review completed successfully");
      setSelected(null);
      setNotes("");
      setRejectionReason("");
    },
    onError: () => toast.error("Failed to update request")
  });

  const filtered = requests.filter(r => {
    const matchSearch = !search || r.full_name?.toLowerCase().includes(search.toLowerCase());
    if (filter === "pending") return matchSearch && (r.status === "pending" || r.status === "under_review");
    if (filter === "approved") return matchSearch && r.status === "approved";
    if (filter === "rejected") return matchSearch && r.status === "rejected";
    return matchSearch;
  });

  const pendingCount = requests.filter(r => r.status === "pending" || r.status === "under_review").length;

  if (isLoading) return (
    <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  );

  const statusBadge = (status) => {
    const map = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      under_review: "bg-blue-50 text-blue-700 border-blue-200",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
      needs_more_info: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return map[status] || "bg-slate-50 text-slate-700";
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["pending", "approved", "rejected", "all"].map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)} className="capitalize">
              {f} {f === "pending" && pendingCount > 0 && `(${pendingCount})`}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="font-medium">No requests in this category</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <Card key={req.id} className="border-slate-200 hover:border-blue-200 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{req.full_name}</span>
                      <Badge className={statusBadge(req.status)}>{req.status.replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline" className="capitalize">{req.verification_type}</Badge>
                    </div>
                    <div className="text-sm text-slate-500 space-x-3">
                      <span>Submitted {format(new Date(req.created_date), 'MMM d, yyyy')}</span>
                      {req.payment_reference && <span>• Ref: <span className="font-mono">{req.payment_reference}</span></span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => { setSelected(req); setNotes(req.review_notes || ""); setRejectionReason(req.rejection_reason || ""); }}>
                    <Eye className="w-4 h-4 mr-1" />Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Verification Review — {selected.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-4">
                <div><p className="text-slate-500">Full Name</p><p className="font-semibold">{selected.full_name}</p></div>
                <div><p className="text-slate-500">Verification Type</p><p className="font-semibold capitalize">{selected.verification_type}</p></div>
                <div><p className="text-slate-500">Document Type</p><p className="font-semibold capitalize">{selected.document_type?.replace(/_/g, ' ') || "—"}</p></div>
                <div><p className="text-slate-500">Payment Reference</p><p className="font-mono font-semibold">{selected.payment_reference || "Not provided"}</p></div>
                <div><p className="text-slate-500">Date of Birth</p><p className="font-semibold">{selected.date_of_birth || "—"}</p></div>
                <div><p className="text-slate-500">Submitted</p><p className="font-semibold">{format(new Date(selected.created_date), 'PPP')}</p></div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Documents</Label>
                <div className="space-y-1">
                  {selected.document_front_url && (
                    <a href={selected.document_front_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline text-sm p-2 bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />View ID Front
                    </a>
                  )}
                  {selected.document_back_url && (
                    <a href={selected.document_back_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline text-sm p-2 bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />View ID Back
                    </a>
                  )}
                  {selected.selfie_url && (
                    <a href={selected.selfie_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline text-sm p-2 bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />View Selfie with ID
                    </a>
                  )}
                  {selected.proof_of_address_url && (
                    <a href={selected.proof_of_address_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline text-sm p-2 bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />View Proof of Address
                    </a>
                  )}
                </div>
              </div>

              {selected.additional_info && (
                <div>
                  <Label>Additional Info from Applicant</Label>
                  <p className="text-sm bg-slate-50 rounded-lg p-3 mt-1">{selected.additional_info}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Review Notes (internal)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Rejection Reason (shown to user if rejecting)</Label>
                <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection (e.g. unclear document, payment not received)..." rows={2} />
              </div>

              <div className="flex gap-2 pt-2 border-t flex-wrap">
                <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 min-w-[120px]"
                  onClick={() => reviewMutation.mutate({ requestId: selected.id, userId: selected.user_id, action: "rejected" })}
                  disabled={reviewMutation.isPending}>
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
                <Button variant="outline" className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 min-w-[120px]"
                  onClick={() => reviewMutation.mutate({ requestId: selected.id, userId: selected.user_id, action: "needs_more_info" })}
                  disabled={reviewMutation.isPending}>
                  <AlertCircle className="w-4 h-4 mr-1" />Need More Info
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 min-w-[120px]"
                  onClick={() => reviewMutation.mutate({ requestId: selected.id, userId: selected.user_id, action: "approved" })}
                  disabled={reviewMutation.isPending}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Approve & Verify
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
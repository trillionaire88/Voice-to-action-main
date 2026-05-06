import { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS = {
  pending_payment: "bg-slate-100 text-slate-600",
  payment_submitted: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700",
  export_ready: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

export default function WithdrawalQueue() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ["petitionWithdrawals"],
    queryFn: () => api.entities.PetitionWithdrawal.list("-created_date")
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      await api.entities.PetitionWithdrawal.update(id, {
        status: action,
        admin_notes: notes,
        confirmed_at: action === "confirmed" ? new Date().toISOString() : undefined,
        export_generated_at: action === "export_ready" ? new Date().toISOString() : undefined,
      });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries(["petitionWithdrawals"]);
      toast.success(action === "confirmed" ? "Payment confirmed! User can now download their export." : "Request updated.");
      setSelected(null);
      setNotes("");
    },
    onError: () => toast.error("Failed to update request")
  });

  const pending = withdrawals.filter(w => w.status === "payment_submitted");
  const others = withdrawals.filter(w => w.status !== "payment_submitted");

  if (isLoading) return (
    <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          Awaiting Payment Confirmation ({pending.length})
        </h3>

        {pending.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p>No pending withdrawal requests</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map(w => (
              <Card key={w.id} className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{w.petition_title || `Petition ID: ${w.petition_id?.slice(0, 8)}`}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        Payment Ref: <span className="font-mono font-medium">{w.payment_reference}</span>
                        {' '}• ${w.payment_amount || 25}
                        {' '}• {format(new Date(w.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => { setSelected(w); setNotes(w.admin_notes || ""); }}>
                      <Eye className="w-4 h-4 mr-1" />Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-slate-700 mb-3">Past Requests</h3>
          <div className="space-y-2">
            {others.slice(0, 20).map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                <div>
                  <span className="font-medium">{w.petition_title || `Petition ${w.petition_id?.slice(0, 8)}`}</span>
                  <span className="text-slate-500 ml-2">• {format(new Date(w.created_date), 'MMM d, yyyy')}</span>
                </div>
                <Badge className={STATUS_COLORS[w.status] || "bg-slate-100 text-slate-600"}>
                  {w.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Withdrawal Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                <div><span className="text-slate-500">Petition:</span> <span className="font-semibold">{selected.petition_title}</span></div>
                <div><span className="text-slate-500">Payment Reference:</span> <span className="font-mono font-semibold">{selected.payment_reference}</span></div>
                <div><span className="text-slate-500">Amount:</span> <span className="font-semibold">${selected.payment_amount || 25}</span></div>
                <div><span className="text-slate-500">Submitted:</span> <span className="font-semibold">{format(new Date(selected.created_date), 'PPP')}</span></div>
                <div><span className="text-slate-500">User ID:</span> <span className="font-mono text-xs">{selected.user_id}</span></div>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Notes about this request..." rows={2} />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" className="flex-1 text-red-600 border-red-200"
                  onClick={() => reviewMutation.mutate({ id: selected.id, action: "rejected" })}
                  disabled={reviewMutation.isPending}>
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => reviewMutation.mutate({ id: selected.id, action: "confirmed" })}
                  disabled={reviewMutation.isPending}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Confirm Payment
                </Button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Confirming payment will allow the user to download their petition export package.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
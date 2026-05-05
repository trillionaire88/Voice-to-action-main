import { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Send, Clock, XCircle, AlertTriangle, Eye,
  Building2, Globe
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import DeliveryStatusBadge from "@/components/petitions/DeliveryStatusBadge";

export default function PetitionDeliveryPanel({ adminUser }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [overrideRecipient, setOverrideRecipient] = useState("");
  const [overrideEmail, setOverrideEmail] = useState("");

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["allPetitionDeliveries"],
    queryFn: () => api.entities.PetitionDelivery.list("-created_date", 100),
  });

  const openDeliveries = deliveries.filter(d => d.delivery_status === "awaiting_owner_review");

  const reviewMutation = useMutation({
    mutationFn: async ({ action }) => {
      const delivery = selected;
      const newStatus = {
        approve: "approved",
        delay: "delayed",
        reject: "rejected",
      }[action];

      await api.entities.PetitionDelivery.update(delivery.id, {
        delivery_status: newStatus,
        owner_review_notes: reviewNotes,
        reviewed_by_admin_id: adminUser.id,
        reviewed_at: new Date().toISOString(),
        ...(overrideRecipient ? { recipient_organisation: overrideRecipient } : {}),
        ...(overrideEmail ? { recipient_email: overrideEmail } : {}),
      });

      // If approved, send the delivery email
      if (action === "approve") {
        const recipientEmail = overrideEmail || delivery.recipient_email;
        if (recipientEmail) {
          const geoLines = delivery.geographic_summary
            ? Object.entries(delivery.geographic_summary).sort((a, b) => b[1] - a[1]).slice(0, 10)
                .map(([cc, cnt]) => `  ${cc}: ${cnt} signature${cnt !== 1 ? "s" : ""}`).join("\n")
            : "  Not available";

          await api.integrations.Core.SendEmail({
            to: recipientEmail,
            subject: `Official Petition: ${delivery.petition_title}`,
            body: `Dear ${overrideRecipient || delivery.recipient_organisation}${delivery.recipient_department ? `, ${delivery.recipient_department}` : ""},\n\nWe are writing to formally deliver a public petition that has gathered significant democratic support.\n\nPETITION TITLE: ${delivery.petition_title}\n\nSIGNATURE COUNT:\n  Total Signatures: ${delivery.signature_count_at_trigger?.toLocaleString()}\n  Verified Signatures: ${delivery.verified_count_at_trigger?.toLocaleString()}\n\nGEOGRAPHIC DISTRIBUTION:\n${geoLines}\n\nThis petition was submitted via Voice to Action, a platform for democratic participation and civic engagement.\n\nThis is a formal petition delivery. We respectfully request your consideration of the public's request.\n\nKind regards,\nVoice to Action\njerem@voicetoaction.com`,
            from_name: "Voice to Action",
          });
        }

        await api.entities.PetitionDelivery.update(delivery.id, {
          delivery_status: "sent",
          sent_at: new Date().toISOString(),
          delivery_confirmation: `Sent to ${recipientEmail || "no email provided"} at ${new Date().toISOString()}`,
        });

        await api.entities.Petition.update(delivery.petition_id, {
          status: "delivered",
          delivered_at: new Date().toISOString(),
          delivery_method: delivery.delivery_method,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allPetitionDeliveries"]);
      toast.success("Delivery action saved.");
      setSelected(null);
      setReviewNotes("");
      setOverrideRecipient("");
      setOverrideEmail("");
    },
    onError: () => toast.error("Action failed"),
  });

  return (
    <div className="space-y-6">
      {/* Alert for pending */}
      {openDeliveries.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <p className="font-bold text-blue-900">{openDeliveries.length} delivery request{openDeliveries.length !== 1 ? "s" : ""} awaiting review</p>
            <p className="text-sm text-blue-700">Review and approve or reject petition deliveries below.</p>
          </div>
        </div>
      )}

      {/* Deliveries list */}
      <div className="space-y-3">
        {isLoading && <p className="text-slate-500 text-sm">Loading...</p>}
        {!isLoading && deliveries.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Send className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No delivery requests yet.</p>
          </div>
        )}
        {deliveries.map(d => (
          <Card key={d.id} className={`border-slate-200 ${d.delivery_status === "awaiting_owner_review" ? "border-blue-300 bg-blue-50/20" : ""}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <DeliveryStatusBadge status={d.delivery_status} />
                    <Badge variant="outline">{d.delivery_method?.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="font-semibold text-slate-900 line-clamp-1">{d.petition_title}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {d.recipient_organisation}{d.recipient_department ? ` · ${d.recipient_department}` : ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {d.signature_count_at_trigger?.toLocaleString()} sigs · {format(new Date(d.created_date), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
                {d.delivery_status === "awaiting_owner_review" && (
                  <Button size="sm" onClick={() => { setSelected(d); setOverrideRecipient(d.recipient_organisation); setOverrideEmail(d.recipient_email || ""); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                    <Eye className="w-3.5 h-3.5 mr-1" />Review
                  </Button>
                )}
                {d.delivery_status !== "awaiting_owner_review" && d.sent_at && (
                  <span className="text-xs text-slate-400 shrink-0">Sent {format(new Date(d.sent_at), "MMM d")}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Review Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Review Delivery Request
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-bold text-slate-900">{selected.petition_title}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Recipient:</span> <span className="font-medium">{selected.recipient_organisation}</span></div>
                  <div><span className="text-slate-500">Dept:</span> <span className="font-medium">{selected.recipient_department || "—"}</span></div>
                  <div><span className="text-slate-500">Email:</span> <span className="font-medium">{selected.recipient_email || "Not provided"}</span></div>
                  <div><span className="text-slate-500">Method:</span> <span className="font-medium">{selected.delivery_method?.replace(/_/g, " ")}</span></div>
                  <div><span className="text-slate-500">Total sigs:</span> <span className="font-bold text-emerald-700">{selected.signature_count_at_trigger?.toLocaleString()}</span></div>
                  <div><span className="text-slate-500">Verified:</span> <span className="font-bold text-emerald-700">{selected.verified_count_at_trigger?.toLocaleString()}</span></div>
                </div>

                {selected.geographic_summary && Object.keys(selected.geographic_summary).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Geographic Distribution (top 8)</p>
                    <div className="grid grid-cols-4 gap-1">
                      {Object.entries(selected.geographic_summary).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([cc, cnt]) => (
                        <div key={cc} className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-center">
                          <div className="font-bold">{cc}</div>
                          <div className="text-slate-500">{cnt}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Override Recipient Organisation (optional)</Label>
                <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={overrideRecipient} onChange={e => setOverrideRecipient(e.target.value)} />
              </div>
              <div>
                <Label>Override Delivery Email (optional)</Label>
                <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" type="email" value={overrideEmail} onChange={e => setOverrideEmail(e.target.value)} placeholder={selected.recipient_email || "Enter email..."} />
              </div>
              <div>
                <Label>Owner Review Notes *</Label>
                <Textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Notes on this delivery decision..."
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={() => reviewMutation.mutate({ action: "reject" })} disabled={reviewMutation.isPending} className="border-red-200 text-red-700 hover:bg-red-50">
                <XCircle className="w-4 h-4 mr-1" />Reject
              </Button>
              <Button variant="outline" onClick={() => reviewMutation.mutate({ action: "delay" })} disabled={reviewMutation.isPending} className="border-orange-200 text-orange-700 hover:bg-orange-50">
                <AlertTriangle className="w-4 h-4 mr-1" />Delay
              </Button>
              <Button onClick={() => reviewMutation.mutate({ action: "approve" })} disabled={reviewMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Send className="w-4 h-4 mr-1" />{reviewMutation.isPending ? "Sending..." : "Approve & Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
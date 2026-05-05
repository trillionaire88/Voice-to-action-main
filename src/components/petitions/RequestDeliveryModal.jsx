import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Search, Building2, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000];

export default function RequestDeliveryModal({ petition, user, onClose }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuthority, setSelectedAuthority] = useState(null);
  const [form, setForm] = useState({
    recipient_organisation: petition.target_name || "",
    recipient_department: "",
    recipient_email: "",
    delivery_method: "email",
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ["authorityDirectory", petition.country_code],
    queryFn: () => api.entities.AuthorityDirectory.filter({ country_code: petition.country_code, is_active: true }),
  });

  const filteredAuthorities = authorities.filter(a =>
    !searchQuery || a.organisation_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.department || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectAuthority = (auth) => {
    setSelectedAuthority(auth);
    setForm(prev => ({
      ...prev,
      recipient_organisation: auth.organisation_name,
      recipient_department: auth.department || "",
      recipient_email: auth.official_email || "",
    }));
  };

  const deliveryMutation = useMutation({
    mutationFn: async () => {
      const threshold = MILESTONES.find(m => petition.signature_count_total >= m && petition.signature_count_total < (MILESTONES[MILESTONES.indexOf(m) + 1] || Infinity))
        || petition.signature_count_total;

      // Build geographic summary
      const sigs = await api.entities.PetitionSignature.filter({ petition_id: petition.id });
      const geoMap = {};
      sigs.forEach(s => { if (s.country_code) geoMap[s.country_code] = (geoMap[s.country_code] || 0) + 1; });

      const created = await api.entities.PetitionDelivery.create({
        petition_id: petition.id,
        petition_title: petition.title,
        trigger_threshold: threshold,
        signature_count_at_trigger: petition.signature_count_total,
        verified_count_at_trigger: petition.signature_count_verified,
        recipient_organisation: form.recipient_organisation,
        recipient_department: form.recipient_department,
        recipient_email: form.recipient_email,
        authority_directory_id: selectedAuthority?.id || "",
        delivery_status: "awaiting_owner_review",
        delivery_method: form.delivery_method,
        requested_by_creator: true,
        geographic_summary: geoMap,
      });

      const { error: notifyErr } = await supabase.functions.invoke("notify-petition-delivery-request", {
        body: { delivery_id: created.id },
      });
      if (notifyErr) throw new Error(notifyErr.message || "Could not notify platform. Delivery request was saved.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["petitionDeliveries", petition.id]);
      toast.success("Delivery request submitted for owner review.");
      onClose();
    },
    onError: () => toast.error("Failed to submit delivery request"),
  });

  const MIN_VERIFIED_SIGS = 100000;
  const hasMinVerified = (petition.signature_count_verified || 0) >= MIN_VERIFIED_SIGS;
  const eligible = hasMinVerified && MILESTONES.some(m => petition.signature_count_total >= m);
  const nextMilestone = MILESTONES.find(m => petition.signature_count_total < m);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Request Official Delivery
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Eligibility */}
          <div className={`rounded-xl p-4 ${eligible ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
            {!hasMinVerified ? (
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <AlertCircle className="w-5 h-5" />
                Requires 100,000+ verified signatures ({MIN_VERIFIED_SIGS.toLocaleString() - (petition.signature_count_verified || 0)} more needed)
              </div>
            ) : eligible ? (
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Eligible for delivery — {petition.signature_count_total.toLocaleString()} signatures reached
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <AlertCircle className="w-5 h-5" />
                Next milestone: {nextMilestone?.toLocaleString()} signatures ({nextMilestone - petition.signature_count_total} more needed)
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {MILESTONES.map(m => (
                <Badge key={m} className={petition.signature_count_total >= m ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-500"}>
                  {m.toLocaleString()}
                </Badge>
              ))}
            </div>
          </div>

          {/* Authority directory search */}
          {authorities.length > 0 && (
            <div>
              <Label>Search Authority Directory</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search by organisation or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery && filteredAuthorities.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                  {filteredAuthorities.map(auth => (
                    <button
                      key={auth.id}
                      onClick={() => { selectAuthority(auth); setSearchQuery(""); }}
                      className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm transition-colors ${selectedAuthority?.id === auth.id ? "bg-blue-50" : ""}`}
                    >
                      <div className="font-medium">{auth.organisation_name}</div>
                      {auth.department && <div className="text-xs text-slate-500">{auth.department} · {auth.jurisdiction}</div>}
                    </button>
                  ))}
                </div>
              )}
              {selectedAuthority && (
                <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                  <Building2 className="w-3 h-3" />
                  Using: {selectedAuthority.organisation_name}
                  <button onClick={() => setSelectedAuthority(null)} className="ml-auto text-slate-400 hover:text-slate-600">✕</button>
                </div>
              )}
            </div>
          )}

          {/* Manual fields */}
          <div>
            <Label>Recipient Organisation *</Label>
            <Input
              value={form.recipient_organisation}
              onChange={e => setForm(prev => ({ ...prev, recipient_organisation: e.target.value }))}
              placeholder="e.g., UK Home Office, Brisbane City Council"
            />
          </div>
          <div>
            <Label>Department (optional)</Label>
            <Input
              value={form.recipient_department}
              onChange={e => setForm(prev => ({ ...prev, recipient_department: e.target.value }))}
              placeholder="e.g., Department of Health and Social Care"
            />
          </div>
          <div>
            <Label>Official Email (optional)</Label>
            <Input
              type="email"
              value={form.recipient_email}
              onChange={e => setForm(prev => ({ ...prev, recipient_email: e.target.value }))}
              placeholder="official@contact.gov"
            />
          </div>
          <div>
            <Label>Preferred Delivery Method</Label>
            <Select value={form.delivery_method} onValueChange={v => setForm(prev => ({ ...prev, delivery_method: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Official Email</SelectItem>
                <SelectItem value="download_package">Downloadable Package (Manual Submission)</SelectItem>
                <SelectItem value="digital_notification">Digital Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── FREE DELIVERY OPTIONS ──────────────────────── */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <span className="text-base">🆓</span> Free Delivery Options — No Fee Required
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-100">
                <span className="text-xl mt-0.5">🤝</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Personal Delivery by EveryVoice</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Our team can personally hand-deliver or formally present your petition to the designated
                    person, office, or company — completely free. Select this option and we will contact you
                    to arrange the details.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-100">
                <span className="text-xl mt-0.5">🔗</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Share a Direct Link</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Share your petition link directly to the target — a minister, company, regulator, or decision-maker.
                    A sharable petition URL is always available on your petition page for free.
                  </p>
                  {petition?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/PetitionDetail?id=${petition.id}`);
                        toast.success("Petition link copied!");
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 underline hover:no-underline"
                    >
                      <Copy className="w-3 h-3" /> Copy petition link
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            All deliveries are reviewed by the platform owner before being sent. You will be notified when your request is approved or if changes are needed.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => deliveryMutation.mutate()}
            disabled={deliveryMutation.isPending || !eligible || !form.recipient_organisation}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {deliveryMutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
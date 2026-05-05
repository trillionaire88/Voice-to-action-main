import React, { useState } from "react";
import { api } from '@/api/client';
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Scale, Shield, CheckCircle2, AlertTriangle, FileText, Globe2, Phone, Mail, User, Building2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { appUrl, appHostname } from "@/constants/siteUrl";

const CATEGORIES = [
  { value: "defamation", label: "Defamation", desc: "False statements that damage your reputation" },
  { value: "harassment", label: "Harassment", desc: "Targeted, persistent, abusive behaviour" },
  { value: "threats_violent_content", label: "Threats or Violent Content", desc: "Content containing threats or incitement to violence" },
  { value: "privacy_violation", label: "Privacy Violation", desc: "Unlawful disclosure of personal information" },
  { value: "intellectual_property", label: "Intellectual Property Infringement", desc: "Unauthorised use of your copyright, trademark, or other IP" },
  { value: "other_legal", label: "Other Legal Concern", desc: "Other violations of applicable law or your legal rights" },
];

function generateComplaintId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VTA-${ts}-${rand}`;
}

export default function TakedownRequest() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    organisation: "",
    content_url: "",
    content_description: "",
    complaint_category: "",
    accuracy_confirmed: false,
    legal_declaration_confirmed: false,
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name || !form.email || !form.country || !form.content_url || !form.content_description || !form.complaint_category) {
        throw new Error("Please complete all required fields.");
      }
      if (!form.accuracy_confirmed) throw new Error("Please confirm the information is accurate.");
      if (!form.legal_declaration_confirmed) throw new Error("Please confirm the legal declaration.");

      const complaintId = generateComplaintId();
      const now = new Date().toISOString();

      const record = await api.entities.TakedownRequest.create({
        complaint_id: complaintId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        country: form.country,
        organisation: form.organisation,
        content_url: form.content_url,
        content_description: form.content_description,
        complaint_category: form.complaint_category,
        accuracy_confirmed: true,
        legal_declaration_confirmed: true,
        status: "pending",
        content_status: "online",
        complainant_notified: true,
        content_author_notified: false,
      });

      const { error: ownerNotifyErr } = await supabase.functions.invoke("notify-takedown-request", {
        body: { takedown_request_id: record.id },
      });
      if (ownerNotifyErr) {
        console.error("notify-takedown-request:", ownerNotifyErr);
      }

      // Send confirmation to complainant
      await api.integrations.Core.SendEmail({
        to: form.email,
        from_name: "Voice to Action",
        subject: `Complaint Received [${complaintId}] — Voice to Action`,
        body: `Dear ${form.full_name},\n\n` +
          `Thank you for submitting your legal complaint to Voice to Action. We have received your request and it is now under review.\n\n` +
          `Your Complaint Reference: ${complaintId}\n` +
          `Submitted: ${format(new Date(now), "PPP p")}\n` +
          `Category: ${CATEGORIES.find(c => c.value === form.complaint_category)?.label}\n` +
          `Content URL: ${form.content_url}\n\n` +
          `What happens next:\n` +
          `• Our team will review your complaint and assess the reported content.\n` +
          `• We aim to respond within 3–5 business days.\n` +
          `• You will be contacted at this email address if we require further information.\n\n` +
          `Please retain your complaint reference number for your records.\n\n` +
          `Voice to Action\n${appUrl("/")}`
      });

      return { complaintId, submittedAt: now };
    },
    onSuccess: ({ complaintId, submittedAt }) => {
      setSubmittedData({ complaintId, submittedAt });
      setSubmitted(true);
      toast.success("Complaint submitted successfully.");
    },
    onError: (err) => toast.error(err.message || "Submission failed."),
  });

  if (submitted && submittedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-emerald-200 shadow-lg">
          <CardContent className="pt-10 pb-10 text-center space-y-5">
            <div className="flex justify-center">
              <div className="bg-emerald-100 rounded-full p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Complaint Submitted</h2>
            <p className="text-slate-600">Your legal complaint has been received and is now under review.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reference Number</span>
                <span className="font-bold text-slate-900 font-mono">{submittedData.complaintId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Submitted</span>
                <span className="text-slate-700">{format(new Date(submittedData.submittedAt), "PPP p")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Review</Badge>
              </div>
            </div>
            <p className="text-sm text-slate-500">A confirmation email has been sent to <strong>{form.email}</strong>. Please retain your reference number.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-700 to-blue-800 p-3 rounded-2xl shadow">
              <Scale className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Submit Legal Complaint</h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            If you believe content hosted on this platform is unlawful or violates your legal rights, you may submit a formal Notice and Takedown request using this form.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
              <Shield className="w-3 h-3 mr-1" />Secure Submission
            </Badge>
            <Badge variant="outline" className="text-slate-600 border-slate-200">
              Complaints reviewed within 3–5 business days
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 1 — Complainant Information */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-blue-600" />
                Complainant Information
              </CardTitle>
              <p className="text-sm text-slate-500">Your details will be kept confidential and used only to process this complaint.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Legal Name <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" placeholder="e.g. Jane Smith" value={form.full_name} onChange={e => set("full_name", e.target.value)} />
                </div>
                <div>
                  <Label>Email Address <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" type="email" placeholder="your@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input className="mt-1" placeholder="+61 4xx xxx xxx" value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <div>
                  <Label>Country of Residence <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" placeholder="e.g. Australia" value={form.country} onChange={e => set("country", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Organisation Name <span className="text-slate-400 font-normal">(if applicable)</span></Label>
                <Input className="mt-1" placeholder="e.g. Smith & Associates Legal" value={form.organisation} onChange={e => set("organisation", e.target.value)} />
              </div>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Checkbox
                  id="accuracy"
                  checked={form.accuracy_confirmed}
                  onCheckedChange={v => set("accuracy_confirmed", v)}
                />
                <Label htmlFor="accuracy" className="text-sm text-amber-900 leading-relaxed cursor-pointer">
                  I confirm that the information provided above is accurate and complete.
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Content Identification */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-orange-600" />
                Content Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL or Link to Content <span className="text-red-500">*</span></Label>
                <Input className="mt-1" placeholder={`https://${appHostname()}/...`} value={form.content_url} onChange={e => set("content_url", e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Provide the direct link to the specific poll, petition, comment, or profile you are reporting.</p>
              </div>

              <div>
                <Label>Complaint Category <span className="text-red-500">*</span></Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => set("complaint_category", cat.value)}
                      className={`text-left p-3 rounded-lg border transition-all ${form.complaint_category === cat.value
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
                        : "border-slate-200 hover:border-slate-300 bg-white"}`}
                    >
                      <div className="font-medium text-sm text-slate-900">{cat.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{cat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Description of Complaint <span className="text-red-500">*</span></Label>
                <Textarea
                  className="mt-1"
                  rows={5}
                  placeholder="Please describe the content and explain specifically why you believe it is unlawful or violates your rights. Include any relevant dates, names, or references."
                  value={form.content_description}
                  onChange={e => set("content_description", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3 — Legal Declaration */}
          <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
                <Scale className="w-5 h-5 text-blue-700" />
                Legal Declaration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white border border-blue-200 rounded-xl p-5 mb-4">
                <p className="text-slate-800 text-sm leading-relaxed italic">
                  "I declare that the information provided in this complaint is accurate and that I believe the content identified violates applicable law or my legal rights."
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="declaration"
                  checked={form.legal_declaration_confirmed}
                  onCheckedChange={v => set("legal_declaration_confirmed", v)}
                />
                <Label htmlFor="declaration" className="text-sm text-slate-800 leading-relaxed cursor-pointer">
                  I confirm the above declaration. I understand that submitting a false or misleading complaint may have legal consequences.
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white px-12"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Legal Complaint"}
            </Button>
            <p className="text-xs text-slate-400 text-center max-w-sm">
              By submitting this form you consent to Voice to Action processing your complaint and contacting you by email regarding this matter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
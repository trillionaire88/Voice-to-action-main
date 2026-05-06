import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { sanitiseText } from "@/lib/sanitise";
import HoneypotField from "@/components/HoneypotField";
import { insertContentWatermark } from "@/lib/watermark";
import { reportHoneypotHit } from "@/lib/threatIntelClient";

const POLICY_AREAS = [
  { value: "healthcare", label: "Healthcare" },
  { value: "environment", label: "Environment & Climate" },
  { value: "economy", label: "Economy & Jobs" },
  { value: "education", label: "Education" },
  { value: "housing", label: "Housing & Cost of Living" },
  { value: "immigration", label: "Immigration" },
  { value: "defense", label: "Defence & Security" },
  { value: "taxation", label: "Taxation" },
  { value: "technology", label: "Technology & AI" },
  { value: "social_welfare", label: "Social Welfare" },
  { value: "justice", label: "Justice & Law Reform" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "other", label: "Other" },
];

async function insertDiscussion(row) {
  let { data, error } = await supabase.from("policy_discussions").insert(cleanForDB(row)).select().single();
  if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
    const r2 = await supabase.from("discussions").insert(cleanForDB(row)).select().single();
    data = r2.data;
    error = r2.error;
  }
  if (error) throw new Error(error.message);
  return data;
}

export default function NewDiscussionModal({ open, onClose, user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", policy_area: "", tags: "" });
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Sign in required");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const modRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-moderation`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content: `${form.title}\n${form.body}`, contentType: "community", contentId: "draft" }),
        });
        const mod = await modRes.json().catch(() => ({}));
        if (mod.flagged && mod.severity === "high") {
          throw new Error("Content flagged by moderation checks. Please revise before posting.");
        }
      } catch (e) {
        if (String(e?.message || "").includes("flagged")) throw e;
      }

      const row = {
        title: sanitiseText(form.title, 300),
        body: sanitiseText(form.body, 50000),
        policy_area: form.policy_area,
        tags: form.tags
          ? form.tags.split(",").map((t) => sanitiseText(t.trim(), 80)).filter(Boolean)
          : [],
        author_name: sanitiseText(user?.full_name || user?.display_name || "Anonymous", 200),
        author_user_id: authUser.id,
        upvotes: 0,
        reply_count: 0,
        status: "open",
        verified_only: verifiedOnly,
      };
      return insertDiscussion(row);
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["policyDiscussions"] });
      setForm({ title: "", body: "", policy_area: "", tags: "" });
      if (row?.id && user?.id) insertContentWatermark("discussion", row.id, user.id).catch(() => {});
      onClose();
    },
    onError: (e) => toast.error(e.message || "Could not post discussion"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            Start a Policy Discussion
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2 relative">
          <HoneypotField value={honeypot} onChange={(ev) => setHoneypot(ev.target.value)} inputId="discussion_hp_website" name="website_url_discussion" />
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Policy Area *</Label>
            <Select value={form.policy_area} onValueChange={(v) => setForm((f) => ({ ...f, policy_area: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a policy area..." />
              </SelectTrigger>
              <SelectContent>
                {POLICY_AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Title *</Label>
            <Input
              placeholder="What policy change do you want to discuss?"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="bg-white text-slate-900 border-slate-300"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Your View *</Label>
            <Textarea
              placeholder="Share your perspective, evidence, or questions about this policy issue..."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="min-h-[120px] bg-white text-slate-900 border-slate-300"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tags (optional, comma separated)</Label>
            <Input
              placeholder="e.g. housing, rent control, affordability"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="bg-white text-slate-900 border-slate-300"
            />
          </div>
          <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <Checkbox
              id="verifiedOnlyDiscussion"
              checked={verifiedOnly}
              onCheckedChange={setVerifiedOnly}
              className="mt-0.5"
            />
            <label htmlFor="verifiedOnlyDiscussion" className="cursor-pointer">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                Require identity verification to reply
                <span className="text-xs font-normal text-blue-600">(Stripe $12.90 AUD)</span>
              </p>
              <p className="text-xs text-slate-500">If unchecked, free email/phone verification is enough to comment.</p>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                if (honeypot) {
                  console.warn("[Security] Honeypot triggered");
                  reportHoneypotHit("policy_discussion");
                  return;
                }
                createMutation.mutate();
              }}
              disabled={!form.title.trim() || !form.body.trim() || !form.policy_area || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Post Discussion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

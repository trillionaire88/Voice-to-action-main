import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Star, AlertCircle, X, Plus, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { cleanForDB } from "@/lib/dbHelpers";
import FormErrorHandler from "@/components/ui/FormErrorHandler";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { value: "politician", label: "Politician" },
  { value: "company", label: "Company / Corporation" },
  { value: "government_body", label: "Government Body" },
  { value: "council", label: "Council / Local Govt" },
  { value: "public_figure", label: "Public Figure" },
  { value: "organisation", label: "Organisation / NGO" },
  { value: "media_outlet", label: "Media Outlet" },
  { value: "other", label: "Other" },
];

const COUNTRIES = [
  "AU", "US", "GB", "CA", "NZ", "DE", "FR", "IN", "BR", "JP", "ZA", "NG", "KE", "MX", "AR",
  "IT", "ES", "NL", "SE", "NO", "PL", "UA", "TR", "SA", "AE", "SG", "MY", "ID", "PH", "TH",
  "EG", "MA", "GH", "TZ", "ET", "CO", "CL", "PE", "VE", "PK", "BD", "LK", "MM", "VN", "KR",
];

export default function CreateScorecard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    country_code: "",
    region: "",
    description: "",
    image_url: "",
    official_website: "",
    tags: [],
  });

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !user) navigateToLogin();
  }, [isLoadingAuth, isAuthenticated, user, navigateToLogin]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const addTag = () => {
    if (tagInput.trim() && form.tags.length < 6 && !form.tags.includes(tagInput.trim())) {
      set("tags", [...form.tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const nameTrim = form.name.trim();
      const { data: validation, error: fnErr } = await supabase.functions.invoke(
        "validate-scorecard-create",
        {
          body: { name: nameTrim, category: form.category },
        },
      );
      if (fnErr) {
        let msg = fnErr.message || "Validation failed";
        try {
          const ctx = fnErr.context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            if (j?.message) msg = j.message;
          }
        } catch {}
        throw new Error(msg);
      }
      if (validation && typeof validation === "object" && "ok" in validation && !validation.ok) {
        throw new Error(validation.message || "Validation failed");
      }

      return api.entities.Scorecard.create(
        cleanForDB({
          ...form,
          name: nameTrim,
          submitted_by_user_id: user.id,
          status: "pending_review",
          image_url: form.image_url || undefined,
          official_website: form.official_website || undefined,
          region: form.region || undefined,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["scorecards"]);
      toast.success("Scorecard submitted for review!");
      navigate(createPageUrl("Scorecards"));
    },
    onError: (e) => toast.error(e?.message || "Failed to submit scorecard"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Name is required");
    if (!form.category) return setError("Please select a category");
    if (!form.country_code) return setError("Please select a country");
    if (!form.description.trim()) return setError("Description is required");
    if (!confirmed) return setError("Please confirm the accuracy declaration");
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-3">
          <Star className="w-4 h-4" />Submit Scorecard
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create a Public Scorecard</h1>
        <p className="text-slate-600 text-sm">Scorecards are reviewed before going live. Provide accurate information.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FormErrorHandler error={mutation.error} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border-slate-200">
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. John Smith, Acme Corp, City Council" value={form.name} onChange={e => set("name", e.target.value)} maxLength={120} />
            </div>

            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Select value={form.country_code} onValueChange={v => set("country_code", v)}>
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Region / State</Label>
                <Input placeholder="Optional" value={form.region} onChange={e => set("region", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea placeholder="Who/what is this scorecard for? Include role, context, and why it's relevant." value={form.description} onChange={e => set("description", e.target.value)} rows={4} maxLength={1000} />
              <p className="text-xs text-slate-500">{form.description.length}/1000</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader><CardTitle className="text-base">Optional Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Profile Image URL</Label>
              <Input placeholder="https://..." value={form.image_url} onChange={e => set("image_url", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Official Website</Label>
              <Input placeholder="https://..." value={form.official_website} onChange={e => set("official_website", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (up to 6)</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. climate, healthcare, corruption" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} />
                <Button type="button" variant="outline" onClick={addTag} disabled={form.tags.length >= 6}><Plus className="w-4 h-4" /></Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button type="button" onClick={() => set("tags", form.tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Public Transparency Disclaimer */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3 mb-3">
              <Globe2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">Public Transparency Disclaimer</h4>
                <p className="text-blue-800 text-sm leading-relaxed">
                  This scorecard is submitted for purposes of <strong>public transparency, accountability, and civic awareness</strong>.
                  Voice to Action is a platform designed to bring recognition and accountability into the public eye and to
                  highlight matters of genuine public interest.
                </p>
                <p className="text-blue-800 text-sm mt-2 leading-relaxed">
                  We <strong>strongly encourage the truth and only the truth</strong>. Submissions must be grounded in
                  verifiable facts. Fabricated, misleading, or defamatory information is strictly prohibited and may
                  result in immediate removal, account suspension, and potential legal action.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Checkbox id="confirm" checked={confirmed} onCheckedChange={setConfirmed} className="mt-1" />
              <Label htmlFor="confirm" className="text-sm cursor-pointer text-amber-900">
                I confirm this scorecard is based on factual, verifiable information. I understand that this submission
                is for public transparency purposes and that false, defamatory, or misleading submissions are strictly
                prohibited and may result in account suspension or legal action.
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Scorecards"))}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
            {mutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
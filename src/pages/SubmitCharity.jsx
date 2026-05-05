import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import MediaUploader from "../components/profile/MediaUploader";

export default function SubmitCharity() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const [formData, setFormData] = useState({
    legal_name: "",
    trading_name: "",
    registration_number: "",
    country_of_registration: "",
    website_url: "",
    description: "",
    suggested_categories: [],
    suggested_cause_tags: [],
    proof_documents_urls: [],
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch {
      navigate(createPageUrl("Charities"));
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const submission = await api.entities.CharitySubmission.create({
        ...data,
        user_id: user.id,
        status: "submitted",
      });

      await api.entities.Charity.create({
        name: data.trading_name || data.legal_name,
        slug: (data.trading_name || data.legal_name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
        description: data.description,
        country: data.country_of_registration,
        website_url: data.website_url,
        categories: data.suggested_categories,
        cause_tags: data.suggested_cause_tags,
        status: "pending_review",
        submitted_by_user_id: user.id,
      });

      return submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["charities"]);
      toast.success("Charity submitted for review!");
      navigate(createPageUrl("Charities"));
    },
    onError: () => {
      toast.error("Failed to submit charity");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please agree to the terms");
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Charities"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Charities
      </Button>

      <Alert className="border-amber-200 bg-amber-50 mb-6">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm text-amber-800">
          Charity submissions are reviewed by our team. Only approved charities can receive
          donations. Submitting false information may result in account suspension.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-600" />
            Submit a Charity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Legal Registered Name *</Label>
                <Input
                  value={formData.legal_name}
                  onChange={(e) =>
                    setFormData({ ...formData, legal_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Trading/Public Name</Label>
                <Input
                  value={formData.trading_name}
                  onChange={(e) =>
                    setFormData({ ...formData, trading_name: e.target.value })
                  }
                  placeholder="If different from legal name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Registration Number *</Label>
                <Input
                  value={formData.registration_number}
                  onChange={(e) =>
                    setFormData({ ...formData, registration_number: e.target.value })
                  }
                  placeholder="Charity number, ABN, EIN, etc."
                  required
                />
              </div>
              <div>
                <Label>Country of Registration *</Label>
                <Input
                  value={formData.country_of_registration}
                  onChange={(e) =>
                    setFormData({ ...formData, country_of_registration: e.target.value })
                  }
                  placeholder="Country code (e.g., US, UK, AU)"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Website URL *</Label>
              <Input
                type="url"
                value={formData.website_url}
                onChange={(e) =>
                  setFormData({ ...formData, website_url: e.target.value })
                }
                placeholder="https://charity-website.org"
                required
              />
            </div>

            <div>
              <Label>Description & Mission *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What does this charity do? What is their mission?"
                rows={5}
                required
              />
            </div>

            <div>
              <Label>Proof Documents</Label>
              <p className="text-xs text-slate-600 mb-2">
                Upload registration certificates, tax-exempt status, or official documents
              </p>
              <MediaUploader
                maxFiles={3}
                acceptedTypes={["image", "document"]}
                onUploadComplete={(files) =>
                  setFormData({
                    ...formData,
                    proof_documents_urls: files.map((f) => f.url),
                  })
                }
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={setAgreed}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                I confirm that I have authority to submit this charity and that all
                information provided is accurate. I understand that false submissions may
                result in account suspension.
              </Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl("Charities"))}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitMutation.isPending || !agreed}>
                {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
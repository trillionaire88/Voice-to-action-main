import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, AlertTriangle, Plus, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SubmitImpactEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  
  const [figureId, setFigureId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impactType, setImpactType] = useState("negative");
  const [category, setCategory] = useState("");
  const [dateOfEvent, setDateOfEvent] = useState("");
  const [citations, setCitations] = useState([{ url: "", source_name: "" }]);
  const [severity, setSeverity] = useState(5);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      if (!currentUser.is_verified) {
        toast.error("You must be verified to submit impact events");
        navigate(createPageUrl("PublicFigures"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: figures = [] } = useQuery({
    queryKey: ["publicFigures"],
    queryFn: () => api.entities.PublicFigure.list(),
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      return await api.entities.ImpactEvent.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allImpactEvents"]);
      toast.success("Impact event submitted for review");
      navigate(createPageUrl("PublicFigures"));
    },
    onError: () => {
      toast.error("Failed to submit event");
    },
  });

  const handleAddCitation = () => {
    setCitations([...citations, { url: "", source_name: "" }]);
  };

  const handleRemoveCitation = (index) => {
    setCitations(citations.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!figureId || !title || !description || !category || !dateOfEvent) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validCitations = citations.filter((c) => c.url && c.source_name);
    if (validCitations.length === 0) {
      toast.error("At least one citation is required");
      return;
    }

    submitMutation.mutate({
      figure_id: figureId,
      title,
      detailed_description: description,
      impact_type: impactType,
      category,
      date_of_event: dateOfEvent,
      citations: validCitations.map((c) => ({ ...c, verified: false })),
      submitter_user_id: user.id,
      severity_score: severity,
    });
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Scale className="w-8 h-8 text-amber-600" />
          Submit Impact Event
        </h1>
        <p className="text-slate-600">
          Add a verified record of a public figure's action or decision
        </p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Evidence Required:</strong> All submissions must include reputable sources. 
          False or unverified claims will be rejected and may result in penalties.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Public Figure *</Label>
              <Select value={figureId} onValueChange={setFigureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select figure" />
                </SelectTrigger>
                <SelectContent>
                  {figures.map((fig) => (
                    <SelectItem key={fig.id} value={fig.id}>
                      {fig.name} ({fig.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Event Title *</Label>
              <Input
                placeholder="e.g., Voted against climate legislation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Detailed Description *</Label>
              <Textarea
                placeholder="Provide comprehensive details of the action, decision, or event..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Impact Type *</Label>
                <Select value={impactType} onValueChange={setImpactType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negative">Negative Impact</SelectItem>
                    <SelectItem value="positive">Positive Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economic_harm">Economic Harm</SelectItem>
                    <SelectItem value="corruption">Corruption</SelectItem>
                    <SelectItem value="harmful_policy">Harmful Policy</SelectItem>
                    <SelectItem value="environmental_damage">Environmental Damage</SelectItem>
                    <SelectItem value="human_rights_violation">Human Rights Violation</SelectItem>
                    <SelectItem value="economic_benefit">Economic Benefit</SelectItem>
                    <SelectItem value="social_progress">Social Progress</SelectItem>
                    <SelectItem value="environmental_protection">Environmental Protection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Event *</Label>
                <Input
                  type="date"
                  value={dateOfEvent}
                  onChange={(e) => setDateOfEvent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Severity (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Citations (Evidence) *</Label>
              {citations.map((citation, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Source URL"
                    value={citation.url}
                    onChange={(e) => {
                      const newCitations = [...citations];
                      newCitations[index].url = e.target.value;
                      setCitations(newCitations);
                    }}
                  />
                  <Input
                    placeholder="Source name"
                    value={citation.source_name}
                    onChange={(e) => {
                      const newCitations = [...citations];
                      newCitations[index].source_name = e.target.value;
                      setCitations(newCitations);
                    }}
                  />
                  {citations.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveCitation(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCitation}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Citation
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl("PublicFigures"))}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
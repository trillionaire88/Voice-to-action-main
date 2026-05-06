import { useState } from "react";
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "government_policy", label: "Government Policy" },
  { value: "local_council", label: "Local Council" },
  { value: "corporate_policy", label: "Corporate Policy" },
  { value: "human_rights", label: "Human Rights" },
  { value: "environment", label: "Environment" },
  { value: "health", label: "Health" },
  { value: "economy", label: "Economy" },
  { value: "technology", label: "Technology" },
  { value: "education", label: "Education" },
  { value: "housing", label: "Housing" },
  { value: "justice", label: "Justice" },
  { value: "disability", label: "Disability" },
  { value: "indigenous_rights", label: "Indigenous Rights" },
  { value: "immigration", label: "Immigration" },
  { value: "consumer_rights", label: "Consumer Rights" },
  { value: "other", label: "Other" },
];

export default function EditPetitionModal({ petition, onClose, onSaved }) {
  const [title] = useState(petition.title || "");
  const [shortSummary, setShortSummary] = useState(petition.short_summary || "");
  const [fullDescription, setFullDescription] = useState(petition.full_description || "");
  const [requestedAction, setRequestedAction] = useState(petition.requested_action || "");
  const [category, setCategory] = useState(petition.category || "");
  const [targetName, setTargetName] = useState(petition.target_name || "");
  const [evidenceBasis, setEvidenceBasis] = useState(petition.evidence_basis || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!shortSummary.trim()) return setError("Short summary is required.");
    if (!fullDescription.trim()) return setError("Full description is required.");
    if (!requestedAction.trim()) return setError("Requested action is required.");

    setSaving(true);
    try {
      await api.entities.Petition.update(petition.id, {
        short_summary: shortSummary.trim(),
        full_description: fullDescription.trim(),
        requested_action: requestedAction.trim(),
        category,
        target_name: targetName.trim(),
        evidence_basis: evidenceBasis.trim() || null,
      });
      toast.success("Petition updated successfully.");
      onSaved();
      onClose();
    } catch (err) {
      setError("Failed to save changes: " + (err.message || "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" /> Edit Petition
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 font-medium">
              {title}
            </div>
            <p className="text-xs text-slate-400">Title cannot be edited after creation.</p>
          </div>

          <div className="space-y-1">
            <Label>Short Summary *</Label>
            <Textarea value={shortSummary} onChange={e => setShortSummary(e.target.value.slice(0, 500))} rows={3} />
          </div>

          <div className="space-y-1">
            <Label>Full Description *</Label>
            <Textarea value={fullDescription} onChange={e => setFullDescription(e.target.value.slice(0, 10000))} rows={7} />
          </div>

          <div className="space-y-1">
            <Label>Requested Action *</Label>
            <Textarea value={requestedAction} onChange={e => setRequestedAction(e.target.value.slice(0, 2000))} rows={4} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Target Name</Label>
              <Input value={targetName} onChange={e => setTargetName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Evidence / Supporting Facts</Label>
            <Textarea value={evidenceBasis} onChange={e => setEvidenceBasis(e.target.value.slice(0, 3000))} rows={3} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
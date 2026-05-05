import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const RATING_OPTIONS = [
  { value: "strongly_approve", label: "Strongly Approve", color: "border-emerald-500 bg-emerald-50 text-emerald-700", ring: "ring-emerald-300", icon: "👍👍" },
  { value: "approve", label: "Approve", color: "border-emerald-300 bg-emerald-50/50 text-emerald-600", ring: "ring-emerald-200", icon: "👍" },
  { value: "neutral", label: "Neutral", color: "border-slate-300 bg-slate-50 text-slate-600", ring: "ring-slate-200", icon: "➖" },
  { value: "disapprove", label: "Disapprove", color: "border-red-300 bg-red-50/50 text-red-600", ring: "ring-red-200", icon: "👎" },
  { value: "strongly_disapprove", label: "Strongly Disapprove", color: "border-red-500 bg-red-50 text-red-700", ring: "ring-red-300", icon: "👎👎" },
];

export default function RatingModal({ scorecard, currentRating, onSubmit, onClose, isLoading }) {
  const [selected, setSelected] = useState(currentRating?.rating || "");
  const [comment, setComment] = useState(currentRating?.comment || "");

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit({ rating: selected, comment: comment.trim() });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate: {scorecard.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Select your approval rating for this {scorecard.category?.replace(/_/g, " ")}.</p>

          <div className="space-y-2">
            {RATING_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSelected(opt.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                  selected === opt.value
                    ? `${opt.color} ring-2 ${opt.ring} font-semibold`
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                )}>
                <span className="text-lg">{opt.icon}</span>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Comment (optional)</Label>
            <Textarea placeholder="Explain your rating..." value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={500} />
            <p className="text-xs text-slate-400">{comment.length}/500</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!selected || isLoading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
              {isLoading ? "Saving..." : currentRating ? "Update Rating" : "Submit Rating"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
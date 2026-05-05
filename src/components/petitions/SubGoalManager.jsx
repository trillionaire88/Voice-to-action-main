import { Card } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function SubGoalManager() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold">Signature Milestones</h3>
      </div>
      <p className="text-sm text-slate-600 mt-2">No milestones set</p>
    </Card>
  );
}
import { Card } from "@/components/ui/card";

export default function RecommendedPolls() {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-slate-900">Recommended Polls</h3>
      <p className="text-sm text-slate-600 mt-2">No polls to recommend yet</p>
    </Card>
  );
}
import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export default function ForumSection() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold">Forum Discussion</h3>
      </div>
      <p className="text-sm text-slate-600 mt-2">No forum posts yet</p>
    </Card>
  );
}
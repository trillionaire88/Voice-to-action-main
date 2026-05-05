import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function ProfileImpactCard({ user }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-emerald-600" />
        <div>
          <h3 className="font-semibold text-slate-900">Impact Score</h3>
          <p className="text-sm text-slate-600">0 total impact</p>
        </div>
      </div>
    </Card>
  );
}
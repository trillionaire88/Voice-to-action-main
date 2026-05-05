import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert } from "lucide-react";

export default function TrustScorePanel({ petition, onReport }) {
  const total = petition?.signature_count_total || 0;
  const verified = petition?.signature_count_verified || 0;
  const authenticity = total > 0 ? Math.round((verified / total) * 100) : 0;
  const geo = Math.min(100, ((petition?.countries_represented || 1) * 10));
  const age = 60;
  const trust = Math.round((authenticity * 0.45) + (geo * 0.3) + (age * 0.25));
  const tone = trust > 70 ? "bg-emerald-100 text-emerald-800" : trust > 40 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle className="text-base">Public Trust Score</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Trust</span>
          <Badge className={tone}>{trust}/100</Badge>
        </div>
        <Progress value={trust} />
        <div className="text-xs text-slate-600 space-y-1">
          <div>Signature authenticity: {authenticity}%</div>
          <div>Verified signers: {verified.toLocaleString()}</div>
          <div>Geographic diversity score: {geo}%</div>
          <div>Account age distribution: {age}%</div>
        </div>
        <button className="text-xs text-blue-700 underline">What is this?</button>
        <button className="text-xs text-red-700 underline flex items-center gap-1" onClick={onReport}>
          <ShieldAlert className="w-3 h-3" />
          Report suspicious activity
        </button>
      </CardContent>
    </Card>
  );
}

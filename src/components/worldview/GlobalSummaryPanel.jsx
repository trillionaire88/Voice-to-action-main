import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Globe2, FileText, Activity, ChevronLeft, ChevronRight } from "lucide-react";

export default function GlobalSummaryPanel({ polls, petitions, stats }) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="absolute top-20 left-4 z-10 bg-white hover:bg-slate-50 text-slate-900 shadow-xl border-slate-200"
        size="sm"
      >
        <ChevronRight className="w-4 h-4 mr-2" />
        <Globe2 className="w-4 h-4" />
      </Button>
    );
  }
  const activePolls = polls.filter((p) => p.status === "open").length;
  const activePetitions = petitions.filter((p) => p.status === "active").length;
  
  const topRegions = Object.entries(stats)
    .map(([code, data]) => ({
      code,
      activity: (data.pollCount || 0) + (data.petitionCount || 0) + (data.impactCount || 0),
    }))
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 5);

  const globalIssues = [
    { topic: "Climate Action", count: Math.floor(activePolls * 0.18) },
    { topic: "Economic Policy", count: Math.floor(activePolls * 0.15) },
    { topic: "Healthcare", count: Math.floor(activePolls * 0.14) },
    { topic: "Education", count: Math.floor(activePolls * 0.12) },
    { topic: "Human Rights", count: Math.floor(activePolls * 0.11) },
  ];

  return (
    <Card className="absolute top-20 left-4 shadow-xl border-slate-200 bg-white/95 backdrop-blur-sm z-10 max-w-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="w-5 h-5 text-blue-600" />
            Global Overview
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Active Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Active Polls
            </span>
            <Badge className="bg-blue-50 text-blue-700">{activePolls.toLocaleString()}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Active Petitions
            </span>
            <Badge className="bg-green-50 text-green-700">{activePetitions.toLocaleString()}</Badge>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Top Regions */}
        <div>
          <h4 className="font-semibold text-slate-900 mb-2">Highest Engagement Today</h4>
          <div className="space-y-1.5">
            {topRegions.map((region, idx) => (
              <div key={region.code} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  {idx + 1}. {region.code}
                </span>
                <Badge variant="outline" className="text-xs">
                  {region.activity} items
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Trending Issues */}
        <div>
          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            Trending Global Issues
          </h4>
          <div className="space-y-1.5">
            {globalIssues.map((issue) => (
              <div key={issue.topic} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{issue.topic}</span>
                <span className="text-slate-500">{issue.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
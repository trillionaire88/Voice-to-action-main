import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Newspaper, CheckCircle2, AlertTriangle } from "lucide-react";

export default function MediaCredibility() {
  const { data: mediaScores = [] } = useQuery({
    queryKey: ["mediaScores"],
    queryFn: () => api.entities.MediaCredibilityScore.list("-credibility_score"),
  });

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getBiasColor = (bias) => {
    const colors = {
      left: "bg-blue-100 text-blue-800",
      "center-left": "bg-blue-50 text-blue-700",
      center: "bg-slate-100 text-slate-700",
      "center-right": "bg-red-50 text-red-700",
      right: "bg-red-100 text-red-800",
      mixed: "bg-purple-50 text-purple-700",
    };
    return colors[bias] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-blue-600" />
          Media Credibility Tracker
        </h1>
        <p className="text-slate-600">
          Fact-checking and credibility scores for media institutions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mediaScores.map((score) => (
          <Card key={score.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Media Institution #{score.institution_id.substring(0, 8)}
                  </CardTitle>
                  {score.bias_rating && (
                    <Badge className={`${getBiasColor(score.bias_rating)} mt-2`}>
                      {score.bias_rating.replace("-", " ")}
                    </Badge>
                  )}
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(score.credibility_score)}`}>
                  {score.credibility_score}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Fact-Check Pass Rate</span>
                  <span className="font-semibold">
                    {score.fact_check_pass_rate?.toFixed(0)}%
                  </span>
                </div>
                <Progress value={score.fact_check_pass_rate || 0} />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Transparency</span>
                  <span className="font-semibold">{score.transparency_score}/100</span>
                </div>
                <Progress value={score.transparency_score} />
              </div>

              <div className="pt-2 border-t flex justify-between text-xs">
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  {score.corrections_count} corrections
                </span>
                <span className="flex items-center gap-1 text-red-700">
                  <AlertTriangle className="w-3 h-3" />
                  {score.misinformation_flags} flags
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function HumanRightsBarometer() {
  const { data: rightsIndices = [] } = useQuery({
    queryKey: ["rightsIndices"],
    queryFn: () => api.entities.RightsIndex.list("-overall_score"),
  });

  const getTrendIcon = (trend) => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Scale className="w-8 h-8 text-purple-600" />
          Global Human Rights Barometer
        </h1>
        <p className="text-slate-600">
          Tracking freedom, equality, and rule of law worldwide
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rightsIndices.map((index) => (
          <Card key={index.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{index.country_code}</CardTitle>
                  {index.region_code && (
                    <p className="text-sm text-slate-600">{index.region_code}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(index.trend)}
                  <span className={`text-2xl font-bold ${getScoreColor(index.overall_score)}`}>
                    {index.overall_score}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Freedom</span>
                  <span className="font-semibold">{index.freedom_score}/100</span>
                </div>
                <Progress value={index.freedom_score} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Equality</span>
                  <span className="font-semibold">{index.equality_score}/100</span>
                </div>
                <Progress value={index.equality_score} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Rule of Law</span>
                  <span className="font-semibold">{index.rule_of_law_score}/100</span>
                </div>
                <Progress value={index.rule_of_law_score} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Voice & Representation</span>
                  <span className="font-semibold">{index.voice_representation_score}/100</span>
                </div>
                <Progress value={index.voice_representation_score} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
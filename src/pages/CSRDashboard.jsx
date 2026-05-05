import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, TrendingUp, TrendingDown, Leaf, Users, Scale } from "lucide-react";

export default function CSRDashboard() {
  const { data: csrMetrics = [] } = useQuery({
    queryKey: ["csrMetrics"],
    queryFn: () => api.entities.CSRMetric.list("-overall_csr_score"),
  });

  const getTrendIcon = (trend) => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-green-600" />
          Corporate Social Responsibility
        </h1>
        <p className="text-slate-600">
          Tracking corporate ethics, environmental impact, and social governance
        </p>
      </div>

      <div className="grid gap-6">
        {csrMetrics.map((metric) => (
          <Card key={metric.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Institution #{metric.institution_id.substring(0, 8)}</CardTitle>
                  <p className="text-sm text-slate-600">Period: {metric.calculation_period}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    {metric.overall_csr_score}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    {metric.trend}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Leaf className="w-3 h-3" />
                    Environmental
                  </span>
                  <span className="font-semibold">{metric.environmental_score}/100</span>
                </div>
                <Progress value={metric.environmental_score} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Users className="w-3 h-3" />
                    Social
                  </span>
                  <span className="font-semibold">{metric.social_score}/100</span>
                </div>
                <Progress value={metric.social_score} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Scale className="w-3 h-3" />
                    Governance
                  </span>
                  <span className="font-semibold">{metric.governance_score}/100</span>
                </div>
                <Progress value={metric.governance_score} />
              </div>

              <div className="flex gap-4 text-sm pt-2 border-t">
                <span className="text-green-700">
                  +{metric.positive_actions_count} positive actions
                </span>
                <span className="text-red-700">
                  {metric.negative_actions_count} negative actions
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
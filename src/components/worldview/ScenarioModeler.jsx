import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export default function ScenarioModeler({ decisionTitle }) {
  const [scenario, setScenario] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const runPrediction = async () => {
    setLoading(true);
    
    // Simulate AI prediction - in production would call AI service
    setTimeout(() => {
      setPrediction({
        socialImpact: {
          score: 6.5,
          trend: "positive",
          summary: "Moderate positive social impact expected with increased community engagement.",
        },
        economicImpact: {
          score: 5.2,
          trend: "neutral",
          summary: "Mixed economic effects with short-term costs but potential long-term gains.",
        },
        environmentalImpact: {
          score: 7.8,
          trend: "positive",
          summary: "Significant environmental benefits projected through emission reductions.",
        },
        trustImpact: {
          score: 4.3,
          trend: "negative",
          summary: "Slight erosion of institutional trust due to implementation concerns.",
        },
        confidence: "medium",
        assumptions: [
          "Current participation trends continue",
          "No major external economic shocks",
          "Implementation follows proposed timeline",
        ],
      });
      setLoading(false);
    }, 1500);
  };

  const getImpactColor = (trend) => {
    if (trend === "positive") return "text-green-600 bg-green-50";
    if (trend === "negative") return "text-red-600 bg-red-50";
    return "text-amber-600 bg-amber-50";
  };

  const getImpactIcon = (trend) => {
    if (trend === "positive") return <TrendingUp className="w-4 h-4" />;
    if (trend === "negative") return <TrendingDown className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          AI Scenario Analysis
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-xs text-blue-800">
            AI-powered predictions show possible outcomes. Results are based on current data and
            stated assumptions.
          </AlertDescription>
        </Alert>

        <div>
          <Label>Decision Context</Label>
          <Textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Describe the scenario or decision parameters..."
            rows={3}
            className="mt-2"
          />
        </div>

        <Button onClick={runPrediction} disabled={loading || !scenario} className="w-full">
          {loading ? "Analyzing..." : "Generate Predictions"}
        </Button>

        {prediction && (
          <div className="space-y-3 mt-4">
            <h4 className="font-semibold text-sm text-slate-900">Impact Projections</h4>

            {[
              { key: "socialImpact", label: "Social Impact" },
              { key: "economicImpact", label: "Economic Impact" },
              { key: "environmentalImpact", label: "Environmental Impact" },
              { key: "trustImpact", label: "Trust Impact" },
            ].map(({ key, label }) => {
              const impact = prediction[key];
              return (
                <div key={key} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <Badge className={getImpactColor(impact.trend)}>
                      {getImpactIcon(impact.trend)}
                      <span className="ml-1">{impact.score}/10</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">{impact.summary}</p>
                </div>
              );
            })}

            <div className="pt-3 border-t border-slate-200">
              <h5 className="text-xs font-semibold text-slate-700 mb-2">Key Assumptions</h5>
              <ul className="space-y-1">
                {prediction.assumptions.map((assumption, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <span>Confidence: {prediction.confidence}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
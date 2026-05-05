import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, Users, AlertTriangle, TrendingUp } from "lucide-react";

export default function ElectionSimulator({ countryCode }) {
  const [scenarioType, setScenarioType] = useState("referendum");
  const [turnoutRate, setTurnoutRate] = useState(65);
  const [results, setResults] = useState(null);

  const runSimulation = () => {
    // Mock simulation - in production would use actual data
    const baseSupport = 52;
    const baseOppose = 48;
    
    // Adjust based on turnout
    const turnoutFactor = (turnoutRate - 65) / 100;
    const support = Math.min(100, Math.max(0, baseSupport + turnoutFactor * 10));
    const oppose = 100 - support;

    setResults({
      support,
      oppose,
      projectedTurnout: turnoutRate,
      confidence: "medium",
      regionalBreakdown: [
        { region: "North", support: support + 5, oppose: oppose - 5 },
        { region: "South", support: support - 3, oppose: oppose + 3 },
        { region: "East", support: support + 2, oppose: oppose - 2 },
        { region: "West", support: support - 4, oppose: oppose + 4 },
      ],
    });
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Election Simulator
        </CardTitle>
        <Alert className="mt-2 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800">
            This is a simulation based on Voice to Action data and is not a scientific poll or
            official forecast.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Scenario Type</Label>
          <Select value={scenarioType} onValueChange={setScenarioType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="referendum">Yes/No Referendum</SelectItem>
              <SelectItem value="twoparty">Two-Party Race</SelectItem>
              <SelectItem value="multiparty">Multi-Party Race</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Projected Turnout: {turnoutRate}%</Label>
          <Input
            type="range"
            min="30"
            max="95"
            value={turnoutRate}
            onChange={(e) => setTurnoutRate(parseInt(e.target.value))}
            className="mt-2"
          />
        </div>

        <Button onClick={runSimulation} className="w-full">
          Run Simulation
        </Button>

        {results && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-700">
                  {results.support.toFixed(1)}%
                </div>
                <div className="text-xs text-green-600">Support</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700">
                  {results.oppose.toFixed(1)}%
                </div>
                <div className="text-xs text-red-600">Oppose</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-slate-900">Regional Breakdown</h4>
              {results.regionalBreakdown.map((region) => (
                <div key={region.region} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{region.region}</span>
                  <div className="flex gap-2">
                    <Badge className="bg-green-50 text-green-700 text-xs">
                      {region.support.toFixed(0)}%
                    </Badge>
                    <Badge className="bg-red-50 text-red-700 text-xs">
                      {region.oppose.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users className="w-4 h-4" />
                <span>Confidence: {results.confidence}</span>
                <span>•</span>
                <span>Turnout: {results.projectedTurnout}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
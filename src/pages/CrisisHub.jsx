import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, MapPin, Calendar, ExternalLink } from "lucide-react";

export default function CrisisHub() {
  const { data: crises = [] } = useQuery({
    queryKey: ["crises"],
    queryFn: () => api.entities.Crisis.list("-start_date"),
  });

  const activeCrises = crises.filter((c) => c.status === "active" || c.status === "emerging");

  const getSeverityColor = (severity) => {
    if (severity === "critical") return "bg-red-600 text-white";
    if (severity === "high") return "bg-orange-500 text-white";
    if (severity === "moderate") return "bg-amber-500 text-white";
    return "bg-blue-500 text-white";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Alert className="border-red-200 bg-red-50 mb-6">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-sm text-red-800">
          Global Crisis Coordination Hub: Track active crises, coordinate responses, and
          support relief efforts.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Crisis Hub</h1>
        <p className="text-slate-600">
          Coordinating global response to emergencies and humanitarian needs
        </p>
      </div>

      <div className="grid gap-6">
        {activeCrises.map((crisis) => (
          <Card key={crisis.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getSeverityColor(crisis.severity)}>
                      {crisis.severity}
                    </Badge>
                    <Badge variant="outline">{crisis.crisis_type.replace(/_/g, " ")}</Badge>
                  </div>
                  <CardTitle className="text-xl">{crisis.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">{crisis.description}</p>

              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {crisis.affected_countries?.join(", ")}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Started {new Date(crisis.start_date).toLocaleDateString()}
                </span>
              </div>

              {crisis.related_campaigns?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">
                    Active Campaigns: {crisis.related_campaigns.length}
                  </h4>
                </div>
              )}

              {crisis.related_petitions?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">
                    Related Petitions: {crisis.related_petitions.length}
                  </h4>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  View Campaigns
                </Button>
                <Button size="sm" variant="outline">
                  Related Petitions
                </Button>
                <Button size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Support Response
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {activeCrises.length === 0 && (
          <Card className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Active Crises
            </h3>
            <p className="text-slate-600">
              The crisis hub monitors emerging global situations
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
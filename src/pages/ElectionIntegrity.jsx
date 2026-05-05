import { useState } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ElectionIntegrity() {
  const [selectedCountry, setSelectedCountry] = useState(null);

  const { data: elections = [] } = useQuery({
    queryKey: ["elections"],
    queryFn: () => api.entities.Election.list("-election_date"),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["electionIncidents", selectedCountry],
    queryFn: () =>
      api.entities.ElectionIncident.filter({
        election_id: selectedCountry,
      }),
    enabled: !!selectedCountry,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          Global Election Integrity Monitor tracks fairness indicators and incident
          reports for elections worldwide.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Election Integrity Monitor
        </h1>
        <p className="text-slate-600">Tracking electoral fairness globally</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {elections.map((election) => {
          const _integrityLevel =
            election.integrity_score >= 80
              ? "high"
              : election.integrity_score >= 60
              ? "moderate"
              : "concerning";

          return (
            <Card
              key={election.id}
              className="border-slate-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedCountry(election.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{election.title}</CardTitle>
                    <p className="text-sm text-slate-600">{election.country_code}</p>
                  </div>
                  <Badge
                    className={
                      election.status === "completed"
                        ? "bg-green-50 text-green-700"
                        : election.status === "ongoing"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }
                  >
                    {election.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600">Integrity Score</span>
                      <span className="text-sm font-semibold">
                        {election.integrity_score || "N/A"}/100
                      </span>
                    </div>
                    {election.integrity_score && (
                      <Progress value={election.integrity_score} />
                    )}
                  </div>

                  {election.incident_count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-slate-700">
                        {election.incident_count} incidents reported
                      </span>
                    </div>
                  )}

                  {election.turnout_percentage && (
                    <div className="text-sm text-slate-600">
                      Turnout: {election.turnout_percentage}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedCountry && incidents.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Incident Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 border border-slate-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge
                    className={
                      incident.severity === "critical"
                        ? "bg-red-50 text-red-700"
                        : incident.severity === "high"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-amber-50 text-amber-700"
                    }
                  >
                    {incident.incident_type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      incident.verified_by_admin
                        ? "border-green-500 text-green-700"
                        : ""
                    }
                  >
                    {incident.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700">{incident.description}</p>
                {incident.location && (
                  <p className="text-xs text-slate-500 mt-1">
                    Location: {incident.location}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
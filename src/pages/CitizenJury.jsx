import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Scale, CheckCircle2, Clock } from "lucide-react";

export default function CitizenJury() {
  const { data: cases = [] } = useQuery({
    queryKey: ["jurycases"],
    queryFn: () => api.entities.CitizenJuryCase.list("-created_date"),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Alert className="border-purple-200 bg-purple-50 mb-6">
        <Scale className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-sm text-purple-800">
          Citizen Jury System: Randomly selected citizens deliberate on high-stakes
          issues to provide representative verdicts.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-600" />
          Citizen Jury
        </h1>
        <p className="text-slate-600">Democratic deliberation by the people</p>
      </div>

      <div className="grid gap-6">
        {cases.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Users className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Citizens Jury — Coming Soon</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
              The Citizens Jury system allows randomly selected, verified citizens to deliberate on high-stakes
              policy issues and deliver representative verdicts to decision-makers. The first cases are being
              prepared now. Check back soon.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              {[
                { title: "Random Selection", desc: "Jurors are randomly selected from verified users for fairness" },
                { title: "Structured Deliberation", desc: "Cases follow a formal process with evidence and expert input" },
                { title: "Official Verdicts", desc: "Jury findings are formally submitted to the relevant authority" },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="font-bold text-slate-900 text-sm mb-1">{title}</p>
                  <p className="text-xs text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {cases.map((juryCase) => (
          <Card key={juryCase.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{juryCase.topic}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Jury Size: {juryCase.jury_size}
                  </p>
                </div>
                <Badge
                  className={
                    juryCase.status === "verdict_reached"
                      ? "bg-green-50 text-green-700"
                      : juryCase.status === "deliberation"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
                  }
                >
                  {juryCase.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-700">{juryCase.description}</p>

              {juryCase.evidence_summary && (
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-sm text-slate-700">{juryCase.evidence_summary}</p>
                </div>
              )}

              {juryCase.verdict && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-slate-900">Verdict</span>
                  </div>
                  <p className="text-slate-700">{juryCase.verdict}</p>
                  {juryCase.verdict_rationale && (
                    <p className="text-sm text-slate-600 mt-2">
                      {juryCase.verdict_rationale}
                    </p>
                  )}
                </div>
              )}

              {juryCase.status === "selecting_jury" && (
                <Button variant="outline" className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  Selection in Progress
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
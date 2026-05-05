import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Scale, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

export default function PeoplesTribunal() {
  const { data: cases = [] } = useQuery({
    queryKey: ["tribunalCases"],
    queryFn: () => api.entities.TribunalCase.list("-created_date"),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Scale className="w-8 h-8 text-purple-600" />
          The People's Tribunal
        </h1>
        <p className="text-slate-600">
          Collective ethical judgments on institutions and actors
        </p>
      </div>

      <div className="grid gap-6">
        {cases.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Scale className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">People's Tribunal — Coming Soon</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
              The People's Tribunal is a public accountability mechanism where citizens can formally
              bring cases of corporate or political wrongdoing before a community panel.
              Cases are currently being reviewed for the inaugural session.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              {[
                { title: "Community Panel", desc: "Verified citizens serve as jurors to evaluate each case" },
                { title: "Evidence-Based", desc: "All claims must be supported by documented evidence" },
                { title: "Public Verdict", desc: "Findings are published permanently and cannot be removed" },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="font-bold text-slate-900 text-sm mb-1">{title}</p>
                  <p className="text-xs text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {cases.map((tribunalCase) => {
          const totalVotes =
            tribunalCase.votes_ethical +
            tribunalCase.votes_unethical +
            tribunalCase.votes_mixed;

          return (
            <Card key={tribunalCase.id} className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{tribunalCase.title}</CardTitle>
                    {tribunalCase.accused_institution_id && (
                      <p className="text-sm text-slate-600 mt-1">
                        Institution Case
                      </p>
                    )}
                  </div>
                  <Badge
                    className={
                      tribunalCase.status === "verdict_reached"
                        ? "bg-green-50 text-green-700"
                        : tribunalCase.status === "deliberating"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    }
                  >
                    {tribunalCase.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700">{tribunalCase.description}</p>

                {totalVotes > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-slate-900">
                      Public Verdict ({totalVotes} votes)
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1 text-green-700">
                            <ThumbsUp className="w-3 h-3" />
                            Ethical
                          </span>
                          <span className="font-semibold">{tribunalCase.votes_ethical}</span>
                        </div>
                        <Progress
                          value={(tribunalCase.votes_ethical / totalVotes) * 100}
                          className="bg-slate-200"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1 text-red-700">
                            <ThumbsDown className="w-3 h-3" />
                            Unethical
                          </span>
                          <span className="font-semibold">{tribunalCase.votes_unethical}</span>
                        </div>
                        <Progress
                          value={(tribunalCase.votes_unethical / totalVotes) * 100}
                          className="bg-slate-200"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Minus className="w-3 h-3" />
                            Mixed
                          </span>
                          <span className="font-semibold">{tribunalCase.votes_mixed}</span>
                        </div>
                        <Progress
                          value={(tribunalCase.votes_mixed / totalVotes) * 100}
                          className="bg-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {tribunalCase.verdict_summary && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-sm text-purple-900 mb-1">
                      Summary Verdict
                    </h4>
                    <p className="text-sm text-purple-800">{tribunalCase.verdict_summary}</p>
                  </div>
                )}

                {tribunalCase.status === "open" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Vote Ethical
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Vote Mixed
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Vote Unethical
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
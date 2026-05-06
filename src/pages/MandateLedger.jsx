import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Shield, Clock } from "lucide-react";
import { format } from "date-fns";

export default function MandateLedger() {
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandateRecords"],
    queryFn: () => api.entities.MandateRecord.list("-time_window_end"),
  });

  const getOutcomeColor = (outcome) => {
    const colors = {
      aligned: "bg-green-50 text-green-700 border-green-200",
      partially_implemented: "bg-blue-50 text-blue-700 border-blue-200",
      ignored: "bg-red-50 text-red-700 border-red-200",
      reversed: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return colors[outcome] || "bg-slate-50 text-slate-700";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          The Public Mandate Ledger is an immutable record of institutional decisions and
          public response. Cryptographically secured for transparency.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Public Mandate Ledger
        </h1>
        <p className="text-slate-600">
          Immutable accountability system for institutional decisions
        </p>
      </div>

      <div className="space-y-4">
        {mandates.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Mandate Ledger — Launching Soon</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
              The Public Mandate Ledger is an immutable, permanent record of every promise made by
              politicians and institutions — cross-referenced against their actual actions.
              It cannot be edited, removed, or revised. The first entries are being verified now.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              {[
                { title: "Immutable Record", desc: "Every entry is cryptographically secured and cannot be altered" },
                { title: "Promise vs Action", desc: "Each mandate is tracked against real-world outcomes" },
                { title: "Public Accountability", desc: "Anyone can submit evidence and the community verifies it" },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="font-bold text-slate-900 text-sm mb-1">{title}</p>
                  <p className="text-xs text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {mandates.map((mandate) => (
          <Card key={mandate.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Institution #{mandate.institution_id.substring(0, 8)}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {format(new Date(mandate.time_window_start), "MMM d, yyyy")} -{" "}
                    {format(new Date(mandate.time_window_end), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge className={getOutcomeColor(mandate.outcome)}>
                  {mandate.outcome?.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-600">Approval Rate</p>
                  <p className="text-xl font-bold text-slate-900">
                    {mandate.approval_ratio?.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Participation</p>
                  <p className="text-xl font-bold text-slate-900">
                    {mandate.participation_count?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Verified %</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {mandate.verified_share?.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Regions</p>
                  <p className="text-xl font-bold text-slate-900">
                    {mandate.regions_involved?.length || 0}
                  </p>
                </div>
              </div>

              {mandate.record_hash && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 font-mono">
                    Hash: {mandate.record_hash.substring(0, 32)}...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
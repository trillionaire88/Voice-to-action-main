import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function FactCheckBanner({ claims }) {
  const [expanded, setExpanded] = React.useState(false);

  if (!claims || claims.length === 0) return null;

  const unverified = claims.filter((c) => c.verification_status === "unverified" || c.verification_status === "pending");
  const refuted = claims.filter((c) => c.verification_status === "refuted" || c.verification_status === "misleading");

  if (unverified.length === 0 && refuted.length === 0) return null;

  return (
    <Alert className="border-amber-500 bg-amber-50 mb-6">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-sm text-amber-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Fact-Check Notice:</strong> This content contains{" "}
            {unverified.length > 0 && `${unverified.length} unverified claim(s)`}
            {unverified.length > 0 && refuted.length > 0 && ", "}
            {refuted.length > 0 && `${refuted.length} disputed claim(s)`}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : "Details"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2">
            {refuted.map((claim, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-red-200">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-900">{claim.claim_text}</p>
                    <Badge className="bg-red-50 text-red-700 mt-1 text-xs">
                      {claim.verification_status}
                    </Badge>
                    {claim.fact_check_summary && (
                      <p className="text-xs text-slate-600 mt-1">{claim.fact_check_summary}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {unverified.map((claim, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-900">{claim.claim_text}</p>
                    <Badge className="bg-amber-50 text-amber-700 mt-1 text-xs">
                      unverified
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function BiasDetector({ biasAnalysis }) {
  const [expanded, setExpanded] = React.useState(false);

  if (!biasAnalysis || biasAnalysis.overall_bias_score < 3) return null;

  const getSeverityColor = () => {
    if (biasAnalysis.overall_bias_score >= 7) return "border-red-500 bg-red-50";
    if (biasAnalysis.overall_bias_score >= 5) return "border-orange-500 bg-orange-50";
    return "border-amber-500 bg-amber-50";
  };

  return (
    <Alert className={`${getSeverityColor()} mb-6`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        <div className="flex items-center justify-between">
          <div>
            <strong>Bias Analysis:</strong> This content may contain biased language
            (score: {biasAnalysis.overall_bias_score}/10)
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {biasAnalysis.bias_types_detected?.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type} bias
                </Badge>
              ))}
            </div>
            {biasAnalysis.flagged_segments?.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold">Flagged Segments:</p>
                {biasAnalysis.flagged_segments.slice(0, 3).map((segment, idx) => (
                  <div key={idx} className="text-xs bg-white/50 p-2 rounded">
                    "{segment.text}" - {segment.bias_type}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
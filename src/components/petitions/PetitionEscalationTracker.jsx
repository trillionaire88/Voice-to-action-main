import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PetitionEscalationTracker({ petition, escalation }) {
  if (!escalation) return null;

  const stages = [
    { key: "awareness", label: "Awareness", threshold: escalation.stage_thresholds?.awareness || 100 },
    { key: "regional_validation", label: "Regional Validation", threshold: escalation.stage_thresholds?.regional_validation || 1000 },
    { key: "national_validation", label: "National Validation", threshold: escalation.stage_thresholds?.national_validation || 10000 },
    { key: "global_validation", label: "Global Validation", threshold: escalation.stage_thresholds?.global_validation || 100000 },
    { key: "institutional_delivery", label: "Institutional Delivery", threshold: escalation.stage_thresholds?.institutional_delivery || 250000 },
  ];

  const currentSignatures = petition.signature_count_total || 0;
  const currentStageIndex = stages.findIndex((s) => s.key === escalation.current_stage);
  const nextStage = stages[currentStageIndex + 1];
  const progressToNext = nextStage ? Math.min((currentSignatures / nextStage.threshold) * 100, 100) : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Escalation Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Stage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Current Stage</span>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
              {stages.find((s) => s.key === escalation.current_stage)?.label || "Awareness"}
            </Badge>
          </div>
          {nextStage && (
            <>
              <Progress value={progressToNext} className="mb-2" />
              <p className="text-xs text-slate-600">
                {currentSignatures.toLocaleString()} / {nextStage.threshold.toLocaleString()} signatures to {nextStage.label}
              </p>
            </>
          )}
        </div>

        {/* Stage Timeline */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const isComplete = index < currentStageIndex || (index === currentStageIndex && progressToNext === 100);
            const isCurrent = index === currentStageIndex;
            const dateField = `${stage.key}_reached_at`;
            const reachedAt = escalation[dateField];

            return (
              <div key={stage.key} className="flex items-start gap-3">
                <div className="mt-1">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isComplete || isCurrent ? "text-slate-900" : "text-slate-500"}`}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-slate-600">{stage.threshold.toLocaleString()} signatures</p>
                  {reachedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Reached {formatDistanceToNow(new Date(reachedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Institutional Response */}
        {escalation.delivered_to_institution_at && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-900 mb-2">Institutional Response</p>
            {escalation.institution_response_received ? (
              <div className="space-y-2">
                <Badge className="bg-green-50 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Response Received
                </Badge>
                {escalation.institution_response_text && (
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {escalation.institution_response_text}
                  </p>
                )}
                {escalation.institution_response_quality_score !== undefined && (
                  <div>
                    <p className="text-xs text-slate-600">Public rating of response</p>
                    <Progress value={escalation.institution_response_quality_score} className="mt-1" />
                    <p className="text-xs text-slate-600 mt-1">
                      {Math.round(escalation.institution_response_quality_score)}% satisfaction
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Badge className="bg-yellow-50 text-yellow-700">
                  <Clock className="w-3 h-3 mr-1" />
                  Awaiting Response
                </Badge>
                {escalation.institution_response_required_by && (
                  <p className="text-xs text-slate-600 mt-2">
                    Response expected by {new Date(escalation.institution_response_required_by).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Velocity & Spread */}
        {(escalation.escalation_velocity || escalation.geographic_spread) && (
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
            {escalation.escalation_velocity && (
              <div>
                <p className="text-2xl font-bold text-blue-600">{Math.round(escalation.escalation_velocity)}</p>
                <p className="text-xs text-slate-600">signatures/day</p>
              </div>
            )}
            {escalation.geographic_spread && (
              <div>
                <p className="text-2xl font-bold text-purple-600">{escalation.geographic_spread}</p>
                <p className="text-xs text-slate-600">countries</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
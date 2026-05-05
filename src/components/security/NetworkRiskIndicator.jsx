import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle } from "lucide-react";

export default function NetworkRiskIndicator({ userId }) {
  const { data: riskScore } = useQuery({
    queryKey: ["networkRisk", userId],
    queryFn: async () => {
      const scores = await api.entities.NetworkRiskScore.filter({ user_id: userId });
      return scores[0] ?? null;
    },
    enabled: !!userId,
  });

  if (!riskScore || riskScore.risk_score < 30) return null;

  return (
    <Badge
      variant="outline"
      className={
        riskScore.risk_score >= 70
          ? "border-red-500 text-red-700"
          : "border-amber-500 text-amber-700"
      }
    >
      {riskScore.risk_score >= 70 ? (
        <AlertTriangle className="w-3 h-3 mr-1" />
      ) : (
        <Shield className="w-3 h-3 mr-1" />
      )}
      {riskScore.coordination_detected ? "Coordination Detected" : "Risk Flagged"}
    </Badge>
  );
}

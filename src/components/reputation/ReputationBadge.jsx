import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, Star, Crown, AlertTriangle } from "lucide-react";

export const INFLUENCE_LEVELS = {
  trusted_leader:  { label: "Trusted Leader",  color: "bg-amber-50 text-amber-800 border-amber-300",   icon: Crown,       min: 90 },
  highly_trusted:  { label: "Highly Trusted",  color: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: ShieldCheck, min: 75 },
  trusted_user:    { label: "Trusted User",    color: "bg-blue-50 text-blue-800 border-blue-300",       icon: Shield,      min: 60 },
  standard_user:   { label: "Standard User",   color: "bg-slate-50 text-slate-700 border-slate-300",    icon: Star,        min: 40 },
  low_trust:       { label: "Low Trust",       color: "bg-orange-50 text-orange-700 border-orange-300", icon: AlertTriangle, min: 20 },
  restricted_user: { label: "Restricted User", color: "bg-red-50 text-red-700 border-red-300",          icon: AlertTriangle, min: 0  },
};

export function getInfluenceLevel(score) {
  if (score >= 90) return 'trusted_leader';
  if (score >= 75) return 'highly_trusted';
  if (score >= 60) return 'trusted_user';
  if (score >= 40) return 'standard_user';
  if (score >= 20) return 'low_trust';
  return 'restricted_user';
}

export default function ReputationBadge({ score, influenceLevel, showScore = false, size = "default" }) {
  const level = influenceLevel || (score != null ? getInfluenceLevel(score) : null);
  if (!level) return null;

  const config = INFLUENCE_LEVELS[level];
  if (!config) return null;

  const Icon = config.icon;
  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Badge className={`${config.color} ${textSize} flex items-center gap-1 font-semibold`}>
      <Icon className={iconSize} />
      {config.label}
      {showScore && score != null && <span className="opacity-70">({Math.round(score)})</span>}
    </Badge>
  );
}
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react";

const BADGE_CONFIG = {
  highly_credible: {
    label: "Highly Credible",
    icon: ShieldCheck,
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    iconColor: "text-emerald-600",
    description: "This petition shows strong authenticity signals with verified signatures, diverse geographic support, and organic growth patterns.",
  },
  credible: {
    label: "Credible",
    icon: ShieldCheck,
    className: "bg-blue-100 text-blue-800 border-blue-200",
    iconColor: "text-blue-600",
    description: "This petition demonstrates good authenticity with meaningful engagement and reliable growth patterns.",
  },
  moderate: {
    label: "Moderate Credibility",
    icon: Shield,
    className: "bg-amber-100 text-amber-800 border-amber-200",
    iconColor: "text-amber-600",
    description: "This petition has mixed credibility signals. Some engagement appears authentic while other indicators are inconclusive.",
  },
  low: {
    label: "Low Credibility",
    icon: ShieldAlert,
    className: "bg-orange-100 text-orange-800 border-orange-200",
    iconColor: "text-orange-600",
    description: "This petition shows limited authenticity signals. Low verified signatures or limited engagement diversity detected.",
  },
  suspicious: {
    label: "Suspicious Activity Detected",
    icon: ShieldX,
    className: "bg-red-100 text-red-800 border-red-200",
    iconColor: "text-red-600",
    description: "This petition has triggered automated authenticity warnings. Review with caution.",
  },
};

export default function CredibilityBadge({ badge, score, size = "default" }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = BADGE_CONFIG[badge] || BADGE_CONFIG.moderate;
  const Icon = config.icon;

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Badge className={`${config.className} flex items-center gap-1 ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}>
        <Icon className={`w-3 h-3 ${config.iconColor}`} />
        {config.label}
        {score !== undefined && <span className="ml-1 opacity-70">· {Math.round(score)}</span>}
      </Badge>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="text-slate-400 hover:text-slate-600"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl z-50">
          <p className="font-semibold mb-1">{config.label}</p>
          <p className="text-slate-300 leading-relaxed">{config.description}</p>
          <p className="text-slate-400 mt-2 text-xs">Scores reflect authenticity and engagement signals, not the merit of the petition's cause.</p>
          <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
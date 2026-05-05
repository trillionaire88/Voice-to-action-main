import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Flag, Flame } from "lucide-react";

const LEVELS = [
  {
    key: "high_momentum",
    label: "High Public Momentum",
    icon: Flame,
    className: "bg-red-100 text-red-800 border-red-300",
    iconColor: "text-red-600",
    description: "Exceptionally fast-growing with broad international backing.",
    minScore: 85,
  },
  {
    key: "international",
    label: "International Support",
    icon: Globe,
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
    iconColor: "text-indigo-600",
    description: "Signatures from many countries worldwide.",
    minScore: 65,
  },
  {
    key: "national",
    label: "National Support",
    icon: Flag,
    className: "bg-blue-100 text-blue-800 border-blue-200",
    iconColor: "text-blue-600",
    description: "Broad support from across a country or multiple regions.",
    minScore: 40,
  },
  {
    key: "regional",
    label: "Regional Support",
    icon: MapPin,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    iconColor: "text-emerald-600",
    description: "Support concentrated in a specific state or region.",
    minScore: 20,
  },
  {
    key: "local",
    label: "Local Support",
    icon: MapPin,
    className: "bg-slate-100 text-slate-700 border-slate-200",
    iconColor: "text-slate-500",
    description: "Support primarily from a local area or single country.",
    minScore: 0,
  },
];

export function computeOpinionScore({ totalSigs, countries, verifiedSigs, sigGrowth24h, credibilityScore }) {
  const geoScore = Math.min(countries * 6, 40); // up to 40
  const sizeScore = Math.min(totalSigs / 500, 25); // up to 25
  const verifiedRate = totalSigs > 0 ? verifiedSigs / totalSigs : 0;
  const trustScore = verifiedRate * 20; // up to 20
  const velocityScore = Math.min(sigGrowth24h / 10, 10); // up to 10
  const credBonus = credibilityScore ? (credibilityScore / 200) * 5 : 0; // up to 5
  return Math.min(100, Math.round(geoScore + sizeScore + trustScore + velocityScore + credBonus));
}

export default function OpinionStrengthIndicator({ totalSigs, countries, verifiedSigs, sigGrowth24h, credibilityScore }) {
  const score = computeOpinionScore({ totalSigs, countries, verifiedSigs, sigGrowth24h, credibilityScore });
  const level = LEVELS.find(l => score >= l.minScore) || LEVELS[LEVELS.length - 1];
  const Icon = level.icon;

  return (
    <div className="space-y-2">
      <Badge className={`${level.className} flex items-center gap-1.5 text-sm px-3 py-1`}>
        <Icon className={`w-3.5 h-3.5 ${level.iconColor}`} />
        {level.label}
      </Badge>
      <p className="text-xs text-slate-500">{level.description}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${score >= 85 ? "bg-red-500" : score >= 65 ? "bg-indigo-500" : score >= 40 ? "bg-blue-500" : score >= 20 ? "bg-emerald-500" : "bg-slate-400"}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-600 w-8 text-right">{score}</span>
      </div>
    </div>
  );
}
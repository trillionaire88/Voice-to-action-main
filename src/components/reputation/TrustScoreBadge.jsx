
function getTrustLevel(score) {
  if (score <= 30) return { level: "low",     color: "text-red-500",    bg: "bg-red-50 border-red-200",     label: "Low Trust" };
  if (score <= 60) return { level: "normal",  color: "text-slate-600",  bg: "bg-slate-50 border-slate-200", label: "Normal" };
  if (score <= 80) return { level: "high",    color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",   label: "High Trust" };
  return              { level: "trusted", color: "text-green-600",  bg: "bg-green-50 border-green-200", label: "Trusted" };
}

export default function TrustScoreBadge({ score = 50, showLabel = false, size = "sm" }) {
  const trust = getTrustLevel(score);
  const textSize = size === "xs" ? "text-xs" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${trust.bg} ${textSize} font-semibold ${trust.color}`}>
      <span>{score}</span>
      {showLabel && <span>· {trust.label}</span>}
    </span>
  );
}

export { getTrustLevel };
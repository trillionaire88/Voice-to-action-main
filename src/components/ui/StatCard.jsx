import { cn } from "@/lib/utils";

/**
 * Compact KPI stat card.
 * <StatCard label="Petitions" value={42} icon={FileText} color="text-orange-500" trend="+12%" />
 */
export default function StatCard({ label, value, icon: Icon, color = "text-blue-600", trend, trendUp, className, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn("panel-padded flex flex-col gap-2 select-none", onClick && "cursor-pointer hover-lift", className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-caption">{label}</span>
        {Icon && <Icon className={cn("w-5 h-5 opacity-60", color)} />}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className={cn("stat-value", color)}>{value ?? "—"}</span>
        {trend && (
          <span className={cn("text-xs font-semibold mb-0.5", trendUp ? "text-emerald-600" : "text-red-500")}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
    </div>
  );
}
import React from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable page header with title, subtitle, pill badge, and action slot.
 * Usage:
 *   <PageHeader
 *     badge={{ icon: Shield, label: "Admin Only", color: "bg-rose-600" }}
 *     title="Risk Monitor"
 *     subtitle="Fraud and threat detection"
 *     actions={<Button>...</Button>}
 *   />
 */
export default function PageHeader({ badge, title, subtitle, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 mb-8", className)}>
      <div>
        {badge && (
          <div className={cn("inline-flex items-center gap-2 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-3", badge.color || "bg-blue-600")}>
            {badge.icon && <badge.icon className="w-4 h-4" />}
            {badge.label}
          </div>
        )}
        <h1 className="text-h1 text-slate-900">{title}</h1>
        {subtitle && <p className="text-body text-slate-500 mt-1 max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 items-center">{actions}</div>}
    </div>
  );
}
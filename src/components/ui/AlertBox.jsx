import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const VARIANTS = {
  info:    { cls: "alert-info",    Icon: Info },
  success: { cls: "alert-success", Icon: CheckCircle2 },
  warning: { cls: "alert-warning", Icon: AlertTriangle },
  danger:  { cls: "alert-danger",  Icon: AlertCircle },
};

/**
 * Themed alert / notice box.
 * <AlertBox variant="warning" title="Rate limit" message="You have 3 attempts left." />
 */
export default function AlertBox({ variant = "info", title, message, className, children }) {
  const { cls, Icon } = VARIANTS[variant] || VARIANTS.info;
  return (
    <div className={cn(cls, className)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm">{title}</p>}
        {message && <p className="text-sm mt-0.5 opacity-90">{message}</p>}
        {children}
      </div>
    </div>
  );
}
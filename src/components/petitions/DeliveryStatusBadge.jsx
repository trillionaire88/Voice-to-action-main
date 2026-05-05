import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Send, AlertTriangle, XCircle, Package } from "lucide-react";

const STATUS_CONFIG = {
  awaiting_owner_review: { label: "Awaiting Review", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-300" },
  approved: { label: "Delivery Approved", icon: CheckCircle2, className: "bg-blue-100 text-blue-800 border-blue-300" },
  delayed: { label: "Delivery Delayed", icon: AlertTriangle, className: "bg-orange-100 text-orange-800 border-orange-300" },
  rejected: { label: "Delivery Rejected", icon: XCircle, className: "bg-red-100 text-red-800 border-red-300" },
  sent: { label: "Delivered", icon: Send, className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  failed: { label: "Delivery Failed", icon: AlertTriangle, className: "bg-red-100 text-red-800 border-red-300" },
};

export default function DeliveryStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.awaiting_owner_review;
  const Icon = config.icon;
  return (
    <Badge className={`flex items-center gap-1 ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
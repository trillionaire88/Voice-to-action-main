import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Clock, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import DeliveryStatusBadge from "./DeliveryStatusBadge";

export default function DeliveryStatusCard({ deliveries = [] }) {
  if (!deliveries.length) return null;

  const latest = deliveries[0];

  return (
    <Card className="border-blue-200 bg-blue-50/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-600" />
          Delivery Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DeliveryStatusBadge status={latest.delivery_status} />

        <div className="space-y-1 text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Recipient:</span>
            <span className="font-medium text-right max-w-[60%]">{latest.recipient_organisation}</span>
          </div>
          {latest.recipient_department && (
            <div className="flex justify-between">
              <span className="text-slate-500">Dept:</span>
              <span className="font-medium text-right max-w-[60%]">{latest.recipient_department}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">At delivery:</span>
            <span className="font-medium">{latest.signature_count_at_trigger?.toLocaleString()} sigs</span>
          </div>
          {latest.sent_at && (
            <div className="flex justify-between">
              <span className="text-slate-500">Sent:</span>
              <span className="font-medium">{format(new Date(latest.sent_at), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>

        {latest.owner_review_notes && (
          <p className="text-xs text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-200">
            {latest.owner_review_notes}
          </p>
        )}

        {latest.pdf_report_url && (
          <a
            href={latest.pdf_report_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Download className="w-3 h-3" />
            Download Delivery Report
          </a>
        )}

        {deliveries.length > 1 && (
          <p className="text-xs text-slate-400">{deliveries.length} delivery attempts total</p>
        )}
      </CardContent>
    </Card>
  );
}
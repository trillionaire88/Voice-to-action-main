import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function CreatorMessaging() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">Creator Messaging</h3>
      </div>
      <p className="text-sm text-slate-600 mt-2">No messages yet</p>
    </Card>
  );
}
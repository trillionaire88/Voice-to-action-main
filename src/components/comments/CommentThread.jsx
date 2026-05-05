import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function CommentThread() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Discussion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Comments coming soon</p>
          <p className="text-sm text-slate-500 mt-1">
            When discussions return, every comment will go through the platform moderation pipeline before publication (pending / flagged / cleared).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
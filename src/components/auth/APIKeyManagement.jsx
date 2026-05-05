import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Key } from "lucide-react";

export default function APIKeyManagement() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold">API Keys</h3>
      </div>
      <p className="text-sm text-slate-600 mt-2">No API keys created</p>
    </Card>
  );
}
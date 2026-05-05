import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

export default function GlobalDataExplorer() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Global Data Explorer</h2>
      </div>
      <p className="text-slate-600 mt-2 text-sm">Explore global impact data</p>
    </Card>
  );
}
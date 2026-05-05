import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Heart,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  Globe2,
  Eye,
  EyeOff,
  Layers,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const LAYERS = [
  {
    id: "activity",
    name: "Civic Activity",
    icon: Activity,
    color: "blue",
    description: "Polls, petitions, discussions density",
  },
  {
    id: "sentiment",
    name: "Public Sentiment",
    icon: Heart,
    color: "purple",
    description: "Support vs opposition",
  },
  {
    id: "participation",
    name: "Participation",
    icon: Users,
    color: "green",
    description: "Verified user activity",
  },
  {
    id: "institutions",
    name: "Institutions",
    icon: Building2,
    color: "orange",
    description: "Governments, councils, corporations",
  },
  {
    id: "impact",
    name: "Public Impact",
    icon: AlertTriangle,
    color: "red",
    description: "Accountability records",
  },
  {
    id: "trends",
    name: "Trending Topics",
    icon: TrendingUp,
    color: "amber",
    description: "Hot topics by region",
  },
];

export default function LayerSelector({ activeLayers, onToggleLayer }) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="absolute top-20 right-4 z-10 bg-white hover:bg-slate-50 text-slate-900 shadow-xl border-slate-200"
        size="sm"
      >
        <Layers className="w-4 h-4 mr-2" />
        <ChevronLeft className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Card className="absolute top-20 right-4 p-4 shadow-xl border-slate-200 bg-white/95 backdrop-blur-sm z-10 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Globe2 className="w-4 h-4" />
          Map Layers
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(true)}
          className="h-6 w-6 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeLayers.includes(layer.id);
          
          return (
            <button
              key={layer.id}
              onClick={() => onToggleLayer(layer.id)}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                isActive
                  ? `border-${layer.color}-500 bg-${layer.color}-50`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${isActive ? `text-${layer.color}-600` : "text-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-sm ${isActive ? `text-${layer.color}-900` : "text-slate-700"}`}>
                      {layer.name}
                    </span>
                    {isActive ? (
                      <Eye className="w-4 h-4 text-slate-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{layer.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
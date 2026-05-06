import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Leaf,
  Heart,
  GraduationCap,
  Bus,
  Home,
  Scale,
  Building,
  Globe2,
  DollarSign,
  Shield,
  X,
  ChevronUp,
  ChevronDown,
  Hash,
} from "lucide-react";

const TOPICS = [
  { id: "environment", name: "Environment", icon: Leaf, color: "green" },
  { id: "health", name: "Health", icon: Heart, color: "red" },
  { id: "education", name: "Education", icon: GraduationCap, color: "blue" },
  { id: "transport", name: "Transport", icon: Bus, color: "yellow" },
  { id: "housing", name: "Housing", icon: Home, color: "purple" },
  { id: "justice", name: "Justice", icon: Scale, color: "slate" },
  { id: "corporate_ethics", name: "Corporate", icon: Building, color: "orange" },
  { id: "economy", name: "Economy", icon: DollarSign, color: "emerald" },
  { id: "human_rights", name: "Rights", icon: Shield, color: "pink" },
  { id: "climate", name: "Climate", icon: Globe2, color: "cyan" },
];

export default function TopicOverlay({ selectedTopic, onSelectTopic }) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white hover:bg-slate-50 text-slate-900 shadow-xl border-slate-200"
        size="sm"
      >
        <Hash className="w-4 h-4 mr-2" />
        Filter by Topic
        <ChevronUp className="w-4 h-4 ml-2" />
      </Button>
    );
  }

  return (
    <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 p-4 shadow-xl border-slate-200 bg-white/95 backdrop-blur-sm max-w-md w-full mx-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Filter by Topic
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          {selectedTopic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTopic(null)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          const isSelected = selectedTopic === topic.id;
          
          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(isSelected ? null : topic.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? `border-${topic.color}-500 bg-${topic.color}-50`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Icon
                className={`w-5 h-5 mx-auto mb-1 ${
                  isSelected ? `text-${topic.color}-600` : "text-slate-400"
                }`}
              />
              <div className={`text-xs font-medium ${
                isSelected ? `text-${topic.color}-900` : "text-slate-600"
              }`}>
                {topic.name}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTopic && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            Showing global activity for <strong>{TOPICS.find(t => t.id === selectedTopic)?.name}</strong>
          </p>
        </div>
      )}
    </Card>
  );
}
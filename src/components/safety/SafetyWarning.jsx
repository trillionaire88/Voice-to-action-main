import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Heart, ExternalLink } from "lucide-react";

export default function SafetyWarning({ safetyTag, contextNote }) {
  const [acknowledged, setAcknowledged] = useState(false);

  const config = {
    self_harm: {
      icon: Heart,
      color: "border-purple-300 bg-purple-50",
      iconColor: "text-purple-600",
      title: "Sensitive Content: Self-Harm Discussion",
      message: "This content discusses self-harm or suicide. If you're struggling, please reach out for help.",
      resources: [
        { name: "International Crisis Resources", url: "https://findahelpline.com" },
      ],
    },
    high_risk: {
      icon: AlertTriangle,
      color: "border-orange-300 bg-orange-50",
      iconColor: "text-orange-600",
      title: "High-Risk Topic",
      message: "This poll covers a sensitive or high-stakes topic. Please consult reliable sources and context before interpreting results.",
    },
    sensitive: {
      icon: AlertTriangle,
      color: "border-amber-300 bg-amber-50",
      iconColor: "text-amber-600",
      title: "Sensitive Content",
      message: "This content has been flagged for sensitive material.",
    },
  };

  const safetyConfig = config[safetyTag] || config.sensitive;
  const Icon = safetyConfig.icon;

  if (acknowledged) {
    return (
      <Alert className={`${safetyConfig.color} border mb-6`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${safetyConfig.iconColor} mt-0.5 flex-shrink-0`} />
          <AlertDescription className="text-sm text-slate-800">
            <strong>Content Warning:</strong> {safetyConfig.title}
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <Card className={`${safetyConfig.color} border-2 mb-6`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 bg-white rounded-full`}>
            <Icon className={`w-8 h-8 ${safetyConfig.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {safetyConfig.title}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              {safetyConfig.message}
            </p>
            
            {contextNote && (
              <div className="p-3 bg-white/60 rounded-lg mb-3">
                <p className="text-sm text-slate-800">
                  <strong>Context:</strong> {contextNote}
                </p>
              </div>
            )}

            {safetyConfig.resources && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-800 mb-2">Support Resources:</p>
                <div className="space-y-2">
                  {safetyConfig.resources.map((resource, idx) => (
                    <a
                      key={idx}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {resource.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setAcknowledged(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            I Understand, Show Content
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
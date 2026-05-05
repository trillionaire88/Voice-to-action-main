import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Shield,
  Users,
  Building2,
  Copyright,
  Flag,
  BarChart3,
  ChevronRight,
} from "lucide-react";

const LEGAL_ITEMS = [
  {
    id: "terms",
    title: "Terms of Service",
    description: "Legal agreement for using Voice to Action",
    icon: FileText,
    color: "text-blue-600",
    badge: "Required",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    path: "TermsOfService",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your data",
    icon: Shield,
    color: "text-green-600",
    path: "TermsOfService",
  },
  {
    id: "community",
    title: "Community Guidelines",
    description: "Standards for respectful participation",
    icon: Users,
    color: "text-purple-600",
    path: "TermsOfService",
  },
  {
    id: "institutions",
    title: "Institution Rules",
    description: "Obligations for tracked organizations",
    icon: Building2,
    color: "text-amber-600",
    path: "TermsOfService",
  },
  {
    id: "copyright",
    title: "Copyright & IP Policy",
    description: "Intellectual property protections",
    icon: Copyright,
    color: "text-red-600",
    badge: "Critical",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    path: "TermsOfService",
  },
  {
    id: "appeals",
    title: "Content Removal & Appeals",
    description: "How to appeal moderation decisions",
    icon: Flag,
    color: "text-orange-600",
    path: "Appeals",
  },
  {
    id: "transparency",
    title: "Transparency Reports",
    description: "Platform statistics and moderation data",
    icon: BarChart3,
    color: "text-cyan-600",
    path: "TransparencyReport",
  },
];

export default function LegalSettings() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Legal & Policies</h1>
        <p className="text-slate-600">
          Important documents governing your use of Voice to Action
        </p>
      </div>

      <div className="grid gap-4">
        {LEGAL_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className="border-slate-200 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(createPageUrl(item.path))}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                      <Icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        {item.badge && (
                          <Badge className={item.badgeColor}>{item.badge}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-blue-200 bg-blue-50 mt-8">
        <CardContent className="pt-6 text-sm text-blue-800">
          <p className="font-semibold mb-2">Need Help?</p>
          <p>
            If you have questions about our policies, contact us at{" "}
            <a href="mailto:legal@everyvoice.global" className="underline font-medium">
              voicetoaction@outlook.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
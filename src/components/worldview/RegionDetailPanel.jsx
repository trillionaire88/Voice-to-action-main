import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Users,
  FileText,
  BarChart3,
  Building2,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RegionDetailPanel({ country, stats, onClose }) {
  const navigate = useNavigate();

  if (!country) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
      <Card className="rounded-t-3xl shadow-2xl border-t-2 border-slate-200 bg-white max-h-[80vh] overflow-y-auto">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{country.flag || "🌍"}</div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {country.name}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {country.code} • {stats?.verifiedUsers || 0} verified users
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">
                {stats?.pollCount || 0}
              </div>
              <div className="text-xs text-blue-700">Active Polls</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">
                {stats?.petitionCount || 0}
              </div>
              <div className="text-xs text-purple-700">Petitions</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">
                {stats?.institutionCount || 0}
              </div>
              <div className="text-xs text-green-700">Institutions</div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-900">
                {stats?.impactCount || 0}
              </div>
              <div className="text-xs text-orange-700">Impact Records</div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Sentiment Breakdown */}
          {stats?.sentiment && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Public Sentiment
              </h4>
              <div className="space-y-2">
                {Object.entries(stats.sentiment).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 capitalize">{key}</span>
                      <span className="font-semibold">{value}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Top Topics */}
          {stats?.topTopics && stats.topTopics.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 mb-3">Trending Topics</h4>
              <div className="flex flex-wrap gap-2">
                {stats.topTopics.map((topic, idx) => (
                  <Badge key={idx} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigate(createPageUrl("Home") + `?region=${country.code}`);
                onClose();
              }}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Polls
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigate(createPageUrl("Petitions") + `?region=${country.code}`);
                onClose();
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Petitions
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigate(createPageUrl("PublicFigures") + `?region=${country.code}`);
                onClose();
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              View Impact Records
            </Button>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                navigate(createPageUrl("WorldView") + `?focus=${country.code}`);
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Region Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
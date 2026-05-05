import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Target } from "lucide-react";

export default function CommunityImpactCampaigns() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.entities.CommunityImpactCampaign.list("-start_date"),
  });

  const getCampaignTypeColor = (type) => {
    const colors = {
      cleanup: "bg-green-50 text-green-700",
      fundraiser: "bg-purple-50 text-purple-700",
      volunteer: "bg-blue-50 text-blue-700",
      awareness: "bg-amber-50 text-amber-700",
      education: "bg-indigo-50 text-indigo-700",
    };
    return colors[type] || "bg-slate-50 text-slate-700";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Impact Campaigns</h1>
        <p className="text-slate-600">
          Turn digital sentiment into real-world action
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{campaign.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getCampaignTypeColor(campaign.campaign_type)}>
                      {campaign.campaign_type}
                    </Badge>
                    <Badge
                      className={
                        campaign.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">{campaign.description}</p>

              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {campaign.city}, {campaign.country_code}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(campaign.start_date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {campaign.participants_count} participants
                </span>
              </div>

              {campaign.goal && (
                <div className="p-2 bg-blue-50 rounded text-xs">
                  <Target className="w-3 h-3 inline mr-1" />
                  Goal: {campaign.goal}
                </div>
              )}

              {campaign.status === "active" && (
                <Button size="sm" className="w-full">
                  Join Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
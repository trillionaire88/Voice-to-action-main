import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Globe2, MapPin } from "lucide-react";

export default function CommunityCouncils() {
  const { data: councils = [] } = useQuery({
    queryKey: ["councils"],
    queryFn: () => api.entities.CommunityCouncil.list("-created_date"),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-600" />
          Community Councils
        </h1>
        <p className="text-slate-600">
          Elected citizen groups that deliberate and make recommendations
        </p>
      </div>

      <div className="grid gap-6">
        {councils.map((council) => (
          <Card key={council.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{council.name}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Focus: {council.topic}
                  </p>
                </div>
                <Badge
                  className={
                    council.status === "active"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }
                >
                  {council.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-700">{council.description}</p>

              <div className="flex items-center gap-4 text-sm">
                {council.region_scope === "global" ? (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Globe2 className="w-4 h-4" />
                    Global
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    {council.country_code}
                  </span>
                )}
                <span className="text-slate-600">
                  {council.member_ids?.length || 0}/{council.max_members} members
                </span>
                <span className="text-slate-600">
                  {council.recommendations_count || 0} recommendations
                </span>
              </div>

              {council.status === "active" && (
                <Button size="sm" variant="outline" className="w-full">
                  View Council Activity
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
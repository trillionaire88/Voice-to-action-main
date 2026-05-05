import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Globe2, MapPin, Lock, CheckCircle2, ArrowRight } from "lucide-react";

function CommunityCard({ community }) {
  const navigate = useNavigate();
  return (
    <Card
      className="border-slate-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(createPageUrl("CommunityDetail") + `?id=${community.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
            {(community.name || "C")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 truncate">{community.name}</h3>
              {community.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
              {community.is_private ? (
                <Badge variant="outline" className="text-xs"><Lock className="w-2.5 h-2.5 mr-1" />Private</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-teal-600 border-teal-200">Public</Badge>
              )}
            </div>
            {community.description && (
              <p className="text-xs text-slate-500 line-clamp-2 mb-2">{community.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(community.member_count || 0).toLocaleString()} members</span>
              {community.location_type === "global"
                ? <span className="flex items-center gap-1"><Globe2 className="w-3 h-3" />Global</span>
                : community.country_code && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{community.country_code}</span>
              }
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 flex-shrink-0 mt-1 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiscoveryCommunitiesTab({ searchQuery, filters }) {
  const { data: communities = [], isLoading } = useQuery({
    queryKey: ["discovery-communities", filters, searchQuery],
    queryFn: async () => {
      let all = await api.entities.Community.filter({ is_private: false }, "-member_count", 60);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        all = all.filter(c => (c.name || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q));
      }
      return all;
    },
  });

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
  );

  if (communities.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-4xl mb-3">👥</div>
      <p className="font-medium">No communities found</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {communities.map(c => <CommunityCard key={c.id} community={c} />)}
    </div>
  );
}
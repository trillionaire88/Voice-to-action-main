import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FileText, Star, Users, TrendingUp, Flame, Clock, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  poll:      { icon: BarChart3,  color: "text-blue-500",   bg: "bg-blue-50",   label: "Poll",      page: "PollDetail" },
  petition:  { icon: FileText,   color: "text-emerald-500",bg: "bg-emerald-50",label: "Petition",  page: "PetitionDetail" },
  scorecard: { icon: Star,       color: "text-amber-500",  bg: "bg-amber-50",  label: "Scorecard", page: "ScorecardDetail" },
  community: { icon: Users,      color: "text-teal-500",   bg: "bg-teal-50",   label: "Community", page: "CommunityDetail" },
  publicFigure: { icon: Award,   color: "text-purple-500", bg: "bg-purple-50", label: "Public Figure", page: "FigureProfile" },
};

function TrendingItem({ item, type, rank }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  const title = item.question || item.title || item.name || item.subject_name || "Untitled";
  
  let count = 0;
  let countLabel = "";
  
  if (type === "petition") {
    count = item.signature_count_total || 0;
    countLabel = "signatures";
  } else if (type === "community") {
    count = item.member_count || 0;
    countLabel = "members";
  } else if (type === "scorecard") {
    count = (item.rating_count || 0) + (item.comments_count || 0);
    countLabel = "interactions";
  } else if (type === "publicFigure") {
    count = item.profile_followers_count || 0;
    countLabel = "followers";
  } else {
    count = (item.total_votes_cached || 0) + (item.comments_count || 0);
    countLabel = "interactions";
  }

  return (
    <Card
      className="border-slate-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(createPageUrl(cfg.page) + `?id=${item.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
            {rank}
          </div>
          <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>{cfg.label}</Badge>
              <Flame className="w-3 h-3 text-orange-500" />
            </div>
            <h3 className="font-medium text-slate-900 group-hover:text-orange-700 line-clamp-2 text-sm mb-1">{title}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{count.toLocaleString()} {countLabel}</span>
              {item.created_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiscoveryTrendingTab({ searchQuery, filters }) {
  const { data: trending = [], isLoading } = useQuery({
    queryKey: ["discovery-trending", filters, searchQuery],
    queryFn: async () => {
      const [polls, petitions, communities, scorecards, publicFigures] = await Promise.all([
        api.entities.Poll.filter({ status: "open" }, "-total_votes_cached", 50),
        api.entities.Petition.filter({ status: "active" }, "-signature_count_total", 50),
        api.entities.Community.filter({ status: "active" }, "-member_count", 50),
        api.entities.Scorecard.list(),
        api.entities.PublicFigure.list(),
      ]);
      
      const tagged = [
        ...polls.map(p => ({ 
          item: p, 
          type: "poll", 
          score: (p.total_votes_cached || 0) + (p.comments_count || 0) 
        })),
        ...petitions.map(p => ({ 
          item: p, 
          type: "petition", 
          score: p.signature_count_total || 0 
        })),
        ...communities.map(c => ({ 
          item: c, 
          type: "community", 
          score: c.member_count || 0 
        })),
        ...scorecards.map(s => ({ 
          item: s, 
          type: "scorecard", 
          score: (s.rating_count || 0) + (s.comments_count || 0) 
        })),
        ...publicFigures.map(f => ({ 
          item: f, 
          type: "publicFigure", 
          score: f.profile_followers_count || 0 
        })),
      ];
      
      tagged.sort((a, b) => b.score - a.score);
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return tagged.filter(({ item }) => 
          (item.question || item.title || item.name || item.subject_name || "").toLowerCase().includes(q)
        );
      }
      return tagged.slice(0, 50);
    },
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  if (trending.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-4xl mb-3">🔥</div>
      <p className="font-medium">Nothing trending right now</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {trending.map(({ item, type }, i) => (
        <TrendingItem key={`${type}-${item.id}`} item={item} type={type} rank={i + 1} />
      ))}
    </div>
  );
}
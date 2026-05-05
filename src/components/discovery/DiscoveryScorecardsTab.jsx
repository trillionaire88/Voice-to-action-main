import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function ScorecardCard({ scorecard }) {
  const navigate = useNavigate();
  const avgRating = scorecard.average_rating || 0;
  const stars = Math.round(avgRating);

  return (
    <Card
      className="border-slate-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(createPageUrl("ScorecardDetail") + `?id=${scorecard.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">{(scorecard.subject_type || "").replace(/_/g, " ")}</Badge>
              {scorecard.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 line-clamp-1 mb-1">{scorecard.subject_name || scorecard.title}</h3>
            {scorecard.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{scorecard.description}</p>}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3 h-3 ${s <= stars ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                ))}
                <span className="ml-1 font-medium text-slate-600">{avgRating.toFixed(1)}</span>
              </span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{scorecard.rating_count || 0} ratings</span>
              {scorecard.created_date && <span>{formatDistanceToNow(new Date(scorecard.created_date), { addSuffix: true })}</span>}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 flex-shrink-0 mt-1 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiscoveryScorecardsTab({ searchQuery, filters }) {
  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ["discovery-scorecards", filters, searchQuery],
    queryFn: async () => {
      let all = await api.entities.Scorecard.list("-rating_count", 60);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        all = all.filter(s => (s.subject_name || s.title || "").toLowerCase().includes(q));
      }
      return all;
    },
  });

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
  );

  if (scorecards.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-4xl mb-3">⭐</div>
      <p className="font-medium">No scorecards found</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {scorecards.map(s => <ScorecardCard key={s.id} scorecard={s} />)}
    </div>
  );
}
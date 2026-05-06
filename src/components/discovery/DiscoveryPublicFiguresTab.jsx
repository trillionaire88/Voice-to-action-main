import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

function FigureCard({ figure }) {
  const navigate = useNavigate();
  const risk = figure.harm_event_count || 0;
  return (
    <Card
      className="border-slate-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(createPageUrl("FigureProfile") + `?id=${figure.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center flex-shrink-0 text-white font-bold">
            {(figure.name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900 group-hover:text-rose-700 truncate">{figure.name}</h3>
              {figure.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
            </div>
            <p className="text-xs text-slate-500 mb-2">{figure.role}{figure.country_code ? ` · ${figure.country_code}` : ""}</p>
            <div className="flex items-center gap-3 text-xs">
              {risk > 0 && (
                <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
                  <AlertTriangle className="w-2.5 h-2.5 mr-1" />{risk} impact event{risk !== 1 ? "s" : ""}
                </Badge>
              )}
              {figure.tags?.slice(0, 2).map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">#{t}</span>
              ))}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 flex-shrink-0 mt-1 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiscoveryPublicFiguresTab({ searchQuery }) {
  const { data: figures = [], isLoading } = useQuery({
    queryKey: ["discovery-figures", searchQuery],
    queryFn: async () => {
      let all = await api.entities.PublicFigure.list("-harm_event_count", 60);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        all = all.filter(f => (f.name || "").toLowerCase().includes(q) || (f.role || "").toLowerCase().includes(q));
      }
      return all;
    },
  });

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  if (figures.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-4xl mb-3">👤</div>
      <p className="font-medium">No public figures found</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {figures.map(f => <FigureCard key={f.id} figure={f} />)}
    </div>
  );
}
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  TrendingDown,
  Scale,
  AlertTriangle,
  Shield,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLE_LABELS = {
  politician: "Politician",
  business_leader: "Business Leader",
  government_official: "Government Official",
  public_influencer: "Public Influencer",
  judge_legal: "Judge/Legal",
  media_figure: "Media Figure",
  activist: "Activist",
  other: "Other",
};

const PAGE_SIZE = 20;

export default function PublicFigures() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("most_rated");
  const { user } = useAuth();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["publicFigures"] });
    await queryClient.invalidateQueries({ queryKey: ["allImpactEvents"] });
  };

  const {
    data: figuresPages,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["publicFigures", sortBy],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("public_figures")
        .select("*")
        .range(from, to)
        .order("name", { ascending: true });
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "political_figure")
          .range(from, to)
          .order("display_name", { ascending: true });
        if (pErr) throw pErr;
        return (profiles || []).map((p) => ({
          id: p.id,
          name: p.display_name || p.full_name || "Public Figure",
          role: "politician",
          country: p.country_code || "",
          status: "active",
          trustworthiness_rating: 0,
          tags: [],
          impact_score_negative: 0,
          impact_score_positive: 0,
          total_events_count: 0,
        }));
      }
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) =>
      (lastPage?.length ?? 0) < PAGE_SIZE ? undefined : allPages.length,
    staleTime: 2 * 60_000,
  });

  const figures = figuresPages?.pages.flat() ?? [];

  const { data: allEvents = [] } = useQuery({
    queryKey: ["allImpactEvents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_events").select("*").eq("moderation_status", "approved").order("date_of_event", { ascending: false }).limit(500);
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const approvedEvents = allEvents.filter(e => e.moderation_status === 'approved');

  const sortedFigures = [...figures]
    .filter(f => f.status === 'active')
    .filter(f => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        f.name.toLowerCase().includes(query) ||
        f.country.toLowerCase().includes(query) ||
        f.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'most_harmful') {
        return b.impact_score_negative - a.impact_score_negative;
      } else if (sortBy === 'least_trustworthy') {
        return a.trustworthiness_rating - b.trustworthiness_rating;
      } else if (sortBy === 'most_events') {
        return b.total_events_count - a.total_events_count;
      }
      return 0;
    });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Education Banner */}
      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Public Impact Record:</strong> This section displays verified, factual records of decisions
          made by public figures. All entries require reputable citations. Personal accusations without evidence
          are prohibited and will be rejected.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Public Impact Records</h1>
          <p className="text-slate-600">
            Accountability tracker for public figures based on verified events
          </p>
        </div>
        {user && user.is_verified && (
          <Button
            onClick={() => navigate(createPageUrl("SubmitImpactEvent"))}
            className="bg-gradient-to-r from-blue-600 to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Submit Event
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name, country, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={sortBy} onValueChange={setSortBy} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="most_harmful">
              <TrendingDown className="w-4 h-4 mr-2" />
              Most Harmful
            </TabsTrigger>
            <TabsTrigger value="least_trustworthy">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Least Trustworthy
            </TabsTrigger>
            <TabsTrigger value="most_events">
              <Scale className="w-4 h-4 mr-2" />
              Most Events
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Figures Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : sortedFigures.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Figures Found</h3>
            <p className="text-slate-600">Try adjusting your search filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFigures.map((figure) => {
            const figureEvents = approvedEvents.filter(e => e.figure_id === figure.id);
            const negativeEvents = figureEvents.filter(e => e.impact_type === 'negative').length;
            const positiveEvents = figureEvents.filter(e => e.impact_type === 'positive').length;

            return (
              <Card
                key={figure.id}
                className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(createPageUrl("FigureProfile") + `?id=${figure.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-16 w-16 bg-gradient-to-br from-slate-400 to-slate-500">
                      <AvatarFallback className="bg-transparent text-white text-lg font-bold">
                        {figure.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{figure.name}</h3>
                      <p className="text-sm text-slate-600">{ROLE_LABELS[figure.role]}</p>
                      <p className="text-xs text-slate-500">{figure.country}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Harmful Events</span>
                    <span className="font-bold text-red-600">{negativeEvents}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Positive Events</span>
                    <span className="font-bold text-emerald-600">{positiveEvents}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Trustworthiness</span>
                    <Badge className={
                      figure.trustworthiness_rating >= 4 ? 'bg-emerald-50 text-emerald-700' :
                      figure.trustworthiness_rating >= 3 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }>
                      {figure.trustworthiness_rating > 0 ? figure.trustworthiness_rating.toFixed(1) : 'N/A'}
                    </Badge>
                  </div>
                  {figure.tags && figure.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {figure.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {!isLoading && hasNextPage && (
        <div className="flex justify-center mt-10">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="min-w-[140px]"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
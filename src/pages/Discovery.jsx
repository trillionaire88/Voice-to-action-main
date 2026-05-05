import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, SlidersHorizontal, X, TrendingUp, MapPin, RefreshCw,
  BarChart3, FileText, Star, Users, Newspaper, User
} from "lucide-react";
import DiscoveryFilterPanel from "@/components/discovery/DiscoveryFilterPanel.jsx";
import ForYouFeed from "@/components/newsfeed/ForYouFeed";
import DiscoveryPollsTab from "@/components/discovery/DiscoveryPollsTab.jsx";
import DiscoveryPetitionsTab from "@/components/discovery/DiscoveryPetitionsTab.jsx";
import DiscoveryCommunitiesTab from "@/components/discovery/DiscoveryCommunitiesTab.jsx";
import DiscoveryScorecardsTab from "@/components/discovery/DiscoveryScorecardsTab.jsx";
import DiscoveryPublicFiguresTab from "@/components/discovery/DiscoveryPublicFiguresTab.jsx";
import DiscoveryTrendingTab from "@/components/discovery/DiscoveryTrendingTab.jsx";

const TABS = [
  { key: "newsfeed",    label: "Newsfeed",      icon: Newspaper },
  { key: "polls",       label: "Polls",         icon: BarChart3 },
  { key: "petitions",   label: "Petitions",     icon: FileText },
  { key: "communities", label: "Communities",   icon: Users },
  { key: "scorecards",  label: "Scorecards",    icon: Star },
  { key: "figures",     label: "Public Figures",icon: User },
  { key: "trending",    label: "Trending",      icon: TrendingUp },
];

function discoveryTabFromSearch(searchParams) {
  const t = searchParams.get("tab");
  if (t && TABS.some((x) => x.key === t)) return t;
  return null;
}

export default function Discovery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const fromUrl = discoveryTabFromSearch(new URLSearchParams(window.location.search));
      return fromUrl || "newsfeed";
    } catch {
      return "newsfeed";
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "all",
    location: "global",
    sort: "trending",
    verifiedOnly: false,
    tags: [],
  });

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleResetFilters = () => {
    setFilters({ category: "all", location: "global", sort: "trending", verifiedOnly: false, tags: [] });
    setSearchQuery("");
  };

  const hasActiveFilters = filters.category !== "all" || filters.location !== "global" || filters.verifiedOnly || filters.tags.length > 0;

  useEffect(() => {
    const fromUrl = discoveryTabFromSearch(searchParams);
    if (fromUrl) setActiveTab(fromUrl);
    else if (!searchParams.has("tab")) setActiveTab("newsfeed");
  }, [searchParams]);

  const handleDiscoveryTabChange = (value) => {
    setActiveTab(value);
    if (value === "newsfeed") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: value }, { replace: true });
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["discoveryPolls"] });
    await queryClient.invalidateQueries({ queryKey: ["discoveryPetitions"] });
    await queryClient.invalidateQueries({ queryKey: ["discoveryCommunities"] });
    await queryClient.invalidateQueries({ queryKey: ["discoveryNewsfeed"] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Discover</h1>
          <p className="text-slate-500 mt-0.5">Explore polls, petitions, communities, scorecards, trending topics & more</p>
        </div>
        <Button variant="outline" onClick={() => navigate(createPageUrl("Newsfeed"))}>Go to Full Newsfeed</Button>
        {user && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl("CreatePetition"))}>
              <FileText className="w-4 h-4 mr-1.5" /> Petition
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(createPageUrl("CreatePoll"))}>
              <BarChart3 className="w-4 h-4 mr-1.5" /> Create Poll
            </Button>
          </div>
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search polls, petitions, communities, figures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters || hasActiveFilters ? "border-blue-400 text-blue-600" : ""}
        >
          <SlidersHorizontal className="w-4 h-4 mr-1.5" />
          Filters
          {hasActiveFilters && <Badge className="ml-1.5 bg-blue-600 text-white text-xs h-4 w-4 p-0 flex items-center justify-center rounded-full">!</Badge>}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <DiscoveryFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.category !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {filters.category.replace(/_/g, " ")}
              <button onClick={() => handleFilterChange({ category: "all" })}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.location !== "global" && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="w-3 h-3" />{filters.location}
              <button onClick={() => handleFilterChange({ location: "global" })}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.verifiedOnly && (
            <Badge variant="secondary" className="gap-1">
              Verified only
              <button onClick={() => handleFilterChange({ verifiedOnly: false })}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              #{tag}
              <button onClick={() => handleFilterChange({ tags: filters.tags.filter(t => t !== tag) })}><X className="w-3 h-3" /></button>
            </Badge>
          ))}
          <button onClick={handleResetFilters} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleDiscoveryTabChange}>
        <div className="overflow-x-auto sticky sticky-below-header z-10 bg-white/95 backdrop-blur-sm">
          <TabsList className="w-full border-b border-slate-200 bg-transparent rounded-none p-0 h-auto mb-6">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
                  <Icon className="w-3.5 h-3.5 mr-1.5" />{tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="newsfeed">
          <ForYouFeed />
        </TabsContent>

        <TabsContent value="polls">
          <DiscoveryPollsTab searchQuery={searchQuery} filters={filters} user={user} />
        </TabsContent>

        <TabsContent value="petitions">
          <DiscoveryPetitionsTab searchQuery={searchQuery} filters={filters} user={user} />
        </TabsContent>

        <TabsContent value="communities">
          <DiscoveryCommunitiesTab searchQuery={searchQuery} filters={filters} />
        </TabsContent>

        <TabsContent value="scorecards">
          <DiscoveryScorecardsTab searchQuery={searchQuery} filters={filters} />
        </TabsContent>

        <TabsContent value="figures">
          <DiscoveryPublicFiguresTab searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="trending">
          <DiscoveryTrendingTab searchQuery={searchQuery} filters={filters} />
        </TabsContent>
      </Tabs>
    </>
    </PullToRefresh>
  );
}
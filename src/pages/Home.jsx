import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileSelect from "@/components/ui/MobileSelect";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Clock, Sparkles, Globe2, CheckCircle2, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PollCard from "../components/polls/PollCard";
import PetitionCard from "../components/petitions/PetitionCard";
import { SkeletonCardGrid } from "@/components/ui/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
import FreeExpressionBanner from "@/components/legal/FreeExpressionBanner";
import FollowingWidget from "@/components/profile/FollowingWidget";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import EnhancedPetitionFilters from "@/components/petitions/EnhancedPetitionFilters";
import UserSearch from "@/components/profile/UserSearch";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useAuth } from "@/lib/AuthContext";
import { useMemo } from "react";
import OnboardingBanner from "@/components/onboarding/OnboardingBanner";
import VirtualFeed from "@/components/ui/VirtualFeed";
import FeedItemCard from "@/components/newsfeed/FeedItemCard";
import { callNewsfeedEngine } from "@/components/newsfeed/feedApi";
import { supabase } from "@/lib/supabase";

const withTimeout = (p, ms) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "politics_society", label: "Politics & Society" },
  { value: "environment", label: "Environment" },
  { value: "economy_work", label: "Economy & Work" },
  { value: "technology_innovation", label: "Technology & Innovation" },
  { value: "health", label: "Health" },
  { value: "lifestyle_culture", label: "Lifestyle & Culture" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("trending");
  const [petitionSearch, setPetitionSearch] = useState("");
  const [petitionSort, setPetitionSort] = useState("trending");
  const [petitionLocation, setPetitionLocation] = useState("global");

  const { data: polls = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["polls", sortBy, categoryFilter],
    queryFn: async () => {
      try {
        const q = supabase
          .from("polls")
          .select("id,question,description,tags,status,total_votes_cached,created_date,end_time,category,creator_user_id")
          .order("created_date", { ascending: false })
          .limit(60);
        const { data: allPolls, error } = await withTimeout(q, 10_000);
        if (error) throw error;
        const rows = allPolls || [];
        const openPolls = rows.filter((p) => !p.status || p.status === "open" || p.status === "active");

        let filtered = openPolls;
        if (categoryFilter !== "all") {
          filtered = filtered.filter((p) => p.category === categoryFilter);
        }

        if (sortBy === "trending") {
          filtered.sort((a, b) => {
            const aScore = (a.total_votes_cached || 0) / Math.max(1, (new Date() - new Date(a.created_date)) / (1000 * 60 * 60));
            const bScore = (b.total_votes_cached || 0) / Math.max(1, (new Date() - new Date(b.created_date)) / (1000 * 60 * 60));
            return bScore - aScore;
          });
        } else if (sortBy === "new") {
          filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        } else if (sortBy === "ending_soon") {
          filtered.sort((a, b) => new Date(a.end_time || 0) - new Date(b.end_time || 0));
        }

        return filtered.slice(0, 50);
      } catch {
        return [];
      }
    },
    staleTime: 90_000,
  });

  const { data: myVerification } = useQuery({
    queryKey: ["myVerification", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("payment_status,created_date")
        .eq("user_id", user.id)
        .order("created_date", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ["myVotes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data = [] } = await supabase.from("votes").select("poll_id,user_id").eq("user_id", user.id);
      return data;
    },
    enabled: !!user,
  });

  const { data: petitions = [], isLoading: petitionsLoading } = useQuery({
    queryKey: ["homePetitions", petitionSort, petitionLocation],
    queryFn: async () => {
      try {
        const q = supabase
          .from("petitions")
          .select("id,title,short_summary,status,moderation_status,signature_count_total,created_date,deadline,country_code,creator_user_id")
          .order("created_date", { ascending: false })
          .limit(60);
        const { data: all, error } = await withTimeout(q, 10_000);
        if (error) throw error;
        let active = (all || []).filter((p) => p.status === "active" && (!p.moderation_status || p.moderation_status === "approved"));

      // Filter by location if not global
      if (petitionLocation !== "global") {
        active = active.filter(p => p.country_code === petitionLocation);
      }

      // Sort logic
      if (petitionSort === "most_signed") {
        active.sort((a, b) => (b.signature_count_total || 0) - (a.signature_count_total || 0));
      } else if (petitionSort === "trending") {
        // Growth rate: signatures per hour
        active.sort((a, b) => {
          const aScore = (a.signature_count_total || 0) / Math.max(1, (new Date() - new Date(a.created_date)) / (1000 * 60 * 60));
          const bScore = (b.signature_count_total || 0) / Math.max(1, (new Date() - new Date(b.created_date)) / (1000 * 60 * 60));
          return bScore - aScore;
        });
      } else if (petitionSort === "newest") {
        active.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      } else if (petitionSort === "ending_soon") {
        active = active.filter(p => p.deadline);
        active.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      }
      return active;
      } catch {
        return [];
      }
    },
  });

  const { data: mySignatures = [] } = useQuery({
    queryKey: ["mySignatures", user?.id],
    queryFn: async () => {
      const { data = [] } = await supabase.from("signatures").select("petition_id,user_id").eq("user_id", user.id);
      return data;
    },
    enabled: !!user,
  });

  const signedPetitionIds = new Set((mySignatures || []).map(s => s.petition_id));

  const filteredPetitions = (petitions || []).filter(p => {
    if (!petitionSearch) return true;
    const q = petitionSearch.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.short_summary?.toLowerCase().includes(q);
  });

  const handleDeletePetition = async (e, petitionId) => {
    e.stopPropagation();
    if (!confirm("Delete this petition? This cannot be undone.")) return;
    // Optimistic update — remove from cache immediately
    queryClient.setQueryData(["homePetitions", petitionSort, petitionLocation], (old) =>
      old ? old.filter((p) => p.id !== petitionId) : old
    );
    await supabase.from("petitions").delete().eq("id", petitionId);
    queryClient.invalidateQueries({ queryKey: ["homePetitions"] });
    toast.success("Petition deleted.");
  };

  const votedPollIds = useMemo(() => new Set((myVotes || []).map((v) => v.poll_id)), [myVotes]);

  const filteredPolls = useMemo(() => {
    if (!searchQuery.trim()) return polls || [];
    const query = searchQuery.toLowerCase();
    return (polls || []).filter((poll) =>
      poll.question.toLowerCase().includes(query) ||
      poll.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [polls, searchQuery]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["polls"] });
    await queryClient.invalidateQueries({ queryKey: ["homePetitions"] });
  };

  const { data: topFeed = [] } = useQuery({
    queryKey: ["home-top-feed"],
    queryFn: async () => {
      if (!user) return [];
      const res = await callNewsfeedEngine("for_you", { page: 0, pageSize: 5 });
      return res.items || [];
    },
    enabled: !!user,
    staleTime: 120000,
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="pb-16">
      <OnboardingBanner user={user} />
      <FreeExpressionBanner />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-5">
              <Globe2 className="w-4 h-4" />
              <span className="text-sm font-medium">Global Civic Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              Your Voice.<br />
              <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                Real Change.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Vote on government, council, and corporate decisions. Create petitions. Make verified impact.
            </p>

            <p className="text-lg sm:text-2xl font-semibold text-cyan-300 mb-6 tracking-wide">
              Bring accountability to the world.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to={createPageUrl("CreatePoll")} className="w-full sm:w-auto">
                <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 shadow-xl shadow-blue-900/20 w-full h-12 text-base font-semibold">
                  <Sparkles className="w-5 h-5 mr-2" />Create a Poll
                </Button>
              </Link>
              <Link to={createPageUrl("CreatePetition")} className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 w-full h-12 text-base font-semibold">
                  <FileText className="w-5 h-5 mr-2" />Start a Petition
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified Votes</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-300" />
                <span>Global Reach</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Real-time Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blue Checkmark Banner — hide if user already paid/verified or has a pending/completed verification request */}
      {user && !user.is_public_figure && !(user.paid_identity_verification_completed && user.is_kyc_verified) && !user.is_kyc_verified && !(myVerification?.payment_status === "completed") && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Get your Blue ✓ Checkmark — one-time $12.99 AUD</p>
                  <p className="text-blue-100 text-sm">Verify your identity via Stripe KYC. Lifetime badge, no recurring fees.</p>
                </div>
              </div>
              <Link to={createPageUrl("GetVerified")} className="flex-shrink-0">
                <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow">
                  Get Verified Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Polls Section */}
      {user && topFeed.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Your Newsfeed</h2>
            <Link to={createPageUrl("Newsfeed")}><Button variant="outline">See Full Feed</Button></Link>
          </div>
          <div className="space-y-3">
            {topFeed.map((item) => <FeedItemCard key={item.feed_id} item={item} />)}
          </div>
        </section>
      )}

      {/* Polls Section */}
      <section id="polls-section" className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto">
        {user && <FollowingWidget user={user} />}

        {/* User Search */}
        <div className="mb-4">
          <UserSearch className="max-w-sm" />
        </div>

        {/* Filters */}
        <div className="panel-padded mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search polls by question or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Category Filter */}
            <MobileSelect
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={CATEGORIES}
              placeholder="Category"
              className="w-full lg:w-[220px]"
            />
          </div>

          {/* Sort Tabs */}
          <Tabs value={sortBy} onValueChange={setSortBy} className="mt-4">
            <TabsList className="border-b border-slate-200 w-full bg-white rounded-none p-0 h-auto gap-0 grid grid-cols-3">
              <TabsTrigger value="trending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 font-medium px-4 py-3 text-sm transition-colors flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="new" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 font-medium px-4 py-3 text-sm transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                New
              </TabsTrigger>
              <TabsTrigger value="ending_soon" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 font-medium px-4 py-3 text-sm transition-colors flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ending Soon
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Error state */}
        {isError && (
          <div className="alert-warning mb-6 rounded-xl flex gap-3 p-4" role="alert">
            <span>Failed to load polls. Check your connection.</span>
            <button onClick={refetch} className="underline font-medium">Try again</button>
          </div>
        )}

        {/* Polls Grid */}
        {isLoading ? (
          <div className="min-h-[400px]">
            <SkeletonCardGrid count={6} />
          </div>
        ) : filteredPolls.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No polls found"
            text="Try adjusting your filters or search terms, or be the first to start a poll."
            action={{ label: "Create a Poll", onClick: () => navigate(createPageUrl("CreatePoll")) }}
          />
        ) : (
          <VirtualFeed
            items={filteredPolls.slice(0, 50)}
            columns={2}
            rowHeight={290}
            threshold={12}
            gridClassName="grid-2col"
            renderItem={({ item: poll }) => (
              <PollCard
                key={poll.id}
                poll={poll}
                hasVoted={votedPollIds.has(poll.id)}
                onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)}
                currentUserId={user?.id}
              />
            )}
          />
        )}
      </section>

      {/* Petitions Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto mt-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" /> Active Petitions
          </h2>
          <Link to={createPageUrl("CreatePetition")}>
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <FileText className="w-4 h-4 mr-1.5" />Start a Petition
            </Button>
          </Link>
        </div>

        <div className="panel-padded mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search petitions..."
                  value={petitionSearch}
                  onChange={e => setPetitionSearch(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
          </div>
          <EnhancedPetitionFilters 
            onFilterChange={(filters) => {
              setPetitionSort(filters.sortBy);
              setPetitionLocation(filters.location);
            }}
          />
        </div>

        {petitionsLoading ? (
          <div className="min-h-[400px]">
            <SkeletonCardGrid count={6} />
          </div>
        ) : filteredPetitions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No petitions found"
            text="Adjust your filters or start the first petition for this feed."
            action={{ label: "Start a Petition", onClick: () => navigate(createPageUrl("CreatePetition")) }}
          />
        ) : (
          <VirtualFeed
            items={filteredPetitions}
            columns={2}
            rowHeight={310}
            threshold={12}
            gridClassName="grid-2col"
            renderItem={({ item: petition }) => (
              <PetitionCard
                key={petition.id}
                petition={petition}
                hasSigned={signedPetitionIds.has(petition.id)}
                onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${petition.id}`)}
                isCreator={user?.id === petition.creator_user_id}
                onDelete={(e) => handleDeletePetition(e, petition.id)}
              />
            )}
          />
        )}
      </section>
    </div>
    </PullToRefresh>
  );
}